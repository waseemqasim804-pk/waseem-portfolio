# Waseem Portfolio

The canonical application is this directory: React 18, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion, and Firebase. The legacy static/Node site in the parent directory remains separate and is not changed by these commands.

## Application structure

- `index.html` loads `src/main.tsx`, which mounts `src/App.tsx`.
- `src/App.tsx` owns the routes; `src/components/` contains shared layout and UI; `src/pages/` contains route pages.
- `src/data/content.ts` provides safe default site content. `src/hooks/useSiteContent.tsx` overlays the Firestore `content/site` document when configured.
- Firebase browser setup is in `src/lib/firebase.ts`. Callable backend handlers are in `functions/src/index.ts`; Firestore access is restricted by `firestore.rules`.

## Theme rules

- Use the semantic theme utilities `bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`, `text-accent`, `text-on-accent`, `text-surface-inverse`, and `text-inverse-foreground` for interface colors.
- Do not add fixed light/dark text, background, or border colors in pages and components. Put any intentional palette changes in `src/index.css` as theme variables.
- The saved theme is applied in `index.html` before first paint and then synchronized by `ThemeProvider`; use `useTheme()` for theme-dependent canvas or other non-CSS rendering.
- Keep body text at 4.5:1 contrast and large headings at 3:1 or better against their backgrounds. Muted copy must stay legible in both themes.
- `npm run build` checks source colors for regressions before generating the sitemap and production bundle. The guard allows the fixed dark-pill navbar, bundled brand artwork, and official Google sign-in marks.

## Development

Run commands from this directory, not the workspace parent:

```bash
npm install
```

Run either `npm start` or `npm run dev`; Vite prints the local development URL. To build and preview the production bundle:

```bash
npm run build
npm run preview
```

From this directory, both `npm start` and `npm run dev` start Vite. At the workspace parent, `npm start` still runs the legacy `server.js` site.

## Firebase setup

1. Create a Firebase project and a Web app in the Firebase Console.
2. Enable Firestore and Authentication. Enable Google sign-in for the guestbook and Email/Password for the admin account.
3. Configure Firebase App Check for the web app with a reCAPTCHA v3 provider. The contact, booking, and guestbook callable functions require valid App Check tokens.
4. Copy `.env.example` to `.env` in this directory and fill in the Web app configuration, App Check site key, and production site URL. These `VITE_` values are public client configuration, not server credentials. Do not put service account keys in the frontend environment.
5. Replace `YOUR-PROJECT-ID` in `.firebaserc` with the Firebase project ID. Do not commit personal credentials or private keys.
6. Create the admin Firebase Auth user matching `VITE_ADMIN_EMAIL` and deploy the rules, indexes, and functions before enabling the production site.
7. The contact, booking, and guestbook callable functions require App Check. Enable Firestore App Check enforcement in Firebase Console after confirming the deployed web app receives valid tokens.
8. Sign in to `/admin` and save the Home section once. This writes the editable availability schedule used by the booking function; the function uses the source defaults until that document exists.

Required environment variables are documented in `.env.example`. Firebase credentials and the reCAPTCHA site key were not supplied in this workspace, so Firebase services cannot be connected until you provide values from your own Firebase project.

## Deployment

Install and authenticate the Firebase CLI once, then run from `portfolio-v2/`:

```bash
npm run deploy:rules
npm run functions:install
npm run deploy:backend
npm run deploy:hosting
```

`deploy:rules` publishes Firestore rules and indexes. `deploy:backend` deploys callable functions. `deploy:hosting` builds the React app and deploys Hosting. `npm run deploy` builds and deploys the configured Firebase resources together.

For further Firebase Console setup details, see [DEPLOY.md](DEPLOY.md).

## Vercel Deployment

This is a React + TypeScript single-page application built with Vite. To deploy it on Vercel:

1. Push this project to a new GitHub repository using the commands below, then sign in to Vercel and choose **Add New... > Project**.
2. Import the GitHub repository. Vercel should detect Vite; set the Framework Preset to **Vite** if it does not.
3. Use these build settings: Install Command `npm install`, Build Command `npm run build`, Output Directory `dist`.
4. In the Vercel project settings, add the Firebase `VITE_` values from `.env.example`. Do not add Firebase service-account secrets to the browser environment. The canonical domain is configured in `src/config/siteConfig.json`.
5. Deploy. Open **Settings > Domains**, add your domain, and follow Vercel's DNS instructions at your domain provider.

To initialize this folder and create its first commit, then push to a new GitHub repository (replace the GitHub placeholders):

```bash
git init
git add .
git -c user.name="Waseem Qasim" -c user.email="waseemqasim804@gmail.com" commit -m "Initial portfolio commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## After Deploy

1. Add the deployed site to [Google Search Console](https://search.google.com/search-console/). Verify the domain (DNS verification is recommended for a custom domain).
2. In Search Console, open **Sitemaps** and submit `https://waseemqasim.vercel.app/sitemap.xml`.
3. Use **URL Inspection** for `https://waseemqasim.vercel.app/`, `/about`, and `/projects`, then select **Request indexing**.
4. Validate the homepage with Google's [Rich Results Test](https://search.google.com/test/rich-results).

Search indexing is controlled by Google and is not guaranteed by metadata alone. Keep the site publicly accessible and replace the domain placeholder before submitting.

## SEO Values To Supply

- Canonical site URL: edit `siteUrl` in `src/config/siteConfig.json`; the sitemap, robots file, static HTML, and route metadata all use that value.
- `YOUR_GITHUB_USERNAME` and `YOUR_REPOSITORY`: replace these in the Git remote command above with the account and repository you create.
- Profile image: `public/images/muhammad-waseem-qasim.jpg` is used for the Person schema. Update `profileImage` in `src/config/siteConfig.json` if you replace it.
