# Deploying the React portfolio

All commands in this guide run from `portfolio-v2/`. The root `npm start` command belongs to the separate legacy site.

## Configure Firebase

Create a Firebase project, register a web app, enable Firestore, and enable Email/Password and Google sign-in in Authentication. Set up Firebase App Check for the web app using reCAPTCHA v3.

Copy `.env.example` to `.env` and set the Firebase Web app values, `VITE_FIREBASE_APPCHECK_SITE_KEY`, and `VITE_ADMIN_EMAIL`. These are public browser configuration values. Never put a Firebase service account key in `VITE_*` variables or in the frontend.

The canonical URL is configured once in `src/config/siteConfig.json`. Route metadata, static HTML metadata, `robots.txt`, and the sitemap use that value. When moving to a custom domain, change `siteUrl` there and add the domain in Vercel. After the custom domain is active, a Vercel redirect with `permanent: true` returns HTTP 308; match the old hostname and use `https://YOUR_CUSTOM_DOMAIN/:path*` as its destination.

Set the Firebase Hosting project ID in `.firebaserc`. Create the admin user specified by `VITE_ADMIN_EMAIL` in Firebase Authentication. The admin email in `firestore.rules` must match that account.

The contact, booking, and guestbook callable functions enforce App Check. Contact and booking functions apply server-side validation and per-IP rate limits. Guestbook submissions require Google sign-in; the function checks existing legacy entries and atomically permits one entry per Firebase UID. Firestore rules deny direct client writes to these server-managed records. After deploying, verify App Check tokens work and enable Firestore App Check enforcement in Firebase Console.

## Deploy

Install the Firebase CLI and log in if needed. Then run:

```bash
npm install
npm run deploy:rules
npm run functions:install
npm run deploy:backend
npm run deploy:hosting
```

- `npm run deploy:rules` deploys `firestore.rules` and `firestore.indexes.json`.
- `npm run deploy:backend` builds and deploys the callable functions.
- `npm run deploy:hosting` builds with Vite and deploys the React app.
- `npm run deploy` builds and deploys all resources configured in `firebase.json`.

Firebase credentials and the App Check site key are intentionally absent from this repository. Supply values from the Firebase Console before deploying. The existing legacy app and its root-level data files are left intact.
