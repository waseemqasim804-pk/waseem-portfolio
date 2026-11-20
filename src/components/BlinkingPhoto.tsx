// src/components/BlinkingPhoto.tsx
//
// Three modes (auto-detected via image probe):
//  Mode A — BOTH  me-open.jpg + me-closed.jpg exist → image-swap blink
//  Mode B — ONLY  me-open.jpg exists                → SVG eyelid overlay blink
//  Mode C — NO    photos yet                        → gradient initials placeholder
//
// Extras: gentle float animation, glowing gradient ring, mouse parallax, lazy load.

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'

// ─── Image probe ────────────────────────────────────────────────────────────
type PhotoMode = 'swap' | 'overlay' | 'placeholder'

function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    // Add cache-buster only in dev so hot-swap works; irrelevant in prod.
    img.src = src
  })
}

// ─── Blink scheduler ────────────────────────────────────────────────────────
function useBlink(onBlink: () => void, blinkPhoto: SiteContent['blinkPhoto']) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedule = useCallback(() => {
    const delay =
      blinkPhoto.minDelay +
      Math.random() * (blinkPhoto.maxDelay - blinkPhoto.minDelay)

    timer.current = setTimeout(async () => {
      onBlink()
      // Double-blink: ~25 % of the time do a second blink shortly after
      if (blinkPhoto.doubleBlink && Math.random() < 0.25) {
        await wait(blinkPhoto.blinkMs * 3)
        onBlink()
      }
      schedule()
    }, delay)
  }, [onBlink, blinkPhoto.blinkMs, blinkPhoto.doubleBlink, blinkPhoto.maxDelay, blinkPhoto.minDelay])

  useEffect(() => {
    schedule()
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [schedule])
}

