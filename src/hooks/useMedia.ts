import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface MediaAsset {
  name: string
  type: string
  data: string
  createdAt?: unknown
}

const cache = new Map<string, Promise<MediaAsset | null>>()

export function loadMedia(reference: string): Promise<MediaAsset | null> {
  const id = reference.startsWith('media:') ? reference.slice(6) : ''
  if (!id || !db) return Promise.resolve(null)
  const existing = cache.get(id)
  if (existing) return existing
  const request = getDoc(doc(db, 'media', id)).then(snapshot => {
    if (!snapshot.exists()) return null
    const value = snapshot.data()
    return typeof value.data === 'string'
      ? { name: String(value.name ?? 'file'), type: String(value.type ?? ''), data: value.data, createdAt: value.createdAt }
      : null
  }).catch(() => null)
  cache.set(id, request)
  return request
}

export function clearMediaCache(id: string) {
  cache.delete(id)
}

export function useMediaAsset(reference: string): MediaAsset | null {
  const [asset, setAsset] = useState<MediaAsset | null>(null)
  useEffect(() => {
    let active = true
    if (!reference.startsWith('media:')) {
      setAsset(null)
      return () => { active = false }
    }
    loadMedia(reference).then(value => { if (active) setAsset(value) })
    return () => { active = false }
  }, [reference])
  return asset
}

export function useResolvedMedia(reference: string, fallback = ''): string {
  const asset = useMediaAsset(reference)
  return reference.startsWith('media:') ? asset?.data ?? fallback : reference || fallback
}

export function dataUrlSize(data: string): number {
  const base64 = data.split(',')[1] ?? ''
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
}
