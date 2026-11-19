const fs = require('fs'), path = require('path');
const rd = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const say = (ok, msg) => console.log((ok ? 'OK      ' : 'PROBLEM ') + msg);
const files = walk('src').filter(f => /\.(tsx?|css)$/.test(f));
const code = files.map(f => [f, rd(f)]);
const exists = p => fs.existsSync(p) && fs.statSync(p).isFile();

// 1. App.tsx imports
let bad = [];
for (const m of (rd('src/App.tsx') || '').matchAll(/from '(\.[^']+)'/g)) {
  const p = path.join('src', m[1]);
  if (!['.tsx', '.ts', '/index.tsx', ''].some(x => exists(p + x))) bad.push(m[1]);
}
say(!bad.length, 'App.tsx imports exist' + (bad.length ? ' | MISSING: ' + bad.join(', ') : ''));

// 2. Storage leftovers
const fj = rd('firebase.json') || '', pj = JSON.parse(rd('package.json') || '{}'), fb = rd('src/lib/firebase.ts') || '';
say(!/"storage"/.test(fj), 'firebase.json has no storage block');
say(!/storage/i.test(JSON.stringify(pj.scripts || {})), 'package.json scripts do not use storage');
say(!/VITE_FIREBASE_STORAGE_BUCKET\s*&&/.test(fb), 'isFirebaseConfigured does not require the storage bucket');
const st = code.filter(([f, s]) => /firebase\/storage/.test(s)).map(([f]) => f);
say(st.length === 0, 'no code imports firebase/storage' + (st.length ? ' | USED IN: ' + st.join(', ') : ''));

// 3. Placeholders
const ph = [];
for (const f of ['index.html', '.firebaserc', 'public/robots.txt', ...(fs.existsSync('scripts') ? walk('scripts') : []), ...code.map(c => c[0])]) {
  const s = rd(f) || '';
  if (/YOUR-PROJECT-ID/.test(s)) ph.push(f + ' (YOUR-PROJECT-ID)');
  if (/lorem ipsum/i.test(s)) ph.push(f + ' (lorem ipsum)');
}
say(!ph.length, 'no placeholders left' + (ph.length ? ' | ' + ph.join('; ') : ''));

// 4. Image / CV paths
const refs = new Set();
for (const [f, s] of [...code, ['index.html', rd('index.html') || '']])
  for (const m of s.matchAll(/\/(?:images|cv)\/[\w\-./]+\.(?:jpe?g|png|svg|webp|pdf)/g)) refs.add(m[0]);
const missing = [...refs].filter(r => !exists(path.join('public', r)));
say(!missing.length, 'all image/CV paths exist in public/' + (missing.length ? ' | MISSING: ' + missing.join(', ') : ''));

// 5. .gitignore
say(/^\.env\s*$/m.test(rd('.gitignore') || ''), '.env is in .gitignore');

// 6. Firestore collections vs rules
const allowed = ['content', 'projects', 'services', 'awards', 'links', 'faqs', 'uses', 'timeline', 'bookedSlots', 'guestbook', 'messages', 'bookings', 'posts'];
const used = new Set();
for (const [f, s] of code) for (const m of s.matchAll(/collection\(\s*db\s*,\s*'(\w+)'/g)) used.add(m[1]);
const notCovered = [...used].filter(c => !allowed.includes(c));
say(!notCovered.length, 'collections used: ' + [...used].join(', ') + (notCovered.length ? ' | NOT IN RULES: ' + notCovered.join(', ') : ''));

// 7. .env
const env = rd('.env');
if (!env) say(false, '.env file does not exist yet');
else {
  const empty = env.split(/\r?\n/).filter(l => /^VITE_\w+=\s*$/.test(l)).map(l => l.split('=')[0]);
  say(!empty.length, '.env filled' + (empty.length ? ' | EMPTY: ' + empty.join(', ') : ''));
}

// 8. SEO
const robots = rd('public/robots.txt') || '';
say(/Sitemap:/i.test(robots) && /Disallow:\s*\/admin/i.test(robots), 'robots.txt has Sitemap and blocks /admin');
say(code.some(([f, s]) => /noindex/.test(s)), 'noindex is set somewhere (admin/404)');
const h1 = [];
for (const [f, s] of code.filter(c => /pages[\\/]/.test(c[0]))) {
  const n = (s.match(/<h1[\s>]/g) || []).length;
  if (n !== 1) h1.push(path.basename(f) + ':' + n);
}
say(!h1.length, 'one <h1> per page' + (h1.length ? ' | CHECK (file:count): ' + h1.join(', ') : ''));
say(/<h1/.test(rd('index.html') || ''), 'index.html has a static <h1> with your name');