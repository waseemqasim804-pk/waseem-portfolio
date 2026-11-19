import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { clearMediaCache, dataUrlSize, useMediaAsset } from '../hooks/useMedia'
import { DEFAULT_LINK_ORDER, content } from '../data/content'
import TechIcon from './TechIcon'

type Section = { id: string; label: string; paths: string[] }

const SECTIONS: Section[] = [
  { id: 'brand', label: 'Brand', paths: ['brandLetter', 'brandLine1', 'brandLine2', 'brandLogoImage'] },
  { id: 'home', label: 'Home', paths: ['home', 'availability'] },
  { id: 'about', label: 'About', paths: ['about'] },
  { id: 'university-photos', label: 'University photos', paths: ['about.photos'] },

  { id: 'projects', label: 'Projects', paths: ['portfolio'] },
  { id: 'services', label: 'Services', paths: ['services'] },
  { id: 'awards', label: 'Awards', paths: ['awards'] },
  { id: 'faqs', label: 'FAQs', paths: ['faqs'] },
  { id: 'links', label: 'Links', paths: ['links'] },
  { id: 'contact', label: 'Contact & Social', paths: ['contact', 'settings'] },
  { id: 'navigation', label: 'Navigation', paths: ['navbar'] },
  { id: 'footer', label: 'Footer', paths: ['footer'] },
  { id: 'guestbook', label: 'Guestbook Page', paths: ['guestbook'] },
  { id: 'cv', label: 'CV, Experience & Certificates', paths: ['cv'] },
  { id: 'other', label: 'Other Content', paths: ['siteName', 'uses', 'blog', 'blinkPhoto'] },
  // Skills use home.techSkills; education uses about.education; FAQs use faqs.items.
  // Experience, certificates, and the CV asset are managed together under the CV tab.
]

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = target
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

function makeDraft(content: SiteContent, section: Section): Record<string, unknown> {
  return Object.fromEntries(section.paths.map(path => [
    path,
    path === 'uses' ? normalizeUsesDraft(getPath(content, path)) : clone(getPath(content, path)),
  ]))
}

function normalizeUsesDraft(value: unknown): unknown {
  const saved = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const fallbackSections = content.uses.sections as unknown as Array<Record<string, unknown>>
  const savedSections = Array.isArray(saved.sections) ? saved.sections as Array<Record<string, unknown>> : fallbackSections
  const sections = [...savedSections]
  for (const fallback of fallbackSections.filter(section => Array.isArray(section.items) && section.items.length === 0)) {
    if (!sections.some(section => section && section.title === fallback.title)) sections.push(clone(fallback))
  }

  return {
    ...content.uses,
    ...saved,
    sections: sections.map(section => ({
      ...section,
      visible: section.visible !== false,
      items: Array.isArray(section.items) ? section.items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item
        const record = item as Record<string, unknown>
        return {
          ...record,
          url: typeof record.url === 'string' ? record.url : '',
          icon: typeof record.icon === 'string' ? record.icon : '',
        }
      }) : [],
    })),
  }
}

function newArrayItem(items: unknown[], path: string): unknown {
  if (path === 'uses.sections') return { title: 'New category', visible: true, items: [] }
  if (path.startsWith('uses.sections.') && path.endsWith('.items')) {
    if (items.length === 0) return { name: '', note: '', url: '', icon: '' }
    const first = items[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return { ...(clone(first) as Record<string, unknown>), name: '', note: '', url: '', icon: '' }
    }
  }
  if (items.length === 0) return ''
  const first = items[0]
  if (Array.isArray(first)) return []
  if (first && typeof first === 'object') {
    const copy = clone(first) as Record<string, unknown>
    const suffix = Date.now().toString(36)
    if (typeof copy.id === 'string') copy.id = `${copy.id}-${suffix}`
    if (path === 'portfolio.projects') {
      if (typeof copy.slug === 'string') copy.slug = `${copy.slug}-${suffix}`
      const highestOrder = items.reduce<number>((highest, item) => {
        if (!item || typeof item !== 'object') return highest
        const order = (item as Record<string, unknown>).order
        return typeof order === 'number' && Number.isFinite(order) ? Math.max(highest, order) : highest
      }, 0)
      copy.order = highestOrder + 1
    }
    return copy
  }
  if (typeof first === 'number') return 0
  if (typeof first === 'boolean') return false
  return ''
}

