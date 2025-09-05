# Integration Requirements

## Overview
This document defines all external integrations required for the CFO AI SaaS platform, including APIs, authentication flows, data formats, and error handling strategies.

---

## 1. Microsoft Graph API Integration

### Purpose
Automate invoice ingestion from Outlook email attachments.

### Technical Requirements

#### Authentication
- **OAuth 2.0 Flow**: Authorization Code with PKCE
- **Scopes Required**:
  - `Mail.Read` - Read user's mail
  - `offline_access` - Refresh token access
  - `openid` - User identity
  - `profile` - Basic profile information

#### API Endpoints Used
```
GET https://graph.microsoft.com/v1.0/me/mailFolders
GET https://graph.microsoft.com/v1.0/me/mailFolders/{folderId}/messages
GET https://graph.microsoft.com/v1.0/me/messages/{messageId}/attachments
POST https://graph.microsoft.com/v1.0/subscriptions
```

#### Webhook Subscription
```json
{
  "changeType": "created,updated",
  "notificationUrl": "https://cfoai.vercel.app/api/msgraph/notifications",
  "resource": "me/mailFolders('{folderId}')/messages",
  "expirationDateTime": "2024-01-18T11:00:00.0000000Z",
  "clientState": "tenant_uuid"
}
```

#### Data Processing Flow
```
Email Received → Webhook Notification → Download Attachments → Store Files → Queue Processing Job
```

#### Error Handling
- **Token Expiration**: Automatic refresh using refresh token
- **API Rate Limits**: Exponential backoff with jitter
- **Webhook Failures**: Retry mechanism with dead letter queue
- **Missing Permissions**: User notification and re-consent flow

#### Implementation Details

##### Connection Setup
```typescript
// Microsoft Graph OAuth flow
const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=${CLIENT_ID}&
  response_type=code&
  redirect_uri=${REDIRECT_URI}&
  scope=Mail.Read offline_access openid profile&
  state=${tenant_id}&
  code_challenge=${codeChallenge}&
  code_challenge_method=S256`;
```

##### Token Management
```typescript
interface TokenStorage {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  tenant_id: string;
  mailbox_address: string;
}

// Encrypted storage in database
const encryptedTokens = encrypt(JSON.stringify(tokens), ENCRYPTION_KEY);
```

##### Attachment Processing
```typescript
interface AttachmentData {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string; // Base64 encoded
  downloadUrl?: string;  // For large attachments
}
```

#### Testing Strategy
- **Mock Graph API**: Use Microsoft Graph Explorer for testing
- **Test Accounts**: Create dedicated test Office 365 accounts
- **Webhook Testing**: Use ngrok for local webhook development
- **Large File Testing**: Test with attachments >4MB (requires download URL)

---

## 2. OpenAI API Integration

### Purpose
AI-powered document classification and OCR assistance.

### Technical Requirements

#### Models Used
- **GPT-4**: Document classification and analysis
- **GPT-4 Vision**: PDF/image OCR and extraction
- **GPT-3.5-turbo**: Cost-effective fallback for simple tasks

#### API Configuration
```json
{
  "organization": "org-xxx",
  "model": "gpt-4-1106-preview",
  "temperature": 0.1,
  "max_tokens": 1000,
  "response_format": { "type": "json_object" }
}
```

#### Rate Limiting & Cost Management
- **Tier 2 Account**: 5,000 RPM, 450,000 TPM
- **Cost Monitoring**: Track usage per tenant
- **Model Selection**: Use GPT-3.5 for simple classifications
- **Caching**: Cache similar document classifications

#### Classification Prompt Structure
```
System: You are a Colombian tax expert analyzing invoices.
Return JSON with exact schema.

User: Classify this invoice:
{invoice_data}

Required schema:
{
  "expense_kind": "goods|services|professional_fees",
  "is_large_taxpayer": boolean,
  "city_code": "DANE_CODE",
  "expense_category": "string",
  "confidence": 0.0-1.0,
  "rationale": "explanation"
}
```

#### OCR Processing
```typescript
interface OCRRequest {
  model: "gpt-4-vision-preview";
  messages: [
    {
      role: "user";
      content: [
        { type: "text", text: "Extract invoice data from this image:" },
        { 
          type: "image_url", 
          image_url: { url: "data:image/jpeg;base64,..." }
        }
      ]
    }
  ];
}
```

#### Error Handling
- **API Limits**: Queue requests with backoff
- **Model Unavailability**: Fallback to alternative models
- **Invalid Responses**: Validation with retry
- **Cost Overruns**: Alert and suspend processing

#### Data Security
- **No Data Storage**: OpenAI doesn't store API data
- **Data Minimization**: Send only necessary fields
- **PII Scrubbing**: Remove sensitive information
- **Audit Logging**: Log all API interactions

---

## 3. Supabase Integration

### Purpose
Backend-as-a-Service providing database, authentication, and storage.

### Components Used

#### Database (PostgreSQL)
- **Version**: PostgreSQL 15
- **Extensions**: uuid-ossp, pgcrypto
- **Connection Pooling**: PgBouncer
- **Replication**: Read replicas for reporting

#### Authentication
- **JWT Tokens**: HS256 signed with project secret
- **Row Level Security**: Tenant isolation
- **Magic Links**: Passwordless authentication option
- **OAuth Providers**: Google, Microsoft (future)

#### Storage
- **File Storage**: Encrypted at rest
- **CDN**: Global edge cache
- **Access Control**: Signed URLs with expiration
- **Lifecycle Policies**: Automatic file cleanup

#### Real-time Subscriptions
```typescript
// Real-time job status updates
const subscription = supabase
  .channel('processing_jobs')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'processing_jobs' },
    (payload) => updateJobStatus(payload.new)
  )
  .subscribe();
