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
-- Storage: Allow anyone to upload signed PDFs
-- (signers are unauthenticated, need to upload
--  the completed signed PDF from the signing page)
-- ============================================

create policy "Anyone can upload signed PDFs"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'signed');
