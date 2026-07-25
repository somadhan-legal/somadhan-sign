const TOKEN_PATTERN = /^[0-9a-f]{64}$/i
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isSigningToken = (value: unknown): value is string =>
  typeof value === 'string' && TOKEN_PATTERN.test(value)

export const isViewerReference = (value: unknown, secureAccessEnabled: boolean): value is string =>
  typeof value === 'string'
  && (secureAccessEnabled ? TOKEN_PATTERN.test(value) : UUID_PATTERN.test(value))
