import { useEffect } from 'react'
import {
  FileText,
  Send,
  Eye,
  PenTool,
  Clock,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import Modal from '@/components/ui/Modal'

interface AuditTrailModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Document Created': { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-100' },
  'Document Sent': { icon: <Send className="w-4 h-4" />, color: 'text-teal-600 bg-teal-100' },
  'Document Viewed': { icon: <Eye className="w-4 h-4" />, color: 'text-amber-600 bg-amber-100' },
  'Document Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-green-600 bg-green-100' },
  'Field Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-green-600 bg-green-100' },
  'All Fields Signed': { icon: <PenTool className="w-4 h-4" />, color: 'text-green-600 bg-green-100' },
  'Signature Applied': { icon: <PenTool className="w-4 h-4" />, color: 'text-green-600 bg-green-100' },
  'Initials Added': { icon: <PenTool className="w-4 h-4" />, color: 'text-teal-600 bg-teal-100' },
  'Date Filled': { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-100' },
  'Checkbox Checked': { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-100' },
  'Text Entered': { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-100' },
  'Document Completed': { icon: <FileText className="w-4 h-4" />, color: 'text-green-700 bg-green-100' },
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC',
  }
}

export default function AuditTrailModal({ isOpen, onClose, documentId }: AuditTrailModalProps) {
  const { auditTrail, fetchAuditTrail } = useDocumentStore()

  useEffect(() => {
    if (isOpen && documentId) {
      fetchAuditTrail(documentId)
    }
  }, [isOpen, documentId, fetchAuditTrail])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AUDIT TRAIL" size="xl">
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          <span>Trail</span>
          <span>User</span>
          <span>Time & Location</span>
        </div>

        {auditTrail.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-3" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {auditTrail.map((entry) => {
              const config = actionConfig[entry.action] || { icon: <Clock className="w-4 h-4" />, color: 'text-gray-600 bg-gray-100' }
              const { date, time } = formatDateTime(entry.created_at)

              return (
                <div key={entry.id} className="grid grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className="text-sm font-medium">{entry.action}</span>
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
