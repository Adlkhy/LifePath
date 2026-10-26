import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Check, Compass, Sparkles, Star } from 'lucide-react'

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M10 6v20h15M10 19 24 5M15 5h9v9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
}

const stickerIcons = { arrow: ArrowUpRight, check: Check, compass: Compass, spark: Sparkles, star: Star }
export function Sticker({ kind, className = '' }: { kind: keyof typeof stickerIcons; className?: string }) {
  const reduced = useReducedMotion()
  const Icon = stickerIcons[kind]
  return <motion.span aria-hidden="true" data-micro-motion="" className={`sticker sticker-${kind} ${className}`} whileHover={reduced ? undefined : { scale: 1.07, rotate: 6 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}><Icon strokeWidth={1.5} /></motion.span>
}

/** Static, scalable tube artwork. Solid-color contours and grain keep UI surfaces gradient-free. */
export function BlueRibbon({ className = '' }: { className?: string }) {
  const id = useId().replaceAll(':', '')
  const path = 'M-120 420C80 530 265 435 240 250C215 70 40 100 75 265C110 435 415 475 700 265C975 60 1140 65 1185 210C1240 390 980 460 990 280C1000 95 1260 90 1490 200'
  return <svg className={`blue-ribbon ${className}`} viewBox="0 0 1440 600" fill="none" aria-hidden="true" focusable="false">
    <defs><filter id={`grain-${id}`} x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComposite in2="SourceGraphic" operator="in" /><feBlend in="SourceGraphic" mode="soft-light" /></filter></defs>
    <g strokeLinecap="round" filter={`url(#grain-${id})`}>
      <path d={path} stroke="#2677d5" strokeWidth="94" />
      <path d={path} stroke="#358bee" strokeWidth="82" transform="translate(0 -5)" />
      <path d={path} stroke="#4da2ff" strokeWidth="66" transform="translate(0 -10)" />
      <path d={path} stroke="#73b7ff" strokeWidth="43" transform="translate(0 -17)" />
      <path d={path} stroke="#96c9ff" strokeWidth="19" transform="translate(0 -22)" />
    </g>
  </svg>
}
