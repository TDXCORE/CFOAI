// Export File Generator for Accounting Systems
import { 
  ExportTemplate, 
  ExportTemplateProcessor, 
  AccountMapping,
  EXPORT_TEMPLATES,
  DEFAULT_ACCOUNT_MAPPINGS
} from './export-templates';
import { getSupabaseServerClient } from '@kit/supabase/clients/server-client';

export interface ExportRequest {
  templateId: string;
  invoiceIds: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: {
    status?: string[];
    supplier_nit?: string;
    expense_category?: string;
  };
  customMappings?: AccountMapping[];
  fileName?: string;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  filePath: string;
  downloadUrl: string;
  recordCount: number;
  fileSize: number;
  generatedAt: string;
  error?: string;
}

export class ExportGenerator {
  private supabase = getSupabaseServerClient();

  /**
   * Generate export file
   */
  async generateExport(
    request: ExportRequest, 
    tenantId: string, 
    userId: string
  ): Promise<ExportResult> {
    try {
      // Get template
      const template = EXPORT_TEMPLATES[request.templateId as keyof typeof EXPORT_TEMPLATES];
      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`);
      }

      // Get invoices data
      const invoices = await this.fetchInvoicesData(request, tenantId);
      if (invoices.length === 0) {
        throw new Error('No invoices found for export');
      }

      // Get account mappings
      const mappings = request.customMappings || DEFAULT_ACCOUNT_MAPPINGS;

      // Process invoices through template
      const processedData = ExportTemplateProcessor.processInvoices(
        invoices,
        template,
        mappings
      );

      // Generate file content
      const fileContent = await this.generateFileContent(processedData, template);

      // Save file to storage
      const fileName = request.fileName || this.generateFileName(template);
      const filePath = await this.saveFile(fileName, fileContent, template.format, tenantId);

      // Create export record
      const exportRecord = await this.createExportRecord(
        tenantId,
        userId,
        request,
        fileName,
        filePath,
        invoices.length,
        fileContent.length
      );

      return {
        success: true,
        fileName,
        filePath,
        downloadUrl: `/api/exports/${exportRecord.id}/download`,
        recordCount: invoices.length,
        fileSize: fileContent.length,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Export generation error:', error);
      return {
        success: false,
        fileName: '',
        filePath: '',
        downloadUrl: '',
        recordCount: 0,
        fileSize: 0,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  /**
   * Fetch invoices data for export
   */
  private async fetchInvoicesData(request: ExportRequest, tenantId: string) {
    let query = this.supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_type,
        issue_date,
        due_date,
        supplier_nit,
        supplier_name,
        buyer_nit,
        buyer_name,
        subtotal,
        tax_amount,
        total_amount,
        currency_code,
        classifications (
          expense_kind,
          expense_category,
          is_large_taxpayer
        ),
        tax_calculations (
          iva_amount,
          reteiva_amount,
          retefuente_amount,
          ica_amount,
          net_amount
        ),
        invoice_line_items (
          description,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'approved'); // Only export approved invoices

    // Apply filters
    if (request.invoiceIds.length > 0) {
      query = query.in('id', request.invoiceIds);
    }

    if (request.dateRange) {
      query = query
        .gte('issue_date', request.dateRange.from)
        .lte('issue_date', request.dateRange.to);
    }

    if (request.filters?.status) {
      query = query.in('status', request.filters.status);
    }

    if (request.filters?.supplier_nit) {
      query = query.eq('supplier_nit', request.filters.supplier_nit);
    }

    const { data, error } = await query.order('issue_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate file content based on template format
   */
  private async generateFileContent(data: any[], template: ExportTemplate): Promise<string> {
    switch (template.format) {
      case 'csv':
        return this.generateCSV(data, template);
      case 'json':
        return this.generateJSON(data, template);
      case 'xml':
        return this.generateXML(data, template);
      case 'txt':
        return this.generateTXT(data, template);
      default:
        throw new Error(`Unsupported format: ${template.format}`);
    }
  }

  /**
   * Generate CSV content
   */
  private generateCSV(data: any[], template: ExportTemplate): string {
    const settings = template.settings;
    const delimiter = settings.delimiter || ',';
    const quoteChar = settings.quote_char || '"';
    
    const lines: string[] = [];

    // Add header if required
    if (settings.include_header) {
      const headers = template.fields.map(field => 
        `${quoteChar}${field.label}${quoteChar}`
      );
      lines.push(headers.join(delimiter));
    }

    // Add data rows
    for (const row of data) {
      const values = template.fields.map(field => {
        const value = row[field.key] || '';
        return `${quoteChar}${String(value).replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar)}${quoteChar}`;
      });
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON content
   */
  private generateJSON(data: any[], template: ExportTemplate): string {
    if (template.system === 'world_office') {
      // World Office expects a specific structure
      return JSON.stringify({
        comprobantes: data.map(item => ({
          documento: item.documento,
          numero: item.numero,
          fecha: item.fecha,
          tercero: item.tercero,
          detalle: item.detalle,
          movimientos: item.movimientos,
        })),
      }, null, 2);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate XML content
   */
  private generateXML(data: any[], template: ExportTemplate): string {
    if (template.system === 'sap') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<Invoices>\n';
      
      for (const item of data) {
        xml += '  <Invoice>\n';
        for (const field of template.fields) {
          const value = item[field.key] || '';
          xml += `    <${field.key}>${this.escapeXML(String(value))}</${field.key}>\n`;
        }
        xml += '  </Invoice>\n';
      }
      
      xml += '</Invoices>';
      return xml;
    }

    // Generic XML format
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Data>\n';
    for (const item of data) {
      xml += '  <Record>\n';
      for (const [key, value] of Object.entries(item)) {
        xml += `    <${key}>${this.escapeXML(String(value || ''))}</${key}>\n`;
      }
      xml += '  </Record>\n';
    }
    xml += '</Data>';
    return xml;
  }

  /**
   * Generate TXT content (fixed width or delimited)
   */
  private generateTXT(data: any[], template: ExportTemplate): string {
    const lines: string[] = [];
    
    for (const row of data) {
      const values = template.fields.map(field => String(row[field.key] || ''));
      lines.push(values.join('\t')); // Tab-delimited
    }
    
    return lines.join('\n');
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate filename with timestamp
   */
  private generateFileName(template: ExportTemplate): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .substring(0, 19);
    
    return `${template.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${template.format}`;
  }

  /**
   * Save file to Supabase storage
   */
  private async saveFile(
    fileName: string,
    content: string,
    format: string,
    tenantId: string
  ): Promise<string> {
    const filePath = `${tenantId}/exports/${fileName}`;
    
    const contentTypes = {
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      txt: 'text/plain',
    };

    const { error } = await this.supabase.storage
      .from('documents')
      .upload(filePath, content, {
        contentType: contentTypes[format as keyof typeof contentTypes] || 'text/plain',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to save export file: ${error.message}`);
    }

    return filePath;
  }

  /**
   * Create export record in database
   */
  private async createExportRecord(
    tenantId: string,
    userId: string,
    request: ExportRequest,
    fileName: string,
    filePath: string,
    recordCount: number,
    fileSize: number
  ) {
    const { data, error } = await this.supabase
      .from('exports')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        template_id: request.templateId,
        file_name: fileName,
        file_path: filePath,
        record_count: recordCount,
        file_size: fileSize,
        status: 'completed',
        export_filters: request.filters || {},
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create export record: ${error.message}`);
    }

    return data;
  }

  /**
   * Get available export templates
   */
  static getAvailableTemplates(): ExportTemplate[] {
    return Object.values(EXPORT_TEMPLATES);
  }

  /**
   * Get template by ID
   */
  static getTemplate(templateId: string): ExportTemplate | undefined {
    return EXPORT_TEMPLATES[templateId as keyof typeof EXPORT_TEMPLATES];
  }
}

export const exportGenerator = new ExportGenerator();