import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const emailFunction = readFileSync(
  new URL('../functions/send-signing-email/index.ts', import.meta.url),
  'utf8',
)
const finalPdfFunction = readFileSync(
  new URL('../functions/_shared/finalPdf.ts', import.meta.url),
  'utf8',
)

describe('signing email trust boundary', () => {
  it('derives sender identity from the authenticated user', () => {
    expect(emailFunction).toContain(
      "verifiedSenderName = authData.user.user_metadata?.full_name || authData.user.email || 'A user'",
    )
    expect(emailFunction).toContain(
      "const safeSenderName = escapeHtml(verifiedSenderName || 'Someone')",
    )
    expect(emailFunction).toContain(
      "const subjectSender = cleanSubjectText(verifiedSenderName || 'Someone')",
    )
  })

  it('derives the CC signer list from the owned document', () => {
    expect(emailFunction).toContain(
      ".from('document_signers')\n          .select('signer_email')",
    )
    expect(emailFunction).toContain('if (verifiedSigneeEmails.length > 0)')
    expect(emailFunction).not.toContain('signeeEmails.map(')
  })

  it('stores a completed PDF before requiring email provider configuration', () => {
    const finalPdfUpload = emailFunction.indexOf(
      ".upload(uploadedReference, pdfBytes, { contentType: 'application/pdf', upsert: false })",
    )
    const atomicFinalization = emailFunction.indexOf(
      ".rpc(\n          'commit_final_document_verification'",
    )
    const providerConfigCheck = emailFunction.indexOf(
      "if (!RESEND_API_KEY) {\n      throw new Error('RESEND_API_KEY not configured')",
    )

    expect(finalPdfUpload).toBeGreaterThan(-1)
    expect(atomicFinalization).toBeGreaterThan(finalPdfUpload)
    expect(providerConfigCheck).toBeGreaterThan(atomicFinalization)
  })

  it('builds the durable PDF from authoritative server data', () => {
    expect(emailFunction).toContain(
      'const pdfBytes = await generateAuthoritativeFinalPdf(',
    )
    expect(emailFunction).toContain(
      ".from('documents')\n          .download(originalPath)",
    )
    expect(emailFunction).not.toContain('pdfBase64')
    expect(emailFunction).toContain(
      'const toRecipients = isCompletion\n      ? verifiedCompletionRecipients',
    )
    expect(emailFunction).not.toContain('allowedCompletionRecipients')
    expect(finalPdfFunction).toContain(
      'fields.some((field) => !placementByField.has(field.id))',
    )
    expect(finalPdfFunction).toContain('BENGALI_FONT_SHA256')
    expect(finalPdfFunction).toContain('RESVG_WASM_SHA256')
  })
})
