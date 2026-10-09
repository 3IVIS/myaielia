// Keeps aielia-latest.json (the manifest install.sh / install.ps1 / `aielia update` resolve) pointing at
// the newest PUBLISHED aielia-v* GitHub release. The release workflow in 3IVIS/buildaharness writes it at
// publish time; this daily run repairs drift (a release that was removed or published late, a manifest
// that names a draft) so the one-liner installers never point at a 404.
//
//   node scripts/refresh-aielia-manifest.mjs [--releases-file <json>] [--out aielia-latest.json]
//
// Same schema as buildaharness/scripts/generate-aielia-manifest.mjs:
//   { tag, version, assets: { "<platform>-<arch>": { url, sha256, size } } }
// The sha256 comes from each binary's `<name>.sha256` sidecar on the release.
// With no complete published release it leaves the file alone and exits 0 (the installers then show a
// friendly "no release available" message). Env: GITHUB_TOKEN (optional; avoids the rate limit).
import fs from 'fs';

const REPO = process.env.AIELIA_REPO || '3IVIS/buildaharness';
const PREFIX = 'aielia-v';
const REQUIRED = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'];
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const OUT = flag('--out', 'aielia-latest.json');
const RELEASES_FILE = flag('--releases-file');

const auth = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const get = (url) => fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'myaielia-manifest-refresh', ...(url.startsWith('https://api.github.com') ? auth : {}) } });
const semverKey = (tag) => tag.slice(PREFIX.length).split('.').map(Number);
const cmp = (a, b) => { const x = semverKey(a), y = semverKey(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

/** `aielia-linux-x64` / `aielia-win32-x64.exe` -> `linux-x64` / `win32-x64`; sidecars and anything else -> null. */
const platformKey = (name) => { const m = /^aielia-([a-z0-9]+-[a-z0-9]+?)(?:\.exe)?$/.exec(name); return m ? m[1] : null; };

async function buildManifest(rel) {
  const byName = Object.fromEntries(rel.assets.map((a) => [a.name, a]));
  const assets = {};
  for (const a of rel.assets) {
    const key = platformKey(a.name);
    if (!key) continue;
    const side = byName[`${a.name}.sha256`];
    if (!side) throw new Error(`${a.name} has no .sha256 sidecar`);
    const res = await get(side.browser_download_url);
    if (!res.ok) throw new Error(`sidecar ${side.name}: HTTP ${res.status}`);
    const m = /\b[0-9a-fA-F]{64}\b/.exec(await res.text());
    if (!m) throw new Error(`no sha256 in ${side.name}`);
    assets[key] = { url: `https://github.com/${REPO}/releases/download/${rel.tag_name}/${a.name}`, sha256: m[0].toLowerCase(), size: a.size };
  }
  const missing = REQUIRED.filter((p) => !assets[p]);
  if (missing.length) throw new Error(`missing binaries for ${missing.join(', ')}`);
  const sorted = Object.fromEntries(Object.entries(assets).sort(([x], [y]) => x.localeCompare(y)));
  return { tag: rel.tag_name, version: rel.tag_name.slice(PREFIX.length), assets: sorted };
}

let releases;
if (RELEASES_FILE) releases = JSON.parse(fs.readFileSync(RELEASES_FILE, 'utf8'));
else {
  const res = await get(`https://api.github.com/repos/${REPO}/releases?per_page=100`);
  if (!res.ok) { console.error(`could not list releases: HTTP ${res.status}; leaving ${OUT} untouched`); process.exit(1); }
  releases = await res.json();
}

const published = releases
  .filter((r) => !r.draft && !r.prerelease && new RegExp(`^${PREFIX}\\d+\\.\\d+\\.\\d+$`).test(r.tag_name))
  .sort((a, b) => cmp(b.tag_name, a.tag_name));

let current = null;
try { current = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}

let manifest = null;
for (const rel of published) {
  try { manifest = await buildManifest(rel); break; }
  catch (e) { console.warn(`skipping ${rel.tag_name}: ${e.message}`); }
}

if (!manifest) {
  console.warn(`WARNING: no complete published ${PREFIX}* release found; leaving ${OUT} untouched.`);
  if (current && !published.some((r) => r.tag_name === current.tag)) {
    console.warn(`WARNING: ${OUT} names ${current.tag}, which is not a published release. The installers will show their "no release available" message until a release is published.`);
  }
  process.exit(0);
}
const next = JSON.stringify(manifest, null, 2) + '\n';
if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === next) console.log(`${OUT} unchanged (${manifest.tag})`);
else { fs.writeFileSync(OUT, next); console.log(`${OUT} updated: ${current ? current.tag : 'none'} -> ${manifest.tag}`); }
