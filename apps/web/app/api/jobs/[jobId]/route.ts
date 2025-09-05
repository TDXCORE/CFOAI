import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { requireAuthContext } from '~/lib/auth/server';

interface JobParams {
  params: {
    jobId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: JobParams
) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = createClient();
    
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select(`
        *,
        files (
          id,
          filename,
          original_filename,
          mime_type,
          file_size
        ),
        mail_messages (
          id,
          subject,
          sender_email,
          received_at
        ),
        invoices (
          id,
          invoice_number,
          supplier_name,
          total_amount,
          status,
          needs_review,
          confidence_score
        )
      `)
      .eq('id', params.jobId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (error || !job) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: job,
    });
    
  } catch (error) {
    console.error('Get job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: JobParams
) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = createClient();
    
    // Check if job can be deleted (only queued or failed jobs)
    const { data: job, error: getError } = await supabase
      .from('processing_jobs')
      .select('status')
      .eq('id', params.jobId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (getError || !job) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      );
    }
    
    if (!['queued', 'failed', 'completed'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Cannot delete job in current status' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('processing_jobs')
      .delete()
      .eq('id', params.jobId)
      .eq('tenant_id', tenant.id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      message: 'Processing job deleted successfully',
    });
    
  } catch (error) {
    console.error('Delete job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: JobParams
) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = createClient();
    const body = await request.json();
    
    const { action } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    // Verify job exists and belongs to tenant
    const { data: job, error: getError } = await supabase
      .from('processing_jobs')
      .select('status')
      .eq('id', params.jobId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (getError || !job) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      );
    }
    
    switch (action) {
      case 'cancel':
        if (!['queued', 'processing'].includes(job.status)) {
          return NextResponse.json(
            { error: 'Cannot cancel job in current status' },
            { status: 400 }
          );
        }
        
        await supabase
          .from('processing_jobs')
          .update({
            status: 'cancelled',
            finished_at: new Date().toISOString(),
            progress_data: {
              stage: 'cancelled',
              progress: 0,
              message: `Cancelled by user ${user.id}`,
              timestamp: new Date().toISOString(),
            },
          })
          .eq('id', params.jobId);
        
        return NextResponse.json({
          message: 'Job cancelled successfully',
        });
      
      case 'retry':
        if (job.status !== 'failed') {
          return NextResponse.json(
            { error: 'Only failed jobs can be retried' },
            { status: 400 }
          );
        }
        
        await supabase
          .from('processing_jobs')
          .update({
            status: 'queued',
            attempts: 0,
            finished_at: null,
            progress_data: {
              stage: 'queued',
              progress: 0,
              message: 'Job queued for retry',
              timestamp: new Date().toISOString(),
            },
          })
          .eq('id', params.jobId);
        
        return NextResponse.json({
          message: 'Job queued for retry',
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Update job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}