-- 1. Remover políticas que dependem da coluna
DROP POLICY IF EXISTS "Admins can manage playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Authenticated can read playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Users can manage playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Users can view playlist items" ON public.playlist_items;

-- 2. Converter playlist_id para UUID
ALTER TABLE public.playlist_items 
ALTER COLUMN playlist_id TYPE UUID USING playlist_id::UUID;

-- 3. Remover registros órfãos
DELETE FROM public.playlist_items WHERE playlist_id NOT IN (SELECT id FROM public.playlists);
DELETE FROM public.playlist_items WHERE media_id IS NOT NULL AND media_id NOT IN (SELECT id FROM public.media_items);

-- 4. Adicionar chaves estrangeiras
ALTER TABLE public.playlist_items
ADD CONSTRAINT fk_playlist_items_playlist
FOREIGN KEY (playlist_id) 
REFERENCES public.playlists(id)
ON DELETE CASCADE;

ALTER TABLE public.playlist_items
ADD CONSTRAINT fk_playlist_items_media
FOREIGN KEY (media_id) 
REFERENCES public.media_items(id)
ON DELETE CASCADE;

-- 5. Recriar políticas de segurança
CREATE POLICY "Admins can manage playlist items" 
ON public.playlist_items 
FOR ALL 
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated can read playlist items" 
ON public.playlist_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage playlist items" 
ON public.playlist_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_items.playlist_id 
    AND (p.tenant_id IS NULL OR p.tenant_id IN (SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()))
  )
);

CREATE POLICY "Users can view playlist items" 
ON public.playlist_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_items.playlist_id 
    AND (p.tenant_id IS NULL OR p.tenant_id IN (SELECT tenant_id FROM public.user_tenant_mappings WHERE user_id = auth.uid()))
  )
);

-- 6. Criar índices
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_media_id ON public.playlist_items(media_id);