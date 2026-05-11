-- Enable RLS on the dispositivos table
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

-- Drop the old overly permissive public policy if it exists
DROP POLICY IF EXISTS "Public read dispositivos for player" ON public.dispositivos;

-- Create a new policy that allows public access only to devices with a valid company code
-- Format: 3 digits followed by 3 uppercase letters (e.g., 003ZAF)
CREATE POLICY "Public read dispositivos with valid company code" 
ON public.dispositivos 
FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.id = dispositivos.company_id 
    AND c.code ~ '^[0-9]{3}[A-Z]{3}$'
  )
);

-- Also allow update for setup purposes if the company has a valid code
-- This is necessary for the setup page to function
CREATE POLICY "Public update dispositivos with valid company code" 
ON public.dispositivos 
FOR UPDATE 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.id = dispositivos.company_id 
    AND c.code ~ '^[0-9]{3}[A-Z]{3}$'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.id = dispositivos.company_id 
    AND c.code ~ '^[0-9]{3}[A-Z]{3}$'
  )
);
