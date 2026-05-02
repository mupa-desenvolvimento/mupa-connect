-- Adicionar coluna de configuração de aparência na tabela playlists
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS appearance_config JSONB DEFAULT '{}'::jsonb;

-- Comentário explicativo sobre a estrutura esperada
COMMENT ON COLUMN public.playlists.appearance_config IS 'Configurações visuais do player: show_device_name, show_datetime, transition_type, footer, logo, etc.';