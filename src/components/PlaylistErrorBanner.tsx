import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PlaylistErrorBannerProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export const PlaylistErrorBanner: React.FC<PlaylistErrorBannerProps> = ({ 
  error, 
  onRetry,
  className = "" 
}) => {
  if (!error) return null;

  let title = "Erro de integridade";
  let description = "Ocorreu um problema ao processar os dados da playlist.";

  // Handle specific database errors
  if (error?.code === '23502' && error.message?.includes('company_id')) {
    description = "A playlist não possui uma empresa (company_id) vinculada. Isso é obrigatório para o funcionamento correto.";
  } else if (error?.code === '42501') {
    title = "Acesso Negado";
    description = "Você não tem permissão para acessar ou modificar esta playlist.";
  } else if (typeof error === 'string') {
    description = error;
  } else if (error?.message) {
    description = error.message;
  }

  return (
    <Alert variant="destructive" className={`bg-red-500/10 border-red-500/20 text-red-200 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 mt-2">
        <p>{description}</p>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="w-fit border-red-500/50 hover:bg-red-500/20 text-red-200"
          >
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
