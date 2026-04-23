-- Migration: profiles_sync.sql
-- Description: Syncs profiles table with current TS types and frontend requirements.

DO $$ 
BEGIN 
    -- Add first_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;

    -- Add last_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;

    -- Add phone if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;

    -- Add phone_number alias if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE profiles ADD COLUMN phone_number TEXT;
    END IF;

    -- Add institution fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='institution_id') THEN
        ALTER TABLE profiles ADD COLUMN institution_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='department_id') THEN
        ALTER TABLE profiles ADD COLUMN department_id UUID;
    END IF;

    -- Add slot limits if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='listing_slot_limit') THEN
        ALTER TABLE profiles ADD COLUMN listing_slot_limit INTEGER DEFAULT 5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='community_slot_limit') THEN
        ALTER TABLE profiles ADD COLUMN community_slot_limit INTEGER DEFAULT 2;
    END IF;
END $$;
