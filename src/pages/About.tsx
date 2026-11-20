import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { content as defaultSiteContent } from '../data/content'
import { useResolvedMedia } from '../hooks/useMedia'
import { useListRenderWarning } from '../hooks/useListRenderWarning'
import ScrollReveal from '../components/ScrollReveal'
import PageHero from '../components/PageHero'
import PageMeta from '../components/PageMeta'
import { Timeline, type EducationEntry, type ExperienceEntry } from '../components/EducationTimeline'
import CertLightbox, { type CertItem } from '../components/CertLightbox'
import FaqAccordion from '../components/FaqAccordion'
import TechIcon, { getTechBrandTint } from '../components/TechIcon'
import { useTheme } from '../context/ThemeContext'

type AboutPhoto = SiteContent['about']['photos'][number]
type Certificate = {
  id?: string
  name: string
  issuer: string
  date?: string
  year?: string
  description?: string
  file?: string
  thumbnail?: string
  credentialUrl?: string
  visible?: boolean
  adminNote?: string
}
type Skill = SiteContent['home']['techSkills'][number]

const glass = 'rounded-2xl border border-neutral-200/60 bg-surface/60 backdrop-blur-md dark:border-neutral-800/60 dark:bg-surface/40'
const ABOUT_INTRO_WIDTH = 'max-w-[680px]'
const ABOUT_SPACING = {
  introParagraphs: 'gap-6',
  factualSummaryPadding: 'p-6 sm:p-8',
} as const

