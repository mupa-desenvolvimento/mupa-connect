-- Refazer política de delete para permitir exclusão física na lixeira
DROP POLICY IF EXISTS "media_items_delete_policy" ON public.media_items;
CREATE POLICY "media_items_delete_policy"
ON public.media_items
FOR DELETE
TO authenticated
USING (true);

-- Política para os logs de lixeira
DROP POLICY IF EXISTS "Users can view their own tenant trash logs" ON public.media_trash_logs;
CREATE POLICY "media_items_trash_logs_insert"
ON public.media_trash_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "media_items_trash_logs_select"
ON public.media_trash_logs
FOR SELECT
TO authenticated
USING (true);