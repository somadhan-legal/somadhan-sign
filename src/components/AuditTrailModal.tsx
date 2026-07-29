import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Send,
  Eye,
  PenTool,
  Clock,
  Bell,
  MailCheck,
  ShieldCheck,
  XCircle,
  ListChecks,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'
import { formatAuditMetadata, maskNetworkAddress } from '@/lib/auditMetadata'

interface AuditTrailModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  signingToken?: string
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Document Created': { icon: <FileText className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Document Sent': { icon: <Send className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Document Viewed': { icon: <Eye className="w-4 h-4" />, color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
  'Document Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Field Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'All Fields Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Signature Applied': { icon: <PenTool className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Initials Added': { icon: <PenTool className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Date Filled': { icon: <Clock className="w-4 h-4" />, color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
  'Checkbox Checked': { icon: <FileText className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Text Entered': { icon: <FileText className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Document Completed': { icon: <FileText className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Document Sent for Signing': { icon: <Send className="w-4 h-4" />, color: 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' },
  'Reminder Sent': { icon: <Bell className="w-4 h-4" />, color: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
  'Electronic Signature Consent Given': { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Completion Emails Sent': { icon: <MailCheck className="w-4 h-4" />, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  'Document Cancelled': { icon: <XCircle className="w-4 h-4" />, color: 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10' },
}

const actionTranslationKeys: Record<string, string> = {
  'Document Created': 'audit.documentCreated',
  'Document Sent': 'audit.documentSent',
  'Document Viewed': 'audit.documentViewed',
  'Document Signed': 'audit.documentSigned',
  'Field Signed': 'audit.fieldSigned',
  'All Fields Signed': 'audit.allFieldsSigned',
  'Signature Applied': 'audit.signatureApplied',
  'Initials Added': 'audit.initialsAdded',
  'Date Filled': 'audit.dateFilled',
  'Checkbox Checked': 'audit.checkboxChecked',
  'Text Entered': 'audit.textEntered',
  'Document Completed': 'audit.documentCompleted',
  'Document Sent for Signing': 'audit.sentForSigning',
  'Reminder Sent': 'audit.reminderSent',
  'Electronic Signature Consent Given': 'audit.consentGiven',
  'Completion Emails Sent': 'audit.completionEmailsSent',
  'Document Cancelled': 'audit.documentCancelled',
}

function formatDateTime(dateStr: string, locale: string) {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC',
  }
}

export default function AuditTrailModal({ isOpen, onClose, documentId, signingToken }: AuditTrailModalProps) {
  const { auditTrail, fetchAuditTrail, fetchPlacements } = useDocumentStore()
  const { lang, t } = useLanguageStore()
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [reloadAttempt, setReloadAttempt] = useState(0)
  const requestKey = isOpen ? `${documentId}:${signingToken || 'owner'}:${reloadAttempt}` : ''
  const loading = Boolean(requestKey) && loadedRequestKey !== requestKey
  const orderedAuditTrail = useMemo(
    () => [...auditTrail].sort((left, right) => {
      const timeDifference = Date.parse(left.created_at) - Date.parse(right.created_at)
      return timeDifference || left.id.localeCompare(right.id)
    }),
    [auditTrail],
  )
  const participantCount = useMemo(
    () => new Set(orderedAuditTrail.map((entry) => entry.user_email.trim().toLowerCase())).size,
    [orderedAuditTrail],
  )

  useEffect(() => {
    if (!isOpen || !documentId) return
    let cancelled = false
    const load = async () => {
      let loaded: boolean
      try {
        loaded = signingToken
          ? await fetchPlacements(documentId, signingToken)
          : await fetchAuditTrail(documentId)
      } catch {
        loaded = false
      }
      if (!cancelled) {
        setLoadError(!loaded)
        setLoadedRequestKey(requestKey)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [isOpen, documentId, signingToken, fetchAuditTrail, fetchPlacements, requestKey])

  const handleClose = () => {
    setLoadedRequestKey('')
    setLoadError(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('audit.title')} size="xl">
      <div className="max-h-[70dvh] overflow-y-auto" aria-busy={loading}>
        {!loading && !loadError && orderedAuditTrail.length > 0 && (
          <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/35 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">{t('audit.recordedActivity')}</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  {t('audit.recordedActivityDesc')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1">
                    {orderedAuditTrail.length} {t(orderedAuditTrail.length === 1 ? 'audit.event' : 'audit.events')}
                  </span>
                  <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1">
                    {participantCount} {t(participantCount === 1 ? 'audit.participant' : 'audit.participants')}
                  </span>
                  <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1">
                    {t('audit.timesInUtc')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          <span>{t('audit.trail')}</span>
          <span>{t('audit.user')}</span>
          <span>{t('audit.timeNetwork')}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" aria-hidden="true" />
            <span className="sr-only">{t('audit.loading')}</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="alert">
            <XCircle className="mb-3 h-10 w-10 text-[hsl(var(--destructive))]/70" />
            <p className="text-sm font-medium">{t('audit.loadFailed')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setReloadAttempt((attempt) => attempt + 1)}
            >
              {t('viewer.tryAgain')}
            </Button>
          </div>
        ) : orderedAuditTrail.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-3" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('audit.noActivity')}</p>
          </div>
        ) : (
          <ol className="divide-y divide-[hsl(var(--border))]">
            {orderedAuditTrail.map((entry) => {
              const config = actionConfig[entry.action] || { icon: <Clock className="w-4 h-4" />, color: 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]' }
              const { date, time } = formatDateTime(entry.created_at, lang === 'bn' ? 'bn-BD' : 'en-US')
              const actionKey = actionTranslationKeys[entry.action]
              const metadata = formatAuditMetadata(entry.metadata, lang)
              const networkAddress = maskNetworkAddress(entry.ip_address)

              return (
                <li key={entry.id} className="grid grid-cols-1 gap-3 px-4 py-4 hover:bg-[hsl(var(--muted))]/50 transition-colors sm:grid-cols-[1fr_1fr_1fr] sm:gap-4 sm:py-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-medium">{actionKey ? t(actionKey) : entry.action}</span>
                      {metadata && (
                        <span className="mt-1 block text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                          {metadata}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-sm font-medium truncate">
                      {entry.user_name || entry.user_email.split('@')[0]}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {entry.user_email}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-sm">{date}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{time}</span>
                    {networkAddress && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('audit.networkAddress')} {networkAddress}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </Modal>
  )
}