export default function About() {
  const { about, home, cv, faqs } = useSiteContent()
  const { theme } = useTheme()
  const location = useLocation()
  const reducedMotion = useReducedMotion() ?? false
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const education = useMemo(() => (about.education as unknown as EducationEntry[]).filter(item => item.visible !== false), [about.education])
  const experience = cv.experience as unknown as ExperienceEntry[]
  const certificates = useMemo(() => {
    const configured = cv.certificates as unknown as Certificate[]
    const bundled = (defaultSiteContent.cv.certificates as unknown as Certificate[])
      .filter(item => item.file?.startsWith('/certificates/'))
    const bundledById = new Map(bundled.filter(item => item.id).map(item => [item.id as string, item]))
    const configuredWithAssets = configured.map(item => {
      const local = item.id ? bundledById.get(item.id) : undefined
      if (!local) return item
      return {
        ...local,
        ...item,
        file: item.file || local.file,
        thumbnail: item.thumbnail || local.thumbnail,
        credentialUrl: item.credentialUrl || local.credentialUrl,
      }
    })
    const configuredIds = new Set(configuredWithAssets.map(item => item.id).filter((id): id is string => Boolean(id)))
    const missingBundled = bundled.filter(item => !item.id || !configuredIds.has(item.id))
    return [...configuredWithAssets, ...missingBundled].filter(item => item.visible !== false)
  }, [cv.certificates])
  const skills = useMemo(() => home.techSkills.filter(item => item.visible !== false && item.name.trim()), [home.techSkills])
  const skillGroups = useMemo(() => groupSkills(skills), [skills])
  const lightboxCertificates = certificates.map(toLightboxCertificate)
  useListRenderWarning(cv.certificates, 'certificates', certificates.length > 0)
  useListRenderWarning(home.techSkills, 'technology skills', skills.length > 0)

  useEffect(() => {
    if (!location.hash) return
    const sectionId = decodeURIComponent(location.hash.slice(1))
    const timeout = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(timeout)
  }, [location.hash, reducedMotion])

  return (
    <>
      <PageMeta
        rawTitle="About Muhammad Waseem Qasim — AI/ML Engineer, Pakistan"
        description="About Muhammad Waseem Qasim, AI/ML Engineer and Full-Stack Developer from Pakistan. BS CS (CGPA 3.67) at The University of Lahore, AI/ML trainee at NetSol Technologies, AI intern at EnigmaDesk."
        path="/about"
      />
      <div>
        <PageHero
          title={about.heroHeading || 'ABOUT'}
          eyebrow={about.heroTag || 'ENGINEER, BUILDER, AND'}
          accent={about.heroName || 'lifelong learner.'}
          subline={about.heroSubline || 'CS graduate from The University of Lahore, building ML systems and full-stack web apps.'}
          className="mx-auto max-w-5xl"
        />

        <section className="w-full px-5 pb-16 pt-6 sm:pt-8 md:px-10 md:pb-24">
          <div className="mx-auto w-full">
            <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_auto] lg:gap-x-10 lg:gap-y-7">
              <ScrollReveal className={`order-1 w-full ${ABOUT_INTRO_WIDTH} lg:order-none lg:col-start-1 lg:row-start-1`}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent-foreground">{about.introTag}</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-4xl md:text-5xl">
                  {about.introHeading}
                </h2>
                <p className="mt-2 font-instrument-serif text-4xl italic text-accent-foreground sm:text-5xl md:text-6xl dark:bg-gradient-to-r dark:from-brand dark:via-orange-300 dark:to-brand-dark dark:bg-clip-text dark:text-transparent">
                  {about.introName}
                </p>
              </ScrollReveal>
              <ScrollReveal className={`${glass} order-4 w-full ${ABOUT_INTRO_WIDTH} ${ABOUT_SPACING.factualSummaryPadding} lg:order-none lg:col-start-1 lg:row-start-2`}>
                <h3 className="mb-4 text-2xl font-bold text-foreground dark:text-foreground">
                  {about.factualSummaryTitle}
                </h3>
                <p className="max-w-[70ch] text-[19px] leading-[1.85] text-muted dark:text-muted">
                  <SummaryCopy text={about.factualSummary} name={home.name} />
                </p>
              </ScrollReveal>
              <ScrollReveal className={`order-2 w-full ${ABOUT_INTRO_WIDTH} lg:order-none lg:col-start-1 lg:row-start-3`}>
                <p className="max-w-[70ch] text-[19px] leading-[1.85] text-muted dark:text-muted">{about.big}</p>
              </ScrollReveal>
              <UniversityMemories
                photos={about.photos?.some(photo => photo.visible !== false && photo.image?.trim())
                  ? about.photos
                  : theme === 'light' && home.photo
                    ? [{ image: home.photo, caption: about.heroName || home.name, visible: true }]
                    : []}
                title={about.galleryTitle}
                emptyText={about.galleryEmptyText}
                className="order-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-4"
              />
              <div className={`order-5 flex w-full ${ABOUT_INTRO_WIDTH} flex-col ${ABOUT_SPACING.introParagraphs} lg:order-none lg:col-start-1 lg:row-start-4`}>
                {about.paras.map((paragraph, index) => (
                  <ScrollReveal key={`${index}-${paragraph.slice(0, 24)}`} delay={index * 0.05}>
                    <p className="w-full text-[19px] leading-[1.85] text-muted dark:text-muted">{paragraph}</p>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="education" className="scroll-mt-28 w-full border-y border-neutral-200 bg-neutral-50/70 px-5 py-16 dark:border-neutral-800 dark:bg-surface/30 md:px-10 md:py-24">
          <div className="mx-auto w-full">
            <ScrollReveal className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.educationTag}</p>
              <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">
                <span className="font-instrument-serif font-normal italic text-accent-foreground">{about.educationTitle}</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted dark:text-muted">{about.educationLead}</p>
            </ScrollReveal>
            <Timeline entries={education} mode="education" />
          </div>
        </section>

        <EducationMap about={about} />

        <section id="experience" className="scroll-mt-28 w-full px-5 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full">
            <ScrollReveal className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.experienceTag}</p>
              <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">
                {about.experienceTitle} <span className="font-instrument-serif font-normal italic text-accent-foreground">{about.experienceAccent}</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted dark:text-muted">{about.experienceLead}</p>
            </ScrollReveal>
            <Timeline entries={experience} mode="experience" />
          </div>
        </section>

        <section id="certificates" className="scroll-mt-28 w-full border-y border-neutral-200 bg-neutral-50/70 px-5 py-16 dark:border-neutral-800 dark:bg-surface/30 md:px-10 md:py-24">
          <div className="mx-auto w-full">
            <ScrollReveal className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.certificatesTag}</p>
              <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">
                {about.certificatesTitle} <span className="font-instrument-serif font-normal italic text-accent-foreground">{about.certificatesAccent}</span>
              </h2>
            </ScrollReveal>
            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {certificates.map((certificate, index) => (
                  <CertificateCard key={certificate.id || `${certificate.name}-${index}`} certificate={certificate} index={index} onOpen={() => setLightboxIndex(index)} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-muted dark:border-border/15 dark:text-muted">{about.certificatesEmptyLabel}</p>
            )}
          </div>
        </section>

        <section id="skills" className="scroll-mt-28 w-full px-5 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full">
            <ScrollReveal className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.skillsTag}</p>
              <h2 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-5xl">
                {about.skillsTitle.split(about.skillsAccent)[0]}<span className="font-instrument-serif font-normal italic text-accent-foreground dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-orange-400 dark:via-pink-400 dark:to-blue-400">{about.skillsAccent}</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted dark:text-muted">{about.skillsLead}</p>
            </ScrollReveal>
            <div className="space-y-8">
              {skillGroups.map(([category, categorySkills]) => (
                <div key={category}>
                  <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.24em] text-muted dark:text-muted">{category}</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {categorySkills.map((skill, index) => <AboutSkillChip key={`${category}-${skill.name}-${index}`} skill={skill} index={index} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {faqs.items.length > 0 && (
          <section id="faq" className="scroll-mt-28 w-full border-y border-neutral-200 bg-neutral-50/70 px-5 py-16 dark:border-neutral-800 dark:bg-surface/30 md:px-10 md:py-24">
            <div className="mx-auto w-full">
              <ScrollReveal className="mb-10 text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.faqTag}</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-4xl md:text-5xl">
                  {about.faqTitleStart} <span className="font-instrument-serif font-normal italic text-accent-foreground">{about.faqTitleAccent}</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-muted dark:text-muted">{about.faqLead}</p>
              </ScrollReveal>
              <FaqAccordion items={faqs.items} />
            </div>
          </section>
        )}
      </div>
      {lightboxIndex !== null && lightboxCertificates[lightboxIndex] && (
        <CertLightbox certs={lightboxCertificates} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />
      )}
    </>
  )
}

