-- ============================================================================
-- Migration: 20260424_schema_hardening.sql
-- Description: Fixes all schema-code mismatches, adds counter triggers,
--              full-text search vectors, view tracking RPC, and stats RPCs.
-- Safety: All statements use IF NOT EXISTS / OR REPLACE for idempotency.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. MISSING COLUMNS
-- ────────────────────────────────────────────────────────────────────────────

-- 1a. listings.save_count — Wishlist API reads this column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='save_count') THEN
    ALTER TABLE listings ADD COLUMN save_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 1b. listings.is_official — Listing creation sets this, only communities had it
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_official') THEN
    ALTER TABLE listings ADD COLUMN is_official BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 1c. blogs.is_official — Blog creation API sets this for admin content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='is_official') THEN
    ALTER TABLE blogs ADD COLUMN is_official BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 1d. listings.rating_avg / listings.rating_count — Detail page reads these
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='rating_avg') THEN
    ALTER TABLE listings ADD COLUMN rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='rating_count') THEN
    ALTER TABLE listings ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. FULL-TEXT SEARCH VECTORS
-- ────────────────────────────────────────────────────────────────────────────

-- 2a. listings.search_vector
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='search_vector') THEN
    ALTER TABLE listings ADD COLUMN search_vector tsvector;
  END IF;
END $$;

UPDATE listings SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(campus, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_search_vector ON listings USING gin(search_vector);

CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.campus, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_listings_search_vector ON listings;
CREATE TRIGGER tr_listings_search_vector
  BEFORE INSERT OR UPDATE OF title, description, category, campus ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- 2b. blogs.search_vector
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='search_vector') THEN
    ALTER TABLE blogs ADD COLUMN search_vector tsvector;
  END IF;
END $$;

