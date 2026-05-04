CREATE TABLE public.device_quick_actions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES public.dispositivos(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    command_type TEXT NOT NULL,
    command_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_quick_actions ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users
CREATE POLICY "Authenticated users can view device quick actions" 
ON public.device_quick_actions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage device quick actions" 
ON public.device_quick_actions FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_device_quick_actions_updated_at
BEFORE UPDATE ON public.device_quick_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
