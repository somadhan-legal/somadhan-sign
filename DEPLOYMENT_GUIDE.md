# RocketSign Deployment Guide

## Complete Setup Instructions

### 1. Resend Email Integration

#### Step 1: Get Resend API Key
1. Sign up at [https://resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Copy the API key (starts with `re_`)

#### Step 2: Deploy Supabase Edge Function
```bash
# Navigate to your project
cd /Users/OS/Documents/Personal/rocket_sign

# Deploy the email function
supabase functions deploy send-signing-email --no-verify-jwt

# Set the Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

#### Step 3: Update Email Domain (Production Only)
In `supabase/functions/send-signing-email/index.ts`, line 75:
```typescript
from: 'RocketSign <noreply@yourdomain.com>', // Update with your verified domain
```

#### Step 4: Verify Domain in Resend (Production)
1. In Resend dashboard → **Domains** → **Add Domain**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the provided DNS records to your domain
4. Wait for verification

### 2. Supabase Email Templates

#### Password Reset Email
1. Go to Supabase Dashboard → **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Use the template from `SUPABASE_EMAIL_SETUP.md`

#### Configure URLs
1. **Authentication** → **URL Configuration**
2. **Site URL**: 
   - Dev: `http://localhost:5173`
   - Prod: `https://yourdomain.com`
3. **Redirect URLs**: Add both dev and prod login URLs

### 3. Environment Variables

Ensure your `.env` file has:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Testing the Setup

#### Test Email Sending
1. Create a document in the app
2. Add signature fields
3. Add a signer
4. Click "Send for Signing"
5. Check the signer's email inbox

#### Test Password Reset
1. Go to login page
2. Click "Forgot password?"
3. Enter email
4. Check inbox for reset link
5. Click link and verify redirect to login

### 5. Features Implemented

✅ **Field Management**
- Fields with placements (signed) cannot be deleted
- Warning shown when attempting to delete signed fields

✅ **Audit Trail (Signing Actions Only)**
- Document Created
- Document Sent for Signing
- Document Viewed (by signer)
- Signature Applied
- Initials Added
- Date Filled
- Checkbox Checked
- Text Entered
- All Fields Signed
- Document Completed
- Reminder Sent
- IP address captured for all actions

✅ **Email Integration**
- Beautiful HTML email templates
- Signing links sent to all signers
- Send Reminder to unsigned signers from dashboard menu
- CC email support (preview-only link)
- Custom message support
- Sender name included

✅ **Forgot Password**
- Forgot password link on login page
- Email sent with reset link
- Supabase handles token verification
- Redirects to login after reset

### 6. Known Limitations

- Resend free tier: 100 emails/day, 3,000 emails/month
- Supabase password reset: 4 requests/hour per email
- Edge Function cold starts: ~1-2 seconds

### 7. Production Checklist

- [ ] Deploy Supabase Edge Function
- [ ] Set Resend API key in Supabase secrets
- [ ] Verify domain in Resend
- [ ] Update email `from` address in edge function
- [ ] Configure Supabase email templates
- [ ] Set production Site URL in Supabase
- [ ] Add production redirect URLs
- [ ] Test email sending
- [ ] Test password reset
- [ ] Monitor Supabase logs for errors

### 8. Monitoring

**Supabase Logs**
- Dashboard → **Logs** → **Auth Logs** (password resets)
- Dashboard → **Edge Functions** → **send-signing-email** (email sending)

**Resend Dashboard**
- View sent emails
- Check delivery status
- Monitor usage limits

### 9. Troubleshooting

**Emails not sending:**
1. Check Supabase Edge Function logs
2. Verify Resend API key is set correctly
3. Check Resend dashboard for errors
4. Verify domain is verified (production)

**Password reset not working:**
1. Check Supabase Auth logs
2. Verify email template is configured
3. Check redirect URLs are correct
4. Ensure Site URL matches your app

**Audit trail not logging:**
1. Check browser console for errors
2. Verify user is logged in
3. Check Supabase database permissions
