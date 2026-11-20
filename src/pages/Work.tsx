import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import PageMeta from '../components/PageMeta'
import PageHero from '../components/PageHero'
import TechIcon from '../components/TechIcon'
import { useResolvedMedia } from '../hooks/useMedia'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'

type Screenshot = { id: string; image: string; alt: string }
type Project = {
  id: string
  cat: string
  title: string
  desc: string
  long: string
  tags: string
  image: string
  link: string
  github: string
  featured: boolean
  slug?: string
  hasDetails?: boolean
  overview?: string
  role?: string
  technologies?: string[]
  features?: string[]
  screenshots?: Screenshot[]
  order?: number
  visible?: boolean
}
type WorkTogetherCard = {
  id: string
  title: string
  price: string
  checklist: string[]
  buttonLabel: string
  buttonLink: string
}
type Portfolio = Omit<SiteContent['portfolio'], 'projects' | 'workingTogetherCards'> & {
  projects: Project[]
  workingTogetherCards: WorkTogetherCard[]
}
type Contribution = { date: string; count: number; level: number }
type ContributionResponse = { contributions?: Array<Partial<Contribution>> }
type ContributionCache = { savedAt: number; contributions: Contribution[] }

const workDescription = 'Projects by Muhammad Waseem Qasim, AI/ML Engineer and Full-Stack Developer.'

export default function Work() {
  const content = useSiteContent()
  const portfolio = content.portfolio as unknown as Portfolio
  const { settings } = content
  const { slug } = useParams()
  const project = slug
    ? portfolio.projects.find(item => (item.slug || slugify(item.title)) === slug)
    : undefined

  return (
    <>
      <PageMeta title="Projects" description={workDescription} path="/work" />
      {slug
        ? project
          ? <ProjectDetail portfolio={portfolio} project={project} />
          : <ProjectNotFound portfolio={portfolio} />
        : <WorkLanding portfolio={portfolio} githubSetting={settings.githubUsername} githubProfileUrl={settings.github} />}
    </>
  )
}

