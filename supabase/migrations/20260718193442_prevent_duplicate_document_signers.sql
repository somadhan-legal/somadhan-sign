-- Older clients could submit the same signer more than once before their
-- disabled state rendered. Preserve the most advanced record so completed work
-- and the most useful signing link survive the cleanup.
delete from public.document_signers signer
where signer.id in (
  select duplicate.id
  from (
    select
      id,
      row_number() over (
        partition by document_id, lower(btrim(signer_email))
        order by
          case status
            when 'signed' then 0
            when 'viewed' then 1
            else 2
          end,
          signed_at desc nulls last,
          created_at,
          id
      ) as row_number
    from public.document_signers
  ) duplicate
  where duplicate.row_number > 1
);

-- Normalize legacy identity values after deduplication. Field assignment
-- matching is email-based, so normalize both sides together.
update public.signature_fields
set assigned_to_email = lower(btrim(assigned_to_email))
where assigned_to_email <> lower(btrim(assigned_to_email));

update public.document_signers
set signer_email = lower(btrim(signer_email))
where signer_email <> lower(btrim(signer_email));

-- Keep signer identity unique within each document, regardless of case or spacing.
create unique index if not exists document_signers_document_email_unique
  on public.document_signers (document_id, lower(btrim(signer_email)));
