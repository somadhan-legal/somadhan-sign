import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logoUrl = 'https://cfurkapaksdjsqeydhew.supabase.co/storage/v1/object/public/documents/branding/sign-somadhan-mail.png'

// Header with logo image
const headerLogo = (afterLogo: string) => `
  <div style="background-color: #0e6e6e; background: linear-gradient(135deg, #0e6e6e 0%, #117a7a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <div>
      <img src="${logoUrl}" alt="SomadhanSign" style="height: 40px; width: auto; display: inline-block;" />
    </div>
    ${afterLogo}
  </div>`

// Footer with logo image
const footer = `
  <div style="text-align: center; padding: 20px;">
    <img src="${logoUrl}" alt="SomadhanSign" style="height: 28px; width: auto; display: inline-block; margin-bottom: 8px;" />
    <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0;">
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

    const { to, documentTitle, signingLink, senderName, message, ccEmails, type, downloadUrl, pdfBase64 } = await req.json()

    const isCompletion = type === 'completion'

    // --- Completion email ---
    const downloadButton = downloadUrl ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${downloadUrl}" 
           style="background: #0e6e6e; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
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
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${documentTitle}</p>
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

    // --- Invitation email ---
    const invitationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${headerLogo(`
          <p style="color: rgba(255,255,255,0.85); margin: 16px 0 0; font-size: 14px;">
            <strong>${senderName || ''}</strong> sent you a document to review and sign
          </p>
        `)}
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${signingLink}" 
               style="background: #0e6e6e; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
              REVIEW AND SIGN
            </a>
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">${documentTitle}</p>
          ${message ? `
            <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Message</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          ` : ''}
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">Best,<br>The <strong>Somadhan Sign</strong> Team</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            Disclaimer: This email contains a unique signature link intended solely for the recipient. Please do not forward or share this email. Somadhan Sign is not liable for signatures executed by anyone other than the intended recipient.
          </p>
        </div>
        ${footer}
      </div>`

    const emailHtml = isCompletion ? completionHtml : invitationHtml

    // Build list of all recipients (TO + CC as separate emails)
    const allRecipients = [to]
    if (ccEmails && ccEmails.length > 0) {
      for (const cc of ccEmails) {
        if (cc && !allRecipients.includes(cc)) allRecipients.push(cc)
      }
    }

    const results = []

    for (const recipient of allRecipients) {
      const emailPayload: any = {
        from: 'Somadhan Sign <noreply@somadhan.com>',
        to: [recipient],
        subject: isCompletion
          ? `✓ "${documentTitle}" — All parties have signed`
          : `${senderName} has requested your signature on "${documentTitle}"`,
        html: emailHtml,
      }

      // Add PDF attachment for completion emails
      if (isCompletion && pdfBase64) {
        const safeTitle = (documentTitle || 'document').replace(/[^a-zA-Z0-9_\- ]/g, '_')
        emailPayload.attachments = [
          {
            filename: `${safeTitle}_signed.pdf`,
            content: pdfBase64,
          },
        ]
      }

      console.log('Sending email to:', recipient)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      })

      const data = await res.json()
      console.log('Resend API response for', recipient, ':', JSON.stringify(data))

      if (!res.ok) {
        console.error('Resend API Error for', recipient, ':', data)
      }

      results.push({ recipient, success: res.ok, data })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
