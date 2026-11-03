import { BookOpen, CalendarDays, ChartNoAxesCombined, Compass, Focus, History, ListChecks, Map, Network, Target, UserRound } from 'lucide-react'

export const navigation = [
  { label: 'Main', items: [
    { to: '/app/map', title: 'Life Map', icon: Map },
    { to: '/app', title: 'Focus', icon: Focus },
    { to: '/app/goals', title: 'Goals & steps', icon: Target },
    { to: '/app/chapters', title: 'Life chapters', icon: BookOpen },
    { to: '/app/bucket-list', title: 'Bucket List', icon: ListChecks },
  ] },
  { label: 'Personal growth', items: [
    { to: '/app/skills', title: 'Skill trees', icon: Network },
    { to: '/app/character', title: 'Character profile', icon: UserRound },
    { to: '/app/values', title: 'Values & principles', icon: Compass },
    { to: '/app/reviews', title: 'Goal reviews', icon: ListChecks },
  ] },
  { label: 'Journey', items: [
    { to: '/app/journey', title: 'Your journey', icon: History },
    { to: '/app/life-calendar', title: 'Life Calendar', icon: CalendarDays },
  ] },
  { label: 'Insights', items: [
    { to: '/app/insights', title: 'Insights', icon: ChartNoAxesCombined },
  ] },
]

export function isNavigationActive(pathname: string, to: string) {
  if (to === '/app') return pathname === to || pathname === `${to}/`
  if (to === '/app/journey' && pathname.startsWith('/app/memories/')) return true
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function dashboardBreadcrumbs(pathname: string): { title: string; to?: string }[] {
  if (isNavigationActive(pathname, '/app/account')) return [{ title: 'Settings' }]
  const item = navigation.flatMap((group) => group.items).find((entry) => isNavigationActive(pathname, entry.to))
  if (!item) return [{ title: 'Lifepath' }]
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 2) return [{ title: item.title }]
  const kind = segments[1] === 'memories' ? 'memory' : segments[1] === 'chapters' ? 'chapter' : segments[1] === 'journey' ? 'event' : 'goal'
  const title = segments[2] === 'new' ? `New ${kind}` : segments[3] === 'edit' ? `Edit ${kind}` : `${kind[0].toUpperCase()}${kind.slice(1)} details`
  return [{ title: item.title, to: item.to }, { title }]
}