```

#### Security Configuration
```sql
-- Row Level Security policy
CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Function to get user's tenant IDs
CREATE FUNCTION auth.user_tenant_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tenant_id) FROM user_tenants 
  WHERE user_id = auth.uid() AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 4. Accounting Software Integrations

### Supported Systems

#### 4.1 Siigo Integration
**Format**: CSV Export
**Fields Required**:
```csv
fecha,tercero_nit,cuenta,detalle,debito,credito,centro_costo,ciudad
2024-01-15,900123456,5135,Servicios profesionales,1000000,0,CC001,11001
2024-01-15,900123456,2408,IVA por pagar,0,190000,CC001,11001
```

**Mapping Configuration**:
```json
{
  "expense_accounts": {
    "professional_services": "5135",
    "inventory": "1435",
    "office_supplies": "5195"
  },
  "tax_accounts": {
    "iva_payable": "2408",
    "reteiva": "1355",
    "retefuente": "1365",
    "ica": "1368"
  }
}
```

#### 4.2 World Office Integration
**Format**: JSON Export
**Structure**:
```json
{
  "entries": [
    {
      "date": "2024-01-15",
      "reference": "INV-001",
      "description": "Invoice ABC-001",
      "lines": [
        {
          "account": "5135",
          "debit": 1000000,
          "credit": 0,
          "cost_center": "CC001",
          "third_party": "900123456"
        }
      ]
    }
  ]
}
```

#### 4.3 SAP Integration
**Format**: IDoc Template
**Transaction**: FB01 (Post Document)
**Structure**: BAPI_ACC_DOCUMENT_POST

```xml
<IDOC>
  <HEADER>
    <TABNAME>BKPF</TABNAME>
    <BUKRS>1000</BUKRS>
    <BLDAT>20240115</BLDAT>
    <BLART>KR</BLART>
  </HEADER>
  <ITEMS>
    <BSEG>
      <HKONT>5135</HKONT>
      <WRBTR>1000000</WRBTR>
      <SHKZG>S</SHKZG>
    </BSEG>
  </ITEMS>
</IDOC>
```

### Export Process Flow
```
Approved Invoices → Account Mapping → Template Generation → File Creation → Download/SFTP
```

---

## 5. Colombian Tax Authority Integration

### DIAN (Tax Authority) Requirements

#### UBL Document Standard
- **Version**: UBL 2.1
- **Extension**: Colombian Customization
- **CUFE**: Unique fiscal identifier validation
- **Digital Signature**: XML signature validation

#### Taxpayer Registry
- **RUT Validation**: Real-time NIT verification
- **Large Taxpayer Status**: Quarterly updated lists
- **Tax Regime**: Special regimes and exemptions

#### Municipal Tax Authorities
- **ICA Rates**: City-specific activity rates
- **Rate Updates**: Semi-annual rate changes
- **Registration Status**: Municipal taxpayer verification

### Data Sources
```json
{
  "dian_services": {
    "rut_validation": "https://muisca.dian.gov.co/WebRutMuisca/",
    "cufe_validation": "https://catalogo-vpfe.dian.gov.co/",
    "large_taxpayers": "https://www.dian.gov.co/dian/listados/"
  },
  "municipal_apis": {
    "bogota_ica": "https://www.shd.gov.co/",
    "medellin_ica": "https://www.medellin.gov.co/",
    "cali_ica": "https://www.cali.gov.co/"
  }
}
```

### Compliance Requirements
- **Data Retention**: 5 years minimum
- **Audit Trail**: Complete transaction history
- **Electronic Invoicing**: UBL format support
- **Tax Calculations**: Certified accuracy

---

## 6. Email Service Integration

### Purpose
Transactional emails and notifications.

### Service Provider
**Recommended**: SendGrid or Amazon SES

### Email Types
- **Welcome Emails**: User onboarding
- **Processing Notifications**: Job completion alerts
- **Error Notifications**: Processing failures
- **Weekly Reports**: Processing summaries
- **Security Alerts**: Authentication events

