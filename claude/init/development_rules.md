# Development Rules and Guidelines

## Code Standards and Conventions

### 1. TypeScript & Next.js Standards
- **Strict TypeScript**: Use strict mode, no `any` types without justification
- **App Router**: Use Next.js 13+ App Router exclusively
- **Server Components**: Prefer Server Components, use Client Components only when necessary
- **Server Actions**: Use Server Actions for form submissions and mutations
- **File Naming**: Use kebab-case for files and folders, PascalCase for components
- **Component Structure**: One component per file, named exports for utilities

### 2. Code Organization
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route groups
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── dashboard/        # Dashboard-specific components
│   ├── invoice/          # Invoice-related components
│   └── forms/            # Form components
├── lib/                  # Utilities and configurations
│   ├── supabase/         # Supabase client and queries
│   ├── openai/           # OpenAI integration
│   ├── msgraph/          # Microsoft Graph integration
│   ├── validations/      # Zod schemas
│   └── utils/            # Utility functions
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
└── providers/            # Context providers
```

### 3. Database Interaction Rules
- **Type Safety**: All database queries must be properly typed
- **RLS Compliance**: Every query must respect Row Level Security
- **Supabase Client**: Use the configured Supabase client from `@/lib/supabase`
- **Error Handling**: Implement proper error handling for all database operations
- **Transactions**: Use database transactions for multi-table operations

### 4. Security Guidelines

#### Authentication & Authorization
- **JWT Validation**: Validate JWT tokens on every API request
- **Tenant Isolation**: Ensure all queries include proper tenant filtering
- **Role-Based Access**: Implement role checking for sensitive operations
- **Session Management**: Proper session handling with secure cookies

#### Data Protection
- **Input Validation**: Validate all inputs using Zod schemas
- **SQL Injection Prevention**: Use parameterized queries only
- **XSS Prevention**: Sanitize all user inputs and outputs
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **File Upload Security**: Validate file types, sizes, and scan for malware

#### Secrets Management
- **Environment Variables**: Store all secrets in environment variables
- **Token Encryption**: Encrypt sensitive tokens before storage
- **API Key Rotation**: Implement API key rotation strategies
- **Audit Logging**: Log all security-relevant events

### 5. AI Integration Rules

#### OpenAI Usage
- **Rate Limiting**: Implement proper rate limiting for API calls
- **Error Handling**: Handle API failures gracefully with fallbacks
- **Cost Optimization**: Use appropriate models (GPT-4 vs GPT-3.5)
- **Prompt Engineering**: Use structured prompts with JSON schemas
- **Response Validation**: Always validate AI responses with Zod

#### Classification Guidelines
- **Confidence Scoring**: Always include confidence scores
- **Human Review**: Flag low-confidence results for review
- **Explanation**: Provide rationale for all classifications
- **Fallback Logic**: Implement deterministic fallbacks

### 6. Error Handling & Logging

#### Error Management
- **Structured Errors**: Use consistent error structures across the application
- **User-Friendly Messages**: Provide clear, actionable error messages
- **Error Tracking**: Log errors with sufficient context for debugging
- **Graceful Degradation**: Handle failures gracefully without breaking UX

#### Logging Strategy
```typescript
// Use structured logging
logger.info('Invoice processed', {
  tenantId,
  invoiceId,
  processingTime: endTime - startTime,
  confidence: classificationResult.confidence
});

