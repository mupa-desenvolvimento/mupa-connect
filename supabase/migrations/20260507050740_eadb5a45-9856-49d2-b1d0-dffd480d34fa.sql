
-- 1) Expand whatsapp_templates
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2) Expand whatsapp_recipients
ALTER TABLE public.whatsapp_recipients
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS role TEXT;

-- 3) Contact groups
CREATE TABLE IF NOT EXISTS public.whatsapp_contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10b981',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_contact_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.whatsapp_contact_groups(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.whatsapp_recipients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, recipient_id)
);

-- 4) Send history
CREATE TABLE IF NOT EXISTS public.whatsapp_send_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.whatsapp_contact_groups(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  recipient_phones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  total_recipients INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_details JSONB,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_send_history_tenant ON public.whatsapp_send_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_group_members_group ON public.whatsapp_contact_group_members(group_id);

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_groups_updated_at') THEN
    CREATE TRIGGER update_whatsapp_groups_updated_at
    BEFORE UPDATE ON public.whatsapp_contact_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) RLS
ALTER TABLE public.whatsapp_contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_send_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read groups" ON public.whatsapp_contact_groups;
CREATE POLICY "auth read groups" ON public.whatsapp_contact_groups
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth manage groups" ON public.whatsapp_contact_groups;
CREATE POLICY "auth manage groups" ON public.whatsapp_contact_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read group members" ON public.whatsapp_contact_group_members;
CREATE POLICY "auth read group members" ON public.whatsapp_contact_group_members
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth manage group members" ON public.whatsapp_contact_group_members;
CREATE POLICY "auth manage group members" ON public.whatsapp_contact_group_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read send history" ON public.whatsapp_send_history;
CREATE POLICY "auth read send history" ON public.whatsapp_send_history
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert send history" ON public.whatsapp_send_history;
CREATE POLICY "auth insert send history" ON public.whatsapp_send_history
  FOR INSERT TO authenticated WITH CHECK (true);
