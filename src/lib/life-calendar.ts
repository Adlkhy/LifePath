export const LIFE_CALENDAR_YEARS = 90

const DAY_MS = 86_400_000

// UTC is only a container for Gregorian calendar dates, never a user's instant.
// Integer day numbers keep week arithmetic independent of timezones and DST.
export function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime() / DAY_MS
}

export function localDate(now = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function validateBirthday(value: string | null, today = localDate()): void {
  if (value === null) return
  const day = calendarDay(value)
  if (day === null) throw new Error('Enter a valid birthday.')
  if (day > calendarDay(today)!) throw new Error('Birthday cannot be in the future.')
}

export function lifeWeeks(birthday: string) {
  const start = calendarDay(birthday)
  if (start === null) throw new Error('Enter a valid birthday.')
  const anniversary = new Date(start * DAY_MS)
  const month = anniversary.getUTCMonth()
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + LIFE_CALENDAR_YEARS)
  // A February 29 anniversary falls on February 28 in a non-leap year.
  if (anniversary.getUTCMonth() !== month) anniversary.setUTCDate(0)
  // Include every week that starts before the anniversary, keeping the last
  // period a full seven days (it may end up to six days after the anniversary).
  const count = Math.ceil((anniversary.getTime() / DAY_MS - start) / 7)
  return Array.from({ length: count }, (_, index) => start + index * 7)
}

export function weekState(start: number, today: number): 'past' | 'current' | 'future' {
  return today < start ? 'future' : today < start + 7 ? 'current' : 'past'
}

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })

export function formatWeekRange(start: number): string {
  const first = new Date(start * DAY_MS)
  const last = new Date((start + 6) * DAY_MS)
  const firstMonth = monthName.format(first)
  const lastMonth = monthName.format(last)
  if (first.getUTCFullYear() !== last.getUTCFullYear()) {
    return `${first.getUTCDate()} ${firstMonth}, ${first.getUTCFullYear()} - ${last.getUTCDate()} ${lastMonth}, ${last.getUTCFullYear()}`
  }
  if (first.getUTCMonth() !== last.getUTCMonth()) {
    return `${first.getUTCDate()} ${firstMonth} - ${last.getUTCDate()} ${lastMonth}, ${last.getUTCFullYear()}`
  }
  return `${first.getUTCDate()}-${last.getUTCDate()} ${firstMonth}, ${first.getUTCFullYear()}`
}
