-- ============================================
-- Add missing UPDATE policy for document_signers
-- Owner can update signers for their documents
-- ============================================

DROP POLICY IF EXISTS "Owner can update signers" ON public.document_signers;

CREATE POLICY "Owner can update signers"
  ON public.document_signers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id AND d.created_by = auth.uid()
    )
  );
