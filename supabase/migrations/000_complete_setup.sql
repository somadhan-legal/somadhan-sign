-- ============================================
-- SomadhanSign — Complete Database Setup
-- Run this single file in the Supabase SQL Editor
-- to set up the entire database from scratch.
-- It is idempotent — safe to re-run.
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- 1. Tables
-- ============================================

create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  original_pdf_url text not null,
  final_pdf_url text,
  created_by uuid references auth.users(id) on delete cascade not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'cancelled')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.signature_fields (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  page_number integer not null,
  x double precision not null,
  y double precision not null,
  width double precision not null default 20,
  height double precision not null default 6,
  assigned_to_email text not null,
  field_type text not null default 'signature' check (field_type in ('signature', 'initials', 'date', 'text', 'checkbox')),
  field_order integer not null default 1,
  label text,
  created_at timestamptz default now() not null
);

create table if not exists public.document_signers (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  signer_email text not null,
  signer_name text,
  status text not null default 'pending' check (status in ('pending', 'viewed', 'signed')),
  signed_at timestamptz,
  user_id uuid references auth.users(id),
  signing_token text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now() not null
);

create table if not exists public.signatures (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  signature_data text not null,
  type text not null default 'drawn' check (type in ('drawn', 'uploaded', 'typed')),
  created_at timestamptz default now() not null
);

create table if not exists public.signature_placements (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  field_id uuid references public.signature_fields(id) on delete cascade not null,
  signer_id uuid references auth.users(id) on delete cascade,
  signer_email text not null,
  signature_id text not null,
  signed_at timestamptz default now() not null
);

create table if not exists public.audit_trail (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  action text not null,
  user_email text not null,
  user_name text,
  ip_address text,
  metadata text,
  created_at timestamptz default now() not null
);

-- ============================================
-- 2. Indexes
-- ============================================

create unique index if not exists idx_document_signers_token on public.document_signers(signing_token);
create index if not exists idx_documents_created_by on public.documents(created_by);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_signature_fields_document on public.signature_fields(document_id);
create index if not exists idx_document_signers_document on public.document_signers(document_id);
create index if not exists idx_document_signers_email on public.document_signers(signer_email);
create index if not exists idx_signatures_user on public.signatures(user_id);
create index if not exists idx_placements_document on public.signature_placements(document_id);
create index if not exists idx_placements_field on public.signature_placements(field_id);
create index if not exists idx_audit_trail_document on public.audit_trail(document_id);
create index if not exists idx_audit_trail_document_created on public.audit_trail(document_id, created_at);

-- ============================================
-- 3. Row Level Security
-- ============================================

alter table public.documents enable row level security;
alter table public.signature_fields enable row level security;
alter table public.document_signers enable row level security;
alter table public.signatures enable row level security;
alter table public.signature_placements enable row level security;
alter table public.audit_trail enable row level security;

-- Documents: owner-only
drop policy if exists "Owner can view documents" on public.documents;
create policy "Owner can view documents"
  on public.documents for select
  using (auth.uid() = created_by);

drop policy if exists "Users can create documents" on public.documents;
create policy "Users can create documents"
  on public.documents for insert
  with check (auth.uid() = created_by);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = created_by);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = created_by);

-- Signature Fields: anyone can read (signers need to see assigned fields)
drop policy if exists "Anyone can view signature fields" on public.signature_fields;
create policy "Anyone can view signature fields"
  on public.signature_fields for select
  using (true);

drop policy if exists "Owner can manage signature fields" on public.signature_fields;
create policy "Owner can manage signature fields"
  on public.signature_fields for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Document Signers: owner can manage
drop policy if exists "Owner can view signers" on public.document_signers;
create policy "Owner can view signers"
  on public.document_signers for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "Owner can add signers" on public.document_signers;
create policy "Owner can add signers"
  on public.document_signers for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "Owner can update signers" on public.document_signers;
create policy "Owner can update signers"
  on public.document_signers for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "Owner can delete signers" on public.document_signers;
create policy "Owner can delete signers"
  on public.document_signers for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Signatures: users manage their own
drop policy if exists "Users can manage own signatures" on public.signatures;
create policy "Users can manage own signatures"
  on public.signatures for all
  using (auth.uid() = user_id);

-- Signature Placements: anyone can view and insert
drop policy if exists "Anyone can view placements" on public.signature_placements;
create policy "Anyone can view placements"
  on public.signature_placements for select
  using (true);

drop policy if exists "Anyone can add placements" on public.signature_placements;
create policy "Anyone can add placements"
  on public.signature_placements for insert
  with check (true);

-- Audit Trail: anyone can view and insert
drop policy if exists "Anyone can view audit trail" on public.audit_trail;
create policy "Anyone can view audit trail"
  on public.audit_trail for select
  using (true);

drop policy if exists "Anyone can add audit entries" on public.audit_trail;
create policy "Anyone can add audit entries"
  on public.audit_trail for insert
  with check (true);

-- ============================================
-- 4. Storage Bucket
-- ============================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view documents" on storage.objects;
create policy "Anyone can view documents"
  on storage.objects for select
  using (bucket_id = 'documents');

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

drop policy if exists "Anyone can upload signed PDFs" on storage.objects;
create policy "Anyone can upload signed PDFs"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'signed');

drop policy if exists "Users can update own uploads" on storage.objects;
create policy "Users can update own uploads"
  on storage.objects for update
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own uploads" on storage.objects;
create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 5. RPC Functions (all SECURITY DEFINER)
-- ============================================

-- Lookup signer by token (for unauthenticated signing page)
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

-- Update signer status (bypasses RLS for signing flow)
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

-- Mark document as completed
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

-- Save final signed PDF URL
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

-- Check if all signers (except current) have signed
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

-- Get comprehensive document data for completion
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
    ),
    'audit_trail', (
      select json_agg(json_build_object(
        'action', at.action, 'user_email', at.user_email, 'user_name', at.user_name,
        'created_at', at.created_at, 'metadata', at.metadata, 'ip_address', at.ip_address
      ) order by at.created_at asc)
      from public.audit_trail at where at.document_id = p_document_id
    )
  ) into result
  from public.documents d
  where d.id = p_document_id;

  return result;
end;
$$;

-- Get document info for CC viewers (view-only)
create or replace function public.get_document_for_viewer(p_document_id uuid)
returns table (
  id uuid,
  title text,
  original_pdf_url text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select d.id, d.title, d.original_pdf_url, d.status::text
  from public.documents d
  where d.id = p_document_id;
end;
$$;

-- Get signers for CC viewers (view-only)
create or replace function public.get_signers_for_viewer(p_document_id uuid)
returns table (
  signer_email text,
  signer_name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select ds.signer_email, ds.signer_name, ds.status::text
  from public.document_signers ds
  where ds.document_id = p_document_id
  order by ds.created_at asc;
end;
$$;

-- Cleanup old documents (admin only — EXECUTE revoked from anon/authenticated)
create or replace function public.cleanup_old_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.documents
  where created_at < now() - interval '12 months';
end;
$$;

revoke execute on function public.cleanup_old_documents() from anon, authenticated;

-- ============================================
-- 6. Auto-enable RLS on any new tables (safety net)
-- ============================================

create or replace function public.rls_auto_enable()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

revoke execute on function public.rls_auto_enable() from anon, authenticated;
