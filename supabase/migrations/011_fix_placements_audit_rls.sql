-- ============================================
-- 011: Fix RLS for signature_placements and audit_trail
-- Unauthenticated signers need to read placements (to see signed fields
-- and detect completion) and audit_trail (for audit trail modal and PDF generation)
-- ============================================

-- Drop existing owner-only SELECT policies
DROP POLICY IF EXISTS "View placements" ON public.signature_placements;
DROP POLICY IF EXISTS "View audit trail" ON public.audit_trail;

-- Anyone can view signature placements (signers are unauthenticated, rely on token secrecy)
CREATE POLICY "Anyone can view placements"
  ON public.signature_placements FOR SELECT
  USING (true);

-- Anyone can view audit trail (signers need it for audit modal and PDF generation)
CREATE POLICY "Anyone can view audit trail"
  ON public.audit_trail FOR SELECT
  USING (true);
