DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'blog_update'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'blog_update';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'community_update'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'community_update';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS blog_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, blog_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_follows_blog ON blog_follows(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_follows_follower ON blog_follows(follower_id);

ALTER TABLE blog_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_follows_read_all" ON blog_follows;
CREATE POLICY "blog_follows_read_all" ON blog_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "blog_follows_insert" ON blog_follows;
CREATE POLICY "blog_follows_insert" ON blog_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "blog_follows_delete" ON blog_follows;
CREATE POLICY "blog_follows_delete" ON blog_follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS community_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_community ON community_follows(community_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_follows_read_all" ON community_follows;
CREATE POLICY "community_follows_read_all" ON community_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_follows_insert" ON community_follows;
CREATE POLICY "community_follows_insert" ON community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "community_follows_delete" ON community_follows;
CREATE POLICY "community_follows_delete" ON community_follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS notification_mutes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('profile', 'blog', 'community')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_mutes_user ON notification_mutes(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_target ON notification_mutes(target_type, target_id);

ALTER TABLE notification_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_mutes_select_own" ON notification_mutes;
CREATE POLICY "notification_mutes_select_own" ON notification_mutes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_mutes_insert_own" ON notification_mutes;
CREATE POLICY "notification_mutes_insert_own" ON notification_mutes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_mutes_delete_own" ON notification_mutes;
CREATE POLICY "notification_mutes_delete_own" ON notification_mutes FOR DELETE USING (auth.uid() = user_id);
