-- Adicionar coluna de cor na tabela de campanhas
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#9b87f5';

-- Criar tabela de vínculo entre playlists e campanhas
CREATE TABLE IF NOT EXISTS public.playlist_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(playlist_id, campaign_id)
);

-- Ativar RLS para playlist_campaigns
ALTER TABLE public.playlist_campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas para playlist_campaigns
CREATE POLICY "Users can view playlist_campaigns in their tenant" 
ON public.playlist_campaigns FOR SELECT 
USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage playlist_campaigns in their tenant" 
ON public.playlist_campaigns FOR ALL 
USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Garantir tenant_id em campaign_contents
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_contents' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.campaign_contents ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
END $$;

-- Criar trigger para updated_at em playlist_campaigns
CREATE TRIGGER update_playlist_campaigns_updated_at
BEFORE UPDATE ON public.playlist_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();