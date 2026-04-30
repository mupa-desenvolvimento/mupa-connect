-- Backfill company_id based on tenant_id
-- We pick one company_id from user_profiles that matches the tenant_id
UPDATE public.media_items m
SET company_id = (
    SELECT company_id 
    FROM public.user_profiles up 
    WHERE up.tenant_id = m.tenant_id 
    LIMIT 1
)
WHERE m.company_id IS NULL;