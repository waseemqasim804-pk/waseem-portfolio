import { useEffect, useState } from 'react'

const previewCache = new Map<string, string>()

export default function CvPreview({ url, onStatus }: { url: string; onStatus: (status: 'loading' | 'ready' | 'failed') => void }) {
  const [preview, setPreview] = useState(() => previewCache.get(url) ?? '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cacheKey = `cv-preview:${url}`
    const cached = previewCache.get(url) || (() => {
      try { return sessionStorage.getItem(cacheKey) ?? '' } catch { return '' }
    })()
    if (cached) {
      previewCache.set(url, cached)
      setPreview(cached)
      onStatus('ready')
      return
    }

    setPreview('')
    setFailed(false)
    onStatus('loading')
    void (async () => {
      try {
        const [{ getDocument, GlobalWorkerOptions }, bytes] = await Promise.all([
          import('pdfjs-dist'),
          fetch(url).then(response => {
            if (!response.ok) throw new Error('CV PDF could not be loaded')
            return response.arrayBuffer()
          }),
        ])
        GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise
        const page = await pdf.getPage(1)
        const base = page.getViewport({ scale: 1 })
        const scale = Math.min(1.15, 520 / base.width)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('Canvas is unavailable')
        context.fillStyle = 'rgb(255 255 255)'
        context.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: context, viewport }).promise
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
        if (cancelled) return
        previewCache.set(url, dataUrl)
        try { sessionStorage.setItem(cacheKey, dataUrl) } catch { /* session cache is optional */ }
        setPreview(dataUrl)
        onStatus('ready')
      } catch {
        if (!cancelled) { setFailed(true); onStatus('failed') }
      }
    })()

    return () => { cancelled = true }
  }, [url, onStatus])

  if (failed) return <DocumentPlaceholder />
  if (!preview) return <div aria-hidden="true" className="cv-preview-skeleton aspect-[0.72] w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
  return <img src={preview} alt="Preview of Waseem Qasim's CV" className="cv-preview-image aspect-[0.72] w-full rounded-xl object-cover object-top shadow-md" />
}

export function DocumentPlaceholder() {
  return <div aria-hidden="true" className="cv-preview-fallback grid aspect-[0.72] w-full place-items-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"><svg className="h-16 w-16" viewBox="0 0 100 100" fill="none"><path d="M28 12h29l20 20v55H28z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /><path d="M57 12v21h20M39 49h27M39 61h27M39 73h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
}
