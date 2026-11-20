// src/components/PageMeta.tsx
// Per-page SEO: title, meta description, canonical, Open Graph, noindex flag.
// Uses react-helmet-async so tags are injected into <head> on every route change.
//
// Usage:
//   <PageMeta
//     title="About"                          // → "About | Muhammad Waseem Qasim"
//     description="Learn about Waseem…"
//     path="/about"                          // → canonical + og:url suffix
//     noindex                                // optional: add noindex,nofollow
//   />

import { Helmet } from 'react-helmet-async'
import siteConfig from '../config/siteConfig.json'

const SITE_URL = siteConfig.siteUrl.replace(/\/$/, '')
const DEFAULT_IMAGE = new URL(siteConfig.openGraphImage, `${SITE_URL}/`).href
const SITE_NAME = 'Waseem Qasim'
const AUTHOR = siteConfig.name
const HOME_TITLE = 'Waseem Qasim — Full-Stack & ML Developer, Lahore'
const HOME_DESCRIPTION = 'Muhammad Waseem Qasim (Waseem Qasim) is a Full-Stack and Machine Learning Developer in Lahore, Pakistan, building AI systems and web applications.'
const DESCRIPTION_SUFFIX = 'Muhammad Waseem Qasim is a Full-Stack and Machine Learning Developer in Lahore, Pakistan.'

interface PageMetaProps {
  /** Short page name, e.g. "About". Becomes "About | Muhammad Waseem Qasim". */
  title?: string
  /** Use this instead of title when a route needs a custom title prefix. */
  rawTitle?: string
  /** ~150-character description unique to this page. */
  description: string
  /** Route path, e.g. "/about". Used for canonical + og:url. */
  path?: string
  /** Set true on /admin and other private pages. */
  noindex?: boolean
  /** Override OG image. Defaults to /images/og-image.svg. */
  image?: string
}

export default function PageMeta({ title, rawTitle, description, path = '', noindex = false, image }: PageMetaProps) {
  const titlePrefix = rawTitle || `${title} | ${AUTHOR}`
  const titleSuffix = 'Full-Stack & Machine Learning Developer, Lahore, Pakistan'
  const fullTitle = path === '/'
    ? HOME_TITLE
    : `${titlePrefix}${titlePrefix.includes('Lahore, Pakistan') ? '' : ` — ${titleSuffix}`}`
  const pageDescription = path === '/'
    ? HOME_DESCRIPTION
    : `${description.slice(0, Math.max(32, 155 - DESCRIPTION_SUFFIX.length - 1)).trim().replace(/[\s,;:.–—-]+$/, '')}. ${DESCRIPTION_SUFFIX}`
  const canonicalUrl = `${SITE_URL}${path}`
  const ogImage = image ? new URL(image, `${SITE_URL}/`).href : DEFAULT_IMAGE
  const ogType = path === '/' ? 'profile' : 'website'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:type"        content={ogType} />
      <meta property="og:locale"      content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image"       content={ogImage} />
    </Helmet>
  )
}
