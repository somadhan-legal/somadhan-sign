-- Background worker state is only accessed with the service role. Keeping table
-- grants for API roles needlessly exposes the objects in the GraphQL schema.
-- Some clean-room environments do not include the separately managed worker
-- tables, so guard each hardening statement.
do $$
begin
  if to_regclass('public.research_jobs') is not null then
    revoke all on table public.research_jobs from anon, authenticated;
  end if;
  if to_regclass('public.worker_heartbeats') is not null then
    revoke all on table public.worker_heartbeats from anon, authenticated;
  end if;
end
$$;

-- These broad policies predate the owner-scoped authenticated policies below
-- them. Removing the duplicates preserves the same owner access while avoiding
-- a second policy evaluation for every row.
drop policy if exists "Users can view own documents" on public.documents;
drop policy if exists "View document signers" on public.document_signers;
drop policy if exists "View signature fields" on public.signature_fields;
drop policy if exists "View placements" on public.signature_placements;
drop policy if exists "View audit trail" on public.audit_trail;

-- Cover the signer-to-user foreign key for joins and referential actions.
create index if not exists document_signers_user_id_idx
  on public.document_signers (user_id);

-- Both indexes covered the same column. Retain the consistently named variant.
drop index if exists public.idx_audit_trail_document;
