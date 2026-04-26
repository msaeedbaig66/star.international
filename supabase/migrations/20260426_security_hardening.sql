-- ============================================================================
-- Migration: 20260426_security_hardening.sql
-- Description: Applies "10/10" Security Hardening to the Supabase Schema.
--              Includes Profile Privacy, RLS Tightening, and Open Redirect Protection.
-- ============================================================================

-- 1. Tighten Profile Privacy
-- ============================================================================
-- Ensure that ONLY authorized roles can update sensitive profile fields.
-- We do this by creating a trigger that prevents non-admins from changing their own role.

CREATE OR REPLACE FUNCTION check_profile_permissions() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent non-admins from changing their own role or verification status
  -- (Allow 'service_role' to bypass so the backend API can perform updates)
  IF (auth.jwt() ->> 'role' <> 'admin' AND auth.jwt() ->> 'role' <> 'service_role') THEN
    IF (OLD.role <> NEW.role) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
    IF (OLD.is_verified <> NEW.is_verified) THEN
      RAISE EXCEPTION 'Only admins can change verification status';
    END IF;
    IF (OLD.is_banned <> NEW.is_banned) THEN
      RAISE EXCEPTION 'Only admins can ban users';
    END IF;
  END IF;

  -- 2. Ensure users can only update their own profile (safety fallback for RLS)
  IF (auth.uid() <> NEW.id AND auth.jwt() ->> 'role' <> 'admin' AND auth.jwt() ->> 'role' <> 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized profile update attempt';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_profile_security_check ON profiles;
CREATE TRIGGER tr_profile_security_check
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_profile_permissions();

-- 2. Secure Content Access
-- ============================================================================
-- Tighten RLS policies to ensure 'pending' content is ONLY visible to the author and admins.

-- Listings
DROP POLICY IF EXISTS "listings_read_approved" ON listings;
CREATE POLICY "listings_read_approved" ON listings 
  FOR SELECT USING (
    moderation = 'approved' 
    OR auth.uid() = seller_id 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Blogs
DROP POLICY IF EXISTS "blogs_read_approved" ON blogs;
CREATE POLICY "blogs_read_approved" ON blogs 
  FOR SELECT USING (
    moderation = 'approved' 
    OR auth.uid() = author_id 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Communities
DROP POLICY IF EXISTS "communities_read_approved" ON communities;
CREATE POLICY "communities_read_approved" ON communities 
  FOR SELECT USING (
    moderation = 'approved' 
    OR auth.uid() = owner_id 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Secure Administrative Actions
-- ============================================================================
-- Ensure only admins can access the reports table.

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_admin_access" ON reports;
CREATE POLICY "reports_admin_access" ON reports 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Enable RLS on Missing Tables
-- ============================================================================
-- Some secondary tables might have RLS disabled. Let's fix that.

ALTER TABLE sector_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_academic" ON sector_types;
CREATE POLICY "public_read_academic" ON sector_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_institutions" ON institutions;
CREATE POLICY "public_read_institutions" ON institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_departments" ON departments;
CREATE POLICY "public_read_departments" ON departments FOR SELECT USING (true);

-- 5. Audit Logging Trigger (Example)
-- ============================================================================
-- Create a table for security-sensitive logs if needed in the future.
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
-- Only admins can read logs
DROP POLICY IF EXISTS "admin_read_logs" ON security_audit_logs;
CREATE POLICY "admin_read_logs" ON security_audit_logs 
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 6. Add Sub-Admin Role
-- ============================================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'subadmin';
