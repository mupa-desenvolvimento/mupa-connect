-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins podem gerenciar tokens" ON quick_access_tokens;

-- Create a more flexible policy for authenticated users
CREATE POLICY "Permitir gerenciamento de tokens para usuários autorizados"
ON public.quick_access_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (
      user_profiles.role IN ('admin', 'admin_global', 'tecnico')
      OR (user_profiles.tenant_id IS NOT NULL AND user_profiles.tenant_id = quick_access_tokens.tenant_id)
      OR (user_profiles.company_id IS NOT NULL AND user_profiles.company_id = quick_access_tokens.company_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (
      user_profiles.role IN ('admin', 'admin_global', 'tecnico')
      OR (user_profiles.tenant_id IS NOT NULL AND user_profiles.tenant_id = tenant_id)
      OR (user_profiles.company_id IS NOT NULL AND user_profiles.company_id = company_id)
    )
  )
);

-- Ensure anonymous select still works for player access (already exists but reaffirming)
DROP POLICY IF EXISTS "Leitura anônima via token" ON quick_access_tokens;
CREATE POLICY "Leitura anônima via token"
ON public.quick_access_tokens
FOR SELECT
TO public
USING ((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())));