-- 1. Inserir a integração base para o Assaí
INSERT INTO public.api_integrations (
  id,
  name,
  slug,
  description,
  base_url,
  is_active,
  default_settings
) VALUES (
  'd9c8b7a6-5e4d-3c2b-1a0f-9e8d7c6b5a41', -- UUID gerado para a integração
  'Assai',
  'assai',
  'Integração Assai para consulta de preços e sequência de produtos',
  'http://srv-mupa.ddns.net:5050',
  true,
  '{"image_base_url": "http://srv-mupa.ddns.net:5050/produto-imagem"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- 2. Vincular a empresa Grupo Assaí (687b2692-dab7-4934-8ed1-eee6eb02dbb8) à integração
INSERT INTO public.company_integrations (
  company_id,
  integration_id,
  is_active,
  settings
) VALUES (
  '687b2692-dab7-4934-8ed1-eee6eb02dbb8',
  'd9c8b7a6-5e4d-3c2b-1a0f-9e8d7c6b5a41',
  true,
  '{"loja": "53", "store_code": "53"}'::jsonb
) ON CONFLICT (company_id, integration_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  settings = EXCLUDED.settings;
