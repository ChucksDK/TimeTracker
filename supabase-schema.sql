-- Time Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT,
    internal_hourly_rate DECIMAL(10,2) DEFAULT 0,
    currency TEXT CHECK (currency IN ('USD', 'EUR', 'DKK')) DEFAULT 'USD',
    company_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    billing_address TEXT,
    vat_number TEXT,
    default_rate DECIMAL(10,2) DEFAULT 0,
    rate_type TEXT CHECK (rate_type IN ('hourly', 'monthly')) DEFAULT 'hourly',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    contract_type TEXT CHECK (contract_type IN ('hourly', 'monthly')) DEFAULT 'hourly',
    rate DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
    task_description TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_billable BOOLEAN DEFAULT TRUE,
    is_invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure end_time is after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    -- Ensure duration matches time range
    CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_percentage DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')) DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    email_status TEXT,
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, invoice_number)
);

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    time_entry_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Customers policies
CREATE POLICY "Users can view own customers" ON customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own customers" ON customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON customers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON customers
    FOR DELETE USING (auth.uid() = user_id);

-- Agreements policies
CREATE POLICY "Users can view own agreements" ON agreements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agreements" ON agreements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agreements" ON agreements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agreements" ON agreements
    FOR DELETE USING (auth.uid() = user_id);

-- Time entries policies
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries" ON time_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries" ON time_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Invoice line items policies
CREATE POLICY "Users can manage own invoice line items" ON invoice_line_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_line_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_agreements_customer_id ON agreements(customer_id);
CREATE INDEX IF NOT EXISTS idx_agreements_user_id ON agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_customer_id ON time_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billable ON time_entries(is_billable);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_invoiced ON time_entries(is_invoiced);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Insert some sample data for development (optional)
-- You can remove this section if you don't want sample data

-- Note: This will only work after you've authenticated and have a user ID
-- Replace the UUID below with your actual user ID from auth.users after signup

/*
-- Sample profile (replace with your actual user ID)
INSERT INTO profiles (id, email, company_name, internal_hourly_rate) VALUES
('00000000-0000-0000-0000-000000000000', 'your@email.com', 'Your Consulting Company', 75.00)
ON CONFLICT (id) DO NOTHING;

-- Sample customers
INSERT INTO customers (user_id, company_name, contact_person, email, default_rate, rate_type) VALUES
('00000000-0000-0000-0000-000000000000', 'Tech Startup Inc', 'John Smith', 'john@techstartup.com', 150.00, 'hourly'),
('00000000-0000-0000-0000-000000000000', 'Marketing Agency', 'Sarah Johnson', 'sarah@marketing.com', 125.00, 'hourly'),
('00000000-0000-0000-0000-000000000000', 'E-commerce Co', 'Mike Davis', 'mike@ecommerce.com', 3000.00, 'monthly')
ON CONFLICT DO NOTHING;
*/

-- Migration: Add currency column to existing profiles table
-- Run this if you already have a profiles table without the currency column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'currency'
    ) THEN
        ALTER TABLE profiles ADD COLUMN currency TEXT CHECK (currency IN ('USD', 'EUR', 'DKK')) DEFAULT 'USD';
    END IF;
END $$;