-- Add new columns for player status tracking
ALTER TABLE public.dispositivos 
ADD COLUMN IF NOT EXISTS player_status TEXT DEFAULT 'stopped',
ADD COLUMN IF NOT EXISTS last_player_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create an index for performance if needed
CREATE INDEX IF NOT EXISTS idx_dispositivos_player_status ON public.dispositivos(player_status);
