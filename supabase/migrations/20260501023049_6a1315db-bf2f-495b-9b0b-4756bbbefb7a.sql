ALTER TABLE IF EXISTS public.group_devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS public.group_stores ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from groups table
UPDATE public.group_devices gd
SET tenant_id = g.tenant_id
FROM public.groups g
WHERE gd.group_id = g.id AND gd.tenant_id IS NULL;

UPDATE public.group_stores gs
SET tenant_id = g.tenant_id
FROM public.groups g
WHERE gs.group_id = g.id AND gs.tenant_id IS NULL;