function WorkLanding({ portfolio, githubSetting, githubProfileUrl }: { portfolio: Portfolio; githubSetting: string; githubProfileUrl: string }) {
  const reducedMotion = useReducedMotion() ?? false
  const heroRef = useRef<HTMLElement>(null)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const glowX = useSpring(pointerX, { stiffness: 55, damping: 24, mass: 0.8 })
  const glowY = useSpring(pointerY, { stiffness: 55, damping: 24, mass: 0.8 })
  const [finePointer, setFinePointer] = useState(false)
  const projects = (portfolio.projects ?? [])
    .map((project, position) => ({ project, position }))
    .filter(({ project }) => project.visible !== false)
    .sort((a, b) => {
      const orderA = Number.isFinite(a.project.order) ? a.project.order! : Number.MAX_SAFE_INTEGER
      const orderB = Number.isFinite(b.project.order) ? b.project.order! : Number.MAX_SAFE_INTEGER
      return orderA - orderB || a.position - b.position
    })
    .map(({ project }) => project)

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  const trackPointer = (event: PointerEvent<HTMLElement>) => {
    if (!finePointer || reducedMotion || event.pointerType === 'touch') return
    const bounds = heroRef.current?.getBoundingClientRect()
    if (!bounds) return
    pointerX.set(event.clientX - bounds.left - bounds.width / 2)
    pointerY.set(event.clientY - bounds.top - bounds.height / 2)
  }

  return (
    <div className="overflow-hidden bg-neutral-50 text-foreground dark:bg-background dark:text-foreground">
      <style>{`
        .work-project-link { transition: color .32s ease, background-color .32s ease; }
        .work-project-title, .work-project-description, .work-project-number, .work-project-view, .work-project-arrow { transition: color .32s ease, opacity .32s ease, transform .32s ease, background-color .32s ease, border-color .32s ease; }
        .work-project-view { opacity: 0; transform: translateX(10px); }
        .work-project-link.hover-white:focus-visible { position: relative; z-index: 1; outline: 3px solid var(--accent); outline-offset: -3px; background: var(--surface-inverse); color: var(--inverse-foreground); }
        .work-project-link.hover-white:focus-visible .work-project-title, .work-project-link.hover-white:focus-visible .work-project-description { color: var(--inverse-foreground); }
        .work-project-link.hover-white:focus-visible .work-project-number { border-color: color-mix(in srgb, var(--inverse-foreground) 20%, transparent); color: var(--inverse-foreground); }
        .work-project-link.hover-white:focus-visible .work-project-arrow { transform: translateX(4px); border-color: var(--inverse-foreground); background: var(--inverse-foreground); color: var(--surface-inverse); }
        @media (min-width: 768px) {
          .work-project-link.hover-white:focus-visible .work-project-view { display: inline-flex; opacity: 1; transform: translateX(0); }
        }
        @media (hover: hover) and (pointer: fine) and (min-width: 768px) {
          .work-project-view { display: inline-flex; }
          .work-project-link.hover-white:hover { background: var(--surface-inverse); color: var(--inverse-foreground); }
          .work-project-link.hover-white:hover .work-project-title, .work-project-link.hover-white:hover .work-project-description { color: var(--inverse-foreground); }
          .work-project-link.hover-white:hover .work-project-number { border-color: color-mix(in srgb, var(--inverse-foreground) 20%, transparent); color: var(--inverse-foreground); }
          .work-project-link.hover-white:hover .work-project-view { opacity: 1; transform: translateX(0); }
          .work-project-link.hover-white:hover .work-project-arrow { transform: translateX(4px); border-color: var(--inverse-foreground); background: var(--inverse-foreground); color: var(--surface-inverse); }
        }
        @media (prefers-reduced-motion: reduce) {
          .work-project-link, .work-project-title, .work-project-description, .work-project-number, .work-project-view, .work-project-arrow { transition-duration: .01ms !important; }
        }
        .github-heatmap-scroll { scrollbar-width: thin; scrollbar-color: rgba(249,115,22,.55) rgba(120,120,120,.14); }
        .github-heatmap-scroll::-webkit-scrollbar { height: 7px; }
        .github-heatmap-scroll::-webkit-scrollbar-track { background: rgba(120,120,120,.14); border-radius: 999px; }
        .github-heatmap-scroll::-webkit-scrollbar-thumb { background: rgba(249,115,22,.55); border-radius: 999px; }
      `}</style>

      <section
        ref={heroRef}
        onPointerMove={trackPointer}
        className="relative isolate flex min-h-[72vh] items-center justify-center overflow-hidden px-5 pb-16 pt-20 sm:min-h-[78vh] sm:px-10 lg:px-12"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.15),transparent_68%)] blur-3xl" />
          <motion.div
            style={{ x: glowX, y: glowY }}
            className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.17),transparent_68%)] blur-3xl"
          />
        </div>
        <PageHero
          size="work"
          title={portfolio.heroTitle}
          eyebrow={portfolio.heroEyebrow}
          accent={portfolio.heroAccent}
          supporting={portfolio.lead}
          className="mx-auto max-w-[1440px]"
        />
      </section>

      {projects.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-12">
            <Reveal>
              <div className="mb-16 text-center sm:mb-20">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted dark:text-muted">
                  {portfolio.workSectionEyebrow}
                </p>
                <h2 className="text-4xl font-bold uppercase tracking-[-0.055em] text-foreground dark:text-foreground sm:text-6xl md:text-7xl">
                  {portfolio.showcaseTitle}{' '}
                  <span className="font-instrument-serif font-normal italic text-muted dark:text-muted">{portfolio.showcaseAccent}</span>
                </h2>
              </div>
            </Reveal>
          </div>
          <div data-hover-list-container="work-projects" className="w-full border-t border-neutral-200 dark:border-border/10">
            {projects.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.045}>
                <ProjectRow project={item} displayNumber={index + 1} viewLabel={portfolio.projectViewLabel} featured={index === 0} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <GitHubContributions portfolio={portfolio} githubSetting={githubSetting} githubProfileUrl={githubProfileUrl} />

      {(portfolio.workingTogetherCards?.length ?? 0) > 0 && (
        <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            <Reveal>
              <div className="mb-12 flex flex-col justify-between gap-5 sm:mb-16 md:flex-row md:items-end">
                <h2 className="text-4xl font-bold tracking-[-0.055em] text-foreground dark:text-foreground sm:text-6xl">
                  {portfolio.workingTogetherTitle}{' '}
                  <span className="font-instrument-serif font-normal italic text-accent-foreground dark:text-orange-400">{portfolio.workingTogetherAccent}</span>
                </h2>
                <p className="max-w-md text-base leading-7 text-muted dark:text-muted">{portfolio.workingTogetherLead}</p>
              </div>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {portfolio.workingTogetherCards.map((card, index) => (
                <Reveal key={card.id} delay={index * 0.07}>
                  <article className={`working-together-card flex h-full min-h-[350px] flex-col rounded-[2rem] border p-7 backdrop-blur-xl transition-colors sm:p-9 ${index === 1 ? 'border-orange-400/50 bg-gradient-to-br from-orange-500/15 via-white/5 to-blue-500/10 shadow-[0_22px_70px_-45px_rgba(249,115,22,.7)] dark:border-orange-300/35' : 'border-neutral-200 bg-surface/70 dark:border-border/10 dark:bg-surface-inverse/[0.035]'}`}>
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted dark:text-muted">{card.title}</p>
                      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${index === 1 ? 'bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,.8)]' : 'bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,.65)]'}`} />
                    </div>
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground dark:text-foreground sm:text-4xl">{card.price}</p>
                    <ul className="mt-8 flex-1 space-y-4">
                      {card.checklist.map((line, itemIndex) => (
                        <li key={`${card.id}-${itemIndex}`} className="flex items-start gap-3 text-sm leading-6 text-muted dark:text-muted">
                          <CheckIcon />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <ActionLink to={card.buttonLink} className="mt-10 inline-flex min-h-11 w-fit items-center justify-center gap-3 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-orange-500 hover:bg-neutral-950 hover:text-surface-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-border/20 dark:text-foreground dark:hover:bg-surface dark:hover:text-foreground dark:focus-visible:ring-offset-neutral-950">
                      {card.buttonLabel}<ArrowIcon className="h-4 w-4" />
                    </ActionLink>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function ProjectRow({ project, displayNumber, viewLabel, featured }: { project: Project; displayNumber: number; viewLabel: string; featured: boolean }) {
  const slug = project.slug || slugify(project.title)
  const hasDetails = project.hasDetails || Boolean(project.overview || project.long || project.features?.length || project.technologies?.length)
  const body = (
    <div data-hover-list="work-projects" data-project-featured={featured || undefined} className="mx-auto grid min-h-0 w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-6 text-foreground md:flex md:min-h-[150px] md:gap-7 md:px-10 md:py-8 lg:min-h-[190px] lg:py-10 lg:px-12 dark:text-foreground">
      <span aria-hidden="true" className="work-project-number hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xs font-mono text-muted dark:border-border/10 dark:text-muted md:flex">{String(displayNumber).padStart(2, '0')}</span>
      <div className="min-w-0 md:flex-1">
        <span aria-hidden="true" className="work-project-number mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-[10px] font-mono text-accent-foreground dark:border-border/10 dark:text-orange-400 md:hidden">{String(displayNumber).padStart(2, '0')}</span>
        <h3 className="work-project-title font-instrument-serif text-[clamp(1.75rem,calc(1.2rem_+_2.4vw),3.25rem)] italic leading-[0.98] text-foreground dark:text-foreground">{project.title}</h3>
        <p className="work-project-description mt-3 line-clamp-2 max-w-[70ch] text-[clamp(1rem,calc(0.95rem_+_0.3vw),1.125rem)] text-muted dark:text-muted lg:line-clamp-1">{project.desc}</p>
      </div>
      <span className="work-project-view hidden shrink-0 items-center rounded-full bg-neutral-950 px-4 py-2 text-[10px] font-bold tracking-[0.18em] text-surface-inverse dark:bg-surface dark:text-foreground">{viewLabel}</span>
      <span aria-hidden="true" className="work-project-arrow hover-card-arrow col-start-2 row-span-2 row-start-1 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-neutral-300 text-muted dark:border-border/20 dark:text-foreground md:row-span-1 md:h-16 md:w-16"><ArrowIcon className="h-[22px] w-[22px]" /></span>
    </div>
  )

  if (hasDetails) {
    return <Link to={`/work/${slug}`} aria-label={`${project.title}, view project details`} className="work-project-link hover-card hover-white block w-full border-b border-neutral-200 dark:border-border/10 focus-visible:outline-none">{body}</Link>
  }
  if (project.link) {
    return <a href={project.link} target="_blank" rel="noopener noreferrer" aria-label={`${project.title}, opens in a new tab`} className="work-project-link hover-card hover-white block w-full border-b border-neutral-200 dark:border-border/10 focus-visible:outline-none">{body}</a>
  }
  return <div aria-disabled="true" className="block w-full border-b border-neutral-200 dark:border-border/10">{body}</div>
}

function GitHubContributions({ portfolio, githubSetting, githubProfileUrl }: { portfolio: Portfolio; githubSetting: string; githubProfileUrl: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [nearView, setNearView] = useState(false)
  const [days, setDays] = useState<Contribution[] | null>(null)
  const [failed, setFailed] = useState(false)
  const username = githubUsername(githubSetting)
  const oneHour = 60 * 60 * 1000

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      setNearView(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearView(true)
        observer.disconnect()
      }
    }, { rootMargin: '420px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearView || !username) return
    let live = true
    const controller = new AbortController()

    const load = async () => {
      const cacheKey = `github-contributions:${username}`
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached) as ContributionCache
          if (Array.isArray(parsed.contributions) && parsed.contributions.length > 0 && Date.now() - parsed.savedAt < oneHour) {
            if (live) setDays(parsed.contributions)
            return
          }
          sessionStorage.removeItem(cacheKey)
        }
      } catch {
        try { sessionStorage.removeItem(cacheKey) } catch { /* Storage may be disabled. */ }
      }

      try {
        const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Contribution request failed')
        const result = await response.json() as ContributionResponse
        const parsed = (result.contributions ?? []).flatMap(item => {
          if (typeof item.date !== 'string' || typeof item.count !== 'number') return []
          return [{ date: item.date, count: Math.max(0, item.count), level: Math.max(0, Math.min(4, Math.round(Number(item.level) || 0))) }]
        })
        if (parsed.length === 0) throw new Error('Contribution data was empty')
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), contributions: parsed } satisfies ContributionCache)) } catch { /* Storage may be disabled. */ }
        if (live) setDays(parsed)
      } catch {
        if (live && !controller.signal.aborted) setFailed(true)
      }
    }

    void load()
    return () => {
      live = false
      controller.abort()
    }
  }, [nearView, username, oneHour])

  if (!username || failed) return null
  if (!nearView) return <section ref={sectionRef} aria-hidden="true" className="h-px" />
  if (!days) {
    return (
      <section ref={sectionRef} className="px-5 py-20 sm:px-10 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-9 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted dark:text-muted">{portfolio.githubEyebrow}</p>
            <h2 className="text-4xl font-bold uppercase tracking-[-0.055em] text-foreground dark:text-foreground sm:text-6xl">{portfolio.githubTitle}{' '}<span className="font-instrument-serif font-normal italic text-accent-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-500 dark:to-blue-500">{portfolio.githubAccent}</span></h2>
          </div>
          <div className="github-heatmap-scroll overflow-x-auto rounded-[2rem] border border-neutral-200 bg-surface/60 p-5 dark:border-border/10 dark:bg-surface-inverse/[0.035] sm:p-8">
            <div className="min-w-[986px] animate-pulse">
              <div className="mb-4 h-4 w-48 rounded bg-neutral-200 dark:bg-surface-inverse/10" />
              <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: 'repeat(53, 14px)' }}>
                {Array.from({ length: 371 }, (_, index) => <span key={index} className="h-[14px] w-[14px] rounded-[4px] bg-neutral-200 dark:bg-emerald-950" />)}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const today = new Date()
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const rangeStart = new Date(end)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 364)
  const gridEnd = new Date(end)
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()))
  const gridStart = new Date(gridEnd)
  gridStart.setUTCDate(gridStart.getUTCDate() - 370)
  const dayMap = new Map(days.map(item => [item.date, item]))
  const allDays: Array<Contribution & { key: string }> = []
  for (let offset = 0; offset < 371; offset += 1) {
    const cursor = new Date(gridStart)
    cursor.setUTCDate(cursor.getUTCDate() + offset)
    const key = cursor.toISOString().slice(0, 10)
    const item = dayMap.get(key)
    allDays.push({ key, date: key, count: item?.count ?? 0, level: item?.level ?? 0 })
  }
  const monthMarkers: Array<{ label: string; week: number }> = []
  const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
  while (monthCursor <= end) {
    const dayOffset = Math.floor((monthCursor.getTime() - gridStart.getTime()) / 86400000)
    monthMarkers.push({ label: monthCursor.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), week: Math.max(0, Math.floor(dayOffset / 7)) })
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
  }
  const total = days.reduce((sum, item) => {
    const timestamp = Date.parse(`${item.date}T00:00:00Z`)
    return timestamp >= rangeStart.getTime() && timestamp <= end.getTime() ? sum + item.count : sum
  }, 0)
  const totalText = portfolio.githubTotalTemplate.replace('{count}', total.toLocaleString())
  const levels = ['bg-neutral-200 dark:bg-neutral-800', 'bg-emerald-200 dark:bg-emerald-950', 'bg-emerald-400 dark:bg-emerald-800', 'bg-emerald-500 dark:bg-emerald-600', 'bg-emerald-700 dark:bg-emerald-400']
  const profileUrl = /^https?:\/\//i.test(githubProfileUrl) ? githubProfileUrl : `https://github.com/${username}`

  return (
    <section ref={sectionRef} className="px-5 py-20 sm:px-10 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <div className="mb-9 text-center sm:mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted dark:text-muted">{portfolio.githubEyebrow}</p>
            <h2 className="text-4xl font-bold uppercase tracking-[-0.055em] text-foreground dark:text-foreground sm:text-6xl">
              {portfolio.githubTitle}{' '}
              <span className="font-instrument-serif font-normal italic text-accent-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-500 dark:to-blue-500">{portfolio.githubAccent}</span>
            </h2>
          </div>
        </Reveal>
        <div className="github-heatmap-scroll overflow-x-auto rounded-[2rem] border border-neutral-200 bg-surface/65 p-5 dark:border-border/10 dark:bg-surface-inverse/[0.035] sm:p-8">
          <div className="relative min-w-[986px] pb-1 pt-7">
            <div className="absolute left-0 right-0 top-0 h-5 text-[11px] text-muted dark:text-muted" aria-hidden="true">
              {monthMarkers.map((month, index) => (
                <span key={`${month.label}-${index}`} className="absolute whitespace-nowrap" style={{ left: `${month.week * 18}px` }}>{month.label}</span>
              ))}
            </div>
            <div role="grid" aria-label={totalText} className="grid grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, 14px)', gridTemplateColumns: 'repeat(53, 14px)' }}>
              {allDays.map(day => (
                <span key={day.key} role="gridcell" aria-label={`${day.count} contributions on ${day.date}`} title={`${day.count} contributions on ${day.date}`} className={`h-[14px] w-[14px] rounded-[4px] ${levels[day.level]}`} />
              ))}
            </div>
            <div className="mt-5 flex min-w-0 items-center justify-between gap-5 text-[11px] text-muted dark:text-muted">
              <p className="whitespace-nowrap">{totalText}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span>{portfolio.githubLessLabel}</span>
                {levels.map((color, index) => <span key={index} aria-hidden="true" className={`h-[14px] w-[14px] rounded-[4px] ${color}`} />)}
                <span>{portfolio.githubMoreLabel}</span>
              </div>
            </div>
          </div>
        </div>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="mx-auto mt-7 flex min-h-11 w-fit items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-orange-500 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-border/15 dark:text-foreground dark:hover:text-orange-300">
          {portfolio.githubProfileLabel}<ArrowIcon className="h-4 w-4" />
        </a>
      </div>
    </section>
  )
}

function ProjectDetail({ portfolio, project }: { portfolio: Portfolio; project: Project }) {
  const technologies = project.technologies && project.technologies.length > 0
    ? project.technologies
    : project.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  const overview = project.overview || project.long || project.desc
  const detailsLink = project.link
  const githubLink = project.github

  return (
    <main className="overflow-hidden bg-neutral-50 px-5 pb-24 pt-12 text-foreground dark:bg-background dark:text-foreground sm:px-10 sm:pb-32 sm:pt-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <Link to="/work" className="inline-flex min-h-11 items-center gap-3 rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-muted transition hover:border-orange-500 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-border/15 dark:text-muted dark:hover:text-orange-300">
          <ArrowIcon className="h-4 w-4 rotate-180" />{portfolio.backToWorkLabel}
        </Link>
        <div className="mt-14 max-w-5xl sm:mt-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.26em] text-accent-foreground dark:text-orange-400">{portfolio.title}</p>
          <h1 className="text-[clamp(3rem,9vw,7rem)] font-bold leading-[0.94] tracking-[-0.07em]">{project.title}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted dark:text-muted sm:text-xl">{project.desc}</p>
        </div>

        <div className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-[1.3fr_.7fr]">
          <section className="rounded-[2rem] border border-neutral-200 bg-surface/70 p-7 dark:border-border/10 dark:bg-surface-inverse/[0.035] sm:p-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{portfolio.projectOverviewLabel}</h2>
            <p className="mt-5 whitespace-pre-line text-base leading-8 text-muted dark:text-muted sm:text-lg">{overview}</p>
          </section>
          {project.role?.trim() && (
            <section className="rounded-[2rem] border border-neutral-200 bg-gradient-to-br from-blue-500/10 to-orange-500/10 p-7 dark:border-border/10 sm:p-10">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{portfolio.projectRoleLabel}</h2>
              <p className="mt-5 text-xl font-semibold leading-8 text-foreground dark:text-foreground">{project.role}</p>
            </section>
          )}
        </div>

        {technologies.length > 0 && (
          <section className="mt-16 sm:mt-20">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{portfolio.projectTechLabel}</h2>
            <div className="flex flex-wrap gap-3">
              {technologies.map((technology, index) => (
                <span key={`${technology}-${index}`} className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-neutral-200 bg-surface/70 px-4 py-2 text-sm font-semibold text-muted dark:border-border/10 dark:bg-surface-inverse/[0.04] dark:text-foreground">
                  <TechIcon name={technology} size={18} colorful />{technology}
                </span>
              ))}
            </div>
          </section>
        )}

        {(project.features?.length ?? 0) > 0 && (
          <section className="mt-16 sm:mt-20">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{portfolio.projectFeaturesLabel}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.features?.map((feature, index) => (
                <li key={`${feature}-${index}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-neutral-200 bg-surface/60 px-5 py-4 text-sm leading-6 text-muted dark:border-border/10 dark:bg-surface-inverse/[0.035] dark:text-muted">
                  <CheckIcon />{feature}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ProjectGallery title={portfolio.projectScreenshotsLabel} screenshots={project.screenshots ?? []} />

        {(detailsLink || githubLink) && (
          <div className="mt-14 flex flex-wrap gap-3 sm:mt-20">
            {detailsLink && <ExternalButton href={detailsLink}>{portfolio.projectLiveDemoLabel}</ExternalButton>}
            {githubLink && <ExternalButton href={githubLink}>{portfolio.projectGitHubLabel}</ExternalButton>}
          </div>
        )}
      </div>
    </main>
  )
}

function ProjectGallery({ title, screenshots }: { title: string; screenshots: Screenshot[] }) {
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const images = screenshots.filter(image => image.image.trim())

  useEffect(() => {
    if (!activeImage) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveImage(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeImage])

  if (images.length === 0) return null
  return (
    <section className="mt-16 sm:mt-20">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted dark:text-muted">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((image, index) => <ScreenshotCard key={image.id || index} screenshot={image} onOpen={setActiveImage} />)}
      </div>
      <AnimatePresence>
        {activeImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-overlay/90 p-5" role="dialog" aria-modal="true" aria-label={title} onClick={() => setActiveImage(null)}>
            <button type="button" aria-label="Close image" onClick={() => setActiveImage(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-surface/10 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"><CloseIcon /></button>
            <img src={activeImage} alt={title} className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain" onClick={event => event.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function ScreenshotCard({ screenshot, onOpen }: { screenshot: Screenshot; onOpen: (src: string) => void }) {
  const src = useResolvedMedia(screenshot.image, '')
  if (!src) return null
  return (
    <button type="button" onClick={() => onOpen(src)} aria-label={`Open ${screenshot.alt || 'project screenshot'}`} className="group overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-border/10 dark:bg-surface-inverse/[0.03]">
      <img src={src} alt={screenshot.alt || 'Project screenshot'} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none" />
    </button>
  )
}

function ProjectNotFound({ portfolio }: { portfolio: Portfolio }) {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-neutral-50 px-5 py-20 text-foreground dark:bg-background dark:text-foreground">
      <div className="text-center">
        <p className="mb-7 text-lg text-muted dark:text-muted">{portfolio.projectNotFound}</p>
        <Link to="/work" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-surface-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-surface-inverse dark:text-inverse-foreground">{portfolio.backToWorkLabel}<ArrowIcon className="h-4 w-4" /></Link>
      </div>
    </main>
  )
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reducedMotion = useReducedMotion() ?? false
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={reducedMotion ? undefined : { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ActionLink({ to, className, children, ariaLabel }: { to: string; className: string; children: React.ReactNode; ariaLabel?: string }) {
  return to.startsWith('/')
    ? <Link to={to} aria-label={ariaLabel} className={className}>{children}</Link>
    : <a href={to} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
}

function ExternalButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-surface-inverse transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-surface-inverse dark:text-inverse-foreground dark:hover:bg-orange-400 dark:focus-visible:ring-offset-[var(--bg)">{children}<ArrowIcon className="h-4 w-4" /></a>
}

function githubUsername(value: string) {
  const input = value.trim().replace(/^@/, '')
  if (!input) return ''
  if (/^[A-Za-z0-9-]+$/.test(input)) return input
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    return url.pathname.split('/').filter(Boolean)[0] ?? ''
  } catch {
    return input.replace(/^\/+|\/+$/g, '')
  }
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function CheckIcon() {
  return <svg aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent-foreground dark:text-orange-400" viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ArrowIcon({ className = '' }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function CloseIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
