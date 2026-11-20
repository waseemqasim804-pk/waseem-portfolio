import { useEffect, useState, type PointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useResolvedMedia } from '../hooks/useMedia'
import { useListRenderWarning } from '../hooks/useListRenderWarning'

export type EducationEntry = {
  yearDot: string
  yearRange: string
  institution: string
  subtitle: string
  description: string
  location: string
  shortName?: string
  image?: string
  document?: string
  documentLabel?: string
  visible?: boolean
}

export type ExperienceEntry = {
  role: string
  company: string
  period: string
  bullets: string[]
  shortName?: string
  image?: string
}

export type TimelineEntry = EducationEntry | ExperienceEntry
type TimelineMode = 'education' | 'experience'

export function Timeline({ entries, mode }: { entries: TimelineEntry[]; mode: TimelineMode }) {
  const reducedMotion = useReducedMotion() ?? false
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useListRenderWarning(entries, mode === 'education' ? 'education' : 'professional experience', entries.length > 0)

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 767px)')
    const updateLayout = () => setIsMobile(breakpoint.matches)
    breakpoint.addEventListener('change', updateLayout)
    return () => breakpoint.removeEventListener('change', updateLayout)
  }, [])

  return (
    <div className="relative mx-auto w-full overflow-x-clip">
      <style>{`
        @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
          .education-timeline-card:hover .education-timeline-spotlight { opacity: 1; }
          .education-timeline-card:hover { border-color: rgba(249,115,22,.65); box-shadow: 0 12px 32px rgba(249,115,22,.12); }
          .education-timeline-row:hover .education-timeline-dot { box-shadow: 0 0 0 7px rgba(249,115,22,.09), 0 0 26px rgba(249,115,22,.5); border-color: var(--accent); }
        }
        .education-timeline-card:focus-within { border-color: rgba(249,115,22,.7); box-shadow: 0 0 0 2px rgba(249,115,22,.18); }
        .education-timeline-card:focus-within .education-timeline-spotlight { opacity: 1; }
        .education-timeline-row:focus-within .education-timeline-dot { box-shadow: 0 0 0 7px rgba(249,115,22,.09), 0 0 26px rgba(249,115,22,.5); border-color: var(--accent); }
        @media (prefers-reduced-motion: reduce) {
          .education-timeline-spotlight { display: none !important; }
          .education-timeline-dot { transition-duration: .01ms !important; box-shadow: none !important; }
        }
      `}</style>
      <div aria-hidden="true" className="absolute bottom-0 left-[25px] top-0 w-0.5 bg-neutral-300 dark:bg-neutral-700 md:left-[calc(50%_-_1px)]" />
      <div className="flex flex-col gap-7 sm:gap-8">
        {entries.map((entry, index) => (
          <TimelineRow key={timelineKey(entry, index, mode)} entry={entry} index={index} mode={mode} isMobile={isMobile} reducedMotion={reducedMotion} />
        ))}
      </div>
    </div>
  )
}

