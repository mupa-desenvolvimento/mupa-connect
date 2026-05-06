
-- 1. is_tenant_admin: remove 'marketing' from admin privileges
CREATE OR REPLACE FUNCTION public.is_tenant_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_super_admin(check_user_id) THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Separate function for marketing role
CREATE OR REPLACE FUNCTION public.is_marketing_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = check_user_id AND role = 'marketing'
  );
END;
$function$;

-- 2. channels: drop overly permissive write
DROP POLICY IF EXISTS "Authenticated write channels" ON public.channels;
CREATE POLICY "Super admins can manage channels"
  ON public.channels FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. price_tables: drop overly permissive write + anon read
DROP POLICY IF EXISTS "Authenticated write price_tables" ON public.price_tables;
DROP POLICY IF EXISTS "Public read price_tables" ON public.price_tables;
CREATE POLICY "Authenticated read price_tables"
  ON public.price_tables FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins manage price_tables"
  ON public.price_tables FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()));

-- 4. price_table_items
DROP POLICY IF EXISTS "Authenticated write price_table_items" ON public.price_table_items;
DROP POLICY IF EXISTS "Public read price_table_items" ON public.price_table_items;
CREATE POLICY "Authenticated read price_table_items"
  ON public.price_table_items FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins manage price_table_items"
  ON public.price_table_items FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid()));

-- 5. group_playlists: drop unscoped policies
DROP POLICY IF EXISTS "Authenticated write group_playlists" ON public.group_playlists;
DROP POLICY IF EXISTS "Public read group_playlists" ON public.group_playlists;

-- 6. device_quick_actions: drop unscoped policies
DROP POLICY IF EXISTS "Authenticated users can manage device quick actions" ON public.device_quick_actions;
DROP POLICY IF EXISTS "Authenticated users can view device quick actions" ON public.device_quick_actions;
CREATE POLICY "Tenant users can view device quick actions"
  ON public.device_quick_actions FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- 7. playlists: remove anon-accessible/overly broad policies
DROP POLICY IF EXISTS "Users can manage playlists" ON public.playlists;
DROP POLICY IF EXISTS "Public read playlists" ON public.playlists;
DROP POLICY IF EXISTS "Authenticated can read playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can view playlists" ON public.playlists;
-- Keep tenant-scoped policies and admin ones

-- 8. dispositivos_import_full: enable RLS + restrict
ALTER TABLE public.dispositivos_import_full ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin manages dispositivos_import_full" ON public.dispositivos_import_full;
CREATE POLICY "Super admin manages dispositivos_import_full"
  ON public.dispositivos_import_full FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 9. api_integrations: remove broad read
DROP POLICY IF EXISTS "Authenticated can read integrations" ON public.api_integrations;

-- 10. price_check_integrations: remove broad policies, keep admin manage + tenant read
DROP POLICY IF EXISTS "Authenticated can read price check integrations" ON public.price_check_integrations;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.price_check_integrations;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.price_check_integrations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.price_check_integrations;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.price_check_integrations;
CREATE POLICY "Tenant users read price_check_integrations"
  ON public.price_check_integrations FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );
