import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAuthContext } from '~/lib/auth/server';
import { FileFilterSchema } from '~/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Convert string parameters to appropriate types
    if (params.page) params.page = parseInt(params.page);
    if (params.limit) params.limit = parseInt(params.limit);
    
    // Validate filters
    const filters = FileFilterSchema.parse(params);
    
    // Build query
    let query = supabase
      .from('files')
      .select(`
        *,
        processing_jobs (
          id,
          status,
          progress_data
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
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.source) {
      query = query.eq('source', filters.source);
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
    
    const { data: files, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      data: files || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
    
  } catch (error) {
    console.error('Files API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' }, 
        { status: 400 }
      );
    }
    
    // Get file record
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' }, 
        { status: 404 }
      );
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('invoices')
      .remove([file.storage_path]);
    
    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }
    
    // Delete from database (this will cascade to related records)
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('tenant_id', tenant.id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return NextResponse.json({
      message: 'File deleted successfully',
    });
    
  } catch (error) {
    console.error('File deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}