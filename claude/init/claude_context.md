# Claude Context Engineering - CFO AI SaaS Project

## Project Overview
@project_overview.md for complete project vision and goals
@technical_requirements.md for functional and non-functional requirements
@architecture.md for system design and component architecture

## Development Context

### Project Identity
This is **CFO AI**, a multi-tenant SaaS platform for Colombian SMEs that automates:
- Invoice document processing (XML/PDF ingestion from Outlook)
- AI-powered classification and data extraction
- Colombian tax calculations (IVA, ReteFuente, ReteIVA, ICA)
- Accounting system integration and export
- CFO-level financial insights and reporting

### Technology Stack
- **Frontend**: Next.js 13+ (App Router) with TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Next.js API Routes + Server Actions
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (multi-tenant)
- **AI/ML**: OpenAI GPT-4 for classification and OCR
- **Integrations**: Microsoft Graph API, Colombian tax APIs
- **Deployment**: Vercel (frontend/backend) + Supabase (data/auth)

### Current Development Phase
**MVP Development (Weeks 1-12)** - Building core platform with:
- Multi-tenant authentication and user management
- Document upload and processing pipeline
- AI classification and tax calculation engine
- Review and approval workflow
- Export functionality for major accounting systems
- Microsoft Outlook integration via Graph API

## Development Rules & Guidelines
@development_rules.md for complete coding standards and conventions

### Key Principles
- **Security First**: All operations must respect tenant isolation via RLS
- **Type Safety**: Strict TypeScript, no `any` types without justification
- **Performance**: Target <2s API responses, <10min document processing
- **Colombian Compliance**: All tax calculations must follow NIIF/ET regulations
- **Audit Trail**: Log all financial operations for compliance

### Code Style (Essential)
- Use App Router exclusively (no Pages Router)
- Prefer Server Components, use Client Components only when necessary
- Server Actions for form submissions and mutations
- Zod for all input validation and API schemas
- No comments in code unless explicitly requested
- kebab-case for files/folders, PascalCase for components

## Database Context
@database_schema.sql for complete PostgreSQL schema

### Core Tables (Multi-tenant with RLS)
- `tenants` - Multi-tenant organization data
- `user_tenants` - User-tenant relationships with roles
- `invoices` - Master invoice data with Colombian fields
- `classifications` - AI classification results
- `tax_calculations` - Colombian tax computation results
- `processing_jobs` - Document processing queue and status
- `accounting_entries` - Generated accounting entries for export

### RLS Security Model
Every table uses `tenant_id` filtering with helper function:
```sql
CREATE FUNCTION auth.user_tenant_ids() RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tenant_id) FROM user_tenants 
  WHERE user_id = auth.uid() AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;
```

## API Architecture
@api_specifications.md for complete REST API documentation

### Authentication Pattern
```typescript
// Every API endpoint requires
const { user, tenant } = await validateRequest(request);
// All queries must include tenant_id filtering
```

### Core API Routes
- `/api/auth/*` - Authentication and user management
- `/api/invoices/*` - Invoice CRUD and processing
- `/api/files/*` - File upload and management
- `/api/taxes/*` - Tax calculation and rules
- `/api/exports/*` - Accounting export generation
- `/api/msgraph/*` - Microsoft Outlook integration

## Integration Context
@integration_requirements.md for external service integrations

### Microsoft Graph Integration
- OAuth 2.0 with delegated permissions
- Webhook subscriptions for real-time email processing
- Attachment download and processing pipeline
- Token refresh and error handling

### OpenAI Integration
- GPT-4 for document classification with structured JSON output
- Vision API for PDF/image OCR when XML unavailable
- Prompt engineering for Colombian tax context
- Cost optimization and rate limiting

### Colombian Tax Compliance
- UBL DIAN XML format parsing
- IVA (19% standard), ReteIVA, ReteFuente calculations
- Municipal ICA rates by city and activity code
- Large taxpayer status validation

## Work Plan Context
@work_plan.md for detailed sprint breakdown and acceptance criteria

