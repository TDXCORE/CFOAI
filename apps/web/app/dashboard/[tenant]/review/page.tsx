'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { TaxCalculationDisplay } from '~/components/tax/tax-calculation-display';
import { 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  FileText,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { withI18n } from '~/lib/i18n/with-i18n';

interface ReviewInvoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_nit: string;
  issue_date: string;
  total_amount: number;
  currency_code: string;
  confidence_score: number;
  needs_review: boolean;
  status: 'parsed' | 'classified' | 'ready_for_review' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high';
  files: {
    id: string;
    original_filename: string;
    storage_path: string;
  };
  classifications: {
    id: string;
    expense_kind: string;
    expense_category: string;
    confidence_score: number;
    is_large_taxpayer: boolean | null;
  };
  tax_calculations: {
    id: string;
    iva_amount: number;
    total_tax_amount: number;
    total_retention_amount: number;
    net_amount: number;
    status: string;
  };
}

function ReviewPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  
  const [invoices, setInvoices] = useState<ReviewInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<ReviewInvoice | null>(null);
  const [filters, setFilters] = useState({
    status: 'ready_for_review',
    priority: '',
    search: '',
    needsReview: 'true',
  });

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.needsReview) {
        params.append('needsReview', filters.needsReview);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      params.append('sortBy', 'created_at');
      params.append('sortOrder', 'desc');
      params.append('limit', '50');

      const response = await fetch(`/${tenantSlug}/api/invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      setInvoices(data.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignInvoice = async (invoiceId: string, userId?: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: userId,
          status: 'under_review',
        }),
      });

      if (response.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error assigning invoice:', error);
    }
  };

  const approveInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Approved via review interface',
        }),
      });

      if (response.ok) {
        fetchInvoices();
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const rejectInvoice = async (invoiceId: string, reason: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/invoices/${invoiceId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          notes: 'Rejected via review interface',
        }),
      });

      if (response.ok) {
        fetchInvoices();
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error('Error rejecting invoice:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    } as const;

    const labels = {
      high: 'Alta',
      medium: 'Media', 
      low: 'Baja',
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string, needsReview: boolean) => {
    if (needsReview) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Requiere Revisión</Badge>;
    }

    const variants = {
      ready_for_review: 'outline',
      under_review: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    } as const;

    const labels = {
      ready_for_review: 'Listo para Revisar',
      under_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando facturas para revisión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisión de Facturas</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba facturas procesadas automáticamente
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ready_for_review">Listo para Revisar</SelectItem>
                  <SelectItem value="under_review">En Revisión</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Requiere Revisión</label>
              <Select 
                value={filters.needsReview} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, needsReview: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select 
                value={filters.priority} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número, proveedor..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Facturas ({invoices.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">¡Todo al día!</p>
                <p className="text-muted-foreground">No hay facturas pendientes de revisión</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                      selectedInvoice?.id === invoice.id && "border-blue-500 bg-blue-50"
                    )}
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">{invoice.supplier_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${invoice.total_amount.toLocaleString('es-CO')} {invoice.currency_code}
                        </p>
                        <p className={cn(
                          "text-sm",
                          getConfidenceColor(invoice.confidence_score)
                        )}>
                          {Math.round(invoice.confidence_score * 100)}% confianza
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {getStatusBadge(invoice.status, invoice.needs_review)}
                        {getPriorityBadge(invoice.priority)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(invoice.issue_date).toLocaleDateString('es-CO')}</span>
                      </div>
                    </div>

                    {invoice.confidence_score < 0.7 && (
                      <div className="mt-2 flex items-center space-x-2 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Baja confianza - Revisión recomendada</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <div>
          {selectedInvoice ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedInvoice.invoice_number}</CardTitle>
                      <CardDescription>
                        {selectedInvoice.supplier_name} • {selectedInvoice.supplier_nit}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      {selectedInvoice.status === 'ready_for_review' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => assignInvoice(selectedInvoice.id, 'current-user')}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Asignar a mí
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Documento
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Información General</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Fecha:</span> {new Date(selectedInvoice.issue_date).toLocaleDateString('es-CO')}</p>
                        <p><span className="font-medium">Total:</span> ${selectedInvoice.total_amount.toLocaleString('es-CO')}</p>
                        <p><span className="font-medium">Confianza:</span> 
                          <span className={getConfidenceColor(selectedInvoice.confidence_score)}>
                            {" "}{Math.round(selectedInvoice.confidence_score * 100)}%
                          </span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Clasificación</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Tipo:</span> {selectedInvoice.classifications?.expense_kind}</p>
                        <p><span className="font-medium">Categoría:</span> {selectedInvoice.classifications?.expense_category}</p>
                        <p><span className="font-medium">Gran Contribuyente:</span> {
                          selectedInvoice.classifications?.is_large_taxpayer === true ? 'Sí' : 
                          selectedInvoice.classifications?.is_large_taxpayer === false ? 'No' : 'No determinado'
                        }</p>
                      </div>
                    </div>
                  </div>

                  {selectedInvoice.status === 'under_review' && (
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        onClick={() => approveInvoice(selectedInvoice.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button 
                        onClick={() => rejectInvoice(selectedInvoice.id, 'Requiere corrección')}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tax Calculation */}
              {selectedInvoice.tax_calculations && (
                <TaxCalculationDisplay
                  calculation={selectedInvoice.tax_calculations as any}
                  invoiceSubtotal={selectedInvoice.total_amount}
                  currencyCode={selectedInvoice.currency_code}
                  onApprove={() => approveInvoice(selectedInvoice.id)}
                  onReject={() => rejectInvoice(selectedInvoice.id, 'Cálculo incorrecto')}
                  readonly={selectedInvoice.status !== 'under_review'}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Selecciona una factura</p>
                  <p className="text-muted-foreground">Elige una factura de la lista para ver los detalles</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default withI18n(ReviewPage);