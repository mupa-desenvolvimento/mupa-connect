CREATE OR REPLACE FUNCTION public.get_groups_hierarchy(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
    store_nodes AS (
        -- Stores (Attached to groups or direct)
        SELECT 
            s.id, s.name, 'store'::text as type, 
            gs.group_id as parent_id,
            s.playlist_id,
            COALESCE(s.playlist_id, h.resolved_playlist_id) as resolved_playlist_id,
            CASE WHEN s.playlist_id IS NULL THEN h.name ELSE NULL END as inherited_from_name,
            COALESCE(h.level, 0) + 1 as level
        FROM public.stores s
        LEFT JOIN public.group_stores gs ON gs.store_id = s.id
        LEFT JOIN hierarchy h ON h.id = gs.group_id
        WHERE s.tenant_id = p_tenant_id
    ),
    dg_nodes AS (
        -- Device Groups (Attached to stores)
        SELECT 
            dg.id, dg.name, 'device_group'::text as type, dg.store_id as parent_id,
            dg.channel_id as playlist_id,
            COALESCE(dg.channel_id, s.resolved_playlist_id) as resolved_playlist_id,
            CASE 
              WHEN dg.channel_id IS NOT NULL THEN NULL 
              ELSE s.name 
            END as inherited_from_name,
            99 as level
        FROM public.device_groups dg
        INNER JOIN store_nodes s ON s.id = dg.store_id
        WHERE dg.tenant_id = p_tenant_id
    ),
    device_nodes AS (
        -- Individual Devices (Attached to device_groups or stores)
        -- We join with users/companies to ensure we get the right devices for this tenant
        SELECT 
            d.id, d.apelido_interno as name, 'device'::text as type, 
            COALESCE(dg.id, s.id) as parent_id,
            NULL::uuid as playlist_id,
            COALESCE(dg.resolved_playlist_id, s.resolved_playlist_id) as resolved_playlist_id,
            CASE 
              WHEN dg.id IS NOT NULL THEN dg.name
              ELSE s.name 
            END as inherited_from_name,
            100 as level
        FROM public.dispositivos d
        JOIN public.users u ON u.company = d.empresa
        -- Join com num_filial mapeado para lojas
        LEFT JOIN public.stores st ON st.code = d.num_filial::text AND st.tenant_id = p_tenant_id
        LEFT JOIN store_nodes s ON s.id = st.id
        -- Join com grupo_dispositivos mapeado para device_groups
        LEFT JOIN public.device_groups dgt ON dgt.id::text = d.grupo_dispositivos::text
        LEFT JOIN dg_nodes dg ON dg.id = dgt.id
        WHERE u.id = auth.uid()
    ),
    all_combined AS (
        SELECT id, name, type, parent_id, playlist_id, resolved_playlist_id, inherited_from_name, level FROM hierarchy
        UNION ALL
        SELECT id, name, type, parent_id, playlist_id, resolved_playlist_id, inherited_from_name, level FROM store_nodes
        UNION ALL
        SELECT id, name, type, parent_id, playlist_id, resolved_playlist_id, inherited_from_name, level FROM dg_nodes
        UNION ALL
        SELECT id, name, type, parent_id, playlist_id, resolved_playlist_id, inherited_from_name, level FROM device_nodes
    )
    SELECT jsonb_agg(node_to_json) INTO result
    FROM (
        SELECT 
            ac.*,
            (SELECT name FROM public.playlists WHERE id = ac.resolved_playlist_id) as playlist_name,
            CASE 
                WHEN ac.type = 'device' THEN 0 
                WHEN ac.type = 'device_group' THEN (SELECT count(*) FROM public.dispositivos d WHERE d.grupo_dispositivos::text = ac.id::text)
                WHEN ac.type = 'store' THEN (SELECT count(*) FROM public.dispositivos d WHERE (SELECT code FROM public.stores WHERE id = ac.id) = d.num_filial::text)
                ELSE 0 -- For groups, count is complex, keeping it 0 for now or sum of children in frontend
            END as device_count
        FROM all_combined ac
    ) node_to_json;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$function$
