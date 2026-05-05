-- Adicionar a coluna device_type se ela não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispositivos' AND column_name = 'device_type') THEN
    ALTER TABLE public.dispositivos ADD COLUMN device_type TEXT;
  END IF;
END $$;

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.dispositivos.device_type IS 'Tipo de hardware do dispositivo (ex: Android, Linux, WebPlayer)';