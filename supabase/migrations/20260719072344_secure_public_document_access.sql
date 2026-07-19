-- Restrict public document data to invitation-token scoped RPCs.

drop policy if exists "Anyone can view signature fields" on public.signature_fields;
drop policy if exists "Anyone can view placements" on public.signature_placements;
drop policy if exists "Anyone can add placements" on public.signature_placements;
drop policy if exists "Anyone can view audit trail" on public.audit_trail;
drop policy if exists "Anyone can add audit entries" on public.audit_trail;
drop policy if exists "Anyone can upload signed PDFs" on storage.objects;
drop policy if exists "Anyone can view documents" on storage.objects;

update storage.buckets set public = false where id = 'documents';

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can view own uploads" on storage.objects;
create policy "Users can view own uploads"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner can manage placements" on public.signature_placements;
create policy "Owner can manage placements"
  on public.signature_placements for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "Owner can manage audit trail" on public.audit_trail;
drop policy if exists "Owner can view audit trail" on public.audit_trail;
create policy "Owner can view audit trail"
  on public.audit_trail for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "Owner can add audit entries" on public.audit_trail;
create policy "Owner can add audit entries"
  on public.audit_trail for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

create table if not exists public.document_viewers (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  viewer_email text not null,
  viewing_token text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now() not null
);

create unique index if not exists document_viewers_document_email_unique
  on public.document_viewers (document_id, lower(btrim(viewer_email)));
create unique index if not exists document_viewers_token_unique
  on public.document_viewers (viewing_token);
delete from public.signature_placements placement
where placement.id in (
  select duplicate.id
  from (
    select id, row_number() over (partition by field_id order by signed_at desc, id desc) as row_number
    from public.signature_placements
  ) duplicate
  where duplicate.row_number > 1
);
create unique index if not exists signature_placements_field_unique
  on public.signature_placements (field_id);

alter table public.document_viewers enable row level security;

drop policy if exists "Owner can manage document viewers" on public.document_viewers;
create policy "Owner can manage document viewers"
  on public.document_viewers for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

create or replace function public.get_signing_package(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'signer', json_build_object(
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
    ),
    'fields', coalesce((
      select json_agg(json_build_object(
        'id', f.id,
        'document_id', f.document_id,
        'page_number', f.page_number,
        'x', f.x,
        'y', f.y,
        'width', f.width,
        'height', f.height,
        'assigned_to_email', case when lower(f.assigned_to_email) = lower(ds.signer_email) then ds.signer_email else '' end,
        'field_type', f.field_type,
        'field_order', f.field_order,
        'label', f.label,
        'created_at', f.created_at
      ) order by f.field_order)
      from public.signature_fields f
      where f.document_id = ds.document_id
    ), '[]'::json),
    'placements', coalesce((
      select json_agg(json_build_object(
        'id', p.id,
        'document_id', p.document_id,
        'field_id', p.field_id,
        'signer_id', null,
        'signer_email', case when lower(p.signer_email) = lower(ds.signer_email) then ds.signer_email else '' end,
        'signature_id', p.signature_id,
        'signed_at', p.signed_at
      ))
      from public.signature_placements p
      where p.document_id = ds.document_id
    ), '[]'::json),
    'audit_trail', coalesce((
      select json_agg(json_build_object(
        'id', a.id,
        'document_id', a.document_id,
        'action', a.action,
        'user_email', a.user_email,
        'user_name', a.user_name,
        'ip_address', null,
        'metadata', a.metadata,
        'created_at', a.created_at
      ) order by a.created_at)
      from public.audit_trail a
      where a.document_id = ds.document_id
    ), '[]'::json)
  ) into result
  from public.document_signers ds
  join public.documents d on d.id = ds.document_id
  where ds.signing_token = p_token;

  return result;
end;
$$;

