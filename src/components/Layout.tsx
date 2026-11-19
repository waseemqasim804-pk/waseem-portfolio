// src/components/Layout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import CtaSection from './CtaSection'

const CTA_EXCLUDED_ROUTES = ['/contact', '/book-call', '/admin']

export default function Layout() {
  const { pathname } = useLocation()
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const showCta = !CTA_EXCLUDED_ROUTES.some(route => normalizedPath === route || normalizedPath.startsWith(route + '/'))

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  // Hide footer on /admin
  const hideFooter = pathname.startsWith('/admin')

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />
      <main className="w-full flex-1 pt-24">
        <Outlet />
      </main>
      {/* CtaSection is rendered here only; never add it to individual pages. */}
      {showCta && <CtaSection />}
      {!hideFooter && <Footer />}
    </div>
  )
}
