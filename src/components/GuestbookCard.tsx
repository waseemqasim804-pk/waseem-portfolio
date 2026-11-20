import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type GuestbookEntry = {
  id: string
  uid?: string
  name: string
  avatar?: string
  message: string
  approved?: boolean
  pinned?: boolean
  likedByAdmin?: boolean
  createdAt?: any
  updatedAt?: any
}

// Consistent letter circle background colors for visitors without avatars
const AVATAR_PALETTE = [
  'bg-orange-500',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-teal-600',
]

export function getAvatarColor(name: string = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function formatEntryDate(timestamp: any): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

type GuestbookCardProps = {
  entry: GuestbookEntry
  onSeeFull?: (entry: GuestbookEntry) => void
  isOwner?: boolean
  onEdit?: (entry: GuestbookEntry) => void
  onDelete?: (entry: GuestbookEntry) => void
  className?: string
}

export default function GuestbookCard({
  entry,
  onSeeFull,
  isOwner,
  onEdit,
  onDelete,
  className = '',
}: GuestbookCardProps) {
  const reducedMotion = useReducedMotion() ?? false
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, active: false })

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    })
  }

  const handlePointerLeave = () => {
    setSpotlight(prev => ({ ...prev, active: false }))
  }

  const dateStr = formatEntryDate(entry.createdAt)
  const isLong = entry.message.length > 130 || entry.message.includes('\n')

  return (
    <motion.article
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-hover-list="guestbook-entries"
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`hover-card relative flex flex-col justify-between overflow-hidden rounded-[1.8rem] border border-neutral-200/80 bg-surface/70 p-6 shadow-sm backdrop-blur-md transition-colors duration-300 hover:border-orange-500/40 hover:shadow-lg dark:border-border/10 dark:bg-surface-inverse/[0.035] dark:hover:border-border/20 sm:p-7 ${className}`}
    >
      {/* Cursor-following soft orange spotlight on pointer devices (off under reduced motion) */}
      {!reducedMotion && spotlight.active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[1.8rem] opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(320px circle at ${spotlight.x}px ${spotlight.y}px, rgba(249,115,22,0.09), transparent 70%)`,
          }}
        />
      )}

      {/* Large faded quote mark in the top-right corner as watermark */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1 select-none font-serif text-[72px] font-black leading-none text-foreground/[0.04] dark:text-foreground/[0.06] sm:right-6 sm:top-2 sm:text-[92px]"
      >
        “
      </span>

      {/* Two-part card body */}
      <div className="relative z-10 flex items-start gap-4 sm:gap-5">
        {/* Left Column: Round avatar + uppercase tracked date */}
        <div className="flex w-12 shrink-0 flex-col items-center sm:w-14">
          {entry.avatar ? (
            <img
              src={entry.avatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-neutral-200/80 dark:ring-white/15 sm:h-14 sm:w-14"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              aria-hidden="true"
              className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-foreground shadow-inner sm:h-14 sm:w-14 sm:text-lg ${getAvatarColor(entry.name)}`}
            >
              {(entry.name || 'G').trim().charAt(0).toUpperCase()}
            </div>
          )}

          {dateStr && (
            <span className="mt-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted dark:text-muted">
              {dateStr}
            </span>
          )}
        </div>

        {/* Right Part: Name in script/calligraphy font, thin divider, clamped message */}
        <div className="min-w-0 flex-1 pr-4 sm:pr-6">
          <p className="truncate font-script text-2xl text-foreground dark:text-foreground sm:text-[28px]">
            {entry.name || 'Anonymous Guest'}
          </p>

          <div className="my-2.5 h-px w-full bg-neutral-200/90 dark:bg-surface-inverse/10" />

          {/* Clamped to 3 lines with ellipsis — plain text only (no HTML) */}
          <p className="line-clamp-3 text-pretty break-words text-sm leading-relaxed text-muted dark:text-muted sm:text-[15px]">
            {entry.message}
          </p>

          {isLong && onSeeFull && (
            <button
              type="button"
              onClick={() => onSeeFull(entry)}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent-foreground transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:underline dark:text-orange-400"
            >
              See Full →
            </button>
          )}
        </div>
      </div>

      {/* Footer line: Pinned, Liked by Waseem, or Owner Controls */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-border/5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {entry.pinned && (
            <span className="inline-flex items-center gap-1 font-semibold text-accent-foreground dark:text-orange-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z" />
              </svg>
              Pinned
            </span>
          )}

          {entry.likedByAdmin && (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-500 dark:text-rose-400">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Liked by Waseem
            </span>
          )}

          {!entry.pinned && !entry.likedByAdmin && (
            <span className="text-[11px] text-muted dark:text-muted">
              Verified visitor
            </span>
          )}
        </div>

        {/* Owner Controls (Edit / Delete your own entry) */}
        {isOwner && (
          <div className="flex items-center gap-2 text-xs">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="font-medium text-muted transition-colors hover:text-accent-foreground dark:text-muted dark:hover:text-orange-400"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="font-medium text-muted transition-colors hover:text-rose-500 dark:text-muted dark:hover:text-rose-400"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}
