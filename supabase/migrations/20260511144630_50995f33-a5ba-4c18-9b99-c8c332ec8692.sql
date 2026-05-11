
-- 1. Enable RLS on tables that have policies but RLS off
ALTER TABLE public.device_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

-- 2. Drop view that exposes auth.users
DROP VIEW IF EXISTS public.vw_user_creation_status;

-- 3. Recreate views with security_invoker
ALTER VIEW public.filtered_medias SET (security_invoker = true);
ALTER VIEW public.produtos_sorted SET (security_invoker = true);
ALTER VIEW public.vw_auditoria_relatorio SET (security_invoker = true);

-- 4. Set search_path on all SECURITY DEFINER functions missing it
ALTER FUNCTION public.auditoria_listar_dispositivos_orfaos() SET search_path = public;
ALTER FUNCTION public.auditoria_verificar_integridade() SET search_path = public;
ALTER FUNCTION public.check_media_in_use(uuid) SET search_path = public;
ALTER FUNCTION public.device_heartbeat(text, text, uuid) SET search_path = public;
ALTER FUNCTION public.device_heartbeat(text) SET search_path = public;
ALTER FUNCTION public.get_device_config(text) SET search_path = public;
ALTER FUNCTION public.get_dispositivo_por_serial(text, text, jsonb, text, text, uuid, text, jsonb, text, text, boolean, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user_permissions() SET search_path = public;
ALTER FUNCTION public.handle_new_user_profile() SET search_path = public;
ALTER FUNCTION public.handle_product_queries_log_ids() SET search_path = public;
ALTER FUNCTION public.issue_reload_command_to_affected_devices(text[]) SET search_path = public;
ALTER FUNCTION public.log_audit_action(text, bigint, jsonb, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.log_media_trash_action(uuid, text) SET search_path = public;
ALTER FUNCTION public.on_playlist_item_change() SET search_path = public;
ALTER FUNCTION public.on_structural_change_trigger() SET search_path = public;
ALTER FUNCTION public.provision_tenant_defaults() SET search_path = public;
ALTER FUNCTION public.register_play_logs(text, jsonb) SET search_path = public;
ALTER FUNCTION public.set_quick_action_defaults() SET search_path = public;
ALTER FUNCTION public.sync_cloudflare_media(uuid, text, text[]) SET search_path = public;
ALTER FUNCTION public.sync_device_playlist(uuid) SET search_path = public;
ALTER FUNCTION public.sync_product_query_error() SET search_path = public;
ALTER FUNCTION public.sync_user_role() SET search_path = public;
