-- Add tenant_id column
ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add foreign key constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispositivos_tenant_fk') THEN
        ALTER TABLE public.dispositivos
        ADD CONSTRAINT dispositivos_tenant_fk
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS if not enabled (pre-emptive)
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'devices_by_tenant' AND tablename = 'dispositivos') THEN
        CREATE POLICY "devices_by_tenant"
        ON public.dispositivos
        FOR SELECT
        USING (tenant_id = auth.uid() OR tenant_id = (current_setting('request.jwt.claim.tenant_id', true))::uuid);
    END IF;
END $$;

-- Migrate data from 'empresa' to 'tenant_id'
UPDATE public.dispositivos d
SET tenant_id = t.id
FROM public.tenants t
WHERE (d.empresa = t.slug OR d.empresa = t.name)
AND d.tenant_id IS NULL;

-- Create migration report
CREATE TABLE IF NOT EXISTS public.migration_report (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    step text,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

INSERT INTO public.migration_report (step, details)
SELECT 'dispositivos_tenant_migration', jsonb_build_object(
    'total_devices', (SELECT count(*) FROM public.dispositivos),
    'migrated_with_tenant', (SELECT count(*) FROM public.dispositivos WHERE tenant_id IS NOT NULL),
    'remaining_without_tenant', (SELECT count(*) FROM public.dispositivos WHERE tenant_id IS NULL)
);