-- ============================================
-- Fix RLS Infinite Recursion
-- Simplify policies to avoid circular references
-- ============================================

-- Drop all existing policies
drop policy if exists "Users can view own documents" on public.documents;
drop policy if exists "View signature fields" on public.signature_fields;
drop policy if exists "View document signers" on public.document_signers;
drop policy if exists "View placements" on public.signature_placements;
drop policy if exists "View audit trail" on public.audit_trail;

-- Documents: Simple policy - only owner can view
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = created_by);

-- Signature Fields: Only if user owns the document
create policy "View signature fields"
  on public.signature_fields for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Document Signers: Owner or the signer themselves
create policy "View document signers"
  on public.document_signers for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
    or signer_email = auth.jwt()->>'email'
  );

-- Signature Placements: Only if user owns the document
create policy "View placements"
  on public.signature_placements for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Audit Trail: Only if user owns the document
create policy "View audit trail"
  on public.audit_trail for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );
