import { Link } from 'react-router-dom'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'

type FooterColumn = SiteContent['footer']['columns'][number]
type FooterItem = FooterColumn['links'][number]

const SOCIAL_ORDER = ['GitHub', 'LinkedIn', 'X', 'Facebook', 'Instagram']

export default function Footer() {
  const { footer, links } = useSiteContent()
  const socialLinks = SOCIAL_ORDER
    .map(label => links.items.find(item => item.label.toLowerCase() === label.toLowerCase() && Boolean(item.visible)))
    .filter((item): item is SiteContent['links']['items'][number] => Boolean(item?.url))

  return (
    <footer className="w-full px-4 pb-7 sm:px-5 md:px-[30px]">
      <div className="w-full rounded-[48px] bg-neutral-100 px-7 py-10 text-neutral-950 sm:px-10 md:px-[clamp(40px,6vw,85px)] md:py-[55px] dark:bg-neutral-900 dark:text-white">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] lg:gap-10">
          <div className="min-w-0">
            <Link to="/" className="inline-block text-[34px] font-black uppercase leading-none tracking-[-0.06em] text-neutral-950 transition-colors duration-150 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand dark:text-white dark:hover:text-neutral-300">
              {footer.wordmark}
            </Link>
            <p className="mt-4 max-w-[500px] text-xl italic leading-[1.55] text-neutral-500 dark:text-neutral-400" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{footer.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-6 xl:gap-x-10">
            {footer.columns.map((column: FooterColumn) => (
              <FooterLinks key={column.title} column={column} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 px-2 pt-6 md:flex-row md:justify-between">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 md:text-left">{footer.copyright}</p>
        <nav aria-label="Social media" className="flex items-center justify-center gap-4">
          {socialLinks.map(item => (
            <a
              key={item.label}
              href={item.url}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={`${item.label}, opens in a new tab`}
              title={item.label}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors duration-150 hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand dark:text-neutral-400 dark:hover:text-white"
            >
              <SocialMark label={item.label} />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

function FooterLinks({ column }: { column: FooterColumn }) {
  const visibleLinks = column.links.filter(item => (item.to as string) !== '/resume')
  return (
    <div className="min-w-0">
      <h2 className="mb-7 text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">{column.title}</h2>
      <ul className="flex flex-col gap-12">
        {(visibleLinks as FooterItem[]).map(item => {
          const isLive = 'live' in item && Boolean(item.live)
          return (
            <li key={`${item.label}-${item.to}`} className="flex min-w-0 items-center gap-2">
              {isLive && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]" />}
              <Link to={item.to} className="text-[21px] font-semibold leading-tight text-neutral-700 transition duration-150 ease-out hover:translate-x-[2px] hover:text-neutral-950 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand dark:text-neutral-300 dark:hover:text-white">{item.label}</Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SocialMark({ label }: { label: string }) {
  const iconProps = { className: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const }
  switch (label.toLowerCase()) {
    case 'github':
      return <svg {...iconProps}><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.64-1.24-1.64-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.29-2.61 5.23-5.1 5.5.4.35.76 1.02.76 2.06v3.1c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
    case 'linkedin':
      return <svg {...iconProps}><path d="M5.2 7.8a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8ZM3.6 9.3h3.2v10.9H3.6zM9 9.3h3.1v1.5h.05a3.4 3.4 0 0 1 3.06-1.68c3.27 0 3.88 2.15 3.88 4.95v6.13h-3.22v-5.43c0-1.3-.02-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86v5.53H9z" /></svg>
    case 'x':
      return <svg {...iconProps}><path d="M18.9 2.25h2.9l-6.34 7.25L22.9 21.75h-5.8l-4.55-6.4-5.6 6.4h-2.9l6.78-7.75L3.8 2.25h5.95l4.11 5.78zm-1.02 17.1h1.6L8.88 4.5H7.16z" /></svg>
    case 'facebook':
      return <svg {...iconProps}><path d="M13.5 21v-8.2h2.75l.41-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14c-.3-.04-1.33-.14-2.53-.14-2.5 0-4.22 1.52-4.22 4.32V9.6H7.2v3.2h2.85V21z" /></svg>
    case 'instagram':
      return <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>
    default:
      return null
  }
}
