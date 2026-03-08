import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      <Navbar />
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
