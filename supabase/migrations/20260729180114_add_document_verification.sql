create table public.document_verifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid unique references public.documents(id) on delete set null,
  token_digest text not null unique,
  reference_code text not null unique,
  evidence_sha256 text not null,
  artifact_sha256 text not null,
  artifact_size bigint not null,
  final_storage_path text not null,
  hash_scheme text not null default 'raw-pdf-bytes-v1',
  status text not null default 'active',
  completed_at timestamptz not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_verification_token_digest_format
    check (token_digest ~ '^[0-9a-f]{64}$'),
  constraint document_verification_reference_code_format
    check (reference_code ~ '^SS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$'),
  constraint document_verification_evidence_hash_format
    check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  constraint document_verification_artifact_hash_format
    check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  constraint document_verification_artifact_size
    check (artifact_size > 0 and artifact_size <= 30000000),
  constraint document_verification_storage_path
    check (
      length(final_storage_path) between 1 and 500
      and final_storage_path !~ '://'
      and final_storage_path !~ '(^|/)\.\.?(/|$)'
    ),
  constraint document_verification_hash_scheme
    check (hash_scheme = 'raw-pdf-bytes-v1'),
  constraint document_verification_status
    check (status in ('active', 'revoked')),
  constraint document_verification_revocation_state
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    )
);

alter table public.document_verifications enable row level security;

revoke all on table public.document_verifications from public, anon, authenticated;
grant select, insert, update on table public.document_verifications to service_role;

create index document_verifications_active_token_idx
  on public.document_verifications (token_digest)
  where status = 'active';

create or replace function public.commit_final_document_verification(
  p_document_id uuid,
  p_storage_path text,
  p_token_digest text,
  p_reference_code text,
  p_evidence_sha256 text,
  p_artifact_sha256 text,
  p_artifact_size bigint,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  document_row public.documents%rowtype;
begin
  select *
  into document_row
  from public.documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'Document not found';
  end if;

  if document_row.status <> 'completed' then
    raise exception 'Only completed documents can be finalized';
  end if;

  if document_row.final_pdf_url is not null then
    return jsonb_build_object(
      'won', false,
      'final_pdf_url', document_row.final_pdf_url
    );
  end if;

  insert into public.document_verifications (
    document_id,
    token_digest,
    reference_code,
    evidence_sha256,
    artifact_sha256,
    artifact_size,
    final_storage_path,
    completed_at
  )
  values (
    p_document_id,
    p_token_digest,
    p_reference_code,
    p_evidence_sha256,
    p_artifact_sha256,
    p_artifact_size,
    p_storage_path,
    p_completed_at
  );

  update public.documents
  set final_pdf_url = p_storage_path,
      updated_at = now()
  where id = p_document_id;

  return jsonb_build_object(
    'won', true,
    'final_pdf_url', p_storage_path
  );
end;
$$;

revoke execute on function public.commit_final_document_verification(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.commit_final_document_verification(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  timestamptz
) to service_role;
