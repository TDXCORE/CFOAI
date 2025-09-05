// CFO AI XML Parser for Colombian UBL Invoices
import { parseStringPromise } from 'xml2js';

export interface ParsedInvoice {
  invoice_number: string;
  invoice_type: 'invoice' | 'credit_note' | 'debit_note';
  cufe?: string;
  issue_date: string;
  due_date?: string;
  supplier: {
    nit: string;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  buyer: {
    nit: string;
    name: string;
    address?: string;
    city?: string;
  };
  totals: {
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    currency_code: string;
  };
  items: Array<{
    line_number: number;
    item_code?: string;
    description: string;
    quantity: number;
    unit_of_measure?: string;
    unit_price: number;
    line_total: number;
    tax_rate?: number;
    tax_amount: number;
    discount_rate?: number;
    discount_amount: number;
  }>;
  confidence: number;
}

export class UBLParser {
  private namespaces: Record<string, string> = {
    'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'fe': 'http://www.dian.gov.co/contratos/facturaelectronica/v1',
    'sts': 'http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures',
  };

  async parseUBLInvoice(xmlContent: string): Promise<ParsedInvoice> {
    try {
      const parsed = await parseStringPromise(xmlContent);
      
      // Determine document type
      let documentType: 'invoice' | 'credit_note' | 'debit_note' = 'invoice';
      let rootElement: any;

      if (parsed.Invoice) {
        rootElement = parsed.Invoice;
        documentType = 'invoice';
      } else if (parsed.CreditNote) {
        rootElement = parsed.CreditNote;
        documentType = 'credit_note';
      } else if (parsed.DebitNote) {
        rootElement = parsed.DebitNote;
        documentType = 'debit_note';
      } else {
        throw new Error('Document type not recognized. Expected Invoice, CreditNote, or DebitNote');
      }

      // Extract basic invoice information
      const invoiceNumber = this.extractText(rootElement, 'cbc:ID');
      const cufe = this.extractText(rootElement, 'cbc:UUID');
      const issueDate = this.extractText(rootElement, 'cbc:IssueDate');
      const dueDate = this.extractText(rootElement, 'cbc:DueDate');
      const currencyCode = this.extractText(rootElement, 'cbc:DocumentCurrencyCode') || 'COP';

      if (!invoiceNumber || !issueDate) {
        throw new Error('Missing required invoice data: ID or IssueDate');
      }

      // Extract supplier information
      const supplierParty = rootElement['cac:AccountingSupplierParty']?.[0]?.['cac:Party']?.[0];
      if (!supplierParty) {
        throw new Error('Supplier party information not found');
      }

      const supplier = this.extractPartyInfo(supplierParty);

      // Extract buyer information
      const customerParty = rootElement['cac:AccountingCustomerParty']?.[0]?.['cac:Party']?.[0];
      if (!customerParty) {
        throw new Error('Customer party information not found');
      }

      const buyer = this.extractPartyInfo(customerParty);

      // Extract monetary totals
      const legalMonetaryTotal = rootElement['cac:LegalMonetaryTotal']?.[0];
      if (!legalMonetaryTotal) {
        throw new Error('Legal monetary total not found');
      }

      const totals = {
        subtotal: parseFloat(this.extractText(legalMonetaryTotal, 'cbc:LineExtensionAmount') || '0'),
        tax_amount: parseFloat(this.extractText(legalMonetaryTotal, 'cbc:TaxExclusiveAmount') || '0'),
        discount_amount: parseFloat(this.extractText(legalMonetaryTotal, 'cbc:AllowanceTotalAmount') || '0'),
        total_amount: parseFloat(this.extractText(legalMonetaryTotal, 'cbc:PayableAmount') || '0'),
        currency_code: currencyCode,
      };

      // Calculate tax amount if not directly available
      if (totals.tax_amount === 0) {
        totals.tax_amount = totals.total_amount - totals.subtotal + totals.discount_amount;
      }

      // Extract line items
      const invoiceLines = rootElement['cac:InvoiceLine'] || rootElement['cac:CreditNoteLine'] || rootElement['cac:DebitNoteLine'] || [];
      const items = invoiceLines.map((line: any, index: number) => this.extractLineItem(line, index + 1));

      // Calculate confidence based on completeness
      let confidence = 1.0;
      if (!cufe) confidence -= 0.1;
      if (!supplier.address) confidence -= 0.05;
      if (!buyer.address) confidence -= 0.05;
      if (items.length === 0) confidence -= 0.2;
      if (totals.total_amount === 0) confidence -= 0.3;

      return {
        invoice_number: invoiceNumber,
        invoice_type: documentType,
        cufe,
        issue_date: issueDate,
        due_date: dueDate,
        supplier,
        buyer,
        totals,
        items,
        confidence: Math.max(0, confidence),
      };

    } catch (error) {
      console.error('UBL parsing error:', error);
      throw new Error(`Failed to parse UBL XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractPartyInfo(party: any) {
    const partyName = party['cac:PartyName']?.[0]?.['cbc:Name']?.[0] || 
                     party['cac:PartyLegalEntity']?.[0]?.['cbc:RegistrationName']?.[0];
    
    const partyTaxScheme = party['cac:PartyTaxScheme']?.[0];
    const nit = partyTaxScheme?.['cbc:CompanyID']?.[0]?.replace(/[^0-9]/g, '') || '';

    const postalAddress = party['cac:PostalAddress']?.[0];
    const address = postalAddress ? this.buildAddress(postalAddress) : undefined;
    const city = postalAddress?.['cbc:CityName']?.[0];

    const contact = party['cac:Contact']?.[0];
    const phone = contact?.['cbc:Telephone']?.[0];
    const email = contact?.['cbc:ElectronicMail']?.[0];

    if (!nit || !partyName) {
      throw new Error('Missing required party information: NIT or Name');
    }

    return {
      nit,
      name: partyName,
      address,
      city,
      phone,
      email,
    };
  }

  private buildAddress(postalAddress: any): string {
    const parts = [];
    
    if (postalAddress['cbc:StreetName']?.[0]) {
      parts.push(postalAddress['cbc:StreetName'][0]);
    }
    
    if (postalAddress['cbc:AdditionalStreetName']?.[0]) {
      parts.push(postalAddress['cbc:AdditionalStreetName'][0]);
    }
    
    if (postalAddress['cbc:BuildingNumber']?.[0]) {
      parts.push(`# ${postalAddress['cbc:BuildingNumber'][0]}`);
    }
    
    if (postalAddress['cbc:CitySubdivisionName']?.[0]) {
      parts.push(postalAddress['cbc:CitySubdivisionName'][0]);
    }
    
    return parts.join(' ') || undefined;
  }

  private extractLineItem(line: any, lineNumber: number) {
    const quantity = parseFloat(this.extractText(line, 'cbc:InvoicedQuantity') || 
                               this.extractText(line, 'cbc:CreditedQuantity') || 
                               this.extractText(line, 'cbc:DebitedQuantity') || '1');
    
    const unitPrice = parseFloat(this.extractText(line, 'cac:Price/cbc:PriceAmount') || '0');
    const lineTotal = parseFloat(this.extractText(line, 'cbc:LineExtensionAmount') || '0');

    const item = line['cac:Item']?.[0];
    const description = this.extractText(item, 'cbc:Description') || 
                       this.extractText(item, 'cbc:Name') || 
                       'Item sin descripción';
    
    const itemCode = this.extractText(item, 'cac:SellersItemIdentification/cbc:ID') ||
                    this.extractText(item, 'cac:StandardItemIdentification/cbc:ID');

    const unitOfMeasure = this.extractText(line, 'cbc:InvoicedQuantity/@unitCode') ||
                         this.extractText(line, 'cbc:CreditedQuantity/@unitCode') ||
                         this.extractText(line, 'cbc:DebitedQuantity/@unitCode');

    // Extract tax information
    const taxSubtotal = line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.[0];
    let taxRate = 0;
    let taxAmount = 0;

    if (taxSubtotal) {
      taxRate = parseFloat(this.extractText(taxSubtotal, 'cac:TaxCategory/cbc:Percent') || '0');
      taxAmount = parseFloat(this.extractText(taxSubtotal, 'cbc:TaxAmount') || '0');
    }

    // Extract discount information
    const allowanceCharge = line['cac:AllowanceCharge']?.find((ac: any) => 
      this.extractText(ac, 'cbc:ChargeIndicator') === 'false'
    );
    
    let discountRate = 0;
    let discountAmount = 0;

    if (allowanceCharge) {
      discountRate = parseFloat(this.extractText(allowanceCharge, 'cbc:MultiplierFactorNumeric') || '0') * 100;
      discountAmount = parseFloat(this.extractText(allowanceCharge, 'cbc:Amount') || '0');
    }

    return {
      line_number: lineNumber,
      item_code: itemCode,
      description,
      quantity,
      unit_of_measure: unitOfMeasure,
      unit_price: unitPrice,
      line_total: lineTotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_rate: discountRate,
      discount_amount: discountAmount,
    };
  }

  private extractText(obj: any, path: string): string | undefined {
    const parts = path.split('/');
    let current = obj;

    for (const part of parts) {
      if (part.includes('@')) {
        // Handle attributes
        const [element, attr] = part.split('@');
        if (element) {
          current = current?.[element]?.[0];
        }
        return current?.$?.[attr];
      } else {
        current = current?.[part];
        if (Array.isArray(current)) {
          current = current[0];
        }
      }
      
      if (current === undefined || current === null) {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : current?.toString();
  }
}

export const ublParser = new UBLParser();