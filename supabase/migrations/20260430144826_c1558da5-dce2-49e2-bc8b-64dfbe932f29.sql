-- Add deleted columns to media_items
ALTER TABLE public.media_items ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.media_items ADD COLUMN deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create trash logs table
CREATE TABLE public.media_trash_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('deleted', 'restored', 'permanent_deleted')),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on logs
ALTER TABLE public.media_trash_logs ENABLE ROW LEVEL SECURITY;

-- Policy for trash logs
CREATE POLICY "Users can view their own tenant trash logs"
ON public.media_trash_logs
FOR SELECT
TO authenticated
USING (true);

-- Create function to log trash actions (to be used via RPC or triggers)
CREATE OR REPLACE FUNCTION public.log_media_trash_action(
    p_media_id UUID,
    p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.media_trash_logs (media_id, action, user_id)
    VALUES (p_media_id, p_action, auth.uid());
END;
$$;