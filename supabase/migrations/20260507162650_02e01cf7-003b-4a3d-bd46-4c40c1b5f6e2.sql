
DROP POLICY IF EXISTS "Users can manage recipients" ON public.whatsapp_recipients;
DROP POLICY IF EXISTS "Users can view their own company recipients" ON public.whatsapp_recipients;

CREATE POLICY "Authenticated users view recipients in their company"
ON public.whatsapp_recipients FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users manage recipients in their company"
ON public.whatsapp_recipients FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Read advertisers" ON public.advertisers;
CREATE POLICY "Read advertisers in tenant" ON public.advertisers FOR SELECT TO authenticated
USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id_strict(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Read contracts" ON public.contracts;
CREATE POLICY "Read contracts in tenant" ON public.contracts FOR SELECT TO authenticated
USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id_strict(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Read campaigns" ON public.campaigns;
CREATE POLICY "Read campaigns in tenant" ON public.campaigns FOR SELECT TO authenticated
USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id_strict(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own insights" ON public.inky_insights;
CREATE POLICY "Users can view their own insights"
ON public.inky_insights FOR SELECT TO authenticated
USING (
  ((tenant_id IS NULL) OR (tenant_id IN (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid())))
  AND
  ((company_id IS NULL) OR (company_id IN (SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid())))
);

DROP POLICY IF EXISTS "Users can view playlist_campaigns in their tenant" ON public.playlist_campaigns;
DROP POLICY IF EXISTS "Users can manage playlist_campaigns in their tenant" ON public.playlist_campaigns;

CREATE POLICY "Users can view playlist_campaigns in their tenant"
ON public.playlist_campaigns FOR SELECT TO authenticated
USING (tenant_id IS NULL OR tenant_id IN (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid()));

CREATE POLICY "Users can manage playlist_campaigns in their tenant"
ON public.playlist_campaigns FOR ALL TO authenticated
USING (tenant_id IS NULL OR tenant_id IN (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid()))
WITH CHECK (tenant_id IS NULL OR tenant_id IN (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage instagram settings" ON public.instagram_settings;
CREATE POLICY "Tenant admins manage their instagram settings"
ON public.instagram_settings FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR ((public.is_admin(auth.uid()) OR public.is_tenant_admin(auth.uid())) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR ((public.is_admin(auth.uid()) OR public.is_tenant_admin(auth.uid())) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

DROP POLICY IF EXISTS "Leitura anônima via token" ON public.quick_access_tokens;

DROP FUNCTION IF EXISTS public.validate_quick_access_token(text);
CREATE FUNCTION public.validate_quick_access_token(_token text)
RETURNS TABLE (id uuid, device_id integer, store_id uuid, tenant_id uuid, company_id uuid, expires_at timestamptz, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.device_id, t.store_id, t.tenant_id, t.company_id, t.expires_at, t.is_active
  FROM public.quick_access_tokens t
  WHERE t.token = _token AND t.is_active = true AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_quick_access_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_quick_access_token(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view monitoring via token" ON public.monitoring_views;

DROP FUNCTION IF EXISTS public.validate_monitoring_view_token(text);
CREATE FUNCTION public.validate_monitoring_view_token(_token text)
RETURNS TABLE (id uuid, company_id uuid, tenant_id uuid, config jsonb, expires_at timestamptz, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.company_id, m.tenant_id, m.config, m.expires_at, m.is_active
  FROM public.monitoring_views m
  WHERE m.token = _token AND m.is_active = true AND (m.expires_at IS NULL OR m.expires_at > now())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_monitoring_view_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_monitoring_view_token(text) TO anon, authenticated;
