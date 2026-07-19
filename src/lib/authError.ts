const messagesByCode: Record<string, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  email_not_confirmed: 'Please verify your email before signing in.',
  user_already_exists: 'An account already exists for this email. Try signing in instead.',
  weak_password: 'Choose a stronger password with at least 8 characters.',
  otp_expired: 'That verification code has expired. Request a new code and try again.',
  over_email_send_rate_limit: 'Too many emails were requested. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts were made. Please wait and try again.',
  same_password: 'Choose a password you have not used for this account.',
  validation_failed: 'Check the information you entered and try again.',
}

export function getAuthErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const authError = error as { code?: string; status?: number; message?: string } | null
  if (authError?.code && messagesByCode[authError.code]) return messagesByCode[authError.code]
  if (authError?.status === 429) return messagesByCode.over_request_rate_limit

  const message = authError?.message?.toLowerCase() || ''
  if (message.includes('invalid login credentials')) return messagesByCode.invalid_credentials
  if (message.includes('email not confirmed')) return messagesByCode.email_not_confirmed
  if (message.includes('expired') && (message.includes('otp') || message.includes('token'))) return messagesByCode.otp_expired
  if (message.includes('rate limit') || message.includes('too many')) return messagesByCode.over_request_rate_limit
  if (message.includes('password')) return 'The password could not be accepted. Use at least 8 characters and try again.'
  return fallback
}