function SummaryCopy({ text, name }: { text: string; name: string }) {
  const index = text.indexOf(name)
  if (index < 0) return <>{text}</>
  return <>{text.slice(0, index)}<strong className="font-semibold text-foreground dark:text-foreground">{name}</strong>{text.slice(index + name.length)}</>
}

function UniversityMemories({
  photos,
  title,
  emptyText,
  className = '',
}: {
  photos: AboutPhoto[]
  title: string
  emptyText: string
  className?: string
}) {
  const reducedMotion = useReducedMotion() ?? false
  const visiblePhotos = useMemo(
    () => photos.filter(photo => photo.visible !== false && typeof photo.image === 'string' && photo.image.trim()).slice(0, 5),
    [photos],
  )
  const [orderedPhotos, setOrderedPhotos] = useState(visiblePhotos)

  useEffect(() => setOrderedPhotos(visiblePhotos), [visiblePhotos])

  const sendToBack = (index: number) => {
    setOrderedPhotos(current => index >= current.length
      ? current
      : [...current.filter((_, itemIndex) => itemIndex !== index), current[index]])
  }

  return (
    <div className={`${className} min-w-0`}>
      <div className="lg:sticky lg:top-28">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{title}</p>
        <div className="relative mx-auto h-[320px] w-full sm:h-[400px] lg:h-[min(65vh,600px)] lg:min-h-[460px]" aria-label={title}>
          {orderedPhotos.length === 0 ? (
            <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-surface/50 px-5 text-center shadow-sm dark:border-neutral-700 dark:bg-surface/30">
              <svg className="mb-4 h-8 w-8 text-muted dark:text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7.5h3l1.5-2h7L17 7.5h3v11H4z" />
                <circle cx="12" cy="13" r="3.25" />
              </svg>
              <p className="max-w-[24ch] text-sm font-medium leading-relaxed text-muted dark:text-muted">{emptyText}</p>
            </div>
          ) : orderedPhotos.map((photo, index) => (
            <UniversityMemoryCard
              key={`${photo.image}-${index}`}
              photo={photo}
              index={index}
              count={orderedPhotos.length}
              title={title}
              reducedMotion={reducedMotion}
              onSendToBack={() => sendToBack(index)}
            />
          ))}
        </div>
        {orderedPhotos[0]?.caption?.trim() && (
          <p className="mx-auto mt-1 max-w-[70ch] text-center text-sm leading-relaxed text-muted dark:text-muted">{orderedPhotos[0].caption}</p>
        )}
      </div>
    </div>
  )
}

