# CFO AI - Vercel Deployment Guide

## 🚀 Step-by-Step Vercel Deployment

### 1. **Connect Repository to Vercel**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/TDXCORE/CFOAI`
4. Select the repository and click "Import"

### 2. **Configure Build Settings**

Vercel should automatically detect Next.js, but verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave empty)
- **Build Command**: `cd apps/web && pnpm run build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install --frozen-lockfile`

### 3. **Environment Variables Setup**

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add these:

#### **Required Environment Variables:**

```bash
# Next.js Configuration
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Microsoft Graph API (Optional - for Outlook integration)
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/integrations/outlook/auth

# Webhook URLs (Optional)
OUTLOOK_WEBHOOK_URL=https://your-vercel-domain.vercel.app/api/integrations/outlook/webhook

# Colombian Configuration
DEFAULT_TIMEZONE=America/Bogota
DEFAULT_CURRENCY=COP
DEFAULT_TAX_REGIME=ordinario

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
OPENAI_RATE_LIMIT_RPM=50

# File Upload Configuration
MAX_FILE_SIZE_MB=25
MAX_FILES_PER_UPLOAD=10
```

### 4. **Environment Variable Values Guide**

#### **NEXTAUTH_SECRET**
Generate a secure secret key:
```bash
openssl rand -base64 32
```
Or use: `https://generate-secret.vercel.app/32`

#### **Supabase Values**
1. Go to your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy:
   - **URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret**: `SUPABASE_SERVICE_ROLE_KEY`

#### **OpenAI API Key**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Go to **API Keys**
3. Create new secret key
4. Copy the key (starts with `sk-`)

### 5. **Deploy**

1. After adding environment variables, click **Deploy**
2. Vercel will automatically build and deploy your application
3. Once deployed, you'll get a URL like: `https://your-project.vercel.app`

### 6. **Database Setup**

After successful deployment, set up your database:

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push database schema
supabase db push
```

### 7. **Custom Domain (Optional)**

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update `NEXTAUTH_URL` environment variable to your custom domain
4. Update Microsoft app registration redirect URLs (if using Outlook)

## ⚡ Quick Fix for Common Issues

### **Build Errors**

If you get build errors, check:
1. All environment variables are set
2. `NEXT_PUBLIC_*` variables are accessible during build
3. No missing dependencies in `package.json`

### **Runtime Errors**

1. Check function logs in Vercel dashboard
2. Verify database connection
3. Ensure all API keys are valid

### **Authentication Issues**

1. Verify `NEXTAUTH_URL` matches your domain exactly
2. Check `NEXTAUTH_SECRET` is at least 32 characters
3. Verify Supabase URL and keys

## 🔧 Vercel Configuration Files

The repository includes these Vercel configuration files:

- **`vercel.json`**: Build and routing configuration
- **`.env.example`**: Template for environment variables
- **`.github/workflows/ci.yml`**: Auto-deployment on push to main

## 📊 Post-Deployment Verification

After deployment, verify these features work:

1. **Homepage loads**: Visit your Vercel URL
2. **Authentication**: Try signing up/in
3. **Database**: Check if data persists
4. **File uploads**: Test document upload
5. **API endpoints**: Test `/api/health` if available

## 🆘 Troubleshooting

### Common Error Messages:

**"Module not found"**
- Check if all dependencies are in `package.json`
- Verify import paths are correct

**"Environment variable not defined"**
- Double-check all required env vars are set
- Ensure no typos in variable names

**"Database connection failed"**
- Verify Supabase URL and keys
- Check if database migrations ran successfully

**"Build timeout"**
- Check if build command is correct
- Verify no infinite loops in build process

---

## 🎉 Success!

Once deployed successfully, your CFO AI platform will be live and ready to process Colombian invoices with AI-powered tax calculations!

Visit your deployment URL to start using the platform.