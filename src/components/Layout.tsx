// src/components/Layout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import CtaSection from './CtaSection'

const CTA_EXCLUDED_ROUTES = ['/contact', '/book-call', '/admin']

export default function Layout() {
  const { pathname } = useLocation()
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const showCta = !CTA_EXCLUDED_ROUTES.some(route => normalizedPath === route || normalizedPath.startsWith(route + '/'))

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    const clearPrevious = (selected: HTMLElement, listId: string) => {
      document.querySelectorAll<HTMLElement>('.hover-card[data-hover-selected="true"]').forEach(card => {
        const list = card.dataset.hoverList
          || card.closest<HTMLElement>('[data-hover-list]')?.dataset.hoverList
          || card.querySelector<HTMLElement>('[data-hover-list]')?.dataset.hoverList
        if (list === listId && card !== selected) delete card.dataset.hoverSelected
      })
    }

    const findList = (card: HTMLElement) => card.dataset.hoverList
      || card.closest<HTMLElement>('[data-hover-list]')?.dataset.hoverList
      || card.querySelector<HTMLElement>('[data-hover-list]')?.dataset.hoverList

    const getCard = (target: EventTarget | null) => target instanceof Element
      ? target.closest<HTMLElement>('.hover-card')
      : null

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const card = getCard(event.target)
      const listId = card && findList(card)
      if (!card || !listId) return
      clearPrevious(card, listId)
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const card = getCard(event.target)
      if (!card || findList(card) !== 'work-projects' || getCard(event.relatedTarget) === card) return
      delete card.dataset.hoverSelected
      const focused = card.matches(':focus') ? card : card.querySelector<HTMLElement>(':focus')
      if (focused && !focused.matches(':focus-visible')) focused.blur()
    }

    const handleFocusIn = (event: FocusEvent) => {
      const card = getCard(event.target)
      const listId = card && findList(card)
      if (!card || !listId) return
      clearPrevious(card, listId)
    }

    const handleClick = (event: MouseEvent) => {
      const card = getCard(event.target)
      const listId = card && findList(card)
      if (!card || !listId) return
      clearPrevious(card, listId)
      card.dataset.hoverSelected = 'true'
    }

    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('click', handleClick)
    }
  }, [])

  // Hide footer on /admin
  const hideFooter = pathname.startsWith('/admin')

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />
      <main className="w-full flex-1 pt-28">
        <Outlet />
      </main>
      {/* CtaSection is rendered here only; never add it to individual pages. */}
      {showCta && <CtaSection />}
      {!hideFooter && <Footer />}
    </div>
  )
}
