# SomadhanSign - Digital Document Signing Platform

![SomadhanSign](https://img.shields.io/badge/Status-Production%20Beta-blue)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![License](https://img.shields.io/badge/License-Proprietary-red)

A modern document signing platform built with React, TypeScript, and Supabase. SomadhanSign enables users to upload PDF documents, define signature fields, invite multiple signers, and manage the signing workflow with progress tracking and audit trails.

**Live Demo:** [https://sign.somadhan.com](https://sign.somadhan.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Authentication & Security](#-authentication--security)
- [Email Integration](#-email-integration)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality
- **📄 PDF Document Upload** - Upload supported PDF documents up to 5 MB
- **✍️ Multi-Type Signature Fields** - Support for signatures, initials, dates, text fields, and checkboxes
- **👥 Multi-Party Signing** - Invite unlimited signers with individual field assignments
- **🎨 Drag & Drop Field Placement** - Intuitive visual editor for placing signature fields
- **📧 Email Notifications** - Automated email invitations and reminders via Resend
- **🔍 Progress Tracking** - Monitor document status and signer progress from the dashboard
- **📊 Audit Trail** - Complete audit log with timestamps and IP tracking
- **📥 Signed PDF Generation** - Automatic PDF generation with embedded signatures and audit certificate

### User Experience
- **🌓 Dark/Light Mode** - Fully themed UI with automatic system preference detection
- **🌐 Bilingual Support** - English and Bengali (বাংলা) language support
- **📱 Responsive Design** - Mobile-first design that works on all devices
- **🎯 Guided Signing Flow** - Step-by-step navigation for signers
- **✅ Field Validation** - Real-time validation and error handling
- **🔐 Secure Token-Based Access** - Unique signing links for each signer

### Security & Privacy
- **🔒 Row Level Security (RLS)** - Supabase RLS policies on all tables
- **🔑 OAuth Integration** - Google OAuth for seamless authentication
- **🛡️ Email Verification** - Supports Supabase email-confirmation policies when enabled for the project
- **🔐 Password Reset** - Secure password recovery flow
- **📜 Audit Logging** - Every action logged with user details and timestamps
- **🗑️ Referential Cleanup** - Related records are removed through database foreign-key cascades

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0** - UI framework with latest features
- **TypeScript 5.9.3** - Type-safe development
- **Vite 7.3.1** - Lightning-fast build tool
- **React Router 7.13.1** - Client-side routing
- **Zustand 5.0.11** - Lightweight state management
- **TailwindCSS 4.2.1** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### PDF Processing
- **pdf-lib 1.17.1** - PDF manipulation and generation
- **pdfjs-dist 5.4.296** - PDF rendering and viewing
- **react-pdf 10.4.1** - React PDF viewer component
- **signature_pad 5.1.3** - Canvas-based signature drawing

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service (BaaS)
  - PostgreSQL database
  - Authentication (Email + OAuth)
  - Storage for PDF files
  - Edge Functions for serverless logic
  - Row Level Security (RLS)
- **Resend** - Transactional email service
- **Vercel** - Hosting and deployment
- **Namecheap** - Domain and DNS management

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite Plugin React** - Fast refresh and JSX support

---

## 🏗️ Architecture

### Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Authentication                      │
│              (Email/Password or Google OAuth)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard Page                          │
│  - View all documents (draft/pending/completed)              │
│  - Search and filter documents                               │
│  - Upload new PDF documents                                  │
│  - Download signed PDFs with audit trail                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Document Editor Page                        │
│  1. Add signers (name + email)                               │
│  2. Select field type (signature/initials/date/text/checkbox)│
│  3. Click on PDF to place fields                             │
│  4. Assign fields to specific signers                        │
│  5. Save draft or send for signing                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Email Notification                         │
│  - Supabase Edge Function triggers                           │
│  - Resend API sends email to each signer                     │
│  - Unique signing token per signer                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Signing Page (Public)                     │
│  - Signer accesses via unique token link                     │
│  - Create signature (draw/type/upload)                       │
│  - Navigate through assigned fields                          │
│  - Fill all required fields                                  │
│  - Submit signatures                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  PDF Generation & Storage                    │
│  - Merge signatures onto original PDF                        │
│  - Generate audit trail certificate                          │
│  - Store final PDF in Supabase Storage                       │
│  - Update document status to 'completed'                     │
└─────────────────────────────────────────────────────────────┘
```

### State Management

The application uses **Zustand** for global state management with the following stores:

- **`authStore`** - User authentication state, login/logout, session management
- **`documentStore`** - Document CRUD operations, signers, fields, placements
- **`themeStore`** - Dark/light mode preference
- **`languageStore`** - English/Bengali language switching

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase Account** - [Sign up here](https://supabase.com)
- **Resend Account** - [Sign up here](https://resend.com)
- **Git** - Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/somadhan-legal/somadhan-sign.git
   cd somadhan-sign
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   # Set to true in the same coordinated rollout that makes document storage private.
   VITE_SECURE_DOCUMENT_ACCESS_ENABLED=false
   ```

4. **Set up Supabase**
   
   a. Create a new Supabase project at [supabase.com](https://supabase.com)
   
   b. Run all migrations in order:
   ```bash
   # Login to Supabase
   npx supabase login
   
   # Link to your project
   npx supabase link --project-ref your-project-ref
   
   # Run migrations
   npx supabase db push
   ```
   
   c. Set up Storage:
   - The migrations create and configure the `documents` bucket.
   - The current security migration makes this bucket private. Do not change it back to public.
   - On an existing live deployment, deploy `get-document-access` first, then apply the secure migration and release the frontend with `VITE_SECURE_DOCUMENT_ACCESS_ENABLED=true` in one coordinated maintenance window. A private bucket cannot support the legacy public-URL client path.
   - For local or self-hosted Edge Functions whose `SUPABASE_URL` uses an internal hostname, set `APP_SUPABASE_PUBLIC_URL` to the browser-reachable API origin. For the default local CLI stack, use `http://127.0.0.1:54321`. This keeps signed storage paths private while returning URLs the browser can actually open.
   
   d. Configure Authentication:
   - Go to **Authentication** → **Providers**
   - Enable **Email** provider
   - Enable **Google** OAuth (optional)
   - Set **Site URL**: `http://localhost:5173` (dev) or `https://sign.somadhan.com` (prod)
   - Add **Redirect URLs**: `http://localhost:5173/**` and production URLs

5. **Set up Resend for emails**
   
   a. Create account at [resend.com](https://resend.com)
   
   b. Get API key from dashboard
   
   c. Deploy Supabase Edge Function:
   ```bash
   # Deploy email function
   supabase functions deploy send-signing-email --no-verify-jwt
   
   # Set Resend API key as secret
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```
   
   d. Verify your domain in Resend (see `RESEND_SETUP.md`)

6. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
somadhan_sign/
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Images, logos, icons
│   │   ├── favicon.svg
│   │   ├── sign_Somadhan_dark.svg
│   │   └── sign_Somadhan_light.svg
│   ├── components/              # React components
│   │   ├── layout/
│   │   │   ├── Footer.tsx       # App footer
│   │   │   ├── Navbar.tsx       # Navigation bar
│   │   │   └── ProtectedRoute.tsx  # Auth guard
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── AuditTrailModal.tsx  # Audit log viewer
│   │   ├── PdfViewer.tsx        # PDF rendering component
│   │   └── SignaturePad.tsx     # Signature drawing canvas
│   ├── lib/                     # Utility libraries
│   │   ├── auditPdf.ts          # Audit trail PDF generation
│   │   ├── signedPdf.ts         # Signed PDF generation
│   │   ├── supabase.ts          # Supabase client setup
│   │   └── utils.ts             # Helper functions
│   ├── pages/                   # Page components
│   │   ├── DashboardPage.tsx    # Main dashboard
│   │   ├── DocumentEditorPage.tsx  # Field placement editor
│   │   ├── DocumentPreviewPage.tsx # Read-only document view
│   │   ├── InviteSigningPage.tsx   # Signer management
│   │   ├── LandingPage.tsx      # Public homepage
│   │   ├── LoginPage.tsx        # Auth page (login/signup)
│   │   ├── ResetPasswordPage.tsx   # Password reset
│   │   └── SigningPage.tsx      # Public signing interface
│   ├── stores/                  # Zustand state stores
│   │   ├── authStore.ts         # Authentication state
│   │   ├── documentStore.ts     # Document operations
│   │   ├── languageStore.ts     # i18n translations
│   │   └── themeStore.ts        # Theme preference
│   ├── types/                   # TypeScript types
│   │   └── database.ts          # Database type definitions
│   ├── App.tsx                  # Root component
│   ├── index.css                # Global styles
│   └── main.tsx                 # App entry point
├── supabase/
│   ├── functions/
│   │   └── send-signing-email/  # Email sending edge function
│   │       └── index.ts
│   ├── migrations/              # Active baseline, history markers, and timestamped migrations
│   ├── legacy-migrations/       # Historical numbered SQL; never applied after the baseline
│   └── tests/                   # Migration security regression tests
├── .env                         # Environment variables (gitignored)
├── .gitignore
├── DEPLOYMENT_GUIDE.md          # Complete deployment instructions
├── RESEND_SETUP.md              # Email setup guide
├── SUPABASE_EMAIL_SETUP.md      # Supabase email configuration
├── eslint.config.js
├── index.html
├── package.json
├── README.md                    # This file
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🗄️ Database Schema

### Tables Overview

The application uses **8 main tables** with comprehensive Row Level Security (RLS) policies:

#### 1. **documents**
Stores document metadata and status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Document name |
| `original_pdf_url` | TEXT | URL to uploaded PDF in storage |
| `final_pdf_url` | TEXT | URL to signed PDF (after completion) |
| `created_by` | UUID | Foreign key to `auth.users` |
| `status` | TEXT | `draft`, `pending`, `completed`, `cancelled` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**RLS Policies:**
- Users can only view/edit their own documents
- Public read access for documents in signing flow (via token)

---

#### 2. **signature_fields**
Defines signature field positions and properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `document_id` | UUID | Foreign key to `documents` |
| `page_number` | INTEGER | PDF page number (0-indexed) |
| `x` | DOUBLE PRECISION | X position (percentage) |
| `y` | DOUBLE PRECISION | Y position (percentage) |
| `width` | DOUBLE PRECISION | Field width (percentage) |
| `height` | DOUBLE PRECISION | Field height (percentage) |
| `assigned_to_email` | TEXT | Signer's email |
| `field_type` | TEXT | `signature`, `initials`, `date`, `text`, `checkbox` |
| `field_order` | INTEGER | Tab order for navigation |
| `label` | TEXT | Optional field label |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

#### 3. **document_signers**
Tracks signers invited to sign a document.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `document_id` | UUID | Foreign key to `documents` |
| `signer_email` | TEXT | Signer's email address |
| `signer_name` | TEXT | Signer's full name |
| `status` | TEXT | `pending`, `viewed`, `signed` |
| `signed_at` | TIMESTAMPTZ | Signature completion time |
| `user_id` | UUID | Foreign key to `auth.users` (if registered) |
| `signing_token` | TEXT | Unique token for signing link |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- Unique index on `signing_token` for fast lookups

---

#### 4. **signatures**
Stores user's saved signature images.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `auth.users` |
| `signature_data` | TEXT | Base64 encoded signature image |
| `type` | TEXT | `drawn`, `uploaded`, `typed` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

#### 5. **signature_placements**
Records actual signatures placed on documents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `document_id` | UUID | Foreign key to `documents` |
| `field_id` | UUID | Foreign key to `signature_fields` |
| `signer_id` | UUID | Foreign key to `auth.users` |
| `signer_email` | TEXT | Signer's email |
| `signature_id` | TEXT | Reference to signature data |
| `signed_at` | TIMESTAMPTZ | Signature timestamp |

---

#### 6. **audit_trail**
Complete audit log of all document actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `document_id` | UUID | Foreign key to `documents` |
| `action` | TEXT | Action description (e.g., "Document Created") |
| `user_email` | TEXT | User who performed action |
| `user_name` | TEXT | User's full name |
| `ip_address` | TEXT | IP address (optional) |
| `metadata` | TEXT | Additional event details |
| `created_at` | TIMESTAMPTZ | Action timestamp |

**Retention helper:**
- The consolidated baseline defines a cleanup function for documents older than 12 months. The current security migration limits it to `service_role`. Scheduling and retention policy approval are deployment responsibilities.

---

### Database Migrations

Active migrations are located in `supabase/migrations/`. A fresh CLI deployment applies the consolidated baseline, no-op history markers, and then timestamped migrations. The markers retain version compatibility with existing environments. Historical numbered SQL is kept separately in `supabase/legacy-migrations/` for reference and must not be applied after the baseline. See `supabase/migrations/README.md` for current rollout notes.

---

## 🔐 Authentication & Security

### Authentication Methods

1. **Email/Password**
   - Email verification follows the Supabase project configuration
   - Password minimum 8 characters in the application UI
   - Secure password reset flow

2. **Google OAuth**
   - One-click sign-in
   - Automatic account creation
   - No password required

### Security Features

- **Row Level Security (RLS)** - Every table has RLS policies
- **JWT Tokens** - Supabase handles token generation and validation
- **Unique Signing Tokens** - Opaque random tokens for each signer
- **HTTPS Only** - All traffic encrypted in production
- **SQL Injection Prevention** - Parameterized queries via Supabase client
- **XSS Protection** - React escapes rendered text and email content is explicitly sanitized

### RLS Policy Examples

```sql
-- Users can only view their own documents
CREATE POLICY "Users can view own documents"
ON public.documents FOR SELECT
USING (auth.uid() = created_by);

-- Public can view documents via valid signing token
CREATE POLICY "Public can view documents for signing"
ON public.documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.document_signers
    WHERE document_id = documents.id
    AND signing_token = current_setting('request.headers')::json->>'signing-token'
  )
);
```

---

## 📧 Email Integration

### Resend Setup

SomadhanSign uses **Resend** for transactional emails with the following features:

- **Signing Invitations** - Sent when document is sent for signing
- **Reminder Emails** - Manual reminders to pending signers
- **Completion Notifications** - Sent when all signers complete and final-document delivery succeeds

### Email Templates

Emails are sent via Supabase Edge Function (`send-signing-email`) with:
- Personalized signer name
- Document title
- Unique signing link
- Sender information
- Professional HTML template

### Configuration

See `RESEND_SETUP.md` for complete setup instructions including:
- Domain verification
- SPF/DKIM/DMARC records
- API key configuration
- Edge function deployment

---

## 🚀 Deployment

### Production Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect GitHub repository
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variables

3. **Configure Custom Domain**
   - Add domain in Vercel settings
   - Update DNS records in Namecheap
   - Wait for SSL certificate provisioning

4. **Update Supabase Settings**
   - Set Site URL to production domain
   - Add redirect URLs
   - Update CORS settings

**Complete deployment guide:** See `DEPLOYMENT_GUIDE.md`

---

## 🔧 Environment Variables

### Required Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Google OAuth (if using)
# Configure in Supabase dashboard
```

### Supabase Secrets (Edge Functions)

```bash
# Set via Supabase CLI
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

---

## 📚 API Documentation

### Supabase Client Usage

The app uses `@supabase/supabase-js` client for all backend operations:

```typescript
import { supabase } from '@/lib/supabase'

// Example: Fetch documents
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .eq('created_by', userId)
  .order('created_at', { ascending: false })
```

### Edge Functions

#### `send-signing-email`

**Endpoint:** `https://your-project.supabase.co/functions/v1/send-signing-email`

**Method:** POST

**Body:**
```json
{
  "signerEmail": "signer@example.com",
  "signerName": "John Doe",
  "documentTitle": "Contract Agreement",
  "signingLink": "https://sign.somadhan.com/sign/abc123",
  "senderName": "Jane Smith"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_abc123"
}
```

---

## 🎨 Customization

### Theming

The app uses TailwindCSS with CSS variables for theming. Edit `src/index.css`:

```css
:root {
  --primary: 174 100% 29%;      /* Teal color */
  --background: 0 0% 100%;      /* White */
  --foreground: 222.2 84% 4.9%; /* Dark text */
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%; /* Dark background */
  --foreground: 210 40% 98%;    /* Light text */
  /* ... more variables */
}
```

### Language Support

Add new languages in `src/stores/languageStore.ts`:

```typescript
const translations: Record<string, Record<Language, string>> = {
  'key.name': { 
    en: 'English text', 
    bn: 'বাংলা টেক্সট',
    // Add new language here
  },
}
```

---

## 🤝 Contributing

This is a proprietary project for Somadhan Legal. For internal contributions:

1. Create a feature branch
2. Make your changes
3. Write/update tests if applicable
4. Submit a pull request
5. Wait for code review

---

## 📄 License

**Proprietary** - © 2024-2026 Somadhan Legal. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "Failed to fetch documents"
- **Solution:** Check Supabase URL and anon key in `.env`
- Verify RLS policies are correctly set

**Issue:** "Email not sending"
- **Solution:** Check Resend API key in Supabase secrets
- Verify domain is verified in Resend dashboard
- Check Edge Function logs

**Issue:** "PDF not rendering"
- **Solution:** Ensure PDF URL is publicly accessible
- Check browser console for CORS errors
- Verify Supabase Storage bucket is public

**Issue:** "Signature not saving"
- **Solution:** Check RLS policies on `signature_placements` table
- Verify signing token is valid
- Check browser console for errors

---

## 📞 Support

For support and inquiries:
- **Email:** support@somadhan.com
- **Organization:** Somadhan Legal
- **Repository:** https://github.com/somadhan-legal/somadhan-sign

---

## 🙏 Acknowledgments

- **Supabase** - For the amazing BaaS platform
- **Resend** - For reliable email delivery
- **Vercel** - For seamless deployment
- **React Team** - For the incredible framework
- **PDF.js Team** - For PDF rendering capabilities

---

**Built with ❤️ by the Somadhan Team**
