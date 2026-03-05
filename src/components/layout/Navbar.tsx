import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import SomadhanLogo from '@/assets/somadhan-logo.svg'

export default function Navbar() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 no-underline">
            <img src={SomadhanLogo} alt="RocketSign" className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-bold text-[hsl(var(--foreground))]">
              RocketSign
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
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
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/login">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
