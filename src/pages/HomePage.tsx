import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Flag, Route, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MotionAnchor, MotionCard, MotionLink } from '../components/ui/motion'
import { useMicroMotion } from '../hooks/use-micro-motion'
import { BlueRibbon, BrandMark, Sticker } from '../components/shared/Brand'
import { Button } from '../components/ui/button'

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const interaction = useMicroMotion()
  const reduced = useReducedMotion()
  return <div className="public-theme home-page">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="site-topbar">
      <header className="site-nav">
        <MotionLink to="/" className="brand-link" aria-label="Lifepath home"><BrandMark /><span>lifepath</span></MotionLink>
        <nav className="desktop-nav" aria-label="Main navigation"><MotionAnchor className="nav-pill" href="#possibilities">The possibilities</MotionAnchor><MotionAnchor className="nav-pill" href="#your-path">Your next chapter</MotionAnchor></nav>
        <div className="nav-actions"><MotionLink to="/sign-in" className="nav-pill sign-in-link">Sign in</MotionLink><Button render={<Link to="/app" />}>Open Lifepath <ArrowUpRight size={17} /></Button><motion.button {...interaction} className="menu-toggle nav-pill" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? '−' : '+'}</motion.button></div>
        {menuOpen && <motion.nav initial={reduced ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.18 }} data-micro-motion="" id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation"><MotionAnchor className="nav-pill" href="#possibilities" onClick={() => setMenuOpen(false)}>The possibilities</MotionAnchor><MotionAnchor className="nav-pill" href="#your-path" onClick={() => setMenuOpen(false)}>Your next chapter</MotionAnchor><MotionLink className="nav-pill" to="/sign-in">Sign in</MotionLink></motion.nav>}
      </header>
    </div>
    <main id="main-content">
      <section className="hero-poster" aria-labelledby="hero-heading">
        <div className="hero-kicker eyebrow"><span className="tiny-star">✳</span> A LITTLE DIRECTION. A LOT OF POSSIBILITY.</div>
        <BlueRibbon className="hero-ribbon" />
        <div className="hero-title-wrap"><h1 id="hero-heading" className="display-type hero-title">YOUR LIFE.<br />YOUR WAY.</h1><Sticker kind="star" className="hero-star" /><Sticker kind="arrow" className="hero-arrow" /><Sticker kind="compass" className="hero-compass" /><span className="word-sticker hero-note">a work in progress ♡</span></div>
        <div className="hero-copy"><p>Big dreams meet small, doable steps.<br />Make room for the life you want to live.</p><Button className="hero-cta" render={<Link to="/sign-up" />}>Start your journey <ArrowUpRight size={20} /></Button><span className="hero-caption">Your goals. Your pace. Your Lifepath.</span></div>
        <div className="poster-bottom"><span>PLAN A LITTLE. LIVE A LOT.</span><MotionAnchor href="#possibilities">There’s more to your story <ArrowDown size={16} /></MotionAnchor><span>01 / THE BEGINNING</span></div>
      </section>

      <section id="possibilities" className="possibilities-section" aria-labelledby="possibilities-heading">
        <div className="section-intro"><p className="eyebrow">A PLACE FOR THE BIG PICTURE</p><span className="section-index">02 / THE POSSIBILITIES</span></div>
        <div className="possibilities-heading"><h2 id="possibilities-heading" className="display-type">DREAM IT.<br />MAKE A MOVE.</h2><Sticker kind="spark" /><p>Life doesn’t follow a straight line.<br />Give your ideas a home, find your next step,<br className="desktop-break" /> and see how it all connects.</p></div>
        <div className="feature-collage">
          <MotionCard className="feature-card chapter-card"><div className="feature-label"><span>01 / CHAPTERS</span><BookOpen size={22} /></div><div className="chapter-art" aria-hidden="true"><span>THE NEXT</span><strong>CHAPTER</strong><span>begins with you.</span><Sparkles /></div><h3>Turn the page.</h3><p>A fresh start, a new season, a different direction. Build chapters around what matters to you.</p><MotionLink to="/app/chapters">Explore your chapters <ArrowUpRight size={18} /></MotionLink></MotionCard>
          <MotionCard className="feature-card goals-card"><div className="feature-label"><span>02 / GOALS & QUESTS</span><Flag size={22} /></div><div className="quest-art" aria-hidden="true"><span><i>01</i> Dream something big <span>↗</span></span><span><i>02</i> Find a small first step <span>↗</span></span><span><i>03</i> Make it happen <span>✳</span></span></div><h3>Small steps. Big things.</h3><p>Break your ambitions into goals, milestones, and quests. Give today a little direction.</p><MotionLink to="/app/goals">Find your next step <ArrowUpRight size={18} /></MotionLink><Sticker kind="check" /></MotionCard>
          <MotionCard className="feature-card map-card"><div className="feature-label"><span>03 / LIFE MAP</span><Route size={22} /></div><div className="map-art" aria-hidden="true"><svg viewBox="0 0 300 150"><path d="M150 30V75M60 110V75H240V110" fill="none" stroke="black" strokeWidth="1.5" /></svg><span className="map-dream">The big dream ✳</span><span className="map-step-one">A first step</span><span className="map-step-two">What’s next ↗</span></div><h3>Connect the dots.</h3><p>See how your goals fit together. Map the possibilities and discover a path that feels like yours.</p><MotionLink to="/app/map">See the bigger picture <ArrowUpRight size={18} /></MotionLink></MotionCard>
        </div>
        <div className="reflection-note"><span className="reflection-symbol" aria-hidden="true">✳</span><p>And don’t forget the good bits.<br /><span>Save memories and reflections along the way.</span></p><MotionLink className="nav-pill" to="/app/journey">Meet your journey <ArrowRight size={17} /></MotionLink></div>
      </section>

      <section id="your-path" className="next-chapter-section" aria-labelledby="next-heading"><div className="section-intro"><p className="eyebrow">NO PERFECT PLAN REQUIRED</p><span className="section-index">03 / WHAT’S NEXT</span></div><BlueRibbon className="closing-ribbon" /><div className="closing-title"><h2 id="next-heading" className="display-type">GOOD THINGS<br />START HERE.</h2><Sticker kind="check" /><Sticker kind="star" /></div><div className="closing-copy"><p>You don’t need to have it all figured out.<br />Just a little curiosity, and a first step.</p><Button render={<Link to="/sign-up" />}>Let’s see where you go <ArrowUpRight size={20} /></Button></div><footer className="site-footer"><MotionLink to="/" className="brand-link"><BrandMark /><span>lifepath</span></MotionLink><span>A life in progress is a life well lived.</span><MotionAnchor href="#main-content" className="nav-pill">Back to top ↑</MotionAnchor></footer></section>
    </main>
  </div>
}
