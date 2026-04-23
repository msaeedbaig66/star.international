ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS listing_slot_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS community_slot_limit INTEGER NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS slot_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('listing', 'community')),
  current_limit INTEGER NOT NULL CHECK (current_limit > 0),
  requested_limit INTEGER NOT NULL CHECK (requested_limit > 0),
  additional_slots INTEGER NOT NULL CHECK (additional_slots > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (requested_limit > current_limit)
);

CREATE INDEX IF NOT EXISTS idx_slot_requests_status_created
  ON slot_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slot_requests_user_created
  ON slot_requests(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_requests_pending_unique
  ON slot_requests(user_id, request_type)
  WHERE status = 'pending';

ALTER TABLE slot_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slot_requests_select_own" ON slot_requests;
CREATE POLICY "slot_requests_select_own"
  ON slot_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "slot_requests_insert_own" ON slot_requests;
CREATE POLICY "slot_requests_insert_own"
  ON slot_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note IS NULL
  );

DROP POLICY IF EXISTS "slot_requests_admin_select" ON slot_requests;
CREATE POLICY "slot_requests_admin_select"
  ON slot_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "slot_requests_admin_update" ON slot_requests;
CREATE POLICY "slot_requests_admin_update"
  ON slot_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
