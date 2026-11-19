export type BlogDateValue = unknown

export function resolveBlogDate(value: BlogDateValue, fallback?: BlogDateValue): Date | null {
  for (const candidate of [value, fallback]) {
    if (!candidate) continue
    if (candidate instanceof Date) {
      if (!Number.isNaN(candidate.getTime())) return candidate
      continue
    }
    if (typeof candidate === 'number') {
      const date = new Date(candidate)
      if (!Number.isNaN(date.getTime())) return date
    }
    if (typeof candidate === 'string') {
      const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(candidate) ? `${candidate}T12:00:00` : candidate)
      if (!Number.isNaN(date.getTime())) return date
    }
    if (typeof candidate === 'object' && candidate !== null && 'toDate' in candidate && typeof candidate.toDate === 'function') {
      const date = candidate.toDate()
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date
    }
  }
  return null
}

export function blogDateInput(value: BlogDateValue, fallback?: BlogDateValue): string {
  const date = resolveBlogDate(value, fallback)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatBlogDate(value: BlogDateValue, fallback?: BlogDateValue): string {
  return resolveBlogDate(value, fallback)?.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) ?? ''
}

export function blogDateIso(value: BlogDateValue, fallback?: BlogDateValue): string | undefined {
  return resolveBlogDate(value, fallback)?.toISOString()
}

export function estimateReadTime(markdown: string): number {
  const plainText = markdown
    .replace(/(?:`{3,}|~{3,})[\s\S]*?(?:`{3,}|~{3,})/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
  const words = plainText.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  return Math.max(1, Math.ceil(words / 220))
}

export function postTags(post: { tags?: unknown; category?: unknown }): string[] {
  if (Array.isArray(post.tags)) {
    const tags = post.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean)
    if (tags.length) return [...new Set(tags)]
  }
  if (typeof post.tags === 'string') {
    const tags = post.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    if (tags.length) return [...new Set(tags)]
  }
  if (typeof post.category === 'string' && post.category.trim()) return [post.category.trim()]
  return []
}

export function postReadTime(post: { readTime?: unknown; content?: unknown }): number {
  const saved = Number(post.readTime)
  return Number.isFinite(saved) && saved > 0
    ? Math.max(1, Math.round(saved))
    : estimateReadTime(typeof post.content === 'string' ? post.content : '')
}
