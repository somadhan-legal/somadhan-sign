# Database Setup

## Quick Setup (Recommended)

Run **`000_complete_setup.sql`** in the Supabase SQL Editor. This single file creates all tables, indexes, RLS policies, storage bucket, and RPC functions. It is idempotent — safe to re-run.

## Legacy Migrations (Reference Only)

The individual migration files (001–011) are kept for historical reference. They were the incremental steps that led to the consolidated setup. **Do not run them separately** — use `000_complete_setup.sql` instead.

## What Gets Created

- **6 tables**: documents, signature_fields, document_signers, signatures, signature_placements, audit_trail
- **11 indexes** for performance
- **RLS policies** on all tables (owner-only for documents, public read for signing flow)
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
- Unauthenticated signers access data via token-based RPCs, not direct table access
- The Edge Function `send-signing-email` handles email delivery via Resend
