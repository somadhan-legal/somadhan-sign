import { useEffect, useState } from 'react'
import {
  FileText,
  Send,
  Eye,
  PenTool,
  Clock,
  Bell,
  MailCheck,
  ShieldCheck,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import Modal from '@/components/ui/Modal'
import { useLanguageStore } from '@/stores/languageStore'

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
  const requestKey = isOpen ? `${documentId}:${signingToken || 'owner'}` : ''
  const loading = Boolean(requestKey) && loadedRequestKey !== requestKey

  useEffect(() => {
    if (!isOpen || !documentId) return
    let cancelled = false
    const request = signingToken
      ? fetchPlacements(documentId, signingToken)
      : fetchAuditTrail(documentId)
    void request.finally(() => {
      if (!cancelled) setLoadedRequestKey(requestKey)
    })
    return () => { cancelled = true }
  }, [isOpen, documentId, signingToken, fetchAuditTrail, fetchPlacements, requestKey])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('audit.title')} size="xl">
      <div className="max-h-[70dvh] overflow-y-auto" aria-busy={loading}>
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          <span>{t('audit.trail')}</span>
          <span>{t('audit.user')}</span>
          <span>{t('audit.timeLocation')}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
            <span className="sr-only">{t('audit.loading')}</span>
          </div>
        ) : auditTrail.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-3" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('audit.noActivity')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {auditTrail.map((entry) => {
              const config = actionConfig[entry.action] || { icon: <Clock className="w-4 h-4" />, color: 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]' }
              const { date, time } = formatDateTime(entry.created_at, lang === 'bn' ? 'bn-BD' : 'en-US')
              const actionKey = actionTranslationKeys[entry.action]

              return (
                <div key={entry.id} className="grid grid-cols-1 gap-3 px-4 py-4 hover:bg-[hsl(var(--muted))]/50 transition-colors sm:grid-cols-[1fr_1fr_1fr] sm:gap-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className="text-sm font-medium">{actionKey ? t(actionKey) : entry.action}</span>
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
                    {entry.ip_address && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{entry.ip_address}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
