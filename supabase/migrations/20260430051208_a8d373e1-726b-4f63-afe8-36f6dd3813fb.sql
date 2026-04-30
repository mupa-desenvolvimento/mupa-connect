UPDATE public.dispositivos d
SET company_id = c.id
FROM public.companies c
WHERE LOWER(d.empresa) = LOWER(c.code)
AND d.company_id IS NULL;
