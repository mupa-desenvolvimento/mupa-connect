-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can manage their company monitoring views" ON public.monitoring_views;

-- Create more reliable policies based on user_profiles
CREATE POLICY "Users can manage monitoring views for their company" 
ON public.monitoring_views 
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);