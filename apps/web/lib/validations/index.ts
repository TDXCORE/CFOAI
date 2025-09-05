// CFO AI Validation Schemas
// Zod schemas for all forms and API inputs

import { z } from 'zod';

// Enum schemas
export const TenantPlanSchema = z.enum(['free', 'starter', 'professional', 'enterprise']);
export const TenantStatusSchema = z.enum(['active', 'suspended', 'cancelled']);
export const UserRoleSchema = z.enum(['owner', 'admin', 'approver', 'analyst', 'viewer']);
export const UserStatusSchema = z.enum(['active', 'inactive', 'invited']);

export const FileSourceSchema = z.enum(['email', 'upload', 'zip_extract']);
export const FileStatusSchema = z.enum(['stored', 'processing', 'processed', 'error', 'deleted']);

export const JobTypeSchema = z.enum(['email_process', 'file_parse', 'manual_upload']);
export const JobStatusSchema = z.enum(['queued', 'parsing', 'llm_classify', 'tax_compute', 'ready_for_review', 'approved', 'exported', 'error', 'cancelled']);

export const InvoiceTypeSchema = z.enum(['invoice', 'credit_note', 'debit_note']);
export const InvoiceStatusSchema = z.enum(['parsed', 'classified', 'calculated', 'reviewed', 'approved', 'exported']);
export const SourceFormatSchema = z.enum(['xml_ubl', 'pdf_ocr', 'image_ocr']);

export const ExpenseKindSchema = z.enum(['goods', 'services', 'professional_fees']);
export const TaxRuleTypeSchema = z.enum(['iva', 'reteiva', 'retefuente', 'ica']);
export const RetentionTypeSchema = z.enum(['reteiva', 'retefuente']);
export const AccountTypeSchema = z.enum(['expense', 'tax', 'retention']);

export const ExportTypeSchema = z.enum(['csv', 'json', 'xml', 'excel']);
export const TargetSystemSchema = z.enum(['siigo', 'world_office', 'sap', 'generic']);
export const ExportStatusSchema = z.enum(['queued', 'processing', 'completed', 'error']);

export const MailboxStatusSchema = z.enum(['connected', 'disconnected', 'error', 'expired']);
export const MessageStatusSchema = z.enum(['pending', 'processed', 'failed', 'ignored']);

// Base schemas
export const UUIDSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const DateSchema = z.string().datetime();
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const CurrencyAmountSchema = z.number().min(0).multipleOf(0.01);
export const PercentageSchema = z.number().min(0).max(100);
export const ColombianNITSchema = z.string().regex(/^\d{6,15}$/);
export const ColombianPhoneSchema = z.string().regex(/^(\+57)?[1-9]\d{6,9}$/);

// Authentication schemas
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(100),
  companyName: z.string().min(2).max(100),
  companySlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

export const ResetPasswordSchema = z.object({
  email: EmailSchema,
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Tenant management schemas
export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  plan: TenantPlanSchema.default('free'),
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: z.record(z.any()).optional(),
});

export const InviteUserSchema = z.object({
  email: EmailSchema,
  role: UserRoleSchema,
  permissions: z.array(z.string()).default([]),
});

// User profile schemas
export const UpdateUserProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: ColombianPhoneSchema.optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  preferences: z.record(z.any()).optional(),
});

// File upload schemas
export const FileUploadSchema = z.object({
  source: FileSourceSchema.default('upload'),
  metadata: z.record(z.any()).optional(),
});

