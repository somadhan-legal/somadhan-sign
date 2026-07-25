import { Link, useNavigate, useLocation } from 'react-router'
import { LogOut, User, FileText, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import Button from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/buttonStyles'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import { useState } from 'react'

export default function Navbar() {
  const { user, signOut } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
      navigate('/login')
    } catch {
      setSignOutError(t('nav.signOutFailed'))
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-[hsl(var(--background))]/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
      <div className="px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {user ? (
            <Link to="/dashboard" className="flex items-center gap-2 no-underline">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-10 sm:h-14" />
            </Link>
          ) : (
            <a href="/" className="flex items-center gap-2 no-underline">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-10 sm:h-14 cursor-pointer" />
            </a>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} title={lang === 'en' ? 'বাংলা' : 'English'}>
              <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'hidden md:inline-flex' })}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('nav.documents')}
                </Link>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))]">
                  <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={signingOut} aria-label={signingOut ? t('nav.signingOut') : t('nav.signOut')} title={t('nav.signOut')}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              !isLoginPage && (
                <div className="flex items-center gap-2">
                  <Link to="/login" className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>{t('nav.signIn')}</Link>
                  <Link to="/login?mode=signup" className={buttonStyles({ size: 'sm', className: 'w-full px-6 sm:w-auto' })}>{t('nav.getStarted')}</Link>
                </div>
              )
            )}
          </div>
        </div>
        {signOutError && <p role="alert" className="pb-2 text-right text-xs font-medium text-[hsl(var(--destructive))]">{signOutError}</p>}
      </div>
    </nav>
  )
}
