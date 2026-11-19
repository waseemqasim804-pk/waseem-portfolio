// src/components/GlobeCanvas.tsx
// Rotating dotted globe with a Lahore marker — pure Canvas, no deps.
// Lazy-loaded via React.lazy() on Home. Respects prefers-reduced-motion.

import { useEffect, useRef } from 'react'

const LAHORE_LAT = 31.5497
const LAHORE_LNG = 74.3436
const DOT_COUNT = 800
const DOT_RADIUS = 1.2
const MARKER_RADIUS = 4

interface Point { lat: number; lng: number }

function randomSpherePoints(count: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < count; i++) {
    const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI)
    const lng = Math.random() * 360 - 180
    pts.push({ lat, lng })
  }
  return pts
}

function project(lat: number, lng: number, rotation: number, cx: number, cy: number, r: number) {
  const phi = (lat * Math.PI) / 180
  const lambda = ((lng + rotation) * Math.PI) / 180
  const x = cx + r * Math.cos(phi) * Math.sin(lambda)
  const y = cy - r * Math.sin(phi)
  const z = Math.cos(phi) * Math.cos(lambda)
  return { x, y, z }
}

export default function GlobeCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ptsRef = useRef(randomSpherePoints(DOT_COUNT))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let rotation = -LAHORE_LNG // start facing Lahore
    let raf = 0
    let isVisible = false

    function draw() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) / 2 - 8

      ctx!.clearRect(0, 0, w, h)

      // Dots
      for (const pt of ptsRef.current) {
        const { x, y, z } = project(pt.lat, pt.lng, rotation, cx, cy, r)
        if (z < 0) continue
        const alpha = 0.15 + z * 0.45
        ctx!.beginPath()
        ctx!.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(249,115,22,${alpha})`
        ctx!.fill()
      }

      // Lahore marker
      const lh = project(LAHORE_LAT, LAHORE_LNG, rotation, cx, cy, r)
      if (lh.z > 0) {
        ctx!.beginPath()
        ctx!.arc(lh.x, lh.y, MARKER_RADIUS, 0, Math.PI * 2)
        ctx!.fillStyle = '#f97316'
        ctx!.fill()
        ctx!.beginPath()
        ctx!.arc(lh.x, lh.y, MARKER_RADIUS + 4, 0, Math.PI * 2)
        ctx!.strokeStyle = 'rgba(249,115,22,0.4)'
        ctx!.lineWidth = 1.5
        ctx!.stroke()
      }

      if (!prefersReduced && isVisible) {
        rotation += 0.15
        raf = requestAnimationFrame(draw)
      }
    }

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
        const visible = entries.some(entry => entry.isIntersecting)
        if (visible === isVisible) return
        isVisible = visible
        if (visible) draw()
        else cancelAnimationFrame(raf)
      }, { threshold: 0.01 })
      : null

    if (observer) observer.observe(canvas)
    else { isVisible = true; draw() }

    return () => {
      observer?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%' }} />
}
