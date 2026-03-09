import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, FileText, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import Button from '@/components/ui/Button'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'

export default function Navbar() {
  const { user, signOut } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-40 bg-[hsl(var(--background))]/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
      <div className="px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {user ? (
            <Link to="/dashboard" className="flex items-center gap-2 no-underline">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14" />
            </Link>
          ) : (
            <a href="https://sign.somadhan.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 no-underline">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 cursor-pointer" />
            </a>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'বাংলা' : 'English'}>
              <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    {t('nav.documents')}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))]">
                  <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              !isLoginPage && (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="hidden sm:block">
                    <Button variant="ghost" size="sm">{t('nav.signIn')}</Button>
                  </Link>
                  <Link to="/login?mode=signup">
                    <Button size="sm" className="w-full sm:w-auto px-6">{t('nav.getStarted')}</Button>
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
