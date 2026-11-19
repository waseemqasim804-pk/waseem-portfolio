// src/pages/Services.tsx
import { Link } from 'react-router-dom'
import { useSiteContent } from '../hooks/useSiteContent'
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'

export default function Services() {
  const { services } = useSiteContent()

  return (
    <div>
      <PageMeta
        title="Services"
        description="Services by Muhammad Waseem Qasim, AI/ML Engineer & Full-Stack Developer from Pakistan. LLM apps, RAG pipelines, computer vision, React & FastAPI development."
        path="/services"
      />
      <section className="max-w-5xl mx-auto px-6 py-16">
        <ScrollReveal>
          <p className="font-mono text-xs uppercase tracking-widest text-brand mb-3">What I offer</p>
          <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-4">{services.title}</h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-2xl">{services.lead}</p>
        </ScrollReveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          {services.items.map((svc, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div className="h-full p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-brand/40 hover:bg-brand/5 transition-all bg-white dark:bg-neutral-900">
                <span className="inline-block font-mono text-xs text-brand border border-brand/30 rounded-full px-3 py-0.5 mb-4">{svc.price}</span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{svc.title}</h2>
                <p className="text-base text-brand/80 dark:text-brand/70 font-medium mb-3">{svc.short}</p>
                <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">{svc.desc}</p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark transition-colors"
                >
                  {services.btn} →
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  )
}
