
-- =========================================================
-- 1. company_integrations: remove leitura aberta a todos
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can read company integrations" ON public.company_integrations;

CREATE POLICY "Tenant users can read company integrations"
ON public.company_integrations
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
);

-- =========================================================
-- 2. group_stores: remover políticas com true
-- =========================================================
DROP POLICY IF EXISTS "Users can delete group_stores for their tenant" ON public.group_stores;
DROP POLICY IF EXISTS "Users can insert group_stores for their tenant" ON public.group_stores;
DROP POLICY IF EXISTS "Users can view group_stores for their tenant" ON public.group_stores;

-- =========================================================
-- 3. folders: remover política ALL true
-- =========================================================
DROP POLICY IF EXISTS "Users can manage their own folders" ON public.folders;

-- =========================================================
-- 4. device_group_members: restringir por tenant do grupo
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can add device group members" ON public.device_group_members;
DROP POLICY IF EXISTS "Authenticated users can remove device group members" ON public.device_group_members;
DROP POLICY IF EXISTS "Authenticated users can view device group members" ON public.device_group_members;

CREATE POLICY "Tenant users view device group members"
ON public.device_group_members
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.device_groups dg
    WHERE dg.id = device_group_members.group_id
      AND can_access_tenant_data(auth.uid(), dg.tenant_id)
  )
);

CREATE POLICY "Tenant users insert device group members"
ON public.device_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.device_groups dg
    WHERE dg.id = device_group_members.group_id
      AND can_access_tenant_data(auth.uid(), dg.tenant_id)
  )
);

CREATE POLICY "Tenant users delete device group members"
ON public.device_group_members
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.device_groups dg
    WHERE dg.id = device_group_members.group_id
      AND can_access_tenant_data(auth.uid(), dg.tenant_id)
  )
);

-- =========================================================
-- 5. device_logs: restringir leitura
-- =========================================================
DROP POLICY IF EXISTS "Permitir visualização de logs para usuários autenticados" ON public.device_logs;
DROP POLICY IF EXISTS "Permitir inserção de logs para usuários autenticados" ON public.device_logs;

CREATE POLICY "Tenant users can read device logs"
ON public.device_logs
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dispositivos d
    WHERE d.id = device_logs.dispositivo_id
      AND (d.tenant_id IS NULL OR can_access_tenant_data(auth.uid(), d.tenant_id))
  )
);

CREATE POLICY "Authenticated can insert device logs"
ON public.device_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =========================================================
-- 6. quick_access_tokens: corrigir WITH CHECK quebrado
-- =========================================================
DROP POLICY IF EXISTS "Permitir gerenciamento de tokens para usuários autorizados" ON public.quick_access_tokens;

CREATE POLICY "Manage quick access tokens for tenant"
ON public.quick_access_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role IN ('admin','admin_global','tecnico')
        OR (up.tenant_id IS NOT NULL AND up.tenant_id = quick_access_tokens.tenant_id)
        OR (up.company_id IS NOT NULL AND up.company_id = quick_access_tokens.company_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role IN ('admin','admin_global','tecnico')
        OR (up.tenant_id IS NOT NULL AND up.tenant_id = quick_access_tokens.tenant_id)
        OR (up.company_id IS NOT NULL AND up.company_id = quick_access_tokens.company_id)
      )
  )
);

-- =========================================================
-- 7. empresas: restringir leitura
-- =========================================================
DROP POLICY IF EXISTS "Allow authenticated users to view all companies" ON public.empresas;

CREATE POLICY "Users can view their company"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
);

-- =========================================================
-- 8. processing_jobs: remover acesso anônimo
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.processing_jobs;

CREATE POLICY "Authenticated can insert jobs"
ON public.processing_jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can read jobs"
ON public.processing_jobs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can update jobs"
ON public.processing_jobs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =========================================================
-- 9. dispositivos: ativar RLS (já tem políticas tenant)
--    Manter leitura pública (Player anônimo precisa).
-- =========================================================
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read dispositivos for player"
ON public.dispositivos
FOR SELECT
TO anon, authenticated
USING (true);

-- =========================================================
-- 10. Habilitar RLS em tabelas legadas e adicionar políticas
--     Player anônimo precisa ler várias delas.
-- =========================================================

-- helper macro: enable RLS + public read + authenticated write
DO $$
DECLARE
  t text;
  public_read_tables text[] := ARRAY[
    'channels','distribution_channels','group_playlists',
    'imported_products','price_table_items','price_tables',
    'produtos','produtos_tako','sugeridos',
    'playlist_channel_items','playlist_channels',
    'medias_view','media_play_logs',
    'consultas_diarias','device_table_assignments','trade_marketing'
  ];
BEGIN
  FOREACH t IN ARRAY public_read_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I;
      CREATE POLICY "Public read %1$s" ON public.%1$I
        FOR SELECT TO anon, authenticated USING (true);
    $f$, t);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "Authenticated write %1$s" ON public.%1$I;
      CREATE POLICY "Authenticated write %1$s" ON public.%1$I
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    $f$, t);
  END LOOP;
END$$;
