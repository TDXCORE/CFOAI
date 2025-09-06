import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireAuthContext, logAuditEvent } from '~/lib/auth/server';
import { exportGenerator, ExportRequest } from '~/lib/exports/export-generator';
import { z } from 'zod';

const CreateExportSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  invoiceIds: z.array(z.string()).optional().default([]),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    supplier_nit: z.string().optional(),
    expense_category: z.string().optional(),
  }).optional(),
  fileName: z.string().optional(),
}).refine(data => {
  // Must have either invoiceIds or dateRange
  return data.invoiceIds.length > 0 || data.dateRange;
}, {
  message: 'Either invoiceIds or dateRange must be provided',
});

// Create new export
export async function POST(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    
    // Validate request
    const validatedData = CreateExportSchema.parse(body);
    
    // Check export limits (optional business rule)
    const { data: recentExports } = await supabase
      .from('exports')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('created_by', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour
    
    if (recentExports && recentExports.length >= 10) {
      return NextResponse.json(
        { error: 'Export limit exceeded. Please wait before creating more exports.' },
        { status: 429 }
      );
    }
    
    // Generate export
    const exportRequest: ExportRequest = {
      templateId: validatedData.templateId,
      invoiceIds: validatedData.invoiceIds,
      dateRange: validatedData.dateRange,
      filters: validatedData.filters,
      fileName: validatedData.fileName,
    };
    
    const result = await exportGenerator.generateExport(
      exportRequest,
      tenant.id,
      user.id
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export generation failed' },
        { status: 500 }
      );
    }
    
    // Log audit event
    await logAuditEvent(
      tenant.id,
      user.id,
      'create',
      'export',
      result.fileName,
      undefined,
      {
        template_id: validatedData.templateId,
        record_count: result.recordCount,
        file_size: result.fileSize,
      }
    );
    
    return NextResponse.json({
      data: result,
      message: 'Export generated successfully',
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Create export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get export history
export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const status = searchParams.get('status');
    
    let query = supabase
      .from('exports')
      .select(`
        id,
        template_id,
        file_name,
        record_count,
        file_size,
        status,
        generated_at,
        created_by,
        profiles!created_by (
          display_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: exports, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      data: exports || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    
  } catch (error) {
    console.error('Get exports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}