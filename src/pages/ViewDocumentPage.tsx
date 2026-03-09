import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PdfViewer from '@/components/PdfViewer'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { Moon, Sun, CheckCircle2, Clock, Eye } from 'lucide-react'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'

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

export default function ViewDocumentPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const { isDark, toggle } = useThemeStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [signers, setSigners] = useState<SignerInfo[]>([])

  useEffect(() => {
    if (!documentId) return
    const load = async () => {
      setLoading(true)

      // Fetch document using RPC to bypass RLS
      const { data: doc, error: docErr } = await (supabase as any)
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
        original_pdf_url: docData.original_pdf_url,
        status: docData.status,
      })

      // Fetch signers
      const { data: signersData } = await (supabase as any)
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
        <a href="https://sign.somadhan.com" target="_blank" rel="noopener noreferrer">
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
        <a href="https://sign.somadhan.com" target="_blank" rel="noopener noreferrer">
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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-[hsl(var(--border))] flex items-center">
          <a href="https://sign.somadhan.com" target="_blank" rel="noopener noreferrer">
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
          <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 mb-3">
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
            {signers.map((signer, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--muted))]/50">
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
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-[hsl(var(--muted))] p-6 flex justify-center relative">
        {/* Language & Theme toggles */}
        <div className="fixed top-3 right-4 z-40 flex items-center gap-1 bg-[hsl(var(--card))]/90 backdrop-blur rounded-lg border border-[hsl(var(--border))] px-1 py-0.5 shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'বাংলা' : 'English'} className="h-8 w-8">
            <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="h-8 w-8">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <PdfViewer fileUrl={document.original_pdf_url} />
      </div>
    </div>
  )
}
