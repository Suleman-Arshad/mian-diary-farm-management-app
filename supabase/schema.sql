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
    billing_month TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Online', 'JazzCash', 'Bank Transfer', 'EasyPaisa/JazzCash')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill payments created before billing-month allocation was introduced.
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS billing_month TEXT;
UPDATE customer_payments
SET billing_month = to_char(payment_date, 'YYYY-MM')
WHERE billing_month IS NULL OR billing_month = '';
ALTER TABLE customer_payments ALTER COLUMN billing_month SET NOT NULL;
ALTER TABLE customer_payments
  ALTER COLUMN billing_month SET DEFAULT to_char(CURRENT_DATE, 'YYYY-MM');
ALTER TABLE customer_payments
  DROP CONSTRAINT IF EXISTS customer_payments_payment_mode_check;
ALTER TABLE customer_payments
  ADD CONSTRAINT customer_payments_payment_mode_check
  CHECK (payment_mode IN ('Cash', 'Online', 'JazzCash', 'Bank Transfer', 'EasyPaisa/JazzCash'));
ALTER TABLE customer_payments
  DROP CONSTRAINT IF EXISTS customer_payments_billing_month_check;
ALTER TABLE customer_payments
  ADD CONSTRAINT customer_payments_billing_month_check
  CHECK (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

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

-- 8. FARM OPERATIONS
CREATE TABLE IF NOT EXISTS animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    animal_type TEXT NOT NULL CHECK (animal_type IN ('Cow', 'Buffalo', 'Calf')),
    breed TEXT,
    birth_date DATE,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Sold', 'Deceased')),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    purchase_date DATE,
    sale_price NUMERIC(12, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
    sale_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS animal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('Medical', 'Vaccination', 'Calving')),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    next_due_date DATE,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'kg',
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    low_stock_threshold NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
    unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feed_inventory(id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Purchase', 'Consumption')),
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medicine_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'dose',
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    low_stock_threshold NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
    unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS veterinary_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicine_inventory(id) ON DELETE SET NULL,
    treatment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    treatment TEXT NOT NULL,
    dosage TEXT NOT NULL DEFAULT '',
    quantity_used NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity_used >= 0),
    medicine_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (medicine_cost >= 0),
    vet_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (vet_fee >= 0),
    next_checkup_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milk_production (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    morning_yield NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (morning_yield >= 0),
    evening_yield NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (evening_yield >= 0),
    wastage NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (wastage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_animal_production_date UNIQUE (animal_id, production_date)
);

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    wage_type TEXT NOT NULL CHECK (wage_type IN ('Monthly Salary', 'Daily Wages')),
    wage_rate NUMERIC(12, 2) NOT NULL CHECK (wage_rate >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    period_month TEXT NOT NULL CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_worked NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (days_worked >= 0),
    base_wage NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_wage >= 0),
    advances NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (advances >= 0),
    bonuses NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bonuses >= 0),
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
    overtime NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (overtime >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE worker_payrolls DROP CONSTRAINT IF EXISTS unique_worker_payroll_month;

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep the existing daily_expenses API and reports compatible while providing
-- a normalized expenses ledger for farm-generated and manually entered costs.
ALTER TABLE daily_expenses ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE daily_expenses ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE daily_expenses DROP CONSTRAINT IF EXISTS daily_expenses_category_check;
ALTER TABLE daily_expenses ADD CONSTRAINT daily_expenses_category_check
  CHECK (category IN (
    'Petrol/Fuel', 'Vehicle Maintenance', 'Staff Salary', 'Feed/Containers',
    'Feed Purchase', 'Veterinary', 'Worker Payroll', 'Animal Purchase', 'Miscellaneous'
  ));
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_expenses_source
  ON daily_expenses(source_type, source_id) WHERE source_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY REFERENCES daily_expenses(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    source_type TEXT,
    source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sync_expense_ledger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM expenses WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO expenses (id, expense_date, category, amount, description, source_type, source_id, created_at)
  VALUES (NEW.id, NEW.expense_date, NEW.category, NEW.amount, NEW.description, NEW.source_type, NEW.source_id, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    expense_date = EXCLUDED.expense_date,
    category = EXCLUDED.category,
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS daily_expenses_ledger_sync ON daily_expenses;
CREATE TRIGGER daily_expenses_ledger_sync
  AFTER INSERT OR UPDATE OR DELETE ON daily_expenses
  FOR EACH ROW EXECUTE FUNCTION sync_expense_ledger();
INSERT INTO expenses (id, expense_date, category, amount, description, source_type, source_id, created_at)
SELECT id, expense_date, category, amount, description, source_type, source_id, created_at
FROM daily_expenses
ON CONFLICT (id) DO UPDATE SET
  expense_date = EXCLUDED.expense_date,
  category = EXCLUDED.category,
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id;

CREATE OR REPLACE FUNCTION record_farm_expense()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_category TEXT;
  v_amount NUMERIC(12, 2);
  v_date DATE;
  v_description TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  DELETE FROM daily_expenses
  WHERE source_type = TG_TABLE_NAME AND source_id = NEW.id;

  IF TG_TABLE_NAME = 'feed_transactions' AND NEW.transaction_type = 'Purchase' THEN
    v_category := 'Feed Purchase';
    v_amount := NEW.total_cost;
    v_date := NEW.transaction_date;
    v_description := 'Feed purchase: ' || NEW.quantity || ' ' || (SELECT unit FROM feed_inventory WHERE id = NEW.feed_id);
  ELSIF TG_TABLE_NAME = 'veterinary_logs' THEN
    v_category := 'Veterinary';
    v_amount := NEW.medicine_cost + NEW.vet_fee;
    v_date := NEW.treatment_date;
    v_description := 'Veterinary care: ' || NEW.treatment;
  ELSIF TG_TABLE_NAME = 'animal_records' THEN
    v_category := 'Veterinary';
    v_amount := NEW.cost;
    v_date := NEW.record_date;
    v_description := NEW.record_type || ' record: ' || NEW.description;
  ELSIF TG_TABLE_NAME = 'worker_payrolls' THEN
    v_category := 'Worker Payroll';
    v_amount := NEW.amount_paid + NEW.advances;
    v_date := NEW.payment_date;
    v_description := 'Worker payroll payment';
  ELSIF TG_TABLE_NAME = 'animals' AND NEW.purchase_price > 0 THEN
    v_category := 'Animal Purchase';
    v_amount := NEW.purchase_price;
    v_date := NEW.purchase_date;
    v_description := 'Animal purchase: ' || NEW.name || ' (' || NEW.tag_number || ')';
  ELSE
    RETURN NEW;
  END IF;

  IF v_amount > 0 AND v_date IS NOT NULL THEN
    INSERT INTO daily_expenses (expense_date, category, amount, description, source_type, source_id)
    VALUES (v_date, v_category, v_amount, v_description, TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_type, source_id) WHERE source_type IS NOT NULL
    DO UPDATE SET expense_date = EXCLUDED.expense_date, category = EXCLUDED.category,
      amount = EXCLUDED.amount, description = EXCLUDED.description;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS feed_purchase_expense ON feed_transactions;
CREATE TRIGGER feed_purchase_expense AFTER INSERT OR UPDATE OR DELETE ON feed_transactions
  FOR EACH ROW EXECUTE FUNCTION record_farm_expense();
DROP TRIGGER IF EXISTS veterinary_expense ON veterinary_logs;
CREATE TRIGGER veterinary_expense AFTER INSERT OR UPDATE OR DELETE ON veterinary_logs
  FOR EACH ROW EXECUTE FUNCTION record_farm_expense();
DROP TRIGGER IF EXISTS animal_record_expense ON animal_records;
CREATE TRIGGER animal_record_expense AFTER INSERT OR UPDATE OR DELETE ON animal_records
  FOR EACH ROW EXECUTE FUNCTION record_farm_expense();
DROP TRIGGER IF EXISTS worker_payroll_expense ON worker_payrolls;
CREATE TRIGGER worker_payroll_expense AFTER INSERT OR UPDATE OR DELETE ON worker_payrolls
  FOR EACH ROW EXECUTE FUNCTION record_farm_expense();
DROP TRIGGER IF EXISTS animal_purchase_expense ON animals;
CREATE TRIGGER animal_purchase_expense AFTER INSERT OR UPDATE OR DELETE ON animals
  FOR EACH ROW EXECUTE FUNCTION record_farm_expense();

CREATE OR REPLACE FUNCTION apply_feed_transaction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_type = 'Purchase' THEN
    UPDATE feed_inventory SET quantity = quantity + NEW.quantity,
      unit_rate = NEW.unit_rate WHERE id = NEW.feed_id;
  ELSE
    UPDATE feed_inventory SET quantity = quantity - NEW.quantity
      WHERE id = NEW.feed_id AND quantity >= NEW.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient feed stock for transaction';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS feed_inventory_transaction ON feed_transactions;
CREATE TRIGGER feed_inventory_transaction BEFORE INSERT ON feed_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_feed_transaction();

CREATE OR REPLACE FUNCTION apply_medicine_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.medicine_id IS NOT NULL AND NEW.quantity_used > 0 THEN
    UPDATE medicine_inventory SET quantity = quantity - NEW.quantity_used
      WHERE id = NEW.medicine_id AND quantity >= NEW.quantity_used;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient medicine stock for treatment';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS veterinary_medicine_usage ON veterinary_logs;
CREATE TRIGGER veterinary_medicine_usage BEFORE INSERT ON veterinary_logs
  FOR EACH ROW EXECUTE FUNCTION apply_medicine_usage();

CREATE INDEX IF NOT EXISTS idx_animals_status_type ON animals(status, animal_type);
CREATE INDEX IF NOT EXISTS idx_animal_records_animal_date ON animal_records(animal_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_feed_transactions_date ON feed_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_veterinary_logs_animal_date ON veterinary_logs(animal_id, treatment_date DESC);
CREATE INDEX IF NOT EXISTS idx_milk_production_date ON milk_production(production_date);
CREATE INDEX IF NOT EXISTS idx_worker_payrolls_worker_month ON worker_payrolls(worker_id, period_month);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_date ON supplier_payments(supplier_id, payment_date);

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
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinary_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated access (standard for single-tenant / local web portal)
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_sales" ON daily_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customer_payments" ON customer_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_purchases" ON daily_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_expenses" ON daily_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'animals', 'animal_records', 'feed_inventory', 'feed_transactions',
    'medicine_inventory', 'veterinary_logs', 'milk_production', 'workers',
    'worker_payrolls', 'supplier_payments', 'expenses'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Allow all operations on ' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', 'Allow all operations on ' || t, t);
  END LOOP;
END $$;

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
