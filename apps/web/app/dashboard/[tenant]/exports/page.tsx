'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Calendar } from '@kit/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Checkbox } from '@kit/ui/checkbox';
import { Textarea } from '@kit/ui/textarea';
import { 
  Download,
  FileText,
  Calendar as CalendarIcon,
  Settings,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Filter
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { withI18n } from '~/lib/i18n/with-i18n';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  system: string;
  format: string;
}

interface ExportRecord {
  id: string;
  template_id: string;
  file_name: string;
  record_count: number;
  file_size: number;
  status: 'completed' | 'processing' | 'failed';
  generated_at: string;
  created_by: string;
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface ExportFilters {
  status?: string[];
  supplier_nit?: string;
  expense_category?: string;
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'siigo_csv',
    name: 'Siigo CSV',
    description: 'Formato estándar para importación en Siigo',
    system: 'Siigo',
    format: 'CSV',
  },
  {
    id: 'world_office_json',
    name: 'World Office JSON',
    description: 'Formato JSON para World Office',
    system: 'World Office',
    format: 'JSON',
  },
  {
    id: 'sap_xml',
    name: 'SAP XML',
    description: 'Formato XML para integración SAP',
    system: 'SAP',
    format: 'XML',
  },
];

function ExportsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [filters, setFilters] = useState<ExportFilters>({});
  const [fileName, setFileName] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  
  const fetchExports = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/exports?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setExports(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const createExport = async () => {
    if (!selectedTemplate) return;
    
    setCreating(true);
    try {
      const exportData = {
        templateId: selectedTemplate,
        invoiceIds: selectedInvoices,
        dateRange: dateRange.from && dateRange.to ? {
          from: format(dateRange.from, 'yyyy-MM-dd'),
          to: format(dateRange.to, 'yyyy-MM-dd'),
        } : undefined,
        filters,
        fileName: fileName || undefined,
      };
      
      const response = await fetch(`/${tenantSlug}/api/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });
      
      if (response.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchExports();
      } else {
        const error = await response.json();
        console.error('Export creation failed:', error);
      }
    } catch (error) {
      console.error('Error creating export:', error);
    } finally {
      setCreating(false);
    }
  };

  const downloadExport = async (exportId: string, fileName: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/exports/${exportId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading export:', error);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setDateRange({});
    setFilters({});
    setFileName('');
    setSelectedInvoices([]);
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      processing: 'secondary',
      failed: 'destructive',
    } as const;

    const labels = {
      completed: 'Completado',
      processing: 'Procesando',
      failed: 'Error',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status as keyof typeof labels] || status}</span>
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Download className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Cargando exportaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportaciones</h1>
          <p className="text-muted-foreground">
            Exporta facturas a sistemas contables
          </p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)} size="lg">
          <Download className="h-4 w-4 mr-2" />
          Nueva Exportación
        </Button>
      </div>

      {/* Export Templates */}
      <div className="grid gap-4 md:grid-cols-3">
        {EXPORT_TEMPLATES.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="outline">{template.format}</Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{template.system}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowCreateForm(true);
                  }}
                >
                  Usar Plantilla
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Export Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Exportación</CardTitle>
            <CardDescription>
              Configura los parámetros para generar el archivo de exportación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Plantilla de Exportación</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.format})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Name */}
              <div className="space-y-2">
                <Label>Nombre del Archivo (Opcional)</Label>
                <Input
                  placeholder="Dejarlo vacío para nombre automático"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, 'PPP', { locale: es }) : 'Fecha desde'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, 'PPP', { locale: es }) : 'Fecha hasta'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>NIT Proveedor (Opcional)</Label>
                <Input
                  placeholder="Filtrar por NIT específico"
                  value={filters.supplier_nit || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, supplier_nit: e.target.value || undefined }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría de Gasto (Opcional)</Label>
                <Select
                  value={filters.expense_category || ''}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, expense_category: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    <SelectItem value="office_supplies">Útiles de Oficina</SelectItem>
                    <SelectItem value="professional_services">Servicios Profesionales</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="utilities">Servicios Públicos</SelectItem>
                    <SelectItem value="inventory">Inventario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4 border-t">
              <Button onClick={createExport} disabled={creating || !selectedTemplate}>
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generar Exportación
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial de Exportaciones</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchExports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No hay exportaciones</h3>
              <p className="text-muted-foreground mb-6">
                Las exportaciones generadas aparecerán aquí
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Download className="h-4 w-4 mr-2" />
                Crear Primera Exportación
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exportRecord) => (
                <div
                  key={exportRecord.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium">{exportRecord.file_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{exportRecord.record_count} registros</span>
                        <span>{formatFileSize(exportRecord.file_size)}</span>
                        <span>{new Date(exportRecord.generated_at).toLocaleString('es-CO')}</span>
                        {exportRecord.profiles && (
                          <span>por {exportRecord.profiles.display_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(exportRecord.status)}
                    
                    {exportRecord.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadExport(exportRecord.id, exportRecord.file_name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withI18n(ExportsPage);