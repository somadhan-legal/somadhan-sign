type AuditLanguage = 'en' | 'bn'

const normalizeCount = (value: unknown) => {
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}

const cleanText = (value: string) => value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()

export function maskNetworkAddress(value: string | null | undefined) {
  const address = cleanText(String(value || ''))
  if (!address) return null
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (ipv4 && ipv4.slice(1).every((part) => Number(part) <= 255)) {
    return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.xxx`
  }
  if (address.includes(':')) {
    const segments = address.split(':').filter(Boolean)
    return segments.length > 0 ? `${segments.slice(0, 3).join(':')}::` : null
  }
  return null
}

const formatPage = (page: string, lang: AuditLanguage) =>
  lang === 'bn' ? `পৃষ্ঠা ${page}` : `Page ${page}`

const formatKnownPlainText = (value: string, lang: AuditLanguage) => {
  if (value === 'Document uploaded') {
    return lang === 'bn' ? 'ডকুমেন্ট আপলোড করা হয়েছে' : 'Document uploaded'
  }
  if (value === 'All signers have signed') {
    return lang === 'bn' ? 'সকল স্বাক্ষরকারী স্বাক্ষর করেছেন' : 'All signers have signed'
  }
  if (value === 'Signing request cancelled by document owner') {
    return lang === 'bn'
      ? 'ডকুমেন্টের মালিক স্বাক্ষরের অনুরোধ বাতিল করেছেন'
      : 'Signing request cancelled by document owner'
  }

  let match = value.match(/^Auto-filled (\d+) (signature|initials) fields$/)
  if (match) {
    const [, count, fieldType] = match
    if (lang === 'bn') {
      return fieldType === 'signature'
        ? `${count}টি স্বাক্ষর ক্ষেত্র স্বয়ংক্রিয়ভাবে পূরণ হয়েছে`
        : `${count}টি ইনিশিয়াল ক্ষেত্র স্বয়ংক্রিয়ভাবে পূরণ হয়েছে`
    }
    return `Auto-filled ${count} ${fieldType} fields`
  }

  match = value.match(/^(Signature|Initials) placed on page (\d+)$/)
  if (match) {
    const [, fieldType, page] = match
    if (lang === 'bn') {
      return `${formatPage(page, lang)}: ${fieldType === 'Signature' ? 'স্বাক্ষর যোগ হয়েছে' : 'ইনিশিয়াল যোগ হয়েছে'}`
    }
    return `${fieldType} placed on page ${page}`
  }

  match = value.match(/^Date (\d{4}-\d{2}-\d{2}) on page (\d+)$/)
  if (match) {
    const [, date, page] = match
    return lang === 'bn'
      ? `${formatPage(page, lang)}: তারিখ ${date}`
      : `Date ${date} on page ${page}`
  }

  match = value.match(/^(Checkbox|Text) on page (\d+)$/)
  if (match) {
    const [, fieldType, page] = match
    if (lang === 'bn') {
      return `${formatPage(page, lang)}: ${fieldType === 'Checkbox' ? 'চেকবক্স নির্বাচন হয়েছে' : 'টেক্সট যোগ হয়েছে'}`
    }
    return `${fieldType} on page ${page}`
  }

  return value.slice(0, 300)
}

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

    if (
      parsed.source === 'database'
      && typeof parsed.pageNumber === 'number'
      && Number.isInteger(parsed.pageNumber)
      && parsed.pageNumber > 0
    ) {
      return formatPage(String(parsed.pageNumber), lang)
    }

    return null
  } catch {
    return formatKnownPlainText(value, lang)
  }
}
