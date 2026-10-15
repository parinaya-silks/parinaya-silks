import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { loadEnv } from 'vite';
import { FIREBASE_ENVIRONMENT_KEYS, validateFirebaseConfiguration } from '../src/services/firebase/config.ts';

// Static, value-free comparison of compiled public configuration. No code from a
// deployment is evaluated, and this tool never reads Firestore or Vercel settings.
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--url')) {
  console.error('Usage: npm run firebase:verify-build -- [--url https://your-deployment]');
  process.exit(1);
}
const environment = { ...loadEnv('production', process.cwd(), 'VITE_FIREBASE_') };
for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith('VITE_FIREBASE_') && value !== undefined) environment[name] = value;
}
const configuration = validateFirebaseConfiguration(environment);
if (configuration.status !== 'ready' || environment.VITE_FIREBASE_DATABASE_ID !== '(default)') {
  console.error(JSON.stringify({ status: 'expected-configuration-invalid', variableNames: Object.values(FIREBASE_ENVIRONMENT_KEYS) }));
  process.exit(1);
}
try {
  const origin = args[1] ? new URL(args[1]) : undefined;
  if (origin && (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash)) throw new Error('Invalid deployment URL');
  const root = resolve('dist');
  const fetchText = async (path: string) => {
    if (origin) {
      const url = new URL(path, origin);
      if (url.origin !== origin.origin) throw new Error('Cross-origin asset');
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) throw new Error('Deployment or asset unavailable');
      const text = await response.text();
      if (text.length > 2_000_000) throw new Error('Asset too large');
      return text;
    }
    const target = resolve(root, path.replace(/^\//, ''));
    const within = relative(root, target);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error('Asset outside dist');
    return readFile(target, 'utf8');
  };
  const html = await fetchText(origin ? origin.pathname : 'index.html');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/g)].map(match => match[1]);
  if (!scripts.length || scripts.length > 4) throw new Error('Unexpected build entrypoints');
  const source = (await Promise.all(scripts.map(fetchText))).join('\n');
  const checks = Object.fromEntries(Object.values(FIREBASE_ENVIRONMENT_KEYS).map(name => [name, source.includes(environment[name]) ]));
  checks.VITE_FIREBASE_DATABASE_ID = source.includes('(default)');
  const passed = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ status: passed ? 'compiled-configuration-matches' : 'compiled-configuration-mismatch', source: origin ? 'deployment' : 'local-dist', checks, databaseReadVerified: false }, null, 2));
  process.exitCode = passed ? 0 : 1;
} catch {
  console.error(JSON.stringify({ status: 'build-inspection-failed', message: 'Check the build, exact deployment URL and network access. No configuration values were printed.', databaseReadVerified: false }));
  process.exitCode = 1;
}
