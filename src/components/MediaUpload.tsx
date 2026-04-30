import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';

interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

interface MediaUploadProps {
  tenantId: string | null;
  companyId: string | null;
  currentFolderId: string | null;
  onUploadComplete: () => void;
  onClose: () => void;
}

export function MediaUpload({ tenantId, companyId, currentFolderId, onUploadComplete, onClose }: MediaUploadProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const optimizeImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp' as any,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image optimization failed', error);
      return file;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length + uploads.length > 10) {
      toast.error('Máximo de 10 arquivos por vez');
      return;
    }

    const newUploads = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
  }, [uploads]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 10,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
  });

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const filtered = prev.filter((u) => u.id !== id);
      const removed = prev.find((u) => u.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const startUploads = async () => {
    if (!tenantId) return;
    setIsProcessing(true);

    const pendingUploads = uploads.filter((u) => u.status === 'pending');
    
    // Configurações de concorrência: 3 uploads por vez
    const chunks = [];
    for (let i = 0; i < pendingUploads.length; i += 3) {
      chunks.push(pendingUploads.slice(i, i + 3));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (upload) => {
        try {
          updateUploadStatus(upload.id, { status: 'uploading', progress: 10 });

          let fileToUpload = upload.file;
          
          // Otimização de imagem (se for imagem)
          if (fileToUpload.type.startsWith('image/')) {
            fileToUpload = await optimizeImage(fileToUpload);
          }
          
          updateUploadStatus(upload.id, { progress: 30 });

          const fileExt = fileToUpload.name.split('.').pop() || (fileToUpload.type === 'image/webp' ? 'webp' : 'jpg');
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          
          // Usar Edge Function para upload seguro com validação de Tenant/Company no servidor
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('tenantId', tenantId);
          formData.append('companyId', companyId || '');
          if (currentFolderId) formData.append('folderId', currentFolderId);

          const { data, error: uploadError } = await supabase.functions.invoke('media-upload', {
            body: formData,
          });

          if (uploadError) throw uploadError;


          updateUploadStatus(upload.id, { status: 'completed', progress: 100 });
        } catch (error: any) {
          console.error('Upload error details:', error);
          const errorMessage = error.message || 'Erro desconhecido no upload';
          
          // Telemetria: Logar erro geral de upload
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('platform_logs').insert({
            level: 'error',
            category: 'media_upload',
            message: `Falha no upload de mídia: ${upload.file.name}`,
            user_id: user?.id,
            tenant_id: tenantId || undefined,
            metadata: {
              error: errorMessage,
              file_name: upload.file.name,
              stack: error.stack
            }
          });

          toast.error(`Falha ao enviar ${upload.file.name}: ${errorMessage}`);
          updateUploadStatus(upload.id, { status: 'error', error: errorMessage });
        }
      }));
    }

    setIsProcessing(false);
    onUploadComplete();
  };

  const updateUploadStatus = (id: string, updates: Partial<FileUpload>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Arraste arquivos ou clique para selecionar</h3>
          <p className="text-sm text-muted-foreground">
            Imagens e Vídeos (máx. 10 arquivos)
          </p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="bg-muted/30 border rounded-lg p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-background border overflow-hidden flex-shrink-0 flex items-center justify-center">
                {upload.preview ? (
                  <img src={upload.preview} className="h-full w-full object-cover" alt="" />
                ) : (
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm font-medium truncate">{upload.file.name}</span>
                  {upload.status !== 'uploading' && (
                    <button onClick={() => removeUpload(upload.id)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-1.5" />
                )}
                
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                  <span className={
                    upload.status === 'completed' ? 'text-green-500' : 
                    upload.status === 'error' ? 'text-red-500' : 
                    'text-muted-foreground'
                  }>
                    {upload.status === 'pending' && 'Pendente'}
                    {upload.status === 'uploading' && `Enviando ${upload.progress}%`}
                    {upload.status === 'completed' && 'Concluído'}
                    {upload.status === 'error' && 'Erro'}
                  </span>
                  <span className="text-muted-foreground">
                    {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button 
          onClick={startUploads} 
          disabled={isProcessing || uploads.length === 0 || uploads.every(u => u.status === 'completed')}
          className="bg-gradient-primary"
        >
          {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Começar Upload
        </Button>
      </div>
    </div>
  );
}
