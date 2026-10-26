import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useLifeData } from '../../hooks/use-life-data'
import { currentTheme, saveTheme } from '../../lib/theme'
import { LifeDataProvider } from '../../state/LifeDataProvider'
import { Button } from '../ui/button'
import { BrandMark } from '../shared/Brand'
import { MotionNavLink } from '../ui/motion'

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
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="app-header border-b">
      <div className="app-nav">
        <MotionNavLink to="/app" className="brand-link"><BrandMark /><span>lifepath</span></MotionNavLink>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
            {[['/app', 'Focus'], ['/app/map', 'Life Map'], ['/app/chapters', 'Chapters'], ['/app/goals', 'Goals'], ['/app/values', 'Values'], ['/app/bucket-list', 'Bucket List'], ['/app/reviews', 'Reviews'], ['/app/journey', 'Journey'], ['/app/account', 'Account']].map(([to, title]) =>
              <MotionNavLink key={to} to={to} end={to === '/app'} className="nav-pill">{title}</MotionNavLink>)}
          </nav>
          <Button variant="outline" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </Button>
        </div>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} ref={main} className="app-main space-y-8 outline-none">
      {pathname === '/app/account' ? <Outlet /> : loading ? <p role="status">Loading your Lifepath…</p> : error ? <div className="space-y-4"><p role="alert" className="text-destructive">{error}</p><Button onClick={refresh}>Try again</Button></div> : <Outlet />}
    </main>
  </div>
}

export function AppLayout() {
  const { session } = useAuth()
  return <LifeDataProvider key={session?.user.id}><AppShell /></LifeDataProvider>
}
