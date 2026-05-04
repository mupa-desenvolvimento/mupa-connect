-- Tabela para logs detalhados de performance do player
CREATE TABLE IF NOT EXISTS public.player_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'init_start', 'manifest_fetch', 'media_cache', 'media_play_error', 'engine_ready'
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    duration_ms INTEGER, -- Opcional: tempo levado para completar o evento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.player_performance_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção anônima (essencial para o player na rota pública)
CREATE POLICY "Allow anonymous player logs" 
ON public.player_performance_logs 
FOR INSERT 
WITH CHECK (true);

-- Política para SuperAdmin visualizar logs
CREATE POLICY "SuperAdmin can view player logs" 
ON public.player_performance_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin_global'
    )
);

-- Index para performance nas buscas por serial e data
CREATE INDEX idx_player_logs_serial ON public.player_performance_logs(serial);
CREATE INDEX idx_player_logs_created_at ON public.player_performance_logs(created_at DESC);