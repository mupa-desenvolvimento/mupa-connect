-- Adicionar coluna autostart à tabela dispositivos
ALTER TABLE public.dispositivos 
ADD COLUMN IF NOT EXISTS autostart BOOLEAN DEFAULT true;

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.dispositivos.autostart IS 'Controla se o autostart do dispositivo está ativo ou inativo';