-- Add is_anonymous column to posts, comments, and messages tables
ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;

-- Optional: Add indexes for performance if we ever want to filter by anonymity
CREATE INDEX idx_posts_is_anonymous ON posts(is_anonymous);
CREATE INDEX idx_comments_is_anonymous ON comments(is_anonymous);
CREATE INDEX idx_messages_is_anonymous ON messages(is_anonymous);
