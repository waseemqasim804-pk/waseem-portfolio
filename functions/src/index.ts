import { createHash } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const db = getFirestore()
const REGION = 'asia-south1'
const TZ = 'Asia/Karachi'
const DEFAULT_AVAILABILITY = {
  timezone: TZ,
  slotMinutes: 30,
  days: [1, 2, 3, 4, 5],
  startHour: 10,
  endHour: 18,
  blockedDates: [] as string[],
}

type Availability = typeof DEFAULT_AVAILABILITY

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function requireEmail(value: unknown): string {
  const email = cleanText(value, 254)
  if (!validEmail(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  return email
}

function ipRateRef(ip: string, action: string) {
  const id = createHash('sha256').update(ip || 'unknown').digest('hex')
  return db.collection('rateLimits').doc(`${action}_${id}`)
}

function checkRateLimit(data: DocumentData | undefined, now: number, max: number, windowMs: number) {
  const started = data?.windowStartedAt instanceof Timestamp ? data.windowStartedAt.toMillis() : 0
  const count = Number(data?.count ?? 0)
  if (started > 0 && now - started < windowMs && count >= max) {
    throw new HttpsError('resource-exhausted', 'Too many submissions. Please try again later.')
  }
  return started > 0 && now - started < windowMs
    ? { windowStartedAt: Timestamp.fromMillis(started), count: count + 1 }
    : { windowStartedAt: Timestamp.fromMillis(now), count: 1 }
}

export const createContactMessage = onCall(
  { region: REGION, enforceAppCheck: true, maxInstances: 10 },
  async request => {
    const name = cleanText(request.data?.name, 100)
    const email = requireEmail(request.data?.email)
    const type = cleanText(request.data?.type, 120)
    const budget = cleanText(request.data?.budget, 120)
    const message = cleanText(request.data?.message, 5000)
    if (name.length < 2 || message.length < 10) {
      throw new HttpsError('invalid-argument', 'Name must be at least 2 characters and message at least 10 characters.')
    }
    if (request.data?.website) throw new HttpsError('invalid-argument', 'Unable to submit this message.')

    const contentSnapshot = await db.collection('content').doc('site').get()
    const contact = contentSnapshot.data()?.contact
    const allowedTypes: unknown[] | null = Array.isArray(contact?.types) ? contact.types : null
    const allowedBudgets: unknown[] | null = Array.isArray(contact?.budgets) ? contact.budgets : null
    if ((allowedTypes && type && !allowedTypes.includes(type)) || (allowedBudgets && budget && !allowedBudgets.includes(budget))) {
      throw new HttpsError('invalid-argument', 'Choose a valid project type and budget.')
    }

    const now = Date.now()
    const rateRef = ipRateRef(request.rawRequest.ip ?? '', 'contact')
    const messageRef = db.collection('messages').doc()
    await db.runTransaction(async transaction => {
      const rateSnapshot = await transaction.get(rateRef)
      const rate = checkRateLimit(rateSnapshot.data(), now, 5, 60 * 60 * 1000)
      transaction.set(rateRef, rate)
      transaction.create(messageRef, {
        name,
        email,
        type,
        budget,
        message,
        createdAt: FieldValue.serverTimestamp(),
      })
    })
    return { ok: true }
  },
)

export const createGuestbookEntry = onCall(
  { region: REGION, enforceAppCheck: true, maxInstances: 10 },
  async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in with Google before signing the guestbook.')
    const authProvider = (request.auth.token.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider
    if (authProvider !== 'google.com') throw new HttpsError('permission-denied', 'Sign in with Google before signing the guestbook.')

    const uid = request.auth.uid
    const rawMessage = request.data?.message
    const message = cleanText(rawMessage, 280)
    if (typeof rawMessage !== 'string' || rawMessage.trim().length < 1 || rawMessage.trim().length > 280) {
      throw new HttpsError('invalid-argument', 'Your note must be between 1 and 280 characters.')
    }
    const name = cleanText(request.auth.token.name, 80) || 'Anonymous'
    const picture = request.auth.token.picture
    const avatar = typeof picture === 'string' && picture.startsWith('https://') ? picture.slice(0, 500) : ''
    const entryRef = db.collection('guestbook').doc(uid)
    const uniquenessRef = db.collection('guestbookUsers').doc(uid)
    const existingQuery = db.collection('guestbook').where('uid', '==', uid).limit(1)

    await db.runTransaction(async transaction => {
      const [entrySnapshot, uniquenessSnapshot, existingSnapshot] = await Promise.all([
        transaction.get(entryRef), transaction.get(uniquenessRef), transaction.get(existingQuery),
      ])
      if (entrySnapshot.exists || uniquenessSnapshot.exists || !existingSnapshot.empty) {
        throw new HttpsError('already-exists', 'You have already signed the guestbook.')
      }
      transaction.create(entryRef, {
        uid,
        name,
        avatar,
        message,
        approved: false,
        pinned: false,
        likedByAdmin: false,
        createdAt: FieldValue.serverTimestamp(),
      })
      transaction.create(uniquenessRef, { uid, createdAt: FieldValue.serverTimestamp() })
    })
    return { ok: true }
  },
)

function readAvailability(data: DocumentData | undefined): Availability {
  const value = data ?? DEFAULT_AVAILABILITY
  const days = value.days
  const blockedDates = value.blockedDates
  if (
    value.timezone !== TZ ||
    !Number.isInteger(value.slotMinutes) || value.slotMinutes < 5 || value.slotMinutes > 120 ||
    !Number.isInteger(value.startHour) || value.startHour < 0 || value.startHour > 23 ||
    !Number.isInteger(value.endHour) || value.endHour < 1 || value.endHour > 24 || value.endHour <= value.startHour ||
    !Array.isArray(days) || days.some((day: unknown) => !Number.isInteger(day) || (day as number) < 0 || (day as number) > 6) ||
    !Array.isArray(blockedDates) || blockedDates.some((date: unknown) => typeof date !== 'string')
  ) {
    throw new HttpsError('failed-precondition', 'The booking schedule is not configured correctly.')
  }
  return { timezone: TZ, slotMinutes: value.slotMinutes, startHour: value.startHour, endHour: value.endHour, days, blockedDates }
}

function bookingStart(date: unknown, time: unknown, availability: Availability): Date {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    throw new HttpsError('invalid-argument', 'Choose a valid date and time.')
  }
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const dayDate = new Date(Date.UTC(year, month - 1, day, 12))
  if (dayDate.getUTCFullYear() !== year || dayDate.getUTCMonth() !== month - 1 || dayDate.getUTCDate() !== day) {
    throw new HttpsError('invalid-argument', 'Choose a valid calendar date.')
  }
  if (
    !availability.days.includes(dayDate.getUTCDay()) ||
    availability.blockedDates.includes(date) ||
    hour < availability.startHour || hour >= availability.endHour ||
    minute >= 60 || minute % availability.slotMinutes !== 0 ||
    hour * 60 + minute + availability.slotMinutes > availability.endHour * 60
  ) {
    throw new HttpsError('failed-precondition', 'That time is outside the current booking schedule.')
  }

  // Pakistan Standard Time is UTC+05:00 and does not observe daylight saving time.
  const start = new Date(Date.UTC(year, month - 1, day, hour - 5, minute))
  const now = Date.now()
  if (start.getTime() <= now || start.getTime() > now + 180 * 24 * 60 * 60 * 1000) {
    throw new HttpsError('failed-precondition', 'Choose a future date within the next 180 days.')
  }
  return start
}

function normalizeSlotTime(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim())
  if (!match) return ''
  let hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 1 || hour > 12 || minute > 59) return ''
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const createBooking = onCall(
  { region: REGION, enforceAppCheck: true, maxInstances: 10 },
  async request => {
    const name = cleanText(request.data?.name, 100)
    const email = requireEmail(request.data?.email)
    const message = cleanText(request.data?.message, 1000)
    if (name.length < 2) throw new HttpsError('invalid-argument', 'Enter your name.')

    const date = request.data?.date
    const time = request.data?.time
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      throw new HttpsError('invalid-argument', 'Choose a valid date and time.')
    }
    const slotId = `${date}_${String(time).replace(':', '-')}`
    const slotRef = db.collection('bookedSlots').doc(slotId)
    const bookingRef = db.collection('bookings').doc(slotId)
    const rateRef = ipRateRef(request.rawRequest.ip ?? '', 'booking')
    const configRef = db.collection('availability').doc('config')
    const existingDaySlots = db.collection('bookedSlots').where('date', '==', date)
    const existingDayBookings = db.collection('bookings').where('date', '==', date)
    const now = Date.now()

    await db.runTransaction(async transaction => {
      const [configSnapshot, slotSnapshot, bookingSnapshot, rateSnapshot, daySlotsSnapshot, dayBookingsSnapshot] = await Promise.all([
        transaction.get(configRef), transaction.get(slotRef), transaction.get(bookingRef), transaction.get(rateRef),
        transaction.get(existingDaySlots), transaction.get(existingDayBookings),
      ])
      const legacyDuplicate = daySlotsSnapshot.docs.some(slot => normalizeSlotTime(slot.data().time) === time)
        || dayBookingsSnapshot.docs.some(booking => normalizeSlotTime(booking.data().time) === time)
      if (slotSnapshot.exists || bookingSnapshot.exists || legacyDuplicate) {
        throw new HttpsError('already-exists', 'That time was just booked. Choose another slot.')
      }
      const availability = readAvailability(configSnapshot.data())
      const start = bookingStart(date, time, availability)
      const rate = checkRateLimit(rateSnapshot.data(), now, 5, 60 * 60 * 1000)
      transaction.set(rateRef, rate)
      transaction.create(slotRef, {
        date,
        time,
        startAt: Timestamp.fromDate(start),
        createdAt: FieldValue.serverTimestamp(),
      })
      transaction.create(bookingRef, {
        name,
        email,
        message,
        date,
        time,
        timezone: TZ,
        startAt: Timestamp.fromDate(start),
        createdAt: FieldValue.serverTimestamp(),
      })
    })
    return { ok: true }
  },
)
