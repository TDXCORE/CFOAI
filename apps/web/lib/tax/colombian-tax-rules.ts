// Colombian Tax Rules Engine
import { Database } from '~/lib/types/database';

type ExpenseKind = Database['public']['Enums']['expense_kind'];
type TaxRuleType = Database['public']['Enums']['tax_rule_type'];

export interface TaxRule {
  id: string;
  rule_type: TaxRuleType;
  name: string;
  description: string;
  conditions: TaxRuleCondition[];
  rate_calculation: RateCalculation;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  priority: number;
}

export interface TaxRuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: any;
}

export interface RateCalculation {
  type: 'percentage' | 'fixed_amount' | 'per_thousand' | 'tiered';
  base_rate: number;
  minimum_amount?: number;
  maximum_amount?: number;
  tiers?: { threshold: number; rate: number }[];
  exemptions?: string[];
}

export interface TaxCalculationInput {
  invoice: {
    subtotal: number;
    supplier_nit: string;
    supplier_name: string;
    buyer_nit: string;
    issue_date: string;
    currency_code: string;
  };
  classification: {
    expense_kind: ExpenseKind;
    is_large_taxpayer: boolean | null;
    city_code: string;
    expense_category: string;
  };
  line_items?: {
    description: string;
    subtotal: number;
    category?: string;
  }[];
}

export interface TaxCalculationResult {
  iva: {
    rate: number;
    base_amount: number;
    tax_amount: number;
    exempt_amount: number;
    rationale: string;
  };
  reteiva: {
    rate: number;
    base_amount: number;
    tax_amount: number;
    rationale: string;
  };
  retefuente: {
    rate: number;
    base_amount: number;
    tax_amount: number;
    concept: string;
    rationale: string;
  };
  ica: {
    rate: number;
    base_amount: number;
    tax_amount: number;
    city_code: string;
    activity_code?: string;
    rationale: string;
  };
  total_taxes: number;
  total_retentions: number;
  net_amount: number;
  applied_rules: string[];
  warnings: string[];
}

// Standard Colombian Tax Rates (2024)
export const COLOMBIAN_TAX_RATES = {
  // IVA Rates
  IVA: {
    STANDARD: 0.19,      // 19% standard rate
    REDUCED: 0.05,       // 5% reduced rate (basic foods, medicines)
    ZERO: 0.00,          // 0% zero-rated (exports, some services)
    EXEMPT: null,        // Exempt (no IVA)
  },
  
  // ReteIVA Rates (retention of IVA)
  RETEIVA: {
    STANDARD: 0.15,      // 15% retention on IVA
    SERVICES: 0.15,      // 15% for services
    GOODS: 0.15,         // 15% for goods
  },
  
  // ReteFuente Rates (income tax retention)
  RETEFUENTE: {
    SERVICES: 0.04,         // 4% for services
    PROFESSIONAL_FEES: 0.11, // 11% for professional fees
    GOODS: 0.025,           // 2.5% for goods
    RENT: 0.035,            // 3.5% for rent
    INTEREST: 0.07,         // 7% for interest
    DIVIDENDS: 0.075,       // 7.5% for dividends
    COMMISSIONS: 0.10,      // 10% for commissions
  },
  
  // ICA Rates (per thousand - varies by city and activity)
  ICA: {
    BOGOTA: {
      COMMERCIAL: 0.00414,     // 4.14 per thousand
      INDUSTRIAL: 0.00414,     // 4.14 per thousand
      SERVICES: 0.00966,       // 9.66 per thousand
      FINANCIAL: 0.00414,      // 4.14 per thousand
    },
    MEDELLIN: {
      COMMERCIAL: 0.004,       // 4 per thousand
      INDUSTRIAL: 0.004,       // 4 per thousand
      SERVICES: 0.007,         // 7 per thousand
      FINANCIAL: 0.004,        // 4 per thousand
    },
    CALI: {
      COMMERCIAL: 0.002,       // 2 per thousand
      INDUSTRIAL: 0.002,       // 2 per thousand
      SERVICES: 0.005,         // 5 per thousand
      FINANCIAL: 0.002,        // 2 per thousand
    },
  },
};

// Large taxpayer NITs (Gran Contribuyente) - simplified list
export const LARGE_TAXPAYERS = new Set([
  '860066942',  // Ecopetrol
  '890903938',  // Banco de Bogotá
  '860028462',  // Bancolombia
  '860034313',  // Davivienda
  // Add more as needed
]);

// IVA Exempt categories
export const IVA_EXEMPT_CATEGORIES = new Set([
  'education',
  'health',
  'basic_foods',
  'public_transport',
  'books',
  'medicines',
]);

