-- ============================================
-- Auto-cleanup: Delete documents older than 3 months
-- This will automatically remove old documents and their related data
-- ============================================

-- Create a function to clean up old documents
CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete documents older than 3 months
  -- The CASCADE delete will automatically remove:
  -- - signature_fields (via foreign key)
  -- - document_signers (via foreign key)
  -- - signature_placements (via foreign key)
  -- - audit_trail (via foreign key)
  DELETE FROM public.documents
  WHERE created_at < NOW() - INTERVAL '3 months';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up documents older than 3 months';
END;
$$;

-- Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at 2 AM UTC
-- This checks every day and removes documents older than 3 months
SELECT cron.schedule(
  'cleanup-old-documents',           -- job name
  '0 2 * * *',                       -- cron expression: daily at 2 AM UTC
  $$SELECT cleanup_old_documents()$$ -- SQL to execute
);

-- To manually run the cleanup (for testing):
-- SELECT cleanup_old_documents();

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('cleanup-old-documents');
