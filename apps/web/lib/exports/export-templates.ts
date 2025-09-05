// Export Templates for Colombian Accounting Systems
import { Database } from '~/lib/types/database';

type InvoiceData = {
  id: string;
  invoice_number: string;
  invoice_type: 'invoice' | 'credit_note' | 'debit_note';
  issue_date: string;
  due_date?: string;
  supplier_nit: string;
  supplier_name: string;
  buyer_nit: string;
  buyer_name: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  classifications?: {
    expense_kind: string;
    expense_category: string;
    is_large_taxpayer: boolean | null;
  };
  tax_calculations?: {
    iva_amount: number;
    reteiva_amount: number;
    retefuente_amount: number;
    ica_amount: number;
    net_amount: number;
  };
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  system: 'siigo' | 'world_office' | 'sap' | 'generic';
  format: 'csv' | 'json' | 'xml' | 'txt';
  fields: ExportField[];
  settings: ExportSettings;
}

export interface ExportField {
  key: string;
  label: string;
  source_path: string;
  data_type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  format?: string;
  default_value?: string;
  transformation?: string;
}

export interface ExportSettings {
  delimiter?: string;
  quote_char?: string;
  date_format: string;
  number_format: {
    decimal_places: number;
    decimal_separator: string;
    thousands_separator: string;
  };
  encoding: string;
  include_header: boolean;
  custom_mappings?: Record<string, string>;
}

export interface AccountMapping {
  id: string;
  name: string;
  expense_category: string;
  debit_account: string;
  credit_account: string;
  tax_account_iva?: string;
  tax_account_reteiva?: string;
  tax_account_retefuente?: string;
  tax_account_ica?: string;
  cost_center?: string;
  description?: string;
}

/**
 * Siigo CSV Export Template
 */
export const SIIGO_CSV_TEMPLATE: ExportTemplate = {
  id: 'siigo_csv',
  name: 'Siigo CSV',
  description: 'Plantilla estándar para importación en Siigo',
  system: 'siigo',
  format: 'csv',
  fields: [
    {
      key: 'tipo_comprobante',
      label: 'Tipo Comprobante',
      source_path: 'invoice_type',
      data_type: 'string',
      required: true,
      transformation: 'siigo_document_type',
      default_value: 'FV',
    },
    {
      key: 'numero_factura',
      label: 'Número Factura',
      source_path: 'invoice_number',
      data_type: 'string',
      required: true,
    },
    {
      key: 'fecha',
      label: 'Fecha',
      source_path: 'issue_date',
      data_type: 'date',
      required: true,
      format: 'DD/MM/YYYY',
    },
    {
      key: 'nit_proveedor',
      label: 'NIT Proveedor',
      source_path: 'supplier_nit',
      data_type: 'string',
      required: true,
    },
    {
      key: 'razon_social',
      label: 'Razón Social',
      source_path: 'supplier_name',
      data_type: 'string',
      required: true,
    },
    {
      key: 'cuenta_debito',
      label: 'Cuenta Débito',
      source_path: 'mapping.debit_account',
      data_type: 'string',
      required: true,
      default_value: '5105', // Gastos operacionales
    },
    {
      key: 'cuenta_credito',
      label: 'Cuenta Crédito',
      source_path: 'mapping.credit_account',
      data_type: 'string',
      required: true,
      default_value: '2205', // Proveedores
    },
    {
      key: 'valor_base',
      label: 'Valor Base',
      source_path: 'subtotal',
      data_type: 'number',
      required: true,
    },
    {
      key: 'valor_iva',
      label: 'Valor IVA',
      source_path: 'tax_calculations.iva_amount',
      data_type: 'number',
      required: false,
    },
    {
      key: 'valor_retefuente',
      label: 'Valor ReteFuente',
      source_path: 'tax_calculations.retefuente_amount',
      data_type: 'number',
      required: false,
    },
    {
      key: 'valor_reteiva',
      label: 'Valor ReteIVA',
      source_path: 'tax_calculations.reteiva_amount',
      data_type: 'number',
      required: false,
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      source_path: 'tax_calculations.net_amount',
      data_type: 'number',
      required: true,
    },
    {
      key: 'centro_costo',
      label: 'Centro de Costo',
      source_path: 'mapping.cost_center',
      data_type: 'string',
      required: false,
      default_value: '001',
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      source_path: 'line_items[0].description',
      data_type: 'string',
      required: false,
    },
  ],
  settings: {
    delimiter: ';',
    quote_char: '"',
    date_format: 'DD/MM/YYYY',
    number_format: {
      decimal_places: 2,
      decimal_separator: ',',
      thousands_separator: '.',
    },
    encoding: 'UTF-8',
    include_header: true,
  },
};

