-- Hot-path query indexes for chat threads, follow counts, and ratings timelines.
-- Safe to rerun because of IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at_desc
  ON messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_ratings_subject_created_at_desc
  ON ratings(subject_id, created_at DESC);
