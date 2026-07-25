-- Restrict public document data to invitation-token scoped RPCs.

drop policy if exists "Anyone can view signature fields" on public.signature_fields;
drop policy if exists "Anyone can view placements" on public.signature_placements;
drop policy if exists "Anyone can add placements" on public.signature_placements;
drop policy if exists "Anyone can view audit trail" on public.audit_trail;
drop policy if exists "Anyone can add audit entries" on public.audit_trail;
drop policy if exists "Anyone can upload signed PDFs" on storage.objects;
drop policy if exists "Anyone can view documents" on storage.objects;

-- SQL-created tables do not inherit the Dashboard's API grants. Keep public
-- access RPC-only, restore the operations protected by owner RLS, and give
-- trusted Edge Functions the table privileges required by service_role.
revoke select, insert, update, delete on table
  public.documents,
  public.signature_fields,
  public.document_signers,
  public.signatures,
  public.signature_placements,
  public.audit_trail
from anon;

grant select, insert, update, delete on table
  public.documents,
  public.signature_fields,
  public.document_signers,
  public.signatures
to authenticated;
grant select on table public.signature_placements to authenticated;
grant select, insert on table public.audit_trail to authenticated;

grant all privileges on table
  public.documents,
  public.signature_fields,
  public.document_signers,
  public.signatures,
  public.signature_placements,
  public.audit_trail
to service_role;

drop policy if exists "Owner can view documents" on public.documents;
create policy "Owner can view documents"
  on public.documents for select
  to authenticated
  using ((select auth.uid()) = created_by);
drop policy if exists "Users can create documents" on public.documents;
create policy "Users can create documents"
  on public.documents for insert
  to authenticated
  with check ((select auth.uid()) = created_by);
drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents for delete
  to authenticated
  using ((select auth.uid()) = created_by);

drop policy if exists "Owner can view signers" on public.document_signers;
create policy "Owner can view signers"
  on public.document_signers for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  );

drop policy if exists "Users can manage own signatures" on public.signatures;
create policy "Users can manage own signatures"
  on public.signatures for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

update storage.buckets set public = false where id = 'documents';

drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can view own uploads" on storage.objects;
create policy "Users can view own uploads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update own uploads" on storage.objects;
drop policy if exists "Users can delete own uploads" on storage.objects;
create policy "Users can delete own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owner can manage signature fields" on public.signature_fields;
drop policy if exists "Owner can view signature fields" on public.signature_fields;
drop policy if exists "Owner can add draft signature fields" on public.signature_fields;
drop policy if exists "Owner can update draft signature fields" on public.signature_fields;
drop policy if exists "Owner can delete draft signature fields" on public.signature_fields;
create policy "Owner can view signature fields"
  on public.signature_fields for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  );
create policy "Owner can add draft signature fields"
  on public.signature_fields for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );
create policy "Owner can update draft signature fields"
  on public.signature_fields for update
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );
create policy "Owner can delete draft signature fields"
  on public.signature_fields for delete
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );

drop policy if exists "Owner can add signers" on public.document_signers;
create policy "Owner can add signers"
  on public.document_signers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );
drop policy if exists "Owner can update signers" on public.document_signers;
create policy "Owner can update signers"
  on public.document_signers for update
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );
drop policy if exists "Owner can delete signers" on public.document_signers;
create policy "Owner can delete signers"
  on public.document_signers for delete
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
    )
  );

drop policy if exists "Owner can manage placements" on public.signature_placements;
drop policy if exists "Owner can view placements" on public.signature_placements;
create policy "Owner can view placements"
  on public.signature_placements for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  );

drop policy if exists "Owner can manage audit trail" on public.audit_trail;
drop policy if exists "Owner can view audit trail" on public.audit_trail;
create policy "Owner can view audit trail"
  on public.audit_trail for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  );

