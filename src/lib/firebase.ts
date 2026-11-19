// src/lib/firebase.ts
// Firebase is optional. If VITE_FIREBASE_* env vars are missing, the site works
// entirely from src/data/content.ts. Admin panel shows a setup guide instead.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getFunctions, type Functions } from 'firebase/functions'

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_APPCHECK_SITE_KEY,
} = import.meta.env

export const isFirebaseConfigured: boolean = !!(
  VITE_FIREBASE_API_KEY &&
  VITE_FIREBASE_AUTH_DOMAIN &&
  VITE_FIREBASE_PROJECT_ID &&
  VITE_FIREBASE_MESSAGING_SENDER_ID &&
  VITE_FIREBASE_APP_ID
)

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let appCheck: AppCheck | null = null
let functions: Functions | null = null
if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey:            VITE_FIREBASE_API_KEY,
    authDomain:        VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             VITE_FIREBASE_APP_ID,
  }
  app     = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  if (VITE_FIREBASE_APPCHECK_SITE_KEY) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(VITE_FIREBASE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }
  db      = getFirestore(app)
  auth    = getAuth(app)
  functions = getFunctions(app, 'asia-south1')
}

export { app, appCheck, db, auth, functions }