function UniversityMemoryCard({
  photo,
  index,
  count,
  title,
  reducedMotion,
  onSendToBack,
}: {
  photo: AboutPhoto
  index: number
  count: number
  title: string
  reducedMotion: boolean
  onSendToBack: () => void
}) {
  const image = useResolvedMedia(photo.image, '')
  const offset = (index - (count - 1) / 2) * 12
  const rotation = (index - (count - 1) / 2) * 7

  return (
    <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ zIndex: count - index }}>
      <motion.button
        type="button"
        drag
        dragMomentum={false}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 48 || Math.abs(info.offset.y) > 48) onSendToBack()
        }}
        onClick={() => { if (index === 0) onSendToBack() }}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={{ x: offset, rotate: rotation, opacity: 1, scale: 1 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 190, damping: 20, delay: index * 0.04 }}
        whileHover={reducedMotion ? undefined : { y: -10, scale: 1.025 }}
        aria-label={index === 0 ? `${photo.caption?.trim() || `${title} photo ${index + 1}`}. Tap to send the front photo to the back, or drag to shuffle.` : `${photo.caption?.trim() || `${title} photo ${index + 1}`}. Drag to shuffle.`}
        className="h-[300px] w-[92%] cursor-grab touch-pan-y rounded-3xl border-[6px] border-border bg-surface p-1 text-left shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing dark:border-neutral-100 dark:bg-neutral-100 sm:h-[380px] lg:h-full lg:w-[min(92%,540px)]"
      >
        {image ? (
          <img src={image} alt={photo.caption?.trim() || `${title} photo ${index + 1}`} className="h-full w-full rounded-2xl object-cover object-top" draggable={false} />
        ) : (
          <div className="h-full w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />
        )}
      </motion.button>
    </div>
  )
}

