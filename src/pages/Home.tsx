// src/pages/Home.tsx
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { useListRenderWarning } from '../hooks/useListRenderWarning'
import { useResolvedMedia } from '../hooks/useMedia'
import { DEFAULT_TECH_SKILLS, type TechSkill } from '../data/content'
import { auth, db } from '../lib/firebase'
import TechIcon, { getTechBrandTint } from '../components/TechIcon'

import PageMeta from '../components/PageMeta'
import GuestbookCard, { type GuestbookEntry } from '../components/GuestbookCard'

const GlobeCanvas = lazy(() => import('../components/GlobeCanvas'))

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ICON_MAP: Record<string, JSX.Element> = {
  chat: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  gear: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  eye: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  code: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
}

const glass = 'rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-surface/60 dark:bg-surface/40 backdrop-blur-md'

type HomeEducationEntry = { institution: string; subtitle: string; yearRange: string; description: string; visible?: boolean }

function ScrollReveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// â”€â”€â”€ Bento sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PakistanClock({ compact = false }: { compact?: boolean }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  if (compact) return <span className="font-mono tabular-nums text-muted dark:text-foreground">{time || '--:--:--'}</span>
  return (
    <div className={`${glass} p-5 flex flex-col items-center justify-center gap-1`}>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Lahore, Pakistan</span>
      <span className="text-2xl font-bold font-mono text-foreground dark:text-foreground tabular-nums">{time || '--:--:--'}</span>
      <span className="text-[10px] text-muted">PKT (UTC+5)</span>
    </div>
  )
}

