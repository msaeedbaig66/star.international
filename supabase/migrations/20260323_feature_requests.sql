ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_note TEXT;

ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_note TEXT;

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_note TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_featured_until
  ON listings(is_featured, featured_until DESC);

CREATE INDEX IF NOT EXISTS idx_blogs_featured_until
  ON blogs(is_featured, featured_until DESC);

CREATE INDEX IF NOT EXISTS idx_communities_featured_until
  ON communities(is_featured, featured_until DESC);

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('listing', 'blog', 'community')),
  entity_id UUID NOT NULL,
  entity_title TEXT NOT NULL,
  requested_days INTEGER NOT NULL CHECK (requested_days >= 1 AND requested_days <= 60),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_days INTEGER CHECK (approved_days IS NULL OR (approved_days >= 1 AND approved_days <= 60)),
  featured_until TIMESTAMPTZ,
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status_created
  ON feature_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_requests_user_created
  ON feature_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_requests_entity
  ON feature_requests(entity_type, entity_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_requests_pending_unique
  ON feature_requests(entity_type, entity_id)
  WHERE status = 'pending';

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_requests_select_own" ON feature_requests;
CREATE POLICY "feature_requests_select_own"
  ON feature_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_requests_insert_own" ON feature_requests;
CREATE POLICY "feature_requests_insert_own"
  ON feature_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

DROP POLICY IF EXISTS "feature_requests_admin_select" ON feature_requests;
CREATE POLICY "feature_requests_admin_select"
  ON feature_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "feature_requests_admin_update" ON feature_requests;
CREATE POLICY "feature_requests_admin_update"
  ON feature_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE feature_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE feature_requests TO service_role;
