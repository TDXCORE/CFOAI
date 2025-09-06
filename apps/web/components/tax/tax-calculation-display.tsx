'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Separator } from '@kit/ui/separator';
import { 
  Calculator,
  AlertTriangle,
  Info,
  CheckCircle,
  Edit,
  FileText
} from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface TaxCalculation {
  id: string;
  iva_rate: number;
  iva_amount: number;
  iva_base_amount: number;
  reteiva_rate: number;
  reteiva_amount: number;
  retefuente_rate: number;
  retefuente_amount: number;
  retefuente_concept?: string;
  ica_rate: number;
  ica_amount: number;
  ica_city_code?: string;
  total_tax_amount: number;
  total_retention_amount: number;
  net_amount: number;
  calculation_rules?: string[];
  calculation_warnings?: string[];
  status: 'computed' | 'reviewed' | 'approved' | 'rejected';
}

interface TaxCalculationDisplayProps {
  calculation: TaxCalculation;
  invoiceSubtotal: number;
  currencyCode?: string;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  readonly?: boolean;
}

export function TaxCalculationDisplay({
  calculation,
  invoiceSubtotal,
  currencyCode = 'COP',
  onEdit,
  onApprove,
  onReject,
  readonly = false
}: TaxCalculationDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      computed: 'outline',
      reviewed: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    } as const;

    const labels = {
      computed: 'Calculado',
      reviewed: 'Revisado', 
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getCityName = (cityCode: string) => {
    const cities: Record<string, string> = {
      '11001': 'Bogotá D.C.',
      '05001': 'Medellín',
      '76001': 'Cali',
      '08001': 'Barranquilla',
      '13001': 'Cartagena',
    };
    return cities[cityCode] || cityCode;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Cálculo de Impuestos</CardTitle>
              <CardDescription>
                Impuestos colombianos calculados automáticamente
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(calculation.status)}
            {!readonly && onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Base Amounts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Base de Cálculo</h3>
          <div className="flex justify-between text-lg font-semibold">
            <span>Subtotal Factura:</span>
            <span>{formatCurrency(invoiceSubtotal)}</span>
          </div>
        </div>

        {/* Tax Details */}
        <div className="space-y-4">
          {/* IVA */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">IVA (Impuesto al Valor Agregado)</h4>
              <Badge variant="outline">{formatPercentage(calculation.iva_rate)}</Badge>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Base gravable:</span>
                <span>{formatCurrency(calculation.iva_base_amount)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-900">
                <span>IVA calculado:</span>
                <span className="text-green-600">{formatCurrency(calculation.iva_amount)}</span>
              </div>
            </div>
          </div>

          {/* ReteIVA */}
          {calculation.reteiva_amount > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">ReteIVA (Retención de IVA)</h4>
                <Badge variant="outline">{formatPercentage(calculation.reteiva_rate)}</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Base (IVA):</span>
                  <span>{formatCurrency(calculation.iva_amount)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900">
                  <span>ReteIVA:</span>
                  <span className="text-red-600">-{formatCurrency(calculation.reteiva_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ReteFuente */}
          {calculation.retefuente_amount > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">ReteFuente (Retención en la Fuente)</h4>
                <Badge variant="outline">{formatPercentage(calculation.retefuente_rate)}</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {calculation.retefuente_concept && (
                  <div className="flex justify-between">
                    <span>Concepto:</span>
                    <span className="font-medium">{calculation.retefuente_concept}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Base gravable:</span>
                  <span>{formatCurrency(invoiceSubtotal)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900">
                  <span>ReteFuente:</span>
                  <span className="text-red-600">-{formatCurrency(calculation.retefuente_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ICA */}
          {calculation.ica_amount > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">ICA (Impuesto de Industria y Comercio)</h4>
                <Badge variant="outline">{(calculation.ica_rate * 1000).toFixed(2)} x mil</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {calculation.ica_city_code && (
                  <div className="flex justify-between">
                    <span>Ciudad:</span>
                    <span className="font-medium">{getCityName(calculation.ica_city_code)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Base gravable:</span>
                  <span>{formatCurrency(invoiceSubtotal)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900">
                  <span>ICA:</span>
                  <span className="text-green-600">{formatCurrency(calculation.ica_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoiceSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span>Total Impuestos:</span>
            <span>+{formatCurrency(calculation.total_tax_amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>Total Retenciones:</span>
            <span>-{formatCurrency(calculation.total_retention_amount)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-semibold text-gray-900">
            <span>Total Neto:</span>
            <span>{formatCurrency(calculation.net_amount)}</span>
          </div>
        </div>

        {/* Warnings */}
        {calculation.calculation_warnings && calculation.calculation_warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Advertencias</span>
            </div>
            <ul className="space-y-1 text-sm text-yellow-700">
              {calculation.calculation_warnings.map((warning, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span>•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Applied Rules */}
        {calculation.calculation_rules && calculation.calculation_rules.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Reglas Aplicadas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {calculation.calculation_rules.map((rule, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {rule}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!readonly && calculation.status === 'computed' && (onApprove || onReject) && (
          <div className="flex space-x-2 pt-4 border-t">
            {onApprove && (
              <Button onClick={onApprove} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar Cálculo
              </Button>
            )}
            {onReject && (
              <Button onClick={onReject} variant="destructive" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Rechazar y Revisar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}