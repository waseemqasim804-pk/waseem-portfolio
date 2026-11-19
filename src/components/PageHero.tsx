import { motion, useReducedMotion } from 'framer-motion'

type PageHeroProps = {
  title: string
  eyebrow?: string
  accent?: string
  subline?: string
  supporting?: string
  size?: 'blogs' | 'about' | 'work'
  className?: string
  accentClassName?: string
}

export default function PageHero({
  title,
  eyebrow,
  accent,
  subline,
  supporting,
  className = '',
  accentClassName = '',
}: PageHeroProps) {
  const reducedMotion = useReducedMotion() ?? false
  const resolvedSubline = subline || supporting

  return (
    <motion.header
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex w-full flex-col items-center justify-center px-4 pt-20 pb-6 text-center sm:px-6 sm:pt-24 sm:pb-8 ${className}`}
    >
      {/* a) Giant word: ultra-bold sans, uppercase, tight letter-spacing (-0.03em), clamp(4rem, 14vw, 12rem), line-height 0.85 */}
      <h1 className="max-w-full break-words bg-gradient-to-b from-neutral-950 via-neutral-700 to-neutral-400 bg-clip-text font-sans text-[clamp(4rem,14vw,12rem)] font-black uppercase leading-[0.85] tracking-[-0.03em] text-transparent [-webkit-text-fill-color:transparent] dark:from-white dark:via-neutral-200 dark:to-neutral-500/20">
        {title}
      </h1>

      {/* b) Eyebrow line: small, uppercase, monospace, wide letter-spacing (0.3em), muted color */}
      {eyebrow && (
        <p className="mt-5 max-w-full break-words font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400 sm:mt-6 sm:text-xs">
          {eyebrow}
        </p>
      )}

      {/* c) Accent line: large italic serif, muted white, one or two words only */}
      {accent && (
        <p className={`mt-2 max-w-full break-words font-instrument-serif text-[clamp(2.2rem,5vw,4.2rem)] italic leading-tight text-neutral-600 dark:text-neutral-300 ${accentClassName}`}>
          {accent}
        </p>
      )}

      {/* Sub line: one sentence, max 16 words, below heading */}
      {resolvedSubline && (
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
          {resolvedSubline}
        </p>
      )}
    </motion.header>
  )
}
