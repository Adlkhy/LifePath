import { useEffect, useState } from 'react'
import { todayKey } from '../lib/lifepath'

// Recheck at local midnight and when a suspended tab becomes active again.
export function useLocalDay() {
  const [day, setDay] = useState(() => todayKey())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function update() {
      clearTimeout(timer)
      const now = new Date()
      setDay(todayKey(now))
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(update, Math.min(midnight.getTime() - now.getTime() + 50, 60_000))
    }
    update()
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { clearTimeout(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return day
}
