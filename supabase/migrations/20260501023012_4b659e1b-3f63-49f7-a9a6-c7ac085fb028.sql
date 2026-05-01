CREATE OR REPLACE FUNCTION public.on_structural_change_trigger()
RETURNS TRIGGER AS $$
DECLARE
  affected_device_ids TEXT[];
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from NEW or OLD record
  IF (TG_OP = 'DELETE') THEN
    IF (TG_TABLE_NAME = 'groups') THEN v_tenant_id := OLD.tenant_id;
    ELSIF (TG_TABLE_NAME = 'group_stores') THEN 
        SELECT tenant_id INTO v_tenant_id FROM public.groups WHERE id = OLD.group_id;
    ELSE
        -- Fallback for other tables
        v_tenant_id := (SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid() LIMIT 1);
    END IF;
  ELSE
    IF (TG_TABLE_NAME = 'groups') THEN v_tenant_id := NEW.tenant_id;
    ELSIF (TG_TABLE_NAME = 'group_stores') THEN 
        SELECT tenant_id INTO v_tenant_id FROM public.groups WHERE id = NEW.group_id;
    ELSE
        v_tenant_id := (SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid() LIMIT 1);
    END IF;
  END IF;

  IF v_tenant_id IS NULL THEN
    -- If we still don't have it, try to find it from the context
    v_tenant_id := 'f822bf9d-39e9-4726-82f7-c16bf267bc39'; -- Default fallback for Stock Center if needed, or just return
  END IF;

  -- Any structural change might affect many devices due to inheritance.
  SELECT array_agg(item->>'id') INTO affected_device_ids
  FROM jsonb_array_elements(public.get_groups_hierarchy(v_tenant_id)) AS item
  WHERE item->>'type' = 'device';

  IF affected_device_ids IS NOT NULL AND array_length(affected_device_ids, 1) > 0 THEN
    -- device_commands expects text for device_id
    INSERT INTO public.device_commands (device_id, command, status, tenant_id)
    SELECT 
      d_id, 
      'reload_playlist', 
      'pending',
      v_tenant_id
    FROM unnest(affected_device_ids) AS d_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
