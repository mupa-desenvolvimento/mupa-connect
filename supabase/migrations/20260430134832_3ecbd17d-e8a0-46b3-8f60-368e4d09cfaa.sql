CREATE TABLE IF NOT EXISTS public.monitoring_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.monitoring_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view monitoring via token" 
ON public.monitoring_views 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Authenticated users can manage their company monitoring views" 
ON public.monitoring_views 
FOR ALL
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE (raw_user_meta_data->>'company_id')::uuid = company_id
));

-- Index for fast token lookup
CREATE INDEX idx_monitoring_views_token ON public.monitoring_views(token);