// CFO AI Database Types
// Generated from database schema

export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type UserRole = 'owner' | 'admin' | 'approver' | 'analyst' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'invited';

export type FileSource = 'email' | 'upload' | 'zip_extract';
export type FileStatus = 'stored' | 'processing' | 'processed' | 'error' | 'deleted';

export type JobType = 'email_process' | 'file_parse' | 'manual_upload';
export type JobStatus = 'queued' | 'parsing' | 'llm_classify' | 'tax_compute' | 'ready_for_review' | 'approved' | 'exported' | 'error' | 'cancelled';

export type InvoiceType = 'invoice' | 'credit_note' | 'debit_note';
export type InvoiceStatus = 'parsed' | 'classified' | 'calculated' | 'reviewed' | 'approved' | 'exported';
export type SourceFormat = 'xml_ubl' | 'pdf_ocr' | 'image_ocr';

export type ExpenseKind = 'goods' | 'services' | 'professional_fees';
export type TaxRuleType = 'iva' | 'reteiva' | 'retefuente' | 'ica';
export type RetentionType = 'reteiva' | 'retefuente';
export type AccountType = 'expense' | 'tax' | 'retention';

export type ExportType = 'csv' | 'json' | 'xml' | 'excel';
export type TargetSystem = 'siigo' | 'world_office' | 'sap' | 'generic';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'error';

export type MailboxStatus = 'connected' | 'disconnected' | 'error' | 'expired';
export type MessageStatus = 'pending' | 'processed' | 'failed' | 'ignored';

export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'export';
export type EntityType = 'invoice' | 'classification' | 'export' | 'tenant' | 'user';

// Base entity interfaces
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface TenantScopedEntity extends BaseEntity {
  tenant_id: string;
}

// Core entities
export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  settings: Record<string, any>;
  created_by?: string;
}

export interface UserProfile extends BaseEntity {
  id: string; // Same as auth.users.id
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  locale: string;
  preferences: Record<string, any>;
}

export interface UserTenant extends BaseEntity {
  user_id: string;
  tenant_id: string;
  role: UserRole;
  status: UserStatus;
  permissions: Record<string, any>;
  created_by?: string;
}

// Email and file management
export interface Mailbox extends TenantScopedEntity {
  mailbox_address: string;
  display_name?: string;
  ms_tenant_id?: string;
  ms_subscription_id?: string;
  folder_id: string;
  folder_name: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
  status: MailboxStatus;
  last_sync_at?: string;
  settings: Record<string, any>;
}

export interface MailMessage extends TenantScopedEntity {
  mailbox_id: string;
  ms_message_id: string;
  subject?: string;
  sender_email?: string;
  sender_name?: string;
  received_at: string;
  has_attachments: boolean;
  attachment_count: number;
  status: MessageStatus;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface File extends TenantScopedEntity {
  message_id?: string;
  filename: string;
  original_filename?: string;
  storage_path: string;
  mime_type?: string;
  file_size?: number;
  file_hash?: string;
  source: FileSource;
  status: FileStatus;
  metadata: Record<string, any>;
}

// Processing
export interface ProcessingJob extends TenantScopedEntity {
  message_id?: string;
  file_id?: string;
  job_type: JobType;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
  progress_data: Record<string, any>;
}

// Business entities
export interface Invoice extends TenantScopedEntity {
  job_id?: string;
  file_id: string;
  
  // Invoice identification
  invoice_number: string;
  invoice_type?: InvoiceType;
  cufe?: string;
  
  // Dates
  issue_date: string;
  due_date?: string;
  
  // Supplier information
  supplier_nit: string;
  supplier_name: string;
  supplier_address?: string;
  supplier_city?: string;
  supplier_phone?: string;
  supplier_email?: string;
  
  // Buyer information
  buyer_nit: string;
  buyer_name: string;
  buyer_address?: string;
  buyer_city?: string;
  
  // Financial data
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency_code: string;
  
  // Processing metadata
  source_format?: SourceFormat;
  confidence_score?: number;
  needs_review: boolean;
  review_notes?: string;
  
  // Status
  status: InvoiceStatus;
  created_by?: string;
}

export interface InvoiceItem extends BaseEntity {
  invoice_id: string;
  line_number: number;
  
  // Item details
  item_code?: string;
  description: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  line_total: number;
  
  // Tax information
  tax_rate?: number;
  tax_amount: number;
  discount_rate?: number;
  discount_amount: number;
  
  // Classification
  expense_category?: string;
  account_code?: string;
}

// AI Classification
export interface Classification extends BaseEntity {
  invoice_id: string;
  
