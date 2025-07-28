-- Add additional_emails field to customers table
-- This will store multiple email addresses as a JSON array

ALTER TABLE customers 
ADD COLUMN additional_emails JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN customers.additional_emails IS 'Additional email addresses for invoice delivery (JSON array of strings)';