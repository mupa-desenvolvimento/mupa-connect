-- Habilitar RLS em tabelas que possuem políticas mas estavam desprotegidas
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newmedias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_queries_log ENABLE ROW LEVEL SECURITY;

-- Nota: Como as políticas já existem (conforme identificado na auditoria), 
-- a ativação do RLS fará com que o PostgreSQL passe a aplicá-las imediatamente.
