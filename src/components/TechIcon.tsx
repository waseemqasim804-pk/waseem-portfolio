// src/components/TechIcon.tsx
// Renders an inline SVG brand icon for a tech name using simple-icons (named imports only).
// Falls back to a rounded letter badge when no icon is found.

import {
  siPython, siCplusplus, siMysql, siPytorch, siLangchain,
  siHuggingface, siOpencv, siPandas, siGradio,
  siReact, siJavascript, siTypescript, siFastapi, siFlask,
  siSupabase, siFirebase, siGit,
  siHtml5, siCss, siTailwindcss,
  siFramer, siVite, siNodedotjs, siDocker, siStreamlit,
  siGithub, siYolo,
  siDell, siGooglecolab, siKaggle, siNpm,
  type SimpleIcon,
} from 'simple-icons'

// ─── Alias map (lowercase key → SimpleIcon) ────────────────────────────────
const ICON_MAP: Record<string, SimpleIcon> = {}
const register = (icon: SimpleIcon, ...aliases: string[]) => {
  ICON_MAP[icon.title.toLowerCase()] = icon
  ICON_MAP[icon.slug.toLowerCase()] = icon
  for (const a of aliases) ICON_MAP[a.toLowerCase()] = icon
}

register(siPython, 'python3')
register(siCplusplus, 'c++', 'cpp')
register(siMysql)
register(siPytorch, 'torch')
register(siLangchain)
register(siHuggingface, 'hugging face', 'hf')
register(siOpencv)
register(siPandas)
register(siGradio)
register(siReact, 'react.js', 'reactjs')
register(siJavascript, 'js')
register(siTypescript, 'ts')
register(siFastapi, 'fast api')
register(siFlask)
register(siSupabase)
register(siFirebase)
register(siGit)
register(siHtml5, 'html')
register(siCss, 'css', 'css3')
register(siTailwindcss, 'tailwind css', 'tailwind')
register(siFramer, 'framer motion')
register(siVite)
register(siNodedotjs, 'node.js', 'nodejs', 'node')
register(siDocker)
register(siStreamlit)
register(siGithub)
register(siYolo, 'yolov8', 'yolo v8')
register(siDell, 'dell laptop')
register(siGooglecolab, 'google colab')
register(siKaggle)
register(siNpm, 'npm')

function lookup(name: string): SimpleIcon | undefined {
  return ICON_MAP[name.trim().toLowerCase()]
}

const CUSTOM_TECH_COLORS: Record<string, string> = {
  sql: '#4472c4',
  groq: '#f55036',
  rag: '#a855f7',
  websockets: '#7c3aed',
  azure: '#0078d4',
}

export function getTechBrandColor(name: string): string {
  const icon = lookup(name)
  if (icon) return `#${icon.hex}`
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return CUSTOM_TECH_COLORS[key] || '#64748b'
}

export function getTechBrandTint(name: string): string {
  return getContrastMode(name, lookup(name)) === 'dark' ? '#a3a3a3' : getTechBrandColor(name)
}

function getContrastMode(name: string, icon?: SimpleIcon): 'dark' | 'bright' | undefined {
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['github', 'flask', 'pandas'].includes(key) || ['github', 'flask', 'pandas'].includes(icon?.slug || '')) return 'dark'
  if (!icon) return undefined
  const hex = icon.hex
  const luminance = [0, 2, 4].reduce((sum, offset, index) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
  if (luminance < 0.14) return 'dark'
  if (luminance > 0.68) return 'bright'
  return undefined
}

function localGlyph(name: string, size: number | string): JSX.Element | undefined {
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const props = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (key) {
    case 'sql':
      return <svg {...props}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>
    case 'groq':
      return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 2v2m6-2v2M9 20v2m6-2v2M2 9h2m-2 6h2m16-6h2m-2 6h2m-9-9-3 5h3l-1 5 4-6h-3l1-4Z" /></svg>
    case 'rag':
      return <svg {...props}><path d="M5 3h9l4 4v5M14 3v5h5M5 3v18h7" /><circle cx="16.5" cy="16.5" r="4.5" /><path d="m20 20 2 2M8 8h3M8 12h3" /></svg>
    case 'websockets':
      return <svg {...props}><rect x="2.5" y="7" width="5" height="10" rx="2" /><rect x="16.5" y="7" width="5" height="10" rx="2" /><path d="M8 9h8l-2.5-2.5M16 15H8l2.5 2.5" /></svg>
    case 'azure':
      return <svg {...props} fill="currentColor" stroke="none"><path d="M13.5 2 5 18.5h5.1L16.6 6l-3.1-4ZM14.5 12.8l-2.6 4.7h5.5l1.1 2H9.2l-2 3h13.6L14.5 12.8Z" /></svg>
  }
}

interface TechIconProps {
  name: string
  size?: number
  responsive?: boolean
  colorful?: boolean
  className?: string
}

export default function TechIcon({ name, size = 16, responsive = false, colorful = false, className = '' }: TechIconProps) {
  const icon = lookup(name)
  const glyphSize = responsive ? '100%' : size
  const glyph = localGlyph(name, glyphSize)
  const contrastMode = colorful ? getContrastMode(name, icon) : undefined
  const badgeClass = contrastMode === 'dark'
    ? 'rounded-full bg-neutral-100 text-neutral-950 dark:bg-neutral-700 dark:text-neutral-100 p-1'
    : contrastMode === 'bright'
      ? 'rounded-full bg-neutral-900 text-[#f7df1e] dark:bg-neutral-800 p-1'
      : ''
  const iconColor = colorful && !contrastMode ? getTechBrandColor(name) : undefined
  const iconDimension = responsive ? 'clamp(18px, calc(1.53vw + 12px), 22px)' : `${size}px`
  const wrapperDimension = contrastMode ? `calc(${iconDimension} + 8px)` : iconDimension
  const wrapperStyle = { width: wrapperDimension, height: wrapperDimension, color: iconColor }

  if (!icon) {
    if (glyph) {
      return (
        <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${colorful ? '' : 'text-current'} ${badgeClass} ${className}`} style={wrapperStyle}>
          {glyph}
        </span>
      )
    }
    // Letter badge fallback
    const letter = name.charAt(0).toUpperCase()
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-[10px] leading-none shrink-0 ${className}`}
        style={wrapperStyle}
      >
        {letter}
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 ${colorful ? 'items-center justify-center' : ''} tech-icon-wrap ${badgeClass} ${className}`}
      style={wrapperStyle}
      dangerouslySetInnerHTML={{
        __html: icon.svg.replace(
          '<svg',
          `<svg width="${glyphSize}" height="${glyphSize}" style="fill:currentColor"`
        ),
      }}
    />
  )
}

// Export for reuse
export { lookup as lookupTechIcon }