function EducationMap({ about }: { about: SiteContent['about'] }) {
  const [zoom, setZoom] = useState(1)
  const deraGhaziKhan = about.education[0]?.location || 'Dera Ghazi Khan'
  const lahore = about.education[2]?.location || 'Lahore'
  return (
    <section className="w-full px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto w-full">
        <ScrollReveal className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted dark:text-muted">{about.locationsTag}</p>
          <h2 className="text-3xl font-bold text-foreground dark:text-foreground sm:text-4xl">
            {about.locationsTitleStart} <span className="font-instrument-serif font-normal italic text-accent-foreground">{about.locationsTitleAccent}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted dark:text-muted">{about.locationsLead}</p>
        </ScrollReveal>
        <div className={`${glass} overflow-hidden p-3 sm:p-6`}>
          <div className="relative overflow-hidden rounded-xl bg-neutral-100/70 dark:bg-surface/45">
            <svg viewBox="0 0 900 450" role="img" aria-label="Dotted world map showing Dera Ghazi Khan and Lahore" className="h-auto min-h-[220px] w-full text-muted transition-transform duration-300 dark:text-muted sm:min-h-[340px]" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
              <defs>
                <pattern id="about-map-dots" width="9" height="9" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.6" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="900" height="450" fill="transparent" />
              <g fill="url(#about-map-dots)" opacity="0.8">
                <path d="M42 99 68 76 109 53 145 58 174 76 203 86 223 111 216 131 197 143 188 163 170 175 157 199 141 204 125 187 111 175 95 161 82 143 66 130 56 113Z" />
                <path d="M166 183 184 185 201 198 211 216 222 227 231 248 245 264 248 287 260 310 258 333 271 352 268 370 258 382 248 359 238 343 232 322 221 305 218 282 207 264 199 243 190 226 181 207Z" />
                <path d="M287 40 309 27 332 34 340 51 330 68 311 71 294 61Z" />
                <path d="M377 103 397 93 421 96 440 104 460 101 474 110 469 122 446 123 431 132 410 128 395 119 378 119Z" />
                <path d="M415 130 439 127 463 137 477 158 482 181 474 204 469 228 453 251 446 279 432 301 416 289 408 265 398 242 394 215 386 191 389 165 400 146Z" />
                <path d="M463 98 494 84 528 79 557 67 596 70 624 78 653 73 682 84 708 88 735 102 765 110 786 127 817 133 835 149 819 166 798 169 780 159 755 163 733 151 710 155 689 146 665 151 645 137 622 143 604 130 581 137 559 124 536 131 516 117 490 124 470 115Z" />
                <path d="M518 145 541 140 559 150 568 167 564 188 552 206 544 227 530 239 517 229 510 211 504 189 506 168Z" />
                <path d="M595 145 610 150 618 163 612 178 602 172Z" />
                <path d="M620 151 640 145 656 154 661 171 654 187 643 202 630 193 624 175Z" />
                <path d="M714 181 739 176 758 185 773 201 770 219 758 231 743 222 731 209 719 199Z" />
                <path d="M757 300 779 292 804 300 817 317 810 335 790 341 772 331 759 317Z" />
                <path d="M834 195 846 190 853 201 847 215 837 211Z" />
              </g>
              <MapPin cx={626.6} cy={170.5} label={deraGhaziKhan} labelX={570} labelY={204} />
              <MapPin cx={635.85} cy={165.9} label={lahore} labelX={646} labelY={151} />
            </svg>
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-neutral-200 bg-surface/90 p-1 shadow-lg backdrop-blur dark:border-neutral-700 dark:bg-surface/90">
              <MapControl label={about.mapZoomInLabel} onClick={() => setZoom(value => Math.min(2.4, Number((value + 0.2).toFixed(1))))}>
                <path d="M12 5v14M5 12h14" />
              </MapControl>
              <MapControl label={about.mapZoomOutLabel} onClick={() => setZoom(value => Math.max(1, Number((value - 0.2).toFixed(1))))}>
                <path d="M5 12h14" />
              </MapControl>
              <button type="button" onClick={() => setZoom(1)} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-neutral-100 dark:text-muted dark:hover:bg-neutral-800">{about.mapResetLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MapPin({ cx, cy, label, labelX, labelY }: { cx: number; cy: number; label: string; labelX: number; labelY: number }) {
  const [active, setActive] = useState(false)
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setActive(value => !value) }}
      className="cursor-pointer text-accent-foreground"
    >
      <circle cx={cx} cy={cy} r="13" fill="currentColor" opacity="0.18" className="motion-safe:animate-pulse" />
      <circle cx={cx} cy={cy} r="5.5" fill="currentColor" stroke="var(--bg)" strokeWidth="2" />
      <g className={`transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}>
        <path d={`M${cx} ${cy} L${labelX} ${labelY - 7}`} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x={labelX} y={labelY} fill="currentColor" fontSize="13" fontWeight="700" paintOrder="stroke" stroke="var(--map-label-outline, var(--bg))" strokeWidth="4" strokeLinejoin="round">{label}</text>
      </g>
    </g>
  )
}

function MapControl({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="rounded-lg p-2 text-muted transition-colors hover:bg-neutral-100 hover:text-accent-foreground dark:text-muted dark:hover:bg-neutral-800">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{children}</svg>
    </button>
  )
}

function CertificateCard({ certificate, index, onOpen }: { certificate: Certificate; index: number; onOpen: () => void }) {
  const reducedMotion = useReducedMotion() ?? false
  const canHover = !reducedMotion && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const preview = useResolvedMedia(certificate.thumbnail || certificate.file || '', '')
  const actionable = Boolean(certificate.file || certificate.credentialUrl)
  const isPdf = /\.pdf(?:$|[?#])/i.test(certificate.file || '') || (certificate.file || '').startsWith('data:application/pdf')
  const hasThumbnail = Boolean(certificate.thumbnail)
  const cardClass = `hover-card certificate-spotlight-card group relative isolate flex w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-surface/70 p-4 text-left shadow-sm transition-[transform,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-border/10 dark:bg-surface-inverse/[0.035] sm:p-5 motion-safe:focus-visible:-translate-y-1 ${canHover ? 'hover:border-orange-400/70 hover:shadow-lg motion-safe:hover:-translate-y-1' : ''}`
  const contents = (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-focus-visible:opacity-100 ${canHover ? 'group-hover:opacity-100' : ''}`} style={{ background: 'radial-gradient(circle 220px at var(--spot-x, -500px) var(--spot-y, -500px), rgba(249,115,22,.13), rgba(59,130,246,.05) 52%, transparent 100%)' }} />
      <span className="relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-surface">
        {preview && (!isPdf || hasThumbnail) ? <img src={preview} alt={`${certificate.name} certificate image`} loading="lazy" decoding="async" className="h-full w-full object-contain p-3" /> : <DocumentIcon />}
        {isPdf && <span className="absolute bottom-3 right-3 rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-inverse">PDF</span>}
      </span>
      <span className="relative mt-5 block text-left">
        <span className="block text-lg font-bold leading-snug text-foreground dark:text-foreground">{certificate.name}</span>
        <span className="mt-2 block text-sm text-muted dark:text-muted">{certificate.issuer}</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{certificate.date || certificate.year || ''}</span>
        {actionable && <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-xs font-bold text-muted dark:border-border/15 dark:text-foreground">View credential <span aria-hidden="true">↗</span></span>}
      </span>
    </>
  )

  if (actionable) {
    return (
      <motion.button
        type="button"
        data-hover-list="certificates"
        onClick={onOpen}
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        whileHover={canHover ? { y: -3 } : undefined}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, delay: reducedMotion ? 0 : index * 0.06 }}
        onPointerMove={moveSpotlight}
        onPointerLeave={resetSpotlight}
        className={cardClass}
      >
        {contents}
      </motion.button>
    )
  }

  return (
    <motion.article
      data-hover-list="certificates"
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={canHover ? { y: -3 } : undefined}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: reducedMotion ? 0 : 0.42, delay: reducedMotion ? 0 : index * 0.06 }}
      onPointerMove={moveSpotlight}
      onPointerLeave={resetSpotlight}
      className={cardClass}
    >
      {contents}
    </motion.article>
  )
}

