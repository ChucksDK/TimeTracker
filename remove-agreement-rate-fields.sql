-- Make contract_type and rate nullable in agreements table
-- Since payment type is now handled at the customer level

-- Make contract_type nullable and set default
ALTER TABLE agreements 
ALTER COLUMN contract_type DROP NOT NULL,
ALTER COLUMN contract_type SET DEFAULT 'hourly';

-- Make rate nullable and set default
ALTER TABLE agreements 
ALTER COLUMN rate DROP NOT NULL,
ALTER COLUMN rate SET DEFAULT 0;

-- Update any NULL values to defaults
UPDATE agreements 
SET contract_type = 'hourly' 
WHERE contract_type IS NULL;

UPDATE agreements 
SET rate = 0 
WHERE rate IS NULL;

-- Note: In a future migration, you can completely drop these columns:
-- ALTER TABLE agreements DROP COLUMN contract_type;
-- ALTER TABLE agreements DROP COLUMN rate;