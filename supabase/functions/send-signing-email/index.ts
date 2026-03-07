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
          <h1 style="color: white; margin: 0; font-size: 28px;">Document Signature Request</h1>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hello,</p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            <strong>${senderName}</strong> has sent you a document to sign:
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #0e6e6e; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
              ${documentTitle}
            </p>
          </div>
          
          ${message ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #78350f; white-space: pre-wrap;">${message}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${signingLink}" 
               style="background: linear-gradient(135deg, #0e6e6e 0%, #117a7a 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Review and Sign Document →
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Please review and sign the attached document at your earliest convenience. If you have any questions or need clarification, feel free to contact. Thank you.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
            This email was sent by <strong>SomadhanSign</strong>, a secure electronic signature platform. 
            If you believe you received this in error, please ignore it or contact the sender directly.
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
