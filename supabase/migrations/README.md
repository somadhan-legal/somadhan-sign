# Database Migrations

Run these in order in the Supabase SQL Editor.

## Migration List

| # | File | Purpose |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Tables, indexes, RLS policies, storage bucket |
| 002 | `002_fix_rls_policies.sql` | Tighten overly permissive RLS policies |
| 003 | `003_fix_rls_recursion.sql` | Fix infinite recursion in RLS policies |
| 004 | `004_fix_signing_rls.sql` | RPC functions for unauthenticated signing flow |
| 005 | `005_fix_audit_trail_filtering.sql` | Index on audit_trail.document_id, NOT NULL constraint |
| 006 | `006_auto_cleanup_old_documents.sql` | cleanup_old_documents() function |
| 007 | `007_add_signer_update_policy.sql` | UPDATE policy on document_signers for owners |
| 008 | `008_strict_audit_cleanup.sql` | Delete orphaned records, composite index |
| 009 | `009_add_complete_document_rpc.sql` | Completion RPCs, signed PDF upload policy |
| 010 | `010_add_viewer_rpc.sql` | Viewer RPCs for CC recipients |
| 011 | `011_fix_placements_audit_rls.sql` | Public SELECT on signature_placements and audit_trail |

## Notes

- All RPC functions use `SECURITY DEFINER` with `search_path = public`
- `cleanup_old_documents()` has EXECUTE revoked from anon/authenticated (admin only)
- Unauthenticated signers access data via token-based RPCs, not direct table access
