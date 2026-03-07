# Supabase Email Configuration Guide

## Password Reset Email Setup

### 1. Configure Email Templates in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select **Reset Password** template

### 2. Customize the Reset Password Email

Replace the default template with:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your SomadhanSign account.</p>

<p>Click the button below to create a new password:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 24 hours.</p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>

<p>Thanks,<br>The SomadhanSign Team</p>
```

### 3. Configure Site URL

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:5173` (for development)
3. For production, update to your actual domain: `https://yourdomain.com`

### 4. Add Redirect URLs

In **Authentication** → **URL Configuration** → **Redirect URLs**, add:

- Development: `http://localhost:5173/login`
- Production: `https://yourdomain.com/login`

### 5. Enable Email Confirmations

1. Go to **Authentication** → **Providers** → **Email**
2. Ensure **Enable Email Confirmations** is checked
3. Set **Confirm email** to enabled

### 6. SMTP Settings (Optional - for production)

For production, configure custom SMTP:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Enable Custom SMTP**
4. Configure your SMTP provider (e.g., SendGrid, AWS SES, etc.)

Example for SendGrid:
- **Sender email**: `noreply@yourdomain.com`
- **Sender name**: `SomadhanSign`
- **Host**: `smtp.sendgrid.net`
- **Port**: `587`
- **Username**: `apikey`
- **Password**: Your SendGrid API key

### 7. Test Password Reset Flow

1. Go to your app's login page
2. Click "Forgot password?"
3. Enter your email
4. Check your inbox for the reset email
5. Click the link and you'll be redirected to `/login`
6. The app will detect the reset token and allow you to set a new password

### 8. Handle Password Reset in Frontend

The current implementation in `authStore.ts` uses:

```typescript
resetPassword: async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}
```

When the user clicks the reset link in their email, they'll be redirected to `/login` with a token in the URL. Supabase automatically handles the token verification.

### 9. Update Password After Reset

To allow users to actually update their password after clicking the reset link, you'll need to add a password update form. The user will be automatically logged in after clicking the reset link, and you can then show them a form to set a new password using:

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

## Troubleshooting

### Emails Not Sending

1. Check Supabase logs: **Logs** → **Auth Logs**
2. Verify email template is saved correctly
3. Check spam folder
4. For production, ensure SMTP is configured

### Reset Link Not Working

1. Verify redirect URLs are configured correctly
2. Check that Site URL matches your app's URL
3. Ensure the link hasn't expired (24 hours)

### Rate Limiting

Supabase has rate limits on password reset emails:
- Maximum 4 requests per hour per email address
- If exceeded, wait an hour before trying again
