-- Vincular o usuário antunes+zaffari@mupa.app à empresa Stock Center
-- User ID: a3206408-4513-42ff-97cf-caf4366da5dd
-- Tenant ID: f822bf9d-39e9-4726-82f7-c16bf267bc39 (Stock Center)

INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
VALUES ('a3206408-4513-42ff-97cf-caf4366da5dd', 'f822bf9d-39e9-4726-82f7-c16bf267bc39', true)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_tenant_admin = true;
