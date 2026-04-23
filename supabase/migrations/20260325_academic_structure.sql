-- Academic structure entities + profile references for signup flow

CREATE TABLE IF NOT EXISTS public.sector_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_type_id UUID NOT NULL REFERENCES public.sector_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  city TEXT,
  province_or_region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sector_types_name_unique
  ON public.sector_types (lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_sector_name_unique
  ON public.institutions (sector_type_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_institution_name_unique
  ON public.departments (institution_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_sector_types_sort
  ON public.sector_types (is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_institutions_sector_sort
  ON public.institutions (sector_type_id, is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_departments_institution_sort
  ON public.departments (institution_id, is_active, sort_order, name);

ALTER TABLE public.sector_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sector_types' AND policyname = 'sector_types_read_active'
  ) THEN
    CREATE POLICY sector_types_read_active ON public.sector_types
      FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'institutions' AND policyname = 'institutions_read_active'
  ) THEN
    CREATE POLICY institutions_read_active ON public.institutions
      FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'departments_read_active'
  ) THEN
    CREATE POLICY departments_read_active ON public.departments
      FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS sector_type_id UUID,
  ADD COLUMN IF NOT EXISTS institution_id UUID,
  ADD COLUMN IF NOT EXISTS department_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_sector_type_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_sector_type_id_fkey
      FOREIGN KEY (sector_type_id) REFERENCES public.sector_types(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_institution_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_institution_id_fkey
      FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_department_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_sector_type_id
  ON public.profiles (sector_type_id);

CREATE INDEX IF NOT EXISTS idx_profiles_institution_id
  ON public.profiles (institution_id);

CREATE INDEX IF NOT EXISTS idx_profiles_department_id
  ON public.profiles (department_id);

-- Backfill split names/phone for existing rows where possible.
UPDATE public.profiles
SET
  first_name = COALESCE(NULLIF(first_name, ''), split_part(TRIM(COALESCE(full_name, '')), ' ', 1)),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    CASE
      WHEN POSITION(' ' IN TRIM(COALESCE(full_name, ''))) > 0
        THEN NULLIF(TRIM(SUBSTRING(TRIM(COALESCE(full_name, '')) FROM POSITION(' ' IN TRIM(COALESCE(full_name, ''))) + 1)), '')
      ELSE NULL
    END
  ),
  phone_number = COALESCE(NULLIF(phone_number, ''), NULLIF(phone, ''))
WHERE
  first_name IS NULL OR first_name = ''
  OR last_name IS NULL
  OR phone_number IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  raw_full_name TEXT;
  derived_first_name TEXT;
  derived_last_name TEXT;
  phone_value TEXT;
BEGIN
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) THEN
    new_username := new_username || '_' || substring(md5(random()::text) from 1 for 4);
  END IF;

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

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    phone,
    first_name,
    last_name,
    phone_number
  )
  VALUES (
    NEW.id,
    new_username,
    COALESCE(raw_full_name, TRIM(derived_first_name || ' ' || COALESCE(derived_last_name, ''))),
    NEW.email,
    phone_value,
    derived_first_name,
    derived_last_name,
    phone_value
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
