# API Specifications

## Overview
This document defines the REST API endpoints for the CFO AI SaaS platform. All APIs follow RESTful conventions and return JSON responses.

## Base Configuration
- **Base URL**: `https://cfoai.vercel.app/api`
- **Authentication**: Bearer JWT tokens
- **Content-Type**: `application/json`
- **Rate Limiting**: 1000 requests/hour per tenant

## Authentication
All API endpoints require authentication via JWT tokens obtained through Supabase Auth.

```
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_uuid>
```

---

## 1. Authentication & User Management

### POST /api/auth/signup
Register a new user and create a tenant.

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "companyName": "ABC Corp",
  "companySlug": "abc-corp"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "fullName": "John Doe"
  },
  "tenant": {
    "id": "uuid",
    "name": "ABC Corp",
    "slug": "abc-corp",
    "plan": "free"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

### POST /api/auth/signin
Authenticate existing user.

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "fullName": "John Doe"
  },
  "tenants": [
    {
      "id": "uuid",
      "name": "ABC Corp",
      "role": "owner"
    }
  ],
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

### POST /api/auth/signout
Sign out current user.

**Response (200):**
```json
{
  "message": "Successfully signed out"
}
```

---

## 2. Tenant Management

### GET /api/tenants/current
Get current tenant information.

**Response (200):**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "ABC Corp",
    "slug": "abc-corp",
    "plan": "professional",
    "status": "active",
    "settings": {
      "defaultCurrency": "COP",
      "timezone": "America/Bogota",
      "locale": "es-CO"
    },
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### PUT /api/tenants/current
Update current tenant settings.

**Request:**
```json
{
  "name": "ABC Corp Updated",
  "settings": {
    "defaultCurrency": "COP",
    "timezone": "America/Bogota",
    "autoProcessing": true
  }
}
```

**Response (200):**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "ABC Corp Updated",
    "settings": {
      "defaultCurrency": "COP",
      "timezone": "America/Bogota",
      "autoProcessing": true
    },
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### GET /api/tenants/current/users
Get tenant users and their roles.

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "admin@company.com",
      "fullName": "John Doe",
      "role": "owner",
      "status": "active",
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/tenants/current/users/invite
Invite a user to the tenant.

**Request:**
```json
{
  "email": "user@company.com",
  "role": "analyst",
  "permissions": ["read_invoices", "approve_invoices"]
}
```

**Response (201):**
```json
{
  "invitation": {
    "id": "uuid",
    "email": "user@company.com",
    "role": "analyst",
    "status": "invited",
    "expiresAt": "2024-01-22T10:00:00Z"
  }
}
```

---

## 3. File Management

### POST /api/files/upload
Upload files for processing.

**Request (multipart/form-data):**
```
files: File[]
source: "manual" | "email"
metadata: JSON string (optional)
```

**Response (201):**
```json
{
  "files": [
    {
      "id": "uuid",
      "filename": "invoice-001.xml",
      "originalFilename": "Factura ABC-001.xml",
      "mimeType": "application/xml",
      "fileSize": 15360,
      "fileHash": "sha256_hash",
      "storagePath": "tenants/uuid/files/2024/01/invoice-001.xml",
      "status": "stored",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "processingJobs": [
    {
      "id": "uuid",
      "fileId": "file_uuid",
      "status": "queued",
      "jobType": "file_parse"
    }
  ]
}
```

### GET /api/files
List uploaded files.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `status`: "stored" | "processing" | "processed" | "error"
- `source`: "email" | "upload" | "zip_extract"
- `dateFrom`: ISO date string
- `dateTo`: ISO date string