drop policy if exists "Owner can add audit entries" on public.audit_trail;
create policy "Owner can add audit entries"
  on public.audit_trail for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
    and action in ('Document Created', 'Document Sent for Signing', 'Reminder Sent')
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
delete from public.audit_trail audit
where audit.action = 'Document Completed'
  and audit.id in (
    select duplicate.id
    from (
      select id, row_number() over (partition by document_id order by created_at, id) as row_number
      from public.audit_trail
      where action = 'Document Completed'
    ) duplicate
    where duplicate.row_number > 1
  );
create unique index if not exists audit_trail_document_completed_unique
  on public.audit_trail (document_id)
  where action = 'Document Completed';
create index if not exists signature_fields_document_assignee_idx
  on public.signature_fields (document_id, lower(assigned_to_email));
create index if not exists document_signers_document_status_idx
  on public.document_signers (document_id, status);
create index if not exists audit_trail_document_action_email_created_idx
  on public.audit_trail (document_id, action, lower(user_email), created_at);
create index if not exists signature_placements_signer_id_idx
  on public.signature_placements (signer_id)
  where signer_id is not null;
create index if not exists documents_owner_created_idx
  on public.documents (created_by, created_at desc);

do $$
begin
  alter table public.signature_fields add constraint signature_fields_valid_geometry
    check (
      page_number > 0
      and x between 0 and 100 and y between 0 and 100
      and width > 0 and width <= 100 and height > 0 and height <= 100
      and x + width <= 100 and y + height <= 100
    ) not valid;
exception when duplicate_object then null;
end $$;

create or replace function public.protect_document_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Trusted service-role and security-definer operations run as a privileged
  -- database role. Token-scoped RPCs validate their own narrow transitions.
  if current_user not in ('anon', 'authenticated') then return new; end if;

  if new.created_by is distinct from old.created_by
    or new.original_pdf_url is distinct from old.original_pdf_url
    or new.final_pdf_url is distinct from old.final_pdf_url
    or new.created_at is distinct from old.created_at
  then raise exception 'Document file references are immutable'; end if;

  if old.status = 'draft' then
    if new.status not in ('draft', 'pending', 'cancelled') then
      raise exception 'Invalid document status transition';
    end if;
    return new;
  end if;

  if new.title is distinct from old.title then
    raise exception 'A sent document cannot be renamed';
  end if;
  if old.status = 'pending' and new.status not in ('pending', 'cancelled') then
    raise exception 'Invalid document status transition';
  end if;
  if old.status in ('completed', 'cancelled') and new.status is distinct from old.status then
    raise exception 'A closed document cannot be reopened';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_document_integrity_trigger on public.documents;
create trigger protect_document_integrity_trigger
before update on public.documents
for each row execute function public.protect_document_integrity();
revoke execute on function public.protect_document_integrity() from public, anon, authenticated;
do $$
begin
  alter table public.documents add constraint documents_title_length
    check (length(btrim(title)) between 1 and 160) not valid;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.document_signers add constraint document_signers_valid_identity
    check (
      length(signer_email) <= 320
      and signer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and length(coalesce(signer_name, '')) <= 200
    ) not valid;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.audit_trail add constraint audit_trail_bounded_text
    check (
      length(action) between 1 and 100
      and length(user_email) between 1 and 320
      and length(coalesce(metadata, '')) <= 5000
    ) not valid;
exception when duplicate_object then null;
end $$;

alter table public.document_viewers enable row level security;
revoke all on table public.document_viewers from anon, authenticated;
grant select, insert, update, delete on table public.document_viewers to authenticated;
grant all privileges on table public.document_viewers to service_role;

drop policy if exists "Owner can manage document viewers" on public.document_viewers;
create policy "Owner can manage document viewers"
  on public.document_viewers for all
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    )
  );

