import {
  createDocumentVerificationToken,
  getCompletionEvidenceSha256,
  getDocumentVerificationReference,
  getDocumentVerificationTokenDigest,
  isDocumentVerificationToken,
} from "./documentVerification.ts"

Deno.test("document verification tokens are random, versioned, and non-enumerable", async () => {
  const first = createDocumentVerificationToken()
  const second = createDocumentVerificationToken()
  if (!isDocumentVerificationToken(first) || !isDocumentVerificationToken(second)) {
    throw new Error("A verification token has an invalid format")
  }
  if (first === second) throw new Error("Verification tokens were reused")
  const digest = await getDocumentVerificationTokenDigest(first)
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("Token digest is invalid")
  if (!/^SS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
    getDocumentVerificationReference(digest),
  )) {
    throw new Error("Verification reference is invalid")
  }
})
Deno.test("completion evidence is deterministic across collection ordering", async () => {
  const original = new TextEncoder().encode("%PDF-example")
  const completedAt = "2026-07-29T10:00:00.000Z"
  const first = {
    title: "Agreement",
    fields: [{ id: "b" }, { id: "a" }],
    placements: [
      { field_id: "b", signature_id: "Approved" },
      { field_id: "a", signature_id: "Signed" },
    ],
    audit_trail: [
      { action: "Completion Emails Sent", created_at: "2026-07-29T10:00:01.000Z" },
      { action: "Document Completed", created_at: completedAt },
    ],
  }
  const second = {
    ...first,
    fields: [...first.fields].reverse(),
    placements: [...first.placements].reverse(),
    audit_trail: [...first.audit_trail].reverse(),
  }
  const firstDigest = await getCompletionEvidenceSha256("document", original, first, completedAt)
  const secondDigest = await getCompletionEvidenceSha256("document", original, second, completedAt)
  if (firstDigest !== secondDigest) throw new Error("Equivalent evidence produced different hashes")
})

Deno.test("completion evidence changes when a signed value changes", async () => {
  const original = new TextEncoder().encode("%PDF-example")
  const completedAt = "2026-07-29T10:00:00.000Z"
  const base = {
    placements: [{ field_id: "field", signature_id: "Approved" }],
    audit_trail: [{ action: "Document Completed", created_at: completedAt }],
  }
  const first = await getCompletionEvidenceSha256("document", original, base, completedAt)
  const second = await getCompletionEvidenceSha256("document", original, {
    ...base,
    placements: [{ field_id: "field", signature_id: "Rejected" }],
  }, completedAt)
  if (first === second) throw new Error("Changed evidence produced the same hash")
})
