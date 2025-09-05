// CFO AI Document Processing Engine
import { createClient } from '~/lib/supabase/server';
import { ublParser, type ParsedInvoice } from '~/lib/parsers/xml-parser';
import { classifyInvoice, extractFromImage, type ClassificationResult, type OCRResult } from '~/lib/openai/client';
import { logAuditEvent } from '~/lib/auth/server';
import type { Database } from '~/lib/types/database';

type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row'];
type ProcessingJobUpdate = Database['public']['Tables']['processing_jobs']['Update'];

export interface ProcessingContext {
  jobId: string;
  tenantId: string;
  fileId?: string;
  messageId?: string;
  userId?: string;
}

export interface ProcessingResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
  stage: ProcessingStage;
}

export type ProcessingStage = 
  | 'queued'
  | 'parsing'
  | 'llm_classify'
  | 'tax_compute'
  | 'ready_for_review'
  | 'completed'
  | 'failed';

export class DocumentProcessor {
  private supabase = createClient();

  async processDocument(context: ProcessingContext): Promise<ProcessingResult> {
    try {
      await this.updateJobStatus(context.jobId, 'parsing', 10, 'Starting document processing');

      // Step 1: Parse document based on file type
      const parsedInvoice = await this.parseDocument(context);
      if (!parsedInvoice) {
        throw new Error('Failed to parse document');
      }

      await this.updateJobStatus(context.jobId, 'parsing', 30, 'Document parsed successfully');

      // Step 2: Create invoice record
      const invoiceId = await this.createInvoiceRecord(context, parsedInvoice);
      await this.updateJobStatus(context.jobId, 'llm_classify', 50, 'Invoice created, starting classification');

      // Step 3: AI Classification
      const classification = await this.classifyDocument(context, parsedInvoice);
      await this.saveClassification(invoiceId, classification);
      await this.updateJobStatus(context.jobId, 'tax_compute', 70, 'Classification complete, computing taxes');

      // Step 4: Tax Calculation (placeholder for now)
      await this.computeTaxes(invoiceId, parsedInvoice, classification);
      await this.updateJobStatus(context.jobId, 'ready_for_review', 90, 'Tax computation complete');

      // Step 5: Mark as ready for review
      await this.finalizeProcessing(context.jobId, invoiceId);
      await this.updateJobStatus(context.jobId, 'completed', 100, 'Processing completed successfully');

      // Log audit event
      if (context.userId) {
        await logAuditEvent(
          context.tenantId,
          context.userId,
          'process',
          'document',
          invoiceId,
          undefined,
          { stage: 'completed', confidence: parsedInvoice.confidence }
        );
      }

      return {
        success: true,
        invoiceId,
        stage: 'completed'
      };

    } catch (error) {
      console.error('Document processing error:', error);
      await this.handleProcessingError(context.jobId, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        stage: 'failed'
      };
    }
  }

  private async parseDocument(context: ProcessingContext): Promise<ParsedInvoice | null> {
    const { data: file } = await this.supabase
      .from('files')
      .select('*')
      .eq('id', context.fileId!)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    // Download file content
    const { data: fileContent } = await this.supabase.storage
      .from('documents')
      .download(file.storage_path);

    if (!fileContent) {
      throw new Error('Failed to download file content');
    }

    // Parse based on file type
    switch (file.mime_type) {
      case 'application/xml':
      case 'text/xml':
        return await this.parseXMLFile(fileContent);
      
      case 'application/pdf':
      case 'image/jpeg':
      case 'image/png':
      case 'image/jpg':
        return await this.parseImageOrPDF(fileContent, file.mime_type);
      
      default:
        throw new Error(`Unsupported file type: ${file.mime_type}`);
    }
  }

  private async parseXMLFile(fileContent: Blob): Promise<ParsedInvoice> {
    const xmlText = await fileContent.text();
    return await ublParser.parseUBLInvoice(xmlText);
  }

