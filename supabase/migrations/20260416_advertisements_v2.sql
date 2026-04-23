-- Migration: advertisements_v2.sql
-- Description: Creates the advertisements table and ensures the meta column exists for professional posters.

CREATE TABLE IF NOT EXISTS advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 1,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure meta column exists (in case table existed without it)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='advertisements' AND column_name='meta') THEN
        ALTER TABLE advertisements ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "advertisements_read_public" ON advertisements FOR SELECT USING (true);
CREATE POLICY "advertisements_admin_all" ON advertisements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_advertisements_updated_at ON advertisements;
CREATE TRIGGER tr_advertisements_updated_at
    BEFORE UPDATE ON advertisements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
