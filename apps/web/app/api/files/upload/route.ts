import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { requireAuthContext } from '~/lib/auth/server';
import { FileUploadSchema } from '~/lib/validations';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext();
    const supabase = createClient();

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const source = formData.get('source') || 'upload';
    const metadata = formData.get('metadata');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = FileUploadSchema.parse({
      source,
      metadata: metadata ? JSON.parse(metadata as string) : undefined,
    });

    const uploadResults = [];

    for (const file of files) {
      // Validate file
      if (file.size > 52428800) { // 50MB limit
        uploadResults.push({
          filename: file.name,
          error: 'File size exceeds 50MB limit'
        });
        continue;
      }

      // Generate file hash
      const buffer = await file.arrayBuffer();
      const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');

      // Check for duplicates
      const { data: existingFile } = await supabase
        .from('files')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('file_hash', hash)
        .single();

      if (existingFile) {
        uploadResults.push({
          filename: file.name,
          error: 'File already exists (duplicate detected)'
        });
        continue;
      }

      // Generate storage path
      const fileExtension = file.name.split('.').pop() || '';
      const timestamp = new Date().toISOString().split('T')[0];
      const storagePath = `tenants/${tenant.id}/uploads/${timestamp}/${crypto.randomUUID()}.${fileExtension}`;

      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(storagePath, buffer, {
            contentType: file.type,
            duplex: 'half',
          });

        if (uploadError) {
          throw uploadError;
        }

        // Save file record to database
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert({
            tenant_id: tenant.id,
            filename: `${crypto.randomUUID()}.${fileExtension}`,
            original_filename: file.name,
            storage_path: storagePath,
            mime_type: file.type,
            file_size: file.size,
            file_hash: hash,
            source: validatedData.source as any,
            status: 'stored',
            metadata: {
              ...validatedData.metadata,
              upload_timestamp: new Date().toISOString(),
              uploaded_by: user.id,
            },
          })
          .select()
          .single();

        if (dbError) {
          // Cleanup storage if database insert fails
          await supabase.storage.from('invoices').remove([storagePath]);
          throw dbError;
        }

        // Create processing job
        const { data: job, error: jobError } = await supabase
          .from('processing_jobs')
          .insert({
            tenant_id: tenant.id,
            file_id: fileRecord.id,
            job_type: 'file_parse',
            status: 'queued',
            priority: 0,
            progress_data: {
              stage: 'queued',
              progress: 0,
            },
          })
          .select()
          .single();

        if (jobError) {
          console.error('Failed to create processing job:', jobError);
          // Don't fail the upload, just log the error
        }

        uploadResults.push({
          fileId: fileRecord.id,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          jobId: job?.id,
          status: 'uploaded',
        });

      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        uploadResults.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    return NextResponse.json({
      message: 'Upload completed',
      results: uploadResults,
      successful: uploadResults.filter(r => !r.error).length,
      failed: uploadResults.filter(r => r.error).length,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}