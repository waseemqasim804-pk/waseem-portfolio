// src/pages/Admin.tsx — full admin panel with Firebase auth gate
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { isFirebaseConfigured, auth, db } from '../lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import PageMeta from '../components/PageMeta'
import AdminContentEditor from '../components/AdminContentEditor'
import BlogMarkdown from '../components/BlogMarkdown'
import { blogDateInput, estimateReadTime } from '../lib/blog'
import { BLOG_STARTER_POSTS } from '../data/blogStarterPosts'
import { dataUrlSize, useResolvedMedia } from '../hooks/useMedia'
import { useSiteContent } from '../hooks/useSiteContent'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'waseemqasim804@gmail.com'

// ── Setup guide shown when Firebase is not configured ─────────────────────────
function SetupGuide() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="p-8 rounded-2xl border border-dashed border-orange-400/40 bg-orange-400/5">
        <span className="text-5xl mb-4 block">🔧</span>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Firebase not configured</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-sm">
          The admin panel needs Firebase credentials. Follow these steps:
        </p>
        <ol className="flex flex-col gap-4 text-sm text-neutral-700 dark:text-neutral-300">
          {[
            'Go to console.firebase.google.com and create a new project.',
            'Enable Authentication → Sign-in method → Email/Password.',
            'Create a Firestore database (start in production mode).',
            'Go to Project Settings → Your Apps → Web App → copy the config object.',
            'Copy .env.example → .env and paste in the values.',
            'In Firebase Console → Authentication → Users, add your email: ' + ADMIN_EMAIL,
            'In Firestore, deploy firestore.rules (firebase deploy --only firestore:rules).',
            'Restart the dev server: npm run dev',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    setError('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      if (cred.user.email !== ADMIN_EMAIL) {
        await signOut(auth)
        setError('This account is not authorised as admin.')
      } else {
        onLogin(cred.user)
      }
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      >
        <span className="text-4xl mb-4 block">🔒</span>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Admin Login</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Admin email"
            required
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-brand"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'content' | 'messages' | 'guestbook' | 'bookings' | 'posts' | 'export'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',   icon: '📊' },
  { id: 'content',   label: 'Site Content', icon: '✏️' },
  { id: 'messages',  label: 'Messages',   icon: '📬' },
  { id: 'guestbook', label: 'Guestbook',  icon: '✍️' },
  { id: 'bookings',  label: 'Bookings',   icon: '📅' },
  { id: 'posts',     label: 'Blog Posts', icon: '📝' },
  { id: 'export',    label: 'Export',     icon: '💾' },
]

// ── Admin panel (authenticated) ───────────────────────────────────────────────
function AdminPanel({ user }: { user: User }) {
  const content = useSiteContent()
  const [tab, setTab] = useState<TabId>('overview')
  const [messages, setMessages] = useState<any[]>([])
  const [guestEntries, setGuestEntries] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [editingPost, setEditingPost] = useState<any | null>(null)
  const [postToast, setPostToast] = useState('')
  const [importingStarterPosts, setImportingStarterPosts] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const markdownInput = useRef<HTMLTextAreaElement>(null)

  const loadData = async (t: TabId) => {
    if (!db) return
    setLoadingData(true)
    try {
      if (t === 'messages') {
        const snap = await getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc')))
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      if (t === 'guestbook') {
        const snap = await getDocs(query(collection(db, 'guestbook'), orderBy('createdAt', 'desc')))
        setGuestEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      if (t === 'bookings') {
        const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')))
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      if (t === 'posts') {
        const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')))
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => { loadData(tab) }, [tab])

  const deleteItem = async (col: string, id: string, setter: (v: any[]) => void, list: any[]) => {
    if (!db) return
    await deleteDoc(doc(db, col, id))
    setter(list.filter(x => x.id !== id))
  }

  const toggleGuestbookApproval = async (id: string, currentApproved: boolean) => {
    if (!db) return
    await updateDoc(doc(db, 'guestbook', id), { approved: !currentApproved })
    setGuestEntries(prev => prev.map(x => x.id === id ? { ...x, approved: !currentApproved } : x))
  }

  const toggleGuestbookPinned = async (id: string, currentPinned: boolean) => {
    if (!db) return
    await updateDoc(doc(db, 'guestbook', id), { pinned: !currentPinned })
    setGuestEntries(prev => prev.map(x => x.id === id ? { ...x, pinned: !currentPinned } : x))
  }

  const toggleGuestbookHeart = async (id: string, currentHeart: boolean) => {
    if (!db) return
    await updateDoc(doc(db, 'guestbook', id), { likedByAdmin: !currentHeart })
    setGuestEntries(prev => prev.map(x => x.id === id ? { ...x, likedByAdmin: !currentHeart } : x))
  }

  const deleteGuestbookEntryWithConfirm = async (id: string) => {
    if (!db) return
    if (!window.confirm('Are you sure you want to delete this guestbook signature permanently?')) return
    await deleteDoc(doc(db, 'guestbook', id))
    setGuestEntries(prev => prev.filter(x => x.id !== id))
  }

  const approveGuest = async (id: string) => {
    if (!db) return
    await updateDoc(doc(db, 'guestbook', id), { approved: true })
    setGuestEntries(prev => prev.map(x => x.id === id ? { ...x, approved: true } : x))
  }

  const savePost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!db || !editingPost) return
    const changes = {
      title: editingPost.title,
      slug: editingPost.slug,
      excerpt: editingPost.excerpt || '',
      category: editingPost.category || 'AI',
      cover: editingPost.cover || '',
      content: editingPost.content || '',
      tags: String(editingPost.tagsText ?? '').split(',').map((tag: string) => tag.trim()).filter(Boolean),
      date: editingPost.date || blogDateInput(editingPost.createdAt) || new Date().toISOString().slice(0, 10),
      readTime: estimateReadTime(editingPost.content || ''),
      published: Boolean(editingPost.published),
      featured: Boolean(editingPost.featured),
    }
    try {
      await updateDoc(doc(db, 'posts', editingPost.id), changes)
      setPosts(current => current.map(post => post.id === editingPost.id ? { ...post, ...changes } : post))
      setEditingPost(null)
      setPostToast('Blog post saved.')
    } catch {
      setPostToast('Save failed. Check your connection and try again.')
    }
  }

  const importStarterPosts = async () => {
    if (!db || importingStarterPosts) return
    setImportingStarterPosts(true)
    setPostToast('')
    try {
      const existingSnapshot = await getDocs(collection(db, 'posts'))
      const existingSlugs = new Set(existingSnapshot.docs
        .map(snapshot => snapshot.data().slug)
        .filter((slug): slug is string => typeof slug === 'string'))
      const missingPosts = BLOG_STARTER_POSTS.filter(post => !existingSlugs.has(post.slug))

      if (missingPosts.length) {
        const batch = writeBatch(db)
        for (const post of missingPosts) {
          const reference = doc(collection(db, 'posts'))
          batch.set(reference, {
            ...post,
            author: 'Muhammad Waseem Qasim',
            views: 0,
            featured: false,
            readTime: estimateReadTime(post.content),
            createdAt: new Date(`${post.date}T12:00:00`),
          })
        }
        await batch.commit()
        await loadData('posts')
        setPostToast(`Imported ${missingPosts.length} starter posts; skipped ${BLOG_STARTER_POSTS.length - missingPosts.length} existing slugs.`)
      } else {
        setPostToast('All 8 starter slugs already exist; no posts were overwritten.')
      }
    } catch (error) {
      setPostToast(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed. Check your connection and try again.')
    } finally {
      setImportingStarterPosts(false)
    }
  }

  const insertImageInMarkdown = async (file?: File) => {
    if (!file || !editingPost) return
    try {
      setPostToast('Uploading image...')
      const reference = await saveBlogImage(file)
      const markdown = String(editingPost.content ?? '')
      const cursor = markdownInput.current?.selectionStart ?? markdown.length
      const selectionEnd = markdownInput.current?.selectionEnd ?? cursor
      const insertion = `\n![Image caption](${reference} "Figure caption")\n`
      const next = `${markdown.slice(0, cursor)}${insertion}${markdown.slice(selectionEnd)}`
      setEditingPost((current: any) => current ? { ...current, content: next } : current)
      setPostToast('Image inserted. Edit its alt text and caption in the Markdown.')
      window.setTimeout(() => {
        const input = markdownInput.current
        if (!input) return
        input.focus()
        const position = cursor + insertion.length
        input.setSelectionRange(position, position)
      }, 0)
    } catch (error) {
      setPostToast(error instanceof Error ? error.message : 'Image upload failed.')
    }
  }

  const exportJson = () => {
    const data = { content, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'waseem-portfolio-content.json'
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-brand mb-1">Admin</p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Control Panel</h1>
          <p className="text-sm text-neutral-500 mt-1">{user.email}</p>
        </div>
        <button
          onClick={() => auth && signOut(auth)}
          className="px-5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:border-red-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-brand text-white shadow-lg shadow-brand/30'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Projects', n: content.portfolio.projects.length, icon: '🚀' },
            { label: 'Services', n: content.services.items.length,     icon: '⚙️' },
            { label: 'Awards',   n: content.awards.items.length,       icon: '🏆' },
            { label: 'FAQs',     n: content.faqs.items.length,         icon: '❓' },
            { label: 'Links',    n: content.links.items.length,        icon: '🔗' },
            { label: 'Uses',     n: content.uses.sections.reduce((a, s) => a + s.items.length, 0), icon: '🛠️' },
          ].map(stat => (
            <div key={stat.label} className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.n}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'content' && <AdminContentEditor />}

      {tab === 'messages' && (
        <DataList
          label="Contact Messages"
          items={messages}
          loading={loadingData}
          emptyText="No messages yet."
          renderItem={(msg) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-900 dark:text-white">{msg.name}</span>
                <span className="text-xs text-neutral-500">{msg.email}</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{msg.message}</p>
            </div>
          )}
          onDelete={(id) => deleteItem('messages', id, setMessages, messages)}
        />
      )}

      {tab === 'guestbook' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Guestbook Signatures</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Showing {guestEntries.length} total signatures ·{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {guestEntries.filter(e => e.approved).length} visible to public
                </span>
                {guestEntries.some(e => !e.approved) && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">
                    ({guestEntries.filter(e => !e.approved).length} hidden)
                  </span>
                )}
              </p>
            </div>
          </div>

          {loadingData ? <Spinner /> : guestEntries.length === 0 ? (
            <EmptyState text="No guestbook entries yet." />
          ) : (
            <div className="flex flex-col gap-4">
              {guestEntries.map(entry => (
                <div key={entry.id} className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-neutral-200 dark:ring-neutral-700" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0">
                          {(entry.name || 'G').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{entry.name || 'Anonymous'}</span>
                          {entry.approved ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold">Visible</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 font-semibold">Hidden</span>
                          )}
                          {entry.pinned && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 font-semibold">📌 Pinned</span>
                          )}
                          {entry.likedByAdmin && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-semibold">❤️ Liked</span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">UID: {entry.uid || entry.id}</p>
                      </div>
                    </div>

                    {/* Action buttons: Hide/Show, Pin/Unpin, Heart, Delete */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleGuestbookApproval(entry.id, entry.approved)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          entry.approved
                            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {entry.approved ? 'Hide' : 'Show'}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleGuestbookPinned(entry.id, entry.pinned)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          entry.pinned
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        {entry.pinned ? 'Unpin' : '📌 Pin'}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleGuestbookHeart(entry.id, entry.likedByAdmin)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          entry.likedByAdmin
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        {entry.likedByAdmin ? '💔 Unheart' : '❤️ Heart'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteGuestbookEntryWithConfirm(entry.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl break-words whitespace-pre-wrap">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <DataList
          label="Bookings"
          items={bookings}
          loading={loadingData}
          emptyText="No bookings yet."
          renderItem={(b) => (
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">{b.name} — {b.date} @ {b.time}</p>
              <p className="text-xs text-neutral-500">{b.email}</p>
              {b.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{b.message}</p>}
            </div>
          )}
          onDelete={(id) => deleteItem('bookings', id, setBookings, bookings)}
        />
      )}

      {tab === 'posts' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Blog Posts</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void importStarterPosts()}
                disabled={importingStarterPosts}
                className="min-h-10 rounded-xl border border-brand/40 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10 disabled:cursor-wait disabled:opacity-60"
              >
                {importingStarterPosts ? 'Importing...' : 'Import starter posts'}
              </button>
              <button
              onClick={async () => {
                if (!db) return
                const date = new Date().toISOString().slice(0, 10)
                const draft = {
                  title: 'New Post', slug: `new-post-${Date.now().toString(36)}`, excerpt: '', cover: '', content: '', published: false,
                  createdAt: new Date(), date, category: 'AI', tags: [], readTime: 1, featured: false,
                }
                const created = await addDoc(collection(db, 'posts'), draft)
                setEditingPost({ id: created.id, ...draft, tagsText: '' })
                setPostToast('')
                loadData('posts')
              }}
                className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
              >
                + New Post
              </button>
            </div>
          </div>
          {editingPost && (
            <form onSubmit={savePost} className="mb-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-neutral-500">Title
                  <input required value={editingPost.title ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, title: event.target.value }))} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-neutral-500">Slug
                  <input required value={editingPost.slug ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, slug: event.target.value }))} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-neutral-500">Category
                  <input value={editingPost.category ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, category: event.target.value }))} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-neutral-500">Date
                  <input type="date" value={editingPost.date ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, date: event.target.value }))} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-neutral-500 sm:col-span-2">Excerpt
                  <textarea value={editingPost.excerpt ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, excerpt: event.target.value }))} rows={2} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-neutral-500 sm:col-span-2">Tags (comma separated)
                  <input value={editingPost.tagsText ?? (Array.isArray(editingPost.tags) ? editingPost.tags.join(', ') : '')} onChange={event => setEditingPost((post: any) => ({ ...post, tagsText: event.target.value }))} placeholder="AI, React, Tutorials" className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
              </div>

              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <label className="block space-y-1 text-xs font-medium text-neutral-500">Cover image path or URL
                  <input value={editingPost.cover ?? ''} onChange={event => setEditingPost((post: any) => ({ ...post, cover: event.target.value }))} placeholder="/images/blog-cover.webp" className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-white" />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-neutral-300 px-4 text-xs font-semibold text-neutral-700 hover:border-brand dark:border-neutral-700 dark:text-neutral-200">
                    Upload cover
                    <input type="file" accept="image/*" className="sr-only" onChange={event => {
                      const file = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      if (!file) return
                      void saveBlogImage(file).then(reference => {
                        setEditingPost((post: any) => ({ ...post, cover: reference }))
                        setPostToast('Cover uploaded.')
                      }).catch(error => setPostToast(error instanceof Error ? error.message : 'Image upload failed.'))
                    }} />
                  </label>
                  <p className="text-xs text-neutral-500">Compressed and saved in Firestore media; no Storage bucket is used.</p>
                </div>
                {editingPost.cover && <BlogCoverPreview reference={editingPost.cover} />}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <input type="checkbox" checked={Boolean(editingPost.published)} onChange={event => setEditingPost((post: any) => ({ ...post, published: event.target.checked }))} className="h-4 w-4 accent-orange-500" />
                  Published
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <input type="checkbox" checked={Boolean(editingPost.featured)} onChange={event => setEditingPost((post: any) => ({ ...post, featured: event.target.checked }))} className="h-4 w-4 accent-orange-500" />
                  Featured
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <span>Estimated reading time: <strong>{estimateReadTime(editingPost.content ?? '')} min</strong> (computed from the Markdown content)</span>
                <span>HTML is displayed as text, not executed.</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <label htmlFor="blog-markdown-content" className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Post content (Markdown)</label>
                    <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-neutral-300 px-4 text-xs font-semibold text-neutral-700 hover:border-brand dark:border-neutral-700 dark:text-neutral-200">
                      Insert image
                      <input type="file" accept="image/*" className="sr-only" onChange={event => {
                        const file = event.currentTarget.files?.[0]
                        event.currentTarget.value = ''
                        void insertImageInMarkdown(file)
                      }} />
                    </label>
                  </div>
                  <textarea
                    id="blog-markdown-content"
                    ref={markdownInput}
                    required
                    value={editingPost.content ?? ''}
                    onChange={event => setEditingPost((post: any) => ({ ...post, content: event.target.value }))}
                    rows={24}
                    className="min-h-[460px] w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 font-mono text-sm leading-6 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-neutral-500">Supports headings, numbered and bulleted lists, quotes, fenced code, links, and images. Image syntax supports a caption: ![Alt](media:id "Caption").</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Live preview</p>
                  <div className="max-h-[540px] min-h-[460px] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
                    {editingPost.content ? <BlogMarkdown markdown={editingPost.content} /> : <p className="text-sm text-neutral-500">Markdown preview appears here as you write.</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <button type="submit" className="min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">Save post</button>
                <button type="button" onClick={() => setEditingPost(null)} className="min-h-11 rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">Cancel</button>
              </div>
            </form>
          )}
          {postToast && <p role="status" className={`mb-4 text-sm ${postToast.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{postToast}</p>}
          {loadingData ? <Spinner /> : posts.length === 0 ? (
            <EmptyState text="No blog posts yet. Click '+ New Post' to create one." />
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map(post => (
                <div key={post.id} className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{post.title}</p>
                    <p className="text-xs text-neutral-500">/blogs/{post.slug} · {post.published ? '✅ Published' : '📝 Draft'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingPost({
                        ...post,
                        date: blogDateInput(post.date, post.createdAt),
                        tagsText: Array.isArray(post.tags) ? post.tags.join(', ') : typeof post.tags === 'string' ? post.tags : '',
                        featured: Boolean(post.featured),
                      })
                      setPostToast('')
                    }} className="text-xs px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-200 transition-colors">Edit</button>
                    <button
                      onClick={async () => {
                        if (!db) return
                        await updateDoc(doc(db, 'posts', post.id), { published: !post.published })
                        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: !p.published } : p))
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-200 transition-colors"
                    >
                      {post.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => deleteItem('posts', post.id, setPosts, posts)} className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold hover:bg-red-200 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'export' && (
        <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-center">
          <span className="text-5xl mb-4 block">💾</span>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">JSON Export</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">Download all site content as a JSON backup.</p>
          <button onClick={exportJson} className="px-6 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
            Download content.json
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readImageData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the selected image.'))
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function compressBlogImage(file: File): Promise<{ data: string; type: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('That image could not be opened.')) }
    image.onload = async () => {
      URL.revokeObjectURL(objectUrl)
      let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
      while (scale > 0) {
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) { reject(new Error('Your browser could not process this image.')); return }
        context.drawImage(image, 0, 0, width, height)
        let blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/webp', 0.8))
        if (blob && blob.type !== 'image/webp') blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/jpeg', 0.8))
        if (!blob) { reject(new Error('Your browser could not compress this image.')); return }
        if (blob.size <= 250 * 1024) {
          const packed = new File([blob], file.name, { type: blob.type })
          resolve({ data: await readImageData(packed), type: blob.type })
          return
        }
        scale *= 0.82
      }
      reject(new Error('This image is too large after compression. Choose a smaller image.'))
    }
    image.src = objectUrl
  })
}

async function saveBlogImage(file: File): Promise<string> {
  if (!db) throw new Error('Firebase is not configured, so uploads are unavailable.')
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  const packed = await compressBlogImage(file)
  if (dataUrlSize(packed.data) > 250 * 1024) throw new Error('Choose an image smaller than 250 KB after compression.')
  const created = await addDoc(collection(db, 'media'), {
    name: file.name,
    type: packed.type,
    data: packed.data,
    createdAt: serverTimestamp(),
  })
  return `media:${created.id}`
}

function BlogCoverPreview({ reference }: { reference: string }) {
  const source = useResolvedMedia(reference, '')
  return source ? <img src={source} alt="Blog cover preview" loading="lazy" className="mt-4 max-h-56 max-w-full rounded-xl border border-neutral-200 object-contain dark:border-neutral-700" /> : null
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
      <span className="text-4xl mb-3">📭</span>
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  )
}

function DataList({ label, items, loading, emptyText, renderItem, onDelete }: {
  label: string
  items: any[]
  loading: boolean
  emptyText: string
  renderItem: (item: any) => React.ReactNode
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">{label}</h2>
      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-start justify-between gap-3">
              <div className="flex-1">{renderItem(item)}</div>
              <button onClick={() => onDelete(item.id)} className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold hover:bg-red-200 transition-colors shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!auth) { setChecking(false); return }
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u && u.email === ADMIN_EMAIL ? u : null)
      setChecking(false)
    })
    return unsub
  }, [])

  if (!isFirebaseConfigured) return <><PageMeta title="Admin" description="" path="/admin" noindex /><SetupGuide /></>
  if (checking) return <><PageMeta title="Admin" description="" path="/admin" noindex /><div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div></>
  if (!user) return <><PageMeta title="Admin" description="" path="/admin" noindex /><LoginForm onLogin={setUser} /></>
  return <><PageMeta title="Admin" description="" path="/admin" noindex /><AdminPanel user={user} /></>
}
