# System Architecture

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   External      │
│   (Next.js)     │    │  (Next.js API)   │    │   Services      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Dashboard UI  │    │ • API Routes     │    │ • Microsoft     │
│ • Review Queue  │    │ • Server Actions │    │   Graph API     │
│ • Settings      │    │ • Job Processing │    │ • OpenAI API    │
│ • Reports       │    │ • Tax Engine     │    │ • Supabase      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Component Architecture

### 1. Frontend Layer (Next.js App Router)
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── inbox/
│   │   ├── review/
│   │   ├── exports/
│   │   └── settings/
│   ├── api/
│   │   ├── msgraph/
│   │   ├── invoices/
│   │   ├── taxes/
│   │   └── exports/
│   └── globals.css
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── invoice/
│   └── settings/
├── lib/
│   ├── supabase/
│   ├── openai/
│   ├── msgraph/
│   └── utils/
└── types/
```

### 2. API Layer Structure
```
/api/
├── auth/
│   ├── callback/
│   └── signout/
├── msgraph/
│   ├── notifications/     # Webhook endpoint
│   ├── connect/          # OAuth flow
│   └── sync/             # Manual sync
├── invoices/
│   ├── [id]/
│   ├── upload/
│   └── process/
├── taxes/
│   ├── calculate/
│   ├── rules/
│   └── rates/
├── exports/
│   ├── generate/
│   ├── [id]/download/
│   └── templates/
└── admin/
    ├── tenants/
    ├── users/
    └── settings/
```

### 3. Database Schema (Supabase PostgreSQL)

#### Core Tables
- `tenants` - Multi-tenant configuration
- `users` - User management
- `user_tenants` - User-tenant relationships with roles
- `mailboxes` - Outlook integration settings
- `mail_messages` - Processed email metadata
- `files` - Document storage references
- `processing_jobs` - Job queue and status tracking

#### Business Logic Tables
- `invoices` - Invoice master data
- `invoice_items` - Line item details
- `classifications` - AI classification results
- `tax_calculations` - Tax computation results
- `accounting_entries` - Generated accounting entries
- `exports` - Export job tracking

#### Configuration Tables
- `tax_rules` - Tax calculation rules
- `retention_rules` - Retention calculation rules
- `ica_rates` - Municipal tax rates
- `accounts_mapping` - Chart of accounts mapping
- `audit_logs` - Audit trail

### 4. Processing Pipeline

```
Email/Upload → Ingestion → Parsing → Classification → Tax Calc → Review → Export
     ↓             ↓          ↓           ↓            ↓         ↓        ↓
Storage Queue   XML/OCR   AI Analysis   Rule Engine   Human     CSV/JSON
                Parser    (OpenAI)      (Database)    Review    Generation
```

#### Job States Flow
```
queued → parsing → llm_classify → tax_compute → ready_for_review → approved → exported
   ↓        ↓           ↓             ↓              ↓             ↓         ↓
error    error      error         error          pending       exported  completed
```

## Data Flow Architecture

### 1. Ingestion Flow
```
Microsoft Outlook → Graph Webhook → API Endpoint → File Storage → Job Queue
Manual Upload → Upload API → File Storage → Job Queue
```

### 2. Processing Flow
```
Job Queue → Document Parser → AI Classifier → Tax Engine → Review Queue
    ↓              ↓              ↓             ↓            ↓
Processing      Extracted      Classification  Tax         Approval
   Job           Data          Results        Calculations   Status
```

### 3. Export Flow
```
Approved Items → Export Generator → Template Engine → File Generation → Download/SFTP
      ↓               ↓                  ↓               ↓              ↓
Account Mapping  → CSV/JSON Format  → System Template → Export File → Delivery
```

## Security Architecture

### 1. Multi-Tenant Isolation
- Row Level Security (RLS) on all tables
- JWT token with tenant_id claim
- API endpoint tenant validation
- File storage tenant segregation

### 2. Authentication & Authorization
```
User Login → Supabase Auth → JWT Token → RLS Policy → Data Access
     ↓            ↓             ↓           ↓           ↓
Email/Magic   OAuth Flow   tenant_id    Row Filter   Authorized
  Link                     claim                     Response
```

### 3. Data Protection
- TLS 1.3 for all communications
- Encrypted storage in Supabase
- Secure file upload with virus scanning
- PII data minimization and retention policies

## Integration Architecture

### 1. Microsoft Graph Integration
```
Tenant Setup → OAuth Consent → Access Token → Subscription → Webhook Processing
     ↓              ↓              ↓             ↓              ↓
Admin Config   → Permissions   → Token Store  → Event Listen → Job Creation
```

### 2. OpenAI Integration
```
Document Data → Prompt Template → API Request → Response → Classification Storage
     ↓              ↓               ↓            ↓            ↓
XML/OCR Text   → Structured     → GPT-4 API   → JSON       → Database
               Prompt           Request       Response     Record
```

## Deployment Architecture

### Production Environment
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Vercel      │    │    Supabase      │    │   External      │
│   (Frontend/    │    │   (Database/     │    │   Services      │
│    Backend)     │    │   Storage/Auth)  │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Next.js App   │    │ • PostgreSQL     │    │ • Microsoft     │
│ • API Routes    │    │ • File Storage   │    │   Graph         │
│ • Edge Functions│    │ • Authentication │    │ • OpenAI        │
│ • CDN           │    │ • Edge Functions │    │ • SMTP Provider │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Monitoring & Observability
- Vercel Analytics and monitoring
- Supabase database monitoring
- Custom application metrics
- Error tracking and alerting
- Performance monitoring
- Audit log analysis

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- File storage optimization
- CDN for static assets
- Background job processing

### Performance Optimization
- Database indexing strategy
- Query optimization
- Caching mechanisms
- Asset compression
- Lazy loading implementation

### Cost Optimization
- OpenAI API usage monitoring
- Supabase resource optimization
- File storage lifecycle management
- Efficient query patterns
- Background job batching