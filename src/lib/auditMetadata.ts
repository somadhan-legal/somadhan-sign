type AuditLanguage = 'en' | 'bn'

const normalizeCount = (value: unknown) => {
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}

const cleanText = (value: string) => value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()

export function formatAuditMetadata(metadata: string | null | undefined, lang: AuditLanguage = 'en') {
  const value = cleanText(String(metadata || ''))
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null

    if (typeof parsed.version === 'string' && typeof parsed.language === 'string') {
      const language = parsed.language === 'bn'
        ? (lang === 'bn' ? 'বাংলা' : 'Bangla')
        : (lang === 'bn' ? 'ইংরেজি' : 'English')
      return lang === 'bn'
        ? `সম্মতির সংস্করণ: ${cleanText(parsed.version)} · ভাষা: ${language}`
        : `Consent version: ${cleanText(parsed.version)} · Language: ${language}`
    }

    const sent = normalizeCount(parsed.sent)
    const failed = normalizeCount(parsed.failed)
    if (sent !== null || failed !== null) {
      return lang === 'bn'
        ? `পাঠানো হয়েছে: ${sent ?? 0} · ব্যর্থ: ${failed ?? 0}`
        : `Sent: ${sent ?? 0} · Failed: ${failed ?? 0}`
    }

    const signerCount = normalizeCount(parsed.signerCount)
    const viewerCount = Array.isArray(parsed.ccEmails) ? parsed.ccEmails.length : null
    if (signerCount !== null || viewerCount !== null) {
      return lang === 'bn'
        ? `স্বাক্ষরকারী: ${signerCount ?? 0} · দর্শক: ${viewerCount ?? 0}`
        : `Signers: ${signerCount ?? 0} · Viewers: ${viewerCount ?? 0}`
    }

    const recipientCount = normalizeCount(parsed.recipientCount)
    if (recipientCount !== null) {
      return lang === 'bn'
        ? `সম্পন্ন নথির প্রাপক: ${recipientCount}`
        : `Completion recipients: ${recipientCount}`
    }

    return null
  } catch {
    return value.slice(0, 300)
  }
}
