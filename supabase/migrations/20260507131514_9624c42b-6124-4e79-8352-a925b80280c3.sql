-- Create product_query_errors table
CREATE TABLE IF NOT EXISTS public.product_query_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID,
    store_id UUID,
    device_serial TEXT NOT NULL,
    device_name TEXT,
    store_name TEXT,
    ean TEXT,
    product_code TEXT,
    product_name TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.product_query_errors ENABLE ROW LEVEL SECURITY;

-- Create policies using user_tenant_mappings
CREATE POLICY "Users can view their own tenant's query errors"
    ON public.product_query_errors
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.user_tenant_mappings 
        WHERE user_id = auth.uid() 
        AND tenant_id = product_query_errors.tenant_id
    ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pqe_tenant_id ON public.product_query_errors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pqe_created_at ON public.product_query_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_pqe_device_serial ON public.product_query_errors(device_serial);
CREATE INDEX IF NOT EXISTS idx_pqe_ean ON public.product_query_errors(ean);
CREATE INDEX IF NOT EXISTS idx_pqe_error_type ON public.product_query_errors(error_type);
