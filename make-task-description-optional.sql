-- Make task_description nullable since we're using task_id instead
ALTER TABLE time_entries 
ALTER COLUMN task_description DROP NOT NULL,
ALTER COLUMN task_description SET DEFAULT '';

-- Update existing entries to use empty string if null
UPDATE time_entries 
SET task_description = '' 
WHERE task_description IS NULL;