-- Create a table for report
CREATE TABLE IF NOT EXISTS public.migration_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Phase 1: Preparation
ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS device_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS external_id INTEGER;

-- Unique constraint for device_uuid
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispositivos_device_uuid_key') THEN
        ALTER TABLE public.dispositivos ADD CONSTRAINT dispositivos_device_uuid_key UNIQUE (device_uuid);
    END IF;
END $$;

-- Phase 2: Data Migration
UPDATE public.dispositivos SET external_id = id WHERE external_id IS NULL;

-- Migration for store_id
WITH matches AS (
    UPDATE public.dispositivos d
    SET store_id = s.id
    FROM public.stores s
    WHERE trim(lower(d.num_filial)) = trim(lower(s.code))
    AND d.num_filial IS NOT NULL
    RETURNING d.id, s.id as sid
)
INSERT INTO migration_report (step, details)
SELECT 'store_match', jsonb_build_object('count', count(*)) FROM matches;

-- Migration for company_id
-- First ensure company_id column is linked if not already (checked earlier, it exists)
WITH matches AS (
    UPDATE public.dispositivos d
    SET company_id = c.id
    FROM public.companies c
    WHERE (trim(lower(d.empresa)) = trim(lower(c.code))
    OR trim(lower(d.empresa)) = trim(lower(c.id::text)))
    AND d.empresa IS NOT NULL
    RETURNING d.id, c.id as cid
)
INSERT INTO migration_report (step, details)
SELECT 'company_match', jsonb_build_object('count', count(*)) FROM matches;

-- Phase 3: Update group_devices
-- Ensure FK exists
ALTER TABLE public.group_devices DROP CONSTRAINT IF EXISTS group_devices_device_id_fkey;
ALTER TABLE public.group_devices ADD CONSTRAINT group_devices_device_id_fkey 
    FOREIGN KEY (device_id) REFERENCES public.dispositivos(device_uuid);

-- Phase 4: Report inconsistencies
INSERT INTO migration_report (step, details)
SELECT 'inconsistencies', jsonb_build_object(
    'devices_without_store', (SELECT count(*) FROM dispositivos WHERE store_id IS NULL AND num_filial IS NOT NULL),
    'devices_without_company', (SELECT count(*) FROM dispositivos WHERE company_id IS NULL AND empresa IS NOT NULL),
    'total_devices', (SELECT count(*) FROM dispositivos)
);