import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { useSiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'
import { BookingPanel } from './BookACall'
import BlinkingPhoto from '../components/BlinkingPhoto'
import PageMeta from '../components/PageMeta'

type ContactForm = { name: string; email: string; type: string; budget: string; message: string; website: string }

const EMPTY_FORM: ContactForm = { name: '', email: '', type: '', budget: '', message: '', website: '' }
const glass = 'rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-surface/60 dark:bg-surface/40 backdrop-blur-md'

function validate(form: ContactForm): string {
  const name = form.name.trim()
  const email = form.email.trim()
  const message = form.message.trim()
  if (name.length < 2 || name.length > 100) return 'Enter a name between 2 and 100 characters.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  if (form.type.length > 120 || form.budget.length > 120) return 'Please select a valid project type and budget.'
  if (message.length < 10 || message.length > 5000) return 'Your message must be between 10 and 5,000 characters.'
  return ''
}

export default function Contact() {
  const { contact, settings, home, siteName, links } = useSiteContent()
  const photo = useResolvedMedia(home.photo)
  const location = useLocation()
  const linkedinUrl = links.items.find(item => item.label.toLowerCase() === 'linkedin')?.url || settings.linkedin
  const reducedMotion = useReducedMotion() ?? false
  const [activeTab, setActiveTab] = useState<'booking' | 'message'>('booking')
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(current => ({ ...current, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate(form)
    if (validationError) { setError(validationError); return }
    if (!functions) { setError('Contact submissions are temporarily unavailable. Please email me directly.'); return }

    setSending(true)
    setError('')
    try {
      const submitMessage = httpsCallable(functions, 'createContactMessage')
      await submitMessage({ ...form, name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
      setSent(true)
      setForm(EMPTY_FORM)
    } catch (cause) {
      const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : ''
      setError(code.includes('resource-exhausted')
        ? 'Too many submissions. Please wait before trying again.'
        : code.includes('failed-precondition') || code.includes('unauthenticated')
          ? 'Secure form verification is not ready. Please email me directly.'
          : 'Your message could not be saved. Please try again or email me directly.')
    } finally {
      setSending(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-neutral-200 bg-surface/70 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-neutral-700 dark:bg-surface/60 dark:text-foreground'

  return (
    <div className="relative overflow-hidden">
      {location.pathname === '/book' ? (
        <PageMeta
          title="Book a Call"
          description="Book a call with Muhammad Waseem Qasim, AI/ML Engineer & Full-Stack Developer from Pakistan. Pick a date, choose a time slot and get a calendar invite."
          path="/book"
        />
      ) : (
        <PageMeta
          rawTitle="Contact Muhammad Waseem Qasim"
          description="Contact Muhammad Waseem Qasim, AI/ML Engineer & Full-Stack Developer from Pakistan. Open to LLM, RAG, computer vision projects, internships and full-time roles."
          path="/contact"
        />
      )}

      {location.pathname === '/book' ? (
        <section className="relative mx-auto max-w-7xl px-6 pb-10 pt-12 md:pb-14 md:pt-16">
          <div className="relative z-0 mb-6 flex justify-end md:absolute md:right-0 md:top-0 md:mb-0">
            <BlinkingPhoto
              size="h-[140px] w-[140px] md:h-[220px] md:w-[220px]"
              src={home.photo}
              alt={siteName}
              round
              objectPosition="center top"
            />
          </div>
          <div className="relative z-10">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted"
            >
              {siteName}
            </motion.p>
            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-4xl font-black uppercase leading-[0.82] tracking-[-0.075em] text-foreground dark:text-foreground md:text-6xl"
            >
              <span className="block">{contact.headingLine1}</span>
              <span className="block">{`${contact.headingLine2} ${contact.headingLine3}`.trim()}</span>
            </motion.h1>
          </div>
        </section>
      ) : (
        <section className="relative w-full border-b border-neutral-200 px-5 pb-10 pt-[120px] dark:border-neutral-800 md:pb-14">
          <div className="relative z-0 mb-8 ml-auto h-[140px] w-[140px] overflow-hidden rounded-full border-[3px] border-neutral-300 md:absolute md:right-[45px] md:top-0 md:mb-0 md:h-[260px] md:w-[260px] lg:h-[360px] lg:w-[360px] dark:border-neutral-800">
            {photo && <img src={photo} alt={siteName} className="h-full w-full rounded-full object-cover object-top" style={{ objectPosition: 'center top' }} />}
          </div>
          <div className="relative z-10">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              className="mb-6 text-lg font-semibold uppercase tracking-[0.45em] text-muted dark:text-muted"
            >
              BOOK / MESSAGE
            </motion.p>
            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-sans text-[22vw] font-black uppercase leading-[0.85] tracking-[-0.04em] text-foreground dark:text-foreground md:max-w-[68%] md:text-[clamp(88px,11vw,160px)]"
            >
              <span className="block">{contact.headingLine1}</span>
              <span className="block text-muted dark:text-muted">{contact.headingLine2}</span>
              <span className="block">{contact.headingLine3}</span>
            </motion.h1>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-10 md:pb-14">
        <div role="tablist" aria-label="Contact options" className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <button
            id="tab-booking"
            type="button"
            role="tab"
            aria-selected={activeTab === 'booking'}
            aria-controls="panel-booking"
            onClick={() => setActiveTab('booking')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${activeTab === 'booking' ? 'bg-neutral-900 text-surface-inverse dark-colorful-selected' : 'text-muted hover:bg-neutral-100 dark:text-muted dark:hover:bg-neutral-900'}`}
          >
            <ContactTabIcon type="video" />
            {contact.bookingTabLabel}
          </button>
          <button
            id="tab-message"
            type="button"
            role="tab"
            aria-selected={activeTab === 'message'}
            aria-controls="panel-message"
            onClick={() => setActiveTab('message')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${activeTab === 'message' ? 'bg-neutral-900 text-surface-inverse dark-colorful-selected' : 'text-muted hover:bg-neutral-100 dark:text-muted dark:hover:bg-neutral-900'}`}
          >
            <ContactTabIcon type="mail" />
            {contact.messageTabLabel}
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'booking' ? (
            <motion.div
              key="booking"
              id="panel-booking"
              role="tabpanel"
              aria-labelledby="tab-booking"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <BookingPanel />
            </motion.div>
          ) : (
            <motion.div
              key="message"
              id="panel-message"
              role="tabpanel"
              aria-labelledby="tab-message"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <div className={`${glass} mx-auto max-w-4xl p-6 sm:p-8 md:p-10`}>
                <div className="mb-7 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-accent-foreground"><ContactTabIcon type="chat" /></span>
                  <div>
                    <h2 className="text-xl font-bold text-foreground dark:text-foreground">{contact.messageTitle}</h2>
                    <p className="mt-0.5 text-sm text-muted">{settings.email}</p>
                  </div>
                </div>

                {sent ? (
                  <div className="rounded-2xl border border-brand/30 bg-brand/5 p-10 text-center" role="status">
                    <p className="mb-2 text-2xl">🎉</p>
                    <p className="mb-1 font-semibold text-foreground dark:text-foreground">Message sent!</p>
                    <p className="text-sm text-muted dark:text-muted">Your message was saved. I'll get back to you as soon as possible.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                      <label htmlFor="contact-website">Leave this field empty</label>
                      <input id="contact-website" name="website" autoComplete="off" tabIndex={-1} value={form.website} onChange={handleChange} />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-muted dark:text-muted">Name *
                        <input id="contact-name" name="name" autoComplete="name" required maxLength={100} value={form.name} onChange={handleChange} placeholder="Muhammad Waseem" className={`${inputClass} mt-1.5`} />
                      </label>
                      <label htmlFor="contact-email" className="block text-xs font-semibold text-muted dark:text-muted">Email *
                        <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={handleChange} placeholder="hello@example.com" className={`${inputClass} mt-1.5`} />
                      </label>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label htmlFor="contact-type" className="block text-xs font-semibold text-muted dark:text-muted">Type of project
                        <select id="contact-type" name="type" value={form.type} onChange={handleChange} className={`${inputClass} mt-1.5`}>
                          <option value="">Select…</option>
                          {contact.types.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label htmlFor="contact-budget" className="block text-xs font-semibold text-muted dark:text-muted">Budget / engagement type
                        <select id="contact-budget" name="budget" value={form.budget} onChange={handleChange} className={`${inputClass} mt-1.5`}>
                          <option value="">Select…</option>
                          {contact.budgets.map(budget => <option key={budget} value={budget}>{budget}</option>)}
                        </select>
                      </label>
                    </div>
                    <label htmlFor="contact-message" className="block text-xs font-semibold text-muted dark:text-muted">Message *
                      <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={handleChange} placeholder="Tell me about your project or opportunity…" className={`${inputClass} mt-1.5 resize-none`} />
                    </label>
                    {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
                    <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-neutral-50 shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:self-start">
                      {sending ? 'Sending…' : 'Send message →'}
                    </button>
                  </form>
                )}

                {(settings.phone || linkedinUrl) && (
                  <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-neutral-200 pt-5 text-sm dark:border-neutral-800">
                    {settings.phone && <a href={`tel:${settings.phone}`} className="text-muted transition-colors hover:text-foreground dark:hover:text-foreground">{settings.phone}</a>}
                    {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="me noopener noreferrer" className="text-muted transition-colors hover:text-foreground dark:hover:text-foreground">LinkedIn</a>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  )
}

function ContactTabIcon({ type }: { type: 'video' | 'mail' | 'chat' }) {
  if (type === 'video') return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
  if (type === 'mail') return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.5-.8L4 20l1.8-4.2a8 8 0 0 1-.8-3.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M9 10h.01M12.5 10h.01M16 10h.01" /></svg>
}
