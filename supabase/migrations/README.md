# Database Setup

## Quick Setup

Run **`000_complete_setup.sql`** in the Supabase SQL Editor, then run the timestamped migrations in chronological order. The timestamped migrations contain current duplicate-signer and token-scoped security protections that are intentionally newer than the consolidated baseline.

## Legacy Migrations

The numbered migration files (001–011) are historical reference and must not be run after `000_complete_setup.sql`. New timestamped migrations must be run after the consolidated setup.

## What Gets Created

- **7 tables** after current migrations: documents, signature_fields, document_signers, signatures, signature_placements, audit_trail, document_viewers
- **11 indexes** for performance
- **RLS policies** on all tables, with public signing and viewing access scoped to unguessable invitation tokens
- **Storage bucket** `documents` with upload policies
- **9 RPC functions** (all `SECURITY DEFINER`, `search_path = public`):
  - `get_signer_by_token` — lookup signer by signing token
  - `update_signer_status_by_id` — update signer status
  - `mark_document_completed` — mark document as completed
  - `save_final_pdf_url` — save signed PDF URL
  - `check_all_signers_signed` — check if all signers signed
  - `get_document_for_completion` — full document data for completion
  - `get_document_for_viewer` — document info for CC viewers
  - `get_signers_for_viewer` — signer list for CC viewers
  - `cleanup_old_documents` — delete documents older than 12 months (admin only)
  - `rls_auto_enable` — safety net to enable RLS on all public tables (admin only)

## Notes

- All RPC functions use `SECURITY DEFINER` with `search_path = public`
- `cleanup_old_documents()` and `rls_auto_enable()` have EXECUTE revoked from anon/authenticated
- Unauthenticated signers and viewers access data via token-based RPCs, not direct table access
- The `documents` bucket is private after the secure public-access migration. Deploy `get-document-access`, apply that migration, and enable `VITE_SECURE_DOCUMENT_ACCESS_ENABLED` as one coordinated production rollout.
- The Edge Function `send-signing-email` handles email delivery via Resend
