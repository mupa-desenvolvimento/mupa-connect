-- Function to ensure only one default playlist per company
CREATE OR REPLACE FUNCTION public.handle_default_playlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_company_default THEN
    UPDATE public.playlists
    SET is_company_default = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to manage default playlist
DROP TRIGGER IF EXISTS tr_manage_default_playlist ON public.playlists;
CREATE TRIGGER tr_manage_default_playlist
BEFORE INSERT OR UPDATE OF is_company_default
ON public.playlists
FOR EACH ROW
WHEN (NEW.is_company_default = true)
EXECUTE FUNCTION public.handle_default_playlist();

-- Function to assign default playlist to new devices
CREATE OR REPLACE FUNCTION public.assign_default_playlist_to_device()
RETURNS TRIGGER AS $$
DECLARE
  default_playlist_id UUID;
BEGIN
  -- Only if no playlist_id is provided
  IF NEW.playlist_id IS NULL THEN
    SELECT id INTO default_playlist_id
    FROM public.playlists
    WHERE company_id = NEW.company_id
      AND is_company_default = true
    LIMIT 1;

    IF default_playlist_id IS NOT NULL THEN
      NEW.playlist_id := default_playlist_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new devices
DROP TRIGGER IF EXISTS tr_assign_default_playlist ON public.dispositivos;
CREATE TRIGGER tr_assign_default_playlist
BEFORE INSERT ON public.dispositivos
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_playlist_to_device();
