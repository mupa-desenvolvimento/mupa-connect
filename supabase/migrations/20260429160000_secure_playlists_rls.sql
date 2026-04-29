-- 1. Habilitar RLS na tabela playlists e playlist_items
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public read playlists" ON public.playlists;
DROP POLICY IF EXISTS "Public read playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Gerenciamento de playlists por tenant" ON public.playlists;
DROP POLICY IF EXISTS "Gerenciamento de itens de playlist por tenant" ON public.playlist_items;

-- 3. Políticas para PLAYLISTS

-- LEITURA: Usuários veem playlists do seu tenant ou se forem super admins. 
-- Mantemos leitura pública para o Player (dispositivos) via check de tenant_id nulo ou se for autenticado.
-- Na verdade, o Player muitas vezes não está autenticado como usuário, então usamos a política pública cautelosamente.
CREATE POLICY "Leitura de playlists por tenant"
ON public.playlists
FOR SELECT
TO public
USING (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
    OR auth.uid() IS NULL -- Permite leitura pública (Player)
);

-- INSERÇÃO: Apenas para o próprio tenant
CREATE POLICY "Inserção de playlists por tenant"
ON public.playlists
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);

-- ATUALIZAÇÃO: Apenas para o próprio tenant
CREATE POLICY "Atualização de playlists por tenant"
ON public.playlists
FOR UPDATE
TO authenticated
USING (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
)
WITH CHECK (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);

-- EXCLUSÃO: Apenas para o próprio tenant
CREATE POLICY "Exclusão de playlists por tenant"
ON public.playlists
FOR DELETE
TO authenticated
USING (
    tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
    OR is_super_admin(auth.uid())
);

-- 4. Políticas para PLAYLIST_ITEMS (vinculadas à playlist pai)

CREATE POLICY "Leitura de itens por tenant"
ON public.playlist_items
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p 
        WHERE p.id = playlist_id 
        AND (
            p.tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
            OR is_super_admin(auth.uid())
            OR auth.uid() IS NULL
        )
    )
);

CREATE POLICY "Gerenciamento de itens por tenant"
ON public.playlist_items
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.playlists p 
        WHERE p.id = playlist_id 
        AND (
            p.tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
            OR is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.playlists p 
        WHERE p.id = playlist_id 
        AND (
            p.tenant_id IN (SELECT m.tenant_id FROM public.user_tenant_mappings m WHERE m.user_id = auth.uid())
            OR is_super_admin(auth.uid())
        )
    )
);
