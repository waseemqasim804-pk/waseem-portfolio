// scripts/generate-sitemap.mjs
// Run automatically during build: vite build calls this via "prebuild" npm hook.
// Reads VITE_SITE_URL from .env (or falls back to placeholder).
// Outputs public/sitemap.xml with static routes + any build-time blog post slugs.

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')

// ── Read VITE_SITE_URL from .env if present ──────────────────────────────────
let siteUrl = process.env.VITE_SITE_URL?.trim() || 'https://waseem-portfolio-48383.web.app'
const envPath = resolve(root, '.env')
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8')
  const match = env.match(/^VITE_SITE_URL\s*=\s*(.+)$/m)
  if (!process.env.VITE_SITE_URL && match && match[1].trim() && !match[1].includes('YOUR_DOMAIN')) {
    siteUrl = match[1].trim()
  }
}
siteUrl = siteUrl.replace(/\/$/, '') // strip trailing slash

const now = new Date().toISOString().split('T')[0]

// ── Static routes ─────────────────────────────────────────────────────────────
const staticRoutes = [
  { path: '/',          priority: '1.0', changefreq: 'weekly'  },
  { path: '/about',     priority: '0.9', changefreq: 'monthly' },
  { path: '/work',      priority: '0.9', changefreq: 'monthly' },
  { path: '/services',  priority: '0.8', changefreq: 'monthly' },
  { path: '/awards',    priority: '0.7', changefreq: 'monthly' },
  { path: '/blogs',     priority: '0.8', changefreq: 'daily'   },
  { path: '/guestbook', priority: '0.6', changefreq: 'weekly'  },
  { path: '/book',      priority: '0.7', changefreq: 'weekly'  },
  { path: '/contact',   priority: '0.8', changefreq: 'monthly' },
  { path: '/links',     priority: '0.5', changefreq: 'monthly' },
  { path: '/uses',      priority: '0.5', changefreq: 'monthly' },
  { path: '/faqs',      priority: '0.6', changefreq: 'monthly' },
]

function urlEntry({ path, priority, changefreq }) {
  return `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes.map(urlEntry).join('\n')}
</urlset>
`

const out = resolve(root, 'public', 'sitemap.xml')
writeFileSync(out, xml, 'utf8')
const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /blink-tuner\n\nSitemap: ${siteUrl}/sitemap.xml\n`
writeFileSync(resolve(root, 'public', 'robots.txt'), robots, 'utf8')
console.log(`✓ sitemap.xml written → ${siteUrl} (${staticRoutes.length} URLs)`)
