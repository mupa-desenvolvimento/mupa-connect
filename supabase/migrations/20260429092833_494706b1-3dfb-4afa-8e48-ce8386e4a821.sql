-- 1. Inserir todas as filiais da Stok Center que ainda não estão vinculadas a grupos de lojas
INSERT INTO public.group_stores (group_id, store_id)
SELECT 
    'ff03b0a3-6784-45d8-90b7-5f6699d4caed'::uuid as group_id, 
    id as store_id
FROM public.stores
WHERE tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
AND id NOT IN (SELECT store_id FROM public.group_stores);

-- 2. Atualizar todos os dispositivos da empresa para pertencerem a um grupo de dispositivos padrão
-- ou diretamente ao grupo de lojas, dependendo da estrutura final que queremos expor.
-- Por enquanto, garantimos que a hierarquia reflita que tudo pertence ao Stok Center (tenant_id).

-- 3. Caso existam grupos de dispositivos soltos (sem store_id), vinculamos ao tenant
UPDATE public.device_groups 
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
WHERE tenant_id IS NULL;

-- 4. Garantir que todas as stores tenham o tenant_id correto (Stok Center)
UPDATE public.stores
SET tenant_id = 'f822bf9d-39e9-4726-82f7-c16bf267bc39'
WHERE name LIKE 'Filial %' AND (tenant_id IS NULL OR tenant_id = 'f4731510-2f45-462c-b602-fe056bd5acc5');