-- ============================================
-- 008: Strict Audit Trail Cleanup
-- Remove ALL orphaned audit entries and tighten constraints
-- ============================================

-- 1. Delete orphaned audit entries (where document no longer exists)
DELETE FROM public.audit_trail
WHERE document_id NOT IN (SELECT id FROM public.documents);

-- 2. Delete orphaned signature_placements
DELETE FROM public.signature_placements
WHERE document_id NOT IN (SELECT id FROM public.documents);

-- 3. Delete orphaned signature_fields
DELETE FROM public.signature_fields
WHERE document_id NOT IN (SELECT id FROM public.documents);

-- 4. Delete orphaned document_signers
DELETE FROM public.document_signers
WHERE document_id NOT IN (SELECT id FROM public.documents);

-- 5. Ensure ON DELETE CASCADE is definitely in place (re-add FK if needed)
-- These should already exist from 001, but belt-and-suspenders:
DO $$
BEGIN
  -- Verify cascade constraints exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name LIKE '%audit_trail%document_id%'
    AND delete_rule = 'CASCADE'
  ) THEN
    RAISE NOTICE 'audit_trail cascade constraint may need review';
  END IF;
END $$;

-- 6. Add composite index for faster doc+audit lookups
CREATE INDEX IF NOT EXISTS idx_audit_trail_document_created 
  ON public.audit_trail(document_id, created_at);
