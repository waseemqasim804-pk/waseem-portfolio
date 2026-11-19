// src/components/CertLightbox.tsx
// Lightbox for certificate images/PDFs — arrow keys, Esc, focus trap, lazy media.
import { useEffect, useRef, useCallback, useState } from 'react'
import { useResolvedMedia } from '../hooks/useMedia'

export interface CertItem {
  name: string
  issuer: string
  date: string
  credentialUrl: string
  description: string
  file: string      // path or media:id
  thumbnail: string // path or media:id (small)
  visible: boolean
}

interface Props {
  certs: CertItem[]
  index: number
  onClose: () => void
  onNav: (index: number) => void
}

function CertMedia({ file, alt }: { file: string; alt: string }) {
  const src = useResolvedMedia(file, '')
  const isPdf = file.endsWith('.pdf') || src.startsWith('data:application/pdf')

  if (!src) return <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">Loading…</div>

  if (isPdf) {
    return (
      <div className="flex flex-col gap-3">
        <iframe src={`${src}#view=FitH`} title={alt} className="w-full h-[60vh] rounded-xl border border-neutral-700" />
        <a href={src} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark transition-colors self-center">
          Open in new tab ↗
        </a>
      </div>
    )
  }

  return (
    <img src={src} alt={alt} className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain" />
  )
}

export default function CertLightbox({ certs, index, onClose, onNav }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const cert = certs[index]
  const hasPrev = index > 0
  const hasNext = index < certs.length - 1

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
    if (e.key === 'ArrowLeft' && hasPrev) {
      e.preventDefault()
      onNav(index - 1)
    }
    if (e.key === 'ArrowRight' && hasNext) {
      e.preventDefault()
      onNav(index + 1)
    }
    if (e.key === 'Tab') {
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) {
        e.preventDefault()
        overlayRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === overlayRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose, onNav, index, hasPrev, hasNext])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    overlayRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!cert) return null

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Certificate: ${cert.name}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 outline-none"
    >
      <div className="relative max-w-3xl w-full bg-neutral-900 rounded-2xl border border-neutral-700 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand z-10">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Media */}
        {cert.file && <div className="mb-6"><CertMedia file={cert.file} alt={cert.name} /></div>}

        {/* Info */}
        <h2 className="text-xl font-bold text-white mb-1">{cert.name}</h2>
        <p className="text-sm text-neutral-400">{cert.issuer} · {cert.date}</p>
        {cert.description && <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{cert.description}</p>}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-5">
          {cert.credentialUrl && (
            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              Verify ↗
            </a>
          )}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-between mt-6">
          <button disabled={!hasPrev} onClick={() => onNav(index - 1)} aria-label="Previous"
            className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs text-neutral-500 self-center">{index + 1} / {certs.length}</span>
          <button disabled={!hasNext} onClick={() => onNav(index + 1)} aria-label="Next"
            className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Thumbnail helper for grid views ──────────────────────────────
export function CertThumbnail({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  const resolved = useResolvedMedia(src, '')
  if (!resolved) return null
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={onClick ? `View ${alt}` : undefined}
      className={`block w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 ${onClick ? 'cursor-pointer hover:border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors' : ''}`}
    >
      <img src={resolved} alt={alt} loading="lazy" className="w-full h-32 object-cover" />
    </Tag>
  )
}
