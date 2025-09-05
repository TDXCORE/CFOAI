import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { requireAuthContext } from '~/lib/auth/server';
import { ProcessingJobFilterSchema } from '~/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = createClient();
    
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Convert string parameters to appropriate types
    if (params.page) params.page = parseInt(params.page);
    if (params.limit) params.limit = parseInt(params.limit);
    if (params.status) params.status = params.status.split(',');
    if (params.jobType) params.jobType = params.jobType.split(',');
    
    // Validate filters
    const filters = ProcessingJobFilterSchema.parse(params);
    
    // Build query
    let query = supabase
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
          status
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.jobType && filters.jobType.length > 0) {
      query = query.in('job_type', filters.jobType);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
    }
    
    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
    
    const { data: jobs, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      data: jobs || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
    
  } catch (error) {
    console.error('Processing jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = createClient();
    
    const body = await request.json();
    const { fileId, messageId, jobType, priority = 0 } = body;
    
    if (!fileId && !messageId) {
      return NextResponse.json(
        { error: 'Either fileId or messageId is required' }, 
        { status: 400 }
      );
    }
    
    if (!jobType) {
      return NextResponse.json(
        { error: 'Job type is required' }, 
        { status: 400 }
      );
    }
    
    // Validate that file/message belongs to tenant
    if (fileId) {
      const { data: file, error: fileError } = await supabase
        .from('files')
        .select('id')
        .eq('id', fileId)
        .eq('tenant_id', tenant.id)
        .single();
      
      if (fileError || !file) {
        return NextResponse.json(
          { error: 'File not found' }, 
          { status: 404 }
        );
      }
    }
    
    if (messageId) {
      const { data: message, error: messageError } = await supabase
        .from('mail_messages')
        .select('id')
        .eq('id', messageId)
        .eq('tenant_id', tenant.id)
        .single();
      
      if (messageError || !message) {
        return NextResponse.json(
          { error: 'Message not found' }, 
          { status: 404 }
        );
      }
    }
    
    // Create processing job
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        tenant_id: tenant.id,
        file_id: fileId || null,
        message_id: messageId || null,
        job_type: jobType,
        status: 'queued',
        priority: priority,
        attempts: 0,
        max_attempts: 3,
        progress_data: {
          stage: 'queued',
          progress: 0,
          created_by: user.id,
        },
      })
      .select()
      .single();
    
    if (jobError) {
      throw jobError;
    }
    
    return NextResponse.json({
      data: job,
      message: 'Processing job created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create processing job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}