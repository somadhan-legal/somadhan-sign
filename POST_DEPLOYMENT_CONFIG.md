# Post-Deployment Configuration Guide

## ✅ After Deploying to Vercel (sign.somadhan.com)

After successfully deploying your application to Vercel and configuring your custom domain, you need to update redirect URLs and API keys in **three critical places**:

1. **Google OAuth Console** - For Google Sign-In ✅ (Already configured based on your screenshots)
2. **Supabase Dashboard** - For authentication redirects
3. **Resend API Key** - Update in Supabase secrets

---

## 🔐 Part 1: Google OAuth Console (⚠️ NEEDS FIX)

### 🚨 URGENT FIX REQUIRED:

Your Google OAuth is causing 404 errors because you have **plain domain URLs** in the Redirect URIs section. These should ONLY be in the **JavaScript Origins** section.

**Fix Now:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **Rocket Sign**
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. In **Authorized redirect URIs** section:
   - **REMOVE:** `https://sign.somadhan.com`
   - **REMOVE:** `https://somadhan-sign-ten.vercel.app`
   - **KEEP ONLY:** `https://cfurkapaksdjsqeydhew.supabase.co/auth/v1/callback`
6. Click **Save**
7. Wait 5 minutes for changes to propagate

### Current Configuration (from your screenshots):

### ✅ Authorized JavaScript Origins:
```
https://sign.somadhan.com
https://somadhan-sign-ten.vercel.app
```

### ⚠️ Authorized Redirect URIs (NEEDS FIX):
**Currently you have (WRONG):**
```
https://cfurkapaksdjsqeydhew.supabase.co/auth/v1/callback ✅
https://sign.somadhan.com ❌ (Remove this)
https://somadhan-sign-ten.vercel.app ❌ (Remove this)
```

**Should ONLY be:**
```
https://cfurkapaksdjsqeydhew.supabase.co/auth/v1/callback
```

**Action Required:** Remove the plain domain URLs from redirect URIs in Google Console!

### ✅ Authorized Domains (Branding):
```
cfurkapaksdjsqeydhew.supabase.co
somadhan.com
```

**Status:** ⚠️ Google OAuth needs fixing - Remove plain domain URLs from Redirect URIs!

---

## 🔑 Part 2: Update Supabase Authentication Settings

### Critical Settings to Update:

