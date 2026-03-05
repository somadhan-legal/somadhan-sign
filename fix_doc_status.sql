-- Check document overall status after a signer signs
create or replace function public.check_document_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_signed boolean;
begin
  -- Check if all signers are 'signed'
  select bool_and(status = 'signed')
  into v_all_signed
  from public.document_signers
  where document_id = NEW.document_id;
  
  -- If all signers have signed, update document status to 'completed'
  if v_all_signed then
    update public.documents
    set status = 'completed'
    where id = NEW.document_id and status != 'completed';
  end if;
  
  return NEW;
end;
$$;

drop trigger if exists trg_check_document_completed on public.document_signers;
create trigger trg_check_document_completed
after update of status on public.document_signers
for each row
when (NEW.status = 'signed' and OLD.status != 'signed')
execute function public.check_document_completed();
