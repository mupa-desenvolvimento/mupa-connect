-- Alter 'empresas' table to add '_id' and 'logotipo'
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS _id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS logotipo TEXT;

-- If 'logo_url' exists and 'logotipo' is empty, we could copy data, 
-- but since the table is empty, we'll just ensure 'logotipo' is the main column.
-- (Optional: DROP COLUMN logo_url if not needed, but keeping it for safety for now)

-- Update 'dispositivos' to establish relationship if possible
-- First, ensure all current values in dispositivos.empresa exist in empresas._id (they don't yet)
-- So we won't add the constraint immediately to avoid errors, 
-- but we prepare the table.

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_empresas_bubble_id ON public.empresas(_id);
