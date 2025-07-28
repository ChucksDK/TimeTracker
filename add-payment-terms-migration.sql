-- Add payment_terms column to customers table
-- This column will store the number of days for payment terms (default 14 days)

ALTER TABLE customers 
ADD COLUMN payment_terms INTEGER DEFAULT 14;

-- Add a comment to document the column
COMMENT ON COLUMN customers.payment_terms IS 'Number of days for payment terms (e.g., 14 for net 14)';

-- Add a check constraint to ensure payment terms are reasonable (1-365 days)
ALTER TABLE customers 
ADD CONSTRAINT check_payment_terms_range 
CHECK (payment_terms >= 1 AND payment_terms <= 365);