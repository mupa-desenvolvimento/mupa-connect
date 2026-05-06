ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS optimized_url TEXT,
ADD COLUMN IF NOT EXISTS original_url TEXT;

COMMENT ON COLUMN public.media_items.optimized_url IS 'URL of the media optimized for low-end devices (Android 9/X96)';
COMMENT ON COLUMN public.media_items.original_url IS 'URL of the original uploaded file';