/**
 * World Office JSON Export Template
 */
export const WORLD_OFFICE_JSON_TEMPLATE: ExportTemplate = {
  id: 'world_office_json',
  name: 'World Office JSON',
  description: 'Formato JSON para World Office',
  system: 'world_office',
  format: 'json',
  fields: [
    {
      key: 'documento',
      label: 'Tipo Documento',
      source_path: 'invoice_type',
      data_type: 'string',
      required: true,
      transformation: 'world_office_doc_type',
    },
    {
      key: 'numero',
      label: 'Número',
      source_path: 'invoice_number',
      data_type: 'string',
      required: true,
    },
    {
      key: 'fecha',
      label: 'Fecha',
      source_path: 'issue_date',
      data_type: 'date',
      required: true,
      format: 'YYYY-MM-DD',
    },
    {
      key: 'tercero',
      label: 'Tercero',
      source_path: 'supplier_nit',
      data_type: 'string',
      required: true,
    },
    {
      key: 'detalle',
      label: 'Detalle',
      source_path: 'supplier_name',
      data_type: 'string',
      required: true,
    },
    {
      key: 'movimientos',
      label: 'Movimientos',
      source_path: 'movements',
      data_type: 'string',
      required: true,
      transformation: 'world_office_movements',
    },
  ],
  settings: {
    date_format: 'YYYY-MM-DD',
    number_format: {
      decimal_places: 2,
      decimal_separator: '.',
      thousands_separator: '',
    },
    encoding: 'UTF-8',
    include_header: false,
  },
};

/**
 * SAP Integration Template
 */
export const SAP_XML_TEMPLATE: ExportTemplate = {
  id: 'sap_xml',
  name: 'SAP XML',
  description: 'Formato XML para integración SAP',
  system: 'sap',
  format: 'xml',
  fields: [
    {
      key: 'BUKRS',
      label: 'Company Code',
      source_path: 'company_code',
      data_type: 'string',
      required: true,
      default_value: '1000',
    },
    {
      key: 'BLART',
      label: 'Document Type',
      source_path: 'invoice_type',
      data_type: 'string',
      required: true,
      transformation: 'sap_document_type',
    },
    {
      key: 'BLDAT',
      label: 'Document Date',
      source_path: 'issue_date',
      data_type: 'date',
      required: true,
      format: 'YYYYMMDD',
    },
    {
      key: 'BUDAT',
      label: 'Posting Date',
      source_path: 'issue_date',
      data_type: 'date',
      required: true,
      format: 'YYYYMMDD',
    },
    {
      key: 'XBLNR',
      label: 'Reference',
      source_path: 'invoice_number',
      data_type: 'string',
      required: true,
    },
    {
      key: 'LIFNR',
      label: 'Vendor',
      source_path: 'supplier_nit',
      data_type: 'string',
      required: true,
    },
    {
      key: 'WRBTR',
      label: 'Amount',
      source_path: 'tax_calculations.net_amount',
      data_type: 'number',
      required: true,
    },
    {
      key: 'WAERS',
      label: 'Currency',
      source_path: 'currency_code',
      data_type: 'string',
      required: true,
    },
  ],
  settings: {
    date_format: 'YYYYMMDD',
    number_format: {
      decimal_places: 2,
      decimal_separator: '.',
      thousands_separator: '',
    },
    encoding: 'UTF-8',
    include_header: false,
  },
};

