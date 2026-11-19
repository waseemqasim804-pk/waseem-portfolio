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
        <p className="font-mono text-xs uppercase tracking-widest text-brand mb-3">Help</p>
        <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-3">{faqs.title}</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-12">{faqs.lead}</p>
      </ScrollReveal>

      <FaqAccordion items={faqs.items} />
    </div>
  </div>
  )
}