**Response (200):**
```json
{
  "files": [
    {
      "id": "uuid",
      "filename": "invoice-001.xml",
      "originalFilename": "Factura ABC-001.xml",
      "mimeType": "application/xml",
      "fileSize": 15360,
      "status": "processed",
      "createdAt": "2024-01-15T12:00:00Z",
      "invoice": {
        "id": "uuid",
        "invoiceNumber": "ABC-001",
        "supplierName": "Supplier ABC"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### GET /api/files/:id
Get file details and download URL.

**Response (200):**
```json
{
  "file": {
    "id": "uuid",
    "filename": "invoice-001.xml",
    "originalFilename": "Factura ABC-001.xml",
    "mimeType": "application/xml",
    "fileSize": 15360,
    "status": "processed",
    "downloadUrl": "https://supabase.co/storage/v1/object/sign/...",
    "previewUrl": "https://supabase.co/storage/v1/object/sign/...",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

### DELETE /api/files/:id
Delete a file.

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

---

## 4. Processing Jobs

### GET /api/jobs
List processing jobs.

**Query Parameters:**
- `status`: "queued" | "parsing" | "llm_classify" | "tax_compute" | "ready_for_review" | "approved" | "exported" | "error"
- `page`: number
- `limit`: number

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "jobType": "file_parse",
      "status": "tax_compute",
      "priority": 0,
      "attempts": 1,
      "startedAt": "2024-01-15T12:05:00Z",
      "progressData": {
        "stage": "calculating_taxes",
        "progress": 75
      },
      "file": {
        "id": "uuid",
        "filename": "invoice-001.xml"
      },
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### GET /api/jobs/:id
Get job details.

**Response (200):**
```json
{
  "job": {
    "id": "uuid",
    "jobType": "file_parse",
    "status": "completed",
    "priority": 0,
    "attempts": 1,
    "startedAt": "2024-01-15T12:05:00Z",
    "finishedAt": "2024-01-15T12:08:00Z",
    "progressData": {
      "stage": "completed",
      "progress": 100,
      "extractedData": {
        "invoiceNumber": "ABC-001",
        "totalAmount": 1190000
      }
    },
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

### POST /api/jobs/:id/retry
Retry a failed job.

**Response (200):**
```json
{
  "job": {
    "id": "uuid",
    "status": "queued",
    "attempts": 2,
    "updatedAt": "2024-01-15T13:00:00Z"
  }
}
```

---

## 5. Invoice Management

### GET /api/invoices
List invoices with filtering and pagination.

**Query Parameters:**
- `status`: "parsed" | "classified" | "calculated" | "reviewed" | "approved" | "exported"
- `needsReview`: boolean
- `supplierNit`: string
- `dateFrom`: ISO date
- `dateTo`: ISO date
- `page`: number
- `limit`: number
- `sortBy`: "issueDate" | "totalAmount" | "supplierName" | "createdAt"
- `sortOrder`: "asc" | "desc"

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "ABC-001",
      "invoiceType": "invoice",
      "issueDate": "2024-01-10",
      "supplierNit": "900123456",
      "supplierName": "Supplier ABC",
      "buyerNit": "800654321",
      "buyerName": "My Company",
      "subtotal": 1000000,
      "taxAmount": 190000,
      "totalAmount": 1190000,
      "currencyCode": "COP",
      "status": "calculated",
      "needsReview": false,
      "confidenceScore": 0.95,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1850,
    "totalPages": 93
  },
  "summary": {
    "totalAmount": 2280000000,
    "totalTaxes": 433200000,
    "invoiceCount": 1850,
    "averageAmount": 1232432
  }
}
```

### GET /api/invoices/:id
Get detailed invoice information.

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "ABC-001",
    "invoiceType": "invoice",
    "cufe": "CUFE-123456789",
    "issueDate": "2024-01-10",
    "dueDate": "2024-02-09",
    "supplierNit": "900123456",
    "supplierName": "Supplier ABC",
    "supplierAddress": "Calle 123 #45-67",
    "supplierCity": "Bogotá",
    "buyerNit": "800654321",
    "buyerName": "My Company",
    "buyerAddress": "Carrera 78 #90-12",
    "buyerCity": "Medellín",
    "subtotal": 1000000,
    "taxAmount": 190000,
    "discountAmount": 0,
    "totalAmount": 1190000,
    "currencyCode": "COP",
    "sourceFormat": "xml_ubl",
    "confidenceScore": 0.95,
    "needsReview": false,
    "status": "calculated",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "items": [
    {
      "id": "uuid",
      "lineNumber": 1,
      "itemCode": "PROD-001",
      "description": "Producto de ejemplo",
      "quantity": 10,
      "unitOfMeasure": "und",
      "unitPrice": 100000,
      "lineTotal": 1000000,
      "taxRate": 19,
      "taxAmount": 190000,
      "expenseCategory": "inventory"
    }
  ],
  "classification": {
    "id": "uuid",
    "expenseKind": "goods",
    "isLargeTaxpayer": false,
    "cityCode": "11001",
    "expenseCategory": "inventory",
    "confidenceScore": 0.95,
    "rationale": "Based on item description and supplier classification",
    "isReviewed": false
  },
  "taxCalculation": {
    "id": "uuid",
    "ivaBase": 1000000,
    "ivaAmount": 190000,
    "ivaRate": 19,
    "reteivaBase": 190000,
    "reteivaAmount": 28500,
    "reteivaRate": 15,
    "retefuenteBase": 1000000,
    "retefuenteAmount": 40000,
    "retefuenteRate": 4,
    "icaBase": 1000000,
    "icaAmount": 4140,
    "icaRate": 4.14,
    "appliedRules": ["rule-uuid-1", "rule-uuid-2"],
    "calculationDetails": {
      "steps": [
        {
          "rule": "IVA General 19%",
          "calculation": "1000000 * 0.19 = 190000",
          "result": 190000
        }
      ]
    }
  },
  "file": {
    "id": "uuid",
    "filename": "invoice-001.xml",
    "downloadUrl": "https://..."
  }
}
```

### PUT /api/invoices/:id
Update invoice information (manual corrections).

**Request:**
```json
{
  "supplierName": "Corrected Supplier Name",
  "buyerCity": "Medellín",
  "classification": {
    "expenseKind": "services",
    "cityCode": "05001",
    "expenseCategory": "professional_services"
  },
  "reviewNotes": "Corrected supplier name and reclassified as services"
}
```

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "supplierName": "Corrected Supplier Name",
    "status": "reviewed",
    "reviewNotes": "Corrected supplier name and reclassified as services",
    "updatedAt": "2024-01-15T14:00:00Z"
  },
  "recalculationJob": {
    "id": "uuid",
    "status": "queued",
    "jobType": "tax_recalculate"
  }
}
```

### POST /api/invoices/:id/approve
Approve an invoice for export.

**Request:**
```json
{
  "approvalNotes": "Reviewed and approved for export",
  "accountMappings": [
    {
      "itemId": "item-uuid",
      "accountCode": "5135",
      "costCenterCode": "CC001"
    }
  ]
}
```

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "status": "approved",
    "approvedBy": "user-uuid",
    "approvedAt": "2024-01-15T15:00:00Z",
    "approvalNotes": "Reviewed and approved for export"
  }
}
```

### POST /api/invoices/:id/reject
Reject an invoice and send back for review.

**Request:**
```json
{
  "rejectionReason": "Incorrect supplier classification",
  "rejectionNotes": "Please verify supplier NIT and reclassify"
}
```

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "status": "parsed",
    "needsReview": true,
    "rejectionReason": "Incorrect supplier classification",
    "rejectionNotes": "Please verify supplier NIT and reclassify",
    "updatedAt": "2024-01-15T15:00:00Z"
  }
}
```

