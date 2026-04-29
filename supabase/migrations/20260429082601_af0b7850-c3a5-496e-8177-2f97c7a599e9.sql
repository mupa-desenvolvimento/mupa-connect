-- Remover políticas anteriores que eram muito restritivas
DROP POLICY IF EXISTS "Users can view playlists from their tenant" ON public.playlists;
DROP POLICY IF EXISTS "Users can manage playlists from their tenant" ON public.playlists;
DROP POLICY IF EXISTS "Users can view playlist items from their tenant" ON public.playlist_items;
DROP POLICY IF EXISTS "Users can manage playlist items from their tenant" ON public.playlist_items;

-- Novas políticas para public.playlists (Permitindo tenant_id IS NULL para compatibilidade)
CREATE POLICY "Users can view playlists"
ON public.playlists
FOR SELECT
USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT id FROM public.tenants WHERE id = tenant_id)
);

CREATE POLICY "Users can manage playlists"
ON public.playlists
FOR ALL
USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT id FROM public.tenants WHERE id = tenant_id)
)
WITH CHECK (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT id FROM public.tenants WHERE id = tenant_id)
);

-- Novas políticas para public.playlist_items
CREATE POLICY "Users can view playlist items"
ON public.playlist_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND (p.tenant_id IS NULL OR p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id))
    )
);

CREATE POLICY "Users can manage playlist items"
ON public.playlist_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND (p.tenant_id IS NULL OR p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND (p.tenant_id IS NULL OR p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id))
    )
);