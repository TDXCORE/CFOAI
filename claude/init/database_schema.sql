-- CFO AI SaaS Database Schema
-- Supabase PostgreSQL with Row Level Security (RLS)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE TENANT & USER MANAGEMENT
-- =============================================

-- Tenants table for multi-tenant architecture
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Users profile extension
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/Bogota',
    locale TEXT DEFAULT 'es-CO',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-tenant relationships with roles
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'approver', 'analyst', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, tenant_id)
);

-- =============================================
-- EMAIL & FILE MANAGEMENT
-- =============================================

-- Mailbox configurations for Outlook integration
CREATE TABLE mailboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mailbox_address TEXT NOT NULL,
    display_name TEXT,
    ms_tenant_id TEXT,
    ms_subscription_id TEXT,
    folder_id TEXT NOT NULL DEFAULT 'inbox',
    folder_name TEXT DEFAULT 'Facturas',
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'expired')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email messages processed
CREATE TABLE mail_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mailbox_id UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    ms_message_id TEXT NOT NULL,
    subject TEXT,
    sender_email TEXT,
    sender_name TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, ms_message_id)
);

-- Files storage references
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id UUID REFERENCES mail_messages(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    original_filename TEXT,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    file_hash TEXT,
    source TEXT NOT NULL CHECK (source IN ('email', 'upload', 'zip_extract')),
    status TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'processing', 'processed', 'error', 'deleted')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROCESSING & JOBS
-- =============================================

-- Processing jobs queue
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id UUID REFERENCES mail_messages(id) ON DELETE SET NULL,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('email_process', 'file_parse', 'manual_upload')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'parsing', 'llm_classify', 'tax_compute', 'ready_for_review', 'approved', 'exported', 'error', 'cancelled')),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    progress_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BUSINESS ENTITIES
-- =============================================

-- Invoice master data
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    
    -- Invoice identification
    invoice_number TEXT NOT NULL,
    invoice_type TEXT CHECK (invoice_type IN ('invoice', 'credit_note', 'debit_note')),
    cufe TEXT, -- Colombian unique fiscal identifier
    
    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE,
    
    -- Supplier information
    supplier_nit TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_address TEXT,
    supplier_city TEXT,
    supplier_phone TEXT,
    supplier_email TEXT,
    
    -- Buyer information  
    buyer_nit TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_address TEXT,
    buyer_city TEXT,
    
    -- Financial data
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency_code TEXT DEFAULT 'COP',
    
    -- Processing metadata
    source_format TEXT CHECK (source_format IN ('xml_ubl', 'pdf_ocr', 'image_ocr')),
    confidence_score DECIMAL(3,2),
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed', 'classified', 'calculated', 'reviewed', 'approved', 'exported')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT invoice_number_tenant_unique UNIQUE (tenant_id, invoice_number, supplier_nit)
);

-- Invoice line items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Item details
    item_code TEXT,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure TEXT,
    unit_price DECIMAL(15,4) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    
    -- Tax information per line
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_rate DECIMAL(5,2),
    discount_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Classification
    expense_category TEXT,
    account_code TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT line_number_per_invoice UNIQUE (invoice_id, line_number)
);

-- =============================================
-- AI CLASSIFICATION & TAX CALCULATIONS
-- =============================================

-- AI classification results
CREATE TABLE classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Classification results
    expense_kind TEXT NOT NULL CHECK (expense_kind IN ('goods', 'services', 'professional_fees')),
    is_large_taxpayer BOOLEAN,
    city_code TEXT,
    expense_category TEXT,
    
    -- AI metadata
    confidence_score DECIMAL(3,2) NOT NULL,
    rationale TEXT,
    model_version TEXT,
    processing_time INTEGER, -- milliseconds
    
    -- Review status
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_changes JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax calculation rules
CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL for system-wide rules
    
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('iva', 'reteiva', 'retefuente', 'ica')),
    country_code TEXT DEFAULT 'CO',
    
    -- Rule conditions (JSON for flexibility)
    conditions JSONB NOT NULL, -- {expense_kind: "services", is_large_taxpayer: true, amount_min: 1000000}
    
    -- Calculation formula (JSON)
    formula JSONB NOT NULL, -- {rate: 0.19, base_field: "subtotal", min_base: 0}
    
    -- Metadata
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Retention rules (specific for Colombian regulations)
CREATE TABLE retention_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retention_type TEXT NOT NULL CHECK (retention_type IN ('reteiva', 'retefuente')),
    concept_code TEXT, -- For ReteFuente concepts
    
    -- Conditions
    expense_kind TEXT CHECK (expense_kind IN ('goods', 'services', 'professional_fees')),
    is_large_taxpayer BOOLEAN,
    amount_threshold DECIMAL(15,2),
    
    -- Rates
    rate_percentage DECIMAL(5,2) NOT NULL,
    base_uvt DECIMAL(15,2), -- In UVT (Colombian tax units)
    
    -- Account mapping
    account_code TEXT,
    
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Municipal ICA rates
CREATE TABLE ica_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_code TEXT NOT NULL, -- DANE code
    city_name TEXT NOT NULL,
    activity_code TEXT, -- CIIU code
    activity_description TEXT,
    rate_per_thousand DECIMAL(5,3) NOT NULL, -- Rate per 1000 COP
    minimum_amount DECIMAL(15,2) DEFAULT 0,
    
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax calculation results
CREATE TABLE tax_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
    
    -- Base amounts
    iva_base DECIMAL(15,2) DEFAULT 0,
    reteiva_base DECIMAL(15,2) DEFAULT 0,
    retefuente_base DECIMAL(15,2) DEFAULT 0,
    ica_base DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated amounts
    iva_amount DECIMAL(15,2) DEFAULT 0,
    reteiva_amount DECIMAL(15,2) DEFAULT 0,
    retefuente_amount DECIMAL(15,2) DEFAULT 0,
    ica_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Applied rates
    iva_rate DECIMAL(5,2),
    reteiva_rate DECIMAL(5,2),
    retefuente_rate DECIMAL(5,2),
    ica_rate DECIMAL(5,3),
    
    -- Calculation details
    applied_rules JSONB, -- Array of rule IDs used
    calculation_details JSONB, -- Step-by-step calculation
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rules_version TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACCOUNTING INTEGRATION
-- =============================================

