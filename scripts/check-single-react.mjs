// Fails when more than one version of react or react-dom is installed.
//
// mobile-app and web-app share one install. If their React versions ever
// differ, npm hoists one to the root and the other app loads the wrong copy;
// in 2026-08 that black-screened the mobile app on every launch. Both apps
// pin the same exact version, and this keeps it that way.
//
// Usage: node scripts/check-single-react.mjs   (from the repo root)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const watched = ['react', 'react-dom'];
const found = Object.fromEntries(watched.map(name => [name, new Map()]));

function scan(nodeModules) {
  if (!existsSync(nodeModules)) return;
  for (const entry of readdirSync(nodeModules, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = join(nodeModules, entry.name);
    if (entry.name.startsWith('@')) {
      for (const scoped of readdirSync(dir, { withFileTypes: true })) {
        visitPackage(join(dir, scoped.name));
      }
      continue;
    }
    if (watched.includes(entry.name)) record(entry.name, dir);
    visitPackage(dir);
  }
}

function visitPackage(dir) {
  const nested = join(dir, 'node_modules');
  if (existsSync(nested)) scan(nested);
}

function record(name, dir) {
  const rel = relative(root, dir);
  // Expo's CLI ships a fixed React canary inside its static assets for its
  // own tooling; apps never load it.
  if (rel.split(sep).includes('static')) return;
  const pkg = join(dir, 'package.json');
  if (!existsSync(pkg)) return;
  const { version } = JSON.parse(readFileSync(pkg, 'utf8'));
  const places = found[name].get(version) ?? [];
  places.push(rel);
  found[name].set(version, places);
}

for (const ws of ['.', 'mobile-app', 'web-app', 'packages/shared']) {
  scan(join(root, ws, 'node_modules'));
}

let failed = false;
for (const name of watched) {
  const versions = [...found[name].keys()];
  if (versions.length > 1) {
    failed = true;
    console.error(`✖ ${name} is installed in ${versions.length} versions:`);
    for (const [version, places] of found[name]) console.error(`    ${version}: ${places.join(', ')}`);
  } else {
    console.log(`✓ ${name} ${versions[0] ?? '(not installed)'}`);
  }
}
const [reactVersion] = found.react.keys();
const [domVersion] = found['react-dom'].keys();
if (reactVersion && domVersion && reactVersion !== domVersion) {
  failed = true;
  console.error(`✖ react ${reactVersion} and react-dom ${domVersion} differ`);
}
process.exit(failed ? 1 : 0);