---

## 6. Tax Management

### GET /api/taxes/rules
Get tax calculation rules.

**Query Parameters:**
- `ruleType`: "iva" | "reteiva" | "retefuente" | "ica"
- `isActive`: boolean
- `country`: string (default: "CO")

**Response (200):**
```json
{
  "rules": [
    {
      "id": "uuid",
      "ruleName": "IVA General 19%",
      "ruleType": "iva",
      "countryCode": "CO",
      "conditions": {
        "expenseKind": ["goods", "services"]
      },
      "formula": {
        "rate": 0.19,
        "baseField": "subtotal"
      },
      "effectiveFrom": "2021-01-01",
      "effectiveUntil": null,
      "isActive": true,
      "description": "Standard IVA rate for goods and services"
    }
  ]
}
```

### POST /api/taxes/rules
Create a new tax rule.

**Request:**
```json
{
  "ruleName": "Custom IVA Rate",
  "ruleType": "iva",
  "conditions": {
    "expenseKind": "services",
    "supplierNit": "900123456"
  },
  "formula": {
    "rate": 0.05,
    "baseField": "subtotal"
  },
  "effectiveFrom": "2024-02-01",
  "description": "Special rate for specific supplier"
}
```

**Response (201):**
```json
{
  "rule": {
    "id": "uuid",
    "ruleName": "Custom IVA Rate",
    "ruleType": "iva",
    "conditions": {
      "expenseKind": "services",
      "supplierNit": "900123456"
    },
    "formula": {
      "rate": 0.05,
      "baseField": "subtotal"
    },
    "effectiveFrom": "2024-02-01",
    "isActive": true,
    "version": 1,
    "createdAt": "2024-01-15T16:00:00Z"
  }
}
```

