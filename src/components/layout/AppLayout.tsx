import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useLifeData } from '../../hooks/use-life-data'
import { currentTheme, saveTheme } from '../../lib/theme'
import { LifeDataProvider } from '../../state/LifeDataProvider'
import { Button } from '../ui/button'

function AppShell() {
  const { loading, error, refresh } = useLifeData()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => { main.current?.focus() }, [pathname])
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    saveTheme(next)
    setTheme(next)
  }
  return <div className="min-h-screen">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:p-4">Skip to content</a>
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
        <NavLink to="/app" className="text-lg font-semibold">Lifepath</NavLink>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
            {[['/app', 'Focus'], ['/app/map', 'Life Map'], ['/app/chapters', 'Chapters'], ['/app/goals', 'Goals'], ['/app/journey', 'Journey'], ['/app/account', 'Account']].map(([to, title]) =>
              <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => `rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring ${isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'}`}>{title}</NavLink>)}
          </nav>
          <Button variant="outline" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </Button>
        </div>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} ref={main} className="mx-auto max-w-6xl space-y-6 p-4 outline-none sm:p-6">
      {pathname === '/app/account' ? <Outlet /> : loading ? <p role="status">Loading your Lifepath…</p> : error ? <div className="space-y-4"><p role="alert" className="text-destructive">{error}</p><Button onClick={refresh}>Try again</Button></div> : <Outlet />}
    </main>
  </div>
}

export function AppLayout() {
  const { session } = useAuth()
  return <LifeDataProvider key={session?.user.id}><AppShell /></LifeDataProvider>
}