export const FileFilterSchema = z.object({
  status: FileStatusSchema.optional(),
  source: FileSourceSchema.optional(),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Processing job schemas
export const CreateProcessingJobSchema = z.object({
  file_id: UUIDSchema.optional(),
  message_id: UUIDSchema.optional(),
  job_type: JobTypeSchema,
  priority: z.number().int().min(0).max(10).default(0),
});

export const UpdateProcessingJobSchema = z.object({
  status: JobStatusSchema.optional(),
  progress_data: z.record(z.any()).optional(),
  error_message: z.string().optional(),
});

export const ProcessingJobFilterSchema = z.object({
  status: z.array(JobStatusSchema).optional(),
  jobType: z.array(JobTypeSchema).optional(),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Invoice schemas
export const CreateInvoiceSchema = z.object({
  file_id: UUIDSchema,
  invoice_number: z.string().min(1).max(50),
  invoice_type: InvoiceTypeSchema.default('invoice'),
  cufe: z.string().optional(),
  issue_date: DateOnlySchema,
  due_date: DateOnlySchema.optional(),
  
  // Supplier information
  supplier_nit: ColombianNITSchema,
  supplier_name: z.string().min(2).max(200),
  supplier_address: z.string().max(300).optional(),
  supplier_city: z.string().max(100).optional(),
  supplier_phone: ColombianPhoneSchema.optional(),
  supplier_email: EmailSchema.optional(),
  
  // Buyer information
  buyer_nit: ColombianNITSchema,
  buyer_name: z.string().min(2).max(200),
  buyer_address: z.string().max(300).optional(),
  buyer_city: z.string().max(100).optional(),
  
  // Financial data
  subtotal: CurrencyAmountSchema,
  tax_amount: CurrencyAmountSchema.default(0),
  discount_amount: CurrencyAmountSchema.default(0),
  total_amount: CurrencyAmountSchema,
  currency_code: z.string().length(3).default('COP'),
  
  // Processing metadata
  source_format: SourceFormatSchema.optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

export const UpdateInvoiceSchema = z.object({
  supplier_name: z.string().min(2).max(200).optional(),
  supplier_city: z.string().max(100).optional(),
  buyer_city: z.string().max(100).optional(),
  needs_review: z.boolean().optional(),
  review_notes: z.string().max(1000).optional(),
  status: InvoiceStatusSchema.optional(),
});

export const InvoiceFilterSchema = z.object({
  status: z.array(InvoiceStatusSchema).optional(),
  needsReview: z.boolean().optional(),
  supplierNit: ColombianNITSchema.optional(),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['issueDate', 'totalAmount', 'supplierName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ApproveInvoiceSchema = z.object({
  approval_notes: z.string().max(1000).optional(),
  account_mappings: z.array(z.object({
    item_id: UUIDSchema,
    account_code: z.string().min(1).max(20),
    cost_center_code: z.string().max(20).optional(),
  })).optional(),
});

export const RejectInvoiceSchema = z.object({
  rejection_reason: z.string().min(1).max(200),
  rejection_notes: z.string().max(1000).optional(),
});

// Invoice item schemas
export const CreateInvoiceItemSchema = z.object({
  line_number: z.number().int().min(1),
  item_code: z.string().max(50).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unit_of_measure: z.string().max(20).optional(),
  unit_price: CurrencyAmountSchema,
  line_total: CurrencyAmountSchema,
  tax_rate: PercentageSchema.optional(),
  tax_amount: CurrencyAmountSchema.default(0),
  discount_rate: PercentageSchema.optional(),
  discount_amount: CurrencyAmountSchema.default(0),
  expense_category: z.string().max(100).optional(),
  account_code: z.string().max(20).optional(),
});

// Classification schemas
export const CreateClassificationSchema = z.object({
  invoice_id: UUIDSchema,
  expense_kind: ExpenseKindSchema,
  is_large_taxpayer: z.boolean().optional(),
  city_code: z.string().max(10).optional(),
  expense_category: z.string().max(100).optional(),
  confidence_score: z.number().min(0).max(1),
  rationale: z.string().max(1000).optional(),
  model_version: z.string().max(50).optional(),
  processing_time: z.number().int().min(0).optional(),
});

export const UpdateClassificationSchema = z.object({
  expense_kind: ExpenseKindSchema.optional(),
  is_large_taxpayer: z.boolean().optional(),
  city_code: z.string().max(10).optional(),
  expense_category: z.string().max(100).optional(),
  is_reviewed: z.boolean().optional(),
  review_changes: z.record(z.any()).optional(),
});

// Tax calculation schemas
export const CreateTaxRuleSchema = z.object({
  rule_name: z.string().min(2).max(100),
  rule_type: TaxRuleTypeSchema,
  country_code: z.string().length(2).default('CO'),
  conditions: z.record(z.any()),
  formula: z.record(z.any()),
  effective_from: DateOnlySchema,
  effective_until: DateOnlySchema.optional(),
  description: z.string().max(500).optional(),
});

export const UpdateTaxRuleSchema = z.object({
  formula: z.record(z.any()).optional(),
  effective_until: DateOnlySchema.optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const CalculateTaxesSchema = z.object({
  invoice_data: z.object({
    subtotal: CurrencyAmountSchema,
    supplier_nit: ColombianNITSchema,
    buyer_nit: ColombianNITSchema,
    expense_kind: ExpenseKindSchema,
    city_code: z.string().optional(),
  }),
  classification: z.object({
    expense_kind: ExpenseKindSchema,
    is_large_taxpayer: z.boolean(),
    city_code: z.string(),
  }),
});

// Account mapping schemas
export const CreateAccountMappingSchema = z.object({
  supplier_nit: ColombianNITSchema.optional(),
  expense_category: z.string().max(100).optional(),
  account_type: AccountTypeSchema,
  account_code: z.string().min(1).max(20),
  account_name: z.string().max(200).optional(),
  cost_center_code: z.string().max(20).optional(),
  cost_center_name: z.string().max(200).optional(),
  priority: z.number().int().min(0).default(0),
  conditions: z.record(z.any()).optional(),
});

export const UpdateAccountMappingSchema = z.object({
  account_code: z.string().min(1).max(20).optional(),
  account_name: z.string().max(200).optional(),
  cost_center_code: z.string().max(20).optional(),
  cost_center_name: z.string().max(200).optional(),
  priority: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// Export schemas
export const CreateExportSchema = z.object({
  export_type: ExportTypeSchema,
  target_system: TargetSystemSchema,
  date_from: DateOnlySchema,
  date_to: DateOnlySchema,
  filters: z.record(z.any()).optional(),
  invoice_ids: z.array(UUIDSchema).optional(),
  include_attachments: z.boolean().default(false),
});

export const ExportFilterSchema = z.object({
  status: z.array(ExportStatusSchema).optional(),
  targetSystem: z.array(TargetSystemSchema).optional(),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Microsoft Graph integration schemas
export const ConnectMailboxSchema = z.object({
  mailbox_address: EmailSchema,
  folder_name: z.string().min(1).max(100).default('Facturas'),
});

export const MailboxSettingsSchema = z.object({
  auto_processing: z.boolean().default(true),
  notification_email: EmailSchema.optional(),
  max_file_size: z.number().int().min(1024).max(52428800).default(10485760), // 10MB default
});

// Dashboard schemas
export const DashboardFilterSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  dateFrom: DateOnlySchema.optional(),
  dateTo: DateOnlySchema.optional(),
});

// Search schemas
export const SearchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(['invoices', 'suppliers', 'files']).optional(),
  filters: z.record(z.any()).optional(),
});

// API response schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

// Webhook schemas
export const GraphWebhookSchema = z.object({
  value: z.array(z.object({
    subscriptionId: z.string(),
    subscriptionExpirationDateTime: z.string(),
    tenantId: z.string().optional(),
    clientState: z.string().optional(),
    changeType: z.enum(['created', 'updated', 'deleted']),
    resource: z.string(),
    resourceData: z.object({
      id: z.string(),
      '@odata.type': z.string(),
      '@odata.id': z.string(),
    }),
  })),
});

// OpenAI response schemas
export const ClassificationResponseSchema = z.object({
  expense_kind: ExpenseKindSchema,
  is_large_taxpayer: z.boolean(),
  city_code: z.string(),
  expense_category: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const OCRResponseSchema = z.object({
  invoice_number: z.string(),
  issue_date: z.string(),
  supplier_name: z.string(),
  supplier_nit: z.string(),
  buyer_name: z.string(),
  buyer_nit: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    line_total: z.number(),
  })),
  confidence: z.number().min(0).max(1),
});

// Type exports for TypeScript inference
export type SignUpForm = z.infer<typeof SignUpSchema>;
export type SignInForm = z.infer<typeof SignInSchema>;
export type CreateTenantForm = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantForm = z.infer<typeof UpdateTenantSchema>;
export type InviteUserForm = z.infer<typeof InviteUserSchema>;
export type UpdateUserProfileForm = z.infer<typeof UpdateUserProfileSchema>;

export type CreateInvoiceForm = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceForm = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceFilters = z.infer<typeof InvoiceFilterSchema>;
export type ApproveInvoiceForm = z.infer<typeof ApproveInvoiceSchema>;
export type RejectInvoiceForm = z.infer<typeof RejectInvoiceSchema>;

export type CreateClassificationForm = z.infer<typeof CreateClassificationSchema>;
export type UpdateClassificationForm = z.infer<typeof UpdateClassificationSchema>;

export type CreateTaxRuleForm = z.infer<typeof CreateTaxRuleSchema>;
export type CalculateTaxesForm = z.infer<typeof CalculateTaxesSchema>;

export type CreateAccountMappingForm = z.infer<typeof CreateAccountMappingSchema>;
export type CreateExportForm = z.infer<typeof CreateExportSchema>;
export type ExportFilters = z.infer<typeof ExportFilterSchema>;

export type ConnectMailboxForm = z.infer<typeof ConnectMailboxSchema>;
export type DashboardFilters = z.infer<typeof DashboardFilterSchema>;
export type SearchForm = z.infer<typeof SearchSchema>;

export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;
export type OCRResponse = z.infer<typeof OCRResponseSchema>;