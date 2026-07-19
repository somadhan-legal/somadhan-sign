-- Keep signer identity unique within each document, regardless of case or spacing.
create unique index if not exists document_signers_document_email_unique
  on public.document_signers (document_id, lower(btrim(signer_email)));
