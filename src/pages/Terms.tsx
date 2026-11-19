// src/pages/Terms.tsx
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <PageMeta
        title="Terms of Use"
        description="Terms of Use for Muhammad Waseem Qasim — the rules and conditions for using this website."
        path="/terms"
      />
      <ScrollReveal>
        <p className="font-mono text-xs uppercase tracking-widest text-brand mb-3">Legal</p>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">Terms of Use</h1>
        <p className="text-xs text-neutral-500 mb-10">Last updated: November 2026</p>
      </ScrollReveal>

      <div className="flex flex-col gap-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">1. Acceptance</h2>
          <p>By using this website you agree to these terms. If you do not agree, please stop using the site.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">2. Intellectual property</h2>
          <p>All content on this site — including text, code snippets, and design — belongs to Muhammad Waseem Qasim unless stated otherwise. You may not reproduce or redistribute it without permission.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">3. Disclaimer</h2>
          <p>This site is provided "as is" without warranties of any kind. I am not liable for any damages arising from your use of the site.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">4. Changes</h2>
          <p>These terms may change at any time. Continued use of the site constitutes acceptance of updated terms.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">5. Contact</h2>
          <p>Questions? Email <a href="mailto:waseemqasim804@gmail.com" className="text-brand underline">waseemqasim804@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
