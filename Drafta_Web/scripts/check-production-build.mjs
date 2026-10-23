// Runs before `firebase deploy --only hosting` (firebase.json predeploy). Refuses a build that
// cannot reach production Firebase, such as one built without NEXT_PUBLIC_FIREBASE_MODE=production:
// that build shows the sign-in screen, but signing in does nothing (0.7.2, 2026-10-21; specs/09).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const chunks = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', '_next', 'static', 'chunks');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
let code = '';
try { code = walk(chunks).filter(file => file.endsWith('.js')).map(file => readFileSync(file, 'utf8')).join('\n'); } catch { /* No build: reported below. */ }

const checks = [
  // A set NEXT_PUBLIC_ value is written into the code; an unset one stays a lookup that is empty in the browser.
  ['production Firebase mode (NEXT_PUBLIC_FIREBASE_MODE=production)', code.length > 0 && !code.includes('NEXT_PUBLIC_FIREBASE_MODE')],
  ['production Firebase app ID (NEXT_PUBLIC_FIREBASE_APP_ID)', code.includes('1:642102711632:web:e1e1f3a8ba7d00eec00855')],
  // The app ID is also in the code's own check, and an emulator build has its mode written in too
  // (it passed both checks above, 2026-10-23): only a production build carries a real web API key.
  // Its presence is tested; the value is never printed.
  ['production Firebase API key (NEXT_PUBLIC_FIREBASE_API_KEY)', /AIza[0-9A-Za-z_-]{35}/.test(code)],
];
const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (missing.length) {
  console.error(`Deploy stopped: out/ is not a production build. Missing: ${missing.join(', ')}.`);
  process.exit(1);
}
console.log('Production build check passed.');
