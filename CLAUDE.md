# CFO AI SaaS - Project Context

## Project Overview
This is the **CFO AI SaaS platform** for Colombian SMEs - an automated invoice processing and financial analysis system.

### Core Purpose
Automate the complete invoice processing workflow:
1. **Ingestion**: Email attachments from Outlook (XML/PDF/ZIP)
2. **Processing**: AI-powered data extraction and classification
3. **Tax Calculation**: Colombian compliance (IVA, ReteFuente, ReteIVA, ICA)
4. **Review**: Human approval workflow with audit trail
5. **Export**: Integration with accounting systems (Siigo, World Office, SAP)
6. **Insights**: CFO-level dashboard and financial recommendations

## Technology Stack
- **Frontend/Backend**: Next.js 13+ (App Router) + TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth (multi-tenant)
- **AI**: OpenAI GPT-4 (classification) + Vision (OCR)
- **Integration**: Microsoft Graph API (Outlook)
- **Deployment**: Vercel + Supabase

## Architecture Principles
- **Multi-tenant**: Strict tenant isolation via RLS on all database operations
- **Security-first**: Complete audit trail, encrypted storage, input validation
- **Colombian Compliance**: NIIF/ET tax regulations, DIAN UBL format support
- **Performance**: <2s API responses, <10min document processing, 1,800+ invoices/month

## Development Context

### Current Phase
**MVP Development (Week 1-12)** - Building production-ready platform for pilot customers

### Key Files to Reference
```
claude/init/
├── project_overview.md      # Complete project vision
├── technical_requirements.md # Functional/non-functional requirements  
├── architecture.md          # System design and data flow
├── database_schema.sql      # Complete PostgreSQL schema
├── development_rules.md     # Coding standards and conventions
├── work_plan.md            # Detailed sprint breakdown
├── api_specifications.md    # REST API documentation
├── integration_requirements.md # External service integrations
└── claude_context.md       # This context summary
```

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode, no `any` without justification
- **Next.js**: App Router only, Server Components preferred
- **Database**: Every query MUST include tenant_id filtering
- **Validation**: Zod schemas for all inputs
- **Testing**: >80% coverage, Colombian tax regulation test cases
- **No Comments**: Unless complex business logic requires explanation

### Security Requirements
- All database operations use Row Level Security (RLS)
- JWT tokens must include valid tenant_id claim
- Input validation with Zod on all user data
- Audit logging for all financial operations
- Encrypted token storage for external integrations

### Colombian Tax Compliance
- UBL DIAN XML format parsing
- IVA: 19% standard rate with exemptions
- ReteIVA: 15% retention on services >$1M COP
- ReteFuente: Variable rates by service type
- ICA: Municipal per-thousand rates by city/activity

## Current Development Focus

### Sprint Objectives
Building core invoice processing pipeline with:
- Multi-tenant authentication system
- File upload and storage (Supabase Storage)
- XML/PDF parsing and data extraction
- OpenAI classification and validation
- Colombian tax calculation engine
- Review queue and approval workflow

### Success Criteria
- Process 1,800+ invoices/month per tenant
- 95%+ automation rate (minimal human review)
- Colombian tax compliance certification ready
- Production deployment with 10+ pilot customers

## When Working on This Project

### Always Consider
1. **Multi-tenancy**: Include tenant_id in all database operations
2. **Security**: Validate permissions and maintain audit trail
3. **Performance**: Optimize for high-volume processing
4. **Compliance**: Follow Colombian tax regulations precisely
5. **User Experience**: SME accountants need simple, efficient interfaces

### Common Patterns
```typescript
// API route pattern
const { user, tenant } = await validateRequest(request);
const supabase = createClient();
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('tenant_id', tenant.id);

// Server Action pattern  
'use server';
const { user, tenant } = await validateUser();
// ... perform operation
revalidatePath('/dashboard/path');
```

### Database Access
All tables use RLS with tenant isolation:
```sql
CREATE POLICY "tenant_access" ON table_name
  FOR ALL USING (tenant_id = ANY(auth.user_tenant_ids()));
```

This project requires deep understanding of Colombian tax regulations, multi-tenant SaaS architecture, and automated document processing workflows. Reference the detailed documentation in `claude/init/` for specific implementation guidance.