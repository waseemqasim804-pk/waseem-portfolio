// src/pages/FAQs.tsx — reads from content.ts faqs.items
import { useSiteContent } from '../hooks/useSiteContent'
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'
import FaqAccordion from '../components/FaqAccordion'

export default function FAQs() {
  const { faqs } = useSiteContent()
  return (
    <div>
      <div className="max-w-2xl mx-auto px-6 py-16">
      <PageMeta
        title="FAQs"
        description="FAQs about Muhammad Waseem Qasim, AI/ML Engineer & Full-Stack Developer from Pakistan. Availability, tech stack, project timelines and how to work together."
        path="/faqs"
      />
      <ScrollReveal>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-3">Help</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground dark:text-foreground mb-3">{faqs.title}</h1>
        <p className="text-muted dark:text-muted mb-12">{faqs.lead}</p>
      </ScrollReveal>

      <FaqAccordion items={faqs.items} />
    </div>
  </div>
  )
}
