-- Ensure groups table has the necessary columns
ALTER TABLE IF EXISTS public.groups 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Enable RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them with the correct logic
DROP POLICY IF EXISTS "Users can manage groups of their tenant" ON public.groups;

CREATE POLICY "Users can manage groups of their tenant"
    ON public.groups
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
    ));

-- Relationship: Groups -> Stores
ALTER TABLE public.group_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage group_stores of their tenant" ON public.group_stores;

CREATE POLICY "Users can manage group_stores of their tenant"
    ON public.group_stores
    FOR ALL
    USING (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ))
    WITH CHECK (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ));

-- Relationship: Groups -> Devices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_devices_device_id_key') THEN
        ALTER TABLE public.group_devices ADD CONSTRAINT group_devices_device_id_key UNIQUE (device_id);
    END IF;
END $$;

ALTER TABLE public.group_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage group_devices of their tenant" ON public.group_devices;

CREATE POLICY "Users can manage group_devices of their tenant"
    ON public.group_devices
    FOR ALL
    USING (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ))
    WITH CHECK (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ));

-- Relationship: Groups -> Playlists
CREATE TABLE IF NOT EXISTS public.group_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    is_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, playlist_id)
);

ALTER TABLE public.group_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage group_playlists of their tenant" ON public.group_playlists;

CREATE POLICY "Users can manage group_playlists of their tenant"
    ON public.group_playlists
    FOR ALL
    USING (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ))
    WITH CHECK (group_id IN (
        SELECT id FROM public.groups WHERE tenant_id IN (
            SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()
        )
    ));

-- Recursive function to get full path of a group
-- We need to drop the old one first because the parameters might have changed in a way that prevents OR REPLACE
DROP FUNCTION IF EXISTS public.get_groups_hierarchy(uuid);
DROP FUNCTION IF EXISTS public.get_groups_hierarchy(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_groups_hierarchy(group_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    hierarchy JSONB;
BEGIN
    WITH RECURSIVE group_tree AS (
        -- Base case
        SELECT id, parent_id, name, 0 as level
        FROM public.groups
        WHERE id = group_uuid
        
        UNION ALL
        
        -- Recursive step (upwards)
        SELECT g.id, g.parent_id, g.name, gt.level + 1
        FROM public.groups g
        INNER JOIN group_tree gt ON gt.parent_id = g.id
    )
    SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'level', level) ORDER BY level DESC)
    INTO hierarchy
    FROM group_tree;
    
    RETURN hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;
