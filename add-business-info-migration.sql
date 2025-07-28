-- Add business information fields to profiles table
-- These fields will be used for invoice headers

ALTER TABLE profiles 
ADD COLUMN business_address TEXT,
ADD COLUMN business_phone TEXT,
ADD COLUMN business_vat_number TEXT,
ADD COLUMN business_email TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.business_address IS 'Business address for invoices';
COMMENT ON COLUMN profiles.business_phone IS 'Business phone number for invoices';
COMMENT ON COLUMN profiles.business_vat_number IS 'Business VAT/Tax ID number for invoices';
COMMENT ON COLUMN profiles.business_email IS 'Business email for invoices (can be different from user email)';