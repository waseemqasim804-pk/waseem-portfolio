import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { DEFAULT_LINK_ORDER } from '../data/content'
import { useResolvedMedia } from '../hooks/useMedia'
import PageMeta from '../components/PageMeta'

type LinkItem = {
  n?: number
  order?: number
  label: string
  url: string
  desc: string
  visible?: boolean
}

export default function Links() {
  const { links, home } = useSiteContent()
  const photo = useResolvedMedia(home.photo)
  const reducedMotion = useReducedMotion() ?? false
  const middleWordRef = useRef<HTMLSpanElement>(null)
  const [finePointer, setFinePointer] = useState(false)
  const visibleLinks = (links.items as unknown as LinkItem[])
    .filter(item => item.visible !== false && item.label.trim() && item.url.trim())
    .sort((a, b) => {
      const aRank = DEFAULT_LINK_ORDER.findIndex(label => label.toLowerCase() === a.label.toLowerCase())
      const bRank = DEFAULT_LINK_ORDER.findIndex(label => label.toLowerCase() === b.label.toLowerCase())
      return (aRank < 0 ? DEFAULT_LINK_ORDER.length : aRank) - (bRank < 0 ? DEFAULT_LINK_ORDER.length : bRank)
    })

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  const trackHeadingSpotlight = (event: PointerEvent<HTMLHeadingElement>) => {
    if (!finePointer || reducedMotion || event.pointerType === 'touch') return
    const word = middleWordRef.current
    if (!word) return
    const bounds = word.getBoundingClientRect()
    word.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
    word.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
  }

  const resetHeadingSpotlight = () => {
    middleWordRef.current?.style.setProperty('--spot-x', '-999px')
    middleWordRef.current?.style.setProperty('--spot-y', '-999px')
  }

  return (
    <div className="relative overflow-hidden">
      <PageMeta
        title="Links"
        description="WASEEM QASIM online: GitHub, X, LinkedIn, Facebook, Instagram, email and WhatsApp."
        path="/links"
      />

      <section className="relative w-full border-b border-neutral-200 px-5 pb-10 pt-[120px] dark:border-neutral-800 md:pb-16">
        <div className="relative z-0 mb-8 ml-auto h-[140px] w-[140px] overflow-hidden rounded-full border-[3px] border-neutral-300 md:absolute md:right-[45px] md:top-0 md:mb-0 md:h-[260px] md:w-[260px] lg:h-[360px] lg:w-[360px] dark:border-neutral-800">
          {photo && <img src={photo} alt="WASEEM QASIM" className="h-full w-full rounded-full object-cover object-top" style={{ objectPosition: 'center top' }} />}
        </div>
        <div className="relative z-10">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            className="mb-6 text-lg font-semibold uppercase tracking-[0.45em] text-neutral-500 dark:text-neutral-400"
          >
            {links.tag}
          </motion.p>
          <motion.h1
            aria-label={`${links.headingLine1} ${links.headingLine2} ${links.headingLine3}`}
            onPointerMove={trackHeadingSpotlight}
            onPointerLeave={resetHeadingSpotlight}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.05, duration: 0.45 }}
            className="font-sans text-[clamp(3rem,14vw,11rem)] font-black uppercase leading-[0.9] tracking-[-0.065em] text-neutral-900 dark:text-white md:max-w-[72%]"
          >
            <span className="block">{links.headingLine1}</span>
            <span ref={middleWordRef} className="links-spotlight-word relative block text-neutral-300 dark:text-white/[0.14]">
              {links.headingLine2}
              <motion.span
                aria-hidden="true"
                className={`links-spotlight-overlay pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-orange-300 to-blue-300 bg-clip-text text-transparent ${finePointer && !reducedMotion ? 'links-spotlight-mask' : ''}`}
                initial={{ opacity: 0.12 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                {links.headingLine2}
              </motion.span>
            </span>
            <span className="block">{links.headingLine3}</span>
          </motion.h1>
          <style>{`
            .links-spotlight-mask {
              -webkit-mask-image: radial-gradient(circle 105px at var(--spot-x, -999px) var(--spot-y, -999px), #000 0%, rgba(0,0,0,.85) 32%, transparent 100%);
              mask-image: radial-gradient(circle 105px at var(--spot-x, -999px) var(--spot-y, -999px), #000 0%, rgba(0,0,0,.85) 32%, transparent 100%);
            }
            @media (prefers-reduced-motion: reduce) {
              .links-spotlight-overlay { transition-duration: .6s; }
            }
          `}</style>
        </div>
      </section>

      <ul className="w-full px-5 pb-12 md:pb-16">
        {visibleLinks.map((item, index) => (
          <PresenceRow key={`${item.n}-${item.label}`} item={item} index={index} reducedMotion={reducedMotion} />
        ))}
      </ul>

    </div>
  )
}

function PresenceRow({ item, index, reducedMotion }: { item: LinkItem; index: number; reducedMotion: boolean }) {
  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '-24px' }}
      transition={{ duration: 0.34, delay: reducedMotion ? 0 : Math.min(index * 0.055, 0.33), ease: [0.22, 1, 0.36, 1] }}
    >
      <a
        href={item.url}
        target="_blank"
        rel="me noopener noreferrer"
        aria-label={item.label}
        className="presence-row-link flex h-[110px] cursor-pointer items-center gap-3 rounded-3xl pl-[35px] pr-0 md:h-[200px] md:gap-[47px]"
      >
        <span className="presence-row-number w-7 shrink-0 text-right font-mono text-sm tabular-nums text-neutral-500 md:w-7">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="presence-row-name min-w-0 flex-1 text-[48px] font-black uppercase leading-none tracking-[-0.065em] text-neutral-900 dark:text-neutral-100 md:text-[100px]">
          {item.label}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="presence-row-visit text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">VISIT</span>
          <span aria-hidden="true" className="presence-row-arrow flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white ring-1 ring-neutral-800 transition-colors dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700 md:h-[75px] md:w-[75px]">
            <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </span>
        </span>
      </a>
    </motion.li>
  )
}
