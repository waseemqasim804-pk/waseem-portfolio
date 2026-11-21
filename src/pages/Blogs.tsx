import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { FacebookAuthProvider, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { auth, isFirebaseConfigured, db } from '../lib/firebase'
import { blogDateIso, formatBlogDate, postReadTime, postTags } from '../lib/blog'
import { useSiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'
import PageHero from '../components/PageHero'
import ScrollReveal from '../components/ScrollReveal'
import PageMeta from '../components/PageMeta'
import SocialSignInButtons from '../components/SocialSignInButtons'

type Post = {
  id: string
  title: string
  slug: string
  excerpt?: string
  category?: string
  tags?: unknown
  cover?: string
  content?: string
  date?: string
  createdAt?: unknown
  published?: boolean
  readTime?: number
  views?: number
}

export default function Blogs() {
  const { blog } = useSiteContent()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [moreTagsOpen, setMoreTagsOpen] = useState(false)
  const moreTagsButtonRef = useRef<HTMLButtonElement>(null)
  const moreTagsContainerRef = useRef<HTMLDivElement>(null)
  const [blogUser, setBlogUser] = useState<User | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authStatus, setAuthStatus] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return
    return onAuthStateChanged(auth, setBlogUser)
  }, [])

  useEffect(() => {
    if (!moreTagsOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!moreTagsContainerRef.current?.contains(event.target as Node)) setMoreTagsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [moreTagsOpen])

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return }
    let active = true
    setLoading(true)
    getDocs(query(collection(db, 'posts'), where('published', '==', true), orderBy('createdAt', 'desc')))
      .then(snapshot => { if (active) setPosts(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Post))) })
      .catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const DEFAULT_TAGS = ['LLM', 'FastAPI', 'Python', 'RAG', 'React', 'AI', 'Computer Vision']
  const tagCounts = posts.flatMap(postTags).reduce<Record<string, number>>((counts, tag) => {
    counts[tag] = (counts[tag] ?? 0) + 1
    return counts
  }, {})
  const postTagKeys = Object.entries(tagCounts)
    .sort(([leftTag, leftCount], [rightTag, rightCount]) => rightCount - leftCount || leftTag.localeCompare(rightTag))
    .map(([tag]) => tag)
  const tags = Array.from(new Set([...DEFAULT_TAGS, ...postTagKeys]))
  const topTags = tags.slice(0, 7)
  const visibleTags = selectedTag && !topTags.includes(selectedTag) ? [...topTags, selectedTag] : topTags
  const remainingTags = tags.filter(tag => !visibleTags.includes(tag))
  const hiddenTagCount = remainingTags.length
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filtered = posts.filter(post => {
    const postTagList = postTags(post)
    const matchesTag = !selectedTag || postTagList.includes(selectedTag)
    const haystack = [post.title, post.excerpt, ...postTagList].join(' ').toLocaleLowerCase()
    return matchesTag && (!normalizedSearch || haystack.includes(normalizedSearch))
  })

  const handleSocialSignIn = async (providerName: 'google' | 'facebook') => {
    if (!auth) return
    setAuthBusy(true)
    setAuthStatus('')
    try {
      const provider = providerName === 'facebook' ? new FacebookAuthProvider() : new GoogleAuthProvider()
      if (providerName === 'facebook') provider.addScope('email')
      await signInWithPopup(auth, provider)
    } catch (cause: any) {
      if (cause?.code === 'auth/popup-closed-by-user' || cause?.code === 'auth/cancelled-popup-request') return
      if (cause?.code === 'auth/operation-not-allowed') setAuthStatus('This sign-in provider is not enabled in Firebase yet.')
      else if (cause?.code === 'auth/unauthorized-domain') setAuthStatus('This website domain is not authorized for Firebase sign-in.')
      else setAuthStatus(`${providerName === 'facebook' ? 'Facebook' : 'Google'} sign-in could not be completed.`)
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSocialSignOut = async () => {
    if (!auth) return
    try { await signOut(auth) } catch { setAuthStatus('Sign-out could not be completed.') }
  }

  return (
    <div className="relative isolate min-h-screen">
      <main className="relative overflow-hidden px-5 pb-24 pt-0 sm:px-8 lg:px-12">
      <PageMeta
        title={blog.title}
        description={`${blog.lead} ${blog.accent}`}
        path="/blogs"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] overflow-hidden">
        <div className="absolute left-[12%] top-8 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute right-[8%] top-24 h-[340px] w-[340px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-neutral-100/70 to-transparent dark:from-white/[0.025]" />
      </div>

      <div className="mx-auto max-w-[1440px]">
        <PageHero
          size="blogs"
          title={blog.title || 'BLOGS'}
          eyebrow={blog.eyebrow || 'NOTES ON BUILDING, BREAKING, AND'}
          accent={blog.accent || 'shipping AI.'}
          subline={(blog as any).subline || 'LLMs, RAG, computer vision and FastAPI, written from real projects I build and ship.'}
        />

        <ScrollReveal delay={0.04}>
          <section
            aria-label="Search and filter blog posts"
            className="mb-8 mt-6 sm:mt-8"
          >
            {isFirebaseConfigured && auth && (
              <div className="mb-6 flex flex-col items-end gap-2">
                {blogUser ? (
                  <div className="flex items-center gap-3 text-sm text-muted dark:text-muted">
                    <span>Signed in as {blogUser.displayName || blogUser.email || 'visitor'}</span>
                    <button type="button" onClick={() => void handleSocialSignOut()} className="font-semibold text-accent-foreground hover:underline dark:text-orange-300">Sign out</button>
                  </div>
                ) : (
                  <div className="grid w-full max-w-[480px] gap-5 self-end rounded-[2.75rem] border border-neutral-200 bg-surface/90 p-6 shadow-lg dark:border-foreground/25 dark:bg-[linear-gradient(145deg,rgba(56,189,248,0.5)_0%,rgba(99,102,241,0.5)_38%,rgba(168,85,247,0.52)_68%,rgba(18,18,20,0.98)_90%)] dark:shadow-[0_24px_70px_rgba(56,189,248,0.12),0_16px_70px_rgba(168,85,247,0.18)] sm:p-8">
                  <SocialSignInButtons
                    disabled={authBusy}
                    busy={authBusy}
                    onGoogle={() => void handleSocialSignIn('google')}
                    onFacebook={() => void handleSocialSignIn('facebook')}
                  />
                </div>
                )}
                {authStatus && <p role="alert" className="text-right text-xs font-medium text-rose-500">{authStatus}</p>}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[40%_minmax(0,1fr)] lg:items-center lg:gap-10">
              <label className="relative block h-[52px] w-full sm:h-16">
                <input
                  type="text"
                  inputMode="search"
                  role="searchbox"
                  aria-label={blog.searchPlaceholder}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder={blog.searchPlaceholder}
                  className="h-full w-full rounded-full border border-neutral-300 bg-surface/80 pl-12 pr-12 text-base text-foreground outline-none transition placeholder:text-muted focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-border/10 dark:bg-[rgb(17 19 21)] dark:text-foreground dark:placeholder:text-muted sm:pl-14 sm:pr-14 sm:text-lg"
                />
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-muted sm:left-5">
                  <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m16 16 4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-neutral-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-surface/10 dark:hover:text-foreground sm:right-4"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </label>

              <div
                ref={moreTagsContainerRef}
                className="relative min-w-0"
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMoreTagsOpen(false)
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setMoreTagsOpen(false)
                    moreTagsButtonRef.current?.focus()
                  }
                }}
              >
                <style>{`.blog-tag-scroll::-webkit-scrollbar { display: none; } .blog-tag-scroll { scrollbar-width: none; }`}</style>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-neutral-50 to-transparent dark:from-background" />
                <div className="blog-tag-scroll flex h-12 items-center gap-2 overflow-x-auto whitespace-nowrap pr-10 sm:h-14" role="group" aria-label="Filter posts by tag">
                  {[{ label: blog.allPosts, value: '' }, ...visibleTags.map(tag => ({ label: tag, value: tag }))].map(tag => (
                    <button
                      key={tag.value || 'all-posts'}
                      type="button"
                      aria-pressed={selectedTag === tag.value}
                      onClick={() => setSelectedTag(tag.value)}
                      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold lowercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-[var(--bg)] sm:h-12 sm:px-6 sm:text-base ${selectedTag === tag.value
                        ? 'border-orange-500/30 bg-orange-500/10 text-accent-foreground dark:text-orange-300'
                        : 'border-transparent bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground dark:bg-surface-inverse/[0.06] dark:text-muted dark:hover:bg-surface/[0.12] dark:hover:text-foreground'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                  {hiddenTagCount > 0 && (
                    <button
                      ref={moreTagsButtonRef}
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={moreTagsOpen}
                      aria-controls="blog-more-tags"
                      onClick={() => setMoreTagsOpen(open => !open)}
                      className="h-10 shrink-0 rounded-full border border-transparent bg-neutral-100 px-4 text-sm font-semibold text-muted transition-colors hover:bg-neutral-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-surface-inverse/[0.06] dark:text-muted dark:hover:bg-surface/[0.12] dark:hover:text-foreground sm:h-12 sm:px-6 sm:text-base"
                    >
                      +{hiddenTagCount} more
                    </button>
                  )}
                </div>
                {moreTagsOpen && hiddenTagCount > 0 && (
                  <div id="blog-more-tags" role="group" aria-label="More blog tags" className="absolute right-0 top-full z-30 mt-3 grid max-h-64 w-[min(22rem,calc(100vw-2.5rem))] grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-neutral-200 bg-surface p-3 shadow-2xl dark:border-border/10 dark:bg-surface">
                    {remainingTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={selectedTag === tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`min-h-10 truncate rounded-full border px-4 text-left text-sm font-semibold lowercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${selectedTag === tag
                          ? 'border-orange-500/30 bg-orange-500/10 text-accent-foreground dark:text-orange-300'
                          : 'border-transparent bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground dark:bg-surface-inverse/[0.06] dark:text-muted dark:hover:bg-surface/[0.12] dark:hover:text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label={blog.loadingLabel}>
            {Array.from({ length: 6 }, (_, index) => <PostSkeleton key={index} />)}
          </div>
        ) : !isFirebaseConfigured ? (
          <EmptyState title={blog.firebaseUnavailableTitle} message={blog.firebaseUnavailableLead} />
        ) : loadError ? (
          <EmptyState title={blog.loadErrorTitle} message={blog.loadErrorLead} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={posts.length === 0 ? blog.emptyTitle : blog.noResultsTitle}
            message={posts.length === 0 ? blog.emptyLead : blog.noResultsLead}
          />
        ) : (
          <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
          </div>
        )}

      </div>
    </main>
  </div>
  )
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const { blog } = useSiteContent()
  const cover = useResolvedMedia(post.cover ?? '', '')
  const reduceMotion = useReducedMotion()
  const pointerX = useMotionValue(-100)
  const pointerY = useMotionValue(-100)
  const badgeX = useSpring(pointerX, { stiffness: 280, damping: 28, mass: 0.5 })
  const badgeY = useSpring(pointerY, { stiffness: 280, damping: 28, mass: 0.5 })
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [finePointer, setFinePointer] = useState(false)
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0 })
  const tags = postTags(post)
  const date = formatBlogDate(post.date, post.createdAt)
  const dateIso = blogDateIso(post.date, post.createdAt)
  const readTime = postReadTime(post)
  const views = Number.isFinite(Number(post.views)) ? Math.max(0, Number(post.views)) : 0

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(query.matches && !reduceMotion)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [reduceMotion])

  const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse' || reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    pointerX.set(x - 45)
    pointerY.set(y - 45)
    setSpotlight({ x, y })
  }

  const spotlightStyle = {
    background: `radial-gradient(240px circle at ${spotlight.x}px ${spotlight.y}px, rgba(249,115,22,.12), transparent 70%)`,
  } as CSSProperties
  const pathId = `read-article-circle-${post.id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, delay: Math.min(index % 6, 5) * 0.055, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        to={`/blogs/${post.slug}`}
        aria-label={`${blog.readArticle}: ${post.title}`}
        onPointerMove={onPointerMove}
        onPointerEnter={event => { if (event.pointerType === 'mouse' && !reduceMotion) setBadgeVisible(true) }}
        onPointerLeave={() => setBadgeVisible(false)}
        data-hover-list="blogs"
        className={`hover-card blog-post-card group relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-neutral-300/70 bg-surface/60 shadow-[0_24px_70px_-48px_rgba(0,0,0,.65)] backdrop-blur-xl hover:border-orange-400/50 hover:shadow-[0_28px_80px_-45px_rgba(249,115,22,.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-neutral-950 dark:border-border/10 dark:bg-[rgb(17 19 21)]/75 ${reduceMotion ? 'transition-colors' : 'transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1'} ${finePointer ? 'cursor-none' : ''}`}
      >
        <div aria-hidden="true" className={`blog-card-spotlight pointer-events-none absolute inset-0 z-10 rounded-[inherit] ${reduceMotion ? 'hidden' : 'opacity-0 transition-opacity duration-300 group-hover:opacity-100'}`} style={spotlightStyle} />
        {cover && (
          <div className="relative h-52 shrink-0 overflow-hidden border-b border-neutral-200/60 dark:border-border/10">
            <img src={cover} alt={`${post.title} cover image`} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            <div className="blog-post-cover-overlay absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-black/5 dark:from-[rgb(17 19 21)]/80 dark:via-transparent dark:to-black/10" />
          </div>
        )}
        <div className="blog-post-content relative z-0 flex flex-1 flex-col p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted dark:text-muted">
            {date && <time dateTime={dateIso}>{date}</time>}
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            <span>{readTime} {blog.readTimeLabel}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 normal-case tracking-normal">
              <EyeIcon />{views.toLocaleString()} {blog.viewLabel}
            </span>
          </div>
          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <h2 className="font-serif text-2xl font-medium leading-tight tracking-tight text-foreground transition-colors duration-300 group-hover:text-accent-foreground dark:text-foreground dark:group-hover:text-orange-200 sm:text-[1.7rem]">
              {post.title}
            </h2>
            {post.excerpt && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted dark:text-muted">{post.excerpt}</p>}
            <div className="mt-auto flex items-end justify-between gap-4 pt-7">
              <div className="flex min-w-0 flex-wrap gap-2" aria-label="Post tags">
                {tags.slice(0, 3).map(tag => <span key={tag} className="rounded-full border border-orange-500/20 bg-orange-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground dark:text-orange-200">{tag}</span>)}
                {tags.length > 3 && <span className="rounded-full border border-neutral-300/70 px-3 py-1.5 text-[10px] font-semibold text-muted dark:border-border/10 dark:text-muted">+{tags.length - 3}</span>}
              </div>
              <span aria-hidden="true" className="blog-post-arrow hover-card-arrow grid h-11 w-11 shrink-0 place-items-center rounded-full border border-neutral-300 text-muted transition-all duration-300 group-hover:border-orange-400 group-hover:bg-orange-400 group-hover:text-foreground dark:border-border/15 dark:text-foreground">
                <ArrowIcon />
              </span>
            </div>
          </div>
        </div>
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute z-20 h-[90px] w-[90px] place-items-center rounded-full border border-orange-300/70 bg-neutral-950/90 text-surface-inverse shadow-[0_0_32px_rgba(249,115,22,.35)] ${finePointer ? 'grid' : 'hidden'}`}
          style={{ left: 0, top: 0, x: badgeX, y: badgeY, opacity: badgeVisible ? 1 : 0 }}
          transition={{ opacity: { duration: 0.18 } }}
        >
          <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" animate={reduceMotion ? undefined : { rotate: 360 }} transition={reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'linear' }}>
            <defs><path id={pathId} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
            <text fill="currentColor" fontSize="9" fontWeight="700" letterSpacing="2.2"><textPath href={`#${pathId}`}>{blog.readArticle} · {blog.readArticle} · </textPath></text>
          </motion.svg>
          <EyeIcon className="h-5 w-5 text-orange-300" />
        </motion.div>
      </Link>
    </motion.div>
  )
}

function PostSkeleton() {
  return <div aria-hidden="true" className="min-h-[390px] animate-pulse rounded-[28px] border border-neutral-300/70 bg-surface/50 p-7 motion-reduce:animate-none dark:border-border/10 dark:bg-surface-inverse/[0.025]">
    <div className="h-3 w-2/3 rounded bg-neutral-300/70 dark:bg-surface-inverse/10" />
    <div className="mt-10 h-7 w-4/5 rounded bg-neutral-300/70 dark:bg-surface-inverse/10" />
    <div className="mt-4 h-4 w-full rounded bg-neutral-300/50 dark:bg-surface-inverse/[0.07]" />
    <div className="mt-2 h-4 w-3/4 rounded bg-neutral-300/50 dark:bg-surface-inverse/[0.07]" />
    <div className="mt-20 flex gap-2"><div className="h-7 w-16 rounded-full bg-neutral-300/50 dark:bg-surface-inverse/[0.07]" /><div className="h-7 w-20 rounded-full bg-neutral-300/50 dark:bg-surface-inverse/[0.07]" /></div>
  </div>
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-dashed border-neutral-300 bg-surface/30 px-6 text-center dark:border-border/15 dark:bg-surface-inverse/[0.02]">
    <span aria-hidden="true" className="mb-6 grid h-14 w-14 place-items-center rounded-full border border-orange-400/20 bg-orange-400/10 text-accent-foreground dark:text-orange-200"><BookIcon /></span>
    <h2 className="text-xl font-semibold tracking-tight text-foreground dark:text-foreground">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted dark:text-muted">{message}</p>
  </div>
}

function EyeIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}><path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" /></svg>
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><path d="M6 18 18 6M7 6h11v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function BookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M5 4.8h10.5A3.5 3.5 0 0 1 19 8.3v11H8a3 3 0 0 1-3-3V4.8Z" stroke="currentColor" strokeWidth="1.5" /><path d="M5 16.2a3 3 0 0 1 3-3h11M9 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
