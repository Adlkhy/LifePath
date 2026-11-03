import type { Chapter, Memory } from '../types/database'
import { calendarDay } from './life-calendar.ts'

export type WeekItems = { chapters: Chapter[]; memories: Memory[] }
export type CalendarCell = { index: number; row: number; column: number; month: number; x: number; y: number }
export type CalendarRow = { group: number; y: number; indices: number[] }
export type CalendarGroup = { index: number; y: number; label: string; decade: boolean; indices: number[]; months: { x: number; label: string }[] }
export type CalendarLayout = { cells: CalendarCell[]; rows: CalendarRow[]; groups: CalendarGroup[]; width: number; height: number }
export type CalendarView = { x: number; y: number; zoom: number }

export const CELL_SIZE = 9
export const CELL_PITCH = 12
export const BLOCKS_PER_GROUP = 4
export const WEEKS_PER_BLOCK = 13
export const WEEKS_PER_GROUP = BLOCKS_PER_GROUP * WEEKS_PER_BLOCK
export const BLOCK_PITCH = WEEKS_PER_BLOCK * CELL_PITCH + 12
export const GROUP_PITCH = CELL_PITCH
export const CALENDAR_GUTTER = 60
export const CALENDAR_HEADER = 32
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Membership uses the real seven-day interval, including both chapter endpoints. */
export function indexWeekItems(weeks: number[], chapters: Chapter[], memories: Memory[], today: number): WeekItems[] {
  const items = weeks.map(() => ({ chapters: [] as Chapter[], memories: [] as Memory[] }))
  if (!weeks.length) return items
  for (const chapter of chapters) {
    const start = chapter.start_date ? calendarDay(chapter.start_date) : null
    if (start === null) continue
    // An unknown end is not an invented lifetime: only active chapters extend
    // through today; other undated endings mark the known start day alone.
    const end = chapter.end_date ? calendarDay(chapter.end_date) : chapter.status === 'active' ? today : start
    if (end === null || end < start) continue
    const first = Math.max(0, Math.floor((start - weeks[0]) / 7))
    const last = Math.min(weeks.length - 1, Math.floor((end - weeks[0]) / 7))
    for (let index = first; index <= last; index++) items[index].chapters.push(chapter)
  }
  for (const memory of memories) {
    const day = calendarDay(memory.memory_date)
    if (day === null) continue
    const index = Math.floor((day - weeks[0]) / 7)
    if (index >= 0 && index < weeks.length) items[index].memories.push(memory)
  }
  return items
}

/** Each row has four horizontal blocks of 13 consecutive weeks.
 * Keep the final partial group so the full birthday-based 90-year span survives. */
export function calendarLayout(weeks: number[]): CalendarLayout {
  const rows: CalendarRow[] = []
  const cells: CalendarCell[] = []
  const groups: CalendarGroup[] = []
  let monthStartX = 0
  let previousMonth = -1
  weeks.forEach((start, index) => {
    const date = new Date(start * 86_400_000)
    const month = date.getUTCMonth()
    const groupIndex = Math.floor(index / WEEKS_PER_GROUP)
    const offset = index % WEEKS_PER_GROUP
    const column = offset
    const row = groupIndex
    const groupY = 8 + groupIndex * GROUP_PITCH + Math.floor(groupIndex / 10) * 12
    if (offset === 0) {
      const firstYear = date.getUTCFullYear()
      const lastYear = new Date((weeks[Math.min(index + WEEKS_PER_GROUP - 1, weeks.length - 1)] + 6) * 86_400_000).getUTCFullYear()
      const label = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${String(lastYear).slice(-2)}`
      groups.push({ index: groupIndex, y: groupY, label, decade: groupIndex % 10 === 0, indices: [], months: [] })
    }
    const y = groupY
    const x = Math.floor(column / WEEKS_PER_BLOCK) * BLOCK_PITCH + column % WEEKS_PER_BLOCK * CELL_PITCH
    if (!rows[row]) rows[row] = { group: groupIndex, y, indices: [] }
    cells.push({ index, row, column, month, x, y })
    rows[row].indices.push(index)
    groups[groupIndex].indices.push(index)
    if (offset === 0 || month !== previousMonth) {
      monthStartX = x
      groups[groupIndex].months.push({ x: x + CELL_SIZE / 2, label: MONTH_LABELS[month] })
    } else {
      groups[groupIndex].months.at(-1)!.x = (monthStartX + x + CELL_SIZE) / 2
    }
    previousMonth = month
  })
  return { cells, rows, groups, width: (BLOCKS_PER_GROUP - 1) * BLOCK_PITCH + (WEEKS_PER_BLOCK - 1) * CELL_PITCH + CELL_SIZE, height: (rows.at(-1)?.y ?? 0) + CELL_SIZE + 12 }
}

/** Binary row lookup then one year's cells, regardless of the 90-year span. */
export function hitWeek(layout: CalendarLayout, x: number, y: number): number | null {
  if (x < 0 || x >= layout.width || y < 0) return null
  let low = 0
  let high = layout.rows.length - 1
  while (low <= high) {
    const middle = (low + high) >>> 1
    const row = layout.rows[middle]
    if (y < row.y) high = middle - 1
    else if (y > row.y + CELL_SIZE) low = middle + 1
    else {
      const block = Math.floor(x / BLOCK_PITCH)
      const withinBlock = x - block * BLOCK_PITCH
      const slot = Math.floor(withinBlock / CELL_PITCH)
      if (slot >= WEEKS_PER_BLOCK || withinBlock - slot * CELL_PITCH > CELL_SIZE) return null
      return row.indices[block * WEEKS_PER_BLOCK + slot] ?? null
    }
  }
  return null
}

export function navigateWeek(layout: CalendarLayout, selected: number, key: string, control = false): number | null {
  const cell = layout.cells[selected]
  if (!cell) return null
  const row = layout.rows[cell.row]
  if (key === 'Home') return control ? 0 : row.indices[0]
  if (key === 'End') return control ? layout.cells.length - 1 : row.indices.at(-1)!
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const column = Math.max(0, Math.min(row.indices.length - 1, row.indices.indexOf(selected) + (key === 'ArrowLeft' ? -1 : 1)))
    return row.indices[column]
  }
  const delta = ({ ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 } as Record<string, number>)[key]
  if (delta === undefined) return null
  const targetRow = layout.rows[Math.max(0, Math.min(layout.rows.length - 1, cell.row + delta))]
  return targetRow.indices.reduce((closest, index) => Math.abs(layout.cells[index].x - cell.x) < Math.abs(layout.cells[closest].x - cell.x) ? index : closest)
}

export function clampView(view: CalendarView, layout: CalendarLayout, width: number, height: number): CalendarView {
  const availableWidth = Math.max(1, width - CALENDAR_GUTTER - 8)
  const availableHeight = Math.max(1, height - CALENDAR_HEADER - 8)
  const zoom = Math.max(Math.min(1, availableWidth / layout.width), Math.min(3, view.zoom))
  return { zoom, x: Math.max(Math.min(0, availableWidth - layout.width * zoom), Math.min(0, view.x)), y: Math.max(Math.min(0, availableHeight - layout.height * zoom), Math.min(0, view.y)) }
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
export function formatCalendarDate(value: string): string {
  const day = calendarDay(value)
  return day === null ? value : dateFormatter.format(new Date(day * 86_400_000))
}