-- Chart of accounts mapping
CREATE TABLE accounts_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Mapping conditions
    supplier_nit TEXT,
    expense_category TEXT,
    account_type TEXT, -- "expense", "tax", "retention"
    
    -- Mapping results
    account_code TEXT NOT NULL, -- PUC account code
    account_name TEXT,
    cost_center_code TEXT,
    cost_center_name TEXT,
    
    -- Priority and rules
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    conditions JSONB, -- Additional flexible conditions
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Generated accounting entries
CREATE TABLE accounting_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Entry details
    entry_number TEXT,
    entry_date DATE NOT NULL,
    description TEXT,
    reference TEXT,
    
    -- Generated data
    entries_json JSONB NOT NULL, -- Array of debit/credit entries
    total_debits DECIMAL(15,2) NOT NULL,
    total_credits DECIMAL(15,2) NOT NULL,
    
    -- Export information
    export_format TEXT, -- "siigo_csv", "world_office_json", "sap_idoc"
    exported_to TEXT,
    exported_at TIMESTAMP WITH TIME ZONE,
    export_file_id UUID REFERENCES files(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'exported', 'error')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Export jobs and batches
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Export parameters
    export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'json', 'xml', 'excel')),
    target_system TEXT NOT NULL, -- "siigo", "world_office", "sap", "generic"
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    -- Filters
    filters JSONB DEFAULT '{}',
    invoice_ids UUID[] DEFAULT '{}',
    
    -- Results
    total_invoices INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    file_id UUID REFERENCES files(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'error')),
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- =============================================
-- AUDIT & MONITORING
-- =============================================

-- Audit logs for all significant operations
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Action details
    action TEXT NOT NULL, -- "create", "update", "delete", "approve", "export"
    entity_type TEXT NOT NULL, -- "invoice", "classification", "export"
    entity_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core business indexes
CREATE INDEX idx_invoices_tenant_date ON invoices(tenant_id, issue_date DESC);
CREATE INDEX idx_invoices_supplier ON invoices(tenant_id, supplier_nit);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_needs_review ON invoices(tenant_id, needs_review) WHERE needs_review = TRUE;

-- Processing indexes
CREATE INDEX idx_processing_jobs_status ON processing_jobs(tenant_id, status, created_at);
CREATE INDEX idx_processing_jobs_queue ON processing_jobs(status, priority DESC, created_at) WHERE status IN ('queued', 'parsing');

-- Files and messages
CREATE INDEX idx_files_tenant_source ON files(tenant_id, source, created_at DESC);
CREATE INDEX idx_mail_messages_tenant_status ON mail_messages(tenant_id, status, received_at DESC);

-- Audit and monitoring
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Tax calculations
CREATE INDEX idx_tax_calculations_invoice ON tax_calculations(invoice_id);
CREATE INDEX idx_classifications_invoice ON classifications(invoice_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant IDs
CREATE OR REPLACE FUNCTION auth.user_tenant_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tenant_id)
  FROM user_tenants
  WHERE user_id = auth.uid()
    AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for main tables
-- (Note: In production, these would be more granular based on roles)

-- Tenants: Users can only see tenants they belong to
CREATE POLICY tenant_access ON tenants
  FOR ALL USING (id = ANY(auth.user_tenant_ids()));

-- Invoices: Scoped by tenant
CREATE POLICY invoice_tenant_access ON invoices
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));

-- All other tenant-scoped tables follow similar pattern
CREATE POLICY mailboxes_tenant_access ON mailboxes
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));

CREATE POLICY mail_messages_tenant_access ON mail_messages
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));

CREATE POLICY files_tenant_access ON files
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));

CREATE POLICY processing_jobs_tenant_access ON processing_jobs
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));

-- Continue with other tables...
-- (Similar RLS policies for all tenant-scoped tables)

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert default Colombian tax rules
INSERT INTO tax_rules (rule_name, rule_type, conditions, formula, effective_from) VALUES
('IVA General 19%', 'iva', '{"expense_kind": ["goods", "services"]}', '{"rate": 0.19, "base_field": "subtotal"}', '2021-01-01'),
('ReteIVA Servicios', 'reteiva', '{"expense_kind": "services", "is_large_taxpayer": false}', '{"rate": 0.15, "base_field": "iva_amount", "min_base": 1000000}', '2021-01-01'),
('ReteFuente Servicios', 'retefuente', '{"expense_kind": "services"}', '{"rate": 0.04, "base_field": "subtotal", "min_base": 1000000}', '2021-01-01');

-- Insert common Colombian cities for ICA
INSERT INTO ica_rates (city_code, city_name, activity_code, activity_description, rate_per_thousand, effective_from) VALUES
('11001', 'Bogotá D.C.', '6201', 'Desarrollo de sistemas informáticos', 4.14, '2021-01-01'),
('05001', 'Medellín', '6201', 'Desarrollo de sistemas informáticos', 7.00, '2021-01-01'),
('76001', 'Cali', '6201', 'Desarrollo de sistemas informáticos', 5.00, '2021-01-01');

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_tenants_updated_at BEFORE UPDATE ON user_tenants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mailboxes_updated_at BEFORE UPDATE ON mailboxes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();