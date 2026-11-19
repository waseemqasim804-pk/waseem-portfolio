import { useState, useMemo, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { motion } from 'framer-motion'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, functions, isFirebaseConfigured } from '../lib/firebase'
import { useSiteContent, type SiteContent } from '../hooks/useSiteContent'
import { useResolvedMedia } from '../hooks/useMedia'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TIME_ZONE = 'Asia/Karachi'

function dateInTimezone(timeZone = TIME_ZONE, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function dateAtUtcNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function addCalendarDays(date: string, count: number): string {
  const value = dateAtUtcNoon(date)
  value.setUTCDate(value.getUTCDate() + count)
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
}

function formatTime(hour: number, minute: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function to24Hour(time: string): string {
  const [clock, suffix] = time.split(' ')
  let [hour, minute] = clock.split(':').map(Number)
  if (suffix === 'PM' && hour !== 12) hour += 12
  if (suffix === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeStoredTime(time: string): string {
  return /\s(?:AM|PM)$/i.test(time) ? to24Hour(time) : time
}

function generateSlots(availability: SiteContent['availability']): string[] {
  const slots: string[] = []
  if (availability.slotMinutes < 1 || availability.slotMinutes > 120) return slots
  for (let hour = availability.startHour; hour < availability.endHour; hour++) {
    for (let minute = 0; minute < 60; minute += availability.slotMinutes) {
      if (hour * 60 + minute + availability.slotMinutes <= availability.endHour * 60) {
        slots.push(formatTime(hour, minute))
      }
    }
  }
  return slots
}

function slotUtc(date: string, time: string, timeZone = TIME_ZONE): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = to24Hour(time).split(':').map(Number)
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  let guess = wanted
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = formatter.formatToParts(new Date(guess))
    const part = (type: string) => Number(parts.find(item => item.type === type)?.value ?? 0)
    const displayed = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'))
    const difference = displayed - wanted
    if (!difference) break
    guess -= difference
  }
  return new Date(guess)
}

function formatSlotInTimezone(date: string, time: string, sourceTimeZone: string, targetTimeZone: string, use24Hour: boolean) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimeZone,
    hour: use24Hour ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: use24Hour ? 'h23' : 'h12',
  }).format(slotUtc(date, time, sourceTimeZone))
}

const COUNTRY_LOCATIONS = {
  Pakistan: [
    { city: 'Karachi', timeZone: 'Asia/Karachi' },
    { city: 'Lahore', timeZone: 'Asia/Karachi' },
    { city: 'Islamabad', timeZone: 'Asia/Karachi' },
  ],
  'United States': [
    { city: 'New York', timeZone: 'America/New_York' },
    { city: 'Chicago', timeZone: 'America/Chicago' },
    { city: 'Denver', timeZone: 'America/Denver' },
    { city: 'Los Angeles', timeZone: 'America/Los_Angeles' },
  ],
  'United Kingdom': [{ city: 'London', timeZone: 'Europe/London' }],
  'United Arab Emirates': [{ city: 'Dubai', timeZone: 'Asia/Dubai' }],
  India: [{ city: 'Kolkata', timeZone: 'Asia/Kolkata' }],
  Australia: [{ city: 'Sydney', timeZone: 'Australia/Sydney' }],
} as const

type Country = keyof typeof COUNTRY_LOCATIONS
const COUNTRY_NAMES = Object.keys(COUNTRY_LOCATIONS) as Country[]
const glass = 'rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-md'

