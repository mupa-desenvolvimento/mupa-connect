-- Habilitar leitura pública para dispositivos não autenticados (Player)
CREATE POLICY "Public read playlists" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Public read playlist items" ON public.playlist_items FOR SELECT USING (true);
CREATE POLICY "Public read media items" ON public.media_items FOR SELECT USING (true);

-- Garantir que a role anon tem permissão de SELECT nestas tabelas
GRANT SELECT ON public.playlists TO anon;
GRANT SELECT ON public.playlist_items TO anon;
GRANT SELECT ON public.media_items TO anon;