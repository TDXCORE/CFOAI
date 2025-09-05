// CFO AI OpenAI Integration
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Classification prompt template for Colombian invoices
export const CLASSIFICATION_PROMPT = `
Eres un analista fiscal colombiano especializado en clasificación de facturas. Tu trabajo es analizar facturas y clasificarlas según las regulaciones fiscales colombianas.

Analiza la siguiente información de factura y devuelve una respuesta JSON con la clasificación exacta:

INFORMACIÓN DE LA FACTURA:
{invoice_data}

CONTEXTO DEL CLIENTE:
- País: Colombia
- Régimen fiscal: {tax_regime}
- Ciudad por defecto: {default_city}

Debes clasificar la factura en las siguientes categorías:

1. TIPO DE GASTO (expense_kind):
   - "goods": Bienes tangibles, inventario, materias primas
   - "services": Servicios profesionales, consultorías, servicios técnicos
   - "professional_fees": Honorarios profesionales (abogados, médicos, arquitectos, etc.)

2. GRAN CONTRIBUYENTE (is_large_taxpayer):
   - true: Si el proveedor es gran contribuyente
   - false: Si no es gran contribuyente  
   - null: Si no se puede determinar

3. CÓDIGO DE CIUDAD (city_code):
   - Código DANE de 5 dígitos de la ciudad donde se genera el ICA
   - Ejemplos: "11001" (Bogotá), "05001" (Medellín), "76001" (Cali)

4. CATEGORÍA DE GASTO (expense_category):
   - Una categoría específica como: "office_supplies", "professional_services", "inventory", "maintenance", "utilities", etc.

5. CONFIANZA (confidence):
   - Un valor entre 0.0 y 1.0 que indica tu confianza en la clasificación

6. JUSTIFICACIÓN (rationale):
   - Explicación breve (máximo 200 caracteres) de por qué clasificaste así

DEVUELVE SOLO JSON EN ESTE FORMATO EXACTO:
{
  "expense_kind": "goods|services|professional_fees",
  "is_large_taxpayer": true|false|null,
  "city_code": "código_dane_5_digitos",
  "expense_category": "categoría_específica",
  "confidence": 0.0-1.0,
  "rationale": "explicación breve"
}
`;

// OCR prompt template for PDF/image processing
export const OCR_PROMPT = `
Eres un experto en extracción de datos de facturas colombianas. Analiza esta imagen de factura y extrae toda la información estructurada.

Debes extraer los siguientes campos de manera precisa:

INFORMACIÓN BÁSICA:
- Número de factura
- Fecha de emisión
- Fecha de vencimiento (si aplica)
- CUFE (Código Único de Facturación Electrónica) si es visible

PROVEEDOR:
- NIT (sin dígito de verificación)
- Nombre/Razón social
- Dirección
- Ciudad
- Teléfono
- Email

COMPRADOR:
- NIT (sin dígito de verificación)  
- Nombre/Razón social
- Dirección
- Ciudad

TOTALES FINANCIEROS:
- Subtotal (antes de impuestos)
- IVA total
- Descuentos (si aplica)
- Total final
- Moneda (normalmente COP)

ÍTEMS (máximo 10):
Para cada ítem de la factura:
- Descripción del producto/servicio
- Cantidad
- Precio unitario
- Total por línea

NIVEL DE CONFIANZA:
- Un valor entre 0.0 y 1.0 indicando qué tan seguro estás de la extracción

DEVUELVE SOLO JSON EN ESTE FORMATO:
{
  "invoice_number": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD o null",
  "cufe": "string o null",
  "supplier": {
    "nit": "string",
    "name": "string", 
    "address": "string o null",
    "city": "string o null",
    "phone": "string o null",
    "email": "string o null"
  },
  "buyer": {
    "nit": "string",
    "name": "string",
    "address": "string o null", 
    "city": "string o null"
  },
  "totals": {
    "subtotal": number,
    "tax_amount": number,
    "discount_amount": number,
    "total_amount": number,
    "currency_code": "COP"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "line_total": number
    }
  ],
  "confidence": 0.0-1.0
}
`;

export interface ClassificationResult {
  expense_kind: 'goods' | 'services' | 'professional_fees';
  is_large_taxpayer: boolean | null;
  city_code: string;
  expense_category: string;
  confidence: number;
  rationale: string;
}

export interface OCRResult {
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  cufe?: string;
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
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  confidence: number;
}

export async function classifyInvoice(
  invoiceData: any,
  context: {
    tax_regime?: string;
    default_city?: string;
  } = {}
): Promise<ClassificationResult> {
  try {
    const prompt = CLASSIFICATION_PROMPT
      .replace('{invoice_data}', JSON.stringify(invoiceData, null, 2))
      .replace('{tax_regime}', context.tax_regime || 'Régimen Ordinario')
      .replace('{default_city}', context.default_city || 'Bogotá');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto analista fiscal colombiano. Devuelves únicamente JSON válido sin texto adicional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as ClassificationResult;
    
    // Validate required fields
    if (!result.expense_kind || !result.city_code || result.confidence === undefined) {
      throw new Error('Invalid classification response format');
    }

    return result;
  } catch (error) {
    console.error('OpenAI classification error:', error);
    throw new Error(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  try {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en extracción de datos de facturas colombianas. Devuelves únicamente JSON válido sin texto adicional.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: OCR_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI Vision');
    }

    const result = JSON.parse(content) as OCRResult;
    
    // Validate required fields
    if (!result.invoice_number || !result.supplier?.nit || !result.totals?.total_amount) {
      throw new Error('Invalid OCR response format - missing required fields');
    }

    return result;
  } catch (error) {
    console.error('OpenAI OCR error:', error);
    throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function explainTaxCalculation(
  invoiceData: any,
  taxCalculation: any,
  appliedRules: any[]
): Promise<string> {
  try {
    const prompt = `
Como experto fiscal colombiano, explica de manera clara y concisa cómo se calcularon los impuestos para esta factura:

FACTURA:
${JSON.stringify(invoiceData, null, 2)}

CÁLCULO DE IMPUESTOS:
${JSON.stringify(taxCalculation, null, 2)}

REGLAS APLICADAS:
${JSON.stringify(appliedRules, null, 2)}

Proporciona una explicación en español, paso a paso, que un contador pueda entender fácilmente. 
Incluye las bases de cálculo, tasas aplicadas y cualquier consideración especial.
Máximo 500 caracteres.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto contador colombiano que explica cálculos fiscales de manera clara y concisa.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'No se pudo generar explicación';
  } catch (error) {
    console.error('OpenAI explanation error:', error);
    return 'Error al generar explicación del cálculo fiscal';
  }
}