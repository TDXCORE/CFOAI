import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAuthContext } from '~/lib/auth/server';
import { documentProcessor } from '~/lib/processors/document-processor';

interface ProcessJobParams {
  params: {
    jobId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: ProcessJobParams
) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    // Verify job exists and belongs to tenant
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', params.jobId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (error || !job) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      );
    }
    
    // Check if job is in a processable state
    if (!['queued', 'failed'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job is not in a processable state' },
        { status: 400 }
      );
    }
    
    // Create processing context
    const context = {
      jobId: params.jobId,
      tenantId: tenant.id,
      fileId: job.file_id || undefined,
      messageId: job.message_id || undefined,
      userId: user.id,
    };
    
    // Start processing (this will run asynchronously)
    // In a production environment, this would be handled by a background job queue
    documentProcessor.processDocument(context).catch(error => {
      console.error('Background processing error:', error);
    });
    
    // Return immediately with processing started status
    return NextResponse.json({
      message: 'Document processing started',
      jobId: params.jobId,
      status: 'processing',
    });
    
  } catch (error) {
    console.error('Process job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}