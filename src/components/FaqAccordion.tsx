import { useState, type PointerEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { SiteContent } from '../hooks/useSiteContent'
import { useListRenderWarning } from '../hooks/useListRenderWarning'

type Faq = SiteContent['faqs']['items'][number]

export default function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion() ?? false
  const canHover = !reducedMotion && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  useListRenderWarning(items, 'FAQ')

  return (
    <div className="flex w-full flex-col gap-3">
      {items.map((faq, index) => {
        const isOpen = openIndex === index
        const answerId = `faq-answer-${index}`
        return (
          <motion.article
            key={`${index}-${faq.q}`}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.38, delay: index * 0.035 }}
            onPointerMove={moveSpotlight}
            onPointerLeave={resetSpotlight}
            className={`faq-spotlight-card group relative isolate overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/65 shadow-sm transition-[transform,border-color,box-shadow] motion-safe:hover:-translate-y-0.5 motion-safe:focus-within:-translate-y-0.5 focus-within:border-orange-400/70 dark:border-neutral-800/80 dark:bg-neutral-900/45 ${canHover ? 'hover:border-orange-400/70' : ''}`}
          >
            <span aria-hidden="true" className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 ${canHover ? 'group-hover:opacity-100' : ''}`} style={{ background: 'radial-gradient(circle 220px at var(--spot-x, -500px) var(--spot-y, -500px), rgba(249,115,22,.13), rgba(59,130,246,.05) 52%, transparent 100%)' }} />
            <button
              type="button"
              onClick={() => setOpenIndex(current => current === index ? null : index)}
              aria-expanded={isOpen}
              aria-controls={answerId}
              className="relative z-10 flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 sm:px-7"
            >
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{faq.q}</span>
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors group-focus-within:border-orange-500 group-focus-within:bg-orange-500 group-focus-within:text-white dark:border-neutral-700 dark:text-neutral-300 ${canHover ? 'group-hover:border-orange-500 group-hover:bg-orange-500 group-hover:text-white' : ''} ${isOpen ? 'rotate-45 border-orange-500 bg-orange-500 text-white dark:border-orange-500 dark:text-white' : ''}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={answerId}
                  initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
                  className="relative z-10 overflow-hidden"
                >
                  <p className="mx-5 border-t border-neutral-200 py-5 leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400 sm:mx-7">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>
        )
      })}
    </div>
  )
}

function moveSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
}

function resetSpotlight(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--spot-x', '-500px')
  event.currentTarget.style.setProperty('--spot-y', '-500px')
}
