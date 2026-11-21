import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { isFirebaseConfigured, auth, db, functions } from '../lib/firebase'
import { useSiteContent } from '../hooks/useSiteContent'
import PageMeta from '../components/PageMeta'
import ScrollReveal from '../components/ScrollReveal'
import GuestbookCard, { type GuestbookEntry, getAvatarColor, formatEntryDate } from '../components/GuestbookCard'
import SocialSignInButtons from '../components/SocialSignInButtons'

const PAGE_SIZE = 12

export default function Guestbook() {
  const { guestbook, home } = useSiteContent()
  const reducedMotion = useReducedMotion() ?? false

  const [user, setUser] = useState<User | null>(null)
  const [ownEntry, setOwnEntry] = useState<GuestbookEntry | null>(null)
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [activeModalEntry, setActiveModalEntry] = useState<GuestbookEntry | null>(null)

  // Header & Copy from site content (editable via Admin)
  const eyebrow = (guestbook as Record<string, string>)?.tag || home.guestbookTag || 'LEAVE YOUR SIGNATURE'
  const heading = (guestbook as Record<string, string>)?.heading || home.guestbookHeading || 'GUEST'
  const accent = (guestbook as Record<string, string>)?.accent || home.guestbookAccent || 'book'
  const lead = (guestbook as Record<string, string>)?.lead || home.guestbookLead || 'Sign in to leave your mark and connect with other visitors.'
  const ctaHeading = (guestbook as Record<string, string>)?.ctaHeading || home.guestbookCtaHeading || 'Leave your'
  const ctaAccent = (guestbook as Record<string, string>)?.ctaAccent || home.guestbookCtaAccent || 'Signature!'
  const ctaLead = (guestbook as Record<string, string>)?.ctaLead || home.guestbookCtaLead || 'Sign in to leave your mark and connect with other visitors.'
  const emptyText = (guestbook as Record<string, string>)?.emptyText || home.guestbookEmptyText || 'Be the first to sign'

  // Listen to Auth State
  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      if (!currentUser) {
        setEditingId(null)
        setOwnEntry(null)
      }
    })
    return unsubscribe
  }, [])

  const userUid = user?.uid
  useEffect(() => {
    let active = true
    setOwnEntry(null)
    if (!db || !userUid) return () => { active = false }
    getDoc(doc(db, 'guestbook', userUid))
      .then(snapshot => {
        if (active) {
          setOwnEntry(snapshot.exists()
            ? { id: snapshot.id, ...(snapshot.data() as Omit<GuestbookEntry, 'id'>) }
            : null)
        }
      })
      .catch(() => { if (active) setOwnEntry(null) })
    return () => { active = false }
  }, [userUid])

  // Sort helper: pinned first, then newest
  const sortEntries = (list: GuestbookEntry[]): GuestbookEntry[] => {
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      const aTime = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
      const bTime = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
      return bTime - aTime
    })
  }

  // Load approved entries via direct Firestore query
  const loadEntries = async (afterDoc?: QueryDocumentSnapshot | null) => {
    if (!db) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const q = afterDoc
        ? query(
            collection(db, 'guestbook'),
            where('approved', '==', true),
            orderBy('createdAt', 'desc'),
            startAfter(afterDoc),
            limit(PAGE_SIZE),
          )
        : query(
            collection(db, 'guestbook'),
            where('approved', '==', true),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE),
          )

      const snap = await getDocs(q)
      const newItems = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<GuestbookEntry, 'id'>),
      }))

      setEntries(prev => {
        const merged = afterDoc ? [...prev, ...newItems] : newItems
        // Deduplicate by id
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values())
        return sortEntries(unique)
      })

      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch {
      setError('Guestbook signatures could not be loaded at this time.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isFirebaseConfigured) {
      loadEntries()
    } else {
      setLoading(false)
    }
  }, [])

  // Find user's existing entry if any (using docId === user.uid)
  const userEntry = user ? entries.find(e => e.id === user.uid || e.uid === user.uid) ?? ownEntry : null

  // Public guestbook sign-in supports Google and Facebook.
  const handleSignIn = async (providerName: 'google' | 'facebook') => {
    if (!auth) return
    setSigningIn(true)
    setError('')
    const provider = providerName === 'facebook' ? new FacebookAuthProvider() : new GoogleAuthProvider()
    if (providerName === 'facebook') provider.addScope('email')
    try {
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        if (e?.code === 'auth/operation-not-allowed') setError('This sign-in provider is not enabled in Firebase yet.')
        else if (e?.code === 'auth/unauthorized-domain') setError('This website domain is not authorized for Firebase sign-in.')
        else if (e?.code === 'auth/account-exists-with-different-credential') setError('This email is already registered with another sign-in provider. Use that provider first.')
        else setError('Sign-in could not be completed. Please try again.')
      }
    } finally {
      setSigningIn(false)
    }
  }

  // Sign Out
  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    setMessage('')
    setEditingId(null)
    setSubmittedMessage('')
    setOwnEntry(null)
  }

  // Submit, edit, and delete through authenticated Cloud Functions.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!functions || !user) {
      setError('The guestbook service is unavailable. Please try again later.')
      return
    }

    // Clean and validate input (trim, 1 to 280 characters, reject > 1 link)
    const cleanMessage = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
    if (!cleanMessage || cleanMessage.length < 1 || cleanMessage.length > 280) {
      setError('Your signature must be between 1 and 280 characters.')
      return
    }

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const matchedUrls = cleanMessage.match(urlRegex) || []
    if (matchedUrls.length > 1) {
      setError('Signatures may contain at most one link.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      if (editingId) {
        await httpsCallable(functions, 'updateGuestbookEntry')({ message: cleanMessage })
        setEntries(prev => sortEntries(prev.map(item => item.id === user.uid ? { ...item, message: cleanMessage } : item)))
        setOwnEntry(prev => prev ? { ...prev, message: cleanMessage, updatedAt: new Date() } : prev)
        setSubmittedMessage(userEntry?.approved
          ? 'Your signature was updated successfully.'
          : 'Your update was saved and is awaiting review.')
        setEditingId(null)
        setMessage('')
      } else {
        await httpsCallable(functions, 'createGuestbookEntry')({ message: cleanMessage })
        const pendingEntry: GuestbookEntry = {
          id: user.uid,
          uid: user.uid,
          name: user.displayName || 'Anonymous Guest',
          avatar: user.photoURL || '',
          message: cleanMessage,
          approved: false,
          pinned: false,
          likedByAdmin: false,
          createdAt: new Date(),
        }
        setOwnEntry(pendingEntry)
        setSubmittedMessage('Thank you. Your signature is awaiting review before it appears publicly.')
        setMessage('')
      }
    } catch (cause: any) {
      if (cause?.code === 'functions/already-exists') setError('You already have a guestbook signature. Edit your existing entry instead.')
      else if (cause?.code === 'functions/unauthenticated') setError('Your sign-in expired. Sign in again to post.')
      else setError(cause?.message || 'Could not save your signature. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Owner deleting own entry
  const handleDeleteSelfEntry = async () => {
    if (!functions || !user) return
    if (!window.confirm('Are you sure you want to remove your guestbook signature?')) return

    try {
      await httpsCallable(functions, 'deleteGuestbookEntry')({})
      setEntries(prev => prev.filter(e => e.id !== user.uid && e.uid !== user.uid))
      setOwnEntry(null)
      setMessage('')
      setEditingId(null)
      setSubmittedMessage('Your signature has been removed.')
    } catch {
      setError('Could not delete your signature. Please try again.')
    }
  }

  // Trigger editing existing signature
  const handleStartEdit = (entry: GuestbookEntry) => {
    setEditingId(entry.id)
    setMessage(entry.message)
    setSubmittedMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen px-5 pb-24 pt-12 sm:px-8 lg:px-12">
      <PageMeta
        title="Guestbook"
        description="Leave your signature on Muhammad Waseem Qasim's portfolio guestbook. Connect with other developers, builders and visitors."
        path="/guestbook"
      />

      <div className="mx-auto max-w-7xl">
        {/* Top Header & Sign-in Split */}
        <section className="mb-16 grid grid-cols-1 items-start gap-10 sm:mb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,440px)] lg:gap-14">
          {/* Left Column: Heading */}
          <ScrollReveal>
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em] text-accent-foreground dark:text-orange-400 sm:mb-6">
              {eyebrow}
            </p>
            <h1 className="font-sans text-[clamp(4.2rem,11vw,8.5rem)] font-black uppercase leading-[0.85] tracking-tight text-foreground dark:text-foreground">
              {heading}
            </h1>
            <p className="-mt-3 mb-6 font-instrument-serif text-[clamp(2.8rem,7.5vw,5.5rem)] font-normal italic leading-none text-muted dark:text-muted sm:-mt-5">
              {accent}
            </p>
            <p className="max-w-xl text-base leading-relaxed text-muted dark:text-muted sm:text-lg">
              {lead}
            </p>
          </ScrollReveal>

          {/* Right Column: Tall Rounded Glass Sign-in Card */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-[2.2rem] border border-neutral-200/90 bg-surface/70 p-7 shadow-sm backdrop-blur-xl transition-all dark:border-foreground/25 dark:bg-[linear-gradient(145deg,rgba(56,189,248,0.5)_0%,rgba(99,102,241,0.5)_38%,rgba(168,85,247,0.52)_68%,rgba(18,18,20,0.98)_90%)] dark:shadow-[0_24px_70px_rgba(56,189,248,0.12),0_16px_70px_rgba(168,85,247,0.18)] sm:p-9"
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-3xl">
              {ctaHeading}{' '}
              <span className="font-instrument-serif font-normal italic text-accent-foreground dark:text-orange-400">
                {ctaAccent}
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted">
              {ctaLead}
            </p>

            <div className="mt-6">
              {!isFirebaseConfigured ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-muted dark:border-neutral-700 dark:text-muted">
                  Guestbook is in preview mode until Firebase is connected.
                </div>
              ) : !user ? (
                /* Signed-out: social sign-in */
                <div>
                  <SocialSignInButtons
                    disabled={signingIn}
                    busy={signingIn}
                    onGoogle={() => void handleSignIn('google')}
                    onFacebook={() => void handleSignIn('facebook')}
                  />
                  {error && (
                    <p className="mt-3 text-center text-xs font-medium text-rose-500" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              ) : (
                /* Signed-in View */
                <div>
                  {/* User Bar */}
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-4 dark:border-border/10">
                    <div className="flex items-center gap-3 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-white/10"
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-foreground ${getAvatarColor(user.displayName || '')}`}
                        >
                          {(user.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground dark:text-foreground">
                          {user.displayName || 'Visitor'}
                        </p>
                        <p className="truncate text-xs text-muted dark:text-muted">
                          {user.email || ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:underline dark:text-muted dark:hover:text-orange-400"
                    >
                      Sign out
                    </button>
                  </div>

                  {/* Feedback Banner */}
                  {submittedMessage && (
                    <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {submittedMessage}
                    </div>
                  )}

                  {/* Already Signed Notification with Edit option */}
                  {userEntry && !editingId && (
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-border/10 dark:bg-surface-inverse/[0.02]">
                      <p className="text-xs font-semibold text-foreground dark:text-foreground">
                        {userEntry.approved ? '✓ You have left your signature!' : 'Your signature is awaiting review.'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted dark:text-muted">
                        "{userEntry.message}"
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(userEntry)}
                          className="font-semibold text-accent-foreground hover:text-accent-foreground dark:text-orange-400"
                        >
                          Edit your message
                        </button>
                        <span className="text-muted dark:text-muted">·</span>
                        <button
                          type="button"
                          onClick={handleDeleteSelfEntry}
                          className="font-semibold text-rose-500 hover:text-rose-600"
                        >
                          Delete signature
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input Form (visible if not signed or currently editing) */}
                  {(!userEntry || editingId) && (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="relative">
                        <textarea
                          rows={3}
                          maxLength={280}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="Write your note, thought, or signature (max 280 characters)…"
                          className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-sm text-foreground placeholder-muted transition-colors focus:border-orange-500 focus:bg-surface focus:outline-none dark:border-border/10 dark:bg-surface-inverse/[0.04] dark:text-foreground dark:placeholder-muted dark:focus:border-orange-400 dark:focus:bg-[var(--bg)]"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-mono font-medium ${
                            message.length > 240
                              ? 'text-accent-foreground dark:text-orange-400'
                              : 'text-muted dark:text-muted'
                          }`}
                        >
                          {message.length} / 280
                        </span>

                        <div className="flex items-center gap-2">
                          {editingId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null)
                                setMessage('')
                              }}
                              className="rounded-full px-3 py-1.5 font-medium text-muted hover:text-foreground dark:hover:text-foreground"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={submitting || !message.trim()}
                            className="inline-flex min-h-10 items-center justify-center rounded-full bg-neutral-950 px-5 py-2 text-xs font-semibold text-surface-inverse transition-all hover:bg-orange-600 disabled:opacity-40 dark:bg-surface-inverse dark:text-inverse-foreground"
                          >
                            {submitting ? 'Posting…' : editingId ? 'Update' : 'Post'}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs font-medium text-rose-500" role="alert">
                          {error}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Entries Grid Section */}
        <section>
          <div className="mb-8 flex items-center justify-between border-b border-neutral-200/80 pb-4 dark:border-border/10">
            <h3 className="text-xl font-bold tracking-tight text-foreground dark:text-foreground sm:text-2xl">
              Recent Signatures
            </h3>
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              {entries.length} {entries.length === 1 ? 'Signature' : 'Signatures'}
            </span>
          </div>

          {/* Skeletons on initial load */}
          {loading && entries.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-[1.8rem] border border-neutral-200/60 bg-neutral-100 dark:border-border/5 dark:bg-surface-inverse/[0.02]"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            /* Empty State */
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-neutral-300 bg-surface/40 px-6 py-12 text-center dark:border-border/10 dark:bg-surface-inverse/[0.02]">
              <span className="mb-3 text-4xl">✍️</span>
              <p className="text-base font-semibold text-foreground dark:text-foreground">
                {emptyText}
              </p>
              <p className="mt-1 text-sm text-muted dark:text-muted">
                Sign in with Google or Facebook above to leave your signature on the wall.
              </p>
            </div>
          ) : (
            /* Entries Grid */
            <div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {entries.map(entry => (
                    <GuestbookCard
                      key={entry.id}
                      entry={entry}
                      isOwner={user ? entry.id === user.uid || entry.uid === user.uid : false}
                      onEdit={handleStartEdit}
                      onDelete={handleDeleteSelfEntry}
                      onSeeFull={setActiveModalEntry}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More Button (12 at a time) */}
              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => loadEntries(lastDoc)}
                    disabled={loading}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-300 bg-surface px-7 py-3 text-sm font-semibold text-muted shadow-sm transition-all hover:border-orange-500 hover:text-accent-foreground disabled:opacity-50 dark:border-border/15 dark:bg-surface dark:text-foreground dark:hover:border-orange-400 dark:hover:text-orange-400"
                  >
                    {loading ? 'Loading…' : 'Load more signatures →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modal for "See Full →" Long Messages */}
      <AnimatePresence>
        {activeModalEntry && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModalEntry(null)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2rem] border border-neutral-200 bg-surface p-7 shadow-2xl dark:border-border/15 dark:bg-background sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {activeModalEntry.avatar ? (
                    <img
                      src={activeModalEntry.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-white/10"
                    />
                  ) : (
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-foreground ${getAvatarColor(
                        activeModalEntry.name,
                      )}`}
                    >
                      {(activeModalEntry.name || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 id="modal-title" className="font-script text-3xl text-foreground dark:text-foreground">
                      {activeModalEntry.name}
                    </h4>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted">
                      {formatEntryDate(activeModalEntry.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalEntry(null)}
                  className="rounded-full p-2 text-muted transition-colors hover:bg-neutral-100 hover:text-muted dark:hover:bg-surface/10 dark:hover:text-foreground"
                  aria-label="Close modal"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="my-4 h-px w-full bg-neutral-200 dark:bg-surface-inverse/10" />

              {/* Message rendered purely as plain text */}
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-muted dark:text-muted">
                  {activeModalEntry.message}
                </p>
              </div>

              {/* Badges in modal */}
              {(activeModalEntry.pinned || activeModalEntry.likedByAdmin) && (
                <div className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-border/5">
                  {activeModalEntry.pinned && (
                    <span className="font-semibold text-accent-foreground dark:text-orange-400">
                      📌 Pinned
                    </span>
                  )}
                  {activeModalEntry.likedByAdmin && (
                    <span className="font-semibold text-rose-500 dark:text-rose-400">
                      ❤️ Liked by Waseem
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
