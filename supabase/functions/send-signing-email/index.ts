import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request has a valid authorization header (anon key or user JWT)
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

    const { to, documentTitle, signingLink, senderName, message, ccEmails } = await req.json()

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0e6e6e 0%, #117a7a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 4px; vertical-align: middle;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="background: white; width: 28px; height: 4px; border-radius: 1px;"></td></tr>
                  <tr><td style="height: 3px;"></td></tr>
                  <tr><td style="background: white; width: 14px; height: 4px; border-radius: 1px;"></td></tr>
                  <tr><td style="height: 3px;"></td></tr>
                  <tr><td style="background: white; width: 14px; height: 4px; border-radius: 1px; margin-left: 14px;"></td></tr>
                  <tr><td style="height: 3px;"></td></tr>
                  <tr><td style="background: white; width: 28px; height: 4px; border-radius: 1px;"></td></tr>
                </table>
              </td>
              <td style="vertical-align: middle;">
                <span style="color: white; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Somadhan</span><span style="color: #e87461; font-size: 26px; font-weight: 700; font-style: italic; font-family: Georgia, serif;">Sign</span>
              </td>
            </tr>
          </table>
          <p style="color: rgba(255,255,255,0.85); margin: 16px 0 0; font-size: 14px;">
            <strong>${senderName}</strong> sent you a document to review and sign
          </p>
        </div>
        
        <div style="background: white; padding: 36px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${signingLink}" 
               style="background: #0e6e6e; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
              REVIEW AND SIGN
            </a>
          </div>
          
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Document</p>
          <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #111827;">
            ${documentTitle}
          </p>
          
          ${message ? `
            <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; font-weight: 600;">Message</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">
            Best,<br>
            The <strong>SomadhanSign</strong> Team
          </p>
          
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #9ca3af; font-size: 11px; line-height: 1.5;">
            Disclaimer: This email contains a unique signature link intended solely for the recipient. Please do not forward or share this email. SomadhanSign is not liable for signatures executed by anyone other than the intended recipient.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px;">
          <span style="color: #054F54; font-size: 16px; font-weight: 700;">Somadhan</span><span style="color: #e87461; font-size: 16px; font-weight: 700; font-style: italic; font-family: Georgia, serif;">Sign</span>
          <p style="color: #9ca3af; font-size: 11px; margin: 6px 0 0;">
            Somadhan Legal &middot; Dhaka, Bangladesh
          </p>
        </div>
      </div>
    `

    const emailPayload: any = {
      from: 'SomadhanSign <noreply@somadhan.com>',
      to: [to],
      subject: `${senderName} has requested your signature on "${documentTitle}"`,
      html: emailHtml,
    }

    // Add CC emails if provided
    if (ccEmails && ccEmails.length > 0) {
      emailPayload.cc = ccEmails
    }

    console.log('Sending email with payload:', JSON.stringify(emailPayload))

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
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ success: true, data }),
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
