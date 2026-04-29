-- 1. Update public.users for the admins
UPDATE public.users 
SET role = 'admin' 
WHERE email IN ('adriano.antunes@mupa.app', 'beatrice.quines@mupa.app', 'appmupa@gmail.com', 'logan.lima@mupa.app');

-- 2. Assign 'admin_global' role in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin_global'::public.app_role 
FROM public.users 
WHERE email IN ('adriano.antunes@mupa.app', 'beatrice.quines@mupa.app', 'appmupa@gmail.com', 'logan.lima@mupa.app')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Link them to the 'Mupa Testes' tenant (SuperAdmin context)
INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
SELECT u.id, '56940f6d-f147-4534-a7ad-0ef300f95b8a', true
FROM public.users u
WHERE u.email IN ('adriano.antunes@mupa.app', 'beatrice.quines@mupa.app', 'appmupa@gmail.com', 'logan.lima@mupa.app')
ON CONFLICT DO NOTHING;
