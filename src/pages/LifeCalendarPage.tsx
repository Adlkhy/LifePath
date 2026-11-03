import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { ResourceState } from '../components/shared/ResourceState'
import { LifeCalendarCanvas } from '../components/life-calendar/LifeCalendarCanvas'
import { useLocalDay } from '../hooks/use-local-day'
import { useResource } from '../hooks/use-resource'
import { calendarDay, formatWeekRange, lifeWeeks } from '../lib/life-calendar'
import { formatCalendarDate, indexWeekItems } from '../lib/life-calendar-model'
import { profilesRepository } from '../repositories/profiles.repository'
import { chaptersRepository } from '../repositories/chapters.repository'
import { memoriesRepository } from '../repositories/memories.repository'
import type { Chapter, Memory } from '../types/database'
import './life-calendar.css'

async function loadCalendarItems() {
  const [chapters, memories] = await Promise.all([chaptersRepository.listAll(), memoriesRepository.listAll()])
  return { chapters, memories }
}

function chapterDates(chapter: Chapter) {
  const start = formatCalendarDate(chapter.start_date!)
  if (chapter.end_date) return `${start} – ${formatCalendarDate(chapter.end_date)}`
  return `${start} – ${chapter.status === 'active' ? 'Today' : 'End date not set'}`
}

function WeekCalendar({ birthday, chapters, memories }: { birthday: string; chapters: Chapter[]; memories: Memory[] }) {
  const today = calendarDay(useLocalDay())!
  const weeks = useMemo(() => lifeWeeks(birthday), [birthday])
  const items = useMemo(() => indexWeekItems(weeks, chapters, memories, today), [weeks, chapters, memories, today])
  const [selected, setSelected] = useState(() => Math.max(0, Math.min(weeks.length - 1, Math.floor((today - weeks[0]) / 7))))
  const selectedItems = items[selected]
  const range = formatWeekRange(weeks[selected])
  const id = useId()
  const announcement = `${range}. ${selectedItems.chapters.length ? `Chapters: ${selectedItems.chapters.map(chapter => chapter.title).join('; ')}. ` : ''}${selectedItems.memories.length ? `Memories: ${selectedItems.memories.map(memory => memory.title).join('; ')}.` : ''}${!selectedItems.chapters.length && !selectedItems.memories.length ? 'No chapters or memories in this week.' : ''}`
  const [announced, setAnnounced] = useState(announcement)
  useEffect(() => {
    // Coalesce rapid exploration so a screen reader does not queue every hover.
    const timer = setTimeout(() => setAnnounced(announcement), 180)
    return () => clearTimeout(timer)
  }, [announcement])

  return <section className="life-calendar space-y-5" aria-labelledby={`${id}-title`}>
    <h1 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">Life Calendar</h1>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] lg:gap-8">
      <LifeCalendarCanvas weeks={weeks} items={items} today={today} selected={selected} onSelect={setSelected} />
      <aside aria-labelledby={`${id}-range`} className="min-w-0 border-t border-border/20 pt-5 lg:mt-14 lg:max-h-[min(65dvh,42rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <h2 id={`${id}-range`} className="text-lg font-semibold leading-snug">{range}</h2>
        {selectedItems.chapters.length === 0 && selectedItems.memories.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No chapters or memories in this week.</p> : <div className="mt-6 space-y-7">
          {selectedItems.chapters.map(chapter => <article key={chapter.id} className="min-w-0 space-y-2 border-l-2 border-(--calendar-chapter) pl-3">
            <p className="life-calendar-chapter text-[11px] font-semibold uppercase tracking-wider">Life chapter</p>
            <Link to={`/app/chapters/${chapter.id}`} className="inline-flex max-w-full items-start gap-2 font-medium underline-offset-4 hover:underline"><span className="break-words">{chapter.title}</span><ArrowUpRight aria-hidden="true" className="mt-1 size-3.5 shrink-0" /></Link>
            {chapter.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{chapter.description}</p>}
            <p className="text-xs leading-relaxed text-muted-foreground">{chapterDates(chapter)}</p>
          </article>)}
          {selectedItems.memories.map(memory => <article key={memory.id} className="min-w-0 space-y-2 border-l-2 border-(--calendar-memory) pl-3">
            <p className="life-calendar-memory text-[11px] font-semibold uppercase tracking-wider">Memory</p>
            <Link to={`/app/memories/${memory.id}`} className="inline-flex max-w-full items-start gap-2 font-medium underline-offset-4 hover:underline"><span className="break-words">{memory.title}</span><ArrowUpRight aria-hidden="true" className="mt-1 size-3.5 shrink-0" /></Link>
            {memory.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{memory.description}</p>}
            <p className="text-xs text-muted-foreground">{formatCalendarDate(memory.memory_date)}</p>
          </article>)}
        </div>}
      </aside>
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announced}</p>
  </section>
}

function ConnectedCalendar({ birthday }: { birthday: string }) {
  const entries = useResource(loadCalendarItems)
  if (!entries.data) return <ResourceState loading={entries.loading} error={entries.error} retry={entries.reload} />
  return <WeekCalendar birthday={birthday} chapters={entries.data.chapters} memories={entries.data.memories} />
}

export function LifeCalendarPage() {
  const profile = useResource(profilesRepository.get)
  if (profile.loading || profile.error) return <ResourceState loading={profile.loading} error={profile.error} retry={profile.reload} />
  if (!profile.data?.birthday) return <p className="text-sm text-muted-foreground">Add your birthday in <Link to="/app/account" className="underline underline-offset-4">Account Settings</Link> to see your Life Calendar.</p>
  return <ConnectedCalendar key={profile.data.birthday} birthday={profile.data.birthday} />
}
