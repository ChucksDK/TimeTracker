-- Migration: Add drive_required and kilometers fields to time_entries table
-- Add support for tracking driving to customer visits

DO $$ 
BEGIN 
    -- Add drive_required column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'drive_required'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN drive_required BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add kilometers column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'kilometers'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN kilometers DECIMAL(8,2) DEFAULT NULL;
    END IF;
END $$;

-- Add constraint to ensure kilometers is only set when drive_required is true
ALTER TABLE time_entries 
DROP CONSTRAINT IF EXISTS check_kilometers_with_drive;

ALTER TABLE time_entries 
ADD CONSTRAINT check_kilometers_with_drive 
CHECK (
    (drive_required = FALSE AND kilometers IS NULL) OR 
    (drive_required = TRUE AND kilometers IS NOT NULL AND kilometers >= 0)
);

-- Create index for drive_required for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_drive_required ON time_entries(drive_required);