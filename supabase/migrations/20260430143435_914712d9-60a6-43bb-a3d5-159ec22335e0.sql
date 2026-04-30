-- Add auto_delete column
ALTER TABLE public.media_items ADD COLUMN auto_delete BOOLEAN DEFAULT false;

-- Create function to check if media is in use
CREATE OR REPLACE FUNCTION public.check_media_in_use(media_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_in_use BOOLEAN := false;
BEGIN
    -- Check playlists
    IF EXISTS (
        SELECT 1 FROM public.playlist_items 
        WHERE media_id = $1
    ) THEN
        RETURN true;
    END IF;

    -- Check campaigns
    IF EXISTS (
        SELECT 1 FROM public.campaign_items 
        WHERE media_id = $1
    ) THEN
        RETURN true;
    END IF;

    -- Check devices (if they have a current_media_id or similar)
    -- This depends on the specific schema, but assuming a generic check
    -- IF EXISTS (SELECT 1 FROM public.devices WHERE current_media_id = $1) THEN RETURN true; END IF;

    RETURN false;
END;
$$;