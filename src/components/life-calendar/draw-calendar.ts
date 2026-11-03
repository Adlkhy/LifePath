import { weekState } from '../../lib/life-calendar.ts'
import { CALENDAR_GUTTER, CALENDAR_HEADER, CELL_SIZE, type CalendarLayout, type CalendarView, type WeekItems } from '../../lib/life-calendar-model.ts'

export type CalendarPalette = { background: string; foreground: string; muted: string; primary: string; focus: string; chapter: string; memory: string; font: string }
export type CalendarScene = { layout: CalendarLayout; weeks: number[]; items: WeekItems[]; today: number; selected: number; showYears?: boolean; showMonths?: boolean }

export function drawCalendar(context: CanvasRenderingContext2D, scene: CalendarScene, view: CalendarView, palette: CalendarPalette, width: number, height: number, focused: boolean) {
  const { layout, weeks, items, today, selected, showYears = true, showMonths = true } = scene
  context.clearRect(0, 0, width, height)
  context.fillStyle = palette.background
  context.fillRect(0, 0, width, height)
  context.save()
  context.beginPath()
  context.rect(CALENDAR_GUTTER - 4, CALENDAR_HEADER, width - CALENDAR_GUTTER + 4, height - CALENDAR_HEADER)
  context.clip()
  context.translate(CALENDAR_GUTTER + view.x, CALENDAR_HEADER + view.y)
  context.scale(view.zoom, view.zoom)
  for (const row of layout.rows) {
    const screenY = CALENDAR_HEADER + view.y + row.y * view.zoom
    if (screenY < CALENDAR_HEADER - CELL_SIZE * view.zoom || screenY > height + 16) continue
    for (const index of row.indices) {
      const cell = layout.cells[index]
      const screenX = CALENDAR_GUTTER + view.x + cell.x * view.zoom
      if (screenX + CELL_SIZE * view.zoom < CALENDAR_GUTTER || screenX > width) continue
      const state = weekState(weeks[index], today)
      const hasChapter = items[index].chapters.length > 0
      const hasMemory = items[index].memories.length > 0
      const square = () => { context.beginPath(); context.roundRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE, 2) }
      square()
      if (hasChapter || hasMemory) {
        // A diagonal split retains both event types, including outlined future weeks.
        context.save(); context.clip()
        context.fillStyle = hasChapter ? palette.chapter : palette.memory
        context.fillRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE)
        if (hasChapter && hasMemory) {
          context.fillStyle = palette.memory
          context.beginPath(); context.moveTo(cell.x + CELL_SIZE, cell.y); context.lineTo(cell.x + CELL_SIZE, cell.y + CELL_SIZE); context.lineTo(cell.x, cell.y + CELL_SIZE); context.closePath(); context.fill()
        }
        if (state === 'future') {
          context.fillStyle = palette.background
          context.beginPath(); context.roundRect(cell.x + 1.3, cell.y + 1.3, CELL_SIZE - 2.6, CELL_SIZE - 2.6, 1); context.fill()
        }
        context.restore()
      } else if (state === 'future') {
        context.globalAlpha = 0.28; context.strokeStyle = palette.muted; context.lineWidth = 0.9; context.stroke(); context.globalAlpha = 1
      } else {
        context.globalAlpha = state === 'current' ? 1 : 0.5
        context.fillStyle = state === 'current' ? palette.primary : palette.muted; context.fill(); context.globalAlpha = 1
      }
      if (state === 'current') {
        // A contrasting halo and solid ring remain visible over either/both colors.
        const inset = 1.5 / view.zoom
        context.beginPath(); context.roundRect(cell.x - inset, cell.y - inset, CELL_SIZE + inset * 2, CELL_SIZE + inset * 2, 3)
        context.lineWidth = 2 / view.zoom; context.strokeStyle = palette.background; context.stroke()
        context.lineWidth = 1 / view.zoom; context.strokeStyle = palette.primary; context.stroke()
      }
      if (index === selected) {
        const inset = (state === 'current' ? 3 : 1.5) / view.zoom
        context.beginPath(); context.roundRect(cell.x - inset, cell.y - inset, CELL_SIZE + inset * 2, CELL_SIZE + inset * 2, 3)
        context.lineWidth = (focused ? 2 : 1.5) / view.zoom
        context.strokeStyle = palette.focus; context.stroke()
      }
    }
  }
  context.restore()
  // Month names are approximate column guides for the selected row. Keep them
  // above the dense squares instead of inserting label gaps between rows.
  context.font = `10px ${palette.font}`
  context.textBaseline = 'middle'
  context.fillStyle = palette.muted
  if (showMonths) {
    const selectedRow = layout.cells[selected]?.row ?? 0
    const group = layout.groups[selectedRow]
    context.textAlign = 'center'
    let previousRight = CALENDAR_GUTTER - 4
    for (const month of group?.months ?? []) {
      const x = CALENDAR_GUTTER + view.x + month.x * view.zoom
      const halfWidth = 10
      if (x - halfWidth < previousRight + 3 || x + halfWidth > width - 4) continue
      context.fillText(month.label, x, CALENDAR_HEADER / 2)
      previousRight = x + halfWidth
    }
  }
  for (const group of layout.groups) {
    const top = CALENDAR_HEADER + view.y + group.y * view.zoom
    const center = top + CELL_SIZE / 2 * view.zoom
    const selectedRow = layout.cells[selected]?.row === group.index
    if (view.zoom < 0.8 && group.index % 5 !== 0 && !selectedRow) continue
    if (showYears && center >= CALENDAR_HEADER && center < height - 4) {
      context.textAlign = 'left'
      context.font = `${group.decade || selectedRow ? '600' : '400'} 9px ${palette.font}`
      context.fillStyle = group.decade || selectedRow ? palette.foreground : palette.muted
      context.fillText(group.label, 5, center)
    }
  }
}
