# 🚀 RocketSign — Document Signing Platform

A modern multi-party document signing platform built with React, TypeScript, and Supabase. Upload PDFs, place signature fields, invite signers, and get documents signed.

## Features

- **Multi-provider Auth** — Google, Facebook, Email/Password, Email Magic Link, Phone OTP
- **PDF Upload & Viewing** — Upload PDFs, render them with react-pdf, navigate pages
- **Drag & Drop Signature Fields** — Click on PDF to place fields, drag to reposition
- **Multi-Party Signing** — Assign fields to different signers by email, each signer sees their fields
- **Signature Creation** — Draw, type, or upload your signature
- **Sign All or One-by-One** — Signers can apply signature to all fields at once or navigate field-by-field
- **Real-time Status Tracking** — Track draft, pending, completed status
- **Row Level Security** — Supabase RLS ensures users only see their own data

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **PDF:** react-pdf, pdf-lib
- **UI:** Lucide Icons, custom components
- **State:** Zustand
- **Routing:** React Router v7

## Getting Started

### 1. Clone and Install

```bash
cd rocket_sign
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Enable auth providers in **Authentication > Providers**:
   - Email (enable "Confirm Email" and "Enable Email OTP")
   - Google OAuth (add client ID & secret)
   - Facebook OAuth (add app ID & secret)
   - Phone (enable SMS OTP, configure Twilio)

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project URL and anon key (found in **Settings > API**):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar, Layout, ProtectedRoute
│   ├── ui/              # Button, Input, Modal, Badge
│   ├── PdfViewer.tsx    # PDF rendering with react-pdf
│   └── SignaturePad.tsx # Draw/type/upload signature
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Utility functions
├── pages/
│   ├── LandingPage.tsx        # Marketing landing page
│   ├── LoginPage.tsx          # Auth page (all providers)
│   ├── DashboardPage.tsx      # Document list & management
│   ├── DocumentEditorPage.tsx # Author: place signature fields
│   └── SigningPage.tsx        # Signer: view & sign documents
├── stores/
│   ├── authStore.ts     # Auth state (Zustand)
│   └── documentStore.ts # Document & fields state (Zustand)
├── types/
│   └── database.ts      # TypeScript types for Supabase
├── App.tsx              # Router setup
├── main.tsx             # Entry point
└── index.css            # TailwindCSS v4 config
```

## User Workflows

### Document Author
1. Sign up / Sign in
2. Click "New Document" → Upload PDF
3. Click on PDF to place signature fields
4. Add signers (by email) and assign fields
5. Click "Send for Signing"

### Document Signer
1. Receives link → Sign up / Sign in
2. Views document with highlighted fields
3. Creates signature (draw / type / upload)
4. Chooses "Sign All Fields" or "Sign One by One"
5. Navigates between fields with Next/Previous buttons
6. Submits when complete
