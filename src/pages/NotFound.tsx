// src/pages/NotFound.tsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSiteContent } from '../hooks/useSiteContent'
import PageMeta from '../components/PageMeta'

export default function NotFound() {
  const content = useSiteContent()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <PageMeta
        title="404 — Page Not Found"
        description="This page does not exist. Return to the home page of Muhammad Waseem Qasim's portfolio."
        noindex
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-6">
          {content.siteName}
        </p>
        <p className="font-mono text-7xl font-bold text-accent-foreground mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted dark:text-muted mb-8 max-w-sm">
          This page doesn't exist or was moved. Head back home and explore from there.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-on-accent font-semibold text-sm hover:bg-brand-dark transition-colors"
        >
          ← Back to {content.siteName}
        </Link>
      </motion.div>
    </div>
  )
}
