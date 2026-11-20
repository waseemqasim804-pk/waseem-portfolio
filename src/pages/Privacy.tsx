// src/pages/Privacy.tsx
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <PageMeta
        title="Privacy Policy"
        description="Privacy Policy for Muhammad Waseem Qasim — how data is collected, used and stored."
        path="/privacy"
      />
      <ScrollReveal>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-foreground mb-3">Legal</p>
        <h1 className="text-4xl font-bold text-foreground dark:text-foreground mb-4">Privacy Policy</h1>
        <p className="text-xs text-muted mb-10">Last updated: November 2026</p>
      </ScrollReveal>

      <div className="prose prose-neutral dark:prose-invert max-w-none text-sm text-muted dark:text-muted leading-relaxed flex flex-col gap-6">
        <section>
          <h2 className="text-base font-semibold text-foreground dark:text-foreground mb-2">1. Information I collect</h2>
          <p>When you submit the contact form, I collect your name, email address, and message. No other personal data is collected automatically beyond standard server logs.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground dark:text-foreground mb-2">2. How I use your information</h2>
          <p>Your data is used only to respond to your enquiry. I do not sell, rent, or share your information with third parties.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground dark:text-foreground mb-2">3. Cookies</h2>
          <p>This site stores only a single cookie / localStorage value for your dark/light theme preference. No tracking cookies are set.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground dark:text-foreground mb-2">4. Third-party services</h2>
          <p>Firebase (Google) is used for data storage and authentication. Firebase's privacy policy applies to data processed through their services.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground dark:text-foreground mb-2">5. Contact</h2>
          <p>If you have privacy-related questions, email <a href="mailto:waseemqasim804@gmail.com" className="text-accent-foreground underline">waseemqasim804@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
