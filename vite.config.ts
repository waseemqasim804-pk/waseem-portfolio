// vite.config.ts
// Tailwind v4 is handled by @tailwindcss/vite plugin below — no tailwind.config.js needed.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import siteConfig from './src/config/siteConfig.json'

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteConfig.name,
  alternateName: siteConfig.alternateNames,
  url: `${siteConfig.siteUrl}/`,
  image: `${siteConfig.siteUrl}${siteConfig.profileImage}`,
  jobTitle: siteConfig.jobTitle,
  description: siteConfig.description,
  email: siteConfig.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: siteConfig.addressLocality,
    addressCountry: siteConfig.addressCountry,
  },
  alumniOf: { '@type': 'CollegeOrUniversity', name: siteConfig.alumniOf },
  knowsAbout: siteConfig.knowsAbout,
  sameAs: siteConfig.sameAs,
}

const seoHtmlPlugin = {
  name: 'portfolio-seo-html',
  transformIndexHtml(html: string) {
    return html
      .replaceAll('__SITE_URL__', siteConfig.siteUrl.replace(/\/$/, ''))
      .replace('__PERSON_JSON_LD__', JSON.stringify(personSchema))
  },
}

export default defineConfig({
  plugins: [
    seoHtmlPlugin,
    react(),
    tailwindcss(),
  ],
})