function TimelineRow({ entry, index, mode, isMobile, reducedMotion }: { entry: TimelineEntry; index: number; mode: TimelineMode; isMobile: boolean; reducedMotion: boolean }) {
  const cardOnLeft = index % 2 === 0
  const date = mode === 'education' ? (entry as EducationEntry).yearDot : (entry as ExperienceEntry).period
  const dateParts = mode === 'education' ? [date] : splitDate(date)
  const cardOffset = reducedMotion ? 0 : isMobile ? 40 : cardOnLeft ? -40 : 40

  return (
    <div className="education-timeline-row relative grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-7 gap-y-4 md:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] md:gap-y-0">
      <span aria-hidden="true" className="absolute left-[52px] top-1/2 z-0 h-px w-7 -translate-y-1/2 bg-neutral-300 dark:bg-neutral-700 md:hidden" />
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-0 hidden h-px w-7 -translate-y-1/2 -translate-x-[54px] bg-neutral-300 dark:bg-neutral-700 md:block" />
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-0 hidden h-px w-7 -translate-y-1/2 translate-x-[26px] bg-neutral-300 dark:bg-neutral-700 md:block" />
      <motion.span
        role="img"
        aria-label={mode === 'education' ? `Year ${date}` : `Date range ${date}`}
        initial={reducedMotion ? false : { scale: 0.65, opacity: 0 }}
        whileInView={reducedMotion ? undefined : { scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18, delay: reducedMotion ? 0 : index * 0.06 }}
        className="education-timeline-dot absolute left-[26px] top-1/2 z-10 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-neutral-400 bg-surface text-xs font-bold leading-tight text-foreground transition-shadow dark:border-neutral-600 dark:bg-surface dark:text-foreground md:left-1/2"
      >
        {dateParts.map(part => <span key={part} className={mode === 'experience' ? 'max-w-[48px] truncate text-[9px] font-semibold' : ''}>{part}</span>)}
      </motion.span>

      {mode === 'education' ? (
        <>
          <EducationLogoTile
            entry={entry as EducationEntry}
            index={index}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            className={`relative z-10 col-start-2 row-start-1 justify-self-start md:row-start-1 ${cardOnLeft ? 'md:col-start-3 md:justify-self-start' : 'md:col-start-1 md:justify-self-end'}`}
          />
          <EducationCard
            entry={entry as EducationEntry}
            index={index}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            offset={cardOffset}
            className={`col-start-2 row-start-2 justify-self-stretch text-left md:row-start-1 ${cardOnLeft ? 'md:col-start-1 md:justify-self-end md:text-right' : 'md:col-start-3 md:justify-self-start md:text-left'}`}
          />
        </>
      ) : (
        <>
          <TimelineLogoTile
            title={(entry as ExperienceEntry).company}
            image={(entry as ExperienceEntry).image}
            shortName={(entry as ExperienceEntry).shortName}
            index={index}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            className={`relative z-10 col-start-2 row-start-1 justify-self-start md:row-start-1 ${cardOnLeft ? 'md:col-start-3 md:justify-self-start' : 'md:col-start-1 md:justify-self-end'}`}
          />
          <ExperienceCard
            entry={entry as ExperienceEntry}
            index={index}
            offset={cardOffset}
            reducedMotion={reducedMotion}
            className={`col-start-2 row-start-2 justify-self-stretch text-left md:row-start-1 ${cardOnLeft ? 'md:col-start-1 md:justify-self-end md:text-right' : 'md:col-start-3 md:justify-self-start md:text-left'}`}
          />
        </>
      )}
    </div>
  )
}

function EducationCard({ entry, index, isMobile, reducedMotion, offset, className }: { entry: EducationEntry; index: number; isMobile: boolean; reducedMotion: boolean; offset: number; className: string }) {
  const documentUrl = useResolvedMedia(entry.document || '', '')
  const safeDocumentUrl = /^(https?:\/\/|\/|data:application\/pdf)/i.test(documentUrl) ? documentUrl : ''
  const canHover = !reducedMotion && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, x: offset }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      whileHover={canHover ? { y: -3 } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: reducedMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={moveSpotlight}
      onPointerLeave={resetSpotlight}
      data-hover-list="education-timeline"
      className={`hover-card education-timeline-card group relative isolate w-full max-w-[460px] overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface/75 p-6 shadow-sm backdrop-blur-md focus-within:ring-2 focus-within:ring-orange-500/60 dark:border-neutral-800/80 dark:bg-surface/65 sm:p-8 ${className}`}
    >
      <TimelineSpotlight />
      <div className="relative z-10 mb-4 flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-foreground dark:text-foreground">{entry.institution}</h3>
        <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-muted dark:bg-neutral-800 dark:text-muted">{entry.yearRange}</span>
      </div>
      <p className="relative z-10 text-sm font-semibold leading-relaxed text-muted dark:text-muted">{entry.subtitle}</p>
      <p className="relative z-10 mt-4 text-[16px] leading-[1.75] text-muted dark:text-muted"><HighlightedText text={entry.description} /></p>
      {safeDocumentUrl && (
        <a href={safeDocumentUrl} target="_blank" rel="noopener noreferrer" className="relative z-10 mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-foreground transition-colors hover:text-accent-foreground-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          {entry.documentLabel || 'View document'}<span aria-hidden="true">↗</span>
        </a>
      )}
    </motion.article>
  )
}

