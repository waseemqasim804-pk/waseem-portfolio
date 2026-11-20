import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useSiteContent } from '../hooks/useSiteContent'

let mountedCtaSections = 0

export default function CtaSection() {
  const { home } = useSiteContent()
  const reducedMotion = useReducedMotion() ?? false
  const eyebrow = home.closeEyebrow ?? 'CONTACT'
  const title = home.sharedCloseTitle ?? "Let's create"
  const accent = home.sharedCloseLead ?? 'something real.'
  const rawButton = home.closeBtn ?? 'Contact'
  const buttonLabel = rawButton.replace(new RegExp('\\s*' + String.fromCharCode(0x2192) + '\\s*$'), '').trim()
  const link = home.closeLink ?? '/contact'

  const sectionRef = useRef<HTMLElement | null>(null)
  const inView = useInView(sectionRef, { margin: '100px 0px' })
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const glowX = useSpring(pointerX, { stiffness: 160, damping: 24, mass: 0.6 })
  const glowY = useSpring(pointerY, { stiffness: 160, damping: 24, mass: 0.6 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    mountedCtaSections += 1
    if (mountedCtaSections > 1) console.warn('Multiple CtaSection instances mounted. Render CtaSection in Layout only.')
    return () => { mountedCtaSections -= 1 }
  }, [])

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const section = sectionRef.current
    if (!section) return
    const rect = section.getBoundingClientRect()
    const limitX = rect.width * 0.25
    const limitY = Math.min(180, rect.height * 0.25)
    pointerX.set(Math.max(-limitX, Math.min(limitX, event.clientX - (rect.left + rect.width / 2))))
    pointerY.set(Math.max(-limitY, Math.min(limitY, event.clientY - (rect.top + rect.height / 2))))
  }

  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
    setIsHovered(false)
  }

  const handleRingPointerEnter = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (!reducedMotion && event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setIsHovered(true)
    }
  }

  const handleRingPointerLeave = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'mouse') setIsHovered(false)
  }

  const gradient = 'conic-gradient(from 45deg, var(--accent) 0%, var(--accent-light) 25%, rgb(96 165 250) 48%, rgb(37 99 235) 68%, rgb(59 130 246) 82%, var(--accent-dark) 94%, var(--accent) 100%)'

  return (
    <section
      data-site-cta
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="relative isolate box-border mx-0 flex min-h-[max(70vh,460px)] w-full min-w-0 max-w-none self-stretch items-center overflow-hidden rounded-none border-x-0 border-y border-neutral-200/70 bg-neutral-50/90 px-0 text-foreground backdrop-blur-2xl dark:border-border/10 dark:bg-surface/90 dark:text-foreground"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_50%,rgba(249,115,22,0.14)_0%,transparent_42%),radial-gradient(ellipse_at_82%_50%,rgba(37,99,235,0.16)_0%,transparent_46%)]"
      />
      <motion.div
        aria-hidden="true"
        style={{ x: glowX, y: glowY }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(249,115,22,0.12)_0%,rgba(37,99,235,0.08)_36%,transparent_70%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between gap-10 px-5 py-14 sm:px-6 md:flex-row md:items-center md:gap-12 lg:px-10 xl:px-12">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-accent-foreground dark:text-orange-400 sm:mb-6">{eyebrow}</p>
            <h2 className="text-[clamp(2.75rem,7vw,7rem)] font-extrabold leading-[0.95] tracking-tight text-foreground dark:text-foreground">
              <span className="block">{title}</span>
              <span className="mt-2 block font-instrument-serif font-normal italic tracking-normal [word-spacing:normal] text-muted dark:text-muted">{accent}</span>
            </h2>
            <div className="mt-8 sm:mt-10">
              <Link
                to={link}
                className={[
                  'group/btn inline-flex min-h-12 items-center gap-3 rounded-full bg-surface px-8 py-3.5 text-base font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 dark:focus-visible:ring-offset-neutral-900',
                  !reducedMotion && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]',
                ].filter(Boolean).join(' ')}
              >
                <span>{buttonLabel}</span>
                <svg aria-hidden="true" className={'h-4 w-4' + (reducedMotion ? '' : ' transition-transform duration-200 group-hover/btn:translate-x-1')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center justify-center self-center md:self-auto">
            <Link
              to={link}
              aria-label={title + ' ' + accent + ': ' + buttonLabel}
              className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500 focus-visible:ring-offset-4 focus-visible:ring-offset-neutral-100 dark:focus-visible:ring-offset-neutral-900"
              onPointerEnter={handleRingPointerEnter}
              onPointerLeave={handleRingPointerLeave}
              onFocus={() => !reducedMotion && setIsHovered(true)}
              onBlur={() => setIsHovered(false)}
            >
              <motion.div
                animate={reducedMotion || !inView ? { scale: 1 } : { scale: isHovered ? 1.05 : [1, 1.02, 1] }}
                transition={reducedMotion || !inView ? undefined : isHovered ? { type: 'spring', stiffness: 220, damping: 18 } : { scale: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } }}
                className="relative grid aspect-square w-[clamp(240px,30vw,420px)] place-items-center rounded-full p-[3px]"
              >
                <motion.div
                  aria-hidden="true"
                  animate={{ scale: isHovered ? 1.2 : 1.04, opacity: isHovered ? 0.95 : 0.65 }}
                  style={{ x: glowX, y: glowY, background: gradient }}
                  className="absolute inset-0 rounded-full blur-xl"
                />
                <motion.div
                  aria-hidden="true"
                  animate={reducedMotion || !inView ? undefined : { rotate: 360 }}
                  transition={reducedMotion || !inView ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full p-[3px]"
                  style={{ background: gradient }}
                />
                <div aria-hidden="true" className="relative grid h-full w-full place-items-center rounded-full bg-neutral-100 text-foreground transition-colors duration-300 dark:bg-background dark:text-foreground">
                  <svg className={'h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12' + (reducedMotion ? '' : ' transition-transform duration-300 group-hover:translate-x-2')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
    </section>
  )
}
