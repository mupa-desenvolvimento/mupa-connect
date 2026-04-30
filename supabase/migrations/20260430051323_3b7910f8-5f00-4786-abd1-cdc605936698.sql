-- Logan como Admin Global
INSERT INTO public.user_profiles (id, role)
VALUES ('3b1612a6-7781-489d-8a0a-f8c26bf36c11', 'admin_global')
ON CONFLICT (id) DO UPDATE SET role = 'admin_global';

-- Antunes Zaffari como Admin da empresa Zaffari
INSERT INTO public.user_profiles (id, company_id, role)
VALUES ('a3206408-4513-42ff-97cf-caf4366da5dd', 'fd55dbdd-63da-442e-aa99-5575c0496622', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', company_id = 'fd55dbdd-63da-442e-aa99-5575c0496622';
