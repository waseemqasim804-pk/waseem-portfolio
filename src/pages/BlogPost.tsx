import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { collection, doc, getDocs, increment, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { isFirebaseConfigured, db } from '../lib/firebase'
import { blogDateIso, formatBlogDate, postReadTime, postTags } from '../lib/blog'
import { useSiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'
import { getBlogHeadings, type BlogHeading } from '../components/BlogMarkdown'
import BlogMarkdown from '../components/BlogMarkdown'
import PageMeta from '../components/PageMeta'

type Post = {
  id: string
  title: string
  slug: string
  content?: string
  excerpt?: string
  category?: string
  tags?: unknown
  cover?: string
  createdAt?: unknown
  date?: string
  published?: boolean
  readTime?: number
  views?: number
}

export default function BlogPost() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { blog, brandLogoImage } = useSiteContent()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [toast, setToast] = useState('')
  const [activeHeading, setActiveHeading] = useState('')
  const attemptedViews = useRef(new Set<string>())
  const articleRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !slug) { setLoading(false); return }
    let active = true
    setLoading(true)
    setLoadError(false)
    getDocs(query(collection(db, 'posts'), where('published', '==', true), orderBy('createdAt', 'desc')))
      .then(snapshot => {
        if (active) setPosts(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Post)))
      })
      .catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const post = posts.find(item => item.slug === slug)
  const headings = post ? getBlogHeadings(post.content ?? '') : []
  const cover = useResolvedMedia(post?.cover ?? '', '')
  const avatar = useResolvedMedia(brandLogoImage ?? '', '')

  useEffect(() => {
    if (!post || !db || attemptedViews.current.has(post.id)) return
    const key = `portfolio-blog-view:${post.id}`
    try {
      if (window.localStorage.getItem(key) === '1') return
    } catch { /* localStorage may be unavailable in private browsing */ }
    attemptedViews.current.add(post.id)
    updateDoc(doc(db, 'posts', post.id), { views: increment(1) })
      .then(() => {
        try { window.localStorage.setItem(key, '1') } catch { /* the in-memory guard still prevents duplicate attempts */ }
        setPosts(current => current.map(item => item.id === post.id ? { ...item, views: (Number(item.views) || 0) + 1 } : item))
      })
      .catch(() => { attemptedViews.current.delete(post.id) })
  }, [post?.id])

  useEffect(() => {
    if (!post || headings.length === 0) { setActiveHeading(''); return }
    setActiveHeading(headings[0].id)
    const targets = headings.map(heading => document.getElementById(heading.id)).filter((element): element is HTMLElement => Boolean(element))
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
      if (visible[0]?.target instanceof HTMLElement) setActiveHeading(visible[0].target.id)
    }, { rootMargin: '-18% 0px -70% 0px', threshold: [0, 1] })
    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [post?.id, headings.map(item => item.id).join('|')])

  useEffect(() => {
    const updateProgress = () => {
      const article = articleRef.current
      if (!article) { setProgress(0); return }
      const top = article.getBoundingClientRect().top + window.scrollY
      const distance = Math.max(1, article.offsetHeight - window.innerHeight)
      setProgress(Math.max(0, Math.min(1, (window.scrollY - top + 20) / distance)))
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [post?.id])

  if (!isFirebaseConfigured) return <MessageState title={blog.firebaseUnavailableTitle} message={blog.firebaseUnavailableLead} backLabel={blog.backToBlogs} />
  if (loading) return <LoadingState label={blog.loadingLabel} />
  if (loadError) return <MessageState title={blog.loadErrorTitle} message={blog.loadErrorLead} backLabel={blog.backToBlogs} />
  if (!post) return <MessageState title={blog.notFoundTitle} message={blog.emptyLead} backLabel={blog.backToBlogs} />

  const publishedDate = formatBlogDate(post.date, post.createdAt)
  const publishedIso = blogDateIso(post.date, post.createdAt)
  const postViews = Math.max(0, Number(post.views) || 0)
  const readTime = postReadTime(post)
  const tags = postTags(post)
  const otherPosts = posts.filter(item => item.id !== post.id)
  const related = otherPosts
    .map(item => ({ post: item, overlap: postTags(item).filter(tag => tags.includes(tag)).length }))
    .filter(item => item.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, 3)
    .map(item => item.post)
  const currentIndex = posts.findIndex(item => item.id === post.id)
  const newerPost = currentIndex > 0 ? posts[currentIndex - 1] : undefined
  const olderPost = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : undefined
  const description = post.excerpt || blog.lead
  const canonicalPath = `/blogs/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: publishedIso,
    image: cover || undefined,
    author: { '@type': 'Person', name: blog.authorName },
    mainEntityOfPage: canonicalPath,
  }

  const sharePost = async () => {
    const shareData = { title: post.title, text: post.excerpt || post.title, url: window.location.href }
    if (navigator.share) {
      try { await navigator.share(shareData); return }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return }
    }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareData.url)
      else {
        const input = document.createElement('textarea')
        input.value = shareData.url
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        const copied = document.execCommand('copy')
        input.remove()
        if (!copied) throw new Error('Copy failed')
      }
      setToast(blog.copiedLabel)
    } catch {
      setToast(blog.copyFailedLabel)
    }
    window.setTimeout(() => setToast(''), 2600)
  }

  const scrollToHeading = (heading: BlogHeading) => {
    const target = document.getElementById(heading.id)
    if (!target) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-24 sm:px-8 md:pt-28 lg:px-12">
      <PageMeta rawTitle={`${post.title} | Muhammad Waseem Qasim`} description={description} path={canonicalPath} image={cover || undefined} />
      <Helmet>
        <meta property="og:type" content="article" />
        {publishedIso && <meta property="article:published_time" content={publishedIso} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-neutral-200/70 dark:bg-white/10">
        <div className="h-full origin-left bg-gradient-to-r from-blue-500 via-orange-400 to-orange-200" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="mx-auto max-w-[1440px]">
        <Link to="/blogs" className="group mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300/70 bg-white/50 px-4 text-sm font-medium text-neutral-600 transition-colors hover:border-orange-400/50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:text-orange-200">
          <ArrowLeftIcon />{blog.backToBlogs}
        </Link>

        <header className="relative isolate flex min-h-[420px] items-end overflow-hidden rounded-[30px] border border-neutral-300/60 bg-neutral-200 shadow-[0_30px_100px_-55px_rgba(0,0,0,.65)] dark:border-white/10 dark:bg-[#121416] sm:min-h-[500px] sm:rounded-[38px]">
          {cover ? <img src={cover} alt={`${post.title} cover`} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" /> : <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(37,99,235,.38),transparent_40%),radial-gradient(ellipse_at_80%_80%,rgba(249,115,22,.32),transparent_38%),linear-gradient(135deg,#111827,#111315_58%,#24150e)]" />}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/5" />
          <div className="relative z-10 max-w-5xl px-6 pb-8 pt-24 sm:px-10 sm:pb-12 lg:px-14 lg:pb-14">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {(post.category || tags[0]) && <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-100 backdrop-blur-md">{post.category || tags[0]}</span>}
              {tags.filter(tag => tag !== post.category).slice(0, 2).map(tag => <span key={tag} className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-100 backdrop-blur-md">{tag}</span>)}
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">{readTime} {blog.readTimeLabel}</span>
            </div>
            <h1 className="max-w-5xl text-[clamp(2.6rem,7vw,6.5rem)] font-bold leading-[0.98] tracking-[-0.055em] text-white">{post.title}</h1>
            {post.excerpt && <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-200 sm:text-lg">{post.excerpt}</p>}
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-300">
              {publishedDate && <time dateTime={publishedIso}>{publishedDate}</time>}
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-orange-400" />
              <span className="inline-flex items-center gap-2"><EyeIcon />{postViews.toLocaleString()} {blog.viewLabel}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-[1320px] gap-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-14">
          <article ref={articleRef} className="min-w-0">
            <AuthorRow blog={blog} avatar={avatar} views={postViews} onShare={() => void sharePost()} />
            {headings.length > 0 && <MobileContents headings={headings} active={activeHeading} label={blog.onThisPage} onSelect={scrollToHeading} />}
            <div id="post-reading-content" className="pt-8">
              <BlogMarkdown markdown={post.content ?? ''} />
            </div>

            <AuthorCard blog={blog} avatar={avatar} />
            {related.length > 0 && <RelatedPosts posts={related} title={blog.relatedTitle} />}
            {(newerPost || olderPost) && <PostNavigation previous={olderPost} next={newerPost} blog={blog} />}
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-neutral-200/70 bg-white/50 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025]">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{blog.onThisPage}</p>
              {headings.length ? <nav aria-label={blog.onThisPage} className="flex flex-col gap-1.5">
                {headings.map(heading => <button key={heading.id} type="button" onClick={() => scrollToHeading(heading)} className={`min-h-10 rounded-lg px-3 py-2 text-left text-xs leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${activeHeading === heading.id ? 'bg-orange-400/10 font-semibold text-orange-700 dark:text-orange-200' : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>{heading.text}</button>)}
              </nav> : <p className="text-xs leading-5 text-neutral-500">{blog.emptyTableOfContents}</p>}
              <div className="mt-6 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">{readTime} {blog.readTimeLabel}</div>
            </div>
          </aside>
        </div>
      </div>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-white/10 bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </main>
  )
}

