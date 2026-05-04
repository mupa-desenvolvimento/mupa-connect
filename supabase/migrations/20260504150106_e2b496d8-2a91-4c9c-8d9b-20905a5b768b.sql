-- Create apps table
CREATE TABLE public.apps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_companies junction table
CREATE TABLE public.app_companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(app_id, company_id)
);

-- Enable RLS
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_companies ENABLE ROW LEVEL SECURITY;

-- Policies for apps
CREATE POLICY "SuperAdmin can manage apps" ON public.apps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    );

CREATE POLICY "Users can view apps linked to their company" ON public.apps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.app_companies ac
            JOIN public.user_profiles up ON ac.company_id = up.company_id
            WHERE ac.app_id = public.apps.id AND up.id = auth.uid()
        )
    );

-- Policies for app_companies
CREATE POLICY "SuperAdmin can manage app_companies" ON public.app_companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    );

CREATE POLICY "Users can view app_companies" ON public.app_companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.company_id = public.app_companies.company_id AND up.id = auth.uid()
        )
    );

-- Create storage bucket for APKs
INSERT INTO storage.buckets (id, name, public) VALUES ('apks', 'apks', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for APKs
CREATE POLICY "SuperAdmin can upload APKs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'apks' AND 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    );

CREATE POLICY "SuperAdmin can update APKs" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'apks' AND 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    );

CREATE POLICY "SuperAdmin can delete APKs" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'apks' AND 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin_global'
        )
    );

CREATE POLICY "Authenticated users can download APKs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'apks' AND auth.role() = 'authenticated'
    );
