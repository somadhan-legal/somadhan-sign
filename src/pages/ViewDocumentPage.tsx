import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '@/lib/supabase'
import PdfViewer from '@/components/PdfViewer'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { Moon, Sun, CheckCircle2, Clock, Eye, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import type { ViewerPackageResult } from '@/types/database'
import { getLegacyPublicDocumentUrl } from '@/lib/documentStorage'
import { secureDocumentAccessEnabled } from '@/lib/secureDocumentAccess'
import { useResponsivePanel } from '@/hooks/useResponsivePanel'
import { isViewerReference } from '@/lib/publicAccessReference'

interface DocumentData {
  id: string
  title: string
  original_pdf_url: string
  final_pdf_url?: string | null
  status: string
}

interface SignerInfo {
  signer_email: string
  signer_name: string | null
  status: string
}

async function fetchViewerPagePackage(reference: string): Promise<{
  document: DocumentData
  signers: SignerInfo[]
}> {
  if (secureDocumentAccessEnabled) {
    const { data: accessData, error: accessError } = await supabase.functions.invoke('get-document-access', {
      body: { viewerToken: reference },
    })
    const securePackage = accessData?.viewerPackage as ViewerPackageResult | undefined
    if (accessError || !securePackage?.document) {
      throw accessError || new Error('The document could not be loaded.')
    }
    return {
      document: securePackage.document,
      signers: securePackage.signers || [],
    }
  }

  const [{ data: documentRows, error: documentError }, { data: signers, error: signersError }] = await Promise.all([
    supabase.rpc('get_document_for_viewer', { p_document_id: reference }),
    supabase.rpc('get_signers_for_viewer', { p_document_id: reference }),
  ])
  const document = documentRows?.[0]
  if (documentError || signersError || !document) {
    throw documentError || signersError || new Error('The document could not be loaded.')
  }
  return {
    document: {
      id: document.id,
      title: document.title,
      original_pdf_url: getLegacyPublicDocumentUrl(document.original_pdf_url),
      status: document.status,
    },
    signers: signers || [],
  }
}

export default function ViewDocumentPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const referenceIsValid = isViewerReference(documentId, secureDocumentAccessEnabled)
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const { isDark, toggle } = useThemeStore()
  const [loading, setLoading] = useState(referenceIsValid)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [signers, setSigners] = useState<SignerInfo[]>([])
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useResponsivePanel()

  useEffect(() => {
    if (!isViewerReference(documentId, secureDocumentAccessEnabled)) return
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const viewerPackage = await fetchViewerPagePackage(documentId)
        if (!active) return
        setDocument(viewerPackage.document)
        setSigners(viewerPackage.signers)
      } catch {
        if (!active) return
        setDocument(null)
        setSigners([])
        setError(t('signee.docNotFoundDesc'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [documentId, t])

  if (loading && referenceIsValid) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(var(--background))]" role="status" aria-live="polite">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
        <p className="text-[hsl(var(--muted-foreground))]">{t('signee.loadingDoc')}</p>
      </div>
    )
  }

  if (!referenceIsValid || error || !document) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="text-center max-w-md" role="alert">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">{t('signee.docNotFound')}</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            {error || t('signee.docNotFoundDesc')}
          </p>
        </div>
      </div>
    )
  }

  const signedCount = signers.filter(s => s.status === 'signed').length
  const totalSigners = signers.length
  const finalCopyPending = document.status === 'completed' && !document.final_pdf_url

  return (
    <div className="relative flex h-dvh min-w-0">
      {!leftPanelCollapsed && (
        <button
          type="button"
          aria-label={t('viewer.hideDetails')}
          onClick={() => setLeftPanelCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
        />
      )}
      {/* Sidebar */}
      {!leftPanelCollapsed && (
      <div className="absolute inset-y-0 left-0 z-50 w-[min(20rem,88vw)] border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-xl overflow-y-auto flex flex-col lg:static lg:z-auto lg:w-80 lg:shadow-none">
        <div className="p-3 border-b border-[hsl(var(--border))] flex items-center">
          <a href="/">
            <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 cursor-pointer" />
          </a>
        </div>

        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-lg truncate">{document.title}</h2>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="default">
              <Eye className="w-3 h-3 mr-1" />
              {lang === 'bn' ? 'শুধু দেখুন' : 'View Only'}
            </Badge>
            <Badge variant={document.status === 'completed' ? 'success' : 'warning'}>
              {document.status === 'completed'
                ? (lang === 'bn' ? 'সম্পন্ন' : 'Completed')
                : (lang === 'bn' ? 'স্বাক্ষরের জন্য অপেক্ষমাণ' : 'Pending')}
            </Badge>
          </div>
        </div>

        {/* Signing Progress */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
            {lang === 'bn' ? 'স্বাক্ষর অগ্রগতি' : 'Signing Progress'}
          </h3>
          <div
            className="w-full bg-[hsl(var(--muted))] rounded-full h-2 mb-3"
            role="progressbar"
            aria-label={t('viewer.signingProgress')}
            aria-valuemin={0}
            aria-valuemax={Math.max(totalSigners, 1)}
            aria-valuenow={signedCount}
          >
            <div
              className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all"
              style={{ width: `${totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {signedCount} / {totalSigners} {lang === 'bn' ? 'স্বাক্ষরিত' : 'signed'}
          </p>
        </div>

        {/* Signers List */}
        <div className="p-4 flex-1">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
            {lang === 'bn' ? 'স্বাক্ষরকারী' : 'Signers'}
          </h3>
          <div className="space-y-2">
            {signers.map((signer) => (
              <div key={signer.signer_email} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--muted))]/50">
                {signer.status === 'signed' ? (
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{signer.signer_name || signer.signer_email}</p>
                  {signer.signer_name && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{signer.signer_email}</p>
                  )}
                </div>
                <Badge variant={signer.status === 'signed' ? 'success' : 'warning'} className="ml-auto shrink-0 text-[10px]">
                  {signer.status === 'signed'
                    ? (lang === 'bn' ? 'স্বাক্ষরিত' : 'Signed')
                    : (lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-[hsl(var(--border))]">
          <Button variant="ghost" className="w-full" onClick={() => setLeftPanelCollapsed(true)}>
            <PanelLeftClose className="mr-2 h-4 w-4" />
            {t('viewer.hideDetails')}
          </Button>
        </div>
      </div>
      )}

      {leftPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed(false)}
          aria-label={t('viewer.showDetails')}
          className="w-11 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center cursor-pointer"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* PDF Viewer */}
      <div className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--muted))] p-3 sm:p-6 flex justify-center relative">
        {/* Language & Theme toggles */}
        <div className="fixed top-3 right-4 z-40 flex items-center gap-1 bg-[hsl(var(--card))]/90 backdrop-blur rounded-lg border border-[hsl(var(--border))] px-1 py-0.5 shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} title={lang === 'en' ? 'বাংলা' : 'English'} className="h-11 w-11">
            <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="h-11 w-11">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        {finalCopyPending ? (
          <div className="m-auto max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-sm" role="status">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--warning))]/10">
              <Clock className="h-7 w-7 text-[hsl(var(--warning))]" />
            </div>
            <h2 className="text-xl font-semibold">{t('viewer.finalCopyPending')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              {t('viewer.finalCopyPendingDesc')}
            </p>
          </div>
        ) : (
          <PdfViewer
            fileUrl={document.final_pdf_url || document.original_pdf_url}
            onRetry={async () => {
              const refreshedPackage = await fetchViewerPagePackage(documentId!)
              setDocument(refreshedPackage.document)
              setSigners(refreshedPackage.signers)
            }}
          />
        )}
      </div>
    </div>
  )
}
