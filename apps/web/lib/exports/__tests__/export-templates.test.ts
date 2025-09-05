import { 
  ExportTemplateProcessor, 
  SIIGO_CSV_TEMPLATE,
  WORLD_OFFICE_JSON_TEMPLATE,
  DEFAULT_ACCOUNT_MAPPINGS 
} from '../export-templates';

describe('ExportTemplateProcessor', () => {
  const mockInvoice = {
    id: 'inv-001',
    invoice_number: 'FV001',
    invoice_type: 'invoice' as const,
    issue_date: '2024-01-15',
    supplier_nit: '123456789',
    supplier_name: 'Proveedor Test S.A.S.',
    buyer_nit: '987654321',
    buyer_name: 'Cliente Test Ltda.',
    subtotal: 1000000,
    tax_amount: 190000,
    total_amount: 1190000,
    currency_code: 'COP',
    classifications: {
      expense_kind: 'services',
      expense_category: 'professional_services',
      is_large_taxpayer: false,
    },
    tax_calculations: {
      iva_amount: 190000,
      reteiva_amount: 28500,
      retefuente_amount: 40000,
      ica_amount: 9660,
      net_amount: 1131160,
    },
    line_items: [{
      description: 'Servicios de consultoría',
      quantity: 1,
      unit_price: 1000000,
      line_total: 1000000,
    }],
  };

  describe('processInvoice', () => {
    it('should process invoice with Siigo CSV template correctly', () => {
      const result = ExportTemplateProcessor.processInvoice(
        mockInvoice,
        SIIGO_CSV_TEMPLATE,
        DEFAULT_ACCOUNT_MAPPINGS
      );

      expect(result.tipo_comprobante).toBe('FV'); // Invoice type transformation
      expect(result.numero_factura).toBe('FV001');
      expect(result.fecha).toBe('15/01/2024'); // Date formatted for Siigo
      expect(result.nit_proveedor).toBe('123456789');
      expect(result.razon_social).toBe('Proveedor Test S.A.S.');
      expect(result.valor_base).toBe('1.000.000,00'); // Number formatted
      expect(result.valor_iva).toBe('190.000,00');
      expect(result.valor_retefuente).toBe('40.000,00');
      expect(result.valor_reteiva).toBe('28.500,00');
      expect(result.valor_total).toBe('1.131.160,00');
      expect(result.cuenta_debito).toBe('5110001'); // Professional services account
      expect(result.cuenta_credito).toBe('2205001'); // Suppliers account
      expect(result.observaciones).toBe('Servicios de consultoría');
    });

    it('should process credit note with correct document type transformation', () => {
      const creditNote = {
        ...mockInvoice,
        invoice_type: 'credit_note' as const,
        invoice_number: 'NC001',
      };

      const result = ExportTemplateProcessor.processInvoice(
        creditNote,
        SIIGO_CSV_TEMPLATE,
        DEFAULT_ACCOUNT_MAPPINGS
      );

      expect(result.tipo_comprobante).toBe('NC'); // Credit note type
      expect(result.numero_factura).toBe('NC001');
    });

    it('should use default values when data is missing', () => {
      const incompleteInvoice = {
        ...mockInvoice,
        tax_calculations: undefined,
        classifications: undefined,
      };

      const result = ExportTemplateProcessor.processInvoice(
        incompleteInvoice,
        SIIGO_CSV_TEMPLATE,
        DEFAULT_ACCOUNT_MAPPINGS
      );

      expect(result.cuenta_debito).toBe('5105001'); // Default from first mapping
      expect(result.centro_costo).toBe('001'); // Default value from template
      expect(result.valor_iva).toBe('0,00'); // Default formatting for undefined
    });

    it('should process World Office JSON template correctly', () => {
      const result = ExportTemplateProcessor.processInvoice(
        mockInvoice,
        WORLD_OFFICE_JSON_TEMPLATE,
        DEFAULT_ACCOUNT_MAPPINGS
      );

      expect(result.documento).toBe('FP'); // World Office document type
      expect(result.numero).toBe('FV001');
      expect(result.fecha).toBe('2024-01-15'); // ISO date format
      expect(result.tercero).toBe('123456789');
      expect(result.detalle).toBe('Proveedor Test S.A.S.');
      expect(Array.isArray(result.movimientos)).toBe(true);
    });
  });

  describe('extractValue', () => {
    it('should extract simple values correctly', () => {
      const value = ExportTemplateProcessor.extractValue(mockInvoice, 'invoice_number');
      expect(value).toBe('FV001');
    });

    it('should extract nested values correctly', () => {
      const value = ExportTemplateProcessor.extractValue(mockInvoice, 'tax_calculations.iva_amount');
      expect(value).toBe(190000);
    });

    it('should extract array values correctly', () => {
      const value = ExportTemplateProcessor.extractValue(mockInvoice, 'line_items[0].description');
      expect(value).toBe('Servicios de consultoría');
    });

    it('should extract mapping values correctly', () => {
      const mapping = DEFAULT_ACCOUNT_MAPPINGS[1]; // Professional services mapping
      const value = ExportTemplateProcessor.extractValue(mockInvoice, 'mapping.debit_account', mapping);
      expect(value).toBe('5110001');
    });

    it('should return undefined for non-existent paths', () => {
      const value = ExportTemplateProcessor.extractValue(mockInvoice, 'non.existent.path');
      expect(value).toBeUndefined();
    });
  });

  describe('applyTransformation', () => {
    it('should transform Siigo document types correctly', () => {
      expect(ExportTemplateProcessor.applyTransformation('invoice', 'siigo_document_type', mockInvoice)).toBe('FV');
      expect(ExportTemplateProcessor.applyTransformation('credit_note', 'siigo_document_type', mockInvoice)).toBe('NC');
      expect(ExportTemplateProcessor.applyTransformation('debit_note', 'siigo_document_type', mockInvoice)).toBe('ND');
    });

    it('should transform World Office document types correctly', () => {
      expect(ExportTemplateProcessor.applyTransformation('invoice', 'world_office_doc_type', mockInvoice)).toBe('FP');
      expect(ExportTemplateProcessor.applyTransformation('credit_note', 'world_office_doc_type', mockInvoice)).toBe('NC');
      expect(ExportTemplateProcessor.applyTransformation('debit_note', 'world_office_doc_type', mockInvoice)).toBe('ND');
    });

    it('should transform SAP document types correctly', () => {
      expect(ExportTemplateProcessor.applyTransformation('invoice', 'sap_document_type', mockInvoice)).toBe('RE');
      expect(ExportTemplateProcessor.applyTransformation('credit_note', 'sap_document_type', mockInvoice)).toBe('KG');
      expect(ExportTemplateProcessor.applyTransformation('debit_note', 'sap_document_type', mockInvoice)).toBe('KR');
    });

    it('should generate World Office movements correctly', () => {
      const movements = ExportTemplateProcessor.applyTransformation(null, 'world_office_movements', mockInvoice);
      
      expect(Array.isArray(movements)).toBe(true);
      expect(movements).toHaveLength(3); // Expense, IVA, and Supplier movements
      
      // Expense movement
      expect(movements[0]).toEqual({
        cuenta: '5105001',
        debito: 1000000,
        credito: 0,
        detalle: 'Proveedor Test S.A.S.',
      });
      
      // IVA movement
      expect(movements[1]).toEqual({
        cuenta: '2408001',
        debito: 190000,
        credito: 0,
        detalle: 'IVA',
      });
      
      // Supplier movement
      expect(movements[2]).toEqual({
        cuenta: '2205001',
        debito: 0,
        credito: 1131160,
        detalle: 'Proveedor Test S.A.S.',
      });
    });

    it('should return original value for unknown transformations', () => {
      const value = ExportTemplateProcessor.applyTransformation('test', 'unknown_transformation', mockInvoice);
      expect(value).toBe('test');
    });
  });

  describe('formatValue', () => {
    const settings = SIIGO_CSV_TEMPLATE.settings;

    it('should format dates correctly', () => {
      const field = {
        key: 'fecha',
        label: 'Fecha',
        source_path: 'issue_date',
        data_type: 'date' as const,
        required: true,
        format: 'DD/MM/YYYY',
      };

      const result = ExportTemplateProcessor.formatValue('2024-01-15', field, settings);
      expect(result).toBe('15/01/2024');
    });

    it('should format numbers correctly', () => {
      const field = {
        key: 'valor_base',
        label: 'Valor Base',
        source_path: 'subtotal',
        data_type: 'number' as const,
        required: true,
      };

      const result = ExportTemplateProcessor.formatValue(1000000, field, settings);
      expect(result).toBe('1.000.000,00');
    });

    it('should format strings correctly', () => {
      const field = {
        key: 'razon_social',
        label: 'Razón Social',
        source_path: 'supplier_name',
        data_type: 'string' as const,
        required: true,
      };

      const result = ExportTemplateProcessor.formatValue('Test Company', field, settings);
      expect(result).toBe('Test Company');
    });

    it('should format booleans correctly', () => {
      const field = {
        key: 'is_active',
        label: 'Is Active',
        source_path: 'active',
        data_type: 'boolean' as const,
        required: false,
      };

      expect(ExportTemplateProcessor.formatValue(true, field, settings)).toBe(true);
      expect(ExportTemplateProcessor.formatValue(0, field, settings)).toBe(false);
      expect(ExportTemplateProcessor.formatValue('yes', field, settings)).toBe(true);
    });
  });

  describe('formatDate', () => {
    it('should format dates in different formats', () => {
      expect(ExportTemplateProcessor.formatDate('2024-01-15', 'DD/MM/YYYY')).toBe('15/01/2024');
      expect(ExportTemplateProcessor.formatDate('2024-01-15', 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(ExportTemplateProcessor.formatDate('2024-01-15', 'YYYYMMDD')).toBe('20240115');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(ExportTemplateProcessor.formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
    });
  });

  describe('formatNumber', () => {
    const format = {
      decimal_places: 2,
      decimal_separator: ',',
      thousands_separator: '.',
    };

    it('should format numbers with correct separators', () => {
      expect(ExportTemplateProcessor.formatNumber(1000000, format)).toBe('1.000.000,00');
      expect(ExportTemplateProcessor.formatNumber(1234.56, format)).toBe('1.234,56');
      expect(ExportTemplateProcessor.formatNumber(0, format)).toBe('0,00');
    });
  });

  describe('findAccountMapping', () => {
    it('should find correct mapping for expense category', () => {
      const mapping = ExportTemplateProcessor.findAccountMapping(mockInvoice, DEFAULT_ACCOUNT_MAPPINGS);
      expect(mapping?.expense_category).toBe('professional_services');
      expect(mapping?.debit_account).toBe('5110001');
    });

    it('should return first mapping as default when no match found', () => {
      const invoiceWithUnknownCategory = {
        ...mockInvoice,
        classifications: {
          ...mockInvoice.classifications,
          expense_category: 'unknown_category',
        },
      };

      const mapping = ExportTemplateProcessor.findAccountMapping(invoiceWithUnknownCategory, DEFAULT_ACCOUNT_MAPPINGS);
      expect(mapping).toBe(DEFAULT_ACCOUNT_MAPPINGS[0]);
    });
  });

  describe('processInvoices', () => {
    it('should process multiple invoices correctly', () => {
      const invoices = [mockInvoice, { ...mockInvoice, invoice_number: 'FV002' }];
      
      const results = ExportTemplateProcessor.processInvoices(
        invoices,
        SIIGO_CSV_TEMPLATE,
        DEFAULT_ACCOUNT_MAPPINGS
      );

      expect(results).toHaveLength(2);
      expect(results[0].numero_factura).toBe('FV001');
      expect(results[1].numero_factura).toBe('FV002');
    });
  });
});