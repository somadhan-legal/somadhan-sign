import { create } from 'zustand'

type Language = 'en' | 'bn'

interface LanguageState {
  lang: Language
  setLang: (lang: Language) => void
  toggle: () => void
  t: (key: string) => string
}

const translations: Record<string, Record<Language, string>> = {
  // ─── Navbar ───
  'nav.signIn': { en: 'Sign In', bn: 'সাইন ইন' },
  'nav.getStarted': { en: 'Get Started', bn: 'শুরু করুন' },
  'nav.documents': { en: 'Documents', bn: 'ডকুমেন্টস' },
  'nav.lightMode': { en: 'Light mode', bn: 'লাইট মোড' },
  'nav.darkMode': { en: 'Dark mode', bn: 'ডার্ক মোড' },

  // ─── Landing Page ───
  'landing.heroTitle1': { en: 'Sign documents with', bn: 'ডকুমেন্ট  সাইন  করুন' },
  'landing.heroTitle2': { 
    en: 'SomadhanSign', 
    bn: 'সমাধান  সাইন  দিয়ে'
  },
  'landing.heroDesc': {
    en: 'Upload documents, define signature fields, invite multiple signers, and get everything signed — all in one beautiful platform.',
    bn: 'ডকুমেন্ট আপলোড করুন, স্বাক্ষর ক্ষেত্র নির্ধারণ করুন, একাধিক স্বাক্ষরকারী আমন্ত্রণ করুন এবং সবকিছু স্বাক্ষরিত করুন — সবকিছু এক প্ল্যাটফর্মে।',
  },
  'landing.getStartedFree': { en: 'Get Started Free', bn: 'বিনামূল্যে শুরু করুন' },
  'landing.signIn': { en: 'Sign In', bn: 'সাইন ইন' },
  'landing.howItWorks': { en: 'How it works', bn: 'কিভাবে কাজ করে?' },
  'landing.howItWorksDesc': {
    en: 'Get documents signed in four simple steps',
    bn: 'চারটি সহজ ধাপে ডকুমেন্ট স্বাক্ষর করুন',
  },
  'landing.step1Title': { en: 'Upload your PDF', bn: 'আপনার PDF আপলোড করুন' },
  'landing.step1Desc': { en: 'Drag and drop or browse to upload', bn: 'টেনে আনুন বা ব্রাউজ করে আপলোড করুন' },
  'landing.step2Title': { en: 'Define signature fields', bn: 'স্বাক্ষর ক্ষেত্র নির্ধারণ করুন' },
  'landing.step2Desc': { en: 'Click on the PDF to place fields', bn: 'ক্ষেত্র রাখতে PDF-এ ক্লিক করুন' },
  'landing.step3Title': { en: 'Assign signers', bn: 'স্বাক্ষরকারী নির্ধারণ করুন' },
  'landing.step3Desc': { en: 'Add emails and assign fields to each signer', bn: 'ইমেইল যোগ করুন এবং প্রতিটি স্বাক্ষরকারীকে ক্ষেত্র নির্ধারণ করুন' },
  'landing.step4Title': { en: 'Send for signing', bn: 'স্বাক্ষরের জন্য পাঠান' },
  'landing.step4Desc': { en: 'Signers receive an email with a link', bn: 'স্বাক্ষরকারীরা লিঙ্ক সহ একটি ইমেইল পাবেন' },
  'landing.everything': { en: 'Everything you need', bn: 'আপনার যা দরকার সবকিছু' },
  'landing.everythingDesc': {
    en: 'Powerful features to handle any document signing workflow',
    bn: 'যেকোনো ডকুমেন্ট স্বাক্ষর কর্মপ্রবাহ পরিচালনার জন্য শক্তিশালী ফিচার',
  },
  'landing.feat.upload': { en: 'Upload Documents', bn: 'ডকুমেন্ট আপলোড' },
  'landing.feat.uploadDesc': {
    en: 'Upload any PDF document and prepare it for signing in seconds.',
    bn: 'যেকোনো PDF ডকুমেন্ট আপলোড করুন এবং কয়েক সেকেন্ডে স্বাক্ষরের জন্য প্রস্তুত করুন।',
  },
  'landing.feat.fields': { en: 'Place Signature Fields', bn: 'স্বাক্ষর ক্ষেত্র রাখুন' },
  'landing.feat.fieldsDesc': {
    en: 'Drag and drop signature fields anywhere on the document. Assign each field to a specific signer.',
    bn: 'ডকুমেন্টের যেকোনো জায়গায় স্বাক্ষর ক্ষেত্র টেনে আনুন। প্রতিটি ক্ষেত্র একজন নির্দিষ্ট স্বাক্ষরকারীকে নির্ধারণ করুন।',
  },
  'landing.feat.multi': { en: 'Multi-Party Signing', bn: 'মাল্টি-পার্টি স্বাক্ষর' },
  'landing.feat.multiDesc': {
    en: 'Invite multiple signers. Each signer sees only their assigned fields with guided navigation.',
    bn: 'একাধিক স্বাক্ষরকারী আমন্ত্রণ করুন। প্রতিটি স্বাক্ষরকারী শুধু তাদের নির্ধারিত ক্ষেত্র দেখবেন।',
  },
  'landing.feat.track': { en: 'Send & Track', bn: 'পাঠান ও ট্র্যাক করুন' },
  'landing.feat.trackDesc': {
    en: 'Send documents for signing and track progress in real-time from your dashboard.',
    bn: 'স্বাক্ষরের জন্য ডকুমেন্ট পাঠান এবং ড্যাশবোর্ড থেকে রিয়েল-টাইমে অগ্রগতি ট্র্যাক করুন।',
  },
  'landing.feat.secure': { en: 'Secure & Private', bn: 'সুরক্ষিত ও গোপনীয়' },
  'landing.feat.secureDesc': {
    en: 'Built on Supabase with Row Level Security. Your documents are encrypted and protected.',
    bn: 'Row Level Security সহ Supabase-এ নির্মিত। আপনার ডকুমেন্ট এনক্রিপ্টেড এবং সুরক্ষিত।',
  },
  'landing.feat.anywhere': { en: 'Sign Anywhere', bn: 'যেকোনো জায়গায় সাইন করুন' },
  'landing.feat.anywhereDesc': {
    en: 'Draw, type, or upload your signature. Sign all fields at once or one by one.',
    bn: 'আপনার স্বাক্ষর আঁকুন, টাইপ করুন বা আপলোড করুন। একসাথে বা একটি একটি করে সব ক্ষেত্রে সাইন করুন।',
  },
  'landing.ctaTitle': { en: 'Ready to get started?', bn: 'শুরু করতে প্রস্তুত?' },
  'landing.ctaDesc': {
    en: 'Join thousands of users who trust SomadhanSign for their document signing needs.',
    bn: 'হাজারো ব্যবহারকারীদের সাথে যোগ দিন যারা তাদের ডকুমেন্ট স্বাক্ষরের জন্য সমাধান সাইন-কে বিশ্বাস করেন।',
  },
  'landing.createFreeAccount': { en: 'Create Free Account', bn: 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন' },
  'landing.freeToStart': { en: 'Free to start', bn: 'বিনামূল্যে শুরু' },
  'landing.noCreditCard': { en: 'No credit need', bn: 'ক্রেডিট দরকার নেই' },
  'landing.unlimitedDocs': { en: 'Unlimited documents', bn: 'সীমাহীন ডকুমেন্ট' },
  'landing.footer': { en: 'Somadhan. All rights reserved.', bn: 'সমাধান। সর্বস্বত্ব সংরক্ষিত।' },

  // ─── Login Page ───
  'login.welcomeBack': { en: 'Welcome back', bn: 'স্বাগতম' },
  'login.signInToContinue': { en: 'Sign in to your account to continue', bn: 'চালিয়ে যেতে আপনার অ্যাকাউন্টে সাইন ইন করুন' },
  'login.continueWithGoogle': { en: 'Continue with Google', bn: 'গুগল দিয়ে চালিয়ে যান' },
  'login.orContinueWithEmail': { en: 'OR CONTINUE WITH EMAIL', bn: 'অথবা ইমেইল দিয়ে চালিয়ে যান' },
  'login.email': { en: 'Email', bn: 'ইমেইল' },
  'login.password': { en: 'Password', bn: 'পাসওয়ার্ড' },
  'login.fullName': { en: 'Full Name', bn: 'পুরো নাম' },
  'login.signIn': { en: 'Sign In', bn: 'সাইন ইন' },
  'login.signUp': { en: 'Sign Up', bn: 'সাইন আপ' },
  'login.forgotPassword': { en: 'Forgot password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  'login.noAccount': { en: "Don't have an account?", bn: 'অ্যাকাউন্ট নেই?' },
  'login.hasAccount': { en: 'Already have an account?', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  'login.signUpLink': { en: 'Sign up', bn: 'সাইন আপ করুন' },
  'login.signInLink': { en: 'Sign in', bn: 'সাইন ইন করুন' },
  'login.createAccount': { en: 'Create account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
  'login.createAccountDesc': { en: 'Enter your details to get started', bn: 'শুরু করতে আপনার তথ্য দিন' },
  'login.resetPassword': { en: 'Reset your password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  'login.resetPasswordDesc': {
    en: "Enter your email and we'll send you a password reset link",
    bn: 'আপনার ইমেইল দিন এবং আমরা পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব',
  },
  'login.sendResetLink': { en: 'Send Reset Link', bn: 'রিসেট লিঙ্ক পাঠান' },
  'login.backToSignIn': { en: 'Back to sign in', bn: 'সাইন ইন-এ ফিরে যান' },
  'login.verifyEmail': { en: 'Verify your email', bn: 'আপনার ইমেইল যাচাই করুন' },
  'login.verifyEmailDesc': { en: 'Enter the 6-digit code sent to', bn: '৬ সংখ্যার কোড দিন যা পাঠানো হয়েছে' },
  'login.verifyCode': { en: 'Verify Code', bn: 'কোড যাচাই করুন' },
  'login.resendCode': { en: 'Resend Code', bn: 'কোড পুনরায় পাঠান' },
  'login.signingIn': { en: 'Signing in...', bn: 'সাইন ইন হচ্ছে...' },
  'login.creatingAccount': { en: 'Creating account...', bn: 'অ্যাকাউন্ট তৈরি হচ্ছে...' },
  'login.brandingTitle': { en: 'Sign documents with', bn: 'ডকুমেন্ট সাইন করুন' },
  'login.brandingDesc': {
    en: 'Upload, define signature fields, invite signers, and get documents signed — all in one place.',
    bn: 'আপলোড করুন, স্বাক্ষর ক্ষেত্র নির্ধারণ করুন, স্বাক্ষরকারী আমন্ত্রণ করুন এবং ডকুমেন্ট সাইন করুন — সবকিছু এক জায়গায়।',
  },
  'login.statDocuments': { en: 'Documents', bn: 'ডকুমেন্ট' },
  'login.statUsers': { en: 'Users', bn: 'ব্যবহারকারী' },
  'login.statUptime': { en: 'Uptime', bn: 'আপটাইম' },
  'login.copyright': { en: 'Somadhan. All rights reserved.', bn: 'সমাধান। সর্বস্বত্ব সংরক্ষিত।' },
  'login.accountVerified': { en: 'Account Verified!', bn: 'অ্যাকাউন্ট যাচাই হয়েছে!' },
  'login.accountVerifiedDesc': {
    en: 'Your email has been confirmed. You can now use SomadhanSign.',
    bn: 'আপনার ইমেইল নিশ্চিত হয়েছে। আপনি এখন সমাধান সাইন ব্যবহার করতে পারেন।',
  },
  'login.letsGo': { en: "OK, Let's Go!", bn: 'চলুন শুরু করি!' },

  // ─── Password Reset ───
  'reset.setNewPassword': { en: 'Set New Password', bn: 'নতুন পাসওয়ার্ড সেট করুন' },
  'reset.enterNewPassword': { en: 'Enter your new password below', bn: 'নিচে আপনার নতুন পাসওয়ার্ড দিন' },
  'reset.newPassword': { en: 'New Password', bn: 'নতুন পাসওয়ার্ড' },
  'reset.confirmPassword': { en: 'Confirm Password', bn: 'পাসওয়ার্ড নিশ্চিত করুন' },
  'reset.updatePassword': { en: 'Update Password', bn: 'পাসওয়ার্ড আপডেট করুন' },
  'reset.passwordUpdated': { en: 'Password Updated!', bn: 'পাসওয়ার্ড আপডেট হয়েছে!' },
  'reset.passwordUpdatedDesc': {
    en: 'Your password has been successfully reset. You can now sign in with your new password.',
    bn: 'আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। এখন আপনি নতুন পাসওয়ার্ড দিয়ে সাইন ইন করতে পারেন।',
  },
  'reset.goToLogin': { en: 'Go to Login', bn: 'লগইন পেজে যান' },
  'reset.backToLogin': { en: 'Back to Login', bn: 'লগইনে ফিরে যান' },
  'reset.passwordTooShort': { en: 'Password must be at least 6 characters.', bn: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' },
  'reset.passwordsDoNotMatch': { en: 'Passwords do not match.', bn: 'পাসওয়ার্ড মিলছে না।' },
  'reset.linkExpired': {
    en: 'This password reset link has expired or is invalid. Please request a new one.',
    bn: 'এই পাসওয়ার্ড রিসেট লিঙ্কটি মেয়াদ শেষ হয়েছে বা অবৈধ। অনুগ্রহ করে নতুন একটি অনুরোধ করুন।',
  },
  'reset.errorOccurred': { en: 'An error occurred. Please try again.', bn: 'একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।' },
  'reset.failedToUpdate': { en: 'Failed to update password', bn: 'পাসওয়ার্ড আপডেট করতে ব্যর্থ' },

  // ─── Dashboard ───
  'dashboard.myDocuments': { en: 'My Documents', bn: 'আমার ডকুমেন্টস' },
  'dashboard.newDocument': { en: 'New Document', bn: 'নতুন ডকুমেন্ট' },
  'dashboard.searchDocs': { en: 'Search documents...', bn: 'ডকুমেন্ট খুঁজুন...' },
  'dashboard.noDocuments': { en: 'No documents yet', bn: 'এখনো কোনো ডকুমেন্ট নেই' },
  'dashboard.uploadFirst': {
    en: 'Upload your first PDF to get started',
    bn: 'শুরু করতে আপনার প্রথম PDF আপলোড করুন',
  },
  'dashboard.uploadPdf': { en: 'Upload PDF', bn: 'PDF আপলোড করুন' },
  'dashboard.draft': { en: 'Draft', bn: 'খসড়া' },
  'dashboard.pending': { en: 'Pending', bn: 'অপেক্ষমাণ' },
  'dashboard.completed': { en: 'Completed', bn: 'সম্পন্ন' },
  'dashboard.delete': { en: 'Delete', bn: 'মুছুন' },
  'dashboard.edit': { en: 'Edit', bn: 'সম্পাদনা' },
  'dashboard.view': { en: 'View', bn: 'দেখুন' },
  'dashboard.sendReminder': { en: 'Send Reminder', bn: 'রিমাইন্ডার পাঠান' },
  'dashboard.total': { en: 'Total', bn: 'মোট' },
  'dashboard.drafts': { en: 'Drafts', bn: 'খসড়া' },
  'dashboard.all': { en: 'All', bn: 'সব' },
  'dashboard.download': { en: 'Download', bn: 'ডাউনলোড' },
  'dashboard.auditTrail': { en: 'Audit Trail', bn: 'অডিট ট্রেইল' },

  // ─── Document Editor ───
  'editor.signers': { en: 'Signers', bn: 'স্বাক্ষরকারী' },
  'editor.addSigner': { en: 'Add Signer', bn: 'স্বাক্ষরকারী যোগ করুন' },
  'editor.fields': { en: 'Fields', bn: 'ক্ষেত্র' },
  'editor.signature': { en: 'Signature', bn: 'স্বাক্ষর' },
  'editor.initials': { en: 'Initials', bn: 'আদ্যক্ষর' },
  'editor.date': { en: 'Date', bn: 'তারিখ' },
  'editor.checkbox': { en: 'Checkbox', bn: 'চেকবক্স' },
  'editor.text': { en: 'Text', bn: 'টেক্সট' },
  'editor.saveDraft': { en: 'Save Draft', bn: 'খসড়া সংরক্ষণ' },
  'editor.saving': { en: 'Saving...', bn: 'সংরক্ষণ হচ্ছে...' },
  'editor.sendForSigning': { en: 'Send for Signing', bn: 'স্বাক্ষরের জন্য পাঠান' },
  'editor.locked': { en: 'Document sent - editing locked', bn: 'ডকুমেন্ট পাঠানো হয়েছে - সম্পাদনা লক' },
  'editor.helpTitle': { en: 'Quick Guide', bn: 'দ্রুত নির্দেশিকা' },
  'editor.help1': {
    en: '1. Add signers using the + button above',
    bn: '১. উপরের + বাটন ব্যবহার করে স্বাক্ষরকারী যোগ করুন',
  },
  'editor.help2': {
    en: '2. Select a field type below (Signature, Initials, etc.)',
    bn: '২. নিচে একটি ক্ষেত্রের ধরন নির্বাচন করুন (স্বাক্ষর, আদ্যক্ষর, ইত্যাদি)',
  },
  'editor.help3': {
    en: '3. Click on the PDF to place the field',
    bn: '৩. ক্ষেত্র রাখতে PDF-এ ক্লিক করুন',
  },
  'editor.help4': {
    en: '4. Click a placed field to assign it to a signer',
    bn: '৪. একটি রাখা ক্ষেত্রে ক্লিক করে স্বাক্ষরকারী নির্ধারণ করুন',
  },
  'editor.help5': {
    en: '5. Save draft, then Send for Signing when ready',
    bn: '৫. খসড়া সংরক্ষণ করুন, তারপর প্রস্তুত হলে স্বাক্ষরের জন্য পাঠান',
  },
  'editor.clickFieldHint': {
    en: 'Click a field on the PDF to see its details and change the assigned signer.',
    bn: 'ক্ষেত্রের বিস্তারিত দেখতে এবং নির্ধারিত স্বাক্ষরকারী পরিবর্তন করতে PDF-এ একটি ক্ষেত্রে ক্লিক করুন।',
  },
  'editor.addSignerFirst': { en: 'Please add at least one signer first.', bn: 'অনুগ্রহ করে প্রথমে কমপক্ষে একজন স্বাক্ষরকারী যোগ করুন।' },
  'editor.assignAllFields': { en: 'Please assign all fields to a signer before sending.', bn: 'পাঠানোর আগে সকল ক্ষেত্র একজন স্বাক্ষরকারীকে নির্ধারণ করুন।' },
  'editor.addSignerRequired': { en: 'Please add at least one signer.', bn: 'অনুগ্রহ করে কমপক্ষে একজন স্বাক্ষরকারী যোগ করুন।' },
  'editor.addFieldRequired': { en: 'Please add at least one field to the document.', bn: 'অনুগ্রহ করে ডকুমেন্টে কমপক্ষে একটি ক্ষেত্র যোগ করুন।' },
  'editor.signatureFieldRequired': { en: 'Please add at least one Signature field for', bn: 'অনুগ্রহ করে কমপক্ষে একটি স্বাক্ষর ক্ষেত্র যোগ করুন' },
  'editor.everySignerMustHaveSignature': { en: 'Every signer must have a signature field.', bn: 'প্রত্যেক স্বাক্ষরকারীর একটি স্বাক্ষর ক্ষেত্র থাকতে হবে।' },
  'editor.cannotDeleteSigned': { en: 'Cannot delete this field - it has already been signed by a signer.', bn: 'এই ক্ষেত্রটি মুছতে পারবেন না - এটি ইতিমধ্যে স্বাক্ষরিত হয়েছে।' },
  'editor.removeSignerConfirm': { en: 'Remove this signer and all their fields?', bn: 'এই স্বাক্ষরকারী এবং তাদের সকল ক্ষেত্র মুছবেন?' },
  'editor.failedSaveSigner': { en: 'Failed to save signer. Please try again.', bn: 'স্বাক্ষরকারী সংরক্ষণ করতে ব্যর্থ। আবার চেষ্টা করুন।' },
  'editor.invalidEmail': { en: 'Please enter a valid email address.', bn: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।' },
  'editor.close': { en: 'Close', bn: 'বন্ধ করুন' },
  'editor.firstName': { en: 'First Name', bn: 'প্রথম নাম' },
  'editor.lastName': { en: 'Last Name', bn: 'শেষ নাম' },
  'editor.email': { en: 'Email', bn: 'ইমেইল' },
  'editor.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'editor.saveChanges': { en: 'Save Changes', bn: 'পরিবর্তন সংরক্ষণ করুন' },
  'editor.editSigner': { en: 'Edit Signer', bn: 'স্বাক্ষরকারী সম্পাদনা' },
  'editor.sendForSigningTitle': { en: 'Send for Signing', bn: 'স্বাক্ষরের জন্য পাঠান' },
  'editor.documentName': { en: 'Document Name', bn: 'ডকুমেন্টের নাম' },
  'editor.ccEmail': { en: 'CC: Email a copy (optional)', bn: 'CC: একটি কপি ইমেইল করুন (ঐচ্ছিক)' },
  'editor.messageForSignees': { en: 'Message for signees (optional)', bn: 'স্বাক্ষরকারীদের জন্য বার্তা (ঐচ্ছিক)' },
  'editor.sending': { en: 'Sending...', bn: 'পাঠানো হচ্ছে...' },
  'editor.send': { en: 'Send', bn: 'পাঠান' },
  'editor.sendingDocument': { en: 'Sending Document...', bn: 'ডকুমেন্ট পাঠানো হচ্ছে...' },
  'editor.pleaseWait': { en: 'Please wait while we send emails to signers.', bn: 'অনুগ্রহ করে অপেক্ষা করুন, স্বাক্ষরকারীদের ইমেইল পাঠানো হচ্ছে।' },
  'editor.documentSent': { en: 'Document Sent!', bn: 'ডকুমেন্ট পাঠানো হয়েছে!' },
  'editor.signersWillReceive': { en: 'Signers will receive emails shortly.', bn: 'স্বাক্ষরকারীরা শীঘ্রই ইমেইল পাবেন।' },
  'editor.redirecting': { en: 'Redirecting to dashboard in', bn: 'ড্যাশবোর্ডে ফিরে যাচ্ছে' },
  'editor.savedSuccess': { en: 'Document saved successfully', bn: 'ডকুমেন্ট সফলভাবে সংরক্ষিত হয়েছে' },
  'editor.clickToAddField': { en: 'Click to add field', bn: 'ক্ষেত্র যোগ করতে ক্লিক করুন' },
  'editor.assignedTo': { en: 'Assigned to', bn: 'নির্ধারিত' },
  'editor.signee': { en: 'Signee', bn: 'স্বাক্ষরকারী' },

  // ─── Signee / Invite Signing Page ───
  'signee.loadingDoc': { en: 'Loading document...', bn: 'ডকুমেন্ট লোড হচ্ছে...' },
  'signee.docNotFound': { en: 'Document Not Found', bn: 'ডকুমেন্ট পাওয়া যায়নি' },
  'signee.docNotFoundDesc': {
    en: "The document you're looking for was not found. It may have been deleted or the link is invalid.",
    bn: 'আপনি যে ডকুমেন্টটি খুঁজছেন তা পাওয়া যায়নি। এটি মুছে ফেলা হয়ে থাকতে পারে অথবা লিঙ্কটি অবৈধ।',
  },
  'signee.signingComplete': { en: 'Signing Complete!', bn: 'স্বাক্ষর সম্পন্ন!' },
  'signee.thankYou': { en: 'Thank you,', bn: 'ধন্যবাদ,' },
  'signee.allFieldsSigned': {
    en: 'All your fields have been signed successfully.',
    bn: 'আপনার সকল ক্ষেত্র সফলভাবে স্বাক্ষরিত হয়েছে।',
  },
  'signee.downloadSigned': { en: 'Download Signed Document', bn: 'স্বাক্ষরিত ডকুমেন্ট ডাউনলোড করুন' },
  'signee.viewSigned': { en: 'View Signed Document', bn: 'স্বাক্ষরিত ডকুমেন্ট দেখুন' },
  'signee.downloadIncludesAudit': {
    en: 'Download includes signatures and audit trail certificate',
    bn: 'ডাউনলোডে স্বাক্ষর এবং অডিট ট্রেইল সার্টিফিকেট অন্তর্ভুক্ত',
  },
  'signee.generatingPdf': { en: 'Generating PDF...', bn: 'PDF তৈরি হচ্ছে...' },
  'signee.downloadPdf': { en: 'Download PDF', bn: 'PDF ডাউনলোড করুন' },
  'signee.close': { en: 'Close', bn: 'বন্ধ করুন' },
  'signee.signingAs': { en: 'Signing as', bn: 'স্বাক্ষর করছেন' },
  'signee.yourSignature': { en: 'Your Signature', bn: 'আপনার স্বাক্ষর' },
  'signee.changeSignature': { en: 'Change Signature', bn: 'স্বাক্ষর পরিবর্তন করুন' },
  'signee.createSignature': { en: 'Create Signature', bn: 'স্বাক্ষর তৈরি করুন' },
  'signee.yourInitials': { en: 'Your Initials', bn: 'আপনার আদ্যক্ষর' },
  'signee.changeInitials': { en: 'Change Initials', bn: 'আদ্যক্ষর পরিবর্তন করুন' },
  'signee.addInitials': { en: 'Add Initials', bn: 'আদ্যক্ষর যোগ করুন' },
  'signee.yourFields': { en: 'Your Fields', bn: 'আপনার ক্ষেত্র' },
  'signee.signed': { en: 'signed', bn: 'স্বাক্ষরিত' },
  'signee.places': { en: 'places', bn: 'জায়গা' },
  'signee.allInitialsFilled': { en: 'All initials fields filled', bn: 'সকল আদ্যক্ষর ক্ষেত্র পূরণ হয়েছে' },
  'signee.applyToAll': { en: 'Apply to All Initials', bn: 'সকল আদ্যক্ষরে প্রয়োগ করুন' },
  'signee.prev': { en: 'Prev', bn: 'আগের' },
  'signee.next': { en: 'Next', bn: 'পরের' },
  'signee.finishSigning': { en: 'Finish Signing', bn: 'স্বাক্ষর সম্পন্ন করুন' },
  'signee.submitting': { en: 'Submitting...', bn: 'জমা দেওয়া হচ্ছে...' },
  'signee.helpTitle': { en: 'How to Sign', bn: 'কিভাবে সাইন করবেন' },
  'signee.help1': {
    en: '1. Create your signature by clicking "Create Signature"',
    bn: '১. "স্বাক্ষর তৈরি করুন" ক্লিক করে আপনার স্বাক্ষর তৈরি করুন',
  },
  'signee.help2': {
    en: '2. Click on each highlighted field on the document to sign',
    bn: '২. সাইন করতে ডকুমেন্টের প্রতিটি হাইলাইট করা ক্ষেত্রে ক্লিক করুন',
  },
  'signee.help3': {
    en: '3. Use "Next" / "Prev" buttons to navigate between fields',
    bn: '৩. ক্ষেত্রগুলোর মধ্যে নেভিগেট করতে "পরের" / "আগের" বাটন ব্যবহার করুন',
  },
  'signee.help4': {
    en: '4. Once all fields are signed, click "Finish Signing"',
    bn: '৪. সব ক্ষেত্র সাইন হলে "স্বাক্ষর সম্পন্ন করুন" ক্লিক করুন',
  },
  'signee.help5': {
    en: '5. Download your signed copy for your records',
    bn: '৫. আপনার রেকর্ডের জন্য স্বাক্ষরিত কপি ডাউনলোড করুন',
  },
  'signee.tabUpload': { en: 'Upload', bn: 'আপলোড' },
  'signee.tabDraw': { en: 'Draw', bn: 'আঁকুন' },
  'signee.tabType': { en: 'Type', bn: 'টাইপ' },
  'signee.saveSignature': { en: 'Save Signature', bn: 'স্বাক্ষর সংরক্ষণ' },
  'signee.applyToAllSignatures': { en: 'Apply to All Signatures', bn: 'সকল স্বাক্ষরে প্রয়োগ করুন' },
  'signee.applyToAllInitials': { en: 'Apply to All Initials', bn: 'সকল আদ্যক্ষরে প্রয়োগ করুন' },
  'signee.createYourSignature': { en: 'Create Your Signature', bn: 'আপনার স্বাক্ষর তৈরি করুন' },
  'signee.addYourInitials': { en: 'Add Your Initials', bn: 'আপনার আদ্যক্ষর যোগ করুন' },
  'signee.drawInitialsHint': { en: 'Draw your initials below. You can apply to individual fields or all at once.', bn: 'নিচে আপনার আদ্যক্ষর আঁকুন। আপনি পৃথক ক্ষেত্রে বা একসাথে সবগুলিতে প্রয়োগ করতে পারেন।' },
}

export const useLanguageStore = create<LanguageState>((set, get) => {
  const saved = (typeof window !== 'undefined' ? localStorage.getItem('somadhan-lang') : null) as Language | null

  return {
    lang: saved || 'en',
    setLang: (lang) => {
      localStorage.setItem('somadhan-lang', lang)
      set({ lang })
    },
    toggle: () => {
      const next = get().lang === 'en' ? 'bn' : 'en'
      localStorage.setItem('somadhan-lang', next)
      set({ lang: next })
    },
    t: (key: string) => {
      const entry = translations[key]
      if (!entry) return key
      return entry[get().lang] || entry.en || key
    },
  }
})