function wait(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Main component ──────────────────────────────────────────────────────────
interface BlinkingPhotoProps {
  /** Tailwind/CSS size class applied to the outer wrapper, e.g. "w-56 h-56" */
  size?: string
  className?: string
  alt?: string
  src?: string
  round?: boolean
  objectPosition?: string
}

export default function BlinkingPhoto({
  size = 'w-56 h-56 md:w-72 md:h-72',
  className = '',
  alt = 'Muhammad Waseem Qasim',
  src,
  round = false,
  objectPosition = 'center',
}: BlinkingPhotoProps) {
  const { blinkPhoto, home } = useSiteContent()
  const imageSrc = useResolvedMedia(src || home.photo, '')
  const closedImageSrc = imageSrc.replace(/-open(?=\.[^/.]+$)/, '-closed')
  const [mode, setMode] = useState<PhotoMode | null>(null) // null = loading
  const [isBlinking, setIsBlinking] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse parallax motion values
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 80, damping: 20 })
  const springY = useSpring(rawY, { stiffness: 80, damping: 20 })
  const rotateX = useTransform(springY, [-0.5, 0.5], ['6deg', '-6deg'])
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-6deg', '6deg'])

  // ── Probe photos on mount ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [hasOpen, hasClosed] = await Promise.all([
        probeImage(imageSrc),
        closedImageSrc !== imageSrc ? probeImage(closedImageSrc) : Promise.resolve(false),
      ])
      if (!alive) return
      if (hasOpen && hasClosed) setMode('swap')
      else if (hasOpen) setMode('overlay')
      else setMode('placeholder')
    })()
    return () => { alive = false }
  }, [imageSrc, closedImageSrc])

  // ── Blink trigger ────────────────────────────────────────────────────────
  const triggerBlink = useCallback(() => {
    setIsBlinking(true)
    setTimeout(() => setIsBlinking(false), blinkPhoto.blinkMs)
  }, [blinkPhoto.blinkMs])

  useBlink(triggerBlink, blinkPhoto)

  // ── Mouse parallax handler ───────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      rawX.set((e.clientX - rect.left - rect.width / 2) / rect.width)
      rawY.set((e.clientY - rect.top - rect.height / 2) / rect.height)
    },
    [rawX, rawY]
  )

  const handleMouseLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  // ── Shared eyelid SVG (Mode B) ───────────────────────────────────────────
  function EyelidOverlay({ visible }: { visible: boolean }) {
    if (!visible) return null
    const style: CSSProperties = {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      transition: `opacity ${blinkPhoto.blinkMs / 2}ms ease`,
      opacity: visible ? 1 : 0,
    }
    return (
      <svg
        style={style}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Left eyelid */}
        <EyelidEllipse cx={blinkPhoto.leftEye.x} cy={blinkPhoto.leftEye.y} />
        {/* Right eyelid */}
        <EyelidEllipse cx={blinkPhoto.rightEye.x} cy={blinkPhoto.rightEye.y} />
      </svg>
    )
  }

  function EyelidEllipse({ cx, cy }: { cx: number; cy: number }) {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={blinkPhoto.eyeWidth / 2}
        ry={blinkPhoto.eyeHeight / 2}
        fill={blinkPhoto.skinColor}
      />
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const frameRadius = round ? 'rounded-full' : 'rounded-3xl'
  const innerFrameRadius = round ? 'rounded-full' : 'rounded-[calc(1.5rem-3px)]'
  const borderRadius = round ? '50%' : '1.5rem'

  return (
    <motion.div
      ref={containerRef}
      className={`relative flex-shrink-0 ${size} ${className}`}
      style={{ perspective: '800px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glowing gradient ring */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${frameRadius}`}
        style={{
          background:
            'conic-gradient(from 0deg, var(--accent), var(--accent-light), rgb(251 191 36), var(--accent))',
          padding: '3px',
          borderRadius,
          filter: 'blur(0px)',
        }}
      >
        <div className={`w-full h-full ${frameRadius} bg-surface dark:bg-surface`} />
      </div>

      {/* Animated glow pulse */}
      <motion.div
        aria-hidden="true"
        className={`absolute inset-0 ${frameRadius}`}
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Inner photo frame with float + parallax */}
      <motion.div
        className={`absolute inset-[3px] ${innerFrameRadius} overflow-hidden shadow-2xl`}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* ── Mode: loading ── */}
        {mode === null && (
          <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        )}

        {/* ── Mode A: image-swap blink ── */}
        {mode === 'swap' && (
          <div className="relative w-full h-full">
            <img
              src={imageSrc}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-opacity"
              style={{ opacity: isBlinking ? 0 : 1, objectPosition }}
            />
            <img
              src={closedImageSrc}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-opacity"
              style={{ opacity: isBlinking ? 1 : 0, objectPosition }}
            />
          </div>
        )}

        {/* ── Mode B: open photo + SVG eyelid overlay ── */}
        {mode === 'overlay' && (
          <div className="relative w-full h-full">
            <img
              src={imageSrc}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              style={{ objectPosition }}
            />
            <EyelidOverlay visible={isBlinking} />
          </div>
        )}

        {/* ── Mode C: stylish placeholder ── */}
        {mode === 'placeholder' && (
          <PlaceholderPhoto isBlinking={isBlinking} blinkMs={blinkPhoto.blinkMs} />
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Placeholder (no photo files yet) ───────────────────────────────────────
function PlaceholderPhoto({ isBlinking, blinkMs }: { isBlinking: boolean; blinkMs: number }) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgb(26 26 46) 0%, rgb(22 33 62) 40%, rgb(15 52 96) 70%, rgb(26 26 46) 100%)',
      }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Initials */}
      <span
        className="relative font-bold text-foreground/90 select-none"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '-0.03em' }}
      >
        MW
      </span>

      {/* Abstract eye pair */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 20"
        className="absolute"
        style={{ width: '55%', top: '58%', left: '50%', transform: 'translateX(-50%)' }}
      >
        {/* Left eye */}
        <AbstractEye cx={28} isBlinking={isBlinking} blinkMs={blinkMs} />
        {/* Right eye */}
        <AbstractEye cx={72} isBlinking={isBlinking} blinkMs={blinkMs} />
      </svg>

      {/* Gentle outer ring pulse */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl"
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          border: '2px solid rgba(249,115,22,0.6)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function AbstractEye({ cx, isBlinking, blinkMs }: { cx: number; isBlinking: boolean; blinkMs: number }) {
  // Open: full ellipse. Closed: flattened to a line.
  const ry = isBlinking ? 0.5 : 5
  return (
    <ellipse
      cx={cx}
      cy={10}
      rx={12}
      ry={ry}
      fill="none"
      stroke="rgba(249,115,22,0.85)"
      strokeWidth={1.5}
      style={{ transition: `ry ${blinkMs / 2}ms ease` }}
    />
  )
}
