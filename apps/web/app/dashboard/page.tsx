import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Skeleton } from '@kit/ui/skeleton';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calculator,
  Users
} from 'lucide-react';
import { withI18n } from '~/lib/i18n/with-i18n';

// Mock data - in production this would come from the database
const mockStats = {
  totalInvoices: 1856,
  totalAmount: 2280000000,
  totalTaxes: 433200000,
  processedToday: 45,
  averageProcessingTime: 8.5,
  automationRate: 0.94,
  errorRate: 0.03,
  statusBreakdown: {
    queued: 12,
    processing: 5,
    readyForReview: 23,
    approved: 1780,
    exported: 1642
  }
};

function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground">
          Resumen del procesamiento de facturas y métricas financieras
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Este Mes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalInvoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{mockStats.processedToday} hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(mockStats.totalAmount / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              COP {mockStats.totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Impuestos Calculados
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(mockStats.totalTaxes / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {((mockStats.totalTaxes / mockStats.totalAmount) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Automatización
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(mockStats.automationRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo promedio: {mockStats.averageProcessingTime} min
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Procesamiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">En Cola</span>
                </div>
                <Badge variant="outline">{mockStats.statusBreakdown.queued}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm">Procesando</span>
                </div>
                <Badge variant="outline">{mockStats.statusBreakdown.processing}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Pendiente Revisión</span>
                </div>
                <Badge variant="secondary">{mockStats.statusBreakdown.readyForReview}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Aprobadas</span>
                </div>
                <Badge variant="default">{mockStats.statusBreakdown.approved}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Exportadas</span>
                </div>
                <Badge variant="outline">{mockStats.statusBreakdown.exported}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Lote de 45 facturas procesado</p>
                  <p className="text-muted-foreground">Hace 2 minutos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Exportación completada a Siigo</p>
                  <p className="text-muted-foreground">Hace 15 minutos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">12 facturas requieren revisión</p>
                  <p className="text-muted-foreground">Hace 1 hora</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Nuevo usuario agregado al equipo</p>
                  <p className="text-muted-foreground">Hace 3 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tiempo de Procesamiento</span>
                <span className="font-medium">{mockStats.averageProcessingTime} min</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div 
                  className="h-2 bg-green-500 rounded-full transition-all"
                  style={{ width: '85%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;10 min
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tasa de Automatización</span>
                <span className="font-medium">{(mockStats.automationRate * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${mockStats.automationRate * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &gt;95%
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tasa de Error</span>
                <span className="font-medium">{(mockStats.errorRate * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full">
                <div 
                  className="h-2 bg-red-500 rounded-full transition-all"
                  style={{ width: `${mockStats.errorRate * 100 * 10}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;5%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withI18n(DashboardPage);