import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAuthContext } from '~/lib/auth/server';
import { generateAuthUrl, exchangeCodeForToken } from '~/lib/microsoft/graph-client';
import { redirect } from 'next/navigation';

// Initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth callback
    if (code && state) {
      return await handleOAuthCallback(code, state, user.id, tenant.id);
    }
    
    // Handle OAuth error
    if (error) {
      const errorDescription = searchParams.get('error_description');
      return NextResponse.json({
        error: 'OAuth authentication failed',
        details: errorDescription,
      }, { status: 400 });
    }
    
    // Initiate OAuth flow
    const stateToken = `${user.id}:${tenant.id}:${Date.now()}`;
    const authUrl = generateAuthUrl(stateToken);
    
    return NextResponse.json({
      authUrl,
      message: 'Redirect user to authorize Outlook access',
    });
    
  } catch (error) {
    console.error('Outlook auth API error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Handle OAuth callback
async function handleOAuthCallback(
  code: string, 
  state: string, 
  userId: string, 
  tenantId: string
) {
  const supabase = getSupabaseServerClient();
  
  try {
    // Validate state token
    const [stateUserId, stateTenantId] = state.split(':');
    if (stateUserId !== userId || stateTenantId !== tenantId) {
      return NextResponse.json({
        error: 'Invalid state parameter',
      }, { status: 400 });
    }
    
    // Exchange code for tokens
    const credentials = await exchangeCodeForToken(code);
    
    // Save credentials to database
    const { error: dbError } = await supabase
      .from('outlook_integrations')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_at: credentials.expires_at,
        scope: credentials.scope,
        status: 'active',
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tenant_id',
      });
    
    if (dbError) {
      throw dbError;
    }
    
    // Test the connection by fetching user profile
    try {
      const { MicrosoftGraphClient } = await import('~/lib/microsoft/graph-client');
      const graphClient = new MicrosoftGraphClient(credentials.access_token);
      const profile = await graphClient.getUserProfile();
      
      // Update integration with user profile info
      await supabase
        .from('outlook_integrations')
        .update({
          user_email: profile.mail || profile.userPrincipalName,
          user_display_name: profile.displayName,
          microsoft_user_id: profile.id,
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
        
    } catch (profileError) {
      console.warn('Could not fetch user profile:', profileError);
    }
    
    // Return success response with redirect
    return NextResponse.json({
      success: true,
      message: 'Outlook integration configured successfully',
      redirectTo: `/dashboard/${tenantId}/integrations/outlook`,
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({
      error: 'Failed to complete Outlook integration',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}