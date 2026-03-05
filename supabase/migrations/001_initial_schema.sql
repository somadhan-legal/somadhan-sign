-- ============================================
-- RocketSign Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. Documents table
-- ============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  original_pdf_url text not null,
  final_pdf_url text,
  created_by uuid references auth.users(id) on delete cascade not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'cancelled')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================
-- 2. Signature Fields table
-- ============================================
create table public.signature_fields (
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

-- ============================================
-- 3. Document Signers table
-- ============================================
create table public.document_signers (
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

create unique index idx_document_signers_token on public.document_signers(signing_token);

-- ============================================
-- 4. Signatures table (user's saved signatures)
-- ============================================
create table public.signatures (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  signature_data text not null,
  type text not null default 'drawn' check (type in ('drawn', 'uploaded', 'typed')),
  created_at timestamptz default now() not null
);

-- ============================================
-- 5. Signature Placements table
-- ============================================
create table public.signature_placements (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  field_id uuid references public.signature_fields(id) on delete cascade not null,
  signer_id uuid references auth.users(id) on delete cascade,
  signer_email text not null,
  signature_id text not null,
  signed_at timestamptz default now() not null
);

-- ============================================
-- 6. Audit Trail table
-- ============================================
create table public.audit_trail (
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
-- Indexes
-- ============================================
create index idx_documents_created_by on public.documents(created_by);
create index idx_documents_status on public.documents(status);
create index idx_signature_fields_document on public.signature_fields(document_id);
create index idx_document_signers_document on public.document_signers(document_id);
create index idx_document_signers_email on public.document_signers(signer_email);
create index idx_signatures_user on public.signatures(user_id);
create index idx_placements_document on public.signature_placements(document_id);
create index idx_placements_field on public.signature_placements(field_id);
create index idx_audit_trail_document on public.audit_trail(document_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.documents enable row level security;
alter table public.signature_fields enable row level security;
alter table public.document_signers enable row level security;
alter table public.signatures enable row level security;
alter table public.signature_placements enable row level security;
alter table public.audit_trail enable row level security;

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

create policy "Users can create documents"
  on public.documents for insert
  with check (auth.uid() = created_by);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = created_by);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = created_by);

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

create policy "Owner can manage signature fields"
  on public.signature_fields for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
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

create policy "Owner can manage signers"
  on public.document_signers for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.created_by = auth.uid()
    )
  );

-- Signatures: users can manage their own
create policy "Users can manage own signatures"
  on public.signatures for all
  using (auth.uid() = user_id);

-- Signature Placements: document participants can view, signers can insert
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

create policy "Signers can add placements"
  on public.signature_placements for insert
  with check (true);

-- Audit Trail: document participants can view, authenticated users can insert
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

create policy "Anyone can add audit entries"
  on public.audit_trail for insert
  with check (true);

-- ============================================
-- Storage bucket for documents
-- ============================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "Anyone can view documents"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Users can update own uploads"
  on storage.objects for update
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