function labelFor(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, char => char.toUpperCase())
}

function isImageField(key: string) {
  return /^(image|photo|cover|avatar|brandLogoImage|heroImage)$/i.test(key)
}

function isLongText(key: string, value: string) {
  return value.length > 100 || value.includes('\n') || /^(desc|description|long|lead|big|summary|answer|bio|p|q|tagline|footer)$/i.test(key)
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this file.'))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

function compressImage(file: File): Promise<{ data: string; type: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be opened. Try a different image.')) }
    image.onload = async () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
      let width = Math.max(1, Math.round(image.naturalWidth * scale))
      let height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Your browser could not process this image.')); return }
      while (width >= 1 && height >= 1) {
        canvas.width = width
        canvas.height = height
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)
        let blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/webp', 0.8))
        if (blob && blob.type !== 'image/webp') {
          blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/jpeg', 0.8))
        }
        if (!blob) { reject(new Error('Your browser could not compress this image.')); return }
        if (blob.size <= 250 * 1024) {
          resolve({ data: await readFile(new File([blob], file.name, { type: blob.type })), type: blob.type })
          return
        }
        width = Math.round(width * 0.85)
        height = Math.round(height * 0.85)
      }
      reject(new Error('This image is still too large after compression. Please choose a smaller image.'))
    }
    image.src = url
  })
}

type EditableTechSkill = {
  name?: string
  category?: string
  visible?: boolean
  url?: string
  icon?: string
  [key: string]: unknown
}

function TechSkillsEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const skills: unknown[] = Array.isArray(value) ? value : []
  const updateSkill = (index: number, changes: Partial<EditableTechSkill>) => {
    const current = skills[index]
    const skill = current && typeof current === 'object' ? current as EditableTechSkill : {}
    const updated = [...skills]
    updated[index] = { ...skill, ...changes }
    onChange(updated)
  }
  const moveSkill = (index: number, offset: -1 | 1) => {
    const destination = index + offset
    if (destination < 0 || destination >= skills.length) return
    const updated = [...skills]
    ;[updated[index], updated[destination]] = [updated[destination], updated[index]]
    onChange(updated)
  }
  const inputClass = 'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-brand focus:outline-none'

  return (
    <fieldset className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Technology skills</p>
        <button type="button" onClick={() => onChange([...skills, { name: 'New skill', category: '', visible: true, url: '', icon: '' }])} className="text-xs font-semibold text-brand hover:underline">Add skill</button>
      </div>
      {skills.length === 0 && <p className="text-sm text-neutral-500">No custom skills. The default skill list appears on the website until you add and save skills here.</p>}
      {skills.map((entry, index) => {
        const skill = entry && typeof entry === 'object' ? entry as EditableTechSkill : {}
        const name = typeof skill.name === 'string' ? skill.name : ''
        const iconName = typeof skill.icon === 'string' && skill.icon.trim() ? skill.icon : name

        return (
          <div key={index} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <TechIcon name={iconName || 'Skill'} size={20} className="text-neutral-600 dark:text-neutral-300" />
                <span className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">{name || `Skill ${index + 1}`}</span>
                {skill.visible === false && <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-800">Hidden</span>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Move ${name || `skill ${index + 1}`} up`} disabled={index === 0} onClick={() => moveSkill(index, -1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Up</button>
                <button type="button" aria-label={`Move ${name || `skill ${index + 1}`} down`} disabled={index === skills.length - 1} onClick={() => moveSkill(index, 1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Down</button>
                <button type="button" aria-label={`Remove ${name || `skill ${index + 1}`}`} onClick={() => onChange(skills.filter((_, skillIndex) => skillIndex !== index))} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Remove</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="block text-xs font-medium text-neutral-500">Name</span>
                <input className={inputClass} type="text" value={name} onChange={event => updateSkill(index, { name: event.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="block text-xs font-medium text-neutral-500">Category</span>
                <input className={inputClass} type="text" value={typeof skill.category === 'string' ? skill.category : ''} onChange={event => updateSkill(index, { category: event.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="block text-xs font-medium text-neutral-500">Website URL (optional)</span>
                <input className={inputClass} type="url" placeholder="https://example.com" value={typeof skill.url === 'string' ? skill.url : ''} onChange={event => updateSkill(index, { url: event.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="block text-xs font-medium text-neutral-500">Icon override (optional)</span>
                <input className={inputClass} type="text" placeholder="docker" value={typeof skill.icon === 'string' ? skill.icon : ''} onChange={event => updateSkill(index, { icon: event.target.value })} />
              </label>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={skill.visible !== false} onChange={event => updateSkill(index, { visible: event.target.checked })} className="h-4 w-4 accent-orange-500" />
              Show on Home page
            </label>
          </div>
        )
      })}
    </fieldset>
  )
}

function MediaEditorField({ name, path, value, onChange }: {
  name: string
  path: string
  value: string
  onChange: (value: string) => void
}) {
  const isCv = path === 'cv.url'
  const asset = useMediaAsset(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputClass = 'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-brand focus:outline-none'
  const upload = async (file?: File) => {
    if (!file) return
    setError('')
    if (isCv && file.type !== 'application/pdf') { setError('Please choose a PDF file.'); return }
    if (isCv && file.size > 700 * 1024) { setError('That PDF is too large. Choose a file up to 700 KB.'); return }
    if (!isCv && !file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (!db) { setError('Firebase is not configured, so uploads are unavailable.'); return }
    setBusy(true)
    try {
      const packed = isCv ? { data: await readFile(file), type: 'application/pdf' } : await compressImage(file)
      const size = dataUrlSize(packed.data)
      if (isCv && size > 700 * 1024) throw new Error('That PDF is too large. Choose a file up to 700 KB.')
      if (!isCv && size > 250 * 1024) throw new Error('This image is still too large after compression. Please choose a smaller image.')
      const created = await addDoc(collection(db, 'media'), {
        name: file.name,
        type: packed.type,
        data: packed.data,
        createdAt: serverTimestamp(),
      })
      onChange(`media:${created.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    const id = value.startsWith('media:') ? value.slice(6) : ''
    if (id && db) {
      try { await deleteDoc(doc(db, 'media', id)); clearMediaCache(id) }
      catch { setError('Could not delete this upload. Check your connection and try again.'); return }
    }
    onChange('')
    setError('')
  }
  const size = asset ? dataUrlSize(asset.data) : 0
  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-neutral-500">{labelFor(name)}{isCv ? ' path or upload' : ' path'}</span>
        <input className={inputClass} type="text" placeholder={isCv ? '/cv/waseem-cv.pdf' : '/images/example.jpg'} value={value} onChange={event => onChange(event.target.value)} />
      </label>
      {asset && (isCv
        ? <a href={asset.data} target="_blank" rel="noreferrer" className="block text-sm text-brand underline">Preview {asset.name} · {formatSize(size)}</a>
        : <div className="flex items-center gap-3"><img src={asset.data} alt={`${name} preview`} loading="lazy" className="max-h-32 max-w-48 rounded border border-neutral-200 object-contain" /><span className="text-xs text-neutral-500">{asset.name} · {formatSize(size)}</span></div>)}
      {!asset && value && !value.startsWith('media:') && (isCv
        ? <a href={value} target="_blank" rel="noreferrer" className="block text-sm text-brand underline">Preview current PDF path</a>
        : <img src={value} alt={`${name} preview`} loading="lazy" className="max-h-32 max-w-48 rounded border border-neutral-200 object-contain" />)}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
          {busy ? 'Uploading…' : value ? 'Replace upload' : isCv ? 'Upload PDF' : 'Upload image'}
          <input type="file" accept={isCv ? 'application/pdf,.pdf' : 'image/*'} disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = '' }} className="sr-only" />
        </label>
        {value && <button type="button" onClick={() => void remove()} disabled={busy} className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50">Delete</button>}
      </div>
      {!isCv && <p className="text-xs text-neutral-500">Images are resized to at most 1600 px and compressed to 250 KB or less.</p>}
      {isCv && <p className="text-xs text-neutral-500">PDF files up to 700 KB.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

type EditableLink = {
  n?: number
  order?: number
  label: string
  url: string
  desc: string
  visible?: boolean
}
type UniversityPhoto = SiteContent['about']['photos'][number]

function LinksEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const rawLinks = Array.isArray(value) ? value as EditableLink[] : []
  const hasSavedOrder = rawLinks.length > 0 && rawLinks.every(link => typeof link.order === 'number')
  const links = [...rawLinks].sort((a, b) => {
    if (hasSavedOrder) return Number(a.order) - Number(b.order)
    const aRank = DEFAULT_LINK_ORDER.findIndex(label => label.toLowerCase() === a.label.toLowerCase())
    const bRank = DEFAULT_LINK_ORDER.findIndex(label => label.toLowerCase() === b.label.toLowerCase())
    return (aRank < 0 ? DEFAULT_LINK_ORDER.length : aRank) - (bRank < 0 ? DEFAULT_LINK_ORDER.length : bRank)
  })
  const withOrder = (items: EditableLink[]) => items.map((link, index) => ({ ...link, n: index + 1, order: index + 1 }))
  const update = (index: number, changes: Partial<EditableLink>) => {
    onChange(withOrder(links.map((link, linkIndex) => linkIndex === index ? { ...link, ...changes } : link)))
  }
  const move = (index: number, offset: -1 | 1) => {
    const destination = index + offset
    if (destination < 0 || destination >= links.length) return
    const updated = [...links]
    ;[updated[index], updated[destination]] = [updated[destination], updated[index]]
    onChange(withOrder(updated))
  }
  const inputClass = 'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-brand focus:outline-none'

  return (
    <fieldset className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Digital links</legend>
        <button type="button" onClick={() => onChange(withOrder([...links, { n: links.length + 1, order: links.length + 1, label: '', url: '', desc: '', visible: true }]))} className="text-xs font-semibold text-brand hover:underline">Add link</button>
      </div>
      {links.map((link, index) => (
        <div key={`${link.n}-${index}`} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{link.label || `Link ${index + 1}`}</span>
            <div className="flex gap-1">
              <button type="button" aria-label={`Move link ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Up</button>
              <button type="button" aria-label={`Move link ${index + 1} down`} disabled={index === links.length - 1} onClick={() => move(index, 1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Down</button>
              <button type="button" aria-label={`Remove ${link.label || `link ${index + 1}`}`} onClick={() => onChange(withOrder(links.filter((_, linkIndex) => linkIndex !== index)))} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Remove</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-neutral-500">Label
              <input className={inputClass} type="text" value={link.label} onChange={event => update(index, { label: event.target.value })} />
            </label>
            <label className="space-y-1 text-xs font-medium text-neutral-500">URL
              <input className={inputClass} type="text" inputMode="url" placeholder="https://…" value={link.url} onChange={event => update(index, { url: event.target.value })} />
            </label>
            <label className="space-y-1 text-xs font-medium text-neutral-500 sm:col-span-2">Description
              <textarea className={`${inputClass} min-h-20 resize-y`} rows={2} value={link.desc} onChange={event => update(index, { desc: event.target.value })} />
            </label>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={link.visible !== false} onChange={event => update(index, { visible: event.target.checked })} className="h-4 w-4 accent-orange-500" />
            Show on Links page and footer
          </label>
        </div>
      ))}
      {links.length === 0 && <p className="text-sm text-neutral-500">The default links remain available on the site until you add and save links here.</p>}
    </fieldset>
  )
}

function UniversityPhotosEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const photos = Array.isArray(value) ? value as UniversityPhoto[] : []
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)
  const inputClass = 'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-brand focus:outline-none'

  const update = (index: number, changes: Partial<UniversityPhoto>) => {
    onChange(photos.map((photo, photoIndex) => photoIndex === index ? { ...photo, ...changes } : photo))
  }
  const move = (index: number, offset: -1 | 1) => {
    const destination = index + offset
    if (destination < 0 || destination >= photos.length) return
    const updated = [...photos]
    ;[updated[index], updated[destination]] = [updated[destination], updated[index]]
    onChange(updated)
  }
  const remove = async (index: number) => {
    const reference = photos[index]?.image ?? ''
    const mediaId = reference.startsWith('media:') ? reference.slice(6) : ''
    setError('')
    setRemoving(index)
    if (mediaId && db) {
      try {
        await deleteDoc(doc(db, 'media', mediaId))
        clearMediaCache(mediaId)
      } catch {
        setError('Could not delete this photo upload. Check your connection and try again.')
        setRemoving(null)
        return
      }
    }
    onChange(photos.filter((_, photoIndex) => photoIndex !== index))
    setRemoving(null)
  }

  return (
    <fieldset className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <legend className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">University photos</legend>
          <p className="mt-1 text-xs text-neutral-500">Upload up to 8 photos. Images are compressed and stored in the existing media collection.</p>
        </div>
        <button
          type="button"
          disabled={photos.length >= 8}
          onClick={() => onChange([...photos, { image: '', caption: '', visible: true }])}
          className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200"
        >
          Add photo
        </button>
      </div>
      {photos.map((photo, index) => (
        <div key={`${photo.image}-${index}`} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Photo {index + 1}</span>
            <div className="flex gap-1">
              <button type="button" aria-label={`Move university photo ${index + 1} up`} disabled={index === 0 || removing !== null} onClick={() => move(index, -1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Up</button>
              <button type="button" aria-label={`Move university photo ${index + 1} down`} disabled={index === photos.length - 1 || removing !== null} onClick={() => move(index, 1)} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-neutral-700">Down</button>
              <button type="button" disabled={removing !== null} onClick={() => void remove(index)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40">{removing === index ? 'Removing…' : 'Remove'}</button>
            </div>
          </div>
          <MediaEditorField name="image" path={`about.photos.${index}.image`} value={photo.image ?? ''} onChange={image => update(index, { image })} />
          <label className="mt-4 block space-y-1">
            <span className="block text-xs font-medium text-neutral-500">Caption (optional)</span>
            <input className={inputClass} type="text" maxLength={120} value={photo.caption ?? ''} onChange={event => update(index, { caption: event.target.value })} />
          </label>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={photo.visible !== false} onChange={event => update(index, { visible: event.target.checked })} className="h-4 w-4 accent-orange-500" />
            Show on About page
          </label>
        </div>
      ))}
      {photos.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-700">No university photos added yet.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </fieldset>
  )
}

function EditorField({
  name,
  path,
  value,
  onChange,
}: {
  name: string
  path: string
  value: unknown
  onChange: (value: unknown) => void
}) {
  const label = path.startsWith('uses.sections.') && name === 'note' ? 'Description' : labelFor(name)
  const inputClass = 'w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-brand focus:outline-none'

  if (path === 'home.techSkills') {
    return <TechSkillsEditor value={value} onChange={onChange} />
  }

  if (path === 'links.items') {
    return <LinksEditor value={value} onChange={onChange} />
  }

  if (path === 'about.photos') {
    return <UniversityPhotosEditor value={value} onChange={onChange} />
  }

  if (Array.isArray(value)) {
    return (
      <fieldset className="space-y-3 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{label}</legend>
          <button type="button" onClick={() => onChange([...value, path.endsWith('.screenshots') ? { id: `screenshot-${Date.now()}`, image: '', alt: '' } : path === 'home.gallery' ? { image: '', visible: true } : newArrayItem(value, path)])} className="text-xs font-semibold text-brand hover:underline">Add item</button>
        </div>
        {value.map((item, index) => {
          const resumeLink = item && typeof item === 'object' && (item as Record<string, unknown>).to === '/resume'
          const hideLegacyResumeLink = resumeLink && (path === 'navbar.more.extraItems' || path.startsWith('footer.columns.') && path.endsWith('.links'))
          if (hideLegacyResumeLink) return null
          return (
          <div key={index} className="flex items-start gap-2">
            {item !== null && typeof item === 'object' ? (
              <details className="min-w-0 flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300">{label} {index + 1}</summary>
                <div className="mt-3 space-y-3">
                  <EditorField
                    name={`${label} ${index + 1}`}
                    path={`${path}.${index}`}
                    value={item}
                    onChange={next => {
                      const updated = [...value]
                      updated[index] = next
                      onChange(updated)
                    }}
                  />
                </div>
              </details>
            ) : (
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-neutral-500">{label} {index + 1}</label>
                <input
                  className={inputClass}
                  type={typeof item === 'number' ? 'number' : 'text'}
                  value={String(item ?? '')}
                  onChange={event => {
                    const updated = [...value]
                    updated[index] = typeof item === 'number' ? Number(event.target.value) : event.target.value
                    onChange(updated)
                  }}
                />
              </div>
            )}
            <div className="flex shrink-0 gap-1 pt-1">
              <button type="button" aria-label={`Move ${label} ${index + 1} up`} disabled={index === 0} onClick={() => {
                const updated = [...value]
                ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
                onChange(updated)
              }} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30">Up</button>
              <button type="button" aria-label={`Move ${label} ${index + 1} down`} disabled={index === value.length - 1} onClick={() => {
                const updated = [...value]
                ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
                onChange(updated)
              }} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-30">Down</button>
              <button type="button" aria-label={`Remove ${label} ${index + 1}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Remove</button>
            </div>
          </div>
          )
        })}
      </fieldset>
    )
  }

  if (value !== null && typeof value === 'object') {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{label}</legend>
        <div className="space-y-3">
          {Object.entries(value as Record<string, unknown>).filter(([key]) => {
            if (path === 'about' && ['photos', 'aboutFaqs', 'timeline', 'skills'].includes(key)) return false
            if (path === 'home' && ['experience', 'education', 'certifications', 'skillGroups'].includes(key)) return false
            if (path === 'cv' && key.startsWith('resume')) return false
            return true
          }).map(([key, child]) => (
            <EditorField
              key={key}
              name={key}
              path={`${path}.${key}`}
              value={child}
              onChange={next => onChange({ ...value, [key]: next })}
            />
          ))}
        </div>
      </fieldset>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-3 py-1 text-sm text-neutral-700 dark:text-neutral-300">
        <input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-orange-500" />
        <span>{label}</span>
      </label>
    )
  }

  if (typeof value === 'number') {
    return (
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-neutral-500">{label}</span>
        <input className={inputClass} type="number" value={value} onChange={event => onChange(Number(event.target.value))} />
      </label>
    )
  }

  const text = String(value ?? '')
  if (isImageField(name) || path === 'cv.url') {
    return <MediaEditorField name={name} path={path} value={text} onChange={onChange as (value: string) => void} />
  }
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-neutral-500">{label}{isImageField(name) ? ' path' : ''}</span>
      {isLongText(name, text) ? (
        <textarea className={`${inputClass} min-h-24 resize-y`} rows={4} value={text} onChange={event => onChange(event.target.value)} />
      ) : (
        <input className={inputClass} type="text" placeholder={isImageField(name) ? '/images/example.jpg' : undefined} value={text} onChange={event => onChange(event.target.value)} />
      )}
      {isImageField(name) && text && (
        <img src={text} alt={`${label} preview`} loading="lazy" className="mt-2 max-h-40 max-w-full rounded border border-neutral-200 object-contain" />
      )}
    </label>
  )
}

export default function AdminContentEditor() {
  const content = useSiteContent()
  const [sectionId, setSectionId] = useState(SECTIONS[0].id)
  const section = SECTIONS.find(item => item.id === sectionId) ?? SECTIONS[0]
  const [draft, setDraft] = useState(() => makeDraft(content, SECTIONS[0]))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!dirty) setDraft(makeDraft(content, section))
  }, [content, dirty, section])

  const selectSection = (next: Section) => {
    setSectionId(next.id)
    setDraft(makeDraft(content, next))
    setDirty(false)
    setToast('')
  }

  const updateDraft = (path: string, value: unknown) => {
    setDraft(current => ({ ...current, [path]: value }))
    setDirty(true)
    setToast('')
  }

  const save = async () => {
    if (!db) return
    setSaving(true)
    setToast('')
    try {
      const updates: Record<string, unknown> = {}
      for (const path of section.paths) setPath(updates, path, draft[path])
      if ('availability' in draft) {
        const batch = writeBatch(db)
        batch.set(doc(db, 'content', 'site'), updates, { merge: true })
        batch.set(doc(db, 'availability', 'config'), draft.availability)
        await batch.commit()
      } else {
        await setDoc(doc(db, 'content', 'site'), updates, { merge: true })
      }
      setDirty(false)
      setToast(`${section.label} saved.`)
    } catch {
      setToast('Save failed. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        {SECTIONS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectSection(item)}
            aria-pressed={section.id === item.id}
            className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${section.id === item.id ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {section.paths.map(path => (
          <div key={path} className="space-y-4 border-b border-neutral-200 pb-6 last:border-0 dark:border-neutral-800">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{labelFor(path.split('.').pop() ?? path)}</h2>
            <EditorField name={path.split('.').pop() ?? path} path={path} value={draft[path]} onChange={value => updateDraft(path, value)} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={!db || saving} className="rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {toast && <p role="status" className={`text-sm ${toast.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{toast}</p>}
      </div>
    </section>
  )
}
