ALTER TABLE public.campaign_contents ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.campaign_contents ADD COLUMN IF NOT EXISTS priority_override INTEGER DEFAULT 1;