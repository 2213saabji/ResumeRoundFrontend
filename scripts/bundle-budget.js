/**
 * Bundle budget check (run after `next build`). Fails CI when a route ships more first-load JS
 * (gzipped) than its budget from the frontend base document.
 *
 *   npm run build && npm run budget
 *
 * For each route it adds up the root main chunks plus every entry chunk of the route's layouts,
 * error boundaries and page, as listed in Next's client-reference manifests. Lazy chunks
 * (janus.js, Recharts, Google sign-in) are not counted: they load on demand.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT_DIR = '.next';
const KB = 1024;

/** Budgets in gzipped KB. Routes not listed are reported but not enforced. */
const BUDGETS = {
  '/': 140,
  '/interviews/[id]/room': 180,
};

if (!existsSync(join(NEXT_DIR, 'build-manifest.json'))) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}

const buildManifest = JSON.parse(readFileSync(join(NEXT_DIR, 'build-manifest.json'), 'utf8'));
const rootFiles = buildManifest.rootMainFiles ?? [];

const gzCache = new Map();
function gzSize(file) {
  if (!gzCache.has(file)) {
    const path = join(NEXT_DIR, file);
    gzCache.set(file, existsSync(path) ? gzipSync(readFileSync(path), { level: 9 }).length : 0);
  }
  return gzCache.get(file);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === 'page_client-reference-manifest.js') yield p;
  }
}

/** "server/app/(app)/interviews/[id]/report/page_client..." -> "/interviews/[id]/report" */
function routeOf(manifestPath) {
  const rel = relative(join(NEXT_DIR, 'server', 'app'), manifestPath)
    .split(sep)
    .slice(0, -1);
  const route = '/' + rel.filter((s) => !(s.startsWith('(') && s.endsWith(')'))).join('/');
  return route === '/' ? '/' : route.replace(/\/$/, '');
}

const rows = [];
for (const manifestPath of walk(join(NEXT_DIR, 'server', 'app'))) {
  const route = routeOf(manifestPath);
  if (route.startsWith('/_')) continue;
  const text = readFileSync(manifestPath, 'utf8');
  const match = text.match(/"entryJSFiles":(\{[^}]*\})/);
  if (!match) continue;
  const entries = JSON.parse(match[1]);
  const files = new Set(rootFiles);
  for (const [entry, list] of Object.entries(entries)) {
    if (entry.endsWith('/not-found') || entry.endsWith('/global-error')) continue;
    list.forEach((f) => files.add(f));
  }
  const bytes = [...files].reduce((sum, f) => sum + gzSize(f), 0);
  rows.push({ route, kb: bytes / KB, budget: BUDGETS[route] ?? null });
}

rows.sort((a, b) => a.route.localeCompare(b.route));
let failed = false;
console.log('\nFirst-load JS per route (gzipped)\n');
for (const r of rows) {
  const over = r.budget != null && r.kb > r.budget;
  failed ||= over;
  const budget = r.budget != null ? ` / ${r.budget} KB budget` : '';
  console.log(
    `${over ? 'FAIL' : r.budget != null ? 'ok  ' : '    '}  ${r.route.padEnd(28)} ${r.kb.toFixed(1).padStart(7)} KB${budget}`,
  );
}
for (const route of Object.keys(BUDGETS)) {
  if (!rows.some((r) => r.route === route)) {
    console.log(`FAIL  ${route.padEnd(28)} not found in build output`);
    failed = true;
  }
}
console.log('');
process.exit(failed ? 1 : 0);
