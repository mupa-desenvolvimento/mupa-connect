CREATE OR REPLACE FUNCTION public.on_playlist_item_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  affected_device_ids UUID[];
  v_playlist_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Determine the playlist_id involved
  v_playlist_id := COALESCE(NEW.playlist_id, OLD.playlist_id)::uuid;
  
  -- Find the tenant_id for this playlist
  SELECT tenant_id INTO v_tenant_id FROM public.playlists WHERE id = v_playlist_id;
  
  -- If we can't find the tenant or playlist, we can't determine affected devices
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find all devices that are resolving to this playlist
  -- We parse the JSON returned by get_groups_hierarchy
  SELECT array_agg((item->>'id')::uuid) INTO affected_device_ids
  FROM jsonb_array_elements(public.get_groups_hierarchy(v_tenant_id)) AS item
  WHERE item->>'type' = 'device' 
    AND (item->>'resolved_playlist_id')::uuid = v_playlist_id;

  -- If there are affected devices, issue the reload command
  IF affected_device_ids IS NOT NULL AND array_length(affected_device_ids, 1) > 0 THEN
    PERFORM public.issue_reload_command_to_affected_devices(affected_device_ids);
  END IF;
  
  RETURN NULL;
END;
$function$;