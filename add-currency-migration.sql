-- Migration: Add currency column to profiles table
-- Run this in your Supabase SQL Editor

-- Add currency column to existing profiles table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'currency'
    ) THEN
        ALTER TABLE profiles ADD COLUMN currency TEXT CHECK (currency IN ('USD', 'EUR', 'DKK')) DEFAULT 'USD';
        RAISE NOTICE 'Currency column added to profiles table';
    ELSE
        RAISE NOTICE 'Currency column already exists in profiles table';
    END IF;
END $$;