/**
 * Default Account Mappings for Colombian Companies
 */
export const DEFAULT_ACCOUNT_MAPPINGS: AccountMapping[] = [
  {
    id: 'office_supplies',
    name: 'Útiles de Oficina',
    expense_category: 'office_supplies',
    debit_account: '5105001', // Gastos de administración - Útiles
    credit_account: '2205001', // Proveedores nacionales
    tax_account_iva: '2408001', // IVA por pagar
    tax_account_retefuente: '1355001', // ReteFuente por cobrar
    cost_center: '001',
    description: 'Compra de útiles y suministros de oficina',
  },
  {
    id: 'services',
    name: 'Servicios Profesionales',
    expense_category: 'professional_services',
    debit_account: '5110001', // Honorarios
    credit_account: '2205001', // Proveedores nacionales
    tax_account_retefuente: '1355001', // ReteFuente por cobrar
    cost_center: '001',
    description: 'Servicios profesionales y consultorías',
  },
  {
    id: 'maintenance',
    name: 'Mantenimiento',
    expense_category: 'maintenance',
    debit_account: '5135001', // Mantenimiento y reparaciones
    credit_account: '2205001', // Proveedores nacionales
    tax_account_iva: '2408001', // IVA por pagar
    tax_account_retefuente: '1355001', // ReteFuente por cobrar
    cost_center: '002',
    description: 'Gastos de mantenimiento y reparaciones',
  },
  {
    id: 'utilities',
    name: 'Servicios Públicos',
    expense_category: 'utilities',
    debit_account: '5140001', // Servicios públicos
    credit_account: '2205001', // Proveedores nacionales
    tax_account_iva: '2408001', // IVA por pagar
    cost_center: '001',
    description: 'Servicios públicos domiciliarios',
  },
  {
    id: 'inventory',
    name: 'Inventario',
    expense_category: 'inventory',
    debit_account: '1435001', // Mercancías no fabricadas por la empresa
    credit_account: '2205001', // Proveedores nacionales
    tax_account_iva: '2408001', // IVA por pagar
    tax_account_retefuente: '1355001', // ReteFuente por cobrar
    cost_center: '003',
    description: 'Compra de mercancía para reventa',
  },
];

export class ExportTemplateProcessor {
  /**
   * Process invoices using a specific template
   */
  static processInvoices(
    invoices: InvoiceData[],
    template: ExportTemplate,
    accountMappings: AccountMapping[]
  ): any[] {
    return invoices.map(invoice => 
      this.processInvoice(invoice, template, accountMappings)
    );
  }

  /**
   * Process a single invoice using a template
   */
  static processInvoice(
    invoice: InvoiceData,
    template: ExportTemplate,
    accountMappings: AccountMapping[]
  ): any {
    const result: any = {};
    const mapping = this.findAccountMapping(invoice, accountMappings);

    for (const field of template.fields) {
      let value = this.extractValue(invoice, field.source_path, mapping);
      
      // Apply transformations
      if (field.transformation) {
        value = this.applyTransformation(value, field.transformation, invoice);
      }
      
      // Apply formatting
      if (value !== null && value !== undefined) {
        value = this.formatValue(value, field, template.settings);
      }
      
      // Use default value if needed
      if ((value === null || value === undefined) && field.default_value) {
        value = field.default_value;
      }
      
      result[field.key] = value;
    }

    return result;
  }

  /**
   * Find appropriate account mapping for invoice
   */
  static findAccountMapping(
    invoice: InvoiceData,
    mappings: AccountMapping[]
  ): AccountMapping | undefined {
    const category = invoice.classifications?.expense_category;
    return mappings.find(mapping => mapping.expense_category === category) ||
           mappings[0]; // Default to first mapping
  }

