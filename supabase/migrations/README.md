# Database Setup

## Quick Setup

For a fresh local or hosted project, run `supabase db push`. The CLI applies `000_complete_setup.sql`, the numbered no-op history markers, and then the timestamped migrations in chronological order. The timestamped migrations contain current duplicate-signer and token-scoped security protections that are intentionally newer than the consolidated baseline.

## Legacy Migrations

The original numbered migration SQL (001 through 011) is stored in `supabase/legacy-migrations/` for historical reference and must not be run after `000_complete_setup.sql`. Matching no-op files remain in the active directory so existing hosted projects keep compatible migration version history.

## What Gets Created

- **7 tables** after current migrations: documents, signature_fields, document_signers, signatures, signature_placements, audit_trail, document_viewers
- **11 indexes** for performance
- **RLS policies** on all tables, with public signing and viewing access scoped to unguessable invitation tokens
- **Storage bucket** `documents` with upload policies
- **Owner and token-scoped RPC functions** for document creation, signing, completion, and viewing
- **Service-only maintenance functions** for retention cleanup and RLS enforcement

## Notes

- Privileged RPC functions use `SECURITY DEFINER` with an explicit search path and schema-qualified relations
- `cleanup_old_documents()` and `rls_auto_enable()` have EXECUTE revoked from PUBLIC, anon, and authenticated, then explicitly granted only to `service_role`
- Unauthenticated signers and viewers access data via token-based RPCs, not direct table access
- The `documents` bucket is private after the secure public-access migration. Deploy `get-document-access`, apply that migration, and enable `VITE_SECURE_DOCUMENT_ACCESS_ENABLED` as one coordinated production rollout.
- The Edge Function `send-signing-email` handles email delivery via Resend
