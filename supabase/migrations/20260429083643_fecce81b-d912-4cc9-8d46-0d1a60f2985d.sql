CREATE OR REPLACE FUNCTION get_groups_hierarchy(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH RECURSIVE hierarchy AS (
        -- Base: Store Groups (Top level)
        SELECT 
            id,
            name,
            'store_group'::text as type,
            parent_id,
            playlist_id,
            playlist_id as resolved_playlist_id,
            NULL::text as inherited_from_name,
            1 as level
        FROM public.groups
        WHERE tenant_id = p_tenant_id AND parent_id IS NULL

        UNION ALL

        -- Recursive: Sub-groups
        SELECT 
            g.id,
            g.name,
            'store_group'::text as type,
            g.parent_id,
            g.playlist_id,
            COALESCE(g.playlist_id, h.resolved_playlist_id) as resolved_playlist_id,
            CASE WHEN g.playlist_id IS NULL THEN h.name ELSE NULL END as inherited_from_name,
            h.level + 1
        FROM public.groups g
        INNER JOIN hierarchy h ON g.parent_id = h.id
        WHERE g.tenant_id = p_tenant_id
    ),
    all_nodes AS (
        -- Groups from hierarchy
        SELECT 
            h.id, h.name, h.type, h.parent_id, h.playlist_id, h.resolved_playlist_id, h.inherited_from_name, h.level,
            (SELECT name FROM public.playlists WHERE id = h.resolved_playlist_id) as playlist_name,
            (SELECT count(*) FROM public.devices d WHERE d.group_id = h.id) as device_count
        FROM hierarchy h

        UNION ALL

        -- Stores (Attached to groups or direct)
        SELECT 
            s.id, s.name, 'store'::text as type, 
            COALESCE((SELECT group_id FROM public.group_stores gs WHERE gs.store_id = s.id LIMIT 1), NULL) as parent_id,
            s.playlist_id,
            COALESCE(s.playlist_id, h.resolved_playlist_id) as resolved_playlist_id,
            CASE WHEN s.playlist_id IS NULL THEN h.name ELSE NULL END as inherited_from_name,
            COALESCE(h.level, 0) + 1 as level,
            (SELECT name FROM public.playlists WHERE id = COALESCE(s.playlist_id, h.resolved_playlist_id)) as playlist_name,
            (SELECT count(*) FROM public.devices d WHERE d.store_id = s.id) as device_count
        FROM public.stores s
        LEFT JOIN hierarchy h ON h.id = (SELECT group_id FROM public.group_stores gs WHERE gs.store_id = s.id LIMIT 1)
        WHERE s.tenant_id = p_tenant_id

        UNION ALL

        -- Device Groups (Attached to stores)
        SELECT 
            dg.id, dg.name, 'device_group'::text as type, dg.store_id as parent_id,
            NULL::uuid as playlist_id, -- device_groups doesn't have direct playlist_id in current schema, inherited from store
            (SELECT playlist_id FROM public.stores WHERE id = dg.store_id) as resolved_playlist_id,
            (SELECT name FROM public.stores WHERE id = dg.store_id) as inherited_from_name,
            99 as level, -- Always leaf in this context
            (SELECT p.name FROM public.playlists p JOIN public.stores s ON s.playlist_id = p.id WHERE s.id = dg.store_id) as playlist_name,
            (SELECT count(*) FROM public.devices d WHERE d.group_id = dg.id) as device_count
        FROM public.device_groups dg
        WHERE dg.tenant_id = p_tenant_id
    )
    SELECT jsonb_agg(node_to_json) INTO result
    FROM (
        SELECT * FROM all_nodes
    ) node_to_json;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;