create or replace function public.replace_signature_fields(p_document_id uuid, p_fields jsonb)
returns setof public.signature_fields
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.created_by = auth.uid()
  ) then raise exception 'Document access denied'; end if;
  if jsonb_typeof(p_fields) <> 'array' then raise exception 'Fields must be an array'; end if;

  delete from public.signature_fields where document_id = p_document_id;
  if jsonb_array_length(p_fields) = 0 then return; end if;

  return query
  insert into public.signature_fields (
    document_id, page_number, x, y, width, height,
    assigned_to_email, field_type, field_order, label
  )
  select
    p_document_id, item.page_number, item.x, item.y, item.width, item.height,
    lower(btrim(item.assigned_to_email)), item.field_type, item.field_order, item.label
  from jsonb_to_recordset(p_fields) as item(
    page_number integer,
    x numeric,
    y numeric,
    width numeric,
    height numeric,
    assigned_to_email text,
    field_type text,
    field_order integer,
    label text
  )
  where item.page_number > 0
    and item.x between 0 and 100
    and item.y between 0 and 100
    and item.width > 0 and item.width <= 100
    and item.height > 0 and item.height <= 100
    and item.x + item.width <= 100
    and item.y + item.height <= 100
    and item.field_type in ('signature', 'initials', 'date', 'text', 'checkbox')
    and exists (
      select 1 from public.document_signers signer
      where signer.document_id = p_document_id
        and lower(signer.signer_email) = lower(item.assigned_to_email)
    )
  returning *;

  get diagnostics inserted_count = row_count;
  if inserted_count <> jsonb_array_length(p_fields) then
    raise exception 'One or more signature fields are invalid';
  end if;
end;
$$;

create or replace function public.update_document_signer_with_fields(
  p_signer_id uuid,
  p_signer_email text,
  p_signer_name text default null
)
returns public.document_signers
language plpgsql
security invoker
set search_path = public
as $$
declare
  signer_row public.document_signers;
  updated_signer public.document_signers;
  normalized_email text := lower(btrim(p_signer_email));
begin
  select signer.* into signer_row
  from public.document_signers signer
  join public.documents document on document.id = signer.document_id
  where signer.id = p_signer_id
    and document.created_by = auth.uid()
    and document.status = 'draft'
  for update of signer;

  if signer_row.id is null then raise exception 'Signer access denied'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid signer email is required';
  end if;

  update public.document_signers
  set signer_email = normalized_email,
      signer_name = nullif(btrim(p_signer_name), '')
  where id = p_signer_id
  returning * into updated_signer;

  update public.signature_fields
  set assigned_to_email = normalized_email
  where document_id = signer_row.document_id
    and lower(assigned_to_email) = lower(signer_row.signer_email);

  return updated_signer;
end;
$$;

