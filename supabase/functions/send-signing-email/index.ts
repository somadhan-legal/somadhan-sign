import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "supabase"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const logoUrl = 'https://cfurkapaksdjsqeydhew.supabase.co/storage/v1/object/public/documents/branding/sign-somadhan-mail.png'

// Header with logo image
const headerLogo = (afterLogo: string) => `
  <div style="background-color: #075056; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <div>
      <img src="${logoUrl}" alt="SomadhanSign" style="height: 40px; width: auto; display: inline-block;" />
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

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const { to, documentTitle, documentId, signingLink, signingToken, viewerToken, senderName, message, ccEmails, type, downloadUrl: requestedDownloadUrl, pdfBase64, viewLink, signeeEmails } = await req.json()
    const isCompletion = type === 'completion'
    const isCcNotification = type === 'cc-notification'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment is not configured')

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    let verifiedDocumentTitle = documentTitle
    let allowedCompletionRecipients: Set<string> | null = null
    let verifiedDocumentId: string | null = null
    let resolvedDownloadUrl = requestedDownloadUrl
    let resolvedSigningLink = signingLink
    let resolvedViewLink = viewLink

    if (isCompletion) {
      if (typeof signingToken !== 'string' || signingToken.length < 32) {
        return new Response(JSON.stringify({ error: 'A valid signing token is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const { data: signer, error: signerError } = await authClient.rpc('get_signer_by_token', { p_token: signingToken })
      if (signerError || !signer?.document_id) {
        return new Response(JSON.stringify({ error: 'Signing authorization failed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
      verifiedDocumentId = signer.document_id

      let { data: completionData, error: completionError } = await authClient.rpc(
        'get_document_for_completion_by_token',
        { p_token: signingToken },
      )
      if (isMissingRpc(completionError)) {
        const legacyResult = await authClient.rpc('get_document_for_completion', {
          p_document_id: signer.document_id,
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
      allowedCompletionRecipients = new Set(allowed.map((email) => email.toLowerCase()))

      if (typeof pdfBase64 === 'string' && pdfBase64.length > 0) {
        if (pdfBase64.length > 28_000_000) {
          return new Response(JSON.stringify({ error: 'The completed PDF is too large' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 413,
          })
        }
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (!serviceRoleKey) throw new Error('Secure document storage is not configured')
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
        const { data: existingDocument } = await serviceClient
          .from('documents')
          .select('final_pdf_url')
          .eq('id', verifiedDocumentId)
          .single()
        if (existingDocument?.final_pdf_url) {
          resolvedDownloadUrl = existingDocument.final_pdf_url
        } else {
          const pdfBytes = Uint8Array.from(atob(pdfBase64), (character) => character.charCodeAt(0))
          const fileName = `signed/${verifiedDocumentId}_${Date.now()}.pdf`
          const { error: uploadError } = await serviceClient.storage
            .from('documents')
            .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: false })
          if (uploadError) throw uploadError
          resolvedDownloadUrl = serviceClient.storage.from('documents').getPublicUrl(fileName).data.publicUrl
          const { error: saveError } = await serviceClient
            .from('documents')
            .update({ final_pdf_url: resolvedDownloadUrl, updated_at: new Date().toISOString() })
            .eq('id', verifiedDocumentId)
          if (saveError) throw saveError
        }
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
        .select('id, title')
        .eq('id', documentId)
        .eq('created_by', authData.user.id)
        .maybeSingle()
      if (!ownedDocument) {
        return new Response(JSON.stringify({ error: 'Document access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
      verifiedDocumentTitle = ownedDocument.title

      const recipient = Array.isArray(to) ? to[0] : to
      if (!isEmail(recipient)) {
        return new Response(JSON.stringify({ error: 'A valid recipient email is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      if (isCcNotification) {
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
        const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://sign.somadhan.com'
        resolvedViewLink = `${publicSiteUrl.replace(/\/$/, '')}/view/${viewerToken}`
      } else {
        const { data: invitedSigner } = await authClient
          .from('document_signers')
          .select('id')
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
        const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://sign.somadhan.com'
        resolvedSigningLink = `${publicSiteUrl.replace(/\/$/, '')}/sign/${signingToken}`
      }
    }

    const safeDocumentTitle = escapeHtml(verifiedDocumentTitle)
    const safeSenderName = escapeHtml(senderName || 'Someone')
    const safeMessage = escapeHtml(message)
    const safeSigningLink = safeHttpUrl(resolvedSigningLink)
    const safeViewLink = safeHttpUrl(resolvedViewLink || resolvedSigningLink)
    const safeDownloadUrl = safeHttpUrl(resolvedDownloadUrl)
    const subjectTitle = cleanSubjectText(verifiedDocumentTitle || 'Document')
    const subjectSender = cleanSubjectText(senderName || 'Someone')

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
          ${pdfBase64 ? '<p style="color: #6b7280; font-size: 13px; line-height: 1.6;">The signed document is also attached to this email.</p>' : ''}
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            This is an automated notification from Somadhan Sign. The signed document is securely stored and can be accessed from your dashboard.
          </p>
        </div>
        ${footer}
      </div>`

    // --- CC Notification email (view-only) ---
    console.log('CC notification signeeEmails:', JSON.stringify(signeeEmails))

    let signeeListHtml = ''
    if (signeeEmails && Array.isArray(signeeEmails) && signeeEmails.length > 0) {
      const pills = signeeEmails.map((email: unknown) => `<span style="background: #f3f4f6; padding: 3px 10px; border-radius: 12px; font-size: 12px; color: #374151; display: inline-block; margin: 2px 4px 2px 0;">${escapeHtml(email)}</span>`).join('')
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

    const emailHtml = isCcNotification ? ccNotificationHtml : isCompletion ? completionHtml : invitationHtml

    // Build email payload - 'to' can be a string or array (array for completion emails)
    const toRecipients = (Array.isArray(to) ? to : [to])
      .filter(isEmail)
      .filter((email) => !allowedCompletionRecipients || allowedCompletionRecipients.has(email.toLowerCase()))
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
          : `${subjectSender} has requested your signature on "${subjectTitle}"`,
      html: emailHtml,
    }

    // Add CC recipients to email header (they won't get separate emails)
    if (ccEmails && Array.isArray(ccEmails) && ccEmails.length > 0) {
      emailPayload.cc = ccEmails
        .filter(isEmail)
        .filter((email: string) => !allowedCompletionRecipients || allowedCompletionRecipients.has(email.toLowerCase()))
    }

    // Add PDF attachment for completion emails
    if (isCompletion && pdfBase64) {
      const safeTitle = subjectTitle.replace(/[^a-zA-Z0-9_\- ]/g, '_') || 'document'
      emailPayload.attachments = [
        {
          filename: `${safeTitle}_signed.pdf`,
          content: pdfBase64,
        },
      ]
    }

    console.log('Sending email to:', to, ccEmails ? `(CC: ${ccEmails.join(', ')})` : '')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    const data = await res.json()
    console.log('Resend API response:', JSON.stringify(data))

    if (!res.ok) {
      console.error('Resend API Error:', data)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
