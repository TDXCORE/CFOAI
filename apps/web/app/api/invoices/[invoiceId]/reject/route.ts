import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/clients/server-client';
import { requireAuthContext, logAuditEvent } from '~/lib/auth/server';

interface RejectInvoiceParams {
  params: {
    invoiceId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RejectInvoiceParams
) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    
    const { reason, notes, requiresManualReview = true } = body;
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }
    
    // Verify invoice exists and belongs to tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        status,
        invoice_number,
        supplier_name,
        total_amount
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
    
    // Check if invoice can be rejected
    if (!['ready_for_review', 'under_review', 'classified'].includes(invoice.status)) {
      return NextResponse.json(
        { error: 'Invoice cannot be rejected in current status' },
        { status: 400 }
      );
    }
    
    // Update invoice status to rejected
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'rejected',
        needs_review: requiresManualReview,
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason,
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
      .update({ status: 'rejected' })
      .eq('invoice_id', params.invoiceId);
    
    // Update classification status if exists
    await supabase
      .from('classifications')
      .update({ status: 'rejected' })
      .eq('invoice_id', params.invoiceId);
    
    // Log audit event
    await logAuditEvent(
      tenant.id,
      user.id,
      'reject',
      'invoice',
      params.invoiceId,
      { 
        previous_status: invoice.status,
        rejection_reason: reason,
        reviewer_notes: notes,
      },
      {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason,
      }
    );
    
    // Create rejection record
    await supabase
      .from('invoice_approvals')
      .insert({
        invoice_id: params.invoiceId,
        tenant_id: tenant.id,
        approved_by: user.id,
        approval_type: 'review_rejection',
        status: 'rejected',
        notes: `${reason}${notes ? ` - ${notes}` : ''}`,
        approved_at: new Date().toISOString(),
      });
    
    // If requires manual review, create a processing job for re-processing
    if (requiresManualReview) {
      const { data: file } = await supabase
        .from('invoices')
        .select('file_id')
        .eq('id', params.invoiceId)
        .single();
      
      if (file?.file_id) {
        await supabase
          .from('processing_jobs')
          .insert({
            tenant_id: tenant.id,
            file_id: file.file_id,
            job_type: 'manual_review',
            status: 'queued',
            priority: 1, // Higher priority for manual review
            attempts: 0,
            max_attempts: 1,
            progress_data: {
              stage: 'queued',
              progress: 0,
              message: `Manual review required after rejection: ${reason}`,
              created_by: user.id,
              timestamp: new Date().toISOString(),
            },
          });
      }
    }
    
    return NextResponse.json({
      message: 'Invoice rejected successfully',
      invoice: {
        id: params.invoiceId,
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        requires_manual_review: requiresManualReview,
      },
    });
    
  } catch (error) {
    console.error('Reject invoice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}