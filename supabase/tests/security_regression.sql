create function pg_temp.assert(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Security regression: %', message;
  end if;
end;
$$;

insert into auth.users (id)
values
  ('11111111-1111-4111-8111-111111111111'),
  ('99999999-9999-4999-8999-999999999999');

insert into public.documents (
  id, title, original_pdf_url, created_by, status
) values
  (
    '22222222-2222-4222-8222-222222222222',
    'Signing regression',
    '11111111-1111-4111-8111-111111111111/original.pdf',
    '11111111-1111-4111-8111-111111111111',
    'pending'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Cancelled regression',
    '11111111-1111-4111-8111-111111111111/cancelled.pdf',
    '11111111-1111-4111-8111-111111111111',
    'cancelled'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Image regression',
    '11111111-1111-4111-8111-111111111111/image.pdf',
    '11111111-1111-4111-8111-111111111111',
    'pending'
  );

insert into public.document_signers (
  id, document_id, signer_email, status, signing_token
) values
  (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'signer@example.com',
    'pending',
    repeat('a', 64)
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '33333333-3333-4333-8333-333333333333',
    'cancelled@example.com',
    'signed',
    repeat('b', 64)
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    '44444444-4444-4444-8444-444444444444',
    'image@example.com',
    'pending',
    repeat('c', 64)
  );

insert into public.signature_fields (
  id, document_id, page_number, x, y, assigned_to_email, field_type
) values
  (
    '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222',
    1, 10, 10, 'signer@example.com', 'signature'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '44444444-4444-4444-8444-444444444444',
    1, 10, 10, 'image@example.com', 'signature'
  );

insert into public.signature_placements (
  document_id, field_id, signer_email, signature_id
) values (
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'signer@example.com',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
);

insert into public.audit_trail (
  document_id, action, user_email
) values
  (
    '22222222-2222-4222-8222-222222222222',
    'Document Viewed',
    'signer@example.com'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Document Viewed',
    'other-signer@example.com'
  );

select pg_temp.assert(
  (select not public from storage.buckets where id = 'documents'),
  'the documents bucket must be private'
);
select pg_temp.assert(
  not has_table_privilege('anon', 'public.documents', 'select'),
  'anonymous clients must not read documents directly'
);
select pg_temp.assert(
  not has_table_privilege('anon', 'public.signature_fields', 'select'),
  'anonymous clients must not read signature fields directly'
);
select pg_temp.assert(
  not has_table_privilege('anon', 'public.signature_placements', 'select'),
  'anonymous clients must not read placements directly'
);
select pg_temp.assert(
  not has_table_privilege('anon', 'public.audit_trail', 'select'),
  'anonymous clients must not read the audit trail directly'
);
select pg_temp.assert(
  not has_function_privilege(
    'anon',
    'public.get_document_for_completion(uuid)',
    'execute'
  ),
  'anonymous clients must not execute the unscoped completion function'
);

set role anon;
select pg_temp.assert(
  (
    public.get_signing_package(repeat('a', 64))
      ->'signer'->'documents'->>'title'
  ) = 'Signing regression',
  'a valid token must still return its scoped signing package'
);
select pg_temp.assert(
  json_array_length(
    public.get_signing_package(repeat('a', 64))->'audit_trail'
  ) = 1
  and (
    public.get_signing_package(repeat('a', 64))
      ->'audit_trail'->0->>'user_email'
  ) = 'signer@example.com',
  'a pending signer must not receive another signer''s audit entries'
);
reset role;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set request.jwt.claim.role = 'authenticated';
select pg_temp.assert(
  (select count(*) = 3 from public.documents),
  'an authenticated owner must see their documents'
);
do $$
declare
  deleted_id uuid;
begin
  delete from public.documents
  where id = '22222222-2222-4222-8222-222222222222'
  returning id into deleted_id;
  if deleted_id is not null then
    raise exception 'Security regression: an active signing request was deleted';
  end if;
end;
$$;
select public.update_signer_status_by_token(repeat('a', 64), 'signed');
select public.mark_document_completed_by_token(repeat('a', 64));
select pg_temp.assert(
  (
    select status = 'completed'
    from public.documents
    where id = '22222222-2222-4222-8222-222222222222'
  ),
  'a logged-in signer must be able to complete a pending document'
);
insert into storage.objects (bucket_id, name)
values (
  'documents',
  '11111111-1111-4111-8111-111111111111/signed/22222222-2222-4222-8222-222222222222.pdf'
);
reset role;

do $$
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claim.sub',
    '99999999-9999-4999-8999-999999999999',
    true
  );
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      '11111111-1111-4111-8111-111111111111/signed/forbidden.pdf'
    );
    raise exception 'Security regression: another user wrote into the owner folder';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claim.sub',
    '11111111-1111-4111-8111-111111111111',
    true
  );
  begin
    perform public.mark_document_completed_by_token(repeat('b', 64));
    raise exception 'Security regression: a cancelled document was completed';
  exception
    when raise_exception then
      if sqlerrm = 'Security regression: a cancelled document was completed' then
        raise;
      end if;
  end;
end;
$$;

do $$
declare
  oversized_png text;
begin
  oversized_png := 'data:image/png;base64,' || encode(
    decode(
      '89504E470D0A1A0A0000000D494844520000271000002710',
      'hex'
    ),
    'base64'
  );
  set local role authenticated;
  perform set_config(
    'request.jwt.claim.sub',
    '11111111-1111-4111-8111-111111111111',
    true
  );
  begin
    perform public.add_signature_placement_by_token(
      repeat('c', 64),
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      oversized_png
    );
    raise exception 'Security regression: an oversized PNG was accepted';
  exception
    when raise_exception then
      if sqlerrm = 'Security regression: an oversized PNG was accepted' then
        raise;
      end if;
  end;
end;
$$;

select pg_temp.assert(
  (
    select status = 'cancelled'
    from public.documents
    where id = '33333333-3333-4333-8333-333333333333'
  ),
  'a cancelled document must remain cancelled'
);
select pg_temp.assert(
  not exists (
    select 1
    from public.signature_placements
    where field_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'an oversized signature image must not be stored'
);

do $$
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claim.sub',
    '99999999-9999-4999-8999-999999999999',
    true
  );
  begin
    perform public.cancel_document('44444444-4444-4444-8444-444444444444');
    raise exception 'Security regression: another user cancelled the owner document';
  exception
    when raise_exception then
      if sqlerrm = 'Security regression: another user cancelled the owner document' then
        raise;
      end if;
  end;
end;
$$;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.email = 'owner@example.com';
select public.cancel_document('44444444-4444-4444-8444-444444444444');
reset role;

select pg_temp.assert(
  (
    select status = 'cancelled'
    from public.documents
    where id = '44444444-4444-4444-8444-444444444444'
  ),
  'an owner must be able to cancel a pending signing request'
);
select pg_temp.assert(
  exists (
    select 1
    from public.audit_trail
    where document_id = '44444444-4444-4444-8444-444444444444'
      and action = 'Document Cancelled'
      and user_email = 'owner@example.com'
  ),
  'cancelling a signing request must create an audit entry'
);
