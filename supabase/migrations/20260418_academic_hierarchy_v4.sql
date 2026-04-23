-- Migration to support 4-level academic hierarchy: Sector -> University -> Institute -> Department
-- This fulfills the user request to have Sector, University, Institute, and Department on the signup page.

-- 1. Create the institutes table (sub-level of institutions/universities)
CREATE TABLE IF NOT EXISTS public.institutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add institute_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institute_id UUID;

-- 3. Add foreign key to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_institute_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_institute_id_fkey
      FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Enable RLS and add policies for institutes
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'institutes' AND policyname = 'institutes_read_active'
  ) THEN
    CREATE POLICY institutes_read_active ON public.institutes
      FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

-- 5. Update departments to optionally link to an institute
-- We keep institution_id for backward compatibility, but add institute_id as the primary parent if available.
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE;

-- 6. Update handle_new_user trigger to support all 4 levels + Metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  raw_full_name TEXT;
  derived_first_name TEXT;
  derived_last_name TEXT;
  phone_value TEXT;
  
  -- UUID IDs from metadata
  meta_sector_id UUID;
  meta_uni_id UUID;
  meta_institute_id UUID;
  meta_dept_id UUID;
  
  -- Names for legacy string columns
  meta_uni_name TEXT;
  meta_institute_name TEXT;
  meta_dept_name TEXT;
BEGIN
  -- 1. Resolve Unique Username
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) THEN
    new_username := new_username || '_' || substring(md5(random()::text) from 1 for 4);
  END IF;

  -- 2. Extract Basic Info
  raw_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  derived_first_name := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), ''),
    NULLIF(split_part(COALESCE(raw_full_name, ''), ' ', 1), ''),
    split_part(NEW.email, '@', 1)
  );
  derived_last_name := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
    CASE
      WHEN POSITION(' ' IN COALESCE(raw_full_name, '')) > 0
        THEN NULLIF(TRIM(SUBSTRING(COALESCE(raw_full_name, '') FROM POSITION(' ' IN COALESCE(raw_full_name, '')) + 1)), '')
      ELSE NULL
    END
  );
  phone_value := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '')
  );

  -- 3. Extract Academic IDs (Validate UUID format to be safe)
  BEGIN
    meta_sector_id := (NEW.raw_user_meta_data->>'sector_type_id')::UUID;
  EXCEPTION WHEN OTHERS THEN meta_sector_id := NULL;
  END;
  
  BEGIN
    meta_uni_id := (NEW.raw_user_meta_data->>'institution_id')::UUID; -- We use institution_id as University ID
  EXCEPTION WHEN OTHERS THEN meta_uni_id := NULL;
  END;
  
  BEGIN
    meta_institute_id := (NEW.raw_user_meta_data->>'institute_id')::UUID;
  EXCEPTION WHEN OTHERS THEN meta_institute_id := NULL;
  END;
  
  BEGIN
    meta_dept_id := (NEW.raw_user_meta_data->>'department_id')::UUID;
  EXCEPTION WHEN OTHERS THEN meta_dept_id := NULL;
  END;

  -- 4. Extract Names for text columns
  meta_uni_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institution_name', '')), '');
  meta_institute_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institute_name', '')), '');
  meta_dept_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department_name', '')), '');

  -- 5. Insert Profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    phone,
    first_name,
    last_name,
    phone_number,
    sector_type_id,
    institution_id,
    institute_id,
    department_id,
    university,
    field_of_study
  )
  VALUES (
    NEW.id,
    new_username,
    COALESCE(raw_full_name, TRIM(derived_first_name || ' ' || COALESCE(derived_last_name, ''))),
    NEW.email,
    phone_value,
    derived_first_name,
    derived_last_name,
    phone_value,
    meta_sector_id,
    meta_uni_id,
    meta_institute_id,
    meta_dept_id,
    COALESCE(meta_uni_name, meta_institute_name),
    meta_dept_name
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to minimal insert if complex logic fails
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, COALESCE(new_username, NEW.email), '', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant access for anon users (signup)
GRANT SELECT ON TABLE public.institutes TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.institutes TO authenticated;
