-- 1. Normalização e Backfill de Dispositivos (Store e Tenant)
WITH matched_stores AS (
    SELECT 
        d.id as device_id,
        s.id as store_id,
        s.tenant_id
    FROM dispositivos d
    JOIN stores s ON 
        TRIM(LEADING '0' FROM TRIM(BOTH ' ' FROM REPLACE(REPLACE(UPPER(d.num_filial), 'FIL-', ''), ' ', ''))) = 
        TRIM(LEADING '0' FROM TRIM(BOTH ' ' FROM REPLACE(REPLACE(UPPER(s.code), 'FIL-', ''), ' ', '')))
    WHERE d.store_id IS NULL OR d.tenant_id IS NULL
)
UPDATE dispositivos
SET 
    store_id = matched_stores.store_id,
    tenant_id = COALESCE(dispositivos.tenant_id, matched_stores.tenant_id)
FROM matched_stores
WHERE dispositivos.id = matched_stores.device_id;

-- 2. Garantir que dispositivos com store_id tenham o mesmo tenant_id da loja
UPDATE dispositivos d
SET tenant_id = s.tenant_id
FROM stores s
WHERE d.store_id = s.id AND (d.tenant_id IS NULL OR d.tenant_id <> s.tenant_id);

-- 3. Backfill tenant_id em tabelas de vínculo de grupos se estiverem nulos
UPDATE group_devices gd
SET tenant_id = g.tenant_id
FROM groups g
WHERE gd.group_id = g.id AND gd.tenant_id IS NULL;

UPDATE group_stores gs
SET tenant_id = g.tenant_id
FROM groups g
WHERE gs.group_id = g.id AND gs.tenant_id IS NULL;

-- 4. Relatório de migração
INSERT INTO migration_report (step, details)
VALUES ('groups_consistency_fix', 
    jsonb_build_object(
        'timestamp', now(),
        'devices_linked_to_stores', (SELECT count(*) FROM dispositivos WHERE store_id IS NOT NULL),
        'devices_without_store', (SELECT count(*) FROM dispositivos WHERE store_id IS NULL),
        'devices_without_tenant', (SELECT count(*) FROM dispositivos WHERE tenant_id IS NULL),
        'groups_total', (SELECT count(*) FROM groups)
    )
);
