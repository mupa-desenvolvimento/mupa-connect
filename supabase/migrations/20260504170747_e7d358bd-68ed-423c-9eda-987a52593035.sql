-- Create media_events table
CREATE TABLE public.media_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id INTEGER REFERENCES public.dispositivos(id) ON DELETE CASCADE,
    media_id TEXT, 
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL DEFAULT 'view',
    duration INTEGER, 
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view media events of their tenant" 
ON public.media_events 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.dispositivos d
        JOIN public.user_tenant_mappings utm ON utm.tenant_id = d.tenant_id
        WHERE d.id = media_events.device_id 
        AND utm.user_id = auth.uid()
    )
);

CREATE POLICY "Allow insertions from players" 
ON public.media_events 
FOR INSERT 
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_media_events_device_id ON public.media_events(device_id);
CREATE INDEX idx_media_events_media_id ON public.media_events(media_id);
CREATE INDEX idx_media_events_created_at ON public.media_events(created_at);