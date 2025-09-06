import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/clients/server-client';
import { requireAuthContext } from '~/lib/auth/server';

interface DownloadParams {
  params: {
    exportId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: DownloadParams
) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .select('id, file_name, file_path, status, template_id')
      .eq('id', params.exportId)
      .eq('tenant_id', tenant.id)
      .single();
    
    if (exportError || !exportRecord) {
      return NextResponse.json(
        { error: 'Export not found' },
        { status: 404 }
      );
    }
    
    if (exportRecord.status !== 'completed') {
      return NextResponse.json(
        { error: 'Export not completed' },
        { status: 400 }
      );
    }
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(exportRecord.file_path);
    
    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Determine content type
    const contentTypes = {
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      txt: 'text/plain',
    };
    
    const extension = exportRecord.file_name.split('.').pop()?.toLowerCase();
    const contentType = contentTypes[extension as keyof typeof contentTypes] || 'application/octet-stream';
    
    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${exportRecord.file_name}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
    
  } catch (error) {
    console.error('Download export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}