
-- 1. Fix privilege escalation in is_admin (was reading user-controlled raw_user_meta_data)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND role IN ('admin', 'admin_global')
  );
END;
$function$;

-- 2. Tenant-scope WhatsApp policies
DROP POLICY IF EXISTS "auth manage groups" ON public.whatsapp_contact_groups;
DROP POLICY IF EXISTS "auth read groups" ON public.whatsapp_contact_groups;
DROP POLICY IF EXISTS "auth manage group members" ON public.whatsapp_contact_group_members;
DROP POLICY IF EXISTS "auth read group members" ON public.whatsapp_contact_group_members;
DROP POLICY IF EXISTS "auth insert send history" ON public.whatsapp_send_history;
DROP POLICY IF EXISTS "auth read send history" ON public.whatsapp_send_history;

CREATE POLICY "Tenant users read whatsapp groups"
ON public.whatsapp_contact_groups FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant users manage whatsapp groups"
ON public.whatsapp_contact_groups FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR tenant_id = public.get_user_tenant_id(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant users read whatsapp group members"
ON public.whatsapp_contact_group_members FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_contact_groups g
    WHERE g.id = whatsapp_contact_group_members.group_id
      AND g.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant users manage whatsapp group members"
ON public.whatsapp_contact_group_members FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_contact_groups g
    WHERE g.id = whatsapp_contact_group_members.group_id
      AND g.tenant_id = public.get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_contact_groups g
    WHERE g.id = whatsapp_contact_group_members.group_id
      AND g.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant users read whatsapp send history"
ON public.whatsapp_send_history FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant users insert whatsapp send history"
ON public.whatsapp_send_history FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);

-- 3. Enable RLS on device_sectors
ALTER TABLE public.device_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users read device sectors"
ON public.device_sectors FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR tenant_id IS NULL
  OR tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant admins manage device sectors"
ON public.device_sectors FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_tenant_admin(auth.uid())
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.is_tenant_admin(auth.uid())
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  )
);