  /**
   * Extract value from invoice using dot notation path
   */
  static extractValue(invoice: any, path: string, mapping?: AccountMapping): any {
    // Handle special mapping paths
    if (path.startsWith('mapping.') && mapping) {
      const mappingKey = path.replace('mapping.', '');
      return (mapping as any)[mappingKey];
    }

    // Handle array access like line_items[0].description
    if (path.includes('[') && path.includes(']')) {
      const parts = path.split(/[\[\]\.]/);
      let value = invoice;
      
      for (const part of parts) {
        if (part === '') continue;
        if (!isNaN(Number(part))) {
          value = value[Number(part)];
        } else {
          value = value?.[part];
        }
        if (value === undefined) break;
      }
      
      return value;
    }

    // Standard dot notation
    return path.split('.').reduce((obj, key) => obj?.[key], invoice);
  }

  /**
   * Apply transformation to value
   */
  static applyTransformation(value: any, transformation: string, invoice: InvoiceData): any {
    switch (transformation) {
      case 'siigo_document_type':
        return value === 'credit_note' ? 'NC' : value === 'debit_note' ? 'ND' : 'FV';
        
      case 'world_office_doc_type':
        return value === 'credit_note' ? 'NC' : value === 'debit_note' ? 'ND' : 'FP';
        
      case 'sap_document_type':
        return value === 'credit_note' ? 'KG' : value === 'debit_note' ? 'KR' : 'RE';
        
      case 'world_office_movements':
        return this.generateWorldOfficeMovements(invoice);
        
      default:
        return value;
    }
  }

  /**
   * Format value according to field and settings
   */
  static formatValue(value: any, field: ExportField, settings: ExportSettings): any {
    switch (field.data_type) {
      case 'date':
        return this.formatDate(value, field.format || settings.date_format);
        
      case 'number':
        return this.formatNumber(value, settings.number_format);
        
      case 'string':
        return String(value);
        
      case 'boolean':
        return Boolean(value);
        
      default:
        return value;
    }
  }

  /**
   * Format date value
   */
  static formatDate(date: string | Date, format: string): string {
    const d = new Date(date);
    
    switch (format) {
      case 'DD/MM/YYYY':
        return d.toLocaleDateString('es-CO');
      case 'YYYY-MM-DD':
        return d.toISOString().split('T')[0];
      case 'YYYYMMDD':
        return d.toISOString().replace(/[-T:]/g, '').substring(0, 8);
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * Format number value
   */
  static formatNumber(num: number, format: ExportSettings['number_format']): string {
    return num.toLocaleString('es-CO', {
      minimumFractionDigits: format.decimal_places,
      maximumFractionDigits: format.decimal_places,
    }).replace(',', format.decimal_separator)
      .replace(/\./g, format.thousands_separator);
  }

  /**
   * Generate World Office movements array
   */
  static generateWorldOfficeMovements(invoice: InvoiceData): any[] {
    const movements = [];
    
    // Debit movement (expense)
    movements.push({
      cuenta: '5105001', // Default expense account
      debito: invoice.subtotal,
      credito: 0,
      detalle: invoice.supplier_name,
    });
    
    // IVA movement if applicable
    if (invoice.tax_calculations?.iva_amount) {
      movements.push({
        cuenta: '2408001', // IVA account
        debito: invoice.tax_calculations.iva_amount,
        credito: 0,
        detalle: 'IVA',
      });
    }
    
    // Credit movement (supplier)
    movements.push({
      cuenta: '2205001', // Suppliers account
      debito: 0,
      credito: invoice.tax_calculations?.net_amount || invoice.total_amount,
      detalle: invoice.supplier_name,
    });
    
    return movements;
  }
}

export const EXPORT_TEMPLATES = {
  siigo_csv: SIIGO_CSV_TEMPLATE,
  world_office_json: WORLD_OFFICE_JSON_TEMPLATE,
  sap_xml: SAP_XML_TEMPLATE,
};