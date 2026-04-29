-- Adicionar campos de monitoramento na tabela dispositivos (evitando erro se já existirem)
ALTER TABLE public.dispositivos 
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_proof_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_playlist_id UUID,
ADD COLUMN IF NOT EXISTS current_media_id UUID;

-- Criar tabela de logs de dispositivos
CREATE TABLE IF NOT EXISTS public.device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id INTEGER REFERENCES public.dispositivos(id) ON DELETE CASCADE,
  serial TEXT NOT NULL,
  event_type TEXT NOT NULL, -- heartbeat, proof, error
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.device_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso para device_logs
CREATE POLICY "Permitir inserção de logs para usuários autenticados" 
ON public.device_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir visualização de logs para usuários autenticados" 
ON public.device_logs 
FOR SELECT 
USING (true);

-- Indexar para performance nas consultas de monitoramento
CREATE INDEX IF NOT EXISTS idx_device_logs_serial ON public.device_logs(serial);
CREATE INDEX IF NOT EXISTS idx_device_logs_created_at ON public.device_logs(created_at DESC);
