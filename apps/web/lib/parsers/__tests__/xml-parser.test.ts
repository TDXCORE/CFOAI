import { UBLParser } from '../xml-parser';

describe('UBLParser', () => {
  let parser: UBLParser;

  beforeEach(() => {
    parser = new UBLParser();
  });

  const mockInvoiceXML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>FV001</cbc:ID>
  <cbc:UUID>12345678-1234-1234-1234-123456789012</cbc:UUID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:DueDate>2024-01-30</cbc:DueDate>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Proveedor Ejemplo S.A.S.</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Calle 123</cbc:StreetName>
        <cbc:CityName>Bogotá</cbc:CityName>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>123456789-1</cbc:CompanyID>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:Telephone>3001234567</cbc:Telephone>
        <cbc:ElectronicMail>info@ejemplo.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Cliente Ejemplo Ltda.</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Carrera 456</cbc:StreetName>
        <cbc:CityName>Medellín</cbc:CityName>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>987654321-2</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>1000000</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount>190000</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount>1190000</cbc:PayableAmount>
    <cbc:AllowanceTotalAmount>0</cbc:AllowanceTotalAmount>
  </cac:LegalMonetaryTotal>
  
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="UN">5</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount>1000000</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Servicios de consultoría</cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>SERV001</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount>200000</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cac:TaxSubtotal>
        <cbc:TaxAmount>190000</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>19</cbc:Percent>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>
</Invoice>`;

  const mockCreditNoteXML = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>NC001</cbc:ID>
  <cbc:UUID>12345678-5678-9012-3456-123456789012</cbc:UUID>
  <cbc:IssueDate>2024-01-16</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Proveedor Ejemplo S.A.S.</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>123456789</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Cliente Ejemplo Ltda.</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>987654321</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>500000</cbc:LineExtensionAmount>
    <cbc:PayableAmount>595000</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <cac:CreditNoteLine>
    <cbc:ID>1</cbc:ID>
    <cbc:CreditedQuantity unitCode="UN">1</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount>500000</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Devolución por servicio defectuoso</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount>500000</cbc:PriceAmount>
    </cac:Price>
  </cac:CreditNoteLine>
</CreditNote>`;

  describe('parseUBLInvoice', () => {
    it('should parse a standard Colombian UBL invoice correctly', async () => {
      const result = await parser.parseUBLInvoice(mockInvoiceXML);

      expect(result.invoice_number).toBe('FV001');
      expect(result.invoice_type).toBe('invoice');
      expect(result.cufe).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.issue_date).toBe('2024-01-15');
      expect(result.due_date).toBe('2024-01-30');

      // Supplier information
      expect(result.supplier.nit).toBe('123456789');
      expect(result.supplier.name).toBe('Proveedor Ejemplo S.A.S.');
      expect(result.supplier.address).toBe('Calle 123');
      expect(result.supplier.phone).toBe('3001234567');
      expect(result.supplier.email).toBe('info@ejemplo.com');

      // Buyer information
      expect(result.buyer.nit).toBe('987654321');
      expect(result.buyer.name).toBe('Cliente Ejemplo Ltda.');
      expect(result.buyer.address).toBe('Carrera 456');

      // Totals
      expect(result.totals.subtotal).toBe(1000000);
      expect(result.totals.tax_amount).toBe(190000);
      expect(result.totals.discount_amount).toBe(0);
      expect(result.totals.total_amount).toBe(1190000);
      expect(result.totals.currency_code).toBe('COP');

      // Line items
      expect(result.items).toHaveLength(1);
      expect(result.items[0].line_number).toBe(1);
      expect(result.items[0].item_code).toBe('SERV001');
      expect(result.items[0].description).toBe('Servicios de consultoría');
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].unit_price).toBe(200000);
      expect(result.items[0].line_total).toBe(1000000);
      expect(result.items[0].tax_rate).toBe(19);
      expect(result.items[0].tax_amount).toBe(190000);

      // Confidence should be high for complete document
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse a credit note correctly', async () => {
      const result = await parser.parseUBLInvoice(mockCreditNoteXML);

      expect(result.invoice_number).toBe('NC001');
      expect(result.invoice_type).toBe('credit_note');
      expect(result.cufe).toBe('12345678-5678-9012-3456-123456789012');
      expect(result.issue_date).toBe('2024-01-16');

      // Should have credit note line items
      expect(result.items).toHaveLength(1);
      expect(result.items[0].description).toBe('Devolución por servicio defectuoso');
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].line_total).toBe(500000);
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalXML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>FV002</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Minimal Supplier</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>123456789</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Minimal Customer</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>987654321</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>100000</cbc:LineExtensionAmount>
    <cbc:PayableAmount>119000</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

      const result = await parser.parseUBLInvoice(minimalXML);

      expect(result.invoice_number).toBe('FV002');
      expect(result.cufe).toBeUndefined();
      expect(result.due_date).toBeUndefined();
      expect(result.supplier.address).toBeUndefined();
      expect(result.supplier.phone).toBeUndefined();
      expect(result.supplier.email).toBeUndefined();
      expect(result.items).toHaveLength(0);

      // Confidence should be lower due to missing fields
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should throw error for invalid XML', async () => {
      const invalidXML = 'not xml at all';

      await expect(parser.parseUBLInvoice(invalidXML)).rejects.toThrow('Failed to parse UBL XML');
    });

    it('should throw error for missing required fields', async () => {
      const invalidInvoiceXML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <!-- Missing required ID and IssueDate -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Test Supplier</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
</Invoice>`;

      await expect(parser.parseUBLInvoice(invalidInvoiceXML)).rejects.toThrow('Missing required invoice data');
    });

    it('should throw error for unrecognized document type', async () => {
      const unrecognizedXML = `<?xml version="1.0" encoding="UTF-8"?>
<UnknownDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:Unknown-2">
  <cbc:ID>TEST001</cbc:ID>
</UnknownDocument>`;

      await expect(parser.parseUBLInvoice(unrecognizedXML)).rejects.toThrow('Document type not recognized');
    });

    it('should calculate tax amount when not directly provided', async () => {
      const xmlWithoutTax = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>FV003</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Test Supplier</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>123456789</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Test Customer</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>987654321</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>1000000</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount>0</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount>1190000</cbc:PayableAmount>
    <cbc:AllowanceTotalAmount>50000</cbc:AllowanceTotalAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

      const result = await parser.parseUBLInvoice(xmlWithoutTax);

      // Should calculate: total - subtotal + discount = 1190000 - 1000000 + 50000 = 240000
      expect(result.totals.tax_amount).toBe(240000);
    });
  });

  describe('extractText', () => {
    it('should handle nested paths correctly', () => {
      const testObject = {
        'cac:Party': [{
          'cbc:Name': ['Test Name'],
          'cac:Address': [{
            'cbc:Street': ['Test Street']
          }]
        }]
      };

      const result = (parser as any).extractText(testObject, 'cac:Party/cbc:Name');
      expect(result).toBe('Test Name');

      const nestedResult = (parser as any).extractText(testObject, 'cac:Party/cac:Address/cbc:Street');
      expect(nestedResult).toBe('Test Street');
    });

    it('should handle attributes correctly', () => {
      const testObject = {
        'cbc:Quantity': [{
          $: { unitCode: 'UN' },
          _: '5'
        }]
      };

      const result = (parser as any).extractText(testObject, 'cbc:Quantity/@unitCode');
      expect(result).toBe('UN');
    });

    it('should return undefined for non-existent paths', () => {
      const testObject = {
        'cac:Party': [{
          'cbc:Name': ['Test Name']
        }]
      };

      const result = (parser as any).extractText(testObject, 'cac:NonExistent/cbc:Field');
      expect(result).toBeUndefined();
    });
  });
});