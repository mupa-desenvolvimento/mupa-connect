-- Função para registrar manualmente mídias que já estão no R2/Cloudflare mas não no banco
CREATE OR REPLACE FUNCTION public.sync_cloudflare_media(
  p_tenant_id UUID,
  p_company_folder TEXT,
  p_files TEXT[] -- Array de nomes de arquivos (ex: ['video1.mp4', 'image1.jpg'])
) RETURNS VOID AS $$
DECLARE
  v_file_name TEXT;
  v_public_base_url TEXT := 'https://pub-0e15cc358ba84ff2a24226b12278433b.r2.dev/media/'; -- URL base do seu R2
BEGIN
  FOREACH v_file_name IN ARRAY p_files LOOP
    INSERT INTO public.media_items (
      name,
      type,
      file_url,
      tenant_id,
      status,
      metadata
    )
    VALUES (
      v_file_name,
      CASE WHEN v_file_name ILIKE '%.mp4' OR v_file_name ILIKE '%.mov' THEN 'video' ELSE 'image' END,
      v_public_base_url || p_company_folder || '/' || v_file_name,
      p_tenant_id,
      'active',
      jsonb_build_object('r2_key', 'media/' || p_company_folder || '/' || v_file_name)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
