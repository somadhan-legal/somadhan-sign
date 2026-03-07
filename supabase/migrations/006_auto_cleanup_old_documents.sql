CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete documents older than 12 months
  DELETE FROM public.documents
  WHERE created_at < NOW() - INTERVAL '12 months';

  RAISE NOTICE 'Cleaned up documents older than 12 months';
END;
$$;