### Template Structure
```html
<!DOCTYPE html>
<html>
<head>
  <title>CFO AI - {{subject}}</title>
</head>
<body>
  <div class="container">
    <h1>{{title}}</h1>
    <p>{{message}}</p>
    <div class="action">
      <a href="{{actionUrl}}">{{actionText}}</a>
    </div>
  </div>
</body>
</html>
```

### Configuration
```json
{
  "from_email": "noreply@cfoai.com",
  "from_name": "CFO AI Platform",
  "reply_to": "support@cfoai.com",
  "templates": {
    "welcome": "d-xxxxx",
    "processing_complete": "d-yyyyy",
    "error_notification": "d-zzzzz"
  }
}
```

---

## 7. Monitoring and Observability

### Application Performance Monitoring

#### Vercel Analytics
- **Core Web Vitals**: Performance metrics
- **Function Metrics**: Serverless function performance
- **Edge Function Analytics**: Global performance data

#### Supabase Monitoring
- **Database Performance**: Query analytics
- **API Usage**: Request/response metrics
- **Storage Analytics**: File access patterns

### Error Tracking
**Service**: Sentry or similar

**Configuration**:
```javascript
Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
});
```

### Logging Strategy
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  tenantId?: string;
  userId?: string;
  requestId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### Health Checks
```
GET /api/health
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z",
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "openai": "healthy",
    "msgraph": "healthy"
  },
  "metrics": {
    "uptime": 99.95,
    "responseTime": 150
  }
}
```

---

## 8. Security and Compliance

### Data Protection
- **Encryption in Transit**: TLS 1.3
- **Encryption at Rest**: AES-256
- **Key Management**: Vercel/Supabase managed
- **PII Handling**: Minimal collection and retention

### Access Control
- **API Authentication**: JWT tokens
- **Rate Limiting**: Per-tenant limits
- **IP Whitelisting**: Optional for enterprise
- **Audit Logging**: All API access logged

### Compliance Requirements
- **GDPR**: European data protection
- **Colombian Data Protection**: Law 1581 of 2012
- **Financial Regulations**: SFC requirements
- **Tax Compliance**: DIAN regulations

### Security Headers
```javascript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

---

## 9. Development and Testing Integrations

### Version Control
**Platform**: GitHub
**Workflow**: GitFlow with feature branches
**Protection**: Branch protection rules on main

### CI/CD Pipeline
**Platform**: GitHub Actions + Vercel

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test
      - name: Run E2E tests
        run: npm run test:e2e
```

### Testing Services
- **Unit Testing**: Jest + Testing Library
- **E2E Testing**: Playwright
- **API Testing**: Postman/Newman
- **Load Testing**: Artillery or k6

### Code Quality
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Code Coverage**: 80% minimum
- **Security Scanning**: Snyk or similar

---

## 10. Backup and Disaster Recovery

### Database Backup
- **Automated Backups**: Daily Supabase backups
- **Point-in-Time Recovery**: 30-day window
- **Cross-Region Backup**: Disaster recovery
- **Backup Testing**: Monthly restore tests

### File Storage Backup
- **Replication**: Multi-region storage
- **Versioning**: File version history
- **Lifecycle Policies**: Automated cleanup
- **Backup Verification**: Integrity checks

### Business Continuity
- **RTO Target**: 4 hours
- **RPO Target**: 1 hour
- **Failover Process**: Automated where possible
- **Communication Plan**: User notification system

### Recovery Procedures
1. **Database Recovery**: Point-in-time restore
2. **Application Recovery**: Redeploy from git
3. **File Recovery**: Restore from backup storage
4. **DNS Recovery**: Failover to backup region
5. **Verification**: End-to-end testing

---

## Implementation Priority

### Phase 1 (MVP)
1. ✅ Supabase integration (database, auth, storage)
2. 🔄 Microsoft Graph API (Outlook integration)
3. 🔄 OpenAI API (document classification)
4. 🔄 Basic email notifications
5. 🔄 Siigo CSV export

### Phase 2 (Post-MVP)
1. ⏳ World Office JSON export
2. ⏳ SAP integration templates
3. ⏳ Advanced monitoring (Sentry)
4. ⏳ DIAN API integration
5. ⏳ Municipal tax APIs

### Phase 3 (Enterprise)
1. ⏳ Advanced security features
2. ⏳ Compliance certifications
3. ⏳ Multi-region deployment
4. ⏳ Advanced analytics integration
5. ⏳ API marketplace integrations

## Testing and Validation

### Integration Testing Checklist
- [ ] Microsoft Graph OAuth flow
- [ ] File upload and processing
- [ ] OpenAI classification accuracy
- [ ] Tax calculation validation
- [ ] Export format compliance
- [ ] Email delivery testing
- [ ] Security penetration testing
- [ ] Performance load testing
- [ ] Disaster recovery testing
- [ ] Compliance audit preparation