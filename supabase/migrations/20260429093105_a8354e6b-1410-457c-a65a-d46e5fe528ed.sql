-- 1. Vincular todas as filiais da Stok Center ao Grupo Padrão (ff03b0a3-6784-45d8-90b7-5f6699d4caed)
INSERT INTO public.group_stores (group_id, store_id)
SELECT 
    'ff03b0a3-6784-45d8-90b7-5f6699d4caed'::uuid, 
    id 
FROM public.stores
WHERE tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
ON CONFLICT DO NOTHING;

-- 2. Vincular Grupos de Dispositivos às Lojas corretas
-- Filial 47 (Loja Conceito/Padrão de testes comum)
UPDATE public.device_groups 
SET store_id = (SELECT id FROM public.stores WHERE name = 'Filial 47' AND tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39')
WHERE name ILIKE '%Consulta Preço%' AND store_id IS NULL;

-- Filial 63
UPDATE public.device_groups 
SET store_id = (SELECT id FROM public.stores WHERE name = 'Filial 63' AND tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39')
WHERE name ILIKE '%açougue%' AND store_id IS NULL;

-- 3. Garantir que a função RPC reflita os dados mais recentes (ela já é dinâmica, mas os dados precisam estar consistentes)
-- Verificação de tenant_id nos grupos de dispositivos
UPDATE public.device_groups 
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
WHERE tenant_id IS NULL OR tenant_id != 'f822bf9d-39e9-4726-82f7-c16bf267bc39';

-- 4. Limpar qualquer vínculo antigo de devices que aponte para stores erradas
-- (Neste caso, os devices já parecem estar apontando para num_filial, mas a tabela devices precisa ter o store_id preenchido para a contagem na árvore)
UPDATE public.devices d
SET store_id = s.id
FROM public.stores s
WHERE s.name = 'Filial ' || LPAD(d.store_code, 2, '0')
AND s.tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
AND d.store_id IS NULL;

-- Fallback for common Filial names
UPDATE public.devices d
SET store_id = s.id
FROM public.stores s
WHERE s.name = 'Filial 47'
AND d.store_code = '47'
AND d.store_id IS NULL;