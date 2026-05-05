-- 1. Melhorar a função is_super_admin para usar a coluna role em vez de emails fixos
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = check_user_id AND role = 'admin_global'
  );
END;
$function$;

-- 2. Garantir que as funções auxiliares existam e estejam corretas
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
    WHERE id = check_user_id AND role IN ('admin', 'marketing')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_data(check_user_id uuid, check_tenant_id uuid)
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
    WHERE id = check_user_id AND tenant_id = check_tenant_id
  );
END;
$function$;

-- 3. Limpar políticas antigas e conflitantes para Dispositivos
DROP POLICY IF EXISTS "Public can read devices for quick access" ON public.dispositivos;
DROP POLICY IF EXISTS "SuperAdmin bypass RLS on dispositivos" ON public.dispositivos;
DROP POLICY IF EXISTS "admin_dispositivos_access" ON public.dispositivos;
DROP POLICY IF EXISTS "admin_global_dispositivos" ON public.dispositivos;
DROP POLICY IF EXISTS "devices_by_tenant" ON public.dispositivos;
DROP POLICY IF EXISTS "user_dispositivos_access" ON public.dispositivos;

ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispositivos: SuperAdmin global access" 
ON public.dispositivos 
FOR ALL 
TO authenticated 
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Dispositivos: Tenant isolation" 
ON public.dispositivos 
FOR ALL 
TO authenticated 
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- 4. Playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Playlists isolation" ON public.playlists;
CREATE POLICY "Playlists: Multi-tenant access" 
ON public.playlists 
FOR ALL 
TO authenticated 
USING (public.can_access_tenant_data(auth.uid(), tenant_id))
WITH CHECK (public.can_access_tenant_data(auth.uid(), tenant_id));

-- 5. Mídias (media_items)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Media items isolation" ON public.media_items;
CREATE POLICY "Media: Multi-tenant access" 
ON public.media_items 
FOR ALL 
TO authenticated 
USING (public.can_access_tenant_data(auth.uid(), tenant_id))
WITH CHECK (public.can_access_tenant_data(auth.uid(), tenant_id));

-- 6. Grupos
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins manage groups" ON public.groups;
DROP POLICY IF EXISTS "Tenant admins manage groups" ON public.groups;
DROP POLICY IF EXISTS "Tenant users read groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete groups in their tenant" ON public.groups;
DROP POLICY IF EXISTS "Users can insert groups in their tenant" ON public.groups;
DROP POLICY IF EXISTS "Users can manage groups of their tenant" ON public.groups;
DROP POLICY IF EXISTS "Users can update groups in their tenant" ON public.groups;

CREATE POLICY "Groups: Multi-tenant access" 
ON public.groups 
FOR ALL 
TO authenticated 
USING (public.can_access_tenant_data(auth.uid(), tenant_id))
WITH CHECK (public.can_access_tenant_data(auth.uid(), tenant_id));

-- 7. Lojas (stores)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores isolation" ON public.stores;
CREATE POLICY "Stores: Multi-tenant access" 
ON public.stores 
FOR ALL 
TO authenticated 
USING (public.can_access_tenant_data(auth.uid(), tenant_id))
WITH CHECK (public.can_access_tenant_data(auth.uid(), tenant_id));

-- 8. Campanhas (campaigns)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns isolation" ON public.campaigns;
CREATE POLICY "Campaigns: Multi-tenant access" 
ON public.campaigns 
FOR ALL 
TO authenticated 
USING (public.can_access_tenant_data(auth.uid(), tenant_id))
WITH CHECK (public.can_access_tenant_data(auth.uid(), tenant_id));