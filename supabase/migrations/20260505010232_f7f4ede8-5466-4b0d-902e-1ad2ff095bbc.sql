-- 1. Adicionar colunas necessárias à tabela device_quick_actions
-- Referenciando public.tenants(id) que tem restrição de unicidade (PKEY)
ALTER TABLE public.device_quick_actions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Tornar device_id opcional para permitir botões compartilhados no tenant
ALTER TABLE public.device_quick_actions 
ALTER COLUMN device_id DROP NOT NULL;

-- 3. Preencher tenant_id para registros existentes baseado no dispositivo
UPDATE public.device_quick_actions dqa
SET tenant_id = d.tenant_id
FROM public.dispositivos d
WHERE dqa.device_id = d.id
AND dqa.tenant_id IS NULL;

-- 4. Habilitar RLS
ALTER TABLE public.device_quick_actions ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de segurança para isolamento multi-tenant
DROP POLICY IF EXISTS "Quick actions: Multi-tenant access" ON public.device_quick_actions;
CREATE POLICY "Quick actions: Multi-tenant access" 
ON public.device_quick_actions 
FOR ALL 
TO authenticated 
USING (
  public.is_super_admin(auth.uid()) OR 
  tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR 
  tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 6. Trigger para preencher tenant_id e created_by automaticamente
CREATE OR REPLACE FUNCTION public.set_quick_action_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid());
  END IF;
  
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_set_quick_action_defaults ON public.device_quick_actions;
CREATE TRIGGER tr_set_quick_action_defaults
BEFORE INSERT ON public.device_quick_actions
FOR EACH ROW
EXECUTE FUNCTION public.set_quick_action_defaults();