function AboutSkillChip({ skill, index }: { skill: Skill; index: number }) {
  const reducedMotion = useReducedMotion() ?? false
  const canHover = !reducedMotion && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const brandColor = getTechBrandTint(skill.icon?.trim() || skill.name)
  const style = {
    borderColor: `${brandColor}55`,
    backgroundImage: `linear-gradient(135deg, ${brandColor}14, ${brandColor}08)`,
  }
  const className = `skill-spotlight-chip group relative isolate inline-flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full border px-5 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur-sm transition-[transform,border-color,box-shadow] focus-visible:border-orange-400/80 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-foreground dark:focus-visible:text-foreground motion-safe:focus-visible:-translate-y-1 ${canHover ? 'hover:border-orange-400/80 hover:text-foreground dark:hover:text-foreground motion-safe:hover:-translate-y-1' : ''}`
  const contents = (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-focus-visible:opacity-100 ${canHover ? 'group-hover:opacity-100' : ''}`} style={{ background: 'radial-gradient(circle 180px at var(--spot-x, -500px) var(--spot-y, -500px), rgba(249,115,22,.16), rgba(59,130,246,.05) 55%, transparent 100%)' }} />
      <TechIcon name={skill.icon?.trim() || skill.name} size={22} responsive colorful className="relative z-10 shrink-0" />
      <span className="relative z-10">{skill.name}</span>
    </>
  )
  const url = /^https?:\/\//i.test(skill.url?.trim() || '') ? skill.url : undefined

  return url ? (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${skill.name}, opens the official website in a new tab`}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={canHover ? { y: -3, boxShadow: `0 8px 24px ${brandColor}40` } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reducedMotion ? 0 : 0.32, delay: reducedMotion ? 0 : Math.min(index * 0.03, 0.24) }}
      onPointerMove={moveSpotlight}
      onPointerLeave={resetSpotlight}
      style={style}
      className={className}
    >
      {contents}
    </motion.a>
  ) : (
    <motion.span
      tabIndex={0}
      aria-label={skill.name}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={canHover ? { y: -3, boxShadow: `0 8px 24px ${brandColor}40` } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reducedMotion ? 0 : 0.32, delay: reducedMotion ? 0 : Math.min(index * 0.03, 0.24) }}
      onPointerMove={moveSpotlight}
      onPointerLeave={resetSpotlight}
      style={style}
      className={className}
    >
      {contents}
    </motion.span>
  )
}

function groupSkills(skills: Skill[]) {
  const groups = new Map<string, Skill[]>()
  for (const skill of skills) {
    const category = skill.category?.trim() || 'Other'
    groups.set(category, [...(groups.get(category) ?? []), skill])
  }
  return [...groups.entries()]
}

function toLightboxCertificate(certificate: Certificate): CertItem {
  return {
    name: certificate.name,
    issuer: certificate.issuer,
    date: certificate.date || certificate.year || '',
    credentialUrl: certificate.credentialUrl || '',
    description: certificate.description || '',
    file: certificate.file || '',
    thumbnail: certificate.thumbnail || '',
    visible: certificate.visible !== false,
  }
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-12 w-12 text-muted dark:text-muted" viewBox="0 0 48 48" fill="none">
      <path d="M13 5h15l9 9v28H13z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 5v10h9M19 24h12M19 30h12M19 36h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function moveSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
}

function resetSpotlight(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--spot-x', '-500px')
  event.currentTarget.style.setProperty('--spot-y', '-500px')
}
