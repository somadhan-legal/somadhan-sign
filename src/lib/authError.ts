type AuthErrorLanguage = 'en' | 'bn'

const messagesByCode: Record<string, Record<AuthErrorLanguage, string>> = {
  invalid_credentials: { en: 'The email or password is incorrect.', bn: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' },
  email_not_confirmed: { en: 'Please verify your email before signing in.', bn: 'সাইন ইন করার আগে আপনার ইমেইল যাচাই করুন।' },
  user_already_exists: { en: 'An account already exists for this email. Try signing in instead.', bn: 'এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে। সাইন ইন করে দেখুন।' },
  weak_password: { en: 'Choose a stronger password with at least 8 characters.', bn: 'কমপক্ষে ৮ অক্ষরের আরও শক্তিশালী পাসওয়ার্ড বেছে নিন।' },
  otp_expired: { en: 'That verification code has expired. Request a new code and try again.', bn: 'যাচাইকরণ কোডটির মেয়াদ শেষ হয়েছে। নতুন কোড নিয়ে আবার চেষ্টা করুন।' },
  over_email_send_rate_limit: { en: 'Too many emails were requested. Please wait a few minutes and try again.', bn: 'অল্প সময়ে অনেক ইমেইল অনুরোধ করা হয়েছে। কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।' },
  over_request_rate_limit: { en: 'Too many attempts were made. Please wait and try again.', bn: 'অল্প সময়ে অনেকবার চেষ্টা করা হয়েছে। অপেক্ষা করে আবার চেষ্টা করুন।' },
  same_password: { en: 'Choose a password you have not used for this account.', bn: 'এই অ্যাকাউন্টে আগে ব্যবহার করেননি এমন পাসওয়ার্ড বেছে নিন।' },
  validation_failed: { en: 'Check the information you entered and try again.', bn: 'আপনার দেওয়া তথ্য পরীক্ষা করে আবার চেষ্টা করুন।' },
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  language: AuthErrorLanguage = 'en',
): string {
  const authError = error as { code?: string; status?: number; message?: string } | null
  if (authError?.code && messagesByCode[authError.code]) return messagesByCode[authError.code][language]
  if (authError?.status === 429) return messagesByCode.over_request_rate_limit[language]

  const message = authError?.message?.toLowerCase() || ''
  if (message.includes('invalid login credentials')) return messagesByCode.invalid_credentials[language]
  if (message.includes('email not confirmed')) return messagesByCode.email_not_confirmed[language]
  if (message.includes('expired') && (message.includes('otp') || message.includes('token'))) return messagesByCode.otp_expired[language]
  if (message.includes('rate limit') || message.includes('too many')) return messagesByCode.over_request_rate_limit[language]
  if (message.includes('password')) {
    return language === 'bn'
      ? 'পাসওয়ার্ড গ্রহণ করা যায়নি। কমপক্ষে ৮ অক্ষর ব্যবহার করে আবার চেষ্টা করুন।'
      : 'The password could not be accepted. Use at least 8 characters and try again.'
  }
  return fallback
}

export type RecoveryLinkError = 'expired' | 'invalid' | null

export function getRecoveryLinkError(search: string, hash = ''): RecoveryLinkError {
  const queryParams = new URLSearchParams(search.replace(/^[?#]/, ''))
  const hashParams = new URLSearchParams(hash.replace(/^[?#]/, ''))
  const error = queryParams.get('error') || hashParams.get('error')
  if (!error) return null

  const errorCode = (queryParams.get('error_code') || hashParams.get('error_code') || '').toLowerCase()
  const description = (
    queryParams.get('error_description')
    || hashParams.get('error_description')
    || ''
  ).toLowerCase()
  if (
    error === 'access_denied'
    || errorCode === 'otp_expired'
    || description.includes('expired')
    || description.includes('invalid')
  ) {
    return 'expired'
  }
  return 'invalid'
}
