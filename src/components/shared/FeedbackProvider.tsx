import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FeedbackContext } from '../../state/feedback-context'
import { Button } from '../ui/button'

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [notice, setNotice] = useState<{ message: string; id: number } | null>(null)
  const notify = useCallback((message: string) => setNotice({ message, id: Date.now() }), [])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 7000)
    return () => window.clearTimeout(timer)
  }, [notice])
  return <FeedbackContext.Provider value={notify}>{children}<div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)]" role="status" aria-live="polite" aria-atomic="true"><AnimatePresence initial={false}>{notice && <motion.div key={notice.id} data-micro-motion="" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 6 }} transition={{ duration: reduced ? 0 : 0.18 }} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border bg-popover p-4 text-popover-foreground"><p className="wrap-break-word text-sm">{notice.message}</p><Button variant="outline" onClick={() => setNotice(null)} aria-label="Dismiss notification">Close</Button></motion.div>}</AnimatePresence></div></FeedbackContext.Provider>
}
