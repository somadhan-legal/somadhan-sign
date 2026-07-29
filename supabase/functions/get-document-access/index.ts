import { createClient } from 'supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const storagePath = (reference: string | null): string | null => {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Service configuration is incomplete' }, 500)

    const { signingToken, viewerToken } = await req.json()
    const hasSigningToken = typeof signingToken === 'string' && signingToken.length >= 32
    const hasViewerToken = typeof viewerToken === 'string' && viewerToken.length >= 32
    if (hasSigningToken === hasViewerToken) return jsonResponse({ error: 'Exactly one valid access token is required' }, 400)

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (hasSigningToken) {
      const { data: signer, error: signerError } = await serviceClient
        .from('document_signers')
        .select('id, document_id, signer_email, signer_name, status, signed_at, signing_token')
        .eq('signing_token', signingToken)
        .maybeSingle()
      if (signerError) throw signerError
      if (!signer) return jsonResponse({ error: 'Document not found or access denied' }, 404)

      const [{ data: document, error: documentError }, { data: fields, error: fieldsError }, { data: placements, error: placementsError }, { data: auditTrail, error: auditError }] = await Promise.all([
        serviceClient.from('documents').select('id, title, original_pdf_url, final_pdf_url, status').eq('id', signer.document_id).maybeSingle(),
        serviceClient.from('signature_fields').select('*').eq('document_id', signer.document_id).order('field_order'),
        serviceClient.from('signature_placements').select('*').eq('document_id', signer.document_id),
        serviceClient.from('audit_trail').select('id, document_id, action, user_email, user_name, metadata, created_at').eq('document_id', signer.document_id).order('created_at'),
      ])
      if (documentError || fieldsError || placementsError || auditError) throw documentError || fieldsError || placementsError || auditError
      if (!document) return jsonResponse({ error: 'Document not found or access denied' }, 404)

      const path = storagePath(document.original_pdf_url)
      if (!path) return jsonResponse({ error: 'The document file reference is invalid' }, 500)
      const { data: signedUrl, error: signedUrlError } = await serviceClient.storage.from('documents').createSignedUrl(path, 60 * 60)
      if (signedUrlError || !signedUrl?.signedUrl) throw signedUrlError || new Error('Could not create document URL')
      let finalPdfUrl: string | null = null
      if (document.status === 'completed' && document.final_pdf_url) {
        const finalPath = storagePath(document.final_pdf_url)
        if (!finalPath) return jsonResponse({ error: 'The final document file reference is invalid' }, 500)
        const { data: finalSignedUrl, error: finalSignedUrlError } = await serviceClient.storage.from('documents').createSignedUrl(finalPath, 60 * 60)
        if (finalSignedUrlError || !finalSignedUrl?.signedUrl) throw finalSignedUrlError || new Error('Could not create final document URL')
        finalPdfUrl = finalSignedUrl.signedUrl
      }

      const normalizedEmail = signer.signer_email.toLowerCase()
      const visibleAuditTrail = document.status === 'completed'
        ? auditTrail || []
        : (auditTrail || []).filter((entry) => entry.user_email.toLowerCase() === normalizedEmail)
      return jsonResponse({
        signerPackage: {
          signer: {
            ...signer,
            documents: {
              title: document.title,
              original_pdf_url: signedUrl.signedUrl,
              final_pdf_url: finalPdfUrl,
              status: document.status,
              final_pdf_available: Boolean(finalPdfUrl),
            },
          },
          fields: (fields || []).map((field) => ({
            ...field,
            assigned_to_email: field.assigned_to_email.toLowerCase() === normalizedEmail ? signer.signer_email : '',
          })),
          placements: (placements || [])
            .filter((placement) => document.status === 'completed' || placement.signer_email.toLowerCase() === normalizedEmail)
            .map((placement) => ({
              ...placement,
              signer_id: null,
              signer_email: placement.signer_email.toLowerCase() === normalizedEmail ? signer.signer_email : '',
            })),
          audit_trail: visibleAuditTrail,
        },
      })
    }

    const { data: viewer, error: viewerError } = await serviceClient
      .from('document_viewers')
      .select('document_id')
      .eq('viewing_token', viewerToken)
      .maybeSingle()
    if (viewerError) throw viewerError
    if (!viewer) return jsonResponse({ error: 'Document not found or access denied' }, 404)

    const [{ data: document, error: documentError }, { data: signers, error: signersError }] = await Promise.all([
      serviceClient.from('documents').select('id, title, original_pdf_url, final_pdf_url, status').eq('id', viewer.document_id).maybeSingle(),
      serviceClient.from('document_signers').select('signer_email, signer_name, status').eq('document_id', viewer.document_id).order('created_at'),
    ])
    if (documentError || signersError) throw documentError || signersError
    if (!document) return jsonResponse({ error: 'Document not found or access denied' }, 404)

    const path = storagePath(document.original_pdf_url)
    if (!path) return jsonResponse({ error: 'The document file reference is invalid' }, 500)
    const { data: signedUrl, error: signedUrlError } = await serviceClient.storage.from('documents').createSignedUrl(path, 60 * 60)
    if (signedUrlError || !signedUrl?.signedUrl) throw signedUrlError || new Error('Could not create document URL')
    let finalPdfUrl: string | null = null
    if (document.status === 'completed' && document.final_pdf_url) {
      const finalPath = storagePath(document.final_pdf_url)
      if (!finalPath) return jsonResponse({ error: 'The final document file reference is invalid' }, 500)
      const { data: finalSignedUrl, error: finalSignedUrlError } = await serviceClient.storage.from('documents').createSignedUrl(finalPath, 60 * 60)
      if (finalSignedUrlError || !finalSignedUrl?.signedUrl) throw finalSignedUrlError || new Error('Could not create final document URL')
      finalPdfUrl = finalSignedUrl.signedUrl
    }

    return jsonResponse({
      viewerPackage: {
        document: { ...document, original_pdf_url: signedUrl.signedUrl, final_pdf_url: finalPdfUrl },
        signers: signers || [],
      },
    })
  } catch (error) {
    console.error('Document access error:', error)
    return jsonResponse({ error: 'The document could not be loaded' }, 500)
  }
})