// City codes mapping (DANE codes)
export const CITY_CODES = {
  '11001': { name: 'Bogotá D.C.', department: 'Cundinamarca' },
  '05001': { name: 'Medellín', department: 'Antioquia' },
  '76001': { name: 'Cali', department: 'Valle del Cauca' },
  '08001': { name: 'Barranquilla', department: 'Atlántico' },
  '13001': { name: 'Cartagena', department: 'Bolívar' },
  '68001': { name: 'Bucaramanga', department: 'Santander' },
  '66001': { name: 'Pereira', department: 'Risaralda' },
  '52001': { name: 'Pasto', department: 'Nariño' },
  '63001': { name: 'Armenia', department: 'Quindío' },
  '17001': { name: 'Manizales', department: 'Caldas' },
};

export class ColombianTaxCalculator {
  
  /**
   * Calculate all Colombian taxes for an invoice
   */
  calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
    const warnings: string[] = [];
    const appliedRules: string[] = [];

    // 1. Calculate IVA
    const ivaResult = this.calculateIVA(input, warnings, appliedRules);
    
    // 2. Calculate ReteIVA (retention on IVA)
    const reteivaResult = this.calculateReteIVA(input, ivaResult, warnings, appliedRules);
    
    // 3. Calculate ReteFuente (income tax retention)
    const retefuenteResult = this.calculateReteFuente(input, warnings, appliedRules);
    
    // 4. Calculate ICA (municipal tax)
    const icaResult = this.calculateICA(input, warnings, appliedRules);
    
    const totalTaxes = ivaResult.tax_amount + icaResult.tax_amount;
    const totalRetentions = reteivaResult.tax_amount + retefuenteResult.tax_amount;
    const netAmount = input.invoice.subtotal + totalTaxes - totalRetentions;

