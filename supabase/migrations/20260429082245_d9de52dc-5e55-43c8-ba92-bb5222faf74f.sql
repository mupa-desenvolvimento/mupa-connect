-- Habilitar RLS para playlists e playlist_items
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Políticas para public.playlists
CREATE POLICY "Users can view playlists from their tenant"
ON public.playlists
FOR SELECT
USING (
    tenant_id IN (
        SELECT id FROM public.tenants WHERE id = tenant_id
    )
);

CREATE POLICY "Users can manage playlists from their tenant"
ON public.playlists
FOR ALL
USING (
    tenant_id IN (
        SELECT id FROM public.tenants WHERE id = tenant_id
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT id FROM public.tenants WHERE id = tenant_id
    )
);

-- Políticas para public.playlist_items
CREATE POLICY "Users can view playlist items from their tenant"
ON public.playlist_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id)
    )
);

CREATE POLICY "Users can manage playlist items from their tenant"
ON public.playlist_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id::uuid
        AND p.tenant_id IN (SELECT id FROM public.tenants WHERE id = p.tenant_id)
    )
);