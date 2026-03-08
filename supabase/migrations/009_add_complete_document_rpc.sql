-- ============================================
-- RPC: Mark document as completed (bypasses RLS)
-- Used by the signing page when all signers have signed
-- ============================================

create or replace function public.mark_document_completed(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents
  set status = 'completed', updated_at = now()
  where id = p_document_id;
end;
$$;

-- ============================================
-- RPC: Save final signed PDF URL (bypasses RLS)
-- Used after generating signed PDF on completion
-- ============================================

create or replace function public.save_final_pdf_url(p_document_id uuid, p_final_pdf_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents
  set final_pdf_url = p_final_pdf_url, updated_at = now()
  where id = p_document_id;
end;
$$;

-- ============================================
-- RPC: Check if all signers have signed (bypasses RLS)
-- Returns true if every signer for the document has status='signed'
-- Excludes the current signer (who we know just signed)
-- ============================================

create or replace function public.check_all_signers_signed(p_document_id uuid, p_current_signer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  unsigned_count int;
begin
  select count(*) into unsigned_count
  from public.document_signers
  where document_id = p_document_id
    and id != p_current_signer_id
    and status != 'signed';
  return unsigned_count = 0;
end;
$$;

-- ============================================
-- RPC: Get document info for completion (bypasses RLS)
-- ============================================

create or replace function public.get_document_for_completion(p_document_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'title', d.title,
    'created_by', d.created_by,
    'original_pdf_url', d.original_pdf_url,
    'signers', (
      select json_agg(json_build_object('signer_email', s.signer_email, 'signer_name', s.signer_name))
      from public.document_signers s where s.document_id = p_document_id
    ),
    'fields', (
      select json_agg(json_build_object(
        'id', f.id, 'field_type', f.field_type, 'page_number', f.page_number,
        'x', f.x, 'y', f.y, 'width', f.width, 'height', f.height
      ))
      from public.signature_fields f where f.document_id = p_document_id
    ),
    'placements', (
      select json_agg(json_build_object(
        'field_id', p.field_id, 'signature_id', p.signature_id
      ))
      from public.signature_placements p where p.document_id = p_document_id
    ),
    'owner_email', (
      select a.user_email from public.audit_trail a
      where a.document_id = p_document_id and a.action = 'Document Sent for Signing'
      limit 1
    ),
    'cc_metadata', (
      select a.metadata from public.audit_trail a
      where a.document_id = p_document_id and a.action = 'Document Sent for Signing'
      limit 1
    )
  ) into result
  from public.documents d
  where d.id = p_document_id;
  
  return result;
end;
$$;

-- ============================================
-- Storage: Allow anyone to upload signed PDFs
-- (signers are unauthenticated, need to upload
--  the completed signed PDF from the signing page)
-- ============================================

create policy "Anyone can upload signed PDFs"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'signed');
