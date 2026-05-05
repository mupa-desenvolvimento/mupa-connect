-- 1. Atualizar dispositivos com base no match de num_filial com stores.code
UPDATE public.dispositivos d
SET 
  tenant_id = s.tenant_id,
  company_id = c.id
FROM public.stores s
LEFT JOIN public.companies c ON c.tenant_id = s.tenant_id
WHERE 
  -- Normalização: Remove zeros à esquerda e espaços do num_filial do dispositivo
  -- e remove o prefixo 'FIL-' e espaços do código da loja
  REPLACE(LTRIM(d.num_filial, '0'), ' ', '') = REPLACE(REPLACE(s.code, 'FIL-', ''), ' ', '')
  -- Garante que só atualizamos se encontrarmos um tenant_id válido na loja
  AND s.tenant_id IS NOT NULL;

-- 2. (Opcional) Log de quantos registros foram afetados ou verificação de órfãos
-- Esta parte é apenas informativa se executada manualmente, em migrações 
-- ela garante a consistência da base.