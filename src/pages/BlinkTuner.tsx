// src/pages/BlinkTuner.tsx
// Hidden developer page at /blink-tuner.
// Use sliders to position the SVG eyelids precisely over your eyes in the photo,
// then click "Copy config" and paste the values into src/data/content.ts → blinkPhoto.
import { useState, useCallback } from 'react'
import { useSiteContent } from '../hooks/useSiteContent'
import BlinkingPhoto from '../components/BlinkingPhoto'

type EyePos = { x: number; y: number }

interface Config {
  leftEye: EyePos
  rightEye: EyePos
  eyeWidth: number
  eyeHeight: number
  skinColor: string
  minDelay: number
  maxDelay: number
  blinkMs: number
  doubleBlink: boolean
}

function Slider({
  label, value, min, max, step = 0.5,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <span>{label}</span>
        <span className="font-mono text-brand">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="accent-orange-500 w-full"
      />
    </label>
  )
}

export default function BlinkTuner() {
  const content = useSiteContent()
  const bp = content.blinkPhoto
  const [cfg, setCfg] = useState<Config>({
    leftEye:   { ...bp.leftEye },
    rightEye:  { ...bp.rightEye },
    eyeWidth:  bp.eyeWidth,
    eyeHeight: bp.eyeHeight,
    skinColor: bp.skinColor,
    minDelay:  bp.minDelay,
    maxDelay:  bp.maxDelay,
    blinkMs:   bp.blinkMs,
    doubleBlink: bp.doubleBlink,
  })

  const [copied, setCopied] = useState(false)

  // Temporarily patch the content singleton so BlinkingPhoto re-renders with
  // the tuner values. We cast to get write access; this is dev-only.
  const patch = useCallback((next: Config) => {
    setCfg(next)
    const bp = (content as { blinkPhoto: Config }).blinkPhoto
    bp.leftEye   = next.leftEye
    bp.rightEye  = next.rightEye
    bp.eyeWidth  = next.eyeWidth
    bp.eyeHeight = next.eyeHeight
    bp.skinColor = next.skinColor
    bp.minDelay  = next.minDelay
    bp.maxDelay  = next.maxDelay
    bp.blinkMs   = next.blinkMs
    bp.doubleBlink = next.doubleBlink
  }, [content])

  const set = (key: keyof Config, value: unknown) =>
    patch({ ...cfg, [key]: value })

  const setEye = (side: 'leftEye' | 'rightEye', axis: 'x' | 'y', v: number) =>
    patch({ ...cfg, [side]: { ...cfg[side], [axis]: v } })

  const configSnippet = `  blinkPhoto: {
    leftEye:   { x: ${cfg.leftEye.x}, y: ${cfg.leftEye.y} },
    rightEye:  { x: ${cfg.rightEye.x}, y: ${cfg.rightEye.y} },
    eyeWidth:  ${cfg.eyeWidth},
    eyeHeight: ${cfg.eyeHeight},
    skinColor: '${cfg.skinColor}',
    minDelay:  ${cfg.minDelay},
    maxDelay:  ${cfg.maxDelay},
    blinkMs:   ${cfg.blinkMs},
    doubleBlink: ${cfg.doubleBlink},
  },`

  const copyConfig = () => {
    navigator.clipboard.writeText(configSnippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-brand mb-2">
          Developer tool
        </p>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Blink Tuner
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Adjust sliders until the eyelids sit perfectly over your eyes in the photo.
          Then click <strong>Copy config</strong> and paste into{' '}
          <code className="text-brand text-xs">src/data/content.ts → blinkPhoto</code>.
          <br />
          <span className="text-xs opacity-60">
            Note: Mode B (SVG eyelids) only activates when <code>me-open.jpg</code>{' '}
            exists but <code>me-closed.jpg</code> does not.
          </span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Live preview */}
        <div className="flex flex-col items-center gap-6">
          <BlinkingPhoto size="w-64 h-64" alt="Blink preview" />
          <p className="text-xs text-neutral-500">Live preview — blinks automatically</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5">
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Left eye position (%)</p>
            <div className="flex flex-col gap-3">
              <Slider label="X (left→right)" value={cfg.leftEye.x} min={0} max={100} onChange={v => setEye('leftEye', 'x', v)} />
              <Slider label="Y (top→bottom)" value={cfg.leftEye.y} min={0} max={100} onChange={v => setEye('leftEye', 'y', v)} />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Right eye position (%)</p>
            <div className="flex flex-col gap-3">
              <Slider label="X (left→right)" value={cfg.rightEye.x} min={0} max={100} onChange={v => setEye('rightEye', 'x', v)} />
              <Slider label="Y (top→bottom)" value={cfg.rightEye.y} min={0} max={100} onChange={v => setEye('rightEye', 'y', v)} />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Eyelid size (%)</p>
            <div className="flex flex-col gap-3">
              <Slider label="Width"  value={cfg.eyeWidth}  min={2} max={30} onChange={v => set('eyeWidth', v)} />
              <Slider label="Height" value={cfg.eyeHeight} min={1} max={20} onChange={v => set('eyeHeight', v)} />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Skin color</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cfg.skinColor}
                onChange={e => set('skinColor', e.target.value)}
                className="h-9 w-16 rounded cursor-pointer border border-neutral-300 dark:border-neutral-700"
              />
              <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">{cfg.skinColor}</span>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Timing</p>
            <div className="flex flex-col gap-3">
              <Slider label="Min delay (ms)" value={cfg.minDelay} min={500}  max={8000} step={100} onChange={v => set('minDelay', v)} />
              <Slider label="Max delay (ms)" value={cfg.maxDelay} min={1000} max={12000} step={100} onChange={v => set('maxDelay', v)} />
              <Slider label="Blink ms"       value={cfg.blinkMs}  min={50}   max={400}  step={10}  onChange={v => set('blinkMs', v)} />
            </div>
          </section>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cfg.doubleBlink}
              onChange={e => set('doubleBlink', e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Double blink (~25 % chance)</span>
          </label>

          {/* Config output */}
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">Generated config</p>
            <pre className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 overflow-x-auto text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {configSnippet}
            </pre>
            <button
              onClick={copyConfig}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy config'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

