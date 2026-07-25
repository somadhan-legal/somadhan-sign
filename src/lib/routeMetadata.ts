const PRODUCT_NAME = 'Somadhan Sign'

export function getRouteTitle(pathname: string): string {
  if (pathname === '/') return `${PRODUCT_NAME} | Clear electronic signing`
  if (pathname === '/login') return `Sign in or create an account | ${PRODUCT_NAME}`
  if (pathname === '/reset-password') return `Reset password | ${PRODUCT_NAME}`
  if (pathname === '/dashboard') return `My documents | ${PRODUCT_NAME}`
  if (/^\/sign\/[^/]+$/.test(pathname)) return `Sign a document | ${PRODUCT_NAME}`
  if (/^\/view\/[^/]+$/.test(pathname)) return `View document | ${PRODUCT_NAME}`
  if (/^\/document\/[^/]+\/edit$/.test(pathname)) return `Prepare document | ${PRODUCT_NAME}`
  if (/^\/document\/[^/]+$/.test(pathname)) return `Document details | ${PRODUCT_NAME}`
  return `Page not found | ${PRODUCT_NAME}`
}
