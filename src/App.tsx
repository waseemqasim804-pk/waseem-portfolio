// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import { SiteContentProvider } from './hooks/useSiteContent'

// Pages
import Home from './pages/Home'
import About from './pages/About'
import Work from './pages/Work'
import Services from './pages/Services'
import Awards from './pages/Awards'
import Contact from './pages/Contact'
import Links from './pages/Links'
import Uses from './pages/Uses'
import FAQs from './pages/FAQs'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Blogs from './pages/Blogs'
import BlogPost from './pages/BlogPost'
import Guestbook from './pages/Guestbook'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import BlinkTuner from './pages/BlinkTuner'

export default function App() {
  return (
    <ThemeProvider>
      <SiteContentProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/work" element={<Work />} />
            <Route path="/work/:slug" element={<Work />} />
            <Route path="/services" element={<Services />} />
            <Route path="/awards" element={<Awards />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/links" element={<Links />} />
            <Route path="/uses" element={<Uses />} />
            <Route path="/faqs" element={<FAQs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blog" element={<Blogs />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />
            <Route path="/resume" element={<Navigate to="/about#experience" replace />} />
            <Route path="/guestbook" element={<Guestbook />} />
            <Route path="/book" element={<Contact />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/blink-tuner" element={<BlinkTuner />} />
            <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SiteContentProvider>
    </ThemeProvider>
  )
}
