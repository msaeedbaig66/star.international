-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Content moderation status
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- Listing condition
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

-- Listing availability
CREATE TYPE listing_status AS ENUM ('available', 'reserved', 'sold', 'removed');

-- Report categories
CREATE TYPE report_category AS ENUM (
 'spam', 'fraudulent', 'misleading', 'inappropriate',
 'harassment', 'copyright', 'other'
);

-- Report target type
CREATE TYPE report_target AS ENUM ('listing', 'blog', 'community', 'comment', 'user');

-- Notification types
CREATE TYPE notification_type AS ENUM (
 'follow', 'like', 'comment', 'reply', 'message',
 'listing_approved', 'listing_rejected',
 'blog_approved', 'blog_rejected',
 'community_approved', 'community_rejected',
 'comment_approved', 'report_received'
);

-- Community type
CREATE TYPE community_type AS ENUM ('field', 'project');

-- User role
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- 5.3 profiles Table
CREATE TABLE profiles (
 id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username TEXT UNIQUE NOT NULL,
 full_name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 avatar_url TEXT,
 cover_url TEXT,
 bio TEXT,
 university TEXT,
 field_of_study TEXT,
 city TEXT,
 role user_role DEFAULT 'user',
 is_verified BOOLEAN DEFAULT FALSE,
 is_banned BOOLEAN DEFAULT FALSE,
 follower_count INTEGER DEFAULT 0,
 following_count INTEGER DEFAULT 0,
 rating_avg NUMERIC(3,2) DEFAULT 0,
 rating_count INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $body$
BEGIN
 INSERT INTO profiles (id, username, full_name, email)
 VALUES (
 NEW.id,
 COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
 COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
 NEW.email
 );
 RETURN NEW;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
 AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5.4 listings Table
CREATE TABLE listings (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 price NUMERIC(10,2) NOT NULL,
 condition item_condition NOT NULL,
 category TEXT NOT NULL,
 campus TEXT,
 images TEXT[] DEFAULT '{}',
 status listing_status DEFAULT 'available',
 moderation moderation_status DEFAULT 'pending',
 rejection_note TEXT,
 view_count INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_status ON listings(status, moderation);
CREATE INDEX idx_listings_campus ON listings(campus);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_read_approved" ON listings FOR SELECT USING (moderation = 'approved');
CREATE POLICY "listings_read_own" ON listings FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "listings_update_own" ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "listings_delete_own" ON listings FOR DELETE USING (auth.uid() = seller_id);

-- 5.6 communities Table
CREATE TABLE communities (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 slug TEXT UNIQUE NOT NULL,
 description TEXT,
 type community_type DEFAULT 'project',
 field TEXT,
 avatar_url TEXT,
 banner_url TEXT,
 rules TEXT,
 member_count INTEGER DEFAULT 0,
 post_count INTEGER DEFAULT 0,
 is_official BOOLEAN DEFAULT FALSE,
 moderation moderation_status DEFAULT 'pending',
 rejection_note TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communities_owner ON communities(owner_id);
CREATE INDEX idx_communities_field ON communities(field);
CREATE INDEX idx_communities_type ON communities(type);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_read_approved" ON communities FOR SELECT USING (moderation = 'approved');
CREATE POLICY "communities_read_own" ON communities FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "communities_insert" ON communities FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "communities_update_own" ON communities FOR UPDATE USING (auth.uid() = owner_id);

-- 5.5 blogs Table
CREATE TABLE blogs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 slug TEXT UNIQUE NOT NULL,
 content TEXT NOT NULL,
 excerpt TEXT,
 cover_image TEXT,
 images TEXT[] DEFAULT '{}',
 tags TEXT[] DEFAULT '{}',
 field TEXT,
 community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
 moderation moderation_status DEFAULT 'pending',
 rejection_note TEXT,
 like_count INTEGER DEFAULT 0,
 comment_count INTEGER DEFAULT 0,
 view_count INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blogs_author ON blogs(author_id);
CREATE INDEX idx_blogs_field ON blogs(field);
CREATE INDEX idx_blogs_moderation ON blogs(moderation);
CREATE INDEX idx_blogs_community ON blogs(community_id);

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blogs_read_approved" ON blogs FOR SELECT USING (moderation = 'approved');
CREATE POLICY "blogs_read_own" ON blogs FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "blogs_insert" ON blogs FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "blogs_update_own" ON blogs FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "blogs_delete_own" ON blogs FOR DELETE USING (auth.uid() = author_id);

-- 5.7 community_members Table
CREATE TABLE community_members (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 role TEXT DEFAULT 'member',
 joined_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE(community_id, user_id)
);

CREATE INDEX idx_cm_community ON community_members(community_id);
CREATE INDEX idx_cm_user ON community_members(user_id);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_read_all" ON community_members FOR SELECT USING (true);
CREATE POLICY "cm_insert" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cm_delete" ON community_members FOR DELETE USING (auth.uid() = user_id);

-- 5.8 posts Table
CREATE TABLE posts (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
 author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 is_question BOOLEAN DEFAULT FALSE,
 is_pinned BOOLEAN DEFAULT FALSE,
 moderation moderation_status DEFAULT 'pending',
 rejection_note TEXT,
 like_count INTEGER DEFAULT 0,
 reply_count INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_posts_author ON posts(author_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read_approved" ON posts FOR SELECT USING (moderation = 'approved');
CREATE POLICY "posts_read_own" ON posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = author_id);

-- 5.9 comments Table
CREATE TABLE comments (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 content TEXT NOT NULL,
 parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
 listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
 blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
 post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
 moderation moderation_status DEFAULT 'pending',
 rejection_note TEXT,
 like_count INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW(),
 CHECK (
 (listing_id IS NOT NULL)::INT +
 (blog_id IS NOT NULL)::INT +
 (post_id IS NOT NULL)::INT = 1
 )
);

CREATE INDEX idx_comments_blog ON comments(blog_id);
CREATE INDEX idx_comments_listing ON comments(listing_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_approved" ON comments FOR SELECT USING (moderation = 'approved');
CREATE POLICY "comments_read_own" ON comments FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (auth.uid() = author_id);

-- 5.10 message_threads and messages Tables
CREATE TABLE message_threads (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE thread_participants (
 thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE messages (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 content TEXT NOT NULL,
 is_read BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_tp_user ON thread_participants(user_id);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_read_participant" ON message_threads
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM thread_participants WHERE thread_id = message_threads.id AND user_id = auth.uid())
 );

CREATE POLICY "messages_read_participant" ON messages
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid())
 );

CREATE POLICY "messages_insert" ON messages
 FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5.11 follows Table
CREATE TABLE follows (
 follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 PRIMARY KEY (follower_id, following_id),
 CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_read_all" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 5.12 likes Table
CREATE TABLE likes (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
 post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
 comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE (user_id, blog_id),
 UNIQUE (user_id, post_id),
 UNIQUE (user_id, comment_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_read_all" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- 5.13 wishlist Table
CREATE TABLE wishlist (
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 PRIMARY KEY (user_id, listing_id)
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist_own" ON wishlist USING (auth.uid() = user_id);

-- 5.14 blocked_users Table
CREATE TABLE blocked_users (
 blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 PRIMARY KEY (blocker_id, blocked_id),
 CHECK (blocker_id <> blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_own" ON blocked_users USING (auth.uid() = blocker_id);

-- 5.15 ratings Table
CREATE TABLE ratings (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 subject_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
 score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
 review_text TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE (reviewer_id, listing_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_read_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 5.16 notifications Table
CREATE TABLE notifications (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 type notification_type NOT NULL,
 actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
 listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
 blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
 community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
 post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
 comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
 message TEXT,
 is_read BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notifications USING (auth.uid() = user_id);

-- 5.17 reports Table
CREATE TABLE reports (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 target_type report_target NOT NULL,
 target_id UUID NOT NULL,
 category report_category NOT NULL,
 description TEXT,
 evidence_url TEXT,
 status TEXT DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
 resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
 resolved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_read_own" ON reports FOR SELECT USING (auth.uid() = reporter_id);
