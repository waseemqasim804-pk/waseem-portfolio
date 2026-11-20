import { useState, type ReactNode } from 'react'
import { useResolvedMedia } from '../hooks/useMedia'
import { useSiteContent } from '../hooks/useSiteContent'

export type BlogHeading = { id: string; text: string; level: number }

type MarkdownBlock =
  | { type: 'heading'; id: string; text: string; level: number }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; language: string; text: string }
  | { type: 'image'; alt: string; src: string; caption: string }

function slugifyHeading(text: string): string {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section'
}

function isBlockStart(line: string): boolean {
  return /^(?:`{3,}|~{3,})|^#{1,6}\s|^\s*>|^\s*[-+*]\s+|^\s*\d+[.)]\s+|^\s*!\[[^\]]*\]\(/.test(line)
}

function parseImage(line: string): MarkdownBlock | null {
  const match = /^\s*!\[([^\]]*)\]\((\S+?)(?:\s+["'](.+?)["'])?\)\s*$/.exec(line)
  return match ? { type: 'image', alt: match[1], src: match[2], caption: match[3] ?? '' } : null
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  const headingCounts = new Map<string, number>()
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }

    const fence = /^(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      const marker = fence[1][0]
      const markerLength = fence[1].length
      const language = fence[2].trim()
      const code: string[] = []
      index++
      const closeFence = new RegExp(`^${marker}{${markerLength},}\\s*$`)
      while (index < lines.length && !closeFence.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index++
      blocks.push({ type: 'code', language, text: code.join('\n') })
      continue
    }

    const image = parseImage(line)
    if (image) { blocks.push(image); index++; continue }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const text = heading[2].trim()
      const base = slugifyHeading(text)
      const count = headingCounts.get(base) ?? 0
      headingCounts.set(base, count + 1)
      blocks.push({ type: 'heading', text, level: heading[1].length, id: count ? `${base}-${count + 1}` : base })
      index++
      continue
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''))
      blocks.push({ type: 'quote', text: quote.join('\n') })
      continue
    }

    const unordered = /^\s*[-+*]\s+/.test(line)
    const ordered = /^\s*\d+[.)]\s+/.test(line)
    if (unordered || ordered) {
      const items: string[] = []
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-+*]\s+/
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ''))
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    const paragraph = [line]
    index++
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) paragraph.push(lines[index++])
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
  }
  return blocks
}

export function getBlogHeadings(markdown: string): BlogHeading[] {
  return parseMarkdown(markdown)
    .filter((block): block is Extract<MarkdownBlock, { type: 'heading' }> => block.type === 'heading' && block.level === 2)
    .map(({ id, text, level }) => ({ id, text, level }))
}

function safeUrl(value: string, image = false): string | null {
  const href = value.trim()
  if (!href || href.startsWith('media:')) return image && href.startsWith('media:') ? href : null
  if (href.startsWith('#') || href.startsWith('/')) return href
  try {
    const url = new URL(href, 'https://portfolio.invalid')
    const allowed = image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:']
    return allowed.includes(url.protocol) ? href : null
  } catch {
    return null
  }
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+\*|_[^_\n]+_)/g)
  return tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={index} className="rounded-md bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[0.9em] text-accent-foreground dark:bg-neutral-800 dark:text-orange-300">{token.slice(1, -1)}</code>
    }
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={index} className="font-semibold text-foreground dark:text-foreground">{token.slice(2, -2)}</strong>
    }
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      return <em key={index} className="italic text-muted dark:text-foreground">{token.slice(1, -1)}</em>
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
    if (link) {
      const href = safeUrl(link[2])
      if (!href) return <span key={index}>{link[1]}</span>
      const external = /^https?:\/\//i.test(href)
      return <a key={index} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="text-accent-foreground underline decoration-orange-500/40 underline-offset-4 transition-colors hover:text-blue-500 dark:text-orange-300 dark:hover:text-blue-300">{link[1]}</a>
    }
    return token
  })
}

function MarkdownImage({ alt, src, caption }: { alt: string; src: string; caption: string }) {
  const safeSrc = safeUrl(src, true)
  const resolvedSrc = useResolvedMedia(safeSrc ?? '', '')
  if (!safeSrc || !resolvedSrc) return null
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100/70 dark:border-border/10 dark:bg-surface-inverse/[0.03]">
      <img src={resolvedSrc} alt={alt} loading="lazy" className="max-h-[640px] w-full object-contain" />
      {caption && <figcaption className="px-4 py-3 text-center text-sm text-muted dark:text-muted">{caption}</figcaption>}
    </figure>
  )
}

function CodeBlock({ language, text, copyLabel, copiedLabel, copyAriaLabel }: { language: string; text: string; copyLabel: string; copiedLabel: string; copyAriaLabel: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="group relative my-6 overflow-hidden rounded-2xl border border-border/10 bg-[var(--surface)] text-foreground shadow-xl shadow-black/10">
      <div className="flex min-h-10 items-center justify-between border-b border-border/10 px-4 text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>{language || 'Code'}</span>
        <button type="button" onClick={() => void copy()} className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-surface/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label={copyAriaLabel}>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-[13px] leading-7"><code>{text}</code></pre>
    </div>
  )
}

export default function BlogMarkdown({ markdown }: { markdown: string }) {
  const { blog } = useSiteContent()
  const blocks = parseMarkdown(markdown)
  return (
    <div className="blog-markdown min-w-0 text-[16px] leading-8 text-muted dark:text-muted sm:text-[17px]">
      {blocks.map((block, index) => {
        if (block.type === 'code') return <CodeBlock key={index} language={block.language} text={block.text} copyLabel={blog.copyCode} copiedLabel={blog.copiedCode} copyAriaLabel={blog.copyCodeAria} />
        if (block.type === 'image') return <MarkdownImage key={index} alt={block.alt} src={block.src} caption={block.caption} />
        if (block.type === 'quote') return <blockquote key={index} className="my-6 border-l-2 border-orange-400 py-1 pl-5 text-lg italic leading-relaxed text-muted dark:text-foreground">{renderInline(block.text)}</blockquote>
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul'
          return <Tag key={index} className={`my-5 space-y-2 pl-6 marker:text-accent-foreground ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
            {block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderInline(item)}</li>)}
          </Tag>
        }
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h2' : block.level === 3 ? 'h3' : block.level === 4 ? 'h4' : 'h5'
          const size = block.level <= 2 ? 'mt-14 text-3xl sm:text-4xl' : block.level === 3 ? 'mt-10 text-2xl' : 'mt-8 text-xl'
          return <Tag key={index} id={block.id} className={`scroll-mt-28 font-bold leading-tight tracking-tight text-foreground dark:text-foreground ${size}`}>{renderInline(block.text)}</Tag>
        }
        return <p key={index} className="my-5 whitespace-pre-line">{renderInline(block.text)}</p>
      })}
    </div>
  )
}
