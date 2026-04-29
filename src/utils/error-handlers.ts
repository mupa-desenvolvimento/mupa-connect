import { toast } from "sonner";

export interface PlaylistError {
  message: string;
  code?: string;
  details?: string;
}

export const handlePlaylistError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);

  // Friendly error messages for common database integrity issues
  if (error?.code === '23502') { // NOT NULL violation
    if (error.message?.includes('company_id')) {
      toast.error("Erro de integridade: A empresa (company_id) é obrigatória para esta operação.");
      return;
    }
    if (error.message?.includes('tenant_id')) {
      toast.error("Erro de integridade: O ID do cliente é obrigatório.");
      return;
    }
  }

  if (error?.code === '42501') { // RLS violation
    toast.error("Erro de permissão: Você não tem autorização para realizar esta ação nesta playlist.");
    return;
  }

  // Fallback to the original error message if it's already a string or has a friendly message
  const message = typeof error === 'string' ? error : error?.message || "Ocorreu um erro inesperado.";
  toast.error(`${context}: ${message}`);
};
