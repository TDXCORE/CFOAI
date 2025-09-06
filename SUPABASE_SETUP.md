# CFO AI - Supabase Database Setup Guide

## 🗄️ Setting Up Your Supabase Database

### 1. **Create New Supabase Project**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: CFO AI Production (or your preferred name)
   - **Database Password**: Generate a secure password (save it!)
   - **Region**: Choose closest to your users (US East for Vercel)
5. Click "Create new project"
6. Wait for project initialization (~2-3 minutes)

### 2. **Get Connection Details**

After project creation, go to **Settings** → **API**:

- **Project URL**: `https://your-project-id.supabase.co`
- **Project Reference ID**: `your-project-id`  
- **API Keys**:
  - `anon` `public` (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - `service_role` `secret` (for SUPABASE_SERVICE_ROLE_KEY)

### 3. **Execute Database Migration**

#### Option A: Using SQL Editor (Recommended)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New Query"
3. Copy the entire contents of `apps/web/supabase/migrations/20250109000000_cfo_ai_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" (ignore the destructive operation warning - this is expected for new setup)

#### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### 4. **Verify Database Setup**

After running the migration, verify these components exist:

#### **Tables Created** (should see 20+ tables):
- `tenants`, `user_profiles`, `user_tenants`
- `invoices`, `invoice_items`, `files`
- `mailboxes`, `mail_messages`, `processing_jobs`
- `classifications`, `tax_calculations`, `tax_rules`
- `accounts_mapping`, `accounting_entries`, `exports`
- `audit_logs`, `ica_rates`

#### **RLS Policies** (Row Level Security):
- Go to **Authentication** → **Policies**
- Should see policies for each table (e.g., `tenant_access`, `invoice_tenant_access`)
- Should see storage policies (`invoices_policy`, `exports_policy`)

#### **Functions**:
- Go to **SQL Editor** → **Functions**
- Should see `cfo_ai.user_tenant_ids()` function

#### **Sample Data**:
- Check `tax_rules` table - should have Colombian tax rules
- Check `ica_rates` table - should have Bogotá, Medellín, Cali rates

### 5. **Configure Authentication**

1. Go to **Authentication** → **Settings**
2. **Site URL**: Set to your Vercel domain (e.g., `https://your-app.vercel.app`)
3. **Redirect URLs**: Add your callback URL:
   ```
   https://your-app.vercel.app/auth/callback
   ```

### 6. **Set Up Row Level Security (RLS)**

RLS should be automatically enabled by the migration, but verify:

1. Go to **Table Editor**
2. For each table, ensure **RLS Enabled** is checked
3. Verify policies exist in **Authentication** → **Policies**

### 7. **Configure Storage (Optional)**

If using file uploads:

1. Go to **Storage**
2. Create bucket: `documents`
3. Set appropriate policies for file access

## 🔧 **Environment Variables for Vercel**

After database setup, add these to your Vercel project:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Other required variables
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-32-character-secret
OPENAI_API_KEY=sk-your-openai-key
```

## 🚨 **Common Issues & Solutions**

### **"syntax error at or near NOT"**
- ✅ **Fixed**: Updated migration to use `DROP POLICY IF EXISTS` + `CREATE POLICY`
- ✅ **Fixed**: Corrected both table policies AND storage policies
- ✅ **Fixed**: Lines 536 and 678 syntax errors resolved
- The corrected migration should run without syntax errors

### **"relation does not exist"**
- **Cause**: Tables not created in correct order
- **Solution**: Run the complete migration file - it handles dependencies correctly

### **"policy already exists"**  
- **Cause**: Trying to run migration multiple times
- **Solution**: The migration includes `DROP POLICY IF EXISTS` statements to handle this

### **"permission denied for schema cfo_ai"**
- **Cause**: Schema not created first
- **Solution**: Ensure you run the complete migration starting from the beginning

### **RLS blocks all access**
- **Cause**: No user signed in to test policies
- **Solution**: Create test user via Authentication UI or disable RLS temporarily for testing

## 🧪 **Testing Your Database**

### **1. Test Authentication Flow**
```sql
-- Create a test user (run in SQL Editor)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'test@example.com', 
  crypt('password123', gen_salt('bf')),
  now()
);
```

### **2. Test RLS Policies**
```sql
-- This should return data when authenticated
SELECT * FROM tenants;

-- This should be empty when not authenticated  
SET LOCAL role TO anon;
SELECT * FROM tenants;
```

### **3. Test Colombian Tax Data**
```sql
-- Verify tax rules are loaded
SELECT * FROM tax_rules;

-- Verify ICA rates for Colombian cities  
SELECT * FROM ica_rates WHERE city_code IN ('11001', '05001', '76001');
```

## 🎉 **Success!**

Your CFO AI database is now ready for:
- ✅ Multi-tenant invoice processing
- ✅ Colombian tax calculations  
- ✅ Secure row-level access control
- ✅ Audit logging and compliance
- ✅ Production deployment

Next step: Deploy your application to Vercel with the environment variables configured!