  // Classification results
  expense_kind: ExpenseKind;
  is_large_taxpayer?: boolean;
  city_code?: string;
  expense_category?: string;
  
  // AI metadata
  confidence_score: number;
  rationale?: string;
  model_version?: string;
  processing_time?: number;
  
  // Review status
  is_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_changes?: Record<string, any>;
}

// Tax calculations
export interface TaxRule extends BaseEntity {
  tenant_id?: string;
  rule_name: string;
  rule_type: TaxRuleType;
  country_code: string;
  conditions: Record<string, any>;
  formula: Record<string, any>;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  version: number;
  description?: string;
  created_by?: string;
}

export interface RetentionRule extends BaseEntity {
  retention_type: RetentionType;
  concept_code?: string;
  expense_kind?: ExpenseKind;
  is_large_taxpayer?: boolean;
  amount_threshold?: number;
  rate_percentage: number;
  base_uvt?: number;
  account_code?: string;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
}

export interface ICARate extends BaseEntity {
  city_code: string;
  city_name: string;
  activity_code?: string;
  activity_description?: string;
  rate_per_thousand: number;
  minimum_amount: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
}

export interface TaxCalculation extends BaseEntity {
  invoice_id: string;
  classification_id: string;
  
  // Base amounts
  iva_base: number;
  reteiva_base: number;
  retefuente_base: number;
  ica_base: number;
  
  // Calculated amounts
  iva_amount: number;
  reteiva_amount: number;
  retefuente_amount: number;
  ica_amount: number;
  
  // Applied rates
  iva_rate?: number;
  reteiva_rate?: number;
  retefuente_rate?: number;
  ica_rate?: number;
  
  // Calculation details
  applied_rules?: Record<string, any>;
  calculation_details?: Record<string, any>;
  calculated_at: string;
  rules_version?: string;
}

// Accounting integration
export interface AccountsMapping extends TenantScopedEntity {
  supplier_nit?: string;
  expense_category?: string;
  account_type?: AccountType;
  account_code: string;
  account_name?: string;
  cost_center_code?: string;
  cost_center_name?: string;
  priority: number;
  conditions?: Record<string, any>;
  is_active: boolean;
  created_by?: string;
}

export interface AccountingEntry extends TenantScopedEntity {
  invoice_id: string;
  entry_number?: string;
  entry_date: string;
  description?: string;
  reference?: string;
  entries_json: Record<string, any>;
  total_debits: number;
  total_credits: number;
  export_format?: string;
  exported_to?: string;
  exported_at?: string;
  export_file_id?: string;
  status: 'generated' | 'exported' | 'error';
  created_by?: string;
}

export interface Export extends TenantScopedEntity {
  export_type: ExportType;
  target_system: TargetSystem;
  date_from: string;
  date_to: string;
  filters: Record<string, any>;
  invoice_ids: string[];
  total_invoices: number;
  total_amount: number;
  file_id?: string;
  status: ExportStatus;
  error_message?: string;
  completed_at?: string;
  created_by: string;
}

// Audit
export interface AuditLog extends TenantScopedEntity {
  user_id?: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}

// Extended types with relations
export interface InvoiceWithRelations extends Invoice {
  file?: File;
  items?: InvoiceItem[];
  classification?: Classification;
  tax_calculation?: TaxCalculation;
  processing_job?: ProcessingJob;
  tenant?: Tenant;
}

export interface ProcessingJobWithRelations extends ProcessingJob {
  file?: File;
  message?: MailMessage;
  invoice?: Invoice;
  tenant?: Tenant;
}

export interface ExportWithRelations extends Export {
  file?: File;
  tenant?: Tenant;
  created_by_user?: UserProfile;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardMetrics {
  totalInvoices: number;
  totalAmount: number;
  totalTaxes: number;
  processedToday: number;
  averageProcessingTime: number;
  automationRate: number;
  errorRate: number;
}

export interface StatusBreakdown {
  [key in InvoiceStatus]: number;
}

export interface TaxSummary {
  iva: number;
  reteiva: number;
  retefuente: number;
  ica: number;
}

export interface SupplierSummary {
  nit: string;
  name: string;
  invoiceCount: number;
  totalAmount: number;
}

// Form types
export interface CreateTenantForm {
  name: string;
  slug: string;
  plan: TenantPlan;
}

export interface InvoiceFilters {
  status?: InvoiceStatus[];
  needsReview?: boolean;
  supplierNit?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'issueDate' | 'totalAmount' | 'supplierName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ExportFilters {
  status?: ExportStatus[];
  targetSystem?: TargetSystem[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ProcessingJobFilters {
  status?: JobStatus[];
  jobType?: JobType[];
  dateFrom?: string;
  dateTo?: string;
}