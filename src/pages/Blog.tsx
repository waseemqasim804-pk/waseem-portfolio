// src/pages/Blog.tsx – Placeholder; will be wired to Firestore later
import ScrollReveal from '../components/ScrollReveal'

export default function Blog() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <ScrollReveal>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-3">Writing</p>
        <h1 className="text-4xl font-bold text-foreground dark:text-foreground mb-4">Blog</h1>
        <p className="text-muted dark:text-muted mb-10">
          Thoughts on AI, ML, and software engineering. First post coming soon.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <span className="text-5xl mb-4">📝</span>
          <p className="text-sm font-semibold text-muted">No posts yet</p>
          <p className="text-xs text-muted mt-1">Check back soon.</p>
        </div>
      </ScrollReveal>
    </div>
  )
}

