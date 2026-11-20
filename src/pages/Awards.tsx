// src/pages/Awards.tsx
import { useSiteContent } from '../hooks/useSiteContent'
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'

export default function Awards() {
  const { awards } = useSiteContent()

  return (
    <div>
      <PageMeta
        title="Awards"
        description="Awards of Muhammad Waseem Qasim, AI/ML Engineer & Full-Stack Developer from Pakistan. 50% merit scholarship at The University of Lahore, NetSol Technologies and EnigmaDesk certificates."
        path="/awards"
      />
      <section className="max-w-5xl mx-auto px-6 py-16">
        <ScrollReveal>
          <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-3">Recognition</p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground dark:text-foreground mb-4">{awards.title}</h1>
          <p className="text-base text-muted dark:text-muted">{awards.lead}</p>
        </ScrollReveal>

        <div className="mt-12 flex flex-col gap-6">
          {awards.items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div data-hover-list="awards" className="hover-card p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-surface dark:bg-surface hover:border-brand/40 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground dark:text-foreground">{item.n}</h2>
                    <p className="text-sm font-medium text-accent-foreground">{item.by}</p>
                  </div>
                  <span className="inline-block font-mono text-xs text-muted dark:text-muted bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full whitespace-nowrap">
                    {item.y}
                  </span>
                </div>
                <p className="text-base text-muted dark:text-muted leading-relaxed mb-3">{item.d}</p>
                <p className="text-xs italic text-muted dark:text-muted border-l-2 border-brand/40 pl-3">"{item.w}"</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  )
}
