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
