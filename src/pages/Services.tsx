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
          <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-3">What I offer</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground dark:text-foreground mb-4">{services.title}</h1>
          <p className="text-base text-muted dark:text-muted max-w-2xl">{services.lead}</p>
        </ScrollReveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          {services.items.map((svc, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div data-hover-list="services" className="hover-card h-full p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-brand/40 hover:bg-brand/5 transition-all bg-surface dark:bg-surface">
                <span className="inline-block font-mono text-xs text-accent-foreground border border-brand/30 rounded-full px-3 py-0.5 mb-4">{svc.price}</span>
                <h2 className="text-lg font-bold text-foreground dark:text-foreground mb-2">{svc.title}</h2>
                <p className="text-base text-accent-foreground font-medium mb-3">{svc.short}</p>
                <p className="text-base text-muted dark:text-muted leading-relaxed mb-6">{svc.desc}</p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground hover:text-accent-foreground-dark transition-colors"
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
