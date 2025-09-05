import { ColombianTaxCalculator, COLOMBIAN_TAX_RATES, LARGE_TAXPAYERS } from '../colombian-tax-rules';

describe('ColombianTaxCalculator', () => {
  let calculator: ColombianTaxCalculator;

  beforeEach(() => {
    calculator = new ColombianTaxCalculator();
  });

  describe('IVA Calculation', () => {
    it('should calculate standard IVA correctly', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '987654321',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.iva.rate).toBe(COLOMBIAN_TAX_RATES.IVA.STANDARD);
      expect(result.iva.tax_amount).toBe(190000); // 19% of 1,000,000
      expect(result.iva.base_amount).toBe(1000000);
    });

    it('should apply IVA exemption for exempt categories', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '987654321',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'education',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.iva.rate).toBe(0);
      expect(result.iva.tax_amount).toBe(0);
      expect(result.iva.exempt_amount).toBe(1000000);
    });

    it('should apply reduced IVA rate for basic foods', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '987654321',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'goods' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'basic_foods',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.iva.rate).toBe(COLOMBIAN_TAX_RATES.IVA.REDUCED);
      expect(result.iva.tax_amount).toBe(50000); // 5% of 1,000,000
    });
  });

  describe('ReteFuente Calculation', () => {
    it('should calculate ReteFuente for services correctly', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '9876543210', // Large taxpayer NIT (10+ digits)
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.retefuente.rate).toBe(COLOMBIAN_TAX_RATES.RETEFUENTE.SERVICES);
      expect(result.retefuente.tax_amount).toBe(40000); // 4% of 1,000,000
      expect(result.retefuente.concept).toBe('Servicios');
    });

    it('should calculate ReteFuente for professional fees correctly', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '9876543210',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'professional_fees' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'legal_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.retefuente.rate).toBe(COLOMBIAN_TAX_RATES.RETEFUENTE.PROFESSIONAL_FEES);
      expect(result.retefuente.tax_amount).toBe(110000); // 11% of 1,000,000
      expect(result.retefuente.concept).toBe('Honorarios profesionales');
    });

    it('should not apply ReteFuente for non-retention agents', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '12345678', // Small NIT (< 10 digits)
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.retefuente.rate).toBe(0);
      expect(result.retefuente.tax_amount).toBe(0);
      expect(result.retefuente.rationale).toContain('no es agente retenedor');
    });
  });

  describe('ReteIVA Calculation', () => {
    it('should calculate ReteIVA when conditions are met', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '9876543210', // Retention agent
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      // ReteIVA should be 15% of IVA amount
      expect(result.reteiva.rate).toBe(COLOMBIAN_TAX_RATES.RETEIVA.STANDARD);
      expect(result.reteiva.base_amount).toBe(190000); // IVA amount
      expect(result.reteiva.tax_amount).toBe(28500); // 15% of 190,000
    });
  });

  describe('ICA Calculation', () => {
    it('should calculate ICA for services in Bogotá', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '987654321',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001', // Bogotá
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.ica.rate).toBe(COLOMBIAN_TAX_RATES.ICA.BOGOTA.SERVICES);
      expect(result.ica.tax_amount).toBe(9660); // 9.66 per thousand of 1,000,000
      expect(result.ica.city_code).toBe('11001');
    });

    it('should calculate ICA for commercial activities in Medellín', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '987654321',
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'goods' as const,
          is_large_taxpayer: false,
          city_code: '05001', // Medellín
          expense_category: 'inventory',
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.ica.rate).toBe(COLOMBIAN_TAX_RATES.ICA.MEDELLIN.COMMERCIAL);
      expect(result.ica.tax_amount).toBe(4000); // 4 per thousand of 1,000,000
      expect(result.ica.city_code).toBe('05001');
    });
  });

  describe('Complete Tax Calculation', () => {
    it('should calculate all taxes correctly and provide totals', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '9876543210', // Retention agent
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '11001',
          expense_category: 'professional_services',
        },
      };

      const result = calculator.calculateTaxes(input);

      // Verify individual calculations
      expect(result.iva.tax_amount).toBe(190000); // 19% IVA
      expect(result.reteiva.tax_amount).toBe(28500); // 15% of IVA
      expect(result.retefuente.tax_amount).toBe(40000); // 4% ReteFuente
      expect(result.ica.tax_amount).toBe(9660); // 9.66 per thousand ICA

      // Verify totals
      expect(result.total_taxes).toBe(199660); // IVA + ICA
      expect(result.total_retentions).toBe(68500); // ReteIVA + ReteFuente
      expect(result.net_amount).toBe(1131160); // Subtotal + taxes - retentions

      // Verify applied rules are tracked
      expect(result.applied_rules).toContain('RETEFUENTE_SERVICES');
      expect(result.applied_rules).toContain('RETEIVA_STANDARD');
      expect(result.applied_rules).toContain('ICA_SERVICES');
    });

    it('should handle edge case with no taxes or retentions', () => {
      const input = {
        invoice: {
          subtotal: 1000000,
          supplier_nit: '123456789',
          supplier_name: 'Test Supplier',
          buyer_nit: '12345678', // Not a retention agent
          issue_date: '2024-01-15',
          currency_code: 'COP',
        },
        classification: {
          expense_kind: 'services' as const,
          is_large_taxpayer: false,
          city_code: '99999', // Unknown city
          expense_category: 'education', // IVA exempt
        },
      };

      const result = calculator.calculateTaxes(input);

      expect(result.iva.tax_amount).toBe(0);
      expect(result.reteiva.tax_amount).toBe(0);
      expect(result.retefuente.tax_amount).toBe(0);
      expect(result.ica.tax_amount).toBe(0);
      expect(result.total_taxes).toBe(0);
      expect(result.total_retentions).toBe(0);
      expect(result.net_amount).toBe(1000000); // Same as subtotal

      expect(result.warnings).toContain('No se encontraron tarifas ICA para ciudad: 99999');
    });
  });
});