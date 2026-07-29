import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "supabase"
import { generateAuthoritativeFinalPdf } from "../_shared/finalPdf.ts"
import { getFinalPdfStoragePath } from "../_shared/completionStorage.ts"
import { withPublicSupabaseOrigin } from "../_shared/publicSupabaseUrl.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const safeHttpUrl = (value: unknown) => {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.toString()) : '#'
  } catch {
    return '#'
  }
}

const cleanSubjectText = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
const isEmail = (value: unknown): value is string => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isMissingRpc = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST202' || error?.message?.includes('Could not find the function') === true

const emailIdempotencyKey = async (scope: string, documentId: string, recipient: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(recipient.trim().toLowerCase()),
  )
  const recipientHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
  return `somadhan-${scope}-${documentId}-${recipientHash}`
}

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

const bytesToBase64 = (bytes: Uint8Array) => {
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

// Text branding keeps email rendering independent from private document storage.
const headerLogo = (afterLogo: string) => `
  <div style="background-color: #075056; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <div style="color: white; font-family: Arial, sans-serif; font-size: 25px; font-weight: 700; letter-spacing: -0.5px;">
      Somadhan<span style="color: #F95943; font-style: italic; font-weight: 500;">Sign</span>
    </div>
    ${afterLogo}
  </div>`

// Footer - simple text only, no logo
const footer = `
  <div style="text-align: center; padding: 20px;">
    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
      Somadhan &middot; Dhaka, Bangladesh
    </p>
  </div>`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    const { to, documentTitle, documentId, signingLink, signingToken, viewerToken, senderName, message, type, downloadUrl: requestedDownloadUrl, viewLink } = await req.json()
    if (String(documentTitle || '').length > 200 || String(senderName || '').length > 200 || String(message || '').length > 5000) {
      return new Response(JSON.stringify({ error: 'Email content is too long' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    if (Array.isArray(to) && to.length > 100) {
      return new Response(JSON.stringify({ error: 'Too many email recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const isCompletion = type === 'completion'
    const isCcNotification = type === 'cc-notification'
    const isReminder = type === 'reminder'
    if (type && !['completion', 'cc-notification', 'invitation', 'reminder'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publicSupabaseUrl = Deno.env.get('APP_SUPABASE_PUBLIC_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment is not configured')

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const completionServiceRoleKey = isCompletion ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : null
    const completionServiceClient = completionServiceRoleKey
      ? createClient(supabaseUrl, completionServiceRoleKey, { auth: { persistSession: false } })
      : null

    let verifiedDocumentTitle = documentTitle
    let verifiedCompletionRecipients: string[] = []
    let verifiedDocumentId: string | null = null
    let resolvedDownloadUrl = requestedDownloadUrl
    let resolvedSigningLink = signingLink
    let resolvedViewLink = viewLink
    let verifiedRecipient: string | null = null
    let verifiedPdfBase64 = ''
    let verifiedSenderName = senderName
    let verifiedSigneeEmails: string[] = []

    if (isCompletion) {
      if (!completionServiceClient) throw new Error('Secure document storage is not configured')
      if (typeof signingToken !== 'string' || signingToken.length < 32) {
        return new Response(JSON.stringify({ error: 'A valid signing token is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const { data: signer, error: signerError } = await completionServiceClient
        .from('document_signers')
        .select('document_id')
        .eq('signing_token', signingToken)
        .maybeSingle()
      if (signerError || !signer?.document_id) {
        return new Response(JSON.stringify({ error: 'Signing authorization failed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
      const completionDocumentId = String(signer.document_id)
      verifiedDocumentId = completionDocumentId

      let { data: completionData, error: completionError } = await authClient.rpc(
        'get_document_for_completion_by_token',
        { p_token: signingToken },
      )
      if (isMissingRpc(completionError)) {
        const legacyResult = await authClient.rpc('get_document_for_completion', {
          p_document_id: completionDocumentId,
        })
        completionData = legacyResult.data
        completionError = legacyResult.error
      }
      if (completionError || !completionData) {
        return new Response(JSON.stringify({ error: 'Completion data is unavailable' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      verifiedDocumentTitle = completionData.title || documentTitle
      const allowed = [
        ...(completionData.signers || []).map((item: { signer_email?: string }) => item.signer_email),
        completionData.owner_email,
      ].filter(isEmail)
      if (completionData.cc_metadata) {
        try {
          const metadata = typeof completionData.cc_metadata === 'string'
            ? JSON.parse(completionData.cc_metadata)
            : completionData.cc_metadata
          if (Array.isArray(metadata?.ccEmails)) allowed.push(...metadata.ccEmails.filter(isEmail))
        } catch {
          // Ignore legacy non-JSON audit metadata.
        }
      }
      verifiedCompletionRecipients = [...new Map(
        allowed.map((email) => [email.toLowerCase(), email.trim()]),
      ).values()]
      if (verifiedCompletionRecipients.length > 200) {
        return new Response(JSON.stringify({ error: 'Too many completion recipients' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const { data: existingDocument, error: existingDocumentError } = await completionServiceClient
        .from('documents')
        .select('final_pdf_url, status')
        .eq('id', completionDocumentId)
        .single()
      if (existingDocumentError) throw existingDocumentError
      if (existingDocument.status !== 'completed') {
        return new Response(JSON.stringify({ error: 'The document is not complete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }

      let finalPdfReference = existingDocument?.final_pdf_url || null
      if (!finalPdfReference) {
        const originalPath = storagePath(completionData.original_pdf_url)
        if (!originalPath) throw new Error('The original document file reference is invalid')
        const { data: originalPdf, error: originalPdfError } = await completionServiceClient.storage
          .from('documents')
          .download(originalPath)
        if (originalPdfError || !originalPdf) {
          throw originalPdfError || new Error('The original document could not be loaded')
        }
        const pdfBytes = await generateAuthoritativeFinalPdf(
          new Uint8Array(await originalPdf.arrayBuffer()),
          completionData,
        )
        const uploadedReference = getFinalPdfStoragePath(
          completionData.created_by,
          completionDocumentId,
          crypto.randomUUID(),
        )
        const { error: uploadError } = await completionServiceClient.storage
          .from('documents')
          .upload(uploadedReference, pdfBytes, { contentType: 'application/pdf', upsert: false })
        if (uploadError) throw uploadError
        const { data: savedDocument, error: saveError } = await completionServiceClient
          .from('documents')
          .update({ final_pdf_url: uploadedReference, updated_at: new Date().toISOString() })
          .eq('id', completionDocumentId)
          .is('final_pdf_url', null)
          .select('final_pdf_url')
          .maybeSingle()
        if (saveError) {
          await completionServiceClient.storage.from('documents').remove([uploadedReference])
          throw saveError
        }
        if (savedDocument?.final_pdf_url) {
          finalPdfReference = savedDocument.final_pdf_url
        } else {
          const { data: winningDocument, error: winningDocumentError } = await completionServiceClient
            .from('documents')
            .select('final_pdf_url')
            .eq('id', completionDocumentId)
            .single()
          await completionServiceClient.storage.from('documents').remove([uploadedReference])
          if (winningDocumentError) throw winningDocumentError
          finalPdfReference = winningDocument?.final_pdf_url || null
        }
      }

      if (!finalPdfReference) {
        return new Response(JSON.stringify({ error: 'The completed PDF is not available' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 422,
        })
      }

      const finalPath = storagePath(finalPdfReference)
      if (!finalPath) throw new Error('The final document file reference is invalid')
      const [{ data: signedDownload, error: signedDownloadError }, { data: finalPdf, error: finalPdfError }] = await Promise.all([
        completionServiceClient.storage.from('documents').createSignedUrl(finalPath, 60 * 60 * 24 * 7),
        completionServiceClient.storage.from('documents').download(finalPath),
      ])
      if (signedDownloadError || !signedDownload?.signedUrl) throw signedDownloadError || new Error('The final document link could not be created')
      if (finalPdfError || !finalPdf) throw finalPdfError || new Error('The final document attachment could not be loaded')
      resolvedDownloadUrl = withPublicSupabaseOrigin(signedDownload.signedUrl, publicSupabaseUrl)
      if (finalPdf.size <= 21_000_000) {
        const finalBytes = new Uint8Array(await finalPdf.arrayBuffer())
        if (new TextDecoder().decode(finalBytes.slice(0, 5)) !== '%PDF-') throw new Error('The stored final document is invalid')
        verifiedPdfBase64 = bytesToBase64(finalBytes)
      }
    } else {
      const { data: authData, error: authError } = await authClient.auth.getUser()
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
      if (typeof documentId !== 'string') {
        return new Response(JSON.stringify({ error: 'A document identifier is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      const { data: ownedDocument } = await authClient
        .from('documents')
        .select('id, title, status')
        .eq('id', documentId)
        .eq('created_by', authData.user.id)
        .maybeSingle()
      if (!ownedDocument) {
        return new Response(JSON.stringify({ error: 'Document access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
      if (ownedDocument.status !== 'pending') {
        return new Response(JSON.stringify({ error: 'This signing request is no longer active' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }
      verifiedDocumentId = ownedDocument.id
      verifiedDocumentTitle = ownedDocument.title
      verifiedSenderName = authData.user.user_metadata?.full_name || authData.user.email || 'A user'

      const recipient = Array.isArray(to) ? to[0] : to
      if (!isEmail(recipient)) {
        return new Response(JSON.stringify({ error: 'A valid recipient email is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      if (isCcNotification) {
        const { data: documentSigners, error: documentSignersError } = await authClient
          .from('document_signers')
          .select('signer_email')
          .eq('document_id', documentId)
          .order('created_at')
        if (documentSignersError) throw documentSignersError
        verifiedSigneeEmails = (documentSigners || [])
          .map((signer) => signer.signer_email)
          .filter(isEmail)

        const { data: viewer } = await authClient
          .from('document_viewers')
          .select('id')
          .eq('document_id', documentId)
          .eq('viewer_email', recipient.toLowerCase())
          .eq('viewing_token', viewerToken)
          .maybeSingle()
        if (!viewer) {
          return new Response(JSON.stringify({ error: 'Viewer authorization failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          })
        }
        verifiedRecipient = recipient.trim()
        const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://sign.somadhan.com'
        resolvedViewLink = `${publicSiteUrl.replace(/\/$/, '')}/view/${viewerToken}`
      } else {
        const { data: invitedSigner } = await authClient
          .from('document_signers')
          .select('id, status')
          .eq('document_id', documentId)
          .eq('signer_email', recipient.toLowerCase())
          .eq('signing_token', signingToken)
          .maybeSingle()
        if (!invitedSigner) {
          return new Response(JSON.stringify({ error: 'Signer authorization failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          })
        }
        if (isReminder && invitedSigner.status === 'signed') {
          return new Response(JSON.stringify({ error: 'This signer has already completed the document' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          })
        }
        verifiedRecipient = recipient.trim()
        const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://sign.somadhan.com'
        resolvedSigningLink = `${publicSiteUrl.replace(/\/$/, '')}/sign/${signingToken}`
      }
    }

    const safeDocumentTitle = escapeHtml(verifiedDocumentTitle)
    const safeSenderName = escapeHtml(verifiedSenderName || 'Someone')
    const safeMessage = escapeHtml(message)
    const safeSigningLink = safeHttpUrl(resolvedSigningLink)
    const safeViewLink = safeHttpUrl(resolvedViewLink || resolvedSigningLink)
    const safeDownloadUrl = safeHttpUrl(resolvedDownloadUrl)
    const subjectTitle = cleanSubjectText(verifiedDocumentTitle || 'Document')
    const subjectSender = cleanSubjectText(verifiedSenderName || 'Someone')

    // --- Completion email ---
    const downloadButton = safeDownloadUrl !== '#' ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${safeDownloadUrl}"
           style="background: #075056; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
          ⬇ DOWNLOAD SIGNED DOCUMENT
        </a>
      </div>` : ''

    const completionHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${headerLogo(`
          <div style="margin-top: 16px;">
            <span style="background: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">✓ Document Completed</span>
          </div>
        `)}
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${safeDocumentTitle}</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 8px;">
            All parties have signed this document. The document is now complete.
          </p>
          ${downloadButton}
          ${verifiedPdfBase64 ? '<p style="color: #6b7280; font-size: 13px; line-height: 1.6;">The signed document is also attached to this email.</p>' : ''}
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            This is an automated notification from Somadhan Sign. The signed document is securely stored and can be accessed from your dashboard.
          </p>
        </div>
        ${footer}
      </div>`

    // --- CC Notification email (view-only) ---

    let signeeListHtml = ''
    if (verifiedSigneeEmails.length > 0) {
      const pills = verifiedSigneeEmails.map((email) => `<span style="background: #f3f4f6; padding: 3px 10px; border-radius: 12px; font-size: 12px; color: #374151; display: inline-block; margin: 2px 4px 2px 0;">${escapeHtml(email)}</span>`).join('')
      signeeListHtml = `
        <div style="margin: 12px 0 20px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px; font-weight: 600;">Signees</p>
          <div>${pills}</div>
        </div>`
    }

    const ccNotificationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${headerLogo(`
          <p style="color: rgba(255,255,255,0.85); margin: 16px 0 0; font-size: 14px;">
            <strong>${safeSenderName}</strong> initiated signing on a document
          </p>
        `)}
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${safeViewLink}"
               style="background: #075056; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
              VIEW DOCUMENT
            </a>
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${safeDocumentTitle}</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 8px;">
            <strong>${safeSenderName}</strong> has initiated signing on this document between the following parties:
          </p>
          ${signeeListHtml}
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 8px;">
            You have been added as a viewer (CC) on this document. You can view the document and track its signing progress.
          </p>
          ${safeMessage ? `
            <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Message</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
          ` : ''}
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            You are receiving this email because you were added as a viewer (CC) on this document. This is a view-only link, so you cannot sign the document.
          </p>
        </div>
        ${footer}
      </div>`

    // --- Invitation email ---
    const invitationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${headerLogo(`
          <p style="color: rgba(255,255,255,0.85); margin: 16px 0 0; font-size: 14px;">
            <strong>${safeSenderName}</strong> sent you a document to review and sign
          </p>
        `)}
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${safeSigningLink}"
               style="background: #075056; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
              REVIEW AND SIGN
            </a>
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${safeDocumentTitle}</p>
          ${safeMessage ? `
            <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Message</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
          ` : ''}
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            Disclaimer: This email contains a unique signature link intended solely for the recipient. Please do not forward or share this email. Somadhan Sign is not liable for signatures executed by anyone other than the intended recipient.
          </p>
        </div>
        ${footer}
      </div>`

    const reminderHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${headerLogo(`
          <p style="color: rgba(255,255,255,0.85); margin: 16px 0 0; font-size: 14px;">
            Friendly reminder from <strong>${safeSenderName}</strong>
          </p>
        `)}
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 24px;">
            Your signature is still needed to keep this document moving.
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${safeSigningLink}"
               style="background: #075056; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
              REVIEW AND SIGN
            </a>
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${safeDocumentTitle}</p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            This secure signature link is unique to you. Please do not forward or share it.
          </p>
        </div>
        ${footer}
      </div>`

    const emailHtml = isCcNotification
      ? ccNotificationHtml
      : isCompletion
        ? completionHtml
        : isReminder
          ? reminderHtml
          : invitationHtml

    // Completion recipients come only from the authoritative document record.
    const toRecipients = isCompletion
      ? verifiedCompletionRecipients
      : verifiedRecipient ? [verifiedRecipient] : []
    if (toRecipients.length === 0) {
      return new Response(JSON.stringify({ error: 'A valid recipient email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const emailPayload: {
      from: string
      to: string[]
      subject: string
      html: string
      cc?: string[]
      attachments?: Array<{ filename: string; content: string }>
    } = {
      from: 'Somadhan Sign <noreply@somadhan.com>',
      to: toRecipients,
      subject: isCcNotification
        ? `📄 "${subjectTitle}" | Shared with you for viewing`
        : isCompletion
          ? `✓ "${subjectTitle}" | All parties have signed`
          : isReminder
            ? `Reminder: ${subjectSender} is waiting for your signature on "${subjectTitle}"`
          : `${subjectSender} has requested your signature on "${subjectTitle}"`,
      html: emailHtml,
    }

    // Add PDF attachment for completion emails
    if (isCompletion && verifiedPdfBase64) {
      const safeTitle = subjectTitle.replace(/[^a-zA-Z0-9_\- ]/g, '_') || 'document'
      emailPayload.attachments = [
        {
          filename: `${safeTitle}_signed.pdf`,
          content: verifiedPdfBase64,
        },
      ]
    }

    const completionRecipients = isCompletion
      ? toRecipients
      : []

    if (isCompletion && completionServiceClient && verifiedDocumentId) {
      const { data: priorCompletionNotices } = await completionServiceClient
        .from('audit_trail')
        .select('metadata')
        .eq('document_id', verifiedDocumentId)
        .eq('action', 'Completion Emails Sent')

      const alreadySent = (priorCompletionNotices || []).some((entry) => {
        try {
          const metadata = JSON.parse(entry.metadata || '{}')
          return metadata.source === 'send-signing-email'
        } catch {
          return false
        }
      })
      if (alreadySent) {
        return new Response(JSON.stringify({ success: true, alreadySent: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Completion finalization must remain durable even when email delivery is
    // temporarily unavailable. Check provider configuration only after the
    // final PDF has been validated and stored.
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const providerIds: string[] = []
    const recipientsToSend = isCompletion ? completionRecipients : [null]
    for (const completionRecipient of recipientsToSend) {
      const payload = completionRecipient
        ? { ...emailPayload, to: [completionRecipient], cc: undefined }
        : emailPayload
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      }
      if (isCompletion && completionRecipient && verifiedDocumentId) {
        headers['Idempotency-Key'] = await emailIdempotencyKey('completion', verifiedDocumentId, completionRecipient)
      } else if (verifiedRecipient && verifiedDocumentId) {
        // Resend retains idempotency keys for 24 hours. Invitations retain their
        // existing document-level key, while reminders use a 15-minute window so
        // an intentional later reminder remains possible.
        const scope = isReminder
          ? `reminder-${Math.floor(Date.now() / (15 * 60 * 1000))}`
          : isCcNotification ? 'viewer' : 'invitation'
        headers['Idempotency-Key'] = await emailIdempotencyKey(
          scope,
          verifiedDocumentId,
          verifiedRecipient,
        )
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Resend API rejected an email request with status:', res.status)
        return new Response(
          JSON.stringify({ error: 'The email provider rejected the message' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 502,
          },
        )
      }
      if (data?.id) providerIds.push(data.id)
    }

    if (isCompletion && completionServiceClient && verifiedDocumentId) {
      const { error: auditError } = await completionServiceClient.from('audit_trail').insert({
        document_id: verifiedDocumentId,
        action: 'Completion Emails Sent',
        user_email: 'system@somadhan.com',
        user_name: 'Somadhan Sign',
        metadata: JSON.stringify({
          source: 'send-signing-email',
          recipientCount: completionRecipients.length,
          providerIds,
        }),
      })
      if (auditError) console.error('Completion email audit error:', auditError)
    }

    console.log('Email accepted by provider:', providerIds.length || 'single')

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Email function error:', error instanceof Error ? error.message : 'Unknown error')
    return new Response(
      JSON.stringify({ error: 'The email request could not be processed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
