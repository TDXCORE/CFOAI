'use client';

import { useEffect, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { 
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Mail,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '~/lib/utils';

interface ProcessingJob {
  id: string;
  job_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  attempts: number;
  max_attempts: number;
  progress_data: {
    stage: string;
    progress: number;
    message?: string;
    timestamp: string;
  };
  created_at: string;
  finished_at?: string;
  files?: {
    id: string;
    filename: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
  };
  mail_messages?: {
    id: string;
    subject: string;
    sender_email: string;
    received_at: string;
  };
  invoices?: {
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    status: string;
    needs_review: boolean;
    confidence_score: number;
  };
}

interface JobMonitorProps {
  tenantSlug: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showCompleted?: boolean;
  onJobComplete?: (job: ProcessingJob) => void;
}

export function JobMonitor({ 
  tenantSlug,
  autoRefresh = true,
  refreshInterval = 3000,
  showCompleted = true,
  onJobComplete
}: JobMonitorProps) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/${tenantSlug}/api/jobs`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      
      const newJobs = data.data || [];
      
      // Check for completed jobs to trigger callback
      if (onJobComplete) {
        const previousJobs = jobs;
        newJobs.forEach((newJob: ProcessingJob) => {
          const previousJob = previousJobs.find(j => j.id === newJob.id);
          if (previousJob && previousJob.status !== 'completed' && newJob.status === 'completed') {
            onJobComplete(newJob);
          }
        });
      }
      
      setJobs(newJobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const processJob = async (jobId: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/jobs/${jobId}/process`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to process job');
      }
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process job');
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/${tenantSlug}/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (!response.ok) {
        throw new Error('Failed to retry job');
      }
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    }
  };

  useEffect(() => {
    fetchJobs();

    if (autoRefresh) {
      const interval = setInterval(fetchJobs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ProcessingJob['status']) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      queued: 'outline',
      cancelled: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const filteredJobs = showCompleted 
    ? jobs 
    : jobs.filter(job => !['completed', 'cancelled'].includes(job.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando trabajos de procesamiento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button onClick={fetchJobs} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay trabajos de procesamiento activos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredJobs.map((job) => (
        <Card key={job.id} className={cn(
          "transition-colors",
          job.status === 'failed' && "border-red-200 bg-red-50/50",
          job.status === 'completed' && "border-green-200 bg-green-50/50"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {job.files ? (
                  <FileText className="h-5 w-5 text-blue-600" />
                ) : (
                  <Mail className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {job.files?.original_filename || job.mail_messages?.subject || 'Documento sin nombre'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {job.job_type} • Creado {new Date(job.created_at).toLocaleString('es-CO')}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(job.status)}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {job.status === 'processing' && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{job.progress_data.stage.replace('_', ' ')}</span>
                  <span>{job.progress_data.progress}%</span>
                </div>
                <Progress value={job.progress_data.progress} className="h-2" />
                {job.progress_data.message && (
                  <p className="text-xs text-gray-600">{job.progress_data.message}</p>
                )}
              </div>
            )}

            {job.invoices && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{job.invoices.invoice_number}</p>
                    <p className="text-xs text-gray-600">{job.invoices.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      ${job.invoices.total_amount.toLocaleString('es-CO')}
                    </p>
                    <div className="flex items-center space-x-2">
                      {job.invoices.needs_review && (
                        <Badge variant="outline" className="text-xs">
                          Revisión
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {Math.round(job.invoices.confidence_score * 100)}% confianza
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  Falló después de {job.attempts} intento(s)
                </p>
                {job.progress_data.message && (
                  <p className="text-xs text-red-600 mt-1">{job.progress_data.message}</p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {job.finished_at ? (
                  `Finalizado: ${new Date(job.finished_at).toLocaleString('es-CO')}`
                ) : (
                  `Intento ${job.attempts + 1} de ${job.max_attempts}`
                )}
              </div>

              <div className="flex space-x-2">
                {job.status === 'queued' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processJob(job.id)}
                    >
                      Procesar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelJob(job.id)}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                
                {job.status === 'processing' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelJob(job.id)}
                  >
                    Cancelar
                  </Button>
                )}

                {job.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryJob(job.id)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reintentar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}