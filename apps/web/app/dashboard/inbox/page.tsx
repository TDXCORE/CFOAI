import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { FileText, Calendar, User, DollarSign, Clock, Eye } from 'lucide-react';
import { withI18n } from '~/lib/i18n/with-i18n';

// Mock data - in production this would come from the database
const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'FV-2024-001',
    supplierName: 'Proveedor ABC S.A.S.',
    supplierNit: '900123456',
    totalAmount: 1190000,
    issueDate: '2024-01-15',
    status: 'ready_for_review' as const,
    needsReview: true,
    confidenceScore: 0.85,
  },
  {
    id: '2',
    invoiceNumber: 'NC-2024-002',
    supplierName: 'Servicios XYZ Ltda.',
    supplierNit: '800654321',
    totalAmount: 2380000,
    issueDate: '2024-01-15',
    status: 'calculated' as const,
    needsReview: false,
    confidenceScore: 0.96,
  },
  {
    id: '3',
    invoiceNumber: 'FV-2024-003',
    supplierName: 'Consultoría DEF',
    supplierNit: '700987654',
    totalAmount: 856000,
    issueDate: '2024-01-14',
    status: 'parsing' as const,
    needsReview: false,
    confidenceScore: null,
  },
];

const getStatusBadge = (status: string, needsReview: boolean) => {
  if (needsReview) {
    return <Badge variant="destructive">Requiere Revisión</Badge>;
  }
  
  switch (status) {
    case 'parsing':
      return <Badge variant="outline">Procesando</Badge>;
    case 'calculated':
      return <Badge variant="default">Calculado</Badge>;
    case 'ready_for_review':
      return <Badge variant="secondary">Listo para Revisar</Badge>;
    case 'approved':
      return <Badge variant="default">Aprobado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getConfidenceColor = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.8) return 'text-yellow-600';
  return 'text-red-600';
};

function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bandeja de Entrada</h1>
          <p className="text-muted-foreground">
            Facturas procesadas y pendientes de revisión
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {mockInvoices.length} facturas
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {mockInvoices.filter(i => i.needsReview).length} requieren revisión
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Todos</Button>
            <Button variant="outline" size="sm">Pendientes</Button>
            <Button variant="outline" size="sm">Requieren Revisión</Button>
            <Button variant="outline" size="sm">Aprobadas</Button>
            <Button variant="outline" size="sm">Hoy</Button>
            <Button variant="outline" size="sm">Esta Semana</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="space-y-4">
        {mockInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-muted-foreground">{invoice.supplierName}</p>
                  </div>
                </div>
                {getStatusBadge(invoice.status, invoice.needsReview)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">NIT</p>
                    <p className="font-medium">{invoice.supplierNit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Monto</p>
                    <p className="font-medium">
                      ${invoice.totalAmount.toLocaleString()} COP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-medium">
                      {new Date(invoice.issueDate).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Confianza</p>
                    <p className={`font-medium ${getConfidenceColor(invoice.confidenceScore)}`}>
                      {invoice.confidenceScore 
                        ? `${(invoice.confidenceScore * 100).toFixed(0)}%`
                        : 'Procesando...'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalle
                </Button>
                {invoice.needsReview && (
                  <Button size="sm">
                    Revisar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <Button variant="outline">
          Cargar Más Facturas
        </Button>
      </div>
    </div>
  );
}

export default withI18n(InboxPage);