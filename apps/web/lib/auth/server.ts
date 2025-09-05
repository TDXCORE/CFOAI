// CFO AI Authentication Server Utilities
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Database } from '../supabase/database.types';
import type { UserProfile, Tenant, UserTenant } from '../types/database';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
  tenant: Tenant;
  userTenant: UserTenant;
}

export async function getUser() {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      profile,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  return user;
}

export async function getUserTenants(userId: string) {
  const supabase = createClient();
  
  const { data: userTenants, error } = await supabase
    .from('user_tenants')
    .select(`
      *,
      tenants (
        id,
        name,
        slug,
        plan,
        status,
        settings
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (error) {
    throw new Error('Failed to fetch user tenants');
  }
  
  return userTenants || [];
}

export async function getDefaultTenant(userId: string) {
  const userTenants = await getUserTenants(userId);
  
  if (userTenants.length === 0) {
    return null;
  }
  
  // Find owner role first, then admin, then first available
  const ownerTenant = userTenants.find(ut => ut.role === 'owner');
  if (ownerTenant) return ownerTenant;
  
  const adminTenant = userTenants.find(ut => ut.role === 'admin');
  if (adminTenant) return adminTenant;
  
  return userTenants[0];
}

export async function getTenantFromSlug(slug: string) {
  const supabase = createClient();
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
    
  if (error || !tenant) {
    return null;
  }
  
  return tenant;
}

export async function validateUserTenantAccess(userId: string, tenantId: string) {
  const supabase = createClient();
  
  const { data: userTenant, error } = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();
    
  if (error || !userTenant) {
    return null;
  }
  
  return userTenant;
}

export async function requireAuthContext(tenantSlug?: string): Promise<AuthContext> {
  const user = await requireUser();
  
  let tenant: Tenant;
  let userTenant: UserTenant;
  
  if (tenantSlug) {
    // Get specific tenant
    const tenantData = await getTenantFromSlug(tenantSlug);
    if (!tenantData) {
      redirect('/dashboard');
    }
    tenant = tenantData;
    
    // Validate user access
    const userTenantData = await validateUserTenantAccess(user.id, tenant.id);
    if (!userTenantData) {
      redirect('/dashboard');
    }
    userTenant = userTenantData;
  } else {
    // Get default tenant
    const defaultTenant = await getDefaultTenant(user.id);
    if (!defaultTenant) {
      redirect('/onboarding');
    }
    
    tenant = defaultTenant.tenants;
    userTenant = {
      id: defaultTenant.id,
      user_id: defaultTenant.user_id,
      tenant_id: defaultTenant.tenant_id,
      role: defaultTenant.role,
      status: defaultTenant.status,
      permissions: defaultTenant.permissions,
      created_at: defaultTenant.created_at,
      updated_at: defaultTenant.updated_at,
      created_by: defaultTenant.created_by,
    };
  }
  
  return {
    user,
    tenant,
    userTenant,
  };
}

export function hasPermission(userTenant: UserTenant, permission: string): boolean {
  // Owner and admin have all permissions
  if (userTenant.role === 'owner' || userTenant.role === 'admin') {
    return true;
  }
  
  // Check specific permissions
  const permissions = userTenant.permissions as Record<string, boolean> || {};
  return permissions[permission] === true;
}

export function canApproveInvoices(userTenant: UserTenant): boolean {
  return ['owner', 'admin', 'approver'].includes(userTenant.role);
}

export function canExportData(userTenant: UserTenant): boolean {
  return ['owner', 'admin', 'approver'].includes(userTenant.role);
}

export function canManageUsers(userTenant: UserTenant): boolean {
  return ['owner', 'admin'].includes(userTenant.role);
}

export function canManageSettings(userTenant: UserTenant): boolean {
  return ['owner', 'admin'].includes(userTenant.role);
}

export function canViewAuditLogs(userTenant: UserTenant): boolean {
  return ['owner', 'admin'].includes(userTenant.role);
}

// Audit logging helper
export async function logAuditEvent(
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  requestContext?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }
) {
  const supabase = createClient();
  
  const changes: string[] = [];
  
  if (oldValues && newValues) {
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changes.push(`${key}: ${oldValues[key]} → ${newValues[key]}`);
      }
    });
  }
  
  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues,
    new_values: newValues,
    changes_summary: changes.join(', '),
    ip_address: requestContext?.ipAddress,
    user_agent: requestContext?.userAgent,
    request_id: requestContext?.requestId,
  });
}

// Helper to create user profile after signup
export async function createUserProfile(userId: string, email: string, fullName?: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      timezone: 'America/Bogota',
      locale: 'es-CO',
      preferences: {},
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
  
  return data;
}

// Helper to create tenant and associate user
export async function createTenantWithUser(
  userId: string,
  tenantData: {
    name: string;
    slug: string;
    plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  }
) {
  const supabase = createClient();
  
  // Start a transaction by creating the tenant first
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantData.name,
      slug: tenantData.slug,
      plan: tenantData.plan || 'free',
      created_by: userId,
      settings: {
        defaultCurrency: 'COP',
        timezone: 'America/Bogota',
        locale: 'es-CO',
      },
    })
    .select()
    .single();
    
  if (tenantError) {
    throw new Error(`Failed to create tenant: ${tenantError.message}`);
  }
  
  // Associate user as owner
  const { data: userTenant, error: userTenantError } = await supabase
    .from('user_tenants')
    .insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: 'owner',
      status: 'active',
      created_by: userId,
      permissions: {},
    })
    .select()
    .single();
    
  if (userTenantError) {
    // Cleanup - delete the tenant if user association failed
    await supabase.from('tenants').delete().eq('id', tenant.id);
    throw new Error(`Failed to associate user with tenant: ${userTenantError.message}`);
  }
  
  return {
    tenant,
    userTenant,
  };
}