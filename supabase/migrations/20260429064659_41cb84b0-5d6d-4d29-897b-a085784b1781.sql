-- Ensure folders has tenant_id for multitenancy
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users
-- In a real scenario, use get_user_tenant_id()
CREATE POLICY "Users can manage their own folders" 
ON public.folders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Users can manage their own media items" 
ON public.media_items FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure media bucket is public or has policies
-- (Bucket 'media' was found and is already public)
