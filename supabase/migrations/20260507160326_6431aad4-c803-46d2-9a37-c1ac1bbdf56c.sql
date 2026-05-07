ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
UPDATE public.dispositivos SET created_at = atualizado WHERE created_at IS NULL;