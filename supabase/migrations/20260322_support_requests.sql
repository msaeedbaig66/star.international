-- Support requests submitted from contact page and handled by admins
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  admin_reply TEXT,
  replied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_status_created
  ON support_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_user
  ON support_requests(user_id);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own support requests.
DROP POLICY IF EXISTS "support_requests_insert_own" ON support_requests;
CREATE POLICY "support_requests_insert_own"
  ON support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own support requests.
DROP POLICY IF EXISTS "support_requests_read_own" ON support_requests;
CREATE POLICY "support_requests_read_own"
  ON support_requests FOR SELECT
  USING (auth.uid() = user_id);

