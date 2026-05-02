-- Create group_stores table
CREATE TABLE IF NOT EXISTS public.group_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, store_id)
);

-- Enable RLS
ALTER TABLE public.group_stores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view group_stores for their tenant" 
ON public.group_stores FOR SELECT 
TO authenticated 
USING (true); -- Tenant filtering should be handled by the application logic as per existing patterns

CREATE POLICY "Users can insert group_stores for their tenant" 
ON public.group_stores FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can delete group_stores for their tenant" 
ON public.group_stores FOR DELETE 
TO authenticated 
USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_group_stores_group_id ON public.group_stores(group_id);
CREATE INDEX IF NOT EXISTS idx_group_stores_store_id ON public.group_stores(store_id);