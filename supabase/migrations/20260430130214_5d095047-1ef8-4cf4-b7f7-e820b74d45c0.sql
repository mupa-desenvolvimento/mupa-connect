-- Permite leitura anônima de lojas se houver um token de acesso rápido válido
DROP POLICY IF EXISTS "Public can read stores for quick access" ON public.stores;
CREATE POLICY "Public can read stores for quick access"
ON public.stores
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM quick_access_tokens
    WHERE (is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))
    AND store_id = stores.id
  )
);

-- Permite leitura anônima de dispositivos se houver um token de acesso rápido válido
DROP POLICY IF EXISTS "Public can read devices for quick access" ON public.dispositivos;
CREATE POLICY "Public can read devices for quick access"
ON public.dispositivos
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM quick_access_tokens
    WHERE (is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))
    AND (
      (device_id = dispositivos.id) OR
      (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM stores
        WHERE id = quick_access_tokens.store_id
        AND (
          code = dispositivos.num_filial OR
          regexp_replace(code, '[^0-9]', '', 'g') = regexp_replace(dispositivos.num_filial, '[^0-9]', '', 'g')
        )
      ))
    )
  )
);