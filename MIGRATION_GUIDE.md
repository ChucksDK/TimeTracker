# Currency Migration Guide

## The Problem
You're getting a 400 error when trying to save the currency setting because the `currency` column doesn't exist in your Supabase database yet.

## The Solution
Run this SQL migration in your Supabase dashboard:

### Step 1: Go to Supabase
1. Open your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Migration
Copy and paste this SQL code:

```sql
-- Add currency column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS currency TEXT 
CHECK (currency IN ('USD', 'EUR', 'DKK')) 
DEFAULT 'USD';
```

### Step 3: Click "Run"
The migration will add the currency column to your profiles table.

## Alternative: Full Migration with Safety Check
If you want a safer version that checks first:

```sql
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'currency'
    ) THEN
        ALTER TABLE profiles ADD COLUMN currency TEXT CHECK (currency IN ('USD', 'EUR', 'DKK')) DEFAULT 'USD';
        RAISE NOTICE 'Currency column added successfully';
    ELSE
        RAISE NOTICE 'Currency column already exists';
    END IF;
END $$;
```

## After Running the Migration
1. Refresh your Settings page
2. Select any currency (USD, EUR, or DKK)
3. Save your settings - it should work now!

## Troubleshooting
If you still get errors after running the migration:
1. Check that you're running it in the correct Supabase project
2. Make sure you have proper permissions
3. Try refreshing the page and clearing your browser cache