-- 1. Corrigir a função de provisionamento automático que estava falhando devido a campos não nulos faltantes
CREATE OR REPLACE FUNCTION public.provision_tenant_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_playlist_id UUID;
  v_media1_id UUID := gen_random_uuid();
  v_media2_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create Default Playlist
  INSERT INTO public.playlists (name, description, is_active, tenant_id, priority)
  VALUES (
    'Playlist Padrão',
    'Playlist inicial criada automaticamente',
    true,
    NEW.id,
    1
  )
  RETURNING id INTO v_playlist_id;

  -- 2. Create Default Media Items
  INSERT INTO public.media_items (id, name, type, file_url, status, tenant_id, duration)
  VALUES 
    (
      v_media1_id,
      'Mupa - Anuncie Aqui',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-1.png',
      'active',
      NEW.id,
      10
    ),
    (
      v_media2_id,
      'Mupa - Boas-vindas',
      'image',
      'https://pub-8963c775ad9a4e9a89db3ef860c4c123.r2.dev/mupa-intro-2.png',
      'active',
      NEW.id,
      10
    );

  -- 3. Link Media Items to Playlist (Corrigido para incluir campos obrigatórios 'tipo', 'conteudo_id', 'duracao', 'ordem', 'ativo', 'playlist_id')
  INSERT INTO public.playlist_items (playlist_id, media_id, position, tipo, conteudo_id, duracao, ordem, ativo)
  VALUES 
    (v_playlist_id, v_media1_id, 0, 'image', v_media1_id::text, 10, 0, true),
    (v_playlist_id, v_media2_id, 1, 'image', v_media2_id::text, 10, 1, true);

  -- 4. Create Default Group
  INSERT INTO public.groups (name, playlist_id, tenant_id)
  VALUES (
    'Grupo Padrão',
    v_playlist_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o tenant Stock Center
INSERT INTO public.tenants (id, name, slug, schema_name, is_active)
VALUES (
  'f822bf9d-39e9-4726-82f7-c16bf267bc39', 
  'Stock Center', 
  'stock-center', 
  'tenant_stock_center', 
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = 'Stock Center', 
  slug = 'stock-center',
  schema_name = 'tenant_stock_center';

-- 3. Vincular o usuário logan.lima@mupa.app
INSERT INTO public.user_tenant_mappings (user_id, tenant_id, is_tenant_admin)
VALUES ('3b1612a6-7781-489d-8a0a-f8c26bf36c11', 'f822bf9d-39e9-4726-82f7-c16bf267bc39', true)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_tenant_admin = true;
