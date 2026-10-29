import { useRef, useState, type KeyboardEvent } from 'react'
import type { ActivityDay } from '../../types/database'
import { calendarDays } from '../../lib/growth'

const intensityClasses = ['bg-muted', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']
function intensity(count: number) { return Math.min(4, count) }
export function ActivityHeatmap({ activity, start, end }: { activity: ActivityDay[]; start: string; end: string }) {
  const days = calendarDays(start, end)
  const [focused, setFocused] = useState(days.length - 1)
  const [hovered, setHovered] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const counts = new Map(activity.map((day) => [day.day, day.activity_count]))
  const offset = (new Date(`${start}T12:00:00`).getDay() + 6) % 7
  const selected = days[hovered ?? focused]
  const describe = (day: string) => `${new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}: ${counts.get(day) ?? 0} first completion${counts.get(day) === 1 ? '' : 's'}`
  function navigate(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, ArrowLeft: index - 7, ArrowRight: index + 7, Home: 0, End: days.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    buttons.current[Math.max(0, Math.min(days.length - 1, moves[event.key]))]?.focus()
  }
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Each square is a local calendar day. Hover, tap, or focus a day for its count; use arrow keys to explore.</p>
    <div className="overflow-x-auto pb-2" role="group" aria-label="Daily progression activity">
      <div className="flex min-w-max gap-2">
        <div className="grid grid-rows-7 gap-1 text-[10px] leading-[14px] text-muted-foreground" aria-hidden="true">{['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} className="size-3.5" aria-hidden="true" />)}
          {days.map((day, index) => <button key={day} type="button" ref={(element) => { buttons.current[index] = element }} title={describe(day)} aria-label={describe(day)} tabIndex={focused === index ? 0 : -1} className={`size-3.5 rounded-[2px] border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${intensityClasses[intensity(counts.get(day) ?? 0)]}`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => { setFocused(index); setHovered(null) }} onClick={() => { setFocused(index); setHovered(null) }} onKeyDown={(event) => navigate(event, index)} />)}
        </div>
      </div>
    </div>
    <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span>{start} — {days.at(-1)}</span><div className="flex items-center gap-1" aria-label="Intensity: 0, 1, 2, 3, or 4 and more completions"><span>Fewer</span>{intensityClasses.map((style, index) => <span key={style} title={`${index}${index === 4 ? '+' : ''} completions`} className={`size-3.5 rounded-[2px] border ${style}`} />)}<span>More</span></div></div>
    <p className="min-h-5 text-sm" role="status" aria-live="polite">{selected && describe(selected)}</p>
    {!activity.length && <p className="text-sm text-muted-foreground">No recorded completions in this period. Your history will appear as you complete goals, milestones, quests, or chapters.</p>}
  </div>
}
