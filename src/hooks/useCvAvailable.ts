// src/hooks/useCvAvailable.ts
// Probes whether the CV PDF is accessible. Returns null while checking.
import { useEffect, useState } from 'react'
import { useSiteContent } from './useSiteContent'
import { useResolvedMedia } from './useMedia'

export function useCvAvailable(): boolean | null {
  const { cv } = useSiteContent()
  const resolvedUrl = useResolvedMedia(cv.url, '')
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    if (!resolvedUrl) { setAvailable(false); return }
    setAvailable(null)
    if (resolvedUrl.startsWith('data:')) { setAvailable(true); return }
    fetch(resolvedUrl, { method: 'HEAD' })
      .then(r => setAvailable(r.ok))
      .catch(() => setAvailable(false))
  }, [resolvedUrl])
  return available
}
