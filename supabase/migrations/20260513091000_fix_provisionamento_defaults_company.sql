-- Fix: provisionamento automático estava criando playlist sem company_id (NOT NULL)

-- 1) Tornar a função antiga (por tenant) segura e compatível com playlists.company_id NOT NULL
CREATE OR REPLACE FUNCTION public.provision_tenant_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_playlist_id UUID;
  v_media1_id UUID := gen_random_uuid();
  v_media2_id UUID := gen_random_uuid();
BEGIN
  -- Se ainda não existe company para o tenant recém-criado, não provisionar aqui
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.tenant_id = NEW.id
  ORDER BY c.created_at
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Evitar duplicidade
  SELECT p.id INTO v_playlist_id
  FROM public.playlists p
  WHERE p.company_id = v_company_id
    AND p.is_company_default = true
  LIMIT 1;

  IF v_playlist_id IS NULL THEN
    INSERT INTO public.playlists (name, description, is_active, tenant_id, company_id, priority, is_company_default, is_default)
    VALUES (
      'Playlist Padrão',
      'Playlist inicial criada automaticamente',
      true,
      NEW.id,
      v_company_id,
      1,
      true,
      true
    )
    RETURNING id INTO v_playlist_id;
  END IF;

  INSERT INTO public.media_items (id, name, type, file_url, status, tenant_id, duration, company_id)
  VALUES
    (
      v_media1_id,
      'Mupa - Anuncie Aqui',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-1.png',
      'active',
      NEW.id,
      10,
      v_company_id
    ),
    (
      v_media2_id,
      'Mupa - Boas-vindas',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-2.png',
      'active',
      NEW.id,
      10,
      v_company_id
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.playlist_items (playlist_id, media_id, position, tipo, conteudo_id, duracao, ordem, ativo)
  VALUES
    (v_playlist_id, v_media1_id, 0, 'image', v_media1_id::text, 10, 0, true),
    (v_playlist_id, v_media2_id, 1, 'image', v_media2_id::text, 10, 1, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.groups (name, playlist_id, tenant_id, company_id)
  VALUES ('Grupo Padrão', v_playlist_id, NEW.id, v_company_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Provisionamento correto: por company (já temos company_id e tenant_id)
CREATE OR REPLACE FUNCTION public.provision_company_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_playlist_id UUID;
  v_media1_id UUID;
  v_media2_id UUID;
BEGIN
  -- Reusar playlist default se já existir
  SELECT p.id INTO v_playlist_id
  FROM public.playlists p
  WHERE p.company_id = NEW.id
    AND p.is_company_default = true
  LIMIT 1;

  IF v_playlist_id IS NULL THEN
    INSERT INTO public.playlists (name, description, is_active, tenant_id, company_id, priority, is_company_default, is_default)
    VALUES (
      'Playlist Padrão',
      'Playlist inicial criada automaticamente',
      true,
      NEW.tenant_id,
      NEW.id,
      1,
      true,
      true
    )
    RETURNING id INTO v_playlist_id;
  END IF;

  -- Atualizar default_playlist_id se a coluna existir (compatibilidade)
  BEGIN
    UPDATE public.companies
    SET default_playlist_id = COALESCE(default_playlist_id, v_playlist_id)
    WHERE id = NEW.id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- Media 1
  SELECT id INTO v_media1_id
  FROM public.media_items
  WHERE tenant_id = NEW.tenant_id
    AND company_id = NEW.id
    AND name = 'Mupa - Anuncie Aqui'
  LIMIT 1;

  IF v_media1_id IS NULL THEN
    v_media1_id := gen_random_uuid();
    INSERT INTO public.media_items (id, name, type, file_url, status, tenant_id, duration, company_id)
    VALUES (
      v_media1_id,
      'Mupa - Anuncie Aqui',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-1.png',
      'active',
      NEW.tenant_id,
      10,
      NEW.id
    );
  END IF;

  -- Media 2
  SELECT id INTO v_media2_id
  FROM public.media_items
  WHERE tenant_id = NEW.tenant_id
    AND company_id = NEW.id
    AND name = 'Mupa - Boas-vindas'
  LIMIT 1;

  IF v_media2_id IS NULL THEN
    v_media2_id := gen_random_uuid();
    INSERT INTO public.media_items (id, name, type, file_url, status, tenant_id, duration, company_id)
    VALUES (
      v_media2_id,
      'Mupa - Boas-vindas',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-2.png',
      'active',
      NEW.tenant_id,
      10,
      NEW.id
    );
  END IF;

  -- Itens da playlist (evitar duplicidade)
  IF NOT EXISTS (
    SELECT 1 FROM public.playlist_items
    WHERE playlist_id = v_playlist_id
      AND conteudo_id = v_media1_id::text
  ) THEN
    INSERT INTO public.playlist_items (playlist_id, media_id, position, tipo, conteudo_id, duracao, ordem, ativo)
    VALUES (v_playlist_id, v_media1_id, 0, 'image', v_media1_id::text, 10, 0, true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.playlist_items
    WHERE playlist_id = v_playlist_id
      AND conteudo_id = v_media2_id::text
  ) THEN
    INSERT INTO public.playlist_items (playlist_id, media_id, position, tipo, conteudo_id, duracao, ordem, ativo)
    VALUES (v_playlist_id, v_media2_id, 1, 'image', v_media2_id::text, 10, 1, true);
  END IF;

  -- Grupo padrão
  IF NOT EXISTS (
    SELECT 1 FROM public.groups
    WHERE tenant_id = NEW.tenant_id
      AND company_id = NEW.id
      AND name = 'Grupo Padrão'
  ) THEN
    INSERT INTO public.groups (name, playlist_id, tenant_id, company_id)
    VALUES ('Grupo Padrão', v_playlist_id, NEW.tenant_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_provision_company_defaults ON public.companies;
CREATE TRIGGER trg_provision_company_defaults
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_company_defaults();

-- 3) Evitar que o trigger por tenant quebre criação (se existir, remove)
DROP TRIGGER IF EXISTS trg_provision_tenant_defaults ON public.tenants;

