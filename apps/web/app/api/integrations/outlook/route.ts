import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { requireAuthContext, logAuditEvent } from '~/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = createClient();
    
    const { data: integration, error } = await supabase
      .from('outlook_integrations')
      .select(`
        id,
        user_email,
        user_display_name,
        status,
        connected_at,
        expires_at,
        last_sync,
        subscription_id,
        selected_folders,
        sync_enabled,
        auto_process
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found error code
      throw error;
    }
    
    return NextResponse.json({
      data: integration || null,
    });
    
  } catch (error) {
    console.error('Get Outlook integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = createClient();
    
    // Get integration details first
    const { data: integration } = await supabase
      .from('outlook_integrations')
      .select('id, subscription_id, access_token')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (integration) {
      // Delete webhook subscription if exists
      if (integration.subscription_id && integration.access_token) {
        try {
          const { MicrosoftGraphClient } = await import('~/lib/microsoft/graph-client');
          const graphClient = new MicrosoftGraphClient(integration.access_token);
          await graphClient.deleteSubscription(integration.subscription_id);
        } catch (error) {
          console.warn('Could not delete subscription:', error);
        }
      }
      
      // Delete integration from database
      const { error: deleteError } = await supabase
        .from('outlook_integrations')
        .delete()
        .eq('id', integration.id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Log audit event
      await logAuditEvent(
        tenant.id,
        user.id,
        'disconnect',
        'outlook_integration',
        integration.id,
        integration,
        undefined
      );
    }
    
    return NextResponse.json({
      message: 'Outlook integration disconnected successfully',
    });
    
  } catch (error) {
    console.error('Delete Outlook integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}