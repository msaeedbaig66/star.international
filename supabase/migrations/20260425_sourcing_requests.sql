-- Migration: 20260425_sourcing_requests.sql
-- Description: Table for study-related item sourcing requests.

CREATE TABLE IF NOT EXISTS sourcing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'unavailable')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sourcing_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "sourcing_requests_insert" ON sourcing_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sourcing_requests_read_own" ON sourcing_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (assuming role 'admin' exists)
CREATE POLICY "sourcing_requests_admin_all" ON sourcing_requests
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sourcing_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sourcing_requests_updated_at
BEFORE UPDATE ON sourcing_requests
FOR EACH ROW EXECUTE FUNCTION update_sourcing_requests_updated_at();
