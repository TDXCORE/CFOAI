import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAuthContext, logAuditEvent } from '~/lib/auth/server';
import { InvoiceFilterSchema, CreateInvoiceSchema } from '~/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Convert string parameters to appropriate types
    if (params.page) params.page = parseInt(params.page);
    if (params.limit) params.limit = parseInt(params.limit);
    if (params.needsReview) params.needsReview = params.needsReview === 'true';
    if (params.status) params.status = params.status.split(',');
    
    // Validate filters
    const filters = InvoiceFilterSchema.parse(params);
    
    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        files (
          id,
          filename,
          original_filename,
          storage_path
        ),
        processing_jobs (
          id,
          status,
          progress_data
        ),
        classifications (
          id,
          expense_kind,
          is_large_taxpayer,
          city_code,
          expense_category,
          confidence_score
        ),
        tax_calculations (
          id,
          iva_amount,
          reteiva_amount,
          retefuente_amount,
          ica_amount
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenant.id);
    
    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.needsReview !== undefined) {
      query = query.eq('needs_review', filters.needsReview);
    }
    
    if (filters.supplierNit) {
      query = query.eq('supplier_nit', filters.supplierNit);
    }
    
    if (filters.dateFrom) {
      query = query.gte('issue_date', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('issue_date', filters.dateTo);
    }
    
    // Apply sorting
    const sortColumn = filters.sortBy === 'issueDate' ? 'issue_date' :
                      filters.sortBy === 'totalAmount' ? 'total_amount' :
                      filters.sortBy === 'supplierName' ? 'supplier_name' :
                      'created_at';
    
    query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });
    
    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
    
    const { data: invoices, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      data: invoices || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
    
  } catch (error) {
    console.error('Invoices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const body = await request.json();
    
    // Validate input
    const validatedData = CreateInvoiceSchema.parse(body);
    
    // Verify file belongs to tenant
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('id')
      .eq('id', validatedData.file_id)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' }, 
        { status: 404 }
      );
    }
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenant.id,
        file_id: validatedData.file_id,
        invoice_number: validatedData.invoice_number,
        invoice_type: validatedData.invoice_type,
        cufe: validatedData.cufe,
        issue_date: validatedData.issue_date,
        due_date: validatedData.due_date,
        supplier_nit: validatedData.supplier_nit,
        supplier_name: validatedData.supplier_name,
        supplier_address: validatedData.supplier_address,
        supplier_city: validatedData.supplier_city,
        supplier_phone: validatedData.supplier_phone,
        supplier_email: validatedData.supplier_email,
        buyer_nit: validatedData.buyer_nit,
        buyer_name: validatedData.buyer_name,
        buyer_address: validatedData.buyer_address,
        buyer_city: validatedData.buyer_city,
        subtotal: validatedData.subtotal,
        tax_amount: validatedData.tax_amount,
        discount_amount: validatedData.discount_amount,
        total_amount: validatedData.total_amount,
        currency_code: validatedData.currency_code,
        source_format: validatedData.source_format,
        confidence_score: validatedData.confidence_score,
        status: 'parsed',
        created_by: user.id,
      })
      .select()
      .single();
    
    if (invoiceError) {
      throw invoiceError;
    }
    
    // Log audit event
    await logAuditEvent(
      tenant.id,
      user.id,
      'create',
      'invoice',
      invoice.id,
      undefined,
      invoice
    );
    
    return NextResponse.json({
      data: invoice,
      message: 'Invoice created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create invoice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}