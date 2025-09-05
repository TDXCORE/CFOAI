'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';
import { Badge } from '@kit/ui/badge';
import { JobMonitor } from '~/components/processing/job-monitor';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  Archive,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { withI18n } from '~/lib/i18n/with-i18n';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

function UploadPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0);

  const uploadFile = async (file: File): Promise<{ fileId: string; success: boolean; error?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`/${tenantSlug}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { fileId: '', success: false, error: errorData.error || 'Upload failed' };
      }
      
      const data = await response.json();
      return { fileId: data.data.id, success: true };
    } catch (error) {
      return { 
        fileId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  };

  const createProcessingJob = async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/${tenantSlug}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          jobType: 'document_parse',
          priority: 0,
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to create processing job:', error);
      return false;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'uploading',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const uploadedFile of newFiles) {
      try {
        // Update to 50% when starting upload
        setUploadedFiles(prev => 
          prev.map(f => f.id === uploadedFile.id ? { ...f, progress: 50 } : f)
        );

        const result = await uploadFile(uploadedFile.file);
        
        if (result.success) {
          // Update to 100% when upload complete
          setUploadedFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? 
              { ...f, progress: 100, status: 'processing' } : f
            )
          );

          // Create processing job
          const jobCreated = await createProcessingJob(result.fileId);
          
          if (jobCreated) {
            setUploadedFiles(prev => 
              prev.map(f => f.id === uploadedFile.id ? 
                { ...f, status: 'completed' } : f
              )
            );
            // Trigger job monitor refresh
            setJobsRefreshKey(prev => prev + 1);
          } else {
            setUploadedFiles(prev => 
              prev.map(f => f.id === uploadedFile.id ? 
                { ...f, status: 'error', error: 'Failed to create processing job' } : f
              )
            );
          }
        } else {
          setUploadedFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? 
              { ...f, status: 'error', error: result.error } : f
            )
          );
        }
      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === uploadedFile.id ? 
            { ...f, status: 'error', error: 'Upload failed' } : f
          )
        );
      }
    }
  }, [tenantSlug]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml'],
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xml':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'pdf':
        return <File className="h-8 w-8 text-red-600" />;
      case 'zip':
        return <Archive className="h-8 w-8 text-yellow-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-8 w-8 text-green-600" />;
      default:
        return <File className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Subiendo...';
      case 'processing':
        return 'Procesando...';
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subir Archivos</h1>
        <p className="text-muted-foreground">
          Carga facturas XML, PDF, imágenes o archivos ZIP para procesar
        </p>
      </div>

      {/* Upload Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Archivo Soportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">XML UBL</p>
                <p className="text-sm text-muted-foreground">Factura electrónica DIAN</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <File className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium">PDF</p>
                <p className="text-sm text-muted-foreground">Facturas escaneadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Imágenes</p>
                <p className="text-sm text-muted-foreground">JPG, PNG</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">ZIP</p>
                <p className="text-sm text-muted-foreground">Lotes de archivos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Suelta los archivos aquí...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-muted-foreground">
                  Máximo 10MB por archivo. Puedes subir múltiples archivos a la vez.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Archivos Subidos ({uploadedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {getFileIcon(uploadedFile.file.name)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {uploadedFile.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={uploadedFile.progress} className="h-2" />
                      </div>
                    )}
                    
                    {uploadedFile.error && (
                      <p className="text-sm text-red-600 mt-1">
                        {uploadedFile.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(uploadedFile.status)}
                    <Badge variant="outline">
                      {getStatusText(uploadedFile.status)}
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline"
                onClick={() => setUploadedFiles([])}
              >
                Limpiar Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Jobs Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Trabajos de Procesamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <JobMonitor 
            tenantSlug={tenantSlug}
            key={jobsRefreshKey}
            onJobComplete={() => {
              // Optionally handle job completion
              console.log('Job completed');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default withI18n(UploadPage);