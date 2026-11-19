import type { PointerEvent } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import PageMeta from '../components/PageMeta'
import TechIcon from '../components/TechIcon'
import { content } from '../data/content'
import { useSiteContent } from '../hooks/useSiteContent'

type UsesItem = {
  name: string
  note?: string
  description?: string
  url?: string
  icon?: string
}

type UsesCategory = {
  title: string
  visible?: boolean
  items: UsesItem[]
}

function safeExternalUrl(value?: string) {
  if (!value?.trim()) return undefined
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

function resolveItemIcon(item: UsesItem) {
  if (item.icon?.trim()) return item.icon.trim()
  const firstName = item.name.split(/\s+\/\s+/)[0].trim()
  const withoutVersion = firstName.replace(/\s+\d+(?:\.\d+)*(?:\+)?$/, '').trim()
  if (withoutVersion.toLowerCase() === 'hugging face transformers') return 'Hugging Face'
  if (withoutVersion.toLowerCase() === 'groq llm api') return 'Groq'
  return withoutVersion
}

function UseCard({ item, index, reducedMotion }: { item: UsesItem; index: number; reducedMotion: boolean }) {
  const cardRef = useMotionValue(0)
  const pointerX = useMotionValue(-400)
  const pointerY = useMotionValue(-400)
  const smoothX = useSpring(pointerX, { stiffness: 180, damping: 28, mass: 0.45 })
  const smoothY = useSpring(pointerY, { stiffness: 180, damping: 28, mass: 0.45 })
  const spotOpacity = useSpring(cardRef, { stiffness: 180, damping: 26 })
  const spotlight = useMotionTemplate`radial-gradient(300px circle at ${smoothX}px ${smoothY}px, rgba(249, 115, 22, 0.16), transparent 72%)`
  const href = safeExternalUrl(item.url)
  const description = item.description ?? item.note ?? ''
  const displayDescription = description === 'Fast LLM inference for production apps'
    ? 'Fast LLM inference with the Groq API'
    : description
  const iconName = resolveItemIcon(item)

  const trackPointer = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(event.clientX - bounds.left)
    pointerY.set(event.clientY - bounds.top)
    cardRef.set(1)
  }

  const clearPointer = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') cardRef.set(0)
  }

  return (
    <motion.article
      onPointerMove={trackPointer}
      onPointerLeave={clearPointer}
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.27), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      className="group relative min-h-[220px] overflow-hidden rounded-[1.6rem] border border-neutral-200/80 bg-white/75 p-6 shadow-[0_12px_42px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-300 hover:border-orange-400/60 hover:shadow-[0_18px_48px_rgba(249,115,22,0.10)] dark:border-white/10 dark:bg-neutral-900/65 dark:shadow-[0_18px_54px_rgba(0,0,0,0.12)] dark:hover:border-orange-400/50"
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ background: spotlight, opacity: spotOpacity }} />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.name}: ${displayDescription}. Opens in a new tab.`}
          className="uses-card-link relative z-10 flex min-h-[172px] h-full flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
        >
          <div className="uses-card-main flex h-full flex-1 flex-col transition-[opacity,transform] duration-200">
            <div className="mb-7 flex items-center justify-between gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white/90 dark:border-white/10 dark:bg-neutral-800/90">
                <TechIcon name={iconName} size={26} colorful className="text-neutral-800 dark:text-neutral-100" />
              </span>
              <span aria-hidden="true" className="uses-card-touch-arrow inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 dark:border-white/15 dark:text-neutral-200">
                <ArrowIcon />
              </span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">{item.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{displayDescription}</p>
          </div>
          <span className="uses-card-visit pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-[opacity,transform] duration-200" aria-hidden="true">
            <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-neutral-950 shadow-lg shadow-black/10">
              Visit <span aria-hidden="true">⚡</span>
            </span>
          </span>
        </a>
      ) : (
        <div className="relative z-10 flex min-h-[172px] h-full flex-col">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white/90 dark:border-white/10 dark:bg-neutral-800/90">
            <TechIcon name={iconName} size={26} colorful className="text-neutral-800 dark:text-neutral-100" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">{item.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{displayDescription}</p>
        </div>
      )}
    </motion.article>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

function CategoryTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/)
  const accent = words.pop() ?? title
  const lead = words.join(' ')

  return (
    <h2 className="text-center text-2xl font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-left sm:text-3xl dark:text-neutral-400">
      {lead && <>{lead} </>}
      <span className="font-instrument-serif text-4xl font-normal normal-case italic tracking-normal text-orange-600 sm:text-5xl dark:text-orange-300">{accent}</span>
    </h2>
  )
}

export default function Uses() {
  const { uses } = useSiteContent()
  const reducedMotion = useReducedMotion() ?? false
  const optionalCategories = content.uses.sections.filter(section => section.title === 'Hardware' || section.title === 'Integrations (AI & social)')
  const categories = [
    ...uses.sections,
    ...optionalCategories.filter(fallback => !uses.sections.some(section => section.title === fallback.title)),
  ] as UsesCategory[]
  const visibleCategories = categories.filter(section => section.visible !== false && section.items.length > 0)

  return (
    <div className="w-full overflow-x-clip bg-white text-neutral-950 dark:bg-[#0a0a0a] dark:text-white">
      <PageMeta
        title="Uses"
        description="Tools, technologies, and gear I use day to day for AI/ML and web development work."
        path="/uses"
      />

      <header className="relative isolate flex min-h-[max(60vh,380px)] w-full items-center justify-center overflow-hidden border-b border-neutral-200 px-5 py-20 text-center dark:border-white/10 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 35% 48%, rgba(249,115,22,.18), transparent 36%), radial-gradient(ellipse at 68% 53%, rgba(37,99,235,.16), transparent 39%)',
          }}
        />
        <div className="mx-auto w-full max-w-7xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.34em] text-orange-600 dark:text-orange-400 sm:text-sm">{uses.eyebrow || 'SETUP'}</p>
          <h1 className="bg-gradient-to-b from-neutral-950 via-neutral-700 to-neutral-400 bg-clip-text text-[clamp(5rem,18vw,10rem)] font-black uppercase leading-[0.78] tracking-[-0.085em] text-transparent dark:from-white dark:via-neutral-200 dark:to-neutral-600">
            {uses.title || 'Uses'}
          </h1>
          <p className="mt-7 font-instrument-serif text-[clamp(2rem,5vw,3.7rem)] italic leading-tight text-neutral-700 dark:text-neutral-300">{uses.accent || 'what I build with.'}</p>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400 sm:text-lg">{uses.lead}</p>
        </div>
      </header>

      {visibleCategories.map((section, sectionIndex) => (
        <section
          key={`${section.title}-${sectionIndex}`}
          className={`w-full border-b border-neutral-200/90 py-16 sm:py-20 lg:py-24 dark:border-white/10 ${sectionIndex % 2 === 0 ? 'bg-white dark:bg-[#0a0a0a]' : 'bg-neutral-50/80 dark:bg-neutral-900/25'}`}
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 xl:px-12">
            <div className="mb-9 sm:mb-12">
              <CategoryTitle title={section.title} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {section.items.map((item, itemIndex) => (
                <UseCard
                  key={`${section.title}-${item.name}-${itemIndex}`}
                  item={item}
                  index={itemIndex}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      <style>{`
        .uses-card-touch-arrow { display: inline-flex; }
        .uses-card-visit { display: none; }
        @media (hover: hover) and (pointer: fine) {
          .uses-card-touch-arrow { display: none; }
          .uses-card-link:hover .uses-card-main,
          .uses-card-link:focus-visible .uses-card-main { opacity: 0; transform: scale(.985); }
          .uses-card-link:hover .uses-card-visit,
          .uses-card-link:focus-visible .uses-card-visit { display: flex; opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
