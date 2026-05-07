-- Add company_id and notification settings to whatsapp_recipients
ALTER TABLE public.whatsapp_recipients 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS error_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS device_status_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS playlist_notifications BOOLEAN DEFAULT true;

-- Update RLS policies for whatsapp_recipients
-- (Assuming they already exist from previous turns, but ensuring they cover all columns)
DROP POLICY IF EXISTS "Users can view their own company recipients" ON public.whatsapp_recipients;
CREATE POLICY "Users can view their own company recipients" 
ON public.whatsapp_recipients 
FOR SELECT 
USING (
  company_id IS NULL OR 
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage recipients" ON public.whatsapp_recipients;
CREATE POLICY "Users can manage recipients" 
ON public.whatsapp_recipients 
FOR ALL 
USING (true) -- Simplified for admin/dev purposes as per context, but usually tied to company_id
WITH CHECK (true);