### PUT /api/taxes/rules/:id
Update a tax rule.

**Request:**
```json
{
  "formula": {
    "rate": 0.08,
    "baseField": "subtotal"
  },
  "effectiveFrom": "2024-03-01"
}
```

**Response (200):**
```json
{
  "rule": {
    "id": "uuid",
    "formula": {
      "rate": 0.08,
      "baseField": "subtotal"
    },
    "effectiveFrom": "2024-03-01",
    "version": 2,
    "updatedAt": "2024-01-15T16:30:00Z"
  }
}
```

### GET /api/taxes/rates/ica
Get ICA rates by city.

**Query Parameters:**
- `cityCode`: string (DANE code)
- `activityCode`: string (CIIU code)

**Response (200):**
```json
{
  "rates": [
    {
      "id": "uuid",
      "cityCode": "11001",
      "cityName": "Bogotá D.C.",
      "activityCode": "6201",
      "activityDescription": "Desarrollo de sistemas informáticos",
      "ratePerThousand": 4.14,
      "minimumAmount": 0,
      "effectiveFrom": "2021-01-01",
      "isActive": true
    }
  ]
}
```

### POST /api/taxes/calculate
Calculate taxes for an invoice (manual calculation).

**Request:**
```json
{
  "invoiceData": {
    "subtotal": 1000000,
    "supplierNit": "900123456",
    "buyerNit": "800654321",
    "expenseKind": "services",
    "cityCode": "11001"
  },
  "classification": {
    "expenseKind": "services",
    "isLargeTaxpayer": false,
    "cityCode": "11001"
  }
}
```

**Response (200):**
```json
{
  "calculation": {
    "ivaBase": 1000000,
    "ivaAmount": 190000,
    "ivaRate": 19,
    "reteivaBase": 190000,
    "reteivaAmount": 28500,
    "reteivaRate": 15,
    "retefuenteBase": 1000000,
    "retefuenteAmount": 40000,
    "retefuenteRate": 4,
    "icaBase": 1000000,
    "icaAmount": 4140,
    "icaRate": 4.14,
    "appliedRules": [
      {
        "ruleId": "uuid",
        "ruleName": "IVA General 19%",
        "calculation": "1000000 * 0.19 = 190000"
      }
    ],
    "totalTaxes": 262640,
    "netAmount": 737360
  }
}
```

---

## 7. Account Mapping

### GET /api/accounts/mapping
Get account mappings.

**Query Parameters:**
- `supplierNit`: string
- `expenseCategory`: string
- `accountType`: "expense" | "tax" | "retention"

**Response (200):**
```json
{
  "mappings": [
    {
      "id": "uuid",
      "supplierNit": "900123456",
      "expenseCategory": "professional_services",
      "accountType": "expense",
      "accountCode": "5135",
      "accountName": "Servicios profesionales",
      "costCenterCode": "CC001",
      "costCenterName": "Administración",
      "priority": 10,
      "isActive": true
    }
  ]
}
```

### POST /api/accounts/mapping
Create account mapping.

**Request:**
```json
{
  "supplierNit": "900123456",
  "expenseCategory": "professional_services",
  "accountType": "expense",
  "accountCode": "5135",
  "accountName": "Servicios profesionales",
  "costCenterCode": "CC001",
  "costCenterName": "Administración",
  "priority": 10
}
```

