import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, X } from 'lucide-react'
import { currentTheme, saveTheme } from '../../lib/theme'
import { useSidebar } from '../../hooks/use-sidebar'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarSeparator } from '../ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { AccountMenu } from './AccountMenu'
import { isNavigationActive, navigation } from './navigation'

// Adapted from shadcn/ui sidebar-10 (base-nova): account header, grouped navigation,
// sidebar rail, and a compact content header. All destinations are existing routes.
export function AppSidebar() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const [theme, setTheme] = useState(currentTheme)
  const themeLabel = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`

  function toggleTheme() {
    const next = currentTheme() === 'light' ? 'dark' : 'light'
    saveTheme(next)
    setTheme(next)
  }

  return <Sidebar collapsible="icon" className="border-r border-border">
    <SidebarHeader>
      <div className="flex min-w-0 items-center">
        <AccountMenu />
        {isMobile && <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" aria-label="Close navigation" onClick={() => setOpenMobile(false)}><X size={18} aria-hidden="true" /></button>}
      </div>
    </SidebarHeader>
    <SidebarSeparator />
    <SidebarContent>
      <nav aria-label="Main navigation">
        {navigation.map((group) => <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {group.items.map(({ to, title, icon: Icon }) => {
              const active = isNavigationActive(pathname, to)
              return <SidebarMenuItem key={to}><SidebarMenuButton isActive={active} tooltip={title} className="h-11 md:h-9" render={<Link to={to} aria-current={active ? 'page' : undefined} aria-label={title} />} onClick={() => setOpenMobile(false)}><Icon aria-hidden="true" /><span className="group-data-[collapsible=icon]:hidden">{title}</span></SidebarMenuButton></SidebarMenuItem>
            })}
          </SidebarMenu>
        </SidebarGroup>)}
      </nav>
    </SidebarContent>
    <SidebarFooter className="border-t border-border">
      <Tooltip><TooltipTrigger render={<button type="button" aria-label={themeLabel} onClick={toggleTheme} className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring" />}>
        {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
      </TooltipTrigger><TooltipContent side="right">{themeLabel}</TooltipContent></Tooltip>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}
