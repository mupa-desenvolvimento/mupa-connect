-- Identificador do grupo a manter: ff03b0a3-6784-45d8-90b7-5f6699d4caed (Grupo Padrão do Comercial Zaffari)

-- 1. Remover vínculos de dispositivos de todos os grupos exceto o que será mantido
DELETE FROM public.group_devices
WHERE group_id <> 'ff03b0a3-6784-45d8-90b7-5f6699d4caed';

-- 2. Remover vínculos de lojas de todos os grupos exceto o que será mantido
DELETE FROM public.group_stores
WHERE group_id <> 'ff03b0a3-6784-45d8-90b7-5f6699d4caed';

-- 3. Remover subgrupos ou referências circulares (se houver parent_id apontando para grupos que serão deletados)
UPDATE public.groups
SET parent_id = NULL
WHERE parent_id <> 'ff03b0a3-6784-45d8-90b7-5f6699d4caed' 
   OR (parent_id IS NOT NULL AND id <> 'ff03b0a3-6784-45d8-90b7-5f6699d4caed');

-- 4. Deletar todos os grupos exceto o "Grupo Padrão" do Comercial Zaffari
DELETE FROM public.groups
WHERE id <> 'ff03b0a3-6784-45d8-90b7-5f6699d4caed';
