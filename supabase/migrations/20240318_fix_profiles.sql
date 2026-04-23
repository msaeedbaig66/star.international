-- Fix profiles table and handle_new_user trigger

-- 1. Add phone column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Improve handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
BEGIN
  -- Get username from metadata or fallback to email prefix
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Ensure username is unique (append random suffix if needed to prevent trigger failure)
  -- This is a safety measure so the auth user creation doesn't fail 500
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) THEN
    new_username := new_username || '_' || substring(md5(random()::text) from 1 for 4);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, email, phone)
  VALUES (
    NEW.id,
    new_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error or just return NEW so auth user is at least created
  -- (though in Supabase, trigger failure prevents auth user creation)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
