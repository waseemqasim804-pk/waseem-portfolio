import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'src')
const files = []

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collect(fullPath)
    else if (/\.(?:tsx?|css|svg)$/.test(entry.name)) files.push(fullPath)
  }
}

collect(sourceRoot)

const relative = file => path.relative(root, file).replaceAll(path.sep, '/')
const forbiddenUtility = /\b(?:text-(?:white|black|neutral-(?:100|200|300)|gray-(?:100|200|300))|bg-(?:white|black)|border-white|(?:bg|text|border)-white\/[\w.\[\]-]+)\b/g
const hexColor = /#[\da-fA-F]{3,8}\b/g
const errors = []

for (const file of files) {
  const name = relative(file)
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1

    // The floating dark pill, active states, and button contrast are intentional navbar styling.
    if (name !== 'src/components/Navbar.tsx') {
      for (const match of line.matchAll(forbiddenUtility)) {
        errors.push(`${name}:${lineNumber}: fixed light/dark utility "${match[0]}"; use a theme token`)
      }
    }

    // CSS palette values belong in index.css. The exceptions below are fixed brand artwork or
    // brand color lookup data, not interface text/background colors.
    if (name !== 'src/index.css' && name !== 'src/style.css') {
      const isTechBrandLookup = name === 'src/components/TechIcon.tsx'
        && /['"]#[\da-fA-F]{3,8}['"]|CUSTOM_TECH_COLORS|return getContrastMode/.test(line)
      const isGoogleBrandMark = ['src/pages/Blogs.tsx', 'src/pages/Guestbook.tsx'].includes(name)
        && /fill="#(?:4285F4|34A853|FBBC05|EA4335)"/.test(line)
      const isSocialSignInBrandMark = name === 'src/components/SocialSignInButtons.tsx'
        && /(?:fill="#(?:4285F4|34A853|FBBC05|EA4335|1877F2)"|#1877F2)/.test(line)
      const isLegacyNavbarPalette = name === 'src/components/Navbar.tsx'
      const isBundledBrandArtwork = name.startsWith('src/assets/') && name.endsWith('.svg')
      if (!isTechBrandLookup && !isGoogleBrandMark && !isSocialSignInBrandMark && !isLegacyNavbarPalette && !isBundledBrandArtwork) {
        for (const match of line.matchAll(hexColor)) {
          errors.push(`${name}:${lineNumber}: hard-coded hex color "${match[0]}"; use a theme token or document a brand-art exception`)
        }
      }
    }
  }
}

// Dark interactive states may use white surfaces only when the element is explicitly
// marked as an approved thin-row treatment. Blog and Uses arrow circles are deliberate
// white controls inside otherwise colorful cards.
const darkWhiteStateUtility = /\bdark:(?:group-)?(?:hover|focus-visible|active):(?:bg|background)-(?:white|(?:neutral|gray)-(?:50|100|200)|surface-inverse|inverse-foreground)(?:\/[\w.\[\]-]+)?\b/g
const activeWhiteUtility = /\bdark:bg-(?:white|(?:neutral|gray)-(?:50|100|200)|surface-inverse|inverse-foreground)(?:\/[\w.\[\]-]+)?\b/g
const darkInteractionSelector = /(?:^|[\s,])(?:html\.)?\.dark\b|html\.dark/
const interactionStateSelector = /:(?:hover|focus-visible|focus-within|active)\b|\[(?:data-hover-selected|data-selected|aria-selected|aria-current)=/i
const whiteBackgroundDeclaration = /\bbackground(?:-color)?\s*:\s*[^;{}]*(?:#fff(?:fff)?\b|(?:^|[\s,(])white(?:[\s,)!/]|$)|rgb\(\s*255\s+255\s+255|rgba\(\s*255\s*,\s*255\s*,\s*255|var\(\s*--surface-inverse\b)/i

for (const file of files) {
  const name = relative(file)
  const source = fs.readFileSync(file, 'utf8')
  const lines = source.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1
    for (const match of line.matchAll(darkWhiteStateUtility)) {
      if (!line.includes('hover-white')) {
        errors.push(name + ':' + lineNumber + ': dark hover/focus utility "' + match[0] + '" sets a white surface outside .hover-white')
      }
    }

    // Stateful active/selected classes are often assembled through a conditional
    // class string rather than a dark:hover utility.
    if (/activeTab|aria-pressed|aria-selected|isActive|data-hover-selected|data-selected/i.test(line)) {
      for (const match of line.matchAll(activeWhiteUtility)) {
        if (!line.includes('hover-white')) {
          errors.push(name + ':' + lineNumber + ': selected dark utility "' + match[0] + '" sets a white surface outside .hover-white')
        }
      }
    }
  }

  // Also inspect CSS rules and style blocks embedded in TSX.
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gs)) {
    const selector = match[1].trim()
    const declarations = match[2]
    if (!darkInteractionSelector.test(selector) || !interactionStateSelector.test(selector)) continue
    if (!whiteBackgroundDeclaration.test(declarations)) continue
    const approvedWhiteArrow = /(?:blog-post-arrow|uses-card-touch-arrow)/.test(selector)
    // Remove negated whitelist matches such as :not(.hover-white) before checking.
    const positiveSelector = selector.replace(/:not\([^)]*\)/g, '')
    const approvedWhiteRow = positiveSelector.includes('.hover-white')
    const approvedBlogTag = positiveSelector.includes('.blog-post-card') && positiveSelector.includes('[aria-label="Post tags"]')
    if (!approvedWhiteRow && !approvedBlogTag && !approvedWhiteArrow) {
      const lineNumber = source.slice(0, match.index).split(/\r?\n/).length
      errors.push(name + ':' + lineNumber + ': dark interactive CSS rule sets a white background outside .hover-white')
    }
  }
}

if (errors.length) {
  console.error('Theme color check failed:\n' + errors.map(error => `  ${error}`).join('\n'))
  process.exitCode = 1
} else {
  console.log('Theme color check passed.')
}
