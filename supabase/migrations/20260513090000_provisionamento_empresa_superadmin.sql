DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'provision_tenant_defaults'
  ) THEN
    DROP TRIGGER IF EXISTS trg_provision_tenant_defaults ON public.tenants;
    CREATE TRIGGER trg_provision_tenant_defaults
      AFTER INSERT ON public.tenants
      FOR EACH ROW
      EXECUTE FUNCTION public.provision_tenant_defaults();
  END IF;
END $$;