function ReadingAuthor({ blog, avatar }: { blog: ReturnType<typeof useSiteContent>['blog']; avatar: string }) {
  return <div className="flex min-w-0 items-center gap-3">
    {avatar ? <img src={avatar} alt="" className="h-11 w-11 rounded-full border border-neutral-200 object-cover dark:border-white/15" /> : <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-orange-400/30 bg-orange-400/10 font-serif text-sm font-bold text-orange-700 dark:text-orange-200">WQ</span>}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{blog.authorName}</p>
      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{blog.authorRole}</p>
    </div>
  </div>
}

function AuthorRow({ blog, avatar, views, onShare }: { blog: ReturnType<typeof useSiteContent>['blog']; avatar: string; views: number; onShare: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/70 pb-6 dark:border-white/10">
    <ReadingAuthor blog={blog} avatar={avatar} />
    <div className="flex items-center gap-4">
      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500"><EyeIcon />{views.toLocaleString()} {blog.viewLabel}</span>
      <button type="button" aria-label={blog.shareTitle} onClick={onShare} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 transition-colors hover:border-orange-400 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-white/15 dark:text-neutral-200 dark:hover:text-orange-200">
        <ShareIcon />{blog.shareLabel}
      </button>
    </div>
  </div>
}

function AuthorCard({ blog, avatar }: { blog: ReturnType<typeof useSiteContent>['blog']; avatar: string }) {
  return <section className="mt-16 flex flex-col gap-5 rounded-[26px] border border-neutral-200/70 bg-neutral-100/70 p-6 dark:border-white/10 dark:bg-white/[0.035] sm:flex-row sm:items-center sm:p-8">
    {avatar ? <img src={avatar} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-full border border-neutral-200 object-cover dark:border-white/15" /> : <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-orange-400/30 bg-orange-400/10 font-serif text-xl font-bold text-orange-700 dark:text-orange-200">WQ</span>}
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{blog.authorCardTitle}</p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">{blog.authorName}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">{blog.authorBio}</p>
    </div>
    <Link to="/about" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:bg-white dark:text-neutral-950 dark:hover:bg-orange-300">{blog.moreAboutMe}<ArrowRightIcon /></Link>
  </section>
}

function MobileContents({ headings, active, label, onSelect }: { headings: BlogHeading[]; active: string; label: string; onSelect: (heading: BlogHeading) => void }) {
  return <details className="mt-6 rounded-2xl border border-neutral-200 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.025] lg:hidden">
    <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:text-neutral-300">{label}</summary>
    <nav aria-label={label} className="mt-3 flex flex-col gap-1">
      {headings.map(heading => <button key={heading.id} type="button" onClick={() => onSelect(heading)} className={`min-h-10 rounded-lg px-3 py-2 text-left text-sm ${active === heading.id ? 'bg-orange-400/10 text-orange-700 dark:text-orange-200' : 'text-neutral-500 dark:text-neutral-400'}`}>{heading.text}</button>)}
    </nav>
  </details>
}

function RelatedPosts({ posts, title }: { posts: Post[]; title: string }) {
  return <section className="mt-16 border-t border-neutral-200 pt-10 dark:border-white/10">
    <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map(post => <Link key={post.id} to={`/blogs/${post.slug}`} className="group min-h-32 rounded-2xl border border-neutral-200/70 bg-white/40 p-5 transition-colors hover:border-orange-400/50 hover:bg-orange-400/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-white/10 dark:bg-white/[0.025]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{postTags(post).slice(0, 2).join(' · ')}</span>
        <p className="mt-3 font-serif text-lg leading-snug text-neutral-900 transition-colors group-hover:text-orange-700 dark:text-white dark:group-hover:text-orange-200">{post.title}</p>
      </Link>)}
    </div>
  </section>
}

function PostNavigation({ previous, next, blog }: { previous?: Post; next?: Post; blog: ReturnType<typeof useSiteContent>['blog'] }) {
  return <nav aria-label={blog.postNavigation} className="mt-10 grid gap-3 sm:grid-cols-2">
    {previous ? <Link to={`/blogs/${previous.slug}`} className="group flex min-h-24 flex-col justify-center rounded-2xl border border-neutral-200/70 p-5 transition-colors hover:border-orange-400/50 dark:border-white/10"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">← {blog.previousPost}</span><span className="mt-2 line-clamp-1 font-semibold text-neutral-800 group-hover:text-orange-700 dark:text-neutral-200 dark:group-hover:text-orange-200">{previous.title}</span></Link> : <span />}
    {next && <Link to={`/blogs/${next.slug}`} className="group flex min-h-24 flex-col items-start justify-center rounded-2xl border border-neutral-200/70 p-5 transition-colors hover:border-orange-400/50 sm:items-end sm:text-right dark:border-white/10"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{blog.nextPost} →</span><span className="mt-2 line-clamp-1 font-semibold text-neutral-800 group-hover:text-orange-700 dark:text-neutral-200 dark:group-hover:text-orange-200">{next.title}</span></Link>}
  </nav>
}

function MessageState({ title, message, backLabel }: { title: string; message: string; backLabel: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center">
    <div aria-hidden="true" className="mb-6 grid h-16 w-16 place-items-center rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-700 dark:text-orange-200"><BookIcon /></div>
    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>
    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    <Link to="/blogs" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"><ArrowLeftIcon />{backLabel}</Link>
  </main>
}

function LoadingState({ label }: { label: string }) {
  return <main aria-label={label} className="mx-auto min-h-[70vh] max-w-5xl px-5 py-24">
    <div className="h-10 w-36 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none dark:bg-white/10" />
    <div className="mt-8 h-96 animate-pulse rounded-[32px] bg-neutral-200 motion-reduce:animate-none dark:bg-white/[0.05]" />
    <div className="mt-8 h-6 w-2/3 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none dark:bg-white/10" />
  </main>
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" /></svg>
}

function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="m8.2 10.8 7.5-4.4m-7.5 6.8 7.5 4.4" stroke="currentColor" strokeWidth="1.6" /></svg>
}

function ArrowLeftIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"><path d="M16 10H4m0 0 5-5m-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M4 10h12m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function BookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M5 4.8h10.5A3.5 3.5 0 0 1 19 8.3v11H8a3 3 0 0 1-3-3V4.8Z" stroke="currentColor" strokeWidth="1.5" /><path d="M5 16.2a3 3 0 0 1 3-3h11M9 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
