import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/clients/server-client';
import { requireAuthContext, logAuditEvent } from '~/lib/auth/server';

interface ApproveInvoiceParams {
  params: {
    invoiceId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: ApproveInvoiceParams
) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    
    const { notes } = body;
    
    // Verify invoice exists and belongs to tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        status,
        invoice_number,
        supplier_name,
        total_amount,
        needs_review
      `)
      .eq('id', params.invoiceId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Check if invoice can be approved
    if (!['ready_for_review', 'under_review'].includes(invoice.status)) {
      return NextResponse.json(
        { error: 'Invoice cannot be approved in current status' },
        { status: 400 }
      );
    }
    
    // Update invoice status to approved
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'approved',
        needs_review: false,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        reviewer_notes: notes,
        assigned_to: null, // Clear assignment
      })
      .eq('id', params.invoiceId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Update tax calculation status if exists
    await supabase
      .from('tax_calculations')
      .update({ status: 'approved' })
      .eq('invoice_id', params.invoiceId);
    
    // Update classification status if exists
    await supabase
      .from('classifications')
      .update({ status: 'approved' })
      .eq('invoice_id', params.invoiceId);
    
    // Log audit event
    await logAuditEvent(
      tenant.id,
      user.id,
      'approve',
      'invoice',
      params.invoiceId,
      { 
        previous_status: invoice.status,
        reviewer_notes: notes,
      },
      {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      }
    );
    
    // Create approval record
    await supabase
      .from('invoice_approvals')
      .insert({
        invoice_id: params.invoiceId,
        tenant_id: tenant.id,
        approved_by: user.id,
        approval_type: 'final_approval',
        status: 'approved',
        notes: notes || '',
        approved_at: new Date().toISOString(),
      });
    
    return NextResponse.json({
      message: 'Invoice approved successfully',
      invoice: {
        id: params.invoiceId,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Approve invoice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}