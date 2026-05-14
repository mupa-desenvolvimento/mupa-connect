DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'audience_detections'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'audience_detections'
        AND column_name = 'screen_time'
    ) THEN
      ALTER TABLE public.audience_detections
        ADD COLUMN screen_time integer;
    END IF;
  END IF;
END $$;

