import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronsUpDown, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useMutation } from '../../hooks/use-mutation'
import { useSidebar } from '../../hooks/use-sidebar'
import { profilesRepository } from '../../repositories/profiles.repository'
import { authService } from '../../services/auth.service'
import type { Profile } from '../../types/database'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar'

export function AccountMenu() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const { isMobile, state, setOpenMobile } = useSidebar()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)
  const mutation = useMutation()

  // Refresh after profile edits without changing the existing profile form or auth flow.
  useEffect(() => {
    let active = true
    void profilesRepository.get().then((value) => { if (active) setProfile(value) }).catch(() => {})
    return () => { active = false }
  }, [pathname, open])

  const name = profile?.display_name || session?.user.user_metadata?.display_name || session?.user.email?.split('@')[0] || 'Your account'
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const avatar = profile?.avatar_url || session?.user.user_metadata?.avatar_url
  const closeNavigation = () => { setOpen(false); setOpenMobile(false) }

  return <SidebarMenu><SidebarMenuItem>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label={`Account menu for ${name}`} className="h-14 gap-3 data-popup-open:bg-accent group-data-[collapsible=icon]:justify-center" />}>
        <Avatar className="size-8 rounded-lg"><AvatarImage src={avatar || undefined} alt="" className="rounded-lg" /><AvatarFallback className="rounded-lg">{initials}</AvatarFallback></Avatar>
        <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden"><span className="truncate font-medium">{name}</span>{session?.user.email && <span className="truncate text-xs text-muted-foreground">{session.user.email}</span>}</span>
        <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile || state === 'expanded' ? 'bottom' : 'right'} align="start" className="min-w-56 max-w-[calc(100vw-2rem)]">
        <div className="px-2 py-2 text-xs text-muted-foreground">Manage your Lifepath</div>
        <DropdownMenuItem className="min-h-11 gap-2" render={<Link to="/app/character" />} onClick={closeNavigation}><UserRound aria-hidden="true" />Profile</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 gap-2" render={<Link to="/app/account" />} onClick={closeNavigation}><Settings aria-hidden="true" />Account settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        {mutation.error && <p role="alert" className="max-w-64 px-2 py-2 text-sm text-destructive">{mutation.error}</p>}
        <DropdownMenuItem className="min-h-11 gap-2" variant="destructive" disabled={mutation.busy} closeOnClick={false} onClick={() => void mutation.run(authService.signOut, 'Signed out.').then((ok) => { if (ok) closeNavigation() })}><LogOut aria-hidden="true" />{mutation.busy ? 'Signing out…' : 'Sign out'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem></SidebarMenu>
}