create or replace function public.get_signing_package(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
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
        'status', d.status,
        'final_pdf_available', d.final_pdf_url is not null
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
        and (d.status = 'completed' or lower(p.signer_email) = lower(ds.signer_email))
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
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.created_by = (select auth.uid()) and d.status = 'draft'
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
set search_path = ''
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
    and document.created_by = (select auth.uid())
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
set search_path = ''
as $$
declare
  signer_row public.document_signers;
begin
  select signer.* into signer_row
  from public.document_signers signer
  join public.documents document on document.id = signer.document_id
  where signer.id = p_signer_id
    and document.created_by = (select auth.uid())
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
set search_path = ''
as $$
declare
  signer_row public.document_signers;
  field_row public.signature_fields;
  placement_row public.signature_placements;
  document_status text;
  signature_bytes bytea;
  image_width bigint;
  image_height bigint;
  parsed_date date;
  audit_action text;
begin
  select * into signer_row from public.document_signers where signing_token = p_token for update;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;
  select status into document_status
  from public.documents
  where id = signer_row.document_id
  for update;
  if document_status <> 'pending' or signer_row.status = 'signed' then
    raise exception 'This signing request is no longer active';
  end if;

  select * into field_row
  from public.signature_fields
  where id = p_field_id and document_id = signer_row.document_id
  for update;

  if field_row.id is null or lower(field_row.assigned_to_email) <> lower(signer_row.signer_email) then
    raise exception 'Field is not assigned to this signer';
  end if;
  if not exists (
    select 1 from public.audit_trail consent
    where consent.document_id = signer_row.document_id
      and consent.action = 'Electronic Signature Consent Given'
      and lower(consent.user_email) = lower(signer_row.signer_email)
  ) then raise exception 'Electronic signature consent is required'; end if;
  if field_row.field_type in ('signature', 'initials') and (
    p_signature_id !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    or length(p_signature_id) > 3000000
  ) then raise exception 'Invalid signature image'; end if;
  if field_row.field_type in ('signature', 'initials') then
    begin
      signature_bytes := decode(split_part(p_signature_id, ',', 2), 'base64');
    exception when others then
      raise exception 'Invalid signature image';
    end;
    if octet_length(signature_bytes) < 8
      or substring(signature_bytes from 1 for 8) <> decode('89504E470D0A1A0A', 'hex') then
      raise exception 'Invalid signature image';
    end if;
    if octet_length(signature_bytes) < 24
      or substring(signature_bytes from 13 for 4) <> decode('49484452', 'hex') then
      raise exception 'Invalid signature image';
    end if;
    image_width :=
      get_byte(signature_bytes, 16)::bigint * 16777216
      + get_byte(signature_bytes, 17)::bigint * 65536
      + get_byte(signature_bytes, 18)::bigint * 256
      + get_byte(signature_bytes, 19)::bigint;
    image_height :=
      get_byte(signature_bytes, 20)::bigint * 16777216
      + get_byte(signature_bytes, 21)::bigint * 65536
      + get_byte(signature_bytes, 22)::bigint * 256
      + get_byte(signature_bytes, 23)::bigint;
    if image_width < 1 or image_height < 1
      or image_width > 4096 or image_height > 4096
      or image_width * image_height > 8000000 then
      raise exception 'Invalid signature image dimensions';
    end if;
  end if;
  if field_row.field_type = 'date' then
    if p_signature_id !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date value'; end if;
    begin
      parsed_date := p_signature_id::date;
    exception when others then
      raise exception 'Invalid date value';
    end;
    if parsed_date::text <> p_signature_id then raise exception 'Invalid date value'; end if;
  end if;
  if field_row.field_type = 'checkbox' and p_signature_id <> 'checkbox:checked' then
    raise exception 'Invalid checkbox value';
  end if;
  if field_row.field_type = 'text' and (
    length(btrim(p_signature_id)) = 0 or length(p_signature_id) > 1000
  ) then raise exception 'Invalid text value'; end if;
  if exists (select 1 from public.signature_placements where field_id = p_field_id) then
    raise exception 'Field has already been completed';
  end if;

  insert into public.signature_placements (
    document_id, field_id, signer_email, signature_id
  ) values (
    signer_row.document_id, p_field_id, signer_row.signer_email, p_signature_id
  ) returning * into placement_row;

  audit_action := case field_row.field_type
    when 'signature' then 'Signature Applied'
    when 'initials' then 'Initials Added'
    when 'date' then 'Date Filled'
    when 'checkbox' then 'Checkbox Checked'
    when 'text' then 'Text Entered'
  end;

  insert into public.audit_trail (
    document_id, action, user_email, user_name, metadata
  ) values (
    signer_row.document_id,
    audit_action,
    signer_row.signer_email,
    signer_row.signer_name,
    json_build_object(
      'source', 'database',
      'fieldId', field_row.id,
      'fieldType', field_row.field_type,
      'pageNumber', field_row.page_number
    )::text
  );

  return placement_row;
end;
$$;

create or replace function public.update_signer_status_by_token(p_token text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  signer_row public.document_signers;
  document_status text;
begin
  select * into signer_row from public.document_signers where signing_token = p_token for update;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;
  if p_status not in ('viewed', 'signed') then raise exception 'Invalid signer status'; end if;
  if signer_row.status = 'signed' then return; end if;
  select status into document_status
  from public.documents
  where id = signer_row.document_id
  for update;
  if document_status <> 'pending' then raise exception 'This signing request is no longer active'; end if;
  if p_status = 'signed' and not exists (
    select 1 from public.signature_fields f
    where f.document_id = signer_row.document_id
      and lower(f.assigned_to_email) = lower(signer_row.signer_email)
  ) then raise exception 'No fields are assigned to this signer'; end if;
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

  if p_status = 'signed' then
    insert into public.audit_trail (
      document_id, action, user_email, user_name
    )
    select signer_row.document_id, 'All Fields Signed', signer_row.signer_email, signer_row.signer_name
    where not exists (
      select 1 from public.audit_trail existing
      where existing.document_id = signer_row.document_id
        and existing.action = 'All Fields Signed'
        and lower(existing.user_email) = lower(signer_row.signer_email)
    );

    if not exists (
      select 1 from public.document_signers pending
      where pending.document_id = signer_row.document_id and pending.status <> 'signed'
    ) then
      update public.documents
      set status = 'completed', updated_at = now()
      where id = signer_row.document_id and status = 'pending';

      insert into public.audit_trail (
        document_id, action, user_email, user_name, metadata
      ) values (
        signer_row.document_id,
        'Document Completed',
        signer_row.signer_email,
        signer_row.signer_name,
        'All signers have signed'
      ) on conflict (document_id) where action = 'Document Completed' do nothing;
    end if;
  end if;
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
set search_path = ''
as $$
declare
  signer_row public.document_signers;
  audit_row public.audit_trail;
  request_headers json;
  request_ip text;
begin
  select * into signer_row from public.document_signers where signing_token = p_token;
  if signer_row.id is null then raise exception 'Invalid signing token'; end if;
  if length(coalesce(p_metadata, '')) > 2000 then raise exception 'Audit metadata is too long'; end if;
  if p_action not in (
    'Document Viewed', 'Signature Applied', 'Initials Added', 'Date Filled',
    'Checkbox Checked', 'Text Entered', 'All Fields Signed',
    'Electronic Signature Consent Given'
  ) then raise exception 'Invalid audit action'; end if;
  if p_action in (
    'Signature Applied', 'Initials Added', 'Date Filled',
    'Checkbox Checked', 'Text Entered'
  ) then
    select * into audit_row
    from public.audit_trail existing
    where existing.document_id = signer_row.document_id
      and existing.action = p_action
      and lower(existing.user_email) = lower(signer_row.signer_email)
    order by existing.created_at desc
    limit 1;
    if audit_row.id is null then
      raise exception 'A completed field is required for this audit action';
    end if;
    return audit_row;
  end if;
  if p_action in ('Document Viewed', 'Electronic Signature Consent Given') then
    select * into audit_row
    from public.audit_trail existing
    where existing.document_id = signer_row.document_id
      and existing.action = p_action
      and lower(existing.user_email) = lower(signer_row.signer_email)
    order by existing.created_at
    limit 1;
    if audit_row.id is not null then return audit_row; end if;
  end if;
  if p_action not in ('Document Viewed', 'All Fields Signed')
    and not exists (
      select 1 from public.documents document
      where document.id = signer_row.document_id and document.status = 'pending'
    ) then raise exception 'This signing request is no longer active'; end if;
  if p_action = 'All Fields Signed' then
    if signer_row.status <> 'signed' then raise exception 'Signer has not completed all fields'; end if;
    select * into audit_row
    from public.audit_trail existing
    where existing.document_id = signer_row.document_id
      and existing.action = 'All Fields Signed'
      and lower(existing.user_email) = lower(signer_row.signer_email)
    order by existing.created_at
    limit 1;
    if audit_row.id is not null then return audit_row; end if;
  end if;
  if (
    select count(*) from public.audit_trail existing
    where existing.document_id = signer_row.document_id
      and lower(existing.user_email) = lower(signer_row.signer_email)
  ) >= 500 then raise exception 'Audit entry limit reached'; end if;

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
set search_path = ''
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
set search_path = ''
as $$
declare
  target_document_id uuid;
  completing_signer public.document_signers;
  document_status text;
begin
  select * into completing_signer
  from public.document_signers
  where signing_token = p_token;
  target_document_id := completing_signer.document_id;
  if target_document_id is null then raise exception 'Invalid signing token'; end if;
  select status into document_status
  from public.documents
  where id = target_document_id
  for update;
  if document_status not in ('pending', 'completed') then
    raise exception 'This signing request is no longer active';
  end if;
  if exists (
    select 1 from public.document_signers
    where document_id = target_document_id and status <> 'signed'
  ) then raise exception 'All signers must sign first'; end if;
  if document_status = 'completed' then return; end if;

  update public.documents
  set status = 'completed', updated_at = now()
  where id = target_document_id and status = 'pending';

  insert into public.audit_trail (
    document_id, action, user_email, user_name, metadata
  ) values (
    target_document_id,
    'Document Completed',
    completing_signer.signer_email,
    completing_signer.signer_name,
    'All signers have signed'
  ) on conflict (document_id) where action = 'Document Completed' do nothing;
end;
$$;

create or replace function public.get_document_for_completion_by_token(p_token text)
returns json
language sql
security definer
set search_path = ''
as $$
  select public.get_document_for_completion(ds.document_id)
  from public.document_signers ds
  join public.documents d on d.id = ds.document_id and d.status = 'completed'
  where ds.signing_token = p_token
    and not exists (
      select 1 from public.document_signers pending
      where pending.document_id = ds.document_id and pending.status <> 'signed'
    );
$$;

create or replace function public.create_document_viewer(p_document_id uuid, p_viewer_email text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result_token text;
begin
  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.created_by = (select auth.uid()) and d.status = 'pending'
  ) then raise exception 'Document access denied'; end if;
  if length(p_viewer_email) > 320 or p_viewer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid viewer email is required';
  end if;

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
set search_path = ''
as $$
declare
  result json;
begin
  select json_build_object(
    'document', json_build_object(
      'id', d.id,
      'title', d.title,
      'original_pdf_url', d.original_pdf_url,
      'final_pdf_url', case when d.status = 'completed' then d.final_pdf_url else null end,
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
revoke execute on function public.get_signer_by_token(text) from public, anon, authenticated;

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
revoke execute on function public.create_document_viewer(uuid, text) from public;
revoke execute on function public.get_viewer_package(text) from public;

-- Older migrations created privileged maintenance RPCs with the default PUBLIC
-- execute grant. Keep them available only to trusted service operations.
create or replace function public.cleanup_old_documents()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.documents
  where created_at < now() - interval '12 months';
end;
$$;

create or replace function public.rls_auto_enable()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_name text;
begin
  for table_name in
    select tablename from pg_catalog.pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

revoke execute on function public.cleanup_old_documents() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.cleanup_old_documents() to service_role;
grant execute on function public.rls_auto_enable() to service_role;

drop function if exists public.save_final_pdf_url_by_token(text, text);

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
grant execute on function public.create_document_viewer(uuid, text) to authenticated;
grant execute on function public.get_viewer_package(text) to anon, authenticated;