### Current Sprint Focus
Based on 12-week MVP timeline with 5 phases:
1. **Foundation** (Weeks 1-2) - Setup and authentication ✅
2. **Document Processing** (Weeks 3-5) - File handling and parsing
3. **AI & Tax Engine** (Weeks 6-8) - Classification and calculations
4. **Review System** (Weeks 9-10) - Human workflow and dashboard
5. **Integrations** (Weeks 11-12) - Outlook and export functionality

### Success Criteria
- Process 1,800+ invoices/month per tenant
- >95% automated processing rate
- <10 minutes average processing time
- Colombian tax compliance certification ready
- Ready for 10+ pilot customers

## File Structure Context
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected application routes
│   │   ├── inbox/         # Document processing queue
│   │   ├── review/        # Human review interface
│   │   ├── exports/       # Export management
│   │   └── settings/      # Tenant configuration
│   ├── api/               # API endpoints
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui base components
│   ├── dashboard/        # Dashboard-specific components
│   ├── invoice/          # Invoice-related components
│   └── forms/            # Form components with validation
├── lib/                  # Utilities and configurations
│   ├── supabase/         # Database client and queries
│   ├── openai/           # AI integration utilities
│   ├── msgraph/          # Microsoft Graph client
│   ├── validations/      # Zod schemas for validation
│   └── utils/            # General utility functions
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
└── providers/            # Context providers
```

## Colombian Tax Domain Context

### Invoice Types Supported
- **Factura de Venta** - Standard sales invoice
- **Nota Crédito** - Credit note
- **Nota Débito** - Debit note
- **Factura de Contingencia** - Contingency invoice

### Tax Calculations (Rules-Based Engine)
```typescript
interface TaxCalculation {
  iva_base: number;        // IVA calculation base
  iva_rate: 0.19;          // Standard 19% rate
  reteiva_rate: 0.15;      // 15% retention on IVA
  retefuente_rate: number; // Varies by service type
  ica_rate: number;        // Per-thousand rate by city
}
```

### Classification Schema
```typescript
interface InvoiceClassification {
  expense_kind: 'goods' | 'services' | 'professional_fees';
  is_large_taxpayer: boolean;
  city_code: string;        // DANE municipal code
  expense_category: string; // Business expense classification
  confidence: number;       // AI confidence 0-1
  rationale: string;        // Explanation for classification
}
```

## Quality Standards

### Testing Requirements
- **Unit Tests**: >80% coverage using Jest + Testing Library
- **Integration Tests**: All API endpoints with Supabase
- **E2E Tests**: Critical invoice processing workflows
- **Tax Calculation Tests**: 100+ Colombian regulation test cases

### Performance Targets
- **API Response**: <2 seconds for 95th percentile
- **Document Processing**: <10 minutes end-to-end
- **File Upload**: <30 seconds for 10MB files
- **Dashboard Load**: <3 seconds initial load

### Security Requirements
- **Multi-tenant Isolation**: RLS on all database operations
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Authentication**: JWT with proper tenant claims
- **Input Validation**: Zod schemas for all user inputs
- **Audit Logging**: Complete financial operation trail

## AI Assistant Instructions

### When Working on This Project
1. **Always consider multi-tenancy** - Include tenant_id in all operations
2. **Validate Colombian compliance** - Tax calculations must follow regulations
3. **Use established patterns** - Follow the architecture and API conventions
4. **Prioritize security** - Never compromise on tenant isolation or data protection
5. **Think end-to-end** - Consider full invoice processing workflow
6. **Document decisions** - Update relevant context files when making changes

### Code Generation Guidelines
- Generate complete, production-ready code
- Include proper error handling and validation
- Follow established TypeScript patterns
- Add JSDoc comments only when complex logic requires explanation
- Use Server Actions for mutations, API routes for complex operations
- Implement proper loading states and error boundaries

### Problem-Solving Approach
1. **Understand the business context** - SME accounting automation in Colombia
2. **Check existing patterns** - Look at similar implementations in the codebase
3. **Consider compliance** - Ensure tax and legal requirements are met
4. **Plan for scale** - Design for 1,800+ invoices/month per tenant
5. **Test thoroughly** - Include unit tests and integration tests

This context should be loaded before any development work to ensure full understanding of the CFO AI SaaS platform architecture, requirements, and Colombian compliance needs.