-- Adicionar coluna de playlist_id na tabela dispositivos
ALTER TABLE public.dispositivos 
ADD COLUMN playlist_id UUID REFERENCES public.playlists(id);

-- Configurar todos os dispositivos para a playlist específica solicitada
UPDATE public.dispositivos 
SET playlist_id = 'e8dab79a-0612-4859-94e0-5e1a6be50756';

-- Criar um índice para performance
CREATE INDEX idx_dispositivos_playlist_id ON public.dispositivos(playlist_id);