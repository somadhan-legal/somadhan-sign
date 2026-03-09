-- RPC function to get document data for CC viewers (bypasses RLS)
CREATE OR REPLACE FUNCTION get_document_for_viewer(p_document_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  original_pdf_url TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.title, d.original_pdf_url, d.status::TEXT
  FROM documents d
  WHERE d.id = p_document_id;
END;
$$;

-- RPC function to get signers for CC viewers (bypasses RLS)
CREATE OR REPLACE FUNCTION get_signers_for_viewer(p_document_id UUID)
RETURNS TABLE (
  signer_email TEXT,
  signer_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ds.signer_email, ds.signer_name, ds.status::TEXT
  FROM document_signers ds
  WHERE ds.document_id = p_document_id
  ORDER BY ds.created_at ASC;
END;
$$;
