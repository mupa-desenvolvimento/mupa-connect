-- Adiciona a coluna prioridade à tabela playlist_items
ALTER TABLE public.playlist_items 
ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 1;

-- Atualiza os tipos para o PostgREST (opcional mas recomendado)
COMMENT ON COLUMN public.playlist_items.prioridade IS 'Prioridade de exibição do item (1-10)';