1. **Go to Supabase Dashboard**
   - Visit: [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project: `cfurkapaksdjsqeydhew`

2. **Navigate to Authentication → URL Configuration**

3. **Update Site URL**
   
   Set to:
   ```
   https://sign.somadhan.com
   ```
   
   ⚠️ **This is critical** - This is where users are redirected after email confirmation

4. **Update Redirect URLs**
   
   Add these URLs (one per line):
   ```
   https://sign.somadhan.com/**
   https://sign.somadhan.com/login
   https://sign.somadhan.com/reset-password
   https://sign.somadhan.com/auth/callback
   https://somadhan-sign-ten.vercel.app/**
   https://somadhan-sign-ten.vercel.app/login
   https://somadhan-sign-ten.vercel.app/reset-password
   https://somadhan-sign-ten.vercel.app/auth/callback
   ```
   
   Keep for local development:
   ```
   http://localhost:5173/**
   http://localhost:5173/login
   http://localhost:5173/reset-password
   ```

5. **Update Email Templates**
   
   Go to **Authentication** → **Email Templates**
   
   **For "Confirm signup" template:**
   - Find: `{{ .ConfirmationURL }}`
   - Make sure the Site URL is set to `https://sign.somadhan.com`
   
   **For "Reset Password" template:**
   - Find: `{{ .ConfirmationURL }}`
   - Make sure it redirects to `https://sign.somadhan.com/reset-password`
   
   **For "Magic Link" template:**
   - Update to: `https://sign.somadhan.com/login`

6. **Save All Changes**

---

## 📧 Part 3: Update Resend API Key in Supabase

### Your New Resend API Key:
```
re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy
```

### Option A: Update via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: [https://supabase.com/dashboard/project/cfurkapaksdjsqeydhew](https://supabase.com/dashboard/project/cfurkapaksdjsqeydhew)

2. **Navigate to Edge Functions**
   - Click **Edge Functions** in the left sidebar
   - Click on **send-signing-email** function

3. **Update Secrets**
   - Click **Settings** or **Secrets** tab
   - Find `RESEND_API_KEY`
   - Update value to: `re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy`
   - Click **Save**

### Option B: Update via Supabase CLI

If you prefer using CLI:

```bash
# Make sure you're in the project directory
cd /Users/OS/Documents/Personal/somadhan_sign

# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref cfurkapaksdjsqeydhew

# Set the new Resend API key
supabase secrets set RESEND_API_KEY=re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy
```

---

## 🚀 Part 4: Redeploy Edge Function with Updated Email

Since you've updated the sender email in the Edge Function to `noreply@somadhan.com`, you need to redeploy it.

### Steps:

1. **Verify the change in your code**
   
   File: `supabase/functions/send-signing-email/index.ts`
   
   Line 81 should now be:
   ```typescript
   from: 'SomadhanSign <noreply@somadhan.com>',
   ```
   ✅ Already updated!

2. **Redeploy the Edge Function**
   
   ```bash
   cd /Users/OS/Documents/Personal/somadhan_sign
   
   # Deploy the function
   supabase functions deploy send-signing-email --no-verify-jwt
   ```

3. **Verify Deployment**
   - Check Supabase Dashboard → Edge Functions
   - You should see the updated deployment timestamp

---

## 📧 Part 5: Verify Resend Domain

Make sure your domain is verified in Resend for sending emails from `noreply@somadhan.com`.

### Steps:

1. **Go to Resend Dashboard**
   - Visit: [https://resend.com/domains](https://resend.com/domains)

2. **Check Domain Status**
   - Look for `somadhan.com`
   - Status should show **✅ Verified** (green checkmark)

3. **If Not Verified:**
   
   a. Click **Add Domain** (if not added)
   
   b. Enter: `somadhan.com`
   
   c. Resend will show DNS records to add:
   
   **SPF Record:**
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | TXT | @ | `v=spf1 include:_spf.resend.com ~all` | Automatic |
   
   **DKIM Records:**
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | TXT | resend._domainkey | (Resend will provide) | Automatic |
   
   **DMARC Record:**
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:admin@somadhan.com` | Automatic |

4. **Add DNS Records in Namecheap**
   - Log in to [Namecheap](https://www.namecheap.com)
   - Go to **Domain List** → **Manage** → **Advanced DNS**
   - Add all the records shown by Resend
   - Wait 30 minutes for DNS propagation

5. **Verify in Resend**
   - Go back to Resend dashboard
   - Click **Verify** next to your domain
   - Should show green checkmark ✅

---

## ✅ Part 6: Complete Verification Checklist

### 1. Google OAuth Test:
- [ ] Go to `https://sign.somadhan.com`
- [ ] Click **"Sign In"**
- [ ] Click **"Continue with Google"**
- [ ] Verify you can sign in without errors
- [ ] Check you're redirected back to the dashboard at `https://sign.somadhan.com/dashboard`

### 2. Email/Password Signup Test:
- [ ] Go to `https://sign.somadhan.com`
- [ ] Click **"Get Started Free"** or **"Sign Up"**
- [ ] Create a new account with email/password
- [ ] Check your email for confirmation link
- [ ] Click the confirmation link
- [ ] Verify you're redirected to `https://sign.somadhan.com` (not localhost)
- [ ] Verify you can sign in

### 3. Password Reset Test:
- [ ] Go to `https://sign.somadhan.com/login`
- [ ] Click **"Forgot password?"**
- [ ] Enter your email
- [ ] Check your email for reset link
- [ ] Click the reset link
- [ ] Verify you're redirected to `https://sign.somadhan.com/reset-password` (not localhost)
- [ ] Reset your password successfully
- [ ] Sign in with new password

### 4. Document Signing Email Test:
- [ ] Sign in to your account at `https://sign.somadhan.com`
- [ ] Upload a test PDF document
- [ ] Add signature fields
- [ ] Add a signer with a valid email address
- [ ] Click **"Send for Signing"**
- [ ] Check the signer receives the email from `noreply@somadhan.com`
- [ ] Verify the signing link works and goes to `https://sign.somadhan.com/sign/...`
- [ ] Complete the signing process
- [ ] Verify signed PDF is generated

---

## 🐛 Troubleshooting

### Issue: "Redirect URI Mismatch" Error with Google OAuth

**Symptoms:**
- Error message: "Error 400: redirect_uri_mismatch"
- Can't sign in with Google

**Solution:**
1. ✅ You've already added the correct redirect URIs in Google Console
2. Make sure you're using the correct Vercel URL: `https://somadhan-sign-ten.vercel.app`
3. Wait 10 minutes for Google's changes to propagate
4. Clear browser cache and cookies
5. Try again in incognito/private mode

**Your Current Configuration (from screenshots):**
- ✅ `https://cfurkapaksdjsqeydhew.supabase.co/auth/v1/callback`
- ✅ `https://sign.somadhan.com`
- ✅ `https://somadhan-sign-ten.vercel.app`

### Issue: Email Confirmation Link Goes to localhost

**Symptoms:**
- Click confirmation link in email
- Redirected to `http://localhost:5173` instead of production

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** from `http://localhost:5173` to `https://sign.somadhan.com`
3. Save changes
4. Test with a new signup (old emails will still have old URL)

### Issue: Password Reset Link Goes to Wrong Domain

**Solution:**
1. Go to Supabase → Authentication → Email Templates
2. Edit **"Reset Password"** template
3. The template uses `{{ .ConfirmationURL }}` which is based on Site URL
4. Make sure Site URL is set to `https://sign.somadhan.com`
5. Save and test

### Issue: Emails Not Sending from noreply@somadhan.com

**Symptoms:**
- Emails not received
- Error in Supabase Edge Function logs

**Solution:**
1. Verify domain in Resend dashboard shows ✅ green checkmark
2. Check DNS records are correctly configured (SPF, DKIM, DMARC)
3. Wait 30 minutes for DNS propagation
4. Check Resend logs: [https://resend.com/logs](https://resend.com/logs)
5. Verify `RESEND_API_KEY` is set correctly: `re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy`
6. Check Supabase Edge Function logs for errors

### Issue: Edge Function Returns Error

**Symptoms:**
- "Failed to send email" error in app
- 500 error in Edge Function logs

**Solution:**
1. Check Supabase → Edge Functions → send-signing-email → Logs
2. Verify `RESEND_API_KEY` secret is set
3. Verify sender email `noreply@somadhan.com` is from verified domain
4. Redeploy the function:
   ```bash
   supabase functions deploy send-signing-email --no-verify-jwt
   ```

### Issue: CORS Errors in Browser Console

**Symptoms:**
- Console shows CORS policy errors
- API requests failing

**Solution:**
1. Go to Supabase → Settings → API → CORS Settings
2. Add allowed origins:
   - `https://sign.somadhan.com`
   - `https://somadhan-sign-ten.vercel.app`
3. Save and wait a few minutes
4. Clear browser cache

---

## 📝 Quick Reference: Your Configuration

### Your Project Details:
- **Supabase Project:** `cfurkapaksdjsqeydhew`
- **Supabase URL:** `https://cfurkapaksdjsqeydhew.supabase.co`
- **Production Domain:** `https://sign.somadhan.com`
- **Vercel URL:** `https://somadhan-sign-ten.vercel.app`
- **Resend API Key:** `re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy`
- **Email Sender:** `noreply@somadhan.com`

### Google OAuth Console (✅ Already Configured):
**Authorized JavaScript Origins:**
- `https://sign.somadhan.com`
- `https://somadhan-sign-ten.vercel.app`

**Authorized Redirect URIs:**
- `https://cfurkapaksdjsqeydhew.supabase.co/auth/v1/callback` (ONLY THIS ONE!)
  
**❌ DO NOT ADD:**
- ~~`https://sign.somadhan.com`~~ (This goes in JavaScript Origins, not Redirect URIs)
- ~~`https://somadhan-sign-ten.vercel.app`~~ (This goes in JavaScript Origins, not Redirect URIs)

### Supabase Dashboard (TO DO):
**Site URL:**
```
https://sign.somadhan.com
```

**Redirect URLs:**
```
https://sign.somadhan.com/**
https://sign.somadhan.com/login
https://sign.somadhan.com/reset-password
https://sign.somadhan.com/auth/callback
https://somadhan-sign-ten.vercel.app/**
https://somadhan-sign-ten.vercel.app/login
https://somadhan-sign-ten.vercel.app/reset-password
https://somadhan-sign-ten.vercel.app/auth/callback
```

**Secrets:**
```
RESEND_API_KEY=re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy
```

### Resend Dashboard (TO DO):
**Verified Domain:** `somadhan.com` (must show ✅)
**From Address:** `noreply@somadhan.com`

---

## 🎯 Next Steps (In Order):

1. **Update Supabase Site URL**
   - Go to Supabase → Authentication → URL Configuration
   - Set Site URL to `https://sign.somadhan.com`

2. **Add Redirect URLs in Supabase**
   - Add all production URLs listed above

3. **Update Resend API Key**
   - Go to Supabase Dashboard → Edge Functions → send-signing-email → Secrets
   - Set `RESEND_API_KEY` to `re_F89ZLkGX_7GVnRgKchRDgZaAgxkiAimLy`

4. **Verify Resend Domain**
   - Go to Resend dashboard
   - Make sure `somadhan.com` shows ✅ verified
   - If not, add DNS records in Namecheap

5. **Redeploy Edge Function**
   ```bash
   supabase functions deploy send-signing-email --no-verify-jwt
   ```

6. **Test Everything**
   - Follow the verification checklist above
   - Test Google OAuth
   - Test email signup
   - Test password reset
   - Test document signing emails

---

## 🎉 Completion

Once you've completed all steps:

1. ✅ Google OAuth configured (DONE)
2. ⏳ Supabase authentication URLs updated
3. ⏳ Resend API key updated
4. ⏳ Domain verified in Resend
5. ⏳ Edge Function redeployed
6. ⏳ All tests passing

**Your SomadhanSign app will be fully configured for production! 🚀**

For deployment instructions, see `DEPLOYMENT_GUIDE.md`
For general setup, see `README.md`
