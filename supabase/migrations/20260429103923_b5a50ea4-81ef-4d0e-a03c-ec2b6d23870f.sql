-- Function to issue reload command to multiple devices
CREATE OR REPLACE FUNCTION public.issue_reload_command_to_affected_devices(p_device_ids UUID[])
RETURNS VOID AS $$
BEGIN
  IF array_length(p_device_ids, 1) > 0 THEN
    INSERT INTO public.device_commands (device_id, command, status, tenant_id)
    SELECT 
      d_id, 
      'reload_playlist', 
      'pending',
      (SELECT tenant_id FROM public.dispositivos WHERE id = d_id LIMIT 1)
    FROM unnest(p_device_ids) AS d_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for playlist items (content changes)
CREATE OR REPLACE FUNCTION public.on_playlist_item_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_device_ids UUID[];
  v_playlist_id UUID;
BEGIN
  v_playlist_id := COALESCE(NEW.playlist_id, OLD.playlist_id)::uuid;
  
  -- Find all devices that are resolving to this playlist
  -- We use the hierarchy view logic to find them
  SELECT array_agg(id) INTO affected_device_ids
  FROM (
    SELECT id FROM get_groups_hierarchy('f822bf9d-39e9-4726-82f7-c16bf267bc39')
    WHERE type = 'device' AND resolved_playlist_id = v_playlist_id
  ) AS affected;

  PERFORM public.issue_reload_command_to_affected_devices(affected_device_ids);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for structural changes (groups, stores, devices)
CREATE OR REPLACE FUNCTION public.on_structural_change_trigger()
RETURNS TRIGGER AS $$
DECLARE
  affected_device_ids UUID[];
BEGIN
  -- Any structural change might affect many devices due to inheritance.
  -- For safety, we find all devices in the tenant and trigger a reload check
  -- or we could be more surgical if needed.
  -- Since get_groups_hierarchy is available, we use it.
  
  SELECT array_agg(id) INTO affected_device_ids
  FROM (
    SELECT id FROM get_groups_hierarchy('f822bf9d-39e9-4726-82f7-c16bf267bc39')
    WHERE type = 'device'
  ) AS affected;

  PERFORM public.issue_reload_command_to_affected_devices(affected_device_ids);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers
DROP TRIGGER IF EXISTS tr_playlist_item_change ON public.playlist_items;
CREATE TRIGGER tr_playlist_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.playlist_items
FOR EACH ROW EXECUTE FUNCTION public.on_playlist_item_change();

DROP TRIGGER IF EXISTS tr_group_change ON public.groups;
CREATE TRIGGER tr_group_change
AFTER UPDATE OF playlist_id, parent_id ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.on_structural_change_trigger();

DROP TRIGGER IF EXISTS tr_store_change ON public.stores;
CREATE TRIGGER tr_store_change
AFTER UPDATE OF playlist_id ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.on_structural_change_trigger();

DROP TRIGGER IF EXISTS tr_device_group_change ON public.device_groups;
CREATE TRIGGER tr_device_group_change
AFTER UPDATE OF channel_id, store_id ON public.device_groups
FOR EACH ROW EXECUTE FUNCTION public.on_structural_change_trigger();

DROP TRIGGER IF EXISTS tr_group_stores_change ON public.group_stores;
CREATE TRIGGER tr_group_stores_change
AFTER INSERT OR UPDATE OR DELETE ON public.group_stores
FOR EACH ROW EXECUTE FUNCTION public.on_structural_change_trigger();
