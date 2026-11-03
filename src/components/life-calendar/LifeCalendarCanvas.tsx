import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { LocateFixed, Maximize2, Minus, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { formatWeekRange } from '../../lib/life-calendar'
import { WEEKS_PER_GROUP, CALENDAR_GUTTER, CALENDAR_HEADER, CELL_SIZE, calendarLayout, clampView, hitWeek, navigateWeek, type CalendarView, type WeekItems } from '../../lib/life-calendar-model'
import { drawCalendar, type CalendarPalette, type CalendarScene } from './draw-calendar'

type Props = { weeks: number[]; items: WeekItems[]; today: number; selected: number; onSelect: (index: number) => void }
type Pointer = { x: number; y: number; startX: number; startY: number }
type Controls = { redraw: () => void; zoom: (factor: number, x?: number, y?: number) => void; fit: () => void; reveal: (index: number, center?: boolean) => void }

export function LifeCalendarCanvas({ weeks, items, today, selected, onSelect }: Props) {
  const [labels, setLabels] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lifepath-calendar-labels') ?? '{}')
      return { years: saved?.years !== false, months: saved?.months !== false }
    } catch { return { years: true, months: true } }
  })
  const layout = useMemo(() => calendarLayout(weeks), [weeks])
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<CalendarScene>({ layout, weeks, items, today, selected, showYears: labels.years, showMonths: labels.months })
  const selection = useRef(selected)
  const view = useRef<CalendarView>({ x: 0, y: 0, zoom: 1 })
  const focused = useRef(false)
  const pointers = useRef(new Map<number, Pointer>())
  const dragged = useRef(false)
  const controls = useRef<Controls | null>(null)
  const id = useId()

  useEffect(() => {
    scene.current = { layout, weeks, items, today, selected, showYears: labels.years, showMonths: labels.months }
    selection.current = selected
    controls.current?.redraw()
  }, [layout, weeks, items, today, selected, labels])

  useEffect(() => {
    try { localStorage.setItem('lifepath-calendar-labels', JSON.stringify(labels)) } catch { /* The toggles still work when storage is unavailable. */ }
  }, [labels])

  useEffect(() => {
    const element = host.current!
    const bitmap = canvas.current!
    const context = bitmap.getContext('2d')
    if (!context) return
    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let disposed = false
    let palette: CalendarPalette
    let resolution: MediaQueryList | undefined
    const redraw = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!width || !height) return
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawCalendar(context, scene.current, view.current, palette, width, height, focused.current)
      })
    }
    const readPalette = () => {
      const style = getComputedStyle(element)
      const token = (name: string) => style.getPropertyValue(name).trim()
      palette = { background: token('--background'), foreground: token('--foreground'), muted: token('--muted-foreground'), primary: token('--primary'), focus: token('--ring'), chapter: token('--calendar-chapter'), memory: token('--calendar-memory'), font: style.fontFamily }
      redraw()
    }
    const constrain = (next: CalendarView) => { view.current = clampView(next, layout, width, height); redraw() }
    const reveal = (index: number, center = false) => {
      const cell = layout.cells[index]
      if (!cell) return
      const next = { ...view.current }
      const x = CALENDAR_GUTTER + next.x + cell.x * next.zoom
      const y = CALENDAR_HEADER + next.y + cell.y * next.zoom
      if (center || x < CALENDAR_GUTTER + 4 || x + CELL_SIZE * next.zoom > width - 8) next.x = (width - CALENDAR_GUTTER) / 2 - cell.x * next.zoom
      if (center || y < CALENDAR_HEADER + 4 || y + CELL_SIZE * next.zoom > height - 8) next.y = (height - CALENDAR_HEADER) / 2 - cell.y * next.zoom
      constrain(next)
    }
    const zoom = (factor: number, x = width / 2, y = height / 2) => {
      const previous = view.current
      const nextZoom = clampView({ ...previous, zoom: previous.zoom * factor }, layout, width, height).zoom
      const ratio = nextZoom / previous.zoom
      constrain({ zoom: nextZoom, x: x - CALENDAR_GUTTER - (x - CALENDAR_GUTTER - previous.x) * ratio, y: y - CALENDAR_HEADER - (y - CALENDAR_HEADER - previous.y) * ratio })
    }
    controls.current = {
      redraw, zoom, reveal,
      fit: () => { constrain({ x: 0, y: view.current.y, zoom: (width - CALENDAR_GUTTER - 8) / layout.width }); reveal(selection.current, true) },
    }
    const resize = () => {
      const initial = width === 0
      width = element.clientWidth
      height = element.clientHeight
      dpr = window.devicePixelRatio || 1
      // The backing bitmap is viewport-sized, even at maximum zoom.
      bitmap.width = Math.round(width * dpr)
      bitmap.height = Math.round(height * dpr)
      if (initial) view.current.zoom = Math.max(width < 500 ? 0.85 : 0, (width - CALENDAR_GUTTER - 8) / layout.width)
      constrain(view.current)
      reveal(selection.current, initial)
      readPalette()
    }
    const watchResolution = () => {
      resolution?.removeEventListener('change', watchResolution)
      resize()
      resolution = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      resolution.addEventListener('change', watchResolution, { once: true })
    }
    const wheel = (event: WheelEvent) => {
      const rect = element.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        zoom(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left - element.clientLeft, event.clientY - rect.top - element.clientTop)
      } else {
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1
        const previous = view.current
        const next = clampView({ ...previous, x: previous.x - event.deltaX * unit, y: previous.y - event.deltaY * unit }, layout, width, height)
        if (next.x !== previous.x || next.y !== previous.y) { event.preventDefault(); constrain(next) }
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const theme = new MutationObserver(readPalette)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    watchResolution()
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('resize', resize)
    void document.fonts.ready.then(() => { if (!disposed) readPalette() })
    return () => {
      disposed = true
      controls.current = null
      observer.disconnect(); theme.disconnect()
      resolution?.removeEventListener('change', watchResolution)
      element.removeEventListener('wheel', wheel)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [layout])

  function choose(index: number | null) {
    if (index === null || index === selection.current) return
    selection.current = index
    onSelect(index)
  }
  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left - event.currentTarget.clientLeft, y: event.clientY - rect.top - event.currentTarget.clientTop }
  }
  function hit(x: number, y: number) {
    if (x < CALENDAR_GUTTER || y < CALENDAR_HEADER) return null
    return hitWeek(layout, (x - CALENDAR_GUTTER - view.current.x) / view.current.zoom, (y - CALENDAR_HEADER - view.current.y) / view.current.zoom)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = point(event)
    const pointer = pointers.current.get(event.pointerId)
    if (!pointer) {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') choose(hit(current.x, current.y))
      return
    }
    const before = [...pointers.current.values()]
    const previous = { ...pointer }
    pointers.current.set(event.pointerId, { ...pointer, ...current })
    if (Math.hypot(current.x - pointer.startX, current.y - pointer.startY) > 5) dragged.current = true
    if (pointers.current.size === 2) {
      dragged.current = true
      const after = [...pointers.current.values()]
      const distance = (points: Pointer[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const oldDistance = distance(before)
      const oldX = (before[0].x + before[1].x) / 2
      const oldY = (before[0].y + before[1].y) / 2
      if (oldDistance > 0) controls.current?.zoom(distance(after) / oldDistance, oldX, oldY)
      view.current = clampView({ ...view.current, x: view.current.x + (after[0].x + after[1].x) / 2 - oldX, y: view.current.y + (after[0].y + after[1].y) / 2 - oldY }, layout, event.currentTarget.clientWidth, event.currentTarget.clientHeight)
    } else if (dragged.current) {
      view.current = clampView({ ...view.current, x: view.current.x + current.x - previous.x, y: view.current.y + current.y - previous.y }, layout, event.currentTarget.clientWidth, event.currentTarget.clientHeight)
    }
    controls.current?.redraw()
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.metaKey) return
    if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault()
      if (event.key === '0') controls.current?.fit()
      else controls.current?.zoom(event.key === '-' ? 1 / 1.4 : 1.4)
      return
    }
    const next = navigateWeek(layout, selection.current, event.key, event.ctrlKey)
    if (next === null) return
    event.preventDefault(); choose(next); controls.current?.reveal(next)
  }
  const cell = layout.cells[selected]
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-label="Calendar colors">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="life-calendar-chapter size-2.5 rounded-xs bg-current" />Chapters</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="life-calendar-memory size-2.5 rounded-xs bg-current" />Memories</span>
      </div>
      <div className="flex flex-wrap items-center gap-1" aria-label="Calendar view controls">
        <Button variant="outline" className="px-3 py-2 aria-pressed:bg-accent aria-pressed:text-accent-foreground" aria-label="Show year labels" aria-pressed={labels.years} onClick={() => setLabels(current => ({ ...current, years: !current.years }))}>Years</Button>
        <Button variant="outline" className="px-3 py-2 aria-pressed:bg-accent aria-pressed:text-accent-foreground" aria-label="Show month labels" aria-pressed={labels.months} onClick={() => setLabels(current => ({ ...current, months: !current.months }))}>Months</Button>
        <Button variant="outline" className="size-11 p-0" aria-label="Zoom out" onClick={() => controls.current?.zoom(1 / 1.4)}><Minus size={15} /></Button>
        <Button variant="outline" className="size-11 p-0" aria-label="Zoom in" onClick={() => controls.current?.zoom(1.4)}><Plus size={15} /></Button>
        <Button variant="outline" className="size-11 p-0" aria-label="Fit all 52 weeks" onClick={() => controls.current?.fit()}><Maximize2 size={15} /></Button>
        <Button variant="outline" className="size-11 p-0" aria-label="Go to current week" onClick={() => {
          const current = Math.max(0, Math.min(weeks.length - 1, Math.floor((today - weeks[0]) / 7)))
          choose(current); controls.current?.reveal(current, true); host.current?.focus({ preventScroll: true })
        }}><LocateFixed size={15} /></Button>
      </div>
    </div>
    <div ref={host} role="grid" tabIndex={0} aria-label="Life Calendar" aria-describedby={`${id}-help`} aria-rowcount={layout.rows.length} aria-colcount={WEEKS_PER_GROUP} aria-activedescendant={`${id}-selected`}
      className="life-calendar-viewport rounded-lg border border-border/20 bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onKeyDown={keyboard} onFocus={() => { focused.current = true; if (!pointers.current.size) controls.current?.reveal(selection.current); controls.current?.redraw() }} onBlur={() => { focused.current = false; controls.current?.redraw() }}
      onPointerDown={(event) => {
        if (event.button !== 0 || pointers.current.size >= 2) return
        const p = point(event)
        if (!pointers.current.size) dragged.current = false
        pointers.current.set(event.pointerId, { ...p, startX: p.x, startY: p.y })
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.focus({ preventScroll: true })
      }} onPointerMove={pointerMove} onPointerUp={(event) => {
        const p = point(event)
        if (!dragged.current && pointers.current.size === 1) choose(hit(p.x, p.y))
        pointers.current.delete(event.pointerId)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }} onPointerCancel={(event) => { pointers.current.delete(event.pointerId); dragged.current = true }} onLostPointerCapture={(event) => pointers.current.delete(event.pointerId)}>
      <canvas ref={canvas} aria-hidden="true" />
      <div className="sr-only" role="row" aria-rowindex={cell.row + 1}><span role="gridcell" id={`${id}-selected`} aria-colindex={cell.column + 1} aria-selected="true" aria-current={today >= weeks[selected] && today < weeks[selected] + 7 ? 'date' : undefined}>{formatWeekRange(weeks[selected])}</span></div>
    </div>
    <p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">Drag to pan; pinch or use + / − to zoom. Months are approximate guides for the selected row.<span className="sr-only">Each row contains 52 weeks in four blocks of 13, with larger gaps every ten rows. Arrow keys move between squares. Home and End move within a row. Control Home and Control End jump to the first and last week. Page Up and Page Down move ten rows. Press 0 to fit all 52 weeks. Tab moves to the selected week’s details. Year labels show actual date spans. The final row may be partial to preserve the full 90-year range.</span></p>
  </div>
}
