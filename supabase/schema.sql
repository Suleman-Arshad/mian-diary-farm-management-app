-- ==============================================================================
-- Milk Dairy & Distribution Management System - Database Schema (Supabase)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    fixed_rate_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 180.00,
    previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DAILY SALES (MILK DELIVERIES) TABLE
CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    qty_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    is_nagha BOOLEAN NOT NULL DEFAULT false,
    custom_rate NUMERIC(10, 2),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_customer_entry_date UNIQUE (customer_id, entry_date)
);

-- 3. CUSTOMER PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS customer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'EasyPaisa/JazzCash')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name TEXT NOT NULL,
    phone TEXT,
    purchase_rate_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 160.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. DAILY PURCHASES (FARM INTAKE) TABLE
CREATE TABLE IF NOT EXISTS daily_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL,
    qty_kg NUMERIC(8, 2) NOT NULL CHECK (qty_kg >= 0),
    rate_per_kg NUMERIC(10, 2) NOT NULL CHECK (rate_per_kg >= 0),
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DAILY EXPENSES TABLE
CREATE TABLE IF NOT EXISTS daily_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('Petrol/Fuel', 'Vehicle Maintenance', 'Staff Salary', 'Feed/Containers', 'Miscellaneous')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PROFILES / ADMIN METADATA TABLE (Optional - linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL DEFAULT 'Mian Dairy Farm',
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_sales_entry_date ON daily_sales(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_customer_id ON daily_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON customer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_daily_purchases_date ON daily_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_daily_purchases_supplier ON daily_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON daily_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_category ON daily_expenses(category);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated access (standard for single-tenant / local web portal)
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_sales" ON daily_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customer_payments" ON customer_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_purchases" ON daily_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_expenses" ON daily_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- POSTGRES ROLES & PERMISSIONS (Crucial for Anon & Authenticated API access)
-- Fixes PostgreSQL error 42501: "permission denied for table <table_name>"
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- FOREIGN KEY CASCADE ENFORCEMENT (For existing setups)
-- Run these statements if your database tables were previously created without ON DELETE CASCADE
-- ==============================================================================
DO $$
BEGIN
  -- 1. Daily Sales -> Customers
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'daily_sales_customer_id_fkey'
  ) THEN
    ALTER TABLE daily_sales DROP CONSTRAINT daily_sales_customer_id_fkey;
  END IF;
  ALTER TABLE daily_sales
    ADD CONSTRAINT daily_sales_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

  -- 2. Customer Payments -> Customers
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_payments_customer_id_fkey'
  ) THEN
    ALTER TABLE customer_payments DROP CONSTRAINT customer_payments_customer_id_fkey;
  END IF;
  ALTER TABLE customer_payments
    ADD CONSTRAINT customer_payments_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

  -- 3. Daily Purchases -> Suppliers
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'daily_purchases_supplier_id_fkey'
  ) THEN
    ALTER TABLE daily_purchases DROP CONSTRAINT daily_purchases_supplier_id_fkey;
  END IF;
  ALTER TABLE daily_purchases
    ADD CONSTRAINT daily_purchases_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
END $$;


-- ==============================================================================
-- PHONE FIELD MIGRATION — Run once in Supabase SQL Editor for existing databases
-- Makes the phone column optional (NULL) on all relevant tables and safely drops
-- the UNIQUE constraint on customers.phone so multiple customers can omit phone.
-- ==============================================================================
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- 1. Drop UNIQUE constraint on customers.phone if it exists (name may vary)
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'customers'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'phone'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE customers DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  -- 2. Allow NULL for customers.phone
  ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

  -- 3. Allow NULL for profiles.phone (may already be nullable)
  BEGIN
    ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL; -- Column is already nullable, skip
  END;

  -- 4. Allow NULL for admins.phone if that table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins'
  ) THEN
    BEGIN
      ALTER TABLE admins ALTER COLUMN phone DROP NOT NULL;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;
