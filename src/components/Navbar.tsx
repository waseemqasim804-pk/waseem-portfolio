// src/components/Navbar.tsx  — floating glass pill, More dropdown, Book a Call, paper-plane contact
import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { useTheme } from '../context/ThemeContext'
import { useSiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'
import { useCvAvailable } from '../hooks/useCvAvailable'

const PRIMARY_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Work', to: '/work' },
  { label: 'Blogs', to: '/blogs' },
]

export default function Navbar() {
  const content = useSiteContent()
  const brandLogoImage = useResolvedMedia(content.brandLogoImage)
  const cvUrl = useResolvedMedia(content.cv.url, '')
  const cvAvailable = useCvAvailable()
  const moreContent = content.navbar.more
  const extraItems = moreContent.extraItems.filter(item => (item.to as string) !== '/resume')
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false
  const pointerTargetX = useMotionValue(0)
  const pointerTargetY = useMotionValue(0)
  const pointerX = useSpring(pointerTargetX, { stiffness: 120, damping: 24, mass: 0.6 })
  const pointerY = useSpring(pointerTargetY, { stiffness: 120, damping: 24, mass: 0.6 })
  const moreRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!favicon) return

    const defaultHref = favicon.dataset.defaultHref || favicon.getAttribute('href') || '/favicon.svg'
    const defaultType = favicon.dataset.defaultType ?? favicon.getAttribute('type') ?? ''
    favicon.dataset.defaultHref = defaultHref
    favicon.dataset.defaultType = defaultType

    if (!brandLogoImage) {
      favicon.href = defaultHref
      if (defaultType) favicon.type = defaultType
      else favicon.removeAttribute('type')
      return
    }

    favicon.href = brandLogoImage
    const dataMimeType = /^data:(image\/[^;,]+)/i.exec(brandLogoImage)?.[1]
    const extension = /\.(png|jpe?g|webp|gif|svg|ico)(?:[?#]|$)/i.exec(brandLogoImage)?.[1]?.toLowerCase()
    const extensionMimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
    }
    const imageType = dataMimeType || (extension ? extensionMimeTypes[extension] : '')
    if (imageType) favicon.type = imageType
    else favicon.removeAttribute('type')
  }, [brandLogoImage])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      pointerTargetX.set(0)
      pointerTargetY.set(0)
      return
    }

    let clientX = window.innerWidth / 2
    let clientY = window.innerHeight / 2
    let frame: number | null = null

    const applyPointerPosition = () => {
      frame = null
      pointerTargetX.set(((clientX / Math.max(window.innerWidth, 1)) * 2 - 1) * 3.5)
      pointerTargetY.set(((clientY / Math.max(window.innerHeight, 1)) * 2 - 1) * 2.5)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      clientX = event.clientX
      clientY = event.clientY
      if (frame === null) frame = window.requestAnimationFrame(applyPointerPosition)
    }

    const resetPointerPosition = () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      pointerTargetX.set(0)
      pointerTargetY.set(0)
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.relatedTarget === null) resetPointerPosition()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerout', handlePointerOut, { passive: true })
    window.addEventListener('blur', resetPointerPosition)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('blur', resetPointerPosition)
      if (frame !== null) window.cancelAnimationFrame(frame)
      pointerTargetX.set(0)
      pointerTargetY.set(0)
    }
  }, [prefersReducedMotion, pointerTargetX, pointerTargetY])

  // Close more dropdown on outside click
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Node
      if (!moreRef.current?.contains(target) && !moreMenuRef.current?.contains(target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  useEffect(() => {
    if (!moreOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setMoreOpen(false)
      moreButtonRef.current?.focus()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [moreOpen])

  const handleMoreKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const direction = event.key
    if (!moreOpen) {
      setMoreOpen(true)
      window.requestAnimationFrame(() => {
        const items = moreMenuRef.current?.querySelectorAll<HTMLElement>('[data-more-focusable]')
        const target = direction === 'ArrowDown' ? items?.[0] : items?.[items.length - 1]
        target?.focus()
      })
      return
    }
    const items = Array.from(moreMenuRef.current?.querySelectorAll<HTMLElement>('[data-more-focusable]') ?? [])
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = index < 0
      ? (direction === 'ArrowDown' ? 0 : items.length - 1)
      : direction === 'ArrowDown'
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length
    items[next].focus()
  }

  // Auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return
    return onAuthStateChanged(auth, user => {
      setCurrentUser(user)
    })
  }, [])

  // Close user dropdown on outside click or Esc
  useEffect(() => {
    if (!userDropdownOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userDropdownOpen])

  // Close mobile & dropdowns on route change
  useEffect(() => {
    setMobileOpen(false)
    setMoreOpen(false)
    setUserDropdownOpen(false)
  }, [location.pathname])

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-5xl"
    >
      <motion.header
      style={{ x: pointerX, y: pointerY }}
      className={`relative flex w-full items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl shadow-xl shadow-black/10 border border-neutral-200/70 dark:border-neutral-700/70'
          : 'bg-transparent shadow-none backdrop-blur-none border border-transparent'
      }`}
    >
      {/* ── Logo mark ── */}
      <Link to="/" className="group flex flex-shrink-0 items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
          {brandLogoImage ? (
            <img src={brandLogoImage} alt="Waseem Qasim logo" className="h-full w-full rounded-full object-cover" />
          ) : (
            <>
              <span className="font-instrument-serif text-[34px] italic leading-none">{content.brandLetter || 'W'}</span>
              <span aria-hidden="true" className="absolute bottom-[10px] right-[10px] h-1 w-1 rounded-full bg-neutral-400" />
            </>
          )}
        </div>
        <div className="hidden flex-col gap-1 leading-none sm:flex">
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-400">{content.brandLine1}</span>
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">• {content.brandLine2}</span>
        </div>
      </Link>

      {/* ── Desktop nav ── */}
      <nav className="hidden md:flex items-center gap-0.5">
        {PRIMARY_LINKS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                isActive
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}

        {/* More dropdown trigger */}
        <div ref={moreRef} className="relative">
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen(o => !o)}
            onKeyDown={handleMoreKeyDown}
            aria-expanded={moreOpen}
            aria-controls="navbar-more-menu"
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              moreOpen
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {moreContent.label}
            <svg className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={moreMenuRef}
            id="navbar-more-menu"
            role="region"
            aria-label={moreContent.label}
            onKeyDown={handleMoreKeyDown}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 grid w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-1 gap-3 rounded-3xl border border-neutral-200/80 bg-white/85 p-3 shadow-2xl shadow-black/15 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85 sm:grid-cols-[0.9fr_1.1fr] sm:gap-4 sm:p-4"
          >
            <MoreCvCard title={content.cv.downloadLabel} subtitle={moreContent.cvSubtitle} available={cvAvailable} href={cvUrl} />
            <div className="flex min-w-0 flex-col gap-2">
              {moreContent.featuredItems.map(item => (
                <NavLink key={item.id} to={item.to} data-more-focusable="true" className={({ isActive }) => `group flex min-h-[66px] items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isActive ? 'bg-orange-500/10' : 'hover:bg-neutral-100 dark:hover:bg-white/[0.06]'}`}>
                  <MoreItemIcon name={item.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-neutral-950 dark:text-white">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">{item.subtitle}</span>
                  </span>
                  <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </NavLink>
              ))}
              <div className="flex flex-wrap gap-1 border-t border-neutral-200 pt-2 dark:border-white/10">
                {extraItems.map(item => (
                  <NavLink key={item.id} to={item.to} data-more-focusable="true" className={({ isActive }) => `rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isActive ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/[0.06] dark:hover:text-white'}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-2">
        {/* User avatar + Sign out dropdown (show only when signed in) */}
        {currentUser && (
          <div ref={userDropdownRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(open => !open)}
              aria-label={`User menu for ${currentUser.displayName || currentUser.email || 'account'}`}
              aria-expanded={userDropdownOpen}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-neutral-200 dark:bg-neutral-800 text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  {(currentUser.displayName || currentUser.email || 'U').trim().slice(0, 1).toUpperCase()}
                </span>
              )}
            </button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 sm:w-56 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 p-3 shadow-xl backdrop-blur-xl z-50 text-left"
                >
                  <div className="px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-800 mb-2">
                    <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {currentUser.displayName || 'Signed in'}
                    </p>
                    {currentUser.email && (
                      <p className="hidden sm:block text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!auth) return
                      setUserDropdownOpen(false)
                      await signOut(auth)
                    }}
                    className="w-full flex items-center justify-start gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {theme === 'dark' ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12z"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
            </svg>
          )}
        </button>

        {/* Book a Call — white pill */}
        <Link
          to="/book"
          className="hidden md:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm font-semibold border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Book a Call
        </Link>

        {/* Paper-plane contact button */}
        <Link
          to="/contact"
          aria-label="Contact"
          className="hidden md:inline-flex p-2 rounded-full bg-brand text-white hover:bg-brand-dark transition-colors shadow-md shadow-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
          className="md:hidden p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-3xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-1 md:hidden shadow-2xl"
          >
            {PRIMARY_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <MoreCvCard title={content.cv.downloadLabel} subtitle={moreContent.cvSubtitle} available={cvAvailable} href={cvUrl} compact />
              <div className="mt-3 flex flex-col gap-1">
                {moreContent.featuredItems.map(item => (
                  <NavLink key={item.id} to={item.to} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isActive ? 'bg-orange-500/10' : 'hover:bg-neutral-100 dark:hover:bg-white/[0.06]'}`}>
                    <MoreItemIcon name={item.icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-neutral-950 dark:text-white">{item.title}</span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400">{item.subtitle}</span>
                    </span>
                  </NavLink>
                ))}
                {extraItems.map(item => (
                  <NavLink key={item.id} to={item.to} className={({ isActive }) => `rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/[0.06]'}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Link to="/book" className="flex-1 text-center py-2.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold">
                Book a Call
              </Link>
              <Link to="/contact" className="flex-1 text-center py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold">
                Contact
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.header>
    </motion.div>
  )
}

function MoreCvCard({ title, subtitle, available, href, compact = false }: { title: string; subtitle: string; available: boolean | null; href: string; compact?: boolean }) {
  const cardClass = `group relative flex ${compact ? 'min-h-[104px]' : 'min-h-[148px] hover:-translate-y-0.5 hover:shadow-lg'} w-full flex-col justify-end overflow-hidden rounded-2xl bg-white p-5 text-left text-neutral-950 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`
  const content = (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute -right-2 top-1 h-28 w-28 text-neutral-900/[0.055] transition-transform group-hover:scale-105" viewBox="0 0 100 100" fill="none">
        <path d="M28 12h29l20 20v55H28z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <path d="M57 12v21h20M39 49h27M39 61h27M39 73h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="relative z-10 text-lg font-extrabold tracking-tight">{title}</span>
      <span className="relative z-10 mt-1 text-xs text-neutral-600">{available === false ? 'CV not available yet' : available === null ? 'Checking for the latest CV...' : subtitle}</span>
      {available === true && <span aria-hidden="true" className="relative z-10 mt-4 inline-flex items-center gap-2 text-xs font-bold">Download PDF <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
    </>
  )

  if (available !== true) {
    return <div aria-disabled="true" title="CV not available yet" className={`${cardClass} cursor-not-allowed opacity-90`}>{content}</div>
  }
  return <a href={href} download="Waseem-CV.pdf" data-more-focusable={compact ? undefined : 'true'} className={cardClass}>{content}</a>
}

function MoreItemIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    links: 'M10 13a5 5 0 007.07 0l2-2A5 5 0 0012 3.93l-1.14 1.14M14 11a5 5 0 00-7.07 0l-2 2A5 5 0 0012 20.07l1.14-1.14',
    uses: 'M12 3v3m0 12v3m9-9h-3M6 12H3m15.36-6.36-2.12 2.12M7.76 16.24l-2.12 2.12m12.72 0-2.12-2.12M7.76 7.76 5.64 5.64M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    guestbook: 'M7 8h10M7 12h7m-8 8 3.2-3H18a3 3 0 003-3V6a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  }
  return (
    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white dark:bg-neutral-800">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.links} /></svg>
    </span>
  )
}
