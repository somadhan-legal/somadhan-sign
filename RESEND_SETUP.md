# Resend Email Integration Setup Guide

## 1. Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy the API key (starts with `re_`)

## 2. Add API Key to Environment Variables

Add to your `.env` file:

```env
VITE_RESEND_API_KEY=re_your_api_key_here
```

**Important**: Since this is a frontend app, you'll need to create a backend API endpoint to send emails securely. The API key should NOT be exposed in the frontend.

## 3. Backend API Setup (Recommended)

You have two options:

### Option A: Supabase Edge Functions (Recommended)

Create a Supabase Edge Function to handle email sending:

```bash
supabase functions new send-signing-email
```

Then implement the function in `supabase/functions/send-signing-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { to, documentTitle, signingLink, senderName, message } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'SomadhanSign <noreply@yourdomain.com>',
      to: [to],
      subject: `${senderName} has requested your signature on "${documentTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Document Signature Request</h2>
          <p>Hello,</p>
          <p>${senderName} has sent you a document to sign: <strong>${documentTitle}</strong></p>
          ${message ? `<p>${message}</p>` : ''}
          <p style="margin: 30px 0;">
            <a href="${signingLink}" 
               style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review and Sign Document
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will take you to a secure signing page where you can review and sign the document.
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            This email was sent by SomadhanSign. If you believe you received this in error, please ignore it.
          </p>
        </div>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy the function:

```bash
supabase functions deploy send-signing-email --no-verify-jwt
```

Set the environment variable:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Option B: Simple Backend API (Node.js/Express)

If you prefer a separate backend, create a simple Express endpoint.

## 4. Verify Domain (For Production)

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records provided by Resend to your domain's DNS settings
4. Wait for verification (usually a few minutes)
5. Update the `from` email in your function to use your verified domain

## 5. Testing

For development, you can use Resend's test mode which doesn't require domain verification.

## 6. Update Frontend Code

The frontend will call the Supabase Edge Function to send emails. See the implementation in `src/stores/documentStore.ts`.
