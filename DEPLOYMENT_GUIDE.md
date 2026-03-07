# SomadhanSign Deployment Guide

## Complete Production Deployment to Vercel + Custom Domain

This guide covers deploying SomadhanSign to Vercel, connecting your custom domain (sign.somadhan.com) via Namecheap, setting up Resend for emails, and configuring Supabase.

---

## 🚀 Part 1: Deploy to Vercel

### Step 1: Prepare Your Project
```bash
# Ensure your code is committed to Git
cd /Users/OS/Documents/Personal/somadhan_sign
git add .
git commit -m "Production ready"
git push origin main
```

**Repository URL:** `https://github.com/somadhan-legal/somadhan-sign.git`

### Step 2: Deploy to Vercel

1. **Go to Vercel**
   - Visit [https://vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Create New Project**
   - Click **"Add New Project"** or **"Import Project"**
   - You'll see a list of your GitHub repositories

3. **Import Repository**
   - Find and select **`somadhan-legal/somadhan-sign`**
   - Click **"Import"**

4. **Configure Project Settings**
   
   **Vercel Team:** Select your team or personal account
   
   **Project Name:** `somadhan-sign` (or any name you prefer)
   
   **Framework Preset:** Select **Vite** (should auto-detect)
   
   **Root Directory:** `./` (leave as default)

5. **Build and Output Settings** (Expand this section)
   - **Build Command:** `npm run build` (should be auto-filled)
   - **Output Directory:** `dist` (should be auto-filled)
   - **Install Command:** `npm install` (should be auto-filled)

6. **Environment Variables** (Expand this section)
   
   Click **"Add"** and enter these variables:
   
   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |
   
   ⚠️ **Important:** Get these values from your Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy **Project URL** and **anon/public** key

7. **Accept Terms and Deploy**
   - **Scroll down to the bottom** of the page
   - Check the box to accept Vercel's terms
   - Click **"Deploy"** button (it will now be enabled)

8. **Wait for Deployment**
   - Deployment typically takes 2-3 minutes
   - You'll see build logs in real-time
   - Once complete, you'll get a URL like: `https://somadhan-sign.vercel.app`

9. **Verify Deployment**
   - Click **"Visit"** to open your deployed app
   - Test login and basic functionality

---

## 🌐 Part 2: Connect Custom Domain (Namecheap)

### Step 1: Add Domain in Vercel
1. In Vercel dashboard → Your project → **Settings** → **Domains**
2. Add domain: `sign.somadhan.com`
3. Vercel will show DNS records you need to add

### Step 2: Configure DNS in Namecheap
1. Log in to [Namecheap](https://www.namecheap.com)
2. Go to **Domain List** → Click **Manage** next to `somadhan.com`
3. Go to **Advanced DNS** tab
4. Add these records:

**For subdomain (sign.somadhan.com):**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | sign | cname.vercel-dns.com. | Automatic |

**Alternative (if CNAME doesn't work):**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | sign | 76.76.21.21 | Automatic |

5. Click **Save All Changes**
6. Wait 5-30 minutes for DNS propagation
7. Back in Vercel, click **"Refresh"** to verify domain

### Step 3: Enable HTTPS
- Vercel automatically provisions SSL certificate
- Wait a few minutes, then visit `https://sign.somadhan.com`
- ✅ Your site is now live!

---

## 📧 Part 3: Setup Resend for Email Sending

### Step 1: Create Resend Account & Get API Key
1. Sign up at [https://resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Name it: `SomadhanSign Production`
4. Copy the API key (starts with `re_`)

### Step 2: Verify Your Domain in Resend
1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter: `somadhan.com` (your root domain)
3. Resend will show DNS records to add

### Step 3: Add DNS Records in Namecheap (Follow resend guidline)
Go back to Namecheap → **Advanced DNS** and add these records:

**SPF Record:**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | @ | v=spf1 include:_spf.resend.com ~all | Automatic |

**DKIM Records (Resend will provide 3):**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | resend._domainkey | [value from Resend] | Automatic |
| CNAME | resend2._domainkey | [value from Resend] | Automatic |
| CNAME | resend3._domainkey | [value from Resend] | Automatic |

**DMARC Record:**
| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:dmarc@somadhan.com | Automatic |

4. Save changes and wait 10-30 minutes
5. In Resend, click **"Verify Domain"**
6. ✅ Domain verified! You can now send from `noreply@somadhan.com`

### Step 4: Deploy Supabase Edge Function
```bash
# Navigate to your project
cd /Users/OS/Documents/Personal/somadhan_sign

# Login to Supabase CLI (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Deploy the email function
npx supabase functions deploy send-signing-email --no-verify-jwt

# Set the Resend API key as a secret
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 5: Update Email Sender Domain
Edit `supabase/functions/send-signing-email/index.ts` line ~75:
```typescript
from: 'SomadhanSign <noreply@somadhan.com>', // ✅ Use your verified domain
```

Then redeploy:
```bash
npx supabase functions deploy send-signing-email --no-verify-jwt
```

---

## 🔐 Part 4: Configure Supabase for Production

### Step 1: Update Site URL
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://sign.somadhan.com`
3. **Redirect URLs**: Add these:
   ```
   https://sign.somadhan.com/**
   https://sign.somadhan.com/login
   https://sign.somadhan.com/reset-password
   http://localhost:5173/** (keep for local dev)
   ```

### Step 2: Configure Email Templates
1. **Authentication** → **Email Templates** → **Reset Password**
2. Update the reset link to use your domain:
   ```html
   <a href="https://sign.somadhan.com/reset-password#access_token={{ .Token }}">
     Reset Password
   </a>
   ```

### Step 3: Enable RLS Policies (Already Done)
Your migrations already have Row Level Security enabled. Verify:
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
All tables should show `rowsecurity = true`.

### Step 4: Run Cleanup Migration
In Supabase SQL Editor, run:
```sql
-- Clean up orphaned audit entries
DELETE FROM public.audit_trail
WHERE document_id NOT IN (SELECT id FROM public.documents);

DELETE FROM public.signature_placements
WHERE document_id NOT IN (SELECT id FROM public.documents);

DELETE FROM public.signature_fields
WHERE document_id NOT IN (SELECT id FROM public.documents);

DELETE FROM public.document_signers
WHERE document_id NOT IN (SELECT id FROM public.documents);
```

---

## ✅ Part 5: Final Verification Checklist

### Test Your Deployment
1. **Visit**: `https://sign.somadhan.com`
2. **Sign Up**: Create a new account
3. **Check Email**: Verify you receive the confirmation email
4. **Upload Document**: Test PDF upload
5. **Send for Signing**: Test email sending to a signer
6. **Sign Document**: Test the signing flow
7. **Download**: Verify signed PDF downloads with audit trail

### Monitor & Debug
- **Vercel Logs**: Vercel Dashboard → Your Project → **Deployments** → Click deployment → **Functions**
- **Supabase Logs**: Supabase Dashboard → **Logs** → **Edge Functions**
- **Email Logs**: Resend Dashboard → **Logs**

---

## 🔧 Troubleshooting

### Domain Not Working
- Wait 30 minutes for DNS propagation
- Check DNS: `dig sign.somadhan.com` or use [https://dnschecker.org](https://dnschecker.org)
- Ensure CNAME points to `cname.vercel-dns.com.` (note the trailing dot)

### Emails Not Sending
- Verify domain in Resend dashboard shows ✅ green checkmark
- Check Supabase Edge Function logs for errors
- Ensure `RESEND_API_KEY` secret is set correctly
- Test with: `npx supabase functions serve send-signing-email`

### Authentication Redirect Issues
- Ensure Site URL in Supabase matches your domain exactly
- Add all redirect URLs (including wildcards)
- Clear browser cache and cookies

### Build Fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

---

## � Part 6: Post-Deployment Configuration

**⚠️ CRITICAL: After deploying to Vercel and setting up your custom domain, you MUST update redirect URLs in:**

1. **Google OAuth Console** - For Google Sign-In to work
2. **Supabase Authentication** - For email confirmations and password resets
3. **Resend** (optional) - For custom sender domain

**📖 Complete step-by-step instructions:** See `POST_DEPLOYMENT_CONFIG.md`

### Quick Summary:

**Google Console:**
- Add `https://sign.somadhan.com` to Authorized JavaScript Origins
- Add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` to Redirect URIs

**Supabase:**
- Change Site URL to `https://sign.somadhan.com`
- Add production URLs to Redirect URLs list
- Update email templates to use production domain

**Without these updates:**
- ❌ Google OAuth will fail with "redirect_uri_mismatch" error
- ❌ Email confirmation links will redirect to localhost
- ❌ Password reset links won't work

---

## �📝 Additional Post-Deployment Tasks

1. **Update README**: Add your production URL
2. **Set up monitoring**: Consider adding Sentry or LogRocket
3. **Backup database**: Enable Supabase daily backups
4. **Custom email templates**: Customize Supabase auth emails with your branding
5. **Analytics**: Add Google Analytics or Plausible

---

## 🎉 You're Done!

Your SomadhanSign app is now live at:
- **Production**: https://sign.somadhan.com
- **Emails from**: noreply@somadhan.com
- **Database**: Supabase (with RLS enabled)
- **Storage**: Supabase Storage (documents bucket)

**Next Step:** Follow `POST_DEPLOYMENT_CONFIG.md` to configure OAuth and authentication redirects!

---

## 1. Resend Email Integration (Legacy - See Part 3 Above)

#### Step 1: Get Resend API Key
1. Sign up at [https://resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Copy the API key (starts with `re_`)

#### Step 2: Deploy Supabase Edge Function
```bash
# Navigate to your project
cd /Users/OS/Documents/Personal/somadhan_sign

# Deploy the email function
supabase functions deploy send-signing-email --no-verify-jwt

# Set the Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

#### Step 3: Update Email Domain (Production Only)
In `supabase/functions/send-signing-email/index.ts`, line 75:
```typescript
from: 'SomadhanSign <noreply@yourdomain.com>', // Update with your verified domain
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
