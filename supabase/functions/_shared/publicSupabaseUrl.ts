export const withPublicSupabaseOrigin = (
  value: string,
  publicSupabaseUrl: string | undefined,
): string => {
  if (!publicSupabaseUrl) return value

  try {
    const url = new URL(value)
    const publicUrl = new URL(publicSupabaseUrl)
    if (!['http:', 'https:'].includes(publicUrl.protocol)) return value

    url.protocol = publicUrl.protocol
    url.host = publicUrl.host
    return url.toString()
  } catch {
    return value
  }
}