UPDATE blogs SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(field, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_blogs_search_vector ON blogs USING gin(search_vector);

CREATE OR REPLACE FUNCTION blogs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.excerpt, '') || ' ' ||
    coalesce(NEW.field, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blogs_search_vector ON blogs;
CREATE TRIGGER tr_blogs_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, field ON blogs
  FOR EACH ROW EXECUTE FUNCTION blogs_search_vector_update();

-- 2c. communities.search_vector
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communities' AND column_name='search_vector') THEN
    ALTER TABLE communities ADD COLUMN search_vector tsvector;
  END IF;
END $$;

UPDATE communities SET search_vector = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(field, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_communities_search_vector ON communities USING gin(search_vector);

CREATE OR REPLACE FUNCTION communities_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.field, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_communities_search_vector ON communities;
CREATE TRIGGER tr_communities_search_vector
  BEFORE INSERT OR UPDATE OF name, description, field ON communities
  FOR EACH ROW EXECUTE FUNCTION communities_search_vector_update();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. VIEW TRACKING RPC
-- ────────────────────────────────────────────────────────────────────────────

-- Create the unique views table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'blog', 'community')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_views_target ON content_views(target_type, target_id);

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_views_insert_own" ON content_views;
CREATE POLICY "content_views_insert_own" ON content_views FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "content_views_read_own" ON content_views;
CREATE POLICY "content_views_read_own" ON content_views FOR SELECT USING (auth.uid() = user_id);

-- The track_view RPC: atomically inserts a unique view and increments the counter
CREATE OR REPLACE FUNCTION track_view(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Insert unique view record (ignore if already viewed)
  INSERT INTO content_views (user_id, target_type, target_id)
  VALUES (p_user_id, p_target_type, p_target_id)
  ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

  -- Only increment if the insert actually happened (new view)
  IF FOUND THEN
    IF p_target_type = 'listing' THEN
      UPDATE listings SET view_count = view_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'blog' THEN
      UPDATE blogs SET view_count = view_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'community' THEN
      -- communities don't have view_count in schema, but guard against future use
      NULL;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. COUNTER TRIGGERS
-- ────────────────────────────────────────────────────────────────────────────

-- 4a. Wishlist → listings.save_count
CREATE OR REPLACE FUNCTION tr_wishlist_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listings SET save_count = save_count + 1 WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listings SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.listing_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_wishlist_change ON wishlist;
CREATE TRIGGER tr_on_wishlist_change
  AFTER INSERT OR DELETE ON wishlist
  FOR EACH ROW EXECUTE FUNCTION tr_wishlist_count();

-- 4b. Likes → blogs.like_count / posts.like_count / comments.like_count
CREATE OR REPLACE FUNCTION tr_like_count() RETURNS TRIGGER AS $$
DECLARE
  delta INT;
BEGIN
  IF TG_OP = 'INSERT' THEN delta := 1;
  ELSIF TG_OP = 'DELETE' THEN delta := -1;
  ELSE RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.blog_id IS NOT NULL THEN
      UPDATE blogs SET like_count = GREATEST(0, like_count + delta) WHERE id = NEW.blog_id;
    END IF;
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET like_count = GREATEST(0, like_count + delta) WHERE id = NEW.post_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE comments SET like_count = GREATEST(0, like_count + delta) WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.blog_id IS NOT NULL THEN
      UPDATE blogs SET like_count = GREATEST(0, like_count + delta) WHERE id = OLD.blog_id;
    END IF;
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET like_count = GREATEST(0, like_count + delta) WHERE id = OLD.post_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE comments SET like_count = GREATEST(0, like_count + delta) WHERE id = OLD.comment_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_like_change ON likes;
CREATE TRIGGER tr_on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION tr_like_count();

-- 4c. Comments → blogs.comment_count / posts.reply_count
CREATE OR REPLACE FUNCTION tr_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.blog_id IS NOT NULL THEN
      UPDATE blogs SET comment_count = comment_count + 1 WHERE id = NEW.blog_id;
    END IF;
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.blog_id IS NOT NULL THEN
      UPDATE blogs SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.blog_id;
    END IF;
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_comment_change ON comments;
CREATE TRIGGER tr_on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION tr_comment_count();

-- 4d. Follows → profiles.follower_count / profiles.following_count
CREATE OR REPLACE FUNCTION tr_follow_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_follow_change ON follows;
CREATE TRIGGER tr_on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION tr_follow_count();

-- 4e. Community Members → communities.member_count
CREATE OR REPLACE FUNCTION tr_member_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_member_change ON community_members;
CREATE TRIGGER tr_on_member_change
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION tr_member_count();

-- 4f. Ratings → listings.rating_avg / listings.rating_count AND profiles.rating_avg / profiles.rating_count
CREATE OR REPLACE FUNCTION tr_rating_count() RETURNS TRIGGER AS $$
DECLARE
  v_listing_id UUID;
  v_subject_id UUID;
  v_avg NUMERIC;
  v_cnt INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_listing_id := NEW.listing_id;
    v_subject_id := NEW.subject_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
    v_subject_id := OLD.subject_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Update listing rating aggregates
  IF v_listing_id IS NOT NULL THEN
    SELECT COALESCE(AVG(score), 0), COUNT(*) INTO v_avg, v_cnt
    FROM ratings WHERE listing_id = v_listing_id;
    UPDATE listings SET rating_avg = v_avg, rating_count = v_cnt WHERE id = v_listing_id;
  END IF;

  -- Update profile (subject) rating aggregates
  IF v_subject_id IS NOT NULL THEN
    SELECT COALESCE(AVG(score), 0), COUNT(*) INTO v_avg, v_cnt
    FROM ratings WHERE subject_id = v_subject_id;
    UPDATE profiles SET rating_avg = v_avg, rating_count = v_cnt WHERE id = v_subject_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_rating_change ON ratings;
CREATE TRIGGER tr_on_rating_change
  AFTER INSERT OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION tr_rating_count();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. STATS RPCs
-- ────────────────────────────────────────────────────────────────────────────

-- 5a. get_marketplace_stats — returns category counts for the filter sidebar
CREATE OR REPLACE FUNCTION get_marketplace_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'categories', COALESCE(
      (SELECT jsonb_object_agg(category, cnt)
       FROM (
         SELECT category, COUNT(*) as cnt
         FROM listings
         WHERE moderation = 'approved' AND status = 'available' AND category IS NOT NULL
         GROUP BY category
       ) sub),
      '{}'::jsonb
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5b. get_blog_stats — returns field counts and popular tags
CREATE OR REPLACE FUNCTION get_blog_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'fields', COALESCE(
      (SELECT jsonb_object_agg(field, cnt)
       FROM (
         SELECT field, COUNT(*) as cnt
         FROM blogs
         WHERE moderation = 'approved' AND field IS NOT NULL
         GROUP BY field
       ) sub),
      '{}'::jsonb
    ),
    'tags', COALESCE(
      (SELECT jsonb_object_agg(tag, cnt)
       FROM (
         SELECT unnest(tags) as tag, COUNT(*) as cnt
         FROM blogs
         WHERE moderation = 'approved'
         GROUP BY tag
         ORDER BY cnt DESC
         LIMIT 30
       ) sub),
      '{}'::jsonb
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. BACKFILL EXISTING COUNTER DATA
-- ────────────────────────────────────────────────────────────────────────────

-- Backfill save_count from existing wishlist rows
UPDATE listings l SET save_count = sub.cnt
FROM (SELECT listing_id, COUNT(*) as cnt FROM wishlist GROUP BY listing_id) sub
WHERE l.id = sub.listing_id AND l.save_count = 0;

-- Backfill like_count on blogs from existing like rows
UPDATE blogs b SET like_count = sub.cnt
FROM (SELECT blog_id, COUNT(*) as cnt FROM likes WHERE blog_id IS NOT NULL GROUP BY blog_id) sub
WHERE b.id = sub.blog_id;

-- Backfill like_count on posts from existing like rows
UPDATE posts p SET like_count = sub.cnt
FROM (SELECT post_id, COUNT(*) as cnt FROM likes WHERE post_id IS NOT NULL GROUP BY post_id) sub
WHERE p.id = sub.post_id;

-- Backfill comment_count on blogs
UPDATE blogs b SET comment_count = sub.cnt
FROM (SELECT blog_id, COUNT(*) as cnt FROM comments WHERE blog_id IS NOT NULL GROUP BY blog_id) sub
WHERE b.id = sub.blog_id;

-- Backfill reply_count on posts
UPDATE posts p SET reply_count = sub.cnt
FROM (SELECT post_id, COUNT(*) as cnt FROM comments WHERE post_id IS NOT NULL GROUP BY post_id) sub
WHERE p.id = sub.post_id;

-- Backfill follower_count / following_count on profiles
UPDATE profiles p SET follower_count = COALESCE(sub.cnt, 0)
FROM (SELECT following_id, COUNT(*) as cnt FROM follows GROUP BY following_id) sub
WHERE p.id = sub.following_id;

UPDATE profiles p SET following_count = COALESCE(sub.cnt, 0)
FROM (SELECT follower_id, COUNT(*) as cnt FROM follows GROUP BY follower_id) sub
WHERE p.id = sub.follower_id;

-- Backfill member_count on communities
UPDATE communities c SET member_count = COALESCE(sub.cnt, 0)
FROM (SELECT community_id, COUNT(*) as cnt FROM community_members GROUP BY community_id) sub
WHERE c.id = sub.community_id;

-- Backfill rating aggregates on listings
UPDATE listings l SET rating_avg = sub.avg_score, rating_count = sub.cnt
FROM (SELECT listing_id, AVG(score) as avg_score, COUNT(*) as cnt FROM ratings WHERE listing_id IS NOT NULL GROUP BY listing_id) sub
WHERE l.id = sub.listing_id;

-- Backfill rating aggregates on profiles
UPDATE profiles p SET rating_avg = sub.avg_score, rating_count = sub.cnt
FROM (SELECT subject_id, AVG(score) as avg_score, COUNT(*) as cnt FROM ratings GROUP BY subject_id) sub
WHERE p.id = sub.subject_id;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listings_save_count ON listings(save_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_is_official ON listings(is_official) WHERE is_official = TRUE;
CREATE INDEX IF NOT EXISTS idx_blogs_is_official ON blogs(is_official) WHERE is_official = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_views_user_target ON content_views(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_blog_id ON likes(blog_id) WHERE blog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id) WHERE comment_id IS NOT NULL;
