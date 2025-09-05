'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { 
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Activity,
  BarChart3,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { withI18n } from '~/lib/i18n/with-i18n';

interface DashboardStats {
  // Processing metrics
  totalInvoices: number;
  processedToday: number;
  averageProcessingTime: number;
  successRate: number;
  
  // Financial metrics
  totalAmount: number;
  totalTaxes: number;
  totalRetentions: number;
  avgInvoiceAmount: number;
  
  // Review metrics
  pendingReview: number;
  approvedToday: number;
  rejectedToday: number;
  averageConfidence: number;
  
  // Recent activity
  recentInvoices: {
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    status: string;
    confidence_score: number;
    created_at: string;
  }[];
  
  // Status distribution
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  
  // Monthly trends
  monthlyData: {
    month: string;
    invoices: number;
    amount: number;
  }[];
}

function DashboardPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/dashboard/stats?period=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'text-green-600 bg-green-50',
      ready_for_review: 'text-yellow-600 bg-yellow-50',
      under_review: 'text-blue-600 bg-blue-50',
      rejected: 'text-red-600 bg-red-50',
      processing: 'text-purple-600 bg-purple-50',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Cargando métricas del dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg text-gray-600">No se pudieron cargar las métricas</p>
        <Button onClick={fetchDashboardStats} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard CFO AI</h1>
          <p className="text-muted-foreground">
            Vista general del procesamiento de facturas
          </p>
        </div>
        
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map((period) => (
            <Button
              key={period}
              variant={timeRange === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(period)}
            >
              {period === '7d' ? '7 días' : period === '30d' ? '30 días' : '90 días'}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Totales</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-flex items-center">
                {stats.processedToday > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                    +{stats.processedToday} hoy
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Sin procesar hoy
                  </>
                )}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(stats.avgInvoiceAmount)} por factura
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Tiempo promedio: {formatDuration(stats.averageProcessingTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Revisión</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              Confianza promedio: {(stats.averageConfidence * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Distribución por Estado</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getStatusColor(item.status).split(' ')[1]
                    )} />
                    <span className="text-sm capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{item.count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Resumen Financiero</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Subtotal Facturas</span>
                <span className="font-medium">{formatCurrency(stats.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-green-600">+ Impuestos (IVA, ICA)</span>
                <span className="font-medium text-green-600">+{formatCurrency(stats.totalTaxes)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-red-600">- Retenciones</span>
                <span className="font-medium text-red-600">-{formatCurrency(stats.totalRetentions)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-medium">Total Neto</span>
                <span className="text-lg font-bold">
                  {formatCurrency(stats.totalAmount + stats.totalTaxes - stats.totalRetentions)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Actividad Reciente</span>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href={`/${tenantSlug}/invoices`}>
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-muted-foreground">No hay facturas recientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{invoice.supplier_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(invoice.confidence_score * 100)}% confianza
                      </p>
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(invoice.status)}
                    >
                      {invoice.status.replace('_', ' ')}
                    </Badge>
                    
                    <div className="text-xs text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Accesos directos a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href={`/${tenantSlug}/upload`}>
                <FileText className="h-6 w-6" />
                <span>Subir Facturas</span>
              </a>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href={`/${tenantSlug}/review`}>
                <CheckCircle className="h-6 w-6" />
                <span>Revisar Pendientes</span>
                {stats.pendingReview > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {stats.pendingReview}
                  </Badge>
                )}
              </a>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href={`/${tenantSlug}/exports`}>
                <BarChart3 className="h-6 w-6" />
                <span>Exportar Datos</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withI18n(DashboardPage);