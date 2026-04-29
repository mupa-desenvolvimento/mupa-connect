-- 1. Ensure columns exist
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Pre-cleanup: Delete rows without tenant_id or where we can't find a matching company
DELETE FROM public.playlists WHERE tenant_id IS NULL;

-- Update existing rows to have a company_id based on their tenant
UPDATE public.playlists p
SET company_id = (SELECT c.id FROM public.companies c WHERE c.tenant_id = p.tenant_id LIMIT 1)
WHERE p.company_id IS NULL;

-- If there are still playlists without company_id (no matching company found), we must delete them to enforce NOT NULL
DELETE FROM public.playlists WHERE company_id IS NULL;

-- Now that data is consistent, enforce NOT NULL
ALTER TABLE public.playlists ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.playlists ALTER COLUMN company_id SET NOT NULL;

-- 2. Timestamps defaults
ALTER TABLE public.playlists ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.playlists ALTER COLUMN updated_at SET DEFAULT now();

-- 3. Foreign keys
ALTER TABLE public.playlists
DROP CONSTRAINT IF EXISTS playlists_company_id_fkey,
ADD CONSTRAINT playlists_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_tenant_company
ON public.playlists (tenant_id, company_id);

CREATE INDEX IF NOT EXISTS idx_playlists_active
ON public.playlists (is_active);

CREATE INDEX IF NOT EXISTS idx_playlists_priority
ON public.playlists (priority DESC);

-- 5. Security (RLS)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playlists tenant isolation" ON public.playlists;
CREATE POLICY "playlists tenant isolation"
ON public.playlists
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_mappings
    WHERE user_id = auth.uid()
  )
);

-- 6. Automatic update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_playlists_updated_at ON public.playlists;
CREATE TRIGGER tr_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();