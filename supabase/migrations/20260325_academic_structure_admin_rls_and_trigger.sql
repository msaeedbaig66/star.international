-- Add admin RLS policies for academic structure and ensure signup metadata is persisted in profiles

GRANT SELECT ON TABLE public.sector_types, public.institutions, public.departments TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sector_types, public.institutions, public.departments TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sector_types' AND policyname = 'sector_types_admin_manage'
  ) THEN
    CREATE POLICY sector_types_admin_manage ON public.sector_types
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'institutions' AND policyname = 'institutions_admin_manage'
  ) THEN
    CREATE POLICY institutions_admin_manage ON public.institutions
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'departments_admin_manage'
  ) THEN
    CREATE POLICY departments_admin_manage ON public.departments
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  raw_full_name TEXT;
  derived_first_name TEXT;
  derived_last_name TEXT;
  phone_value TEXT;
  sector_type_id_text TEXT;
  institution_id_text TEXT;
  department_id_text TEXT;
  sector_type_uuid UUID;
  institution_uuid UUID;
  department_uuid UUID;
  institution_name_value TEXT;
  department_name_value TEXT;
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

  sector_type_id_text := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'sector_type_id', '')), '');
  institution_id_text := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institution_id', '')), '');
  department_id_text := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department_id', '')), '');

  IF sector_type_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    sector_type_uuid := sector_type_id_text::UUID;
  END IF;

  IF institution_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    institution_uuid := institution_id_text::UUID;
  END IF;

  IF department_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    department_uuid := department_id_text::UUID;
  END IF;

  institution_name_value := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institution_name', '')), '');
  department_name_value := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department_name', '')), '');

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
    sector_type_uuid,
    institution_uuid,
    department_uuid,
    institution_name_value,
    department_name_value
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
