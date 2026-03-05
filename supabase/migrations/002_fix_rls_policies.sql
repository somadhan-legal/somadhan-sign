-- ============================================
-- Fix Row Level Security Policies
-- This migration fixes the overly permissive RLS policies
-- that allowed all users to see all documents
-- ============================================

-- Drop existing overly permissive policies
drop policy if exists "Users can view own documents" on public.documents;
drop policy if exists "View signature fields" on public.signature_fields;
drop policy if exists "View document signers" on public.document_signers;
drop policy if exists "View placements" on public.signature_placements;
drop policy if exists "View audit trail" on public.audit_trail;

-- Documents: owners can view their own, signers can view documents they're assigned to
create policy "Users can view own documents"
  on public.documents for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.document_signers ds
      where ds.document_id = id and ds.signer_email = auth.jwt()->>'email'
    )
  );

-- Signature Fields: document owner and assigned signers can view
create policy "View signature fields"
  on public.signature_fields for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id 
      and (
        d.created_by = auth.uid()
        or exists (
          select 1 from public.document_signers ds
          where ds.document_id = d.id and ds.signer_email = auth.jwt()->>'email'
        )
      )
    )
  );

-- Document Signers: document owner can manage, signers can view their own
create policy "View document signers"
  on public.document_signers for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
    or signer_email = auth.jwt()->>'email'
  );

-- Signature Placements: document participants can view
create policy "View placements"
  on public.signature_placements for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id 
      and (
        d.created_by = auth.uid()
        or exists (
          select 1 from public.document_signers ds
          where ds.document_id = d.id and ds.signer_email = auth.jwt()->>'email'
        )
      )
    )
  );

-- Audit Trail: document participants can view
create policy "View audit trail"
  on public.audit_trail for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id 
      and (
        d.created_by = auth.uid()
        or exists (
          select 1 from public.document_signers ds
          where ds.document_id = d.id and ds.signer_email = auth.jwt()->>'email'
        )
      )
    )
  );
