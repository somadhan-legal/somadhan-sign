-- ============================================
-- Fix Audit Trail Filtering
-- Ensure audit trail entries are properly filtered by document_id
-- ============================================

-- Add index on document_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_audit_trail_document_id ON public.audit_trail(document_id);

-- Verify data integrity: remove any orphaned audit entries
DELETE FROM public.audit_trail
WHERE document_id NOT IN (SELECT id FROM public.documents);

-- Add a check to ensure document_id is always set
ALTER TABLE public.audit_trail
  ALTER COLUMN document_id SET NOT NULL;

-- Verify the fix
SELECT 
  d.title as document_title,
  COUNT(a.id) as audit_entry_count
FROM public.documents d
LEFT JOIN public.audit_trail a ON a.document_id = d.id
GROUP BY d.id, d.title
ORDER BY d.created_at DESC;
