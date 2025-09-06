'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Switch } from '@kit/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { 
  Mail,
  CheckCircle,
  AlertTriangle,
  Settings,
  Trash2,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  User,
  Folder,
  Clock
} from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface OutlookIntegration {
  id: string;
  user_email: string;
  user_display_name: string;
  status: 'active' | 'expired' | 'disconnected';
  connected_at: string;
  expires_at: string;
  last_sync: string;
  subscription_id?: string;
  selected_folders: string[];
  sync_enabled: boolean;
  auto_process: boolean;
}

interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  totalItemCount: number;
  unreadItemCount: number;
}

interface EmailMessage {
  id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  received_at: string;
  has_attachments: boolean;
  processed: boolean;
  status: string;
}

function OutlookIntegrationPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  
  const [integration, setIntegration] = useState<OutlookIntegration | null>(null);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchIntegration = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook`);
      if (response.ok) {
        const data = await response.json();
        setIntegration(data.data);
      }
    } catch (error) {
      console.error('Error fetching integration:', error);
    }
  };

  const fetchFolders = async () => {
    if (!integration) return;
    
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/folders`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/messages?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const connectOutlook = async () => {
    setConnecting(true);
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/auth`);
      if (response.ok) {
        const data = await response.json();
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectOutlook = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIntegration(null);
        setFolders([]);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
    }
  };

  const updateFolderSelection = async (folderId: string, selected: boolean) => {
    if (!integration) return;
    
    const updatedFolders = selected
      ? [...integration.selected_folders, folderId]
      : integration.selected_folders.filter(id => id !== folderId);
    
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_folders: updatedFolders,
        }),
      });
      
      if (response.ok) {
        setIntegration({
          ...integration,
          selected_folders: updatedFolders,
        });
      }
    } catch (error) {
      console.error('Error updating folder selection:', error);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/sync`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchMessages();
        await fetchIntegration();
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const updateAutoProcess = async (enabled: boolean) => {
    if (!integration) return;
    
    try {
      const response = await fetch(`/${tenantSlug}/api/integrations/outlook/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_process: enabled,
        }),
      });
      
      if (response.ok) {
        setIntegration({
          ...integration,
          auto_process: enabled,
        });
      }
    } catch (error) {
      console.error('Error updating auto-process setting:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchIntegration();
      setLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (integration?.status === 'active') {
      fetchFolders();
      fetchMessages();
    }
  }, [integration]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      expired: 'destructive',
      disconnected: 'secondary',
    } as const;

    const icons = {
      active: CheckCircle,
      expired: AlertTriangle,
      disconnected: AlertTriangle,
    };

    const labels = {
      active: 'Conectado',
      expired: 'Token Expirado',
      disconnected: 'Desconectado',
    };

    const Icon = icons[status as keyof typeof icons] || AlertTriangle;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        <Icon className="h-3 w-3 mr-1" />
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Mail className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Cargando integración de Outlook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integración Outlook</h1>
        <p className="text-muted-foreground">
          Procesa automáticamente facturas recibidas por email
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Microsoft Outlook</CardTitle>
                <CardDescription>
                  {integration ? 'Configuración activa' : 'No configurado'}
                </CardDescription>
              </div>
            </div>
            {integration && getStatusBadge(integration.status)}
          </div>
        </CardHeader>
        <CardContent>
          {!integration ? (
            <div className="text-center py-8">
              <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Conectar Outlook</h3>
              <p className="text-muted-foreground mb-6">
                Autoriza el acceso a tu cuenta de Microsoft Outlook para procesar automáticamente facturas recibidas por email.
              </p>
              <Button onClick={connectOutlook} disabled={connecting} size="lg">
                {connecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Conectar Outlook
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{integration.user_display_name}</p>
                    <p className="text-sm text-muted-foreground">{integration.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Conectado</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(integration.connected_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Última sincronización</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.last_sync 
                        ? new Date(integration.last_sync).toLocaleString('es-CO')
                        : 'Nunca'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Procesamiento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Procesar automáticamente archivos adjuntos de facturas
                    </p>
                  </div>
                  <Switch
                    checked={integration.auto_process}
                    onCheckedChange={updateAutoProcess}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <Button onClick={triggerSync} disabled={syncing} variant="outline">
                    {syncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizar Ahora
                      </>
                    )}
                  </Button>

                  <Button onClick={disconnectOutlook} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Folder Configuration */}
      {integration && folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Folder className="h-5 w-5" />
              <span>Carpetas a Monitorear</span>
            </CardTitle>
            <CardDescription>
              Selecciona las carpetas de email que deseas monitorear para facturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={integration.selected_folders.includes(folder.id)}
                      onCheckedChange={(checked) => 
                        updateFolderSelection(folder.id, checked)
                      }
                    />
                    <div>
                      <p className="font-medium">{folder.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {folder.totalItemCount} mensajes • {folder.unreadItemCount} sin leer
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {folder.totalItemCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Messages */}
      {integration && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Mensajes Recientes</span>
              </CardTitle>
              <Badge variant="outline">
                {messages.length} mensajes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay mensajes</p>
                <p className="text-muted-foreground">
                  Los mensajes de email aparecerán aquí cuando se reciban
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{message.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          De: {message.sender_name || message.sender_email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {message.has_attachments && (
                        <Badge variant="outline" className="text-xs">
                          <Download className="h-3 w-3 mr-1" />
                          Adjuntos
                        </Badge>
                      )}
                      
                      <Badge 
                        variant={message.processed ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {message.processed ? 'Procesado' : 'Pendiente'}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {new Date(message.received_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OutlookIntegrationPage;