    return {
      iva: ivaResult,
      reteiva: reteivaResult,
      retefuente: retefuenteResult,
      ica: icaResult,
      total_taxes: totalTaxes,
      total_retentions: totalRetentions,
      net_amount: netAmount,
      applied_rules: appliedRules,
      warnings,
    };
  }

  private calculateIVA(
    input: TaxCalculationInput, 
    warnings: string[], 
    appliedRules: string[]
  ) {
    let rate = COLOMBIAN_TAX_RATES.IVA.STANDARD;
    let exemptAmount = 0;
    let rationale = 'IVA estándar 19%';

    // Check for exemptions
    if (IVA_EXEMPT_CATEGORIES.has(input.classification.expense_category)) {
      rate = 0;
      exemptAmount = input.invoice.subtotal;
      rationale = `IVA exento - categoría: ${input.classification.expense_category}`;
      appliedRules.push('IVA_EXEMPT_CATEGORY');
    }
    
    // Reduced rate for certain categories
    else if (['basic_foods', 'medicines', 'agricultural_products'].includes(input.classification.expense_category)) {
      rate = COLOMBIAN_TAX_RATES.IVA.REDUCED;
      rationale = `IVA reducido 5% - categoría: ${input.classification.expense_category}`;
      appliedRules.push('IVA_REDUCED_RATE');
    }

    // Export transactions are zero-rated
    else if (input.classification.expense_category === 'exports') {
      rate = COLOMBIAN_TAX_RATES.IVA.ZERO;
      rationale = 'IVA 0% - exportaciones';
      appliedRules.push('IVA_EXPORT_ZERO_RATE');
    }

    const baseAmount = input.invoice.subtotal - exemptAmount;
    const taxAmount = baseAmount * rate;

    return {
      rate,
      base_amount: baseAmount,
      tax_amount: taxAmount,
      exempt_amount: exemptAmount,
      rationale,
    };
  }

  private calculateReteIVA(
    input: TaxCalculationInput,
    ivaResult: any,
    warnings: string[], 
    appliedRules: string[]
  ) {
    let rate = 0;
    let rationale = 'No aplica ReteIVA';

    // ReteIVA only applies when there's IVA and the buyer is a retention agent
    if (ivaResult.tax_amount > 0 && this.isRetentionAgent(input.invoice.buyer_nit)) {
      rate = COLOMBIAN_TAX_RATES.RETEIVA.STANDARD;
      rationale = 'ReteIVA 15% - agente retenedor';
      appliedRules.push('RETEIVA_STANDARD');
    }

    const baseAmount = ivaResult.tax_amount;
    const taxAmount = baseAmount * rate;

    return {
      rate,
      base_amount: baseAmount,
      tax_amount: taxAmount,
      rationale,
    };
  }

  private calculateReteFuente(
    input: TaxCalculationInput, 
    warnings: string[], 
    appliedRules: string[]
  ) {
    let rate = 0;
    let concept = '';
    let rationale = 'No aplica ReteFuente';

    // Only apply if buyer is a retention agent
    if (!this.isRetentionAgent(input.invoice.buyer_nit)) {
      return {
        rate: 0,
        base_amount: 0,
        tax_amount: 0,
        concept: '',
        rationale: 'Comprador no es agente retenedor',
      };
    }

    // Apply retention based on expense type
    switch (input.classification.expense_kind) {
      case 'services':
        rate = COLOMBIAN_TAX_RATES.RETEFUENTE.SERVICES;
        concept = 'Servicios';
        rationale = 'ReteFuente 4% - servicios';
        appliedRules.push('RETEFUENTE_SERVICES');
        break;
        
      case 'professional_fees':
        rate = COLOMBIAN_TAX_RATES.RETEFUENTE.PROFESSIONAL_FEES;
        concept = 'Honorarios profesionales';
        rationale = 'ReteFuente 11% - honorarios profesionales';
        appliedRules.push('RETEFUENTE_PROFESSIONAL');
        break;
        
      case 'goods':
        rate = COLOMBIAN_TAX_RATES.RETEFUENTE.GOODS;
        concept = 'Bienes';
        rationale = 'ReteFuente 2.5% - bienes';
        appliedRules.push('RETEFUENTE_GOODS');
        break;
    }

    // Special categories with different rates
    if (input.classification.expense_category === 'rent') {
      rate = COLOMBIAN_TAX_RATES.RETEFUENTE.RENT;
      concept = 'Arrendamientos';
      rationale = 'ReteFuente 3.5% - arrendamientos';
      appliedRules.push('RETEFUENTE_RENT');
    }

    const baseAmount = input.invoice.subtotal;
    const taxAmount = baseAmount * rate;

    return {
      rate,
      base_amount: baseAmount,
      tax_amount: taxAmount,
      concept,
      rationale,
    };
  }

  private calculateICA(
    input: TaxCalculationInput, 
    warnings: string[], 
    appliedRules: string[]
  ) {
    const cityCode = input.classification.city_code;
    let rate = 0;
    let activityCode: string | undefined;
    let rationale = 'No aplica ICA';

    // Get city-specific rates
    const cityRates = this.getICArates(cityCode);
    if (!cityRates) {
      warnings.push(`No se encontraron tarifas ICA para ciudad: ${cityCode}`);
      return {
        rate: 0,
        base_amount: 0,
        tax_amount: 0,
        city_code: cityCode,
        activity_code: undefined,
        rationale: `Ciudad no configurada: ${cityCode}`,
      };
    }

    // Determine activity type and rate
    if (input.classification.expense_kind === 'services') {
      rate = cityRates.SERVICES;
      activityCode = 'SERVICES';
      rationale = `ICA servicios - ${this.getCityName(cityCode)}`;
      appliedRules.push('ICA_SERVICES');
    } else if (input.classification.expense_kind === 'goods') {
      rate = cityRates.COMMERCIAL;
      activityCode = 'COMMERCIAL';
      rationale = `ICA comercial - ${this.getCityName(cityCode)}`;
      appliedRules.push('ICA_COMMERCIAL');
    }

    const baseAmount = input.invoice.subtotal;
    const taxAmount = baseAmount * rate;

    return {
      rate,
      base_amount: baseAmount,
      tax_amount: taxAmount,
      city_code: cityCode,
      activity_code: activityCode,
      rationale,
    };
  }

  private isRetentionAgent(nit: string): boolean {
    // Simplified logic - in production, this would query a database
    // Large taxpayers and government entities are typically retention agents
    return LARGE_TAXPAYERS.has(nit) || 
           nit.startsWith('899999') || // Government entities
           nit.length >= 10; // Companies with 10+ digit NITs are usually retention agents
  }

  private getICArates(cityCode: string) {
    switch (cityCode) {
      case '11001': return COLOMBIAN_TAX_RATES.ICA.BOGOTA;
      case '05001': return COLOMBIAN_TAX_RATES.ICA.MEDELLIN;
      case '76001': return COLOMBIAN_TAX_RATES.ICA.CALI;
      default: return null;
    }
  }

  private getCityName(cityCode: string): string {
    return CITY_CODES[cityCode as keyof typeof CITY_CODES]?.name || cityCode;
  }
}

export const colombianTaxCalculator = new ColombianTaxCalculator();