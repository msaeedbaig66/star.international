-- ============================================================================
-- Migration: 20260426_profile_search_vector.sql
-- Description: Adds Full-Text Search indexing to the profiles table.
-- ============================================================================

-- 1. Add search_vector column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='search_vector') THEN
    ALTER TABLE profiles ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- 2. Initialize existing data
UPDATE profiles 
SET search_vector = to_tsvector('english', 
  coalesce(username, '') || ' ' || 
  coalesce(full_name, '') || ' ' || 
  coalesce(university, '') || ' ' || 
  coalesce(field_of_study, '')
)
WHERE search_vector IS NULL;

-- 3. Create GIN index for lightning-fast search
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING gin(search_vector);

-- 4. Create trigger function to keep vector updated
CREATE OR REPLACE FUNCTION profiles_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.username, '') || ' ' ||
    coalesce(NEW.full_name, '') || ' ' ||
    coalesce(NEW.university, '') || ' ' ||
    coalesce(NEW.field_of_study, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger
DROP TRIGGER IF EXISTS tr_profiles_search_vector ON profiles;
CREATE TRIGGER tr_profiles_search_vector
  BEFORE INSERT OR UPDATE OF username, full_name, university, field_of_study ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_vector_update();
