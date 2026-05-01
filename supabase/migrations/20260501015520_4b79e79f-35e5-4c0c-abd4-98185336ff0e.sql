CREATE OR REPLACE FUNCTION public.on_structural_change_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  affected_device_ids UUID[];
  v_tenant_id UUID;
BEGIN
  -- Determine tenant_id based on the table
  IF TG_TABLE_NAME = 'groups' OR TG_TABLE_NAME = 'stores' OR TG_TABLE_NAME = 'device_groups' THEN
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  ELSIF TG_TABLE_NAME = 'group_stores' THEN
    SELECT tenant_id INTO v_tenant_id FROM public.groups WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find all devices in the hierarchy
  SELECT array_agg((item->>'id')::uuid) INTO affected_device_ids
  FROM jsonb_array_elements(public.get_groups_hierarchy(v_tenant_id)) AS item
  WHERE item->>'type' = 'device';

  IF affected_device_ids IS NOT NULL AND array_length(affected_device_ids, 1) > 0 THEN
    PERFORM public.issue_reload_command_to_affected_devices(affected_device_ids);
  END IF;
  
  RETURN NULL;
END;
$function$;