logger.error('Tax calculation failed', {
  tenantId,
  invoiceId,
  error: error.message,
  stack: error.stack
});
```

### 7. Testing Requirements

#### Unit Testing
- **Coverage**: Maintain >80% test coverage
- **Pure Functions**: Test all utility functions
- **Edge Cases**: Test error conditions and edge cases
- **Mocking**: Mock external dependencies properly

#### Integration Testing
- **API Endpoints**: Test all API routes
- **Database Operations**: Test database queries and mutations
- **Authentication**: Test auth flows and permissions
- **File Processing**: Test document parsing and processing

#### E2E Testing
- **Critical Flows**: Test invoice processing end-to-end
- **User Journeys**: Test complete user workflows
- **Error Scenarios**: Test error handling in real scenarios

### 8. Performance Guidelines

#### Frontend Performance
- **Code Splitting**: Implement route-based code splitting
- **Image Optimization**: Use Next.js Image component
- **Lazy Loading**: Implement lazy loading for non-critical components
- **Bundle Analysis**: Monitor bundle size regularly

#### Backend Performance
- **Database Optimization**: Optimize queries with proper indexes
- **Caching**: Implement caching for frequently accessed data
- **Background Jobs**: Use background processing for heavy operations
- **Rate Limiting**: Implement API rate limiting

#### Monitoring
- **Performance Metrics**: Track API response times
- **Error Rates**: Monitor error rates and alert on spikes
- **Resource Usage**: Monitor memory and CPU usage
- **User Experience**: Track user interaction metrics

### 9. Documentation Standards

#### Code Documentation
- **JSDoc**: Document all public functions and classes
- **Type Definitions**: Provide clear type definitions with comments
- **Complex Logic**: Document complex business logic
- **API Documentation**: Maintain up-to-date API documentation

#### Architecture Documentation
- **Decision Records**: Document architectural decisions
- **Integration Guides**: Provide clear integration documentation
- **Deployment Guides**: Document deployment procedures
- **Troubleshooting**: Maintain troubleshooting guides

### 10. Git Workflow

#### Commit Standards
- **Conventional Commits**: Use conventional commit messages
- **Small Commits**: Keep commits small and focused
- **Clear Messages**: Write descriptive commit messages
- **Branch Naming**: Use descriptive branch names (feat/, fix/, chore/)

#### Code Review Process
- **Review Checklist**: Use standardized review checklist
- **Security Review**: Include security review in process
- **Performance Review**: Review performance implications
- **Testing**: Ensure tests are included and passing

### 11. Deployment and DevOps

#### Environment Management
- **Environment Parity**: Keep environments as similar as possible
- **Configuration**: Use environment-specific configurations
- **Secrets**: Manage secrets securely across environments
- **Database Migrations**: Use versioned database migrations

#### Monitoring and Alerting
- **Health Checks**: Implement comprehensive health checks
- **Uptime Monitoring**: Monitor application uptime
- **Error Alerting**: Set up alerts for critical errors
- **Performance Monitoring**: Monitor application performance

### 12. Colombian Tax Compliance

#### Tax Calculation Rules
- **Deterministic Logic**: Tax calculations must be deterministic and auditable
- **Rule Versioning**: Version all tax rules for historical accuracy
- **Regulation Updates**: Process for updating tax regulations
- **Audit Trail**: Maintain complete audit trail for calculations

#### Data Retention
- **Legal Requirements**: Follow Colombian data retention laws
- **PII Protection**: Minimize collection and storage of PII
- **Backup Strategy**: Implement comprehensive backup strategy
- **Data Purging**: Implement data purging for expired documents

## Code Examples

### 1. API Route Structure
```typescript
// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRequest } from '@/lib/auth';
import { invoiceSchema } from '@/lib/validations/invoice';

export async function GET(request: NextRequest) {
  try {
    const { user, tenant } = await validateRequest(request);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch invoices' }, 
      { status: 500 }
    );
  }
}
```

### 2. Server Action Pattern
```typescript
// lib/actions/invoice.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateUser } from '@/lib/auth';

export async function approveInvoice(invoiceId: string) {
  const { user, tenant } = await validateUser();
  const supabase = createClient();
  
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenant.id);
    
  if (error) {
    throw new Error('Failed to approve invoice');
  }
  
  revalidatePath('/dashboard/review');
  redirect('/dashboard/review');
}
```

### 3. Component Pattern
```typescript
// components/invoice/invoice-card.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';

interface InvoiceCardProps {
  invoice: Invoice;
  onSelect: (id: string) => void;
}

export function InvoiceCard({ invoice, onSelect }: InvoiceCardProps) {
  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(invoice.id)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{invoice.supplier_name}</h3>
          <p className="text-sm text-muted-foreground">
            {invoice.invoice_number}
          </p>
        </div>
        <Badge variant={invoice.needs_review ? 'destructive' : 'default'}>
          {invoice.status}
        </Badge>
      </div>
      <div className="mt-2">
        <p className="text-lg font-bold">
          {formatCurrency(invoice.total_amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(invoice.issue_date).toLocaleDateString('es-CO')}
        </p>
      </div>
    </Card>
  );
}
```