  private async parseImageOrPDF(fileContent: Blob, mimeType: string): Promise<ParsedInvoice> {
    const buffer = Buffer.from(await fileContent.arrayBuffer());
    const ocrResult: OCRResult = await extractFromImage(buffer, mimeType);
    
    // Convert OCR result to ParsedInvoice format
    return {
      invoice_number: ocrResult.invoice_number,
      invoice_type: 'invoice', // OCR doesn't distinguish types
      cufe: ocrResult.cufe,
      issue_date: ocrResult.issue_date,
      due_date: ocrResult.due_date,
      supplier: ocrResult.supplier,
      buyer: ocrResult.buyer,
      totals: ocrResult.totals,
      items: ocrResult.items.map((item, index) => ({
        line_number: index + 1,
        item_code: undefined,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: undefined,
        unit_price: item.unit_price,
        line_total: item.line_total,
        tax_rate: undefined,
        tax_amount: 0,
        discount_rate: undefined,
        discount_amount: 0,
      })),
      confidence: ocrResult.confidence,
    };
  }

  private async createInvoiceRecord(context: ProcessingContext, invoice: ParsedInvoice): Promise<string> {
    const { data, error } = await this.supabase
      .from('invoices')
      .insert({
        tenant_id: context.tenantId,
        file_id: context.fileId,
        message_id: context.messageId,
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        cufe: invoice.cufe,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        supplier_nit: invoice.supplier.nit,
        supplier_name: invoice.supplier.name,
        supplier_address: invoice.supplier.address,
        supplier_city: invoice.supplier.city,
        supplier_phone: invoice.supplier.phone,
        supplier_email: invoice.supplier.email,
        buyer_nit: invoice.buyer.nit,
        buyer_name: invoice.buyer.name,
        buyer_address: invoice.buyer.address,
        buyer_city: invoice.buyer.city,
        subtotal: invoice.totals.subtotal,
        tax_amount: invoice.totals.tax_amount,
        discount_amount: invoice.totals.discount_amount,
        total_amount: invoice.totals.total_amount,
        currency_code: invoice.totals.currency_code,
        source_format: context.fileId ? 'xml' : 'ocr',
        confidence_score: invoice.confidence,
        status: 'parsed',
        needs_review: invoice.confidence < 0.85,
        created_by: context.userId,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }

    // Create line items
    if (invoice.items.length > 0) {
      const { error: itemsError } = await this.supabase
        .from('invoice_line_items')
        .insert(
          invoice.items.map(item => ({
            invoice_id: data.id,
            tenant_id: context.tenantId,
            line_number: item.line_number,
            item_code: item.item_code,
            description: item.description,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure,
            unit_price: item.unit_price,
            line_total: item.line_total,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            discount_rate: item.discount_rate,
            discount_amount: item.discount_amount,
          }))
        );

      if (itemsError) {
        console.error('Failed to create line items:', itemsError);
      }
    }

    return data.id;
  }

  private async classifyDocument(context: ProcessingContext, invoice: ParsedInvoice): Promise<ClassificationResult> {
    // Get tenant context for classification
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('name, city')
      .eq('id', context.tenantId)
      .single();

    const classificationContext = {
      tax_regime: 'Régimen Ordinario', // Default for Colombian SMEs
      default_city: tenant?.city || 'Bogotá',
    };

    return await classifyInvoice(invoice, classificationContext);
  }

  private async saveClassification(invoiceId: string, classification: ClassificationResult): Promise<void> {
    const { error } = await this.supabase
      .from('classifications')
      .insert({
        invoice_id: invoiceId,
        expense_kind: classification.expense_kind,
        is_large_taxpayer: classification.is_large_taxpayer,
        city_code: classification.city_code,
        expense_category: classification.expense_category,
        confidence_score: classification.confidence,
        rationale: classification.rationale,
        status: 'auto_classified',
      });

    if (error) {
      throw new Error(`Failed to save classification: ${error.message}`);
    }
  }

  private async computeTaxes(invoiceId: string, invoice: ParsedInvoice, classification: ClassificationResult): Promise<void> {
    const { colombianTaxCalculator } = await import('~/lib/tax/colombian-tax-rules');
    
    // Prepare input for tax calculator
    const taxInput = {
      invoice: {
        subtotal: invoice.totals.subtotal,
        supplier_nit: invoice.supplier.nit,
        supplier_name: invoice.supplier.name,
        buyer_nit: invoice.buyer.nit,
        issue_date: invoice.issue_date,
        currency_code: invoice.totals.currency_code,
      },
      classification: {
        expense_kind: classification.expense_kind,
        is_large_taxpayer: classification.is_large_taxpayer,
        city_code: classification.city_code,
        expense_category: classification.expense_category,
      },
      line_items: invoice.items.map(item => ({
        description: item.description,
        subtotal: item.line_total,
        category: classification.expense_category,
      })),
    };

    // Calculate taxes using Colombian tax engine
    const taxResult = colombianTaxCalculator.calculateTaxes(taxInput);

    // Save tax calculation results
    const { error } = await this.supabase
      .from('tax_calculations')
      .insert({
        invoice_id: invoiceId,
        iva_rate: taxResult.iva.rate,
        iva_amount: taxResult.iva.tax_amount,
        iva_base_amount: taxResult.iva.base_amount,
        reteiva_rate: taxResult.reteiva.rate,
        reteiva_amount: taxResult.reteiva.tax_amount,
        retefuente_rate: taxResult.retefuente.rate,
        retefuente_amount: taxResult.retefuente.tax_amount,
        retefuente_concept: taxResult.retefuente.concept,
        ica_rate: taxResult.ica.rate,
        ica_amount: taxResult.ica.tax_amount,
        ica_city_code: taxResult.ica.city_code,
        total_tax_amount: taxResult.total_taxes,
        total_retention_amount: taxResult.total_retentions,
        net_amount: taxResult.net_amount,
        calculation_rules: taxResult.applied_rules,
        calculation_warnings: taxResult.warnings,
        calculation_date: new Date().toISOString(),
        status: 'computed',
      });

    if (error) {
      throw new Error(`Failed to save tax calculation: ${error.message}`);
    }

    // Update invoice with calculated amounts
    await this.supabase
      .from('invoices')
      .update({
        calculated_iva: taxResult.iva.tax_amount,
        calculated_retentions: taxResult.total_retentions,
        calculated_net_amount: taxResult.net_amount,
      })
      .eq('id', invoiceId);
  }

  private async finalizeProcessing(jobId: string, invoiceId: string): Promise<void> {
    // Update invoice status
    await this.supabase
      .from('invoices')
      .update({ status: 'ready_for_review' })
      .eq('id', invoiceId);

    // Update job with final results
    await this.supabase
      .from('processing_jobs')
      .update({
        invoice_id: invoiceId,
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async updateJobStatus(
    jobId: string,
    stage: ProcessingStage,
    progress: number,
    message: string
  ): Promise<void> {
    const update: ProcessingJobUpdate = {
      status: stage === 'failed' ? 'failed' : stage === 'completed' ? 'completed' : 'processing',
      progress_data: {
        stage,
        progress,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    if (stage === 'completed' || stage === 'failed') {
      update.finished_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('processing_jobs')
      .update(update)
      .eq('id', jobId);

    if (error) {
      console.error('Failed to update job status:', error);
    }
  }

  private async handleProcessingError(jobId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Increment attempt counter
    const { data: job } = await this.supabase
      .from('processing_jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    if (job && job.attempts < job.max_attempts) {
      // Retry the job
      await this.supabase
        .from('processing_jobs')
        .update({
          attempts: job.attempts + 1,
          status: 'queued',
          progress_data: {
            stage: 'queued',
            progress: 0,
            message: `Retry ${job.attempts + 1}/${job.max_attempts} after error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', jobId);
    } else {
      // Mark as failed
      await this.supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          progress_data: {
            stage: 'failed',
            progress: 0,
            message: `Failed after ${job?.max_attempts || 3} attempts: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', jobId);
    }
  }
}

export const documentProcessor = new DocumentProcessor();