**Response (201):**
```json
{
  "mapping": {
    "id": "uuid",
    "supplierNit": "900123456",
    "expenseCategory": "professional_services",
    "accountType": "expense",
    "accountCode": "5135",
    "accountName": "Servicios profesionales",
    "costCenterCode": "CC001",
    "costCenterName": "Administración",
    "priority": 10,
    "isActive": true,
    "createdAt": "2024-01-15T17:00:00Z"
  }
}
```

### GET /api/accounts/chart
Get chart of accounts (PUC).

**Response (200):**
```json
{
  "accounts": [
    {
      "code": "1135",
      "name": "Inventarios",
      "type": "asset",
      "level": 4,
      "parentCode": "113"
    },
    {
      "code": "5135",
      "name": "Servicios profesionales",
      "type": "expense",
      "level": 4,
      "parentCode": "513"
    }
  ]
}
```

---

## 8. Export Management

### POST /api/exports
Create a new export batch.

**Request:**
```json
{
  "exportType": "csv",
  "targetSystem": "siigo",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "filters": {
    "status": "approved",
    "supplierNit": ["900123456", "800654321"]
  },
  "includeAttachments": false
}
```

**Response (201):**
```json
{
  "export": {
    "id": "uuid",
    "exportType": "csv",
    "targetSystem": "siigo",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "status": "queued",
    "totalInvoices": 0,
    "totalAmount": 0,
    "createdAt": "2024-01-15T18:00:00Z"
  },
  "job": {
    "id": "uuid",
    "status": "queued",
    "estimatedTime": "2-3 minutes"
  }
}
```

### GET /api/exports
List export batches.

**Query Parameters:**
- `status`: "queued" | "processing" | "completed" | "error"
- `targetSystem`: string
- `page`: number
- `limit`: number

**Response (200):**
```json
{
  "exports": [
    {
      "id": "uuid",
      "exportType": "csv",
      "targetSystem": "siigo",
      "dateFrom": "2024-01-01",
      "dateTo": "2024-01-31",
      "status": "completed",
      "totalInvoices": 156,
      "totalAmount": 185600000,
      "fileId": "file-uuid",
      "createdAt": "2024-01-15T18:00:00Z",
      "completedAt": "2024-01-15T18:03:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### GET /api/exports/:id
Get export details.

**Response (200):**
```json
{
  "export": {
    "id": "uuid",
    "exportType": "csv",
    "targetSystem": "siigo",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "status": "completed",
    "totalInvoices": 156,
    "totalAmount": 185600000,
    "filters": {
      "status": "approved"
    },
    "fileId": "file-uuid",
    "downloadUrl": "https://...",
    "createdAt": "2024-01-15T18:00:00Z",
    "completedAt": "2024-01-15T18:03:00Z"
  },
  "preview": [
    {
      "fecha": "2024-01-15",
      "tercero_nit": "900123456",
      "cuenta": "5135",
      "detalle": "Servicios profesionales - ABC-001",
      "debito": 1000000,
      "credito": 0,
      "centro_costo": "CC001",
      "ciudad": "11001"
    }
  ]
}
```

### GET /api/exports/:id/download
Download export file.

**Response (200):**
Returns the actual file (CSV, JSON, etc.) with appropriate headers.

### GET /api/exports/templates
Get available export templates.

**Response (200):**
```json
{
  "templates": [
    {
      "id": "siigo_csv",
      "name": "Siigo CSV",
      "description": "CSV format for Siigo accounting software",
      "fileExtension": "csv",
      "fields": [
        "fecha",
        "tercero_nit",
        "cuenta",
        "detalle",
        "debito",
        "credito",
        "centro_costo",
        "ciudad"
      ]
    },
    {
      "id": "world_office_json",
      "name": "World Office JSON",
      "description": "JSON format for World Office",
      "fileExtension": "json"
    }
  ]
}
```

---

## 9. Microsoft Graph Integration

### POST /api/msgraph/connect
Initiate Outlook connection.

**Request:**
```json
{
  "mailboxAddress": "accounting@company.com",
  "folderName": "Facturas"
}
```

**Response (200):**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
  "state": "random_state_value"
}
```

