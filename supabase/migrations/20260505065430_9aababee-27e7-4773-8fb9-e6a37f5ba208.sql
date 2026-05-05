ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS appearance_config JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.dispositivos.appearance_config IS 'Configurações de aparência visual para o player (logo, rodapé, overlays).';

-- Ensure playlists has it too (just in case, though schema check showed it)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playlists' AND column_name = 'appearance_config') THEN
        ALTER TABLE public.playlists ADD COLUMN appearance_config JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