function ExperienceCard({ entry, index, offset, reducedMotion, className }: { entry: ExperienceEntry; index: number; offset: number; reducedMotion: boolean; className: string }) {
  const canHover = !reducedMotion && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, x: offset }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      whileHover={canHover ? { y: -3 } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={moveSpotlight}
      onPointerLeave={resetSpotlight}
      data-hover-list="experience-timeline"
      className={`hover-card education-timeline-card group relative isolate w-full max-w-[460px] overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface/75 p-6 shadow-sm backdrop-blur-md focus-within:ring-2 focus-within:ring-orange-500/60 dark:border-neutral-800/80 dark:bg-surface/65 sm:p-8 ${className}`}
    >
      <TimelineSpotlight />
      <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight text-foreground dark:text-foreground sm:text-2xl">{entry.role}</h3>
          <p className="mt-2 text-base font-semibold text-accent-foreground dark:text-orange-400">{entry.company}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-muted dark:bg-neutral-800 dark:text-muted">{entry.period}</span>
      </div>
      <ul className="relative z-10 space-y-2.5">
        {entry.bullets.map((bullet, bulletIndex) => (
          <li key={`${index}-${bulletIndex}`} className="flex items-start gap-3 text-sm leading-6 text-muted dark:text-muted">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />{bullet}
          </li>
        ))}
      </ul>
    </motion.article>
  )
}

function EducationLogoTile({ entry, index, isMobile, reducedMotion, className }: { entry: EducationEntry; index: number; isMobile: boolean; reducedMotion: boolean; className: string }) {
  const monogram = entry.shortName || entry.institution.trim().split(/\s+/).slice(0, 3).map(word => word[0]).join('').toUpperCase()
  return <TimelineLogoTile title={entry.institution} image={entry.image} shortName={monogram} index={index} isMobile={isMobile} reducedMotion={reducedMotion} className={className} />
}

function TimelineLogoTile({ title, image, shortName, index, isMobile, reducedMotion, className }: { title: string; image?: string; shortName?: string; index: number; isMobile: boolean; reducedMotion: boolean; className: string }) {
  const logo = useResolvedMedia(image || '', '')
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: isMobile ? 40 : index % 2 === 0 ? 40 : -40 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: reducedMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={`${className} h-[128px] w-[128px] sm:h-[160px] sm:w-[160px] lg:h-[180px] lg:w-[180px]`}
      aria-label={`${title} logo`}
    >
      <div className="flex h-full w-full items-center justify-center rounded-3xl bg-surface shadow-sm">
        {logo
          ? <img src={logo} alt={`${title} logo`} loading="lazy" className="h-full w-full rounded-3xl object-contain p-6 sm:p-8" />
          : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-500 px-2 text-center text-xs font-bold uppercase tracking-wider text-foreground sm:h-20 sm:w-20 sm:text-sm">{shortName || title.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</span>}
      </div>
    </motion.div>
  )
}

function TimelineSpotlight() {
  return <span aria-hidden="true" className="education-timeline-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" style={{ background: 'radial-gradient(circle 220px at var(--spot-x, -500px) var(--spot-y, -500px), rgba(249,115,22,.13), rgba(59,130,246,.05) 52%, transparent 100%)' }} />
}

function moveSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || window.matchMedia('(hover: hover) and (pointer: fine)').matches === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
}

function resetSpotlight(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--spot-x', '-500px')
  event.currentTarget.style.setProperty('--spot-y', '-500px')
}

function HighlightedText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index} className="font-semibold text-foreground dark:text-foreground">{part.slice(2, -2)}</strong>
    : <span key={index}>{part}</span>)}</>
}

function splitDate(period: string) {
  const normalized = period.replace(/\s+to\s+/i, '–')
  const match = /^(.*?)\s+(\d{4})$/.exec(normalized)
  return match ? [match[1], match[2]] : [normalized]
}

function timelineKey(entry: TimelineEntry, index: number, mode: TimelineMode) {
  return mode === 'education'
    ? `${(entry as EducationEntry).yearDot}-${(entry as EducationEntry).institution}-${index}`
    : `${(entry as ExperienceEntry).period}-${(entry as ExperienceEntry).company}-${index}`
}
