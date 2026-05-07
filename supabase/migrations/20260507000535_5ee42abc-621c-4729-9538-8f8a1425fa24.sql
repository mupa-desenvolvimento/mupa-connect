-- Create WhatsApp Instances table
CREATE TABLE public.whatsapp_instances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    instance_key TEXT UNIQUE,
    status TEXT DEFAULT 'disconnected', -- connected, disconnected, connecting
    phone TEXT,
    last_connection_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp Recipients table
CREATE TABLE public.whatsapp_recipients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    alert_types TEXT[], -- Array of strings: 'offline', 'price_error', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp Logs table
CREATE TABLE public.whatsapp_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- sent, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Only SuperAdmins/Admins depending on role logic, but requested for SuperAdmin module)
CREATE POLICY "SuperAdmins can do everything on whatsapp_instances" 
ON public.whatsapp_instances FOR ALL 
USING (public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "SuperAdmins can do everything on whatsapp_recipients" 
ON public.whatsapp_recipients FOR ALL 
USING (public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "SuperAdmins can view whatsapp_logs" 
ON public.whatsapp_logs FOR SELECT 
USING (public.has_role(auth.uid(), 'admin_global'));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_recipients_updated_at BEFORE UPDATE ON public.whatsapp_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();