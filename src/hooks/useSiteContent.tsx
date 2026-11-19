import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { content } from '../data/content'
import { db } from '../lib/firebase'

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T

export type SiteContent = Mutable<typeof content>

const defaultContent = content as unknown as SiteContent
const SiteContentContext = createContext<SiteContent>(defaultContent)

type ContentRecord = Record<string, unknown>

function mergeRecord(base: ContentRecord, remote: ContentRecord): ContentRecord {
  const merged: ContentRecord = { ...base }
  for (const [key, value] of Object.entries(remote)) {
    const current = merged[key]
    if (value == null) continue
    if (Array.isArray(value) && Array.isArray(current)) {
      const defaultsById = new Map<string, ContentRecord>()
      for (const item of current) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const id = (item as ContentRecord).id
          if (typeof id === 'string') defaultsById.set(id, item as ContentRecord)
        }
      }

      merged[key] = value.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item
        const record = item as ContentRecord
        const id = record.id
        const defaults = typeof id === 'string' ? defaultsById.get(id) : undefined
        return defaults ? mergeRecord(defaults, record) : item
      })
      continue
    }
    if (value && typeof value === 'object' && !Array.isArray(value)
      && current && typeof current === 'object' && !Array.isArray(current)) {
      merged[key] = mergeRecord(current as ContentRecord, value as ContentRecord)
    } else {
      merged[key] = value
    }
  }
  return merged
}

function mergeContent(base: SiteContent, remote: Partial<SiteContent>): SiteContent {
  return mergeRecord(base as unknown as ContentRecord, remote as ContentRecord) as unknown as SiteContent
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultContent)

  useEffect(() => {
    if (!db) return

    return onSnapshot(
      doc(db, 'content', 'site'),
      snapshot => {
        setSiteContent(snapshot.exists()
          ? mergeContent(defaultContent, snapshot.data() as Partial<SiteContent>)
          : defaultContent)
      },
      () => setSiteContent(defaultContent),
    )
  }, [])

  return (
    <SiteContentContext.Provider value={siteContent}>
      {children}
    </SiteContentContext.Provider>
  )
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext)
}
