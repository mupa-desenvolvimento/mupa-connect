-- Remove the last_heartbeat_at column from dispositivos table
ALTER TABLE public.dispositivos DROP COLUMN IF EXISTS last_heartbeat_at;

-- Clean up any lingering functions that might still be used for heartbeat
DROP FUNCTION IF EXISTS public.device_heartbeat(text);
DROP FUNCTION IF EXISTS public.device_heartbeat(text, text, uuid);