create or replace function public.remove_document_signer_with_fields(p_signer_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  signer_row public.document_signers;
begin
  select signer.* into signer_row
  from public.document_signers signer
  join public.documents document on document.id = signer.document_id
  where signer.id = p_signer_id
    and document.created_by = auth.uid()
    and document.status = 'draft'
  for update of signer;

  if signer_row.id is null then raise exception 'Signer access denied'; end if;

  delete from public.signature_fields
  where document_id = signer_row.document_id
    and lower(assigned_to_email) = lower(signer_row.signer_email);
  delete from public.document_signers where id = p_signer_id;
end;
$$;

create or replace function public.add_signature_placement_by_token(
  p_token text,
  p_field_id uuid,
  p_signature_id text
)
returns public.signature_placements
language plpgsql
security definer
set search_path = public
as $$
declare
  signer_row public.document_signers;
  field_row public.signature_fields;
  placement_row public.signature_placements;
begin
  select * into signer_row from public.document_signers where signing_token = p_token;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;

  select * into field_row
  from public.signature_fields
  where id = p_field_id and document_id = signer_row.document_id
  for update;

  if field_row.id is null or lower(field_row.assigned_to_email) <> lower(signer_row.signer_email) then
    raise exception 'Field is not assigned to this signer';
  end if;
  if length(p_signature_id) = 0 or length(p_signature_id) > 3000000 then
    raise exception 'Invalid field value';
  end if;
  if exists (select 1 from public.signature_placements where field_id = p_field_id) then
    raise exception 'Field has already been completed';
  end if;

  insert into public.signature_placements (
    document_id, field_id, signer_email, signature_id
  ) values (
    signer_row.document_id, p_field_id, signer_row.signer_email, p_signature_id
  ) returning * into placement_row;

  return placement_row;
end;
$$;

create or replace function public.update_signer_status_by_token(p_token text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  signer_row public.document_signers;
begin
  select * into signer_row from public.document_signers where signing_token = p_token;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;
  if p_status not in ('viewed', 'signed') then raise exception 'Invalid signer status'; end if;
  if p_status = 'signed' and exists (
    select 1
    from public.signature_fields f
    where f.document_id = signer_row.document_id
      and lower(f.assigned_to_email) = lower(signer_row.signer_email)
      and not exists (select 1 from public.signature_placements p where p.field_id = f.id)
  ) then
    raise exception 'All assigned fields must be completed first';
  end if;

  update public.document_signers
  set status = p_status,
      signed_at = case when p_status = 'signed' then now() else signed_at end
  where id = signer_row.id;
end;
$$;

create or replace function public.add_audit_entry_by_token(
  p_token text,
  p_action text,
  p_metadata text default null
)
returns public.audit_trail
language plpgsql
security definer
set search_path = public
as $$
declare
  signer_row public.document_signers;
  audit_row public.audit_trail;
  request_headers json;
  request_ip text;
begin
  select * into signer_row from public.document_signers where signing_token = p_token;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;
  if p_action not in (
    'Document Viewed', 'Signature Applied', 'Initials Added', 'Date Filled',
    'Checkbox Checked', 'Text Entered', 'All Fields Signed', 'Document Completed',
    'Completion Emails Sent'
  ) then raise exception 'Invalid audit action'; end if;

  begin
    request_headers := current_setting('request.headers', true)::json;
    request_ip := split_part(coalesce(request_headers->>'x-forwarded-for', ''), ',', 1);
  exception when others then
    request_ip := null;
  end;

  insert into public.audit_trail (
    document_id, action, user_email, user_name, ip_address, metadata
  ) values (
    signer_row.document_id, p_action, signer_row.signer_email,
    signer_row.signer_name, nullif(btrim(request_ip), ''), p_metadata
  ) returning * into audit_row;

  return audit_row;
end;
$$;

create or replace function public.check_all_signers_signed_by_token(p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.document_signers other_signer
    where other_signer.document_id = (
      select token_signer.document_id
      from public.document_signers token_signer
      where token_signer.signing_token = p_token
    )
    and other_signer.status <> 'signed'
  ) and exists (
    select 1 from public.document_signers token_signer where token_signer.signing_token = p_token
  );
$$;

create or replace function public.mark_document_completed_by_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_document_id uuid;
begin
  select document_id into target_document_id from public.document_signers where signing_token = p_token;
  if target_document_id is null then raise exception 'Invalid signing token'; end if;
  if exists (
    select 1 from public.document_signers
    where document_id = target_document_id and status <> 'signed'
  ) then raise exception 'All signers must sign first'; end if;

  update public.documents
  set status = 'completed', updated_at = now()
  where id = target_document_id;
end;
$$;

create or replace function public.get_document_for_completion_by_token(p_token text)
returns json
language sql
security definer
set search_path = public
as $$
  select public.get_document_for_completion(ds.document_id)
  from public.document_signers ds
  where ds.signing_token = p_token
    and not exists (
      select 1 from public.document_signers pending
      where pending.document_id = ds.document_id and pending.status <> 'signed'
    );
$$;

create or replace function public.save_final_pdf_url_by_token(p_token text, p_final_pdf_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_document_id uuid;
begin
  select ds.document_id into target_document_id
  from public.document_signers ds
  join public.documents d on d.id = ds.document_id and d.status = 'completed'
  where ds.signing_token = p_token;
  if target_document_id is null then raise exception 'Document is not completed'; end if;

  update public.documents
  set final_pdf_url = p_final_pdf_url, updated_at = now()
  where id = target_document_id;
end;
$$;

create or replace function public.create_document_viewer(p_document_id uuid, p_viewer_email text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  result_token text;
begin
  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.created_by = auth.uid()
  ) then raise exception 'Document access denied'; end if;

  select viewing_token into result_token
  from public.document_viewers
  where document_id = p_document_id
    and lower(btrim(viewer_email)) = lower(btrim(p_viewer_email));

  if result_token is null then
    begin
      insert into public.document_viewers (document_id, viewer_email)
      values (p_document_id, lower(btrim(p_viewer_email)))
      returning viewing_token into result_token;
    exception when unique_violation then
      select viewing_token into result_token
      from public.document_viewers
      where document_id = p_document_id
        and lower(btrim(viewer_email)) = lower(btrim(p_viewer_email));
    end;
  end if;

  return result_token;
end;
$$;

create or replace function public.get_viewer_package(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'document', json_build_object(
      'id', d.id,
      'title', d.title,
      'original_pdf_url', d.original_pdf_url,
      'status', d.status
    ),
    'signers', coalesce((
      select json_agg(json_build_object(
        'signer_email', s.signer_email,
        'signer_name', s.signer_name,
        'status', s.status
      ) order by s.created_at)
      from public.document_signers s where s.document_id = d.id
    ), '[]'::json)
  ) into result
  from public.document_viewers viewer
  join public.documents d on d.id = viewer.document_id
  where viewer.viewing_token = p_token;

  return result;
end;
$$;

revoke execute on function public.update_signer_status_by_id(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_document_completed(uuid) from public, anon, authenticated;
revoke execute on function public.save_final_pdf_url(uuid, text) from public, anon, authenticated;
revoke execute on function public.check_all_signers_signed(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_document_for_completion(uuid) from public, anon, authenticated;
revoke execute on function public.get_document_for_viewer(uuid) from public, anon, authenticated;
revoke execute on function public.get_signers_for_viewer(uuid) from public, anon, authenticated;

revoke execute on function public.get_signing_package(text) from public;
revoke execute on function public.replace_signature_fields(uuid, jsonb) from public;
revoke execute on function public.update_document_signer_with_fields(uuid, text, text) from public;
revoke execute on function public.remove_document_signer_with_fields(uuid) from public;
revoke execute on function public.add_signature_placement_by_token(text, uuid, text) from public;
revoke execute on function public.update_signer_status_by_token(text, text) from public;
revoke execute on function public.add_audit_entry_by_token(text, text, text) from public;
revoke execute on function public.check_all_signers_signed_by_token(text) from public;
revoke execute on function public.mark_document_completed_by_token(text) from public;
revoke execute on function public.get_document_for_completion_by_token(text) from public;
revoke execute on function public.save_final_pdf_url_by_token(text, text) from public;
revoke execute on function public.create_document_viewer(uuid, text) from public;
revoke execute on function public.get_viewer_package(text) from public;

grant execute on function public.get_signing_package(text) to anon, authenticated;
grant execute on function public.replace_signature_fields(uuid, jsonb) to authenticated;
grant execute on function public.update_document_signer_with_fields(uuid, text, text) to authenticated;
grant execute on function public.remove_document_signer_with_fields(uuid) to authenticated;
grant execute on function public.add_signature_placement_by_token(text, uuid, text) to anon, authenticated;
grant execute on function public.update_signer_status_by_token(text, text) to anon, authenticated;
grant execute on function public.add_audit_entry_by_token(text, text, text) to anon, authenticated;
grant execute on function public.check_all_signers_signed_by_token(text) to anon, authenticated;
grant execute on function public.mark_document_completed_by_token(text) to anon, authenticated;
grant execute on function public.get_document_for_completion_by_token(text) to anon, authenticated;
grant execute on function public.save_final_pdf_url_by_token(text, text) to anon, authenticated;
grant execute on function public.create_document_viewer(uuid, text) to authenticated;
grant execute on function public.get_viewer_package(text) to anon, authenticated;
