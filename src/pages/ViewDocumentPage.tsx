import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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

interface DocumentData {
  id: string
  title: string
  original_pdf_url: string
  status: string
}

interface SignerInfo {
  signer_email: string
  signer_name: string | null
  status: string
}

const isMissingRpc = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST202' || error?.message?.includes('Could not find the function') === true

const isMissingEdgeFunction = (error: unknown) => {
  const edgeError = error as { context?: { status?: number }; name?: string; message?: string } | null
  return edgeError?.context?.status === 404
    || edgeError?.name === 'FunctionsFetchError'
    || /not found|failed to send a request/i.test(edgeError?.message || '')
}

export default function ViewDocumentPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const { isDark, toggle } = useThemeStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [signers, setSigners] = useState<SignerInfo[]>([])
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  )

  useEffect(() => {
    if (!documentId) return
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: accessData, error: accessError } = await supabase.functions.invoke('get-document-access', {
        body: { viewerToken: documentId },
      })
      if (!accessError) {
        const securePackage = accessData?.viewerPackage as ViewerPackageResult | undefined
        if (!securePackage?.document) {
          setError('Document not found or access denied.')
          setLoading(false)
          return
        }
        setDocument(securePackage.document)
        setSigners(securePackage.signers || [])
        setLoading(false)
        return
      }
      if (!isMissingEdgeFunction(accessError)) {
        setError('Document not found or access denied.')
        setLoading(false)
        return
      }

      const { data: viewerPackage, error: packageError } = await supabase
        .rpc('get_viewer_package', { p_token: documentId })

      if (!packageError) {
        if (!viewerPackage?.document) {
          setError('Document not found or access denied.')
          setLoading(false)
          return
        }
        setDocument({
          ...viewerPackage.document,
          original_pdf_url: getLegacyPublicDocumentUrl(viewerPackage.document.original_pdf_url),
        })
        setSigners(viewerPackage.signers || [])
        setLoading(false)
        return
      }

      if (!isMissingRpc(packageError)) {
        setError('Document not found or access denied.')
        setLoading(false)
        return
      }

      // Compatibility for links issued before the secure viewer-token migration.
      const { data: doc, error: docErr } = await supabase
        .rpc('get_document_for_viewer', { p_document_id: documentId })

      if (docErr || !doc || doc.length === 0) {
        setError('Document not found or access denied.')
        setLoading(false)
        return
      }

      const docData = doc[0]
      setDocument({
        id: docData.id,
        title: docData.title,
        original_pdf_url: getLegacyPublicDocumentUrl(docData.original_pdf_url),
        status: docData.status,
      })

      // Fetch signers
      const { data: signersData } = await supabase
        .rpc('get_signers_for_viewer', { p_document_id: documentId })

      if (signersData) {
        setSigners(signersData)
      }

      setLoading(false)
    }
    load()
  }, [documentId])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[hsl(var(--muted-foreground))]">Loading document...</p>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Document Not Found</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            {error || 'The document you\'re looking for was not found or access is denied.'}
          </p>
        </div>
      </div>
    )
  }

  const signedCount = signers.filter(s => s.status === 'signed').length
  const totalSigners = signers.length

  return (
    <div className="relative flex h-screen min-w-0">
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
            aria-label="Document signing progress"
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
            Hide details
          </Button>
        </div>
      </div>
      )}

      {leftPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed(false)}
          aria-label="Show document details"
          className="w-11 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center cursor-pointer"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* PDF Viewer */}
      <div className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--muted))] p-3 sm:p-6 flex justify-center relative">
        {/* Language & Theme toggles */}
        <div className="fixed top-3 right-4 z-40 flex items-center gap-1 bg-[hsl(var(--card))]/90 backdrop-blur rounded-lg border border-[hsl(var(--border))] px-1 py-0.5 shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleLang} aria-label={lang === 'en' ? 'Switch to Bangla' : 'Switch to English'} title={lang === 'en' ? 'বাংলা' : 'English'} className="h-11 w-11">
            <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="h-11 w-11">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <PdfViewer fileUrl={document.original_pdf_url} />
      </div>
    </div>
  )
}
