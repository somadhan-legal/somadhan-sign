import { supabase } from '@/lib/supabase'

const DOCUMENT_BUCKET = 'documents'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6

export function getDocumentStoragePath(reference: string | null | undefined): string | null {
  if (!reference) return null
  if (!reference.includes('://')) return reference.replace(/^\/+/, '') || null

  try {
    const url = new URL(reference)
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/documents\/(.+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

export async function createOwnerDocumentUrl(reference: string): Promise<string> {
  const path = getDocumentStoragePath(reference)
  if (!path) throw new Error('The stored document reference is invalid.')

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw error || new Error('The document link could not be created.')
  }
  return data.signedUrl
}