function CopyEmailCard({ email, copyLabel, copiedLabel }: { email: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }
  return (
    <button onClick={copy} className={`${glass} p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/40 transition-colors w-full text-center`}>
      <svg className="h-5 w-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
      <span className="text-xs font-mono text-muted truncate max-w-full">{email}</span>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${copied ? 'text-green-700' : 'text-accent-foreground'}`}>{copied ? copiedLabel : copyLabel}</span>
    </button>
  )
}

function SocialPill({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="me noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-muted dark:text-muted hover:border-brand hover:text-accent-foreground transition-colors">
      {label} <span className="text-accent-foreground">â†—</span>
    </a>
  )
}

type HomeProject = SiteContent['portfolio']['projects'][number]

function HomeBentoCard({ children, className = '', delay = 0, reducedMotion }: {
  children: React.ReactNode
  className?: string
  delay?: number
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      data-hover-list="home-bento"
      className={`hover-card rounded-3xl border border-neutral-200/70 bg-surface/65 p-6 shadow-sm backdrop-blur-xl dark:border-neutral-800/70 dark:bg-surface/50 ${className}`}
    >
      {children}
    </motion.div>
  )
}

function HomeMedia({ src, alt, className = '', width, height }: { src: string; alt: string; className?: string; width?: number; height?: number }) {
  const image = useResolvedMedia(src, '')
  if (!image) return null
  return <img src={image} alt={alt} width={width} height={height} loading="lazy" className={className} />
}

function HomePhotoStack({ photos, name }: { photos: string[]; name: string }) {
  const visiblePhotos = photos.filter(Boolean).slice(0, 3)
  return (
    <div className="relative mx-auto h-[220px] w-full max-w-[360px]" aria-label={`${name} photo gallery`}>
      {visiblePhotos.length > 0 ? visiblePhotos.map((src, index) => {
        const offsets = [0, -42, 42]
        const angles = [2, -9, 9]
        return (
          <div
            key={`${src}-${index}`}
            className="absolute left-1/2 top-2 h-[196px] w-[148px] overflow-hidden rounded-2xl border-[5px] border-border bg-surface shadow-xl dark:border-neutral-100"
            style={{ zIndex: visiblePhotos.length - index, transform: `translateX(calc(-50% + ${offsets[index]}px)) rotate(${angles[index]}deg)` }}
          >
            <HomeMedia src={src} alt={`${name} portrait`} className="h-full w-full rounded-xl object-cover object-top" />
          </div>
        )
      }) : (
        <div className="absolute left-1/2 top-2 h-[196px] w-[148px] -translate-x-1/2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-100/60 dark:border-neutral-700 dark:bg-neutral-800/50" />
      )}
    </div>
  )
}

function LazyGlobe({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) { setShouldLoad(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setShouldLoad(true)
        observer.disconnect()
      }
    }, { rootMargin: '160px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <Suspense fallback={<div className="h-full w-full rounded-full bg-brand/5" />}>
          <GlobeCanvas className="h-full min-h-[300px] w-full" />
        </Suspense>
      ) : <div className="h-full w-full rounded-full bg-brand/5" />}
    </div>
  )
}

function HomeSocialIcon({ label }: { label: string }) {
  const props = { className: 'h-[18px] w-[18px]', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const }
  switch (label.toLowerCase()) {
    case 'github': return <svg {...props}><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.64-1.24-1.64-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.29-2.61 5.23-5.1 5.5.4.35.76 1.02.76 2.06v3.1c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
    case 'linkedin': return <svg {...props}><path d="M5.2 7.8a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8ZM3.6 9.3h3.2v10.9H3.6zM9 9.3h3.1v1.5h.05a3.4 3.4 0 0 1 3.06-1.68c3.27 0 3.88 2.15 3.88 4.95v6.13h-3.22v-5.43c0-1.3-.02-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86v5.53H9z" /></svg>
    case 'x': return <svg {...props}><path d="M18.9 2.25h2.9l-6.34 7.25L22.9 21.75h-5.8l-4.55-6.4-5.6 6.4h-2.9l6.78-7.75L3.8 2.25h5.95l4.11 5.78zm-1.02 17.1h1.6L8.88 4.5H7.16z" /></svg>
    case 'facebook': return <svg {...props}><path d="M13.5 21v-8.2h2.75l.41-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14c-.3-.04-1.33-.14-2.53-.14-2.5 0-4.22 1.52-4.22 4.32V9.6H7.2v3.2h2.85V21z" /></svg>
    case 'instagram': return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>
    case 'whatsapp': return <svg {...props}><path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.5 23.5l5.9-1.5A11.8 11.8 0 0 0 20.5 3.5ZM12 21a9.5 9.5 0 0 1-4.8-1.3l-.3-.2-3.5.9.9-3.4-.2-.4A9.5 9.5 0 1 1 12 21Zm5.2-7.1c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-.9 1.1-.3.2-.6.1a7.8 7.8 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.2-.5c.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.2 3.2 1.4 3.4a14.5 14.5 0 0 0 5.6 4.9c.8.3 1.4.5 1.9.6.8.1 1.6.1 2.1-.1.7-.2 1.7-.7 1.9-1.4s.2-1.3.2-1.4-.3-.3-.6-.5Z" /></svg>
    default: return <svg {...props}><path d="M10.6 13.4a1 1 0 0 0 1.4 0l4.7-4.7a3 3 0 0 0-4.2-4.2l-2.7 2.7-1.4-1.4 2.7-2.7a5 5 0 0 1 7.1 7.1l-4.7 4.7a3 3 0 0 1-4.2 0zM13.4 10.6a1 1 0 0 0-1.4 0l-4.7 4.7a3 3 0 0 0 4.2 4.2l2.7-2.7 1.4 1.4-2.7 2.7a5 5 0 0 1-7.1-7.1l4.7-4.7a3 3 0 0 1 4.2 0z" /></svg>
  }
}

function PakistanAnalogClock({ label }: { label: string }) {
  const readTime = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date())
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0)
    return { hour: value('hour'), minute: value('minute'), second: value('second') }
  }
  const [time, setTime] = useState(readTime)
  useEffect(() => {
    const timer = setInterval(() => setTime(readTime()), 1000)
    return () => clearInterval(timer)
  }, [])
  const hourAngle = (time.hour % 12) * 30 + time.minute * 0.5
  const minuteAngle = time.minute * 6 + time.second * 0.1
  const secondAngle = time.second * 6
  return (
    <div className="flex items-center justify-between gap-4 border-t border-neutral-200/70 pt-5 dark:border-neutral-800/70">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</span>
      <svg viewBox="0 0 100 100" className="h-20 w-20 text-muted dark:text-muted" role="img" aria-label={`Pakistan time ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
        {Array.from({ length: 12 }, (_, index) => <line key={index} x1="50" y1="9" x2="50" y2={index % 3 === 0 ? '15' : '12'} stroke="currentColor" strokeOpacity=".65" strokeWidth={index % 3 === 0 ? '2' : '1'} transform={`rotate(${index * 30} 50 50)`} />)}
        <line x1="50" y1="50" x2="50" y2="29" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
        <line x1="50" y1="54" x2="50" y2="14" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${secondAngle} 50 50)`} />
        <circle cx="50" cy="50" r="3" fill="var(--accent)" />
      </svg>
    </div>
  )
}

function SelectedWorkRow({ project, index, viewLabel, reducedMotion }: { project: HomeProject; index: number; viewLabel: string; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.45, delay: Math.min(index * 0.06, 0.24), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to="/work" data-hover-list="home-selected-projects" className="hover-card hover-white group flex min-h-28 items-center gap-4 rounded-3xl border border-transparent px-4 py-5 transition-colors duration-[250ms] hover:bg-neutral-900 dark:hover:bg-surface sm:px-7 md:min-h-36 md:gap-8">
        <span className="w-8 shrink-0 font-mono text-xs text-muted md:text-sm">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-instrument-serif text-3xl italic leading-tight text-foreground transition-colors duration-[250ms] group-hover:text-foreground dark:text-foreground dark:group-hover:text-muted sm:text-4xl md:text-6xl">{project.title}</h3>
          <p className="mt-1 truncate text-sm text-muted transition-colors duration-[250ms] group-hover:text-muted dark:text-muted dark:group-hover:text-muted">{project.desc}</p>
        </div>
        <span className="work-project-view hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted transition-opacity duration-[250ms] group-hover:opacity-100 sm:block sm:opacity-0">{viewLabel}</span>
        <span aria-hidden="true" className="hover-card-arrow flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-surface-inverse transition-colors duration-[250ms] group-hover:bg-neutral-200 group-hover:text-inverse-foreground dark:bg-neutral-800 dark:text-surface-inverse dark:group-hover:bg-neutral-800 dark:group-hover:text-inverse-foreground md:h-[68px] md:w-[68px]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </span>
      </Link>
    </motion.div>
  )
}

// â”€â”€â”€ Section wrapper that auto-hides when empty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Section({ show = true, children, className = '', bg }: { show?: boolean; children: React.ReactNode; className?: string; bg?: boolean }) {
  if (!show) return null
  return (
    <section className={bg ? `bg-neutral-50 dark:bg-surface/50 border-y border-neutral-200 dark:border-neutral-800` : ''}>
      <div className={`w-full px-5 md:px-10 ${className}`}>{children}</div>
    </section>
  )
}

function SectionHead({ tag, title, lead, accent }: { tag: string; title: string; lead?: string; accent?: string }) {
  // If accent word is in title, wrap it in italic serif
  let titleNode: React.ReactNode = title
  if (accent && title.includes(accent)) {
    const parts = title.split(accent)
    titleNode = <>{parts[0]}<span className="italic font-serif text-accent-foreground">{accent}</span>{parts.slice(1).join(accent)}</>
  }
  return (
    <ScrollReveal className="text-center mb-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-2">{tag}</p>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground dark:text-foreground">{titleNode}</h2>
      {lead && <p className="mt-2 text-muted dark:text-muted">{lead}</p>}
    </ScrollReveal>
  )
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SKILL_CATEGORIES = ['All', 'Languages', 'AI/ML', 'Web', 'Backend', 'Databases & Cloud', 'Tools']

function rgba(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const expanded = value.length === 3 ? value.split('').map(char => char + char).join('') : value
  const red = parseInt(expanded.slice(0, 2), 16)
  const green = parseInt(expanded.slice(2, 4), 16)
  const blue = parseInt(expanded.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function TechSkillCloud({ heading, accent, skills }: { heading: string; accent: string; skills: TechSkill[] }) {
  const reducedMotion = useReducedMotion() ?? false
  const [activeCategory, setActiveCategory] = useState('All')
  const visibleSkills = skills.filter(skill => skill.visible !== false && skill.name.trim().length > 0)
  const filteredSkills = activeCategory === 'All'
    ? visibleSkills
    : visibleSkills.filter(skill => skill.category === activeCategory)
  const title = heading.trim() || 'The Magic Behind'
  const accentWord = accent.trim() || 'Behind'
  const accentIndex = title.indexOf(accentWord)
  const titleNode = accentIndex >= 0
    ? <>{title.slice(0, accentIndex)}<span className="font-instrument-serif text-[1.18em] font-normal italic text-accent-foreground dark:bg-gradient-to-r dark:from-orange-400 dark:via-pink-400 dark:to-purple-400 dark:bg-clip-text dark:text-transparent">{accentWord}</span>{title.slice(accentIndex + accentWord.length)}</>
    : title

  return (
    <section aria-labelledby="home-skills-heading" className="relative isolate w-full overflow-hidden bg-background py-20 md:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span
          className="absolute left-1/2 top-[2%] h-[240px] w-[240px] -translate-x-1/2 rounded-full blur-[80px] md:h-[420px] md:w-[420px] md:-translate-x-[75%]"
          style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, rgba(37, 99, 235, 0) 72%)' }}
        />
        <span
          className="absolute left-1/2 top-[9%] h-[240px] w-[240px] -translate-x-1/2 rounded-full blur-[80px] md:top-[10%] md:h-[420px] md:w-[420px] md:-translate-x-[25%]"
          style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 72%)' }}
        />
      </div>
      <div className="relative z-10 mx-auto w-full px-5 md:px-10">
        <ScrollReveal className="mb-9 text-center md:mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">MY SKILLSET</p>
          <h2 id="home-skills-heading" className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">{titleNode}</h2>
        </ScrollReveal>

        <div className="mb-8 flex flex-wrap justify-center gap-2.5" role="group" aria-label="Filter skills by category">
          {SKILL_CATEGORIES.map(category => (
            <button
              key={category}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 ${activeCategory === category ? 'border-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-foreground' : 'border-border/15 bg-surface/[0.04] text-muted hover:border-border/30 hover:text-foreground'}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-wrap justify-center gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredSkills.map((skill, index) => {
              const name = skill.name.trim()
              const iconName = skill.icon?.trim() || name
              const defaultSkill = DEFAULT_TECH_SKILLS.find(item => item.name.toLowerCase() === name.toLowerCase())
              const url = skill.url?.trim() || defaultSkill?.url?.trim() || ''
              const externalUrl = /^https?:\/\//i.test(url) ? url : undefined
              const brandColor = getTechBrandTint(iconName)
              const chipColor = brandColor
              const chipStyle = {
                borderColor: rgba(chipColor, 0.25),
                backgroundImage: `linear-gradient(135deg, ${rgba(chipColor, 0.08)}, ${rgba(chipColor, 0.035)})`,
              }
              const motionProps = {
                layout: !reducedMotion,
                initial: reducedMotion ? false : { opacity: 0, y: 12 },
                whileInView: reducedMotion ? undefined : { opacity: 1, y: 0 },
                viewport: { once: true, amount: 0.1 },
                exit: reducedMotion ? undefined : { opacity: 0, y: 8 },
                transition: reducedMotion ? { duration: 0 } : { delay: index * 0.03, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                whileHover: reducedMotion ? undefined : { y: -3, borderColor: brandColor, boxShadow: `0 8px 24px ${rgba(brandColor, 0.28)}` },
                whileFocus: reducedMotion ? undefined : { y: -3, borderColor: brandColor, boxShadow: `0 8px 24px ${rgba(brandColor, 0.28)}` },
                style: chipStyle,
              }
              const chipContents = (
                <>
                  <TechIcon name={iconName} size={22} responsive colorful className="shrink-0" />
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground">{name}</span>
                </>
              )
              const chipClass = 'skill-chip group inline-flex items-center gap-[10px] rounded-full border px-5 py-3 shadow-sm backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand focus-visible:ring-2 focus-visible:ring-brand/60'
              const key = `${name}-${index}`

              return externalUrl ? (
                <motion.a
                  {...motionProps}
                  key={key}
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name}, opens the official website in a new tab`}
                  data-skill-chip style={{ ...chipStyle, '--skill-color': chipColor } as CSSProperties} className={`${chipClass} cursor-pointer`}
                >
                  {chipContents}
                </motion.a>
              ) : (
                <motion.div
                  {...motionProps}
                  key={key}
                  data-skill-chip style={{ ...chipStyle, '--skill-color': chipColor } as CSSProperties} className={`${chipClass} cursor-default`}
                >
                  {chipContents}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const content = useSiteContent()
  const { home, about, cv, services, portfolio, faqs, links, brandLine2 } = content
  const configuredTechSkills = Array.isArray(home.techSkills) ? home.techSkills : []
  const techSkills = configuredTechSkills
  const educationEntries = (about.education as unknown as HomeEducationEntry[]).filter(item => item.visible !== false)
  const experienceEntries = cv.experience
  const certificateEntries = cv.certificates.filter(item => item.visible !== false)
  const latestEducation = educationEntries[educationEntries.length - 1]
  const prefersReducedMotion = useReducedMotion() ?? false
  const galleryPhotos = Array.isArray(home.gallery)
    ? home.gallery.filter(photo => photo.visible !== false && typeof photo.image === 'string' && photo.image.trim()).map(photo => photo.image)
    : []
  const photoStack = [home.photo, ...galleryPhotos].filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0).slice(0, 3)
  const socialLinks = links.items.filter(item => Boolean(item.visible) && item.url && item.label.toLowerCase() !== 'email').slice(0, 6)
  const emailLink = links.items.find(item => item.label.toLowerCase() === 'email' && Boolean(item.visible))
  const email = (emailLink?.url || `mailto:${content.settings.email}`).replace(/^mailto:/i, '')
  const selectedProjects = [...portfolio.projects]
    .sort((first, second) => Number(second.featured) - Number(first.featured))
    .slice(0, 5)
  const heroTagline = String(home.tagline) === 'Building intelligent AI solutions and scalable digital experiences'
    ? 'scalable digital experiences.'
    : home.tagline
  const configuredRole = String(home.role)
  const heroRole = ['AI/ML Engineer & Full-Stack Developer', 'AI/ML Engineer, & Full-Stack Developer'].includes(configuredRole)
    ? 'AI/ML Engineer & React Developer'
    : configuredRole

  // Load guestbook preview (latest 3 visible entries)
  const [guestbookPreviews, setGuestbookPreviews] = useState<GuestbookEntry[]>([])
  const [guestbookUser, setGuestbookUser] = useState<User | null>(null)
  useEffect(() => {
    let active = true
    if (!db) {
      setGuestbookPreviews([])
      return
    }
    getDocs(query(collection(db, 'guestbook'), where('approved', '==', true), orderBy('createdAt', 'desc'), limit(3)))
      .then(snap => {
        if (!active) return
        setGuestbookPreviews(snap.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<GuestbookEntry, 'id'>),
        })))
      })
      .catch(() => { if (active) setGuestbookPreviews([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!auth) { setGuestbookUser(null); return }
    return onAuthStateChanged(auth, setGuestbookUser)
  }, [])

  const guestbookHeading = String(home.guestbookHeading) === 'Leave your Signature'
    ? 'Leave a'
    : home.guestbookHeading || 'Leave a'

  const faqSlice = home.showFaqPreview ? faqs.items.slice(0, home.faqPreviewCount || 3) : []
  const showEducation = home.showEducation && Boolean(latestEducation)
  const showCertifications = home.showCertifications && certificateEntries.length > 0
  useListRenderWarning(home.techSkills, 'technology skills', techSkills.length > 0)
  useListRenderWarning(about.education, 'education', showEducation)
  useListRenderWarning(cv.experience, 'professional experience', home.showExperience && experienceEntries.length > 0)
  useListRenderWarning(cv.certificates, 'certificates', showCertifications)
  useListRenderWarning(faqs.items, 'FAQ', faqSlice.length > 0)

  return (
    <div>
      <PageMeta
        rawTitle="Muhammad Waseem Qasim ï¿½ AI/ML & Full-Stack Developer"
        description="Muhammad Waseem Qasim â€” AI/ML Engineer & Full-Stack Developer from Pakistan. BS CS (CGPA 3.67), The University of Lahore. Python, React, FastAPI, LLM, RAG, computer vision."
        path="/"
      />

      <section data-home-hero className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden px-5 pb-12 pt-24 md:px-10 md:pt-28">
        {home.heroImage && (
          <div className="pointer-events-none absolute right-[6%] top-[22%] z-0 h-36 w-28 opacity-90 sm:h-48 sm:w-36 md:h-64 md:w-48">
            <HomeMedia src={home.heroImage} alt={home.heroHeading} className="h-full w-full rounded-3xl object-cover object-top shadow-2xl" />
          </div>
        )}
        <div className="relative z-10 mx-auto flex w-full flex-col items-center text-center">
          <h1 className="w-full font-sans text-[clamp(80px,15vw,260px)] font-black uppercase leading-[0.85] tracking-[-0.08em] text-foreground dark:text-foreground">
            <span className="sr-only">{home.name}</span>
            <span aria-hidden="true">{home.heroHeading}</span>
          </h1>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted sm:text-sm">{home.heroTag}</p>
          <p className="mt-2 font-instrument-serif text-[clamp(34px,6vw,76px)] italic leading-tight text-muted dark:text-muted">{heroTagline}</p>
          <div className="mt-12 flex w-full flex-col items-start justify-between gap-5 text-left sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted dark:text-muted">
              <svg className="h-4 w-4 shrink-0 text-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              {home.location}
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted dark:text-muted sm:text-right">
              <svg className="h-4 w-4 shrink-0 text-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.4 7.5 7.6 4.4 7.6-4.4M12 12v9" /></svg>
              {heroRole}
            </span>
          </div>
        </div>
      </section>

      <Section className="pb-10 pt-4 md:pb-16">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr_1fr]">
          <HomeBentoCard reducedMotion={prefersReducedMotion} className="flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">{home.bentoName}</h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted dark:text-muted">
                {home.bentoLocation} Â· {home.liveClockLabel} <PakistanClock compact />
              </p>
            </div>
            <HomePhotoStack photos={photoStack} name={home.name} />
            <div className="flex flex-wrap items-center gap-2">
              {socialLinks.map(item => (
                <a key={`${item.label}-${item.url}`} href={item.url} target={item.url.startsWith('http') ? '_blank' : undefined} rel={item.url.startsWith('http') ? 'me noopener noreferrer' : undefined} aria-label={item.label} title={item.label}
                  className="home-social-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-muted transition-colors hover:border-brand hover:text-accent-foreground dark:border-neutral-700 dark:text-muted">
                  <HomeSocialIcon label={item.label} />
                </a>
              ))}
            </div>
          </HomeBentoCard>

          <HomeBentoCard reducedMotion={prefersReducedMotion} delay={0.06} className="flex flex-col">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted dark:text-muted">{home.buildEyebrow}</p>
              <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">{home.buildTitle}</h2>
              <p className="font-instrument-serif text-4xl italic text-muted dark:text-muted sm:text-5xl">{home.buildAccent}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {home.buildChips.map((chip, index) => <span key={`${chip}-${index}`} className="home-tag-pill rounded-full border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted dark:border-neutral-700 dark:text-muted">{chip}</span>)}
              </div>
              <p className="mt-5 max-w-[70ch] leading-[1.8] text-muted dark:text-muted">{home.introText}</p>
            </div>
            <div className="mt-auto pt-6">
              <PakistanAnalogClock label={home.analogClockLabel} />
            </div>
          </HomeBentoCard>

          <HomeBentoCard reducedMotion={prefersReducedMotion} delay={0.12} className="flex flex-col justify-between">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted dark:text-muted">
                {home.available && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                {home.availabilityLabel}
              </p>
              <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-foreground dark:text-foreground">{home.workTogetherTitle}</h2>
              <p className="mt-1 font-instrument-serif text-3xl italic text-muted dark:text-muted">{home.workTogetherAccent}</p>
            </div>
            <div className="my-6">
              <CopyEmailCard email={email} copyLabel={home.copyEmailLabel} copiedLabel={home.copyEmailCopiedLabel} />
            </div>
            <Link to="/contact" data-hover-keep="true" className="inline-flex min-h-12 items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-surface-inverse transition-colors hover:bg-neutral-700 dark:bg-surface-inverse dark:text-inverse-foreground">
              {home.connectNowLabel}
            </Link>
          </HomeBentoCard>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <HomeBentoCard reducedMotion={prefersReducedMotion} className="relative isolate overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.2),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(234,88,12,0.12),transparent_55%)]" />
            <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                {home.photo && <HomeMedia src={home.photo} alt="Muhammad Waseem Qasim" width={1066} height={1599} className="h-28 w-28 shrink-0 rounded-full border-4 border-border object-cover object-top shadow-xl dark:border-neutral-700 sm:h-36 sm:w-36" />}
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-foreground dark:text-foreground sm:text-5xl">{home.builderTitle}</h2>
                  <p className="font-instrument-serif text-3xl italic text-accent-foreground sm:text-5xl">{home.builderAccent}</p>
                  <p className="mt-3 font-mono text-[10px] font-semibold tracking-[0.12em] text-muted dark:text-muted sm:text-xs">&lt; {brandLine2} /&gt;</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link to="/work" className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 px-5 py-2 text-xs font-semibold tracking-[0.1em] text-muted transition-colors hover:bg-neutral-900 hover:text-surface-inverse dark:border-neutral-700 dark:text-foreground dark:hover:bg-surface dark:hover:text-foreground">{home.builderWorkLabel}</Link>
                <Link to="/book" className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand px-5 py-2 text-xs font-semibold tracking-[0.1em] text-accent-foreground transition-colors hover:bg-brand hover:text-on-accent">{home.builderCallLabel}</Link>
              </div>
            </div>
          </HomeBentoCard>

          <HomeBentoCard reducedMotion={prefersReducedMotion} delay={0.06} className="relative isolate min-h-[300px] overflow-hidden">
            <div className="relative z-10 max-w-[55%]">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{home.remoteTag}</p>
              <h2 className="text-2xl font-bold leading-tight text-foreground dark:text-foreground sm:text-3xl">{home.remoteTitle}</h2>
              <span className="mt-5 inline-flex rounded-full border border-neutral-300 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted dark:border-neutral-700 dark:text-muted">{home.remoteChip}</span>
            </div>
            <div className="absolute bottom-0 right-0 top-0 w-[58%]" aria-label={home.remoteTitle}>
              <LazyGlobe className="h-full min-h-[300px] w-full" />
            </div>
          </HomeBentoCard>
        </div>
      </Section>

      <Section show={selectedProjects.length > 0} className="py-20 md:py-28">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{home.selectedWorkTag}</p>
        <h2 className="mb-10 flex flex-col font-sans text-[clamp(62px,12vw,190px)] font-black uppercase leading-[0.82] tracking-[-0.07em] text-foreground dark:text-foreground sm:flex-row sm:items-baseline sm:gap-8">
          <span>{home.selectedWorkHeading}</span>
          <span className="font-instrument-serif font-normal italic tracking-tight text-muted dark:text-muted">{home.selectedWorkAccent}</span>
        </h2>
        <div className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
          {selectedProjects.map((project, index) => <SelectedWorkRow key={project.id} project={project} index={index} viewLabel={home.selectedWorkViewLabel} reducedMotion={prefersReducedMotion} />)}
        </div>
        <div className="mt-8 flex justify-center">
          <Link to="/work" className="inline-flex min-h-12 items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-surface-inverse transition-colors hover:bg-neutral-700 dark:bg-surface-inverse dark:text-inverse-foreground">{home.selectedWorkBtn}</Link>
        </div>
      </Section>

      {/* â•â•â• Stats strip â•â•â• */}
      <Section show={home.showStats && home.stats.length > 0} className="py-12" bg>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {home.stats.map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.08} className="hover-card home-stat-tile rounded-2xl p-4 text-center transition-colors">
              <p className="text-4xl font-bold text-accent-foreground">{stat.n}{stat.s}</p>
              <p className="text-xs text-muted dark:text-muted mt-1 leading-snug">{stat.t}</p>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* â•â•â• Marquee â•â•â• */}
      {home.showMarquee && home.marquee.length > 0 && (
        <div className="overflow-hidden border-b border-neutral-200 dark:border-neutral-800 py-4 bg-surface dark:bg-surface">
          <div className="animate-marquee flex gap-10 w-max">
            {[...home.marquee, ...home.marquee].map((item, i) => (
              <span key={i} className="text-sm font-mono text-muted dark:text-muted whitespace-nowrap">{item}</span>
            ))}
          </div>
        </div>
      )}

      <Section show={home.showFeaturedProjects && portfolio.projects.some(project => project.featured)} className="py-20">
        <SectionHead tag="Work" title={home.featuredTitle} lead={home.featuredLead} accent="work" />
        <div className="grid gap-6">
          {portfolio.projects.filter(project => project.featured).map((project, index) => (
            <ScrollReveal key={project.id} delay={index * 0.08} data-hover-list="home-featured-projects">
              <div className={`hover-card ${glass} p-6 md:flex md:items-center md:gap-8 hover:border-brand/40 transition-all`}>
                {project.image && <img src={project.image} alt={project.title} loading="lazy" className="mb-4 h-32 w-full flex-shrink-0 rounded-xl object-cover md:mb-0 md:w-48" />}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {project.tags.split(', ').slice(0, 4).map(tag => <span key={tag} className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-mono text-accent-foreground">{tag}</span>)}
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground dark:text-foreground">{project.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted dark:text-muted">{project.desc}</p>
                </div>
                {(project.link || project.github) && (
                  <div className="mt-3 flex flex-shrink-0 gap-2 md:mt-0">
                    {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent-foreground hover:underline">Live â†—</a>}
                    {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-muted hover:text-accent-foreground">Code â†—</a>}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/work" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-brand-dark">{home.featuredBtn.replace(/\bportfolio\b/gi, 'work')}</Link>
        </div>
      </Section>

      {/* â•â•â• 3. Project showcase â•â•â• */}
      <Section show={home.showExperience && experienceEntries.length > 0} className="py-20" bg>
        <SectionHead tag="Experience" title="Where I've worked" lead="Real-world training and internships." accent="worked" />
        <div className="relative pl-6 border-l-2 border-brand/30 flex flex-col gap-10">
          {experienceEntries.map((exp, i) => (
            <ScrollReveal key={i} delay={i * 0.08} className="relative">
              <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-brand ring-4 ring-white dark:ring-neutral-950" />
              <p className="text-xs font-mono text-accent-foreground mb-1">{exp.period}</p>
              <h3 className="font-semibold text-foreground dark:text-foreground">{exp.role}</h3>
              <p className="text-sm font-medium text-muted dark:text-muted">{exp.company}</p>
              <p className="text-sm text-muted dark:text-muted mt-1">{exp.bullets[0]}</p>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* â•â•â• 5. Education + Certifications â•â•â• */}
      <Section show={showEducation || showCertifications} className="py-20">
        <SectionHead tag="Education" title="Academic background" lead="Degree, scholarship and certifications." accent="background" />
        <div className="grid md:grid-cols-2 gap-8">
          {/* Degree card */}
          {showEducation && (
            <ScrollReveal>
              <div className={`${glass} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-brand/10 text-accent-foreground">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground dark:text-foreground">{latestEducation?.institution}</h3>
                    <p className="text-sm text-muted">{latestEducation?.subtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-brand/10 text-accent-foreground font-semibold">{latestEducation?.yearRange}</span>
                  <span className="text-muted dark:text-muted">{latestEducation?.description}</span>
                </div>
              </div>
            </ScrollReveal>
          )}
          {/* Certs */}
          {showCertifications && (
            <ScrollReveal delay={0.08}>
              <div className={`${glass} p-6`}>
                <h3 className="font-semibold text-foreground dark:text-foreground mb-4">Certifications</h3>
                <ul className="space-y-3">
                  {certificateEntries.map((cert, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-accent-foreground mt-0.5 flex-shrink-0">âœ¦</span>
                      <div>
                        <span className="font-medium text-muted dark:text-foreground">{cert.name}</span>
                        <span className="text-muted"> Â· {cert.issuer}, {cert.date}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          )}
        </div>
      </Section>

      {/* â•â•â• 6. Skills pill cloud â•â•â• */}
      {/* â•â•â• Services preview â•â•â• */}
      <Section show={home.showServices && services.items.length > 0} className="py-20">
        <SectionHead tag="What I do" title={home.servicesTitle} lead={home.servicesLead} accent="build" />
        <div className="grid sm:grid-cols-2 gap-6">
          {services.items.map((svc, i) => (
            <ScrollReveal key={i} delay={i * 0.08} data-hover-list="home-services">
              <div className={`hover-card ${glass} group p-6 hover:border-brand/40 hover:bg-brand/5 transition-all`}>
                <div className="inline-flex p-2 rounded-xl bg-brand/10 text-accent-foreground mb-4">{ICON_MAP[svc.icon]}</div>
                <h3 className="font-semibold text-foreground dark:text-foreground mb-2">{svc.title}</h3>
                <p className="text-sm text-muted dark:text-muted">{svc.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground hover:text-accent-foreground-dark transition-colors">View all services â†’</Link>
        </div>
      </Section>

      {/* â•â•â• 7. Plan cards â•â•â• */}
      <Section show={home.plans.length > 0} className="py-20" bg>
        <ScrollReveal className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">{home.plansTag}</p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">
            {home.plansHeading}{' '}
            <span className="font-instrument-serif font-normal italic text-muted dark:text-muted">{home.plansAccent}</span>
          </h2>
        </ScrollReveal>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {home.plans.map((plan, i) => (
            <HomeBentoCard key={plan.title + i} reducedMotion={prefersReducedMotion} delay={i * 0.08} className="flex min-h-[340px] flex-col">
              <div className="mb-8 flex items-center gap-3">
                <span className={'h-2.5 w-2.5 rounded-full ' + ['bg-brand', 'bg-sky-500', 'bg-emerald-500'][i % 3]} aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted dark:text-muted">{plan.title}</h3>
              </div>
              <p className="mb-5 text-4xl font-black tracking-tight text-foreground dark:text-foreground sm:text-5xl">{plan.price}</p>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-muted dark:text-muted">{plan.desc}</p>
                <Link to={plan.ctaLink} className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand/60 px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-brand hover:text-on-accent">
                {plan.cta}
              </Link>
            </HomeBentoCard>
          ))}
        </div>
      </Section>

      {/* â•â•â• Testimonials â•â•â• */}
      <Section show={home.showTestimonials && home.testimonials.length > 0} className="py-20">
        <SectionHead tag="Testimonials" title={home.testimonialsTitle} lead={home.testimonialsLead} accent="words" />
        <div className="grid md:grid-cols-3 gap-6">
          {home.testimonials.map((t, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div className={`${glass} p-6`}>
                <p className="text-sm text-muted dark:text-muted mb-4 leading-relaxed">"{t.q}"</p>
                <p className="text-xs font-semibold text-muted">â€” {t.c}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* â•â•â• 8. FAQ preview + Guestbook preview â•â•â• */}
      <Section show className="w-full py-20" bg>
        <div className="grid md:grid-cols-2 gap-12">
          {/* FAQs */}
          {faqSlice.length > 0 && (
            <div>
              <ScrollReveal>
                <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-2">FAQ</p>
                <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-6">Common <span className="italic font-serif text-accent-foreground">questions</span></h2>
              </ScrollReveal>
              <div className="space-y-4">
                {faqSlice.map((faq, i) => (
                  <ScrollReveal key={i} delay={i * 0.06}>
                    <details className={`${glass} p-4 group`}>
                      <summary className="cursor-pointer text-sm font-semibold text-muted dark:text-foreground list-none flex items-center justify-between">
                        {faq.q}
                        <span className="text-accent-foreground transition-transform group-open:rotate-45 ml-2">+</span>
                      </summary>
                      <p className="mt-3 text-sm text-muted dark:text-muted leading-relaxed">{faq.a}</p>
                    </details>
                  </ScrollReveal>
                ))}
              </div>
              <div className="mt-4">
                <Link to="/faqs" className="text-sm font-semibold text-accent-foreground hover:text-accent-foreground-dark">View all FAQs â†’</Link>
              </div>
            </div>
          )}
          {/* Guestbook */}
          <div className="col-span-full grid w-full items-stretch gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,450px)]">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0"
            >
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.4em] text-muted dark:text-muted">{home.guestbookTag}</p>
              <h2 className="mb-7 flex flex-col font-sans text-[clamp(64px,9vw,130px)] font-black uppercase leading-[0.85] tracking-[-0.065em] text-foreground dark:text-foreground">
                <span>{guestbookHeading}</span>
                <span className="font-instrument-serif text-muted normal-case font-normal italic tracking-tight dark:text-muted">{home.guestbookAccent}</span>
              </h2>
              <p className="mb-8 max-w-[52ch] text-lg leading-[1.7] text-muted dark:text-muted sm:text-xl">{home.guestbookLead}</p>

              {guestbookPreviews.length > 0 ? (
                <div className="mb-6 flex flex-col gap-4">
                  {guestbookPreviews.slice(0, 3).map(entry => (
                    <Link
                      key={entry.id}
                      to="/guestbook"
                      className="block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <GuestbookCard entry={entry} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mb-6 flex min-h-36 items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-surface/35 px-6 py-8 text-center text-sm font-medium text-muted dark:border-neutral-700 dark:bg-surface/20 dark:text-muted">
                  {home.guestbookEmptyText}
                </div>
              )}

              <Link to="/guestbook" className="inline-flex min-h-12 items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-surface-inverse transition-transform hover:-translate-y-0.5 dark:bg-surface-inverse dark:text-inverse-foreground">
                {home.guestbookBtn}
              </Link>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
             transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`hover-card ${glass} flex h-full min-h-[420px] flex-col rounded-[48px] border-neutral-200/70 bg-surface/75 p-8 dark:border-neutral-800/70 dark:bg-surface/55 sm:p-10`}
            >
              <h3 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground">{home.guestbookCtaHeading}</h3>
              <p className="mt-1 font-instrument-serif text-4xl italic text-muted dark:text-muted sm:text-5xl">{home.guestbookCtaAccent}</p>
              <p className="mt-5 leading-[1.7] text-muted dark:text-muted">{home.guestbookCtaLead}</p>

              {guestbookUser ? (
                <div className="mt-8 space-y-4">
                  <p className="text-sm text-muted dark:text-muted">
                    {home.guestbookSignedInLabel} <span className="font-semibold text-foreground dark:text-foreground">{guestbookUser.displayName || guestbookUser.email || ''}</span>
                  </p>
                  <Link to="/guestbook" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-surface-inverse transition-colors hover:bg-neutral-700 dark:bg-surface-inverse dark:text-inverse-foreground">
                    {home.guestbookWriteBtn}
                  </Link>
                </div>
              ) : (
                <Link to="/guestbook" className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-muted transition-colors hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-foreground dark:hover:border-neutral-500 dark:hover:bg-neutral-900">
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 3v-3.5a2 2 0 01-2-2v-8.5a2 2 0 012-2z"/><path strokeLinecap="round" d="M7 10h10M7 14h7"/></svg>
                    <span>{home.guestbookSignInLabel}</span>
                </Link>
              )}
              <p className="mt-auto pt-8 text-center text-xs leading-relaxed text-muted">
                {home.guestbookTermsLead} <Link to="/terms" className="font-semibold underline underline-offset-2 transition-colors hover:text-accent-foreground">{home.guestbookTermsLabel}</Link>
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      <TechSkillCloud heading={home.techSkillsHeading} accent={home.techSkillsAccent} skills={techSkills} />
    </div>
  )
}
