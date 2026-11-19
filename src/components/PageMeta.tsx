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

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://waseem-portfolio-48383.web.app'

const DEFAULT_IMAGE = `${SITE_URL}/images/og-image.png`
const SITE_NAME = 'Waseem Qasim'
const AUTHOR = 'Waseem Qasim'
const HOME_TITLE = 'Waseem Qasim | AI/ML Engineer & React Developer Portfolio'
const HOME_DESCRIPTION = 'Waseem Qasim is an AI/ML Engineer and React Developer in Pakistan, building AI solutions with Python, LangChain, RAG, computer vision, FastAPI and React.'

interface PageMetaProps {
  /** Short page name, e.g. "About". Becomes "About | Muhammad Waseem Qasim". */
  title?: string
  /** Use this instead of title when you want the exact string with no suffix. */
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
  const fullTitle = path === '/' ? HOME_TITLE : rawTitle || `${title} | ${AUTHOR}`
  const pageDescription = path === '/' ? HOME_DESCRIPTION : description
  const canonicalUrl = `${SITE_URL}${path}`
  const ogImage = image ? new URL(image, `${SITE_URL}/`).href : DEFAULT_IMAGE

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
      <meta property="og:type"        content="website" />
      <meta property="og:locale"      content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image"       content={ogImage} />
    </Helmet>
  )
}