### GET /api/msgraph/callback
OAuth callback endpoint (handled automatically).

### POST /api/msgraph/disconnect
Disconnect Outlook integration.

**Response (200):**
```json
{
  "message": "Mailbox disconnected successfully"
}
```

### GET /api/msgraph/status
Get connection status.

**Response (200):**
```json
{
  "mailbox": {
    "id": "uuid",
    "mailboxAddress": "accounting@company.com",
    "displayName": "Accounting Department",
    "folderName": "Facturas",
    "status": "connected",
    "lastSyncAt": "2024-01-15T12:00:00Z"
  },
  "subscription": {
    "id": "graph-subscription-id",
    "expirationDateTime": "2024-01-18T12:00:00Z",
    "status": "active"
  }
}
```

### POST /api/msgraph/sync
Trigger manual sync.

**Response (200):**
```json
{
  "syncJob": {
    "id": "uuid",
    "status": "queued",
    "estimatedTime": "1-2 minutes"
  }
}
```

### POST /api/msgraph/notifications
Webhook endpoint for Microsoft Graph notifications (internal use).

---

## 10. Dashboard & Analytics

### GET /api/dashboard/overview
Get dashboard overview data.

**Query Parameters:**
- `period`: "today" | "week" | "month" | "quarter" | "year"
- `dateFrom`: ISO date
- `dateTo`: ISO date

**Response (200):**
```json
{
  "overview": {
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "metrics": {
      "totalInvoices": 1856,
      "totalAmount": 2280000000,
      "totalTaxes": 433200000,
      "processedToday": 45,
      "averageProcessingTime": 8.5,
      "automationRate": 0.94,
      "errorRate": 0.03
    },
    "statusBreakdown": {
      "queued": 12,
      "processing": 5,
      "readyForReview": 23,
      "approved": 1780,
      "exported": 1642
    },
    "topSuppliers": [
      {
        "nit": "900123456",
        "name": "Supplier ABC",
        "invoiceCount": 156,
        "totalAmount": 185600000
      }
    ]
  }
}
```

### GET /api/dashboard/processing
Get processing pipeline metrics.

**Response (200):**
```json
{
  "processing": {
    "queueStats": {
      "total": 40,
      "byStatus": {
        "queued": 12,
        "parsing": 3,
        "llm_classify": 2,
        "tax_compute": 8,
        "ready_for_review": 15
      }
    },
    "performance": {
      "averageProcessingTime": 8.5,
      "medianProcessingTime": 6.2,
      "processingTimeByStage": {
        "parsing": 2.1,
        "classification": 3.2,
        "taxCalculation": 2.8,
        "review": 120.5
      }
    },
    "errors": [
      {
        "type": "xml_parse_error",
        "count": 5,
        "lastOccurred": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### GET /api/dashboard/financial
Get financial summary data.

**Query Parameters:**
- `period`: "month" | "quarter" | "year"
- `groupBy`: "month" | "supplier" | "category"

**Response (200):**
```json
{
  "financial": {
    "summary": {
      "totalExpenses": 1847000000,
      "totalTaxes": 433200000,
      "byTaxType": {
        "iva": 351130000,
        "reteiva": 52669500,
        "retefuente": 73880000,
        "ica": 7648940
      }
    },
    "trends": [
      {
        "period": "2024-01",
        "totalAmount": 185600000,
        "totalTaxes": 35264000,
        "invoiceCount": 156
      }
    ],
    "byCategory": [
      {
        "category": "professional_services",
        "amount": 456000000,
        "percentage": 24.7
      }
    ]
  }
}
```

---

## Error Response Format

All API endpoints use consistent error response format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "requestId": "req_123456789"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: 401 - Invalid or missing authentication
- `FORBIDDEN`: 403 - Insufficient permissions
- `NOT_FOUND`: 404 - Resource not found
- `INVALID_REQUEST`: 400 - Request validation failed
- `RATE_LIMITED`: 429 - Rate limit exceeded
- `INTERNAL_ERROR`: 500 - Internal server error
- `SERVICE_UNAVAILABLE`: 503 - External service unavailable

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `204`: No Content
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable