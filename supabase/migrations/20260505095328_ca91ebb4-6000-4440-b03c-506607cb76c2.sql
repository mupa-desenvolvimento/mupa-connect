-- Adicionar coluna persistence à tabela dispositivos
ALTER TABLE public.dispositivos 
ADD COLUMN IF NOT EXISTS persistence BOOLEAN DEFAULT false;

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.dispositivos.persistence IS 'Define se o monitoramento de persistência está ativo para o dispositivo. Se estiver offline e persistence=true, o sistema pode tomar ações automáticas.';