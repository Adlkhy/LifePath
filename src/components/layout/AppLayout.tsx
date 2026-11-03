import { Link, Outlet, useLocation } from 'react-router-dom'
import { Fragment, Suspense, useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useLifeData } from '../../hooks/use-life-data'
import { LifeDataProvider } from '../../state/LifeDataProvider'
import { Button } from '../ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar'
import { TooltipProvider } from '../ui/tooltip'
import { Separator } from '../ui/separator'
import { AppSidebar } from './AppSidebar'
import { dashboardBreadcrumbs } from './navigation'
import './dashboard.css'

function AppShell() {
  const { loading, error, refresh } = useLifeData()
  const { pathname, hash } = useLocation()
  const content = useRef<HTMLDivElement>(null)
  const crumbs = dashboardBreadcrumbs(pathname)
  const canvas = pathname === '/app/map' || pathname === '/app/skills'

  useEffect(() => {
    const previousTitle = document.title
    content.current?.scrollTo(0, 0)
    content.current?.focus({ preventScroll: true })
    document.title = `${dashboardBreadcrumbs(pathname).at(-1)?.title ?? 'Lifepath'} · Lifepath`
    return () => { document.title = previousTitle }
  }, [pathname, hash])

  return <TooltipProvider delay={200}>
    <SidebarProvider defaultOpen={window.matchMedia('(min-width: 1024px)').matches} className="dashboard-shell h-dvh min-h-0 overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-4 self-center" />
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              {crumbs.map((crumb, index) => <Fragment key={`${crumb.title}:${index}`}>
                {index > 0 && <li aria-hidden="true"><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></li>}
                <li className="min-w-0 truncate">{crumb.to ? <Link to={crumb.to} className="text-muted-foreground hover:text-foreground">{crumb.title}</Link> : <span aria-current="page" className="font-medium">{crumb.title}</span>}</li>
              </Fragment>)}
            </ol>
          </nav>
        </header>
        <div id="main-content" tabIndex={-1} ref={content} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--app-canvas)] outline-none">
          <div className={`dashboard-content mx-auto w-full min-w-0 space-y-6 p-4 pb-12 sm:p-6 sm:pb-12 lg:px-8 ${canvas ? 'dashboard-canvas' : 'max-w-[1440px]'}`}>
            <Suspense fallback={<p role="status" className="py-6">Loading page…</p>}>
              {pathname === '/app/account' || pathname === '/app/life-calendar' ? <Outlet /> : loading ? <p role="status" className="py-6">Loading your Lifepath…</p> : error ? <div className="space-y-4 rounded-lg border p-6"><p role="alert" className="text-destructive">{error}</p><Button onClick={refresh}>Try again</Button></div> : <Outlet />}
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
}

export function AppLayout() {
  const { session } = useAuth()
  return <LifeDataProvider key={session?.user.id}><AppShell /></LifeDataProvider>
}
