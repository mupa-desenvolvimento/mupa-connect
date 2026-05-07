-- Tabela para armazenar as análises do Inky AI
CREATE TABLE public.inky_insights (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    analysis_type TEXT NOT NULL, -- 'operational', 'performance', 'preventive'
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    insight_data JSONB NOT NULL, -- Contém badges, indicadores e cards
    executive_summary TEXT,
    filters_used JSONB -- Filtros aplicados na consulta (loja, dispositivo, etc)
);

-- Habilitar RLS
ALTER TABLE public.inky_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their own insights" 
ON public.inky_insights 
FOR SELECT 
USING (
    (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())) AND
    (company_id IS NULL OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can create insights" 
ON public.inky_insights 
FOR INSERT 
WITH CHECK (true); -- Permitir criação (validação via app logic)

-- Índice para performance
CREATE INDEX idx_inky_insights_tenant_company ON public.inky_insights(tenant_id, company_id);
CREATE INDEX idx_inky_insights_created_at ON public.inky_insights(created_at DESC);