function utcCalendarValue(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function icsContent(name: string, email: string, date: string, time: string, durationMinutes: number, timeZone = TIME_ZONE) {
  const start = slotUtc(date, time, timeZone)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Muhammad Waseem Qasim//Booking//EN', 'BEGIN:VEVENT',
    'SUMMARY:Call with Muhammad Waseem Qasim', `DTSTART:${utcCalendarValue(start)}`, `DTEND:${utcCalendarValue(end)}`,
    `DESCRIPTION:${escapeIcs(`Booked by ${name} (${email})`)}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

export function BookingPanel() {
  const { availability, home, contact } = useSiteContent()
  const photo = useResolvedMedia(home.photo)
  const sourceTimeZone = availability.timezone || TIME_ZONE
  const today = dateInTimezone(sourceTimeZone)
  const [country, setCountry] = useState<string>(availability.defaultCountry || 'Pakistan')
  const [city, setCity] = useState<string>(availability.defaultCity || 'Karachi')
  const [use24Hour, setUse24Hour] = useState(false)
  const [viewYear, setViewYear] = useState(Number(today.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(Number(today.slice(5, 7)) - 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [step, setStep] = useState<'calendar' | 'time' | 'form' | 'done' | 'error'>('calendar')
  const [submitting, setSubmitting] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  useEffect(() => {
    setCountry(availability.defaultCountry || 'Pakistan')
    setCity(availability.defaultCity || 'Karachi')
  }, [availability.defaultCountry, availability.defaultCity])

  const selectedCountry = COUNTRY_LOCATIONS[country as Country] ? country as Country : 'Pakistan'
  const countryCities = COUNTRY_LOCATIONS[selectedCountry]
  const selectedCity = countryCities.find(location => location.city === city) ?? countryCities[0]
  const selectedTimeZone = selectedCity?.timeZone ?? sourceTimeZone
  const selectClass = 'mt-1 w-full rounded-xl border border-neutral-200 bg-white/70 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-950/60 dark:text-neutral-100'

  const slots = useMemo(() => generateSlots(availability), [availability])
  const calDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1, 12))
    const startDay = firstDay.getUTCDay()
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12)).getUTCDate()
    const cells: (string | null)[] = Array.from({ length: startDay }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
    return cells
  }, [viewYear, viewMonth])

  const isAvailableDate = (date: string) => {
    const value = dateAtUtcNoon(date)
    return date >= today &&
      date <= addCalendarDays(today, 180) &&
      availability.days.some(day => day === value.getUTCDay()) &&
      !availability.blockedDates.includes(date)
  }

  const isFutureSlot = (date: string, time: string) => slotUtc(date, time, sourceTimeZone).getTime() > Date.now()

  const goPreviousMonth = () => {
    if (viewMonth === 0) { setViewYear(year => year - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewYear(year => year + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const handleDayClick = async (date: string) => {
    if (!isAvailableDate(date) || !db) return
    setSelectedDate(date)
    setSelectedTime(null)
    setErrorMsg('')
    setLoadingSlots(true)
    try {
      const snapshot = await getDocs(query(collection(db, 'bookedSlots'), where('date', '==', date)))
      setBookedSlots(snapshot.docs.map(item => normalizeStoredTime(String(item.data().time))))
      setStep('time')
    } catch {
      setErrorMsg('Available times could not be loaded. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    if (!selectedDate || bookedSlots.includes(to24Hour(time)) || !isFutureSlot(selectedDate, time)) return
    setSelectedTime(time)
    setErrorMsg('')
    setStep('form')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedDate || !selectedTime || !functions) {
      setErrorMsg('Booking is unavailable until Firebase and secure form verification are configured.')
      return
    }
    const name = form.name.trim()
    const email = form.email.trim()
    const message = form.message.trim()
    if (name.length < 2 || name.length > 100) { setErrorMsg('Enter a name between 2 and 100 characters.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { setErrorMsg('Enter a valid email address.'); return }
    if (message.length > 1000) { setErrorMsg('Keep your note under 1,000 characters.'); return }
    if (!isAvailableDate(selectedDate) || !slots.includes(selectedTime) || !isFutureSlot(selectedDate, selectedTime)) {
      setErrorMsg('That date or time is no longer available. Choose another slot.')
      setStep('calendar')
      return
    }

    setSubmitting(true)
    setErrorMsg('')
    try {
      const createBooking = httpsCallable(functions, 'createBooking')
      await createBooking({ date: selectedDate, time: to24Hour(selectedTime), name, email, message })
      setStep('done')
    } catch (cause) {
      const code = typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : ''
      setErrorMsg(code.includes('already-exists')
        ? 'That time was just booked. Please choose another slot.'
        : code.includes('resource-exhausted')
          ? 'Too many booking attempts. Please wait before trying again.'
          : code.includes('failed-precondition') || code.includes('unauthenticated')
            ? 'Secure booking is not ready or that time is no longer available. Please choose another slot or contact me.'
            : 'Your booking could not be saved. Please try again or contact me directly.')
    } finally {
      setSubmitting(false)
    }
  }

  const googleCalLink = () => {
    if (!selectedDate || !selectedTime) return '#'
    const start = slotUtc(selectedDate, selectedTime, sourceTimeZone)
    const end = new Date(start.getTime() + availability.slotMinutes * 60_000)
    const dates = `${utcCalendarValue(start)}/${utcCalendarValue(end)}`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Call+with+Muhammad+Waseem+Qasim&dates=${dates}&ctz=${encodeURIComponent(sourceTimeZone)}`
  }

  const downloadIcs = () => {
    if (!selectedDate || !selectedTime) return
    const blob = new Blob([icsContent(form.name, form.email, selectedDate, selectedTime, availability.slotMinutes, sourceTimeZone)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'call-waseem.ics'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }).format(dateAtUtcNoon(selectedDate))
    : ''
  const selectedLocalTime = selectedDate && selectedTime
    ? formatSlotInTimezone(selectedDate, selectedTime, sourceTimeZone, selectedTimeZone, use24Hour)
    : ''

  return (
    <div>
      {!isFirebaseConfigured && (
        <div className={glass + ' mb-4 rounded-xl border-dashed p-4 text-center'}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Booking unavailable — Firebase is not configured.</p>
        </div>
      )}

      <div className={glass + ' grid overflow-hidden md:grid-cols-[minmax(220px,0.85fr)_minmax(250px,1fr)_minmax(260px,1fr)]'}>
        <section className="border-b border-neutral-200/80 p-5 dark:border-neutral-800/80 sm:p-6 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center gap-3">
            {photo ? (
              <img src={photo} alt={contact.meetingName} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand">WQ</span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{contact.meetingName}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{contact.meetingTitle}</p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{contact.meetingTitle}</h2>
          <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="flex items-center gap-2"><BookingIcon type="clock" />{availability.slotMinutes}m</p>
            <p className="flex items-center gap-2"><BookingIcon type="video" />Online call</p>
          </div>
          <div className="mt-8 space-y-4">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Select country
              <select value={selectedCountry} onChange={event => {
                const nextCountry = event.target.value as Country
                setCountry(nextCountry)
                setCity(COUNTRY_LOCATIONS[nextCountry][0].city)
              }} className={selectClass}>
                {COUNTRY_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Select city
              <select value={selectedCity?.city ?? ''} onChange={event => setCity(event.target.value)} className={selectClass}>
                {countryCities.map(location => <option key={location.city} value={location.city}>{location.city}</option>)}
              </select>
            </label>
            <p className="text-xs text-neutral-500">{selectedTimeZone}</p>
          </div>
        </section>

        <section className="border-b border-neutral-200/80 p-5 dark:border-neutral-800/80 sm:p-6 md:border-b-0 md:border-r">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={goPreviousMonth} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
              <button type="button" aria-label="Next month" onClick={goNextMonth} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10.586 13.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAY_NAMES.map(day => <div key={day} className="py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-neutral-400">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((date, index) => {
              if (!date) return <div key={'empty-' + index} />
              const available = isAvailableDate(date)
              const isToday = date === today
              const selected = selectedDate === date
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => void handleDayClick(date)}
                  disabled={!available || loadingSlots || !isFirebaseConfigured}
                  aria-pressed={selected}
                  aria-label={new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', dateStyle: 'full' }).format(dateAtUtcNoon(date))}
                  className={'relative aspect-square rounded-xl text-sm font-medium transition-colors ' + (selected
                    ? 'bg-brand text-neutral-50 shadow-md shadow-brand/25'
                    : available
                      ? 'text-neutral-800 hover:bg-brand/10 hover:text-brand dark:text-neutral-200'
                      : 'cursor-not-allowed text-neutral-300 dark:text-neutral-700')}
                >
                  {Number(date.slice(-2))}
                  {isToday && <span aria-hidden="true" className={'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ' + (selected ? 'bg-neutral-50' : 'bg-brand')} />}
                </button>
              )
            })}
          </div>
          {loadingSlots && <p className="mt-4 text-center text-xs text-neutral-500" role="status">Loading available times…</p>}
        </section>

        <section className="min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedDateLabel || 'Choose a day'}</h2>
            <div className="inline-flex rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700" aria-label="Time format">
              <button type="button" aria-pressed={!use24Hour} onClick={() => setUse24Hour(false)} className={'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ' + (!use24Hour ? 'bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500')}>12h</button>
              <button type="button" aria-pressed={use24Hour} onClick={() => setUse24Hour(true)} className={'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ' + (use24Hour ? 'bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500')}>24h</button>
            </div>
          </div>
          {selectedDate ? (
            <div className="max-h-64 overflow-y-auto pr-1">
              {loadingSlots ? (
                <p className="py-6 text-center text-sm text-neutral-500" role="status">Loading available times…</p>
              ) : slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">No available times.</p>
              ) : slots.map(slot => {
                const reserved = bookedSlots.includes(to24Hour(slot)) || !isFutureSlot(selectedDate, slot)
                const selected = selectedTime === slot
                const displayTime = formatSlotInTimezone(selectedDate, slot, sourceTimeZone, selectedTimeZone, use24Hour)
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => handleTimeSelect(slot)}
                    disabled={reserved || loadingSlots}
                    aria-pressed={selected}
                    className={'flex w-full items-center justify-between border-b border-neutral-200/80 px-2 py-3 text-left text-sm transition-colors dark:border-neutral-800/80 ' + (selected
                      ? 'rounded-lg border-transparent bg-brand px-3 font-semibold text-neutral-50'
                      : reserved
                        ? 'cursor-not-allowed text-neutral-300 line-through dark:text-neutral-700'
                        : 'text-neutral-700 hover:bg-brand/5 hover:text-brand dark:text-neutral-300')}
                  >
                    <span>{displayTime}</span>
                    {selected && <span className="text-[10px] uppercase tracking-wider">Selected</span>}
                    {reserved && !selected && <span className="text-[10px] no-underline">Unavailable</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-neutral-100/70 px-4 py-8 text-center text-sm text-neutral-500 dark:bg-neutral-950/40">Select a date to see available times.</p>
          )}

          {step === 'form' && selectedTime && (
            <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex flex-col gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Your details</h3>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Name
                <input type="text" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className={selectClass + ' mt-1'} />
              </label>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Email
                <input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className={selectClass + ' mt-1'} />
              </label>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Note (optional)
                <textarea rows={3} maxLength={1000} value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} className={selectClass + ' mt-1 resize-none'} />
              </label>
              {errorMsg && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{errorMsg}</p>}
              <button type="submit" disabled={submitting || !isFirebaseConfigured} className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-neutral-50 transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Booking…' : 'Confirm — ' + selectedLocalTime}</button>
            </motion.form>
          )}

          {step === 'done' && selectedDate && selectedTime && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
              <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">You're booked!</h3>
              <p className="mb-5 text-sm text-neutral-600 dark:text-neutral-400">{selectedDateLabel} at {selectedLocalTime} · {selectedTimeZone}</p>
              <div className="flex flex-col gap-2">
                <a href={googleCalLink()} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:bg-brand-dark">Add to Google Calendar</a>
                <button type="button" onClick={downloadIcs} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand hover:text-brand dark:border-neutral-700 dark:text-neutral-300">Download .ics</button>
              </div>
            </motion.div>
          )}
          {errorMsg && step !== 'form' && <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">{errorMsg}</p>}
        </section>
      </div>
    </div>
  )
}

function BookingIcon({ type }: { type: 'clock' | 'video' }) {
  if (type === 'clock') return <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  return <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
}

export default function BookACall() {
  return <BookingPanel />
}
