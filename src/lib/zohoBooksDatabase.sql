-- ============================================================================
-- ZOHO BOOKS INTEGRATION TABLES
-- Run this SQL in Supabase SQL Editor to set up the database
-- ============================================================================

-- 1. Zoho Books Integrations Table
CREATE TABLE IF NOT EXISTS public.zoho_books_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    organization_id VARCHAR(255) UNIQUE,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Zoho Books Invoices Cache
CREATE TABLE IF NOT EXISTS public.zoho_books_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zoho_invoice_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
    customer_name TEXT,
    invoice_number VARCHAR(255) NOT NULL,
    reference_number TEXT,
    status VARCHAR(50),
    invoice_date DATE,
    due_date DATE,
    amount DECIMAL(12, 2),
    tax_amount DECIMAL(12, 2),
    total DECIMAL(12, 2),
    currency_code VARCHAR(10),
    notes TEXT,
    email_sent BOOLEAN DEFAULT false,
    payment_status VARCHAR(50),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, zoho_invoice_id)
);

-- 3. Zoho Books Customers Cache
CREATE TABLE IF NOT EXISTS public.zoho_books_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zoho_contact_id VARCHAR(255) NOT NULL,
    contact_name TEXT NOT NULL,
    company_name TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website TEXT,
    fax VARCHAR(20),
    status VARCHAR(50),
    currency_code VARCHAR(10),
    billing_address TEXT,
    shipping_address TEXT,
    notes TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, zoho_contact_id)
);

-- 4. Zoho Books Expenses Cache
CREATE TABLE IF NOT EXISTS public.zoho_books_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zoho_expense_id VARCHAR(255) NOT NULL,
    vendor_id VARCHAR(255),
    vendor_name TEXT,
    expense_date DATE,
    reference_number VARCHAR(255),
    account VARCHAR(255),
    amount DECIMAL(12, 2),
    currency_code VARCHAR(10),
    status VARCHAR(50),
    notes TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, zoho_expense_id)
);

-- 5. Zoho Books Items/Products Cache
CREATE TABLE IF NOT EXISTS public.zoho_books_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zoho_item_id VARCHAR(255) NOT NULL,
    item_name TEXT NOT NULL,
    item_type VARCHAR(50),
    status VARCHAR(50),
    rate DECIMAL(12, 2),
    tax_id VARCHAR(255),
    tax_name VARCHAR(255),
    description TEXT,
    unit VARCHAR(50),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, zoho_item_id)
);

-- 6. Zoho Books Reports Cache
CREATE TABLE IF NOT EXISTS public.zoho_books_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    report_date DATE,
    total_income DECIMAL(12, 2),
    total_expenses DECIMAL(12, 2),
    net_profit DECIMAL(12, 2),
    total_assets DECIMAL(12, 2),
    total_liabilities DECIMAL(12, 2),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoho_books_integrations_user_id ON public.zoho_books_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_integrations_organization_id ON public.zoho_books_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_invoices_user_id ON public.zoho_books_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_invoices_status ON public.zoho_books_invoices(status);
CREATE INDEX IF NOT EXISTS idx_zoho_books_invoices_created_at ON public.zoho_books_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zoho_books_customers_user_id ON public.zoho_books_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_customers_status ON public.zoho_books_customers(status);
CREATE INDEX IF NOT EXISTS idx_zoho_books_expenses_user_id ON public.zoho_books_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_expenses_status ON public.zoho_books_expenses(status);
CREATE INDEX IF NOT EXISTS idx_zoho_books_expenses_created_at ON public.zoho_books_expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zoho_books_items_user_id ON public.zoho_books_items(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_reports_user_id ON public.zoho_books_reports(user_id);

-- 8. Enable RLS on all tables
ALTER TABLE public.zoho_books_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_reports ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies - Users can only access their own data
DROP POLICY IF EXISTS "Users can view their Zoho Books integration" ON public.zoho_books_integrations;
CREATE POLICY "Users can view their Zoho Books integration"
  ON public.zoho_books_integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their Zoho Books integration" ON public.zoho_books_integrations;
CREATE POLICY "Users can update their Zoho Books integration"
  ON public.zoho_books_integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Invoices policies
DROP POLICY IF EXISTS "Users can view their Zoho Books invoices" ON public.zoho_books_invoices;
CREATE POLICY "Users can view their Zoho Books invoices"
  ON public.zoho_books_invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their Zoho Books invoices" ON public.zoho_books_invoices;
CREATE POLICY "Users can insert their Zoho Books invoices"
  ON public.zoho_books_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their Zoho Books invoices" ON public.zoho_books_invoices;
CREATE POLICY "Users can update their Zoho Books invoices"
  ON public.zoho_books_invoices
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Customers policies
DROP POLICY IF EXISTS "Users can view their Zoho Books customers" ON public.zoho_books_customers;
CREATE POLICY "Users can view their Zoho Books customers"
  ON public.zoho_books_customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their Zoho Books customers" ON public.zoho_books_customers;
CREATE POLICY "Users can insert their Zoho Books customers"
  ON public.zoho_books_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their Zoho Books customers" ON public.zoho_books_customers;
CREATE POLICY "Users can update their Zoho Books customers"
  ON public.zoho_books_customers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Expenses policies
DROP POLICY IF EXISTS "Users can view their Zoho Books expenses" ON public.zoho_books_expenses;
CREATE POLICY "Users can view their Zoho Books expenses"
  ON public.zoho_books_expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their Zoho Books expenses" ON public.zoho_books_expenses;
CREATE POLICY "Users can insert their Zoho Books expenses"
  ON public.zoho_books_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their Zoho Books expenses" ON public.zoho_books_expenses;
CREATE POLICY "Users can update their Zoho Books expenses"
  ON public.zoho_books_expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Items policies
DROP POLICY IF EXISTS "Users can view their Zoho Books items" ON public.zoho_books_items;
CREATE POLICY "Users can view their Zoho Books items"
  ON public.zoho_books_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Reports policies
DROP POLICY IF EXISTS "Users can view their Zoho Books reports" ON public.zoho_books_reports;
CREATE POLICY "Users can view their Zoho Books reports"
  ON public.zoho_books_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their Zoho Books reports" ON public.zoho_books_reports;
CREATE POLICY "Users can insert their Zoho Books reports"
  ON public.zoho_books_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 10. Create triggers for updated_at columns
DROP TRIGGER IF EXISTS trigger_update_zoho_books_integrations_updated_at ON public.zoho_books_integrations;
CREATE TRIGGER trigger_update_zoho_books_integrations_updated_at
  BEFORE UPDATE ON public.zoho_books_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_zoho_books_invoices_updated_at ON public.zoho_books_invoices;
CREATE TRIGGER trigger_update_zoho_books_invoices_updated_at
  BEFORE UPDATE ON public.zoho_books_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_zoho_books_customers_updated_at ON public.zoho_books_customers;
CREATE TRIGGER trigger_update_zoho_books_customers_updated_at
  BEFORE UPDATE ON public.zoho_books_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_zoho_books_expenses_updated_at ON public.zoho_books_expenses;
CREATE TRIGGER trigger_update_zoho_books_expenses_updated_at
  BEFORE UPDATE ON public.zoho_books_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_zoho_books_items_updated_at ON public.zoho_books_items;
CREATE TRIGGER trigger_update_zoho_books_items_updated_at
  BEFORE UPDATE ON public.zoho_books_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_zoho_books_reports_updated_at ON public.zoho_books_reports;
CREATE TRIGGER trigger_update_zoho_books_reports_updated_at
  BEFORE UPDATE ON public.zoho_books_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
