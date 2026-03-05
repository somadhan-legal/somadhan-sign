import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
