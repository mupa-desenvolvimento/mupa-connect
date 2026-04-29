ALTER TABLE public.dispositivos 
ADD COLUMN last_heartbeat_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_proof_at TIMESTAMP WITH TIME ZONE;

-- Create an index for performance if needed
CREATE INDEX idx_dispositivos_serial ON public.dispositivos(serial);