-- ============================================
-- Fix RLS for Public Signing Flow
-- Strategy:
--   1. Create a SECURITY DEFINER function to look up signers by token
--      (bypasses RLS so the signing page can load without auth)
--   2. Documents: owner-only for dashboard
--   3. Related tables: open read for signing, write restricted
-- ============================================

-- =====================
-- RPC: Lookup signer by token (bypasses RLS)
-- =====================
create or replace function public.get_signer_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'id', ds.id,
    'document_id', ds.document_id,
    'signer_email', ds.signer_email,
    'signer_name', ds.signer_name,
    'status', ds.status,
    'signed_at', ds.signed_at,
    'signing_token', ds.signing_token,
    'documents', json_build_object(
      'title', d.title,
      'original_pdf_url', d.original_pdf_url,
      'status', d.status
    )
  )
  into result
  from public.document_signers ds
  join public.documents d on d.id = ds.document_id
  where ds.signing_token = p_token;

  return result;
end;
$$;

-- =====================
-- DOCUMENTS
-- =====================
drop policy if exists "Users can view own documents" on public.documents;
drop policy if exists "Owner can view documents" on public.documents;
drop policy if exists "Public can view documents via signing" on public.documents;
drop policy if exists "Users can create documents" on public.documents;
drop policy if exists "Users can update own documents" on public.documents;
drop policy if exists "Users can delete own documents" on public.documents;

-- Owner sees their own documents in dashboard
create policy "Owner can view documents"
  on public.documents for select
  using (auth.uid() = created_by);

create policy "Users can create documents"
  on public.documents for insert
  with check (auth.uid() = created_by);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = created_by);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = created_by);

-- =====================
-- DOCUMENT SIGNERS
-- =====================
drop policy if exists "View document signers" on public.document_signers;
drop policy if exists "Anyone can view signers" on public.document_signers;
drop policy if exists "Owner can manage signers" on public.document_signers;
drop policy if exists "Anyone can update signer status" on public.document_signers;
drop policy if exists "Owner can delete signers" on public.document_signers;
drop policy if exists "Update signer status" on public.document_signers;

-- Owner can read signers for their documents
create policy "Owner can view signers"
  on public.document_signers for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Owner can add signers
create policy "Owner can add signers"
  on public.document_signers for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Owner can delete signers
create policy "Owner can delete signers"
  on public.document_signers for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- =====================
-- RPC: Update signer status (bypasses RLS for signing flow)
-- =====================
create or replace function public.update_signer_status_by_id(p_signer_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.document_signers
  set status = p_status,
      signed_at = case when p_status = 'signed' then now() else signed_at end
  where id = p_signer_id;
end;
$$;

-- =====================
-- SIGNATURE FIELDS
-- =====================
drop policy if exists "View signature fields" on public.signature_fields;
drop policy if exists "Anyone can view signature fields" on public.signature_fields;
drop policy if exists "Owner can manage signature fields" on public.signature_fields;

-- Anyone can read fields (signers need to see their assigned fields)
create policy "Anyone can view signature fields"
  on public.signature_fields for select
  using (true);

-- Owner can insert/update/delete fields
create policy "Owner can manage signature fields"
  on public.signature_fields for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- =====================
-- SIGNATURE PLACEMENTS
-- =====================
drop policy if exists "View placements" on public.signature_placements;
drop policy if exists "Anyone can view placements" on public.signature_placements;
drop policy if exists "Signers can add placements" on public.signature_placements;
drop policy if exists "Anyone can add placements" on public.signature_placements;

-- Anyone can view placements
create policy "Anyone can view placements"
  on public.signature_placements for select
  using (true);

-- Anyone can add placements (signer signs via token)
create policy "Anyone can add placements"
  on public.signature_placements for insert
  with check (true);

-- =====================
-- AUDIT TRAIL
-- =====================
drop policy if exists "View audit trail" on public.audit_trail;
drop policy if exists "Anyone can view audit trail" on public.audit_trail;
drop policy if exists "Anyone can add audit entries" on public.audit_trail;

-- Anyone can view audit trail
create policy "Anyone can view audit trail"
  on public.audit_trail for select
  using (true);

-- Anyone can add audit entries
create policy "Anyone can add audit entries"
  on public.audit_trail for insert
  with check (true);
