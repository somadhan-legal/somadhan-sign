const PRODUCT_NAME = 'Somadhan Sign'

type RouteLanguage = 'en' | 'bn'

const routeLabels = {
  home: { en: 'Clear electronic signing', bn: 'সহজ ইলেকট্রনিক স্বাক্ষর' },
  login: { en: 'Sign in or create an account', bn: 'সাইন ইন বা অ্যাকাউন্ট তৈরি করুন' },
  reset: { en: 'Reset password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  dashboard: { en: 'My documents', bn: 'আমার ডকুমেন্টস' },
  sign: { en: 'Sign a document', bn: 'ডকুমেন্ট স্বাক্ষর করুন' },
  view: { en: 'View document', bn: 'ডকুমেন্ট দেখুন' },
  verify: { en: 'Verify completed document', bn: 'সম্পন্ন ডকুমেন্ট যাচাই করুন' },
  edit: { en: 'Prepare document', bn: 'ডকুমেন্ট প্রস্তুত করুন' },
  details: { en: 'Document details', bn: 'ডকুমেন্টের বিস্তারিত' },
  notFound: { en: 'Page not found', bn: 'পৃষ্ঠা পাওয়া যায়নি' },
} satisfies Record<string, Record<RouteLanguage, string>>

export function getRouteTitle(pathname: string, language: RouteLanguage = 'en'): string {
  if (pathname === '/') return `${PRODUCT_NAME} | ${routeLabels.home[language]}`
  if (pathname === '/login') return `${routeLabels.login[language]} | ${PRODUCT_NAME}`
  if (pathname === '/reset-password') return `${routeLabels.reset[language]} | ${PRODUCT_NAME}`
  if (pathname === '/dashboard') return `${routeLabels.dashboard[language]} | ${PRODUCT_NAME}`
  if (/^\/sign\/[^/]+$/.test(pathname)) return `${routeLabels.sign[language]} | ${PRODUCT_NAME}`
  if (/^\/view\/[^/]+$/.test(pathname)) return `${routeLabels.view[language]} | ${PRODUCT_NAME}`
  if (pathname === '/verify') return `${routeLabels.verify[language]} | ${PRODUCT_NAME}`
  if (/^\/document\/[^/]+\/edit$/.test(pathname)) return `${routeLabels.edit[language]} | ${PRODUCT_NAME}`
  if (/^\/document\/[^/]+$/.test(pathname)) return `${routeLabels.details[language]} | ${PRODUCT_NAME}`
  return `${routeLabels.notFound[language]} | ${PRODUCT_NAME}`
}
