ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS product_fallback_image_url TEXT;

-- Update existing tenants with a null value if needed (though default is null)
-- We don't need a default value as the UI will handle the null case.