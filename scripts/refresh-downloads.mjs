// Writes _data/downloads.json: direct download links for the newest PUBLISHED desktop-v* and aielia-v*
// GitHub releases, so install.html can link straight to the right file instead of telling people to
// browse the Releases page.
//
//   node scripts/refresh-downloads.mjs [--releases-file <json>] [--out _data/downloads.json]
//
// Shape:
//   { desktop: { tag, version, releaseUrl, files: { dmg|exe|msi|appimage|deb|rpm: { name, url, sizeMB } } },
//     cli:     { tag, version, releaseUrl, files: { "<platform>_<arch>": { name, url, sizeMB } } } }
// A section is only replaced by a release that has every required file; otherwise the previous section is
// kept (with a warning), so a half-uploaded release never produces a broken link. Env: GITHUB_TOKEN (optional).
import fs from 'fs';

const REPO = process.env.AIELIA_REPO || '3IVIS/buildaharness';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const OUT = flag('--out', '_data/downloads.json');
const RELEASES_FILE = flag('--releases-file');

const SECTIONS = {
  desktop: {
    prefix: 'desktop-v',
    required: ['dmg', 'exe', 'appimage', 'deb', 'rpm'],
    // The updater tarball (*.app.tar.gz) and signatures deliberately match nothing.
    kind: (n) => (/\.dmg$/.test(n) ? 'dmg' : /-setup\.exe$/.test(n) ? 'exe' : /\.msi$/.test(n) ? 'msi'
      : /\.AppImage$/.test(n) ? 'appimage' : /\.deb$/.test(n) ? 'deb' : /\.rpm$/.test(n) ? 'rpm' : null),
  },
  cli: {
    prefix: 'aielia-v',
    required: ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'],
    kind: (n) => { const m = /^aielia-([a-z0-9]+-[a-z0-9]+?)(?:\.exe)?$/.exec(n); return m ? m[1] : null; },
  },
};

const auth = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const key = (tag, prefix) => tag.slice(prefix.length).split('.').map(Number);
const cmp = (a, b, prefix) => { const x = key(a, prefix), y = key(b, prefix); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

function build(name, spec, rel) {
  const files = {};
  for (const a of rel.assets) {
    const k = spec.kind(a.name);
    if (!k || a.state === 'uploading') continue;
    files[k.replace(/-/g, '_')] = { name: a.name, sizeMB: Math.round(a.size / 1048576), url: `https://github.com/${REPO}/releases/download/${rel.tag_name}/${encodeURIComponent(a.name)}`, size: a.size };
  }
  const missing = spec.required.filter((k) => !files[k.replace(/-/g, '_')]);
  if (missing.length) throw new Error(`${rel.tag_name} is missing ${missing.join(', ')}`);
  return {
    tag: rel.tag_name,
    version: rel.tag_name.slice(spec.prefix.length),
    releaseUrl: `https://github.com/${REPO}/releases/tag/${rel.tag_name}`,
    files: Object.fromEntries(Object.entries(files).sort(([x], [y]) => x.localeCompare(y))),
  };
}

let releases;
if (RELEASES_FILE) releases = JSON.parse(fs.readFileSync(RELEASES_FILE, 'utf8'));
else {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers: { 'User-Agent': 'myaielia-downloads-refresh', ...auth } });
  if (!res.ok) { console.error(`could not list releases: HTTP ${res.status}; leaving ${OUT} untouched`); process.exit(1); }
  releases = await res.json();
}

let prev = {};
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}

const next = {};
for (const [name, spec] of Object.entries(SECTIONS)) {
  const re = new RegExp(`^${spec.prefix}\\d+\\.\\d+\\.\\d+$`);
  const published = releases.filter((r) => !r.draft && !r.prerelease && re.test(r.tag_name))
    .sort((a, b) => cmp(b.tag_name, a.tag_name, spec.prefix));
  for (const rel of published) {
    try { next[name] = build(name, spec, rel); break; }
    catch (e) { console.warn(`skipping ${name}: ${e.message}`); }
  }
  if (!next[name]) {
    if (prev[name]) { console.warn(`WARNING: no complete published ${spec.prefix}* release; keeping ${prev[name].tag}`); next[name] = prev[name]; }
    else console.warn(`WARNING: no complete published ${spec.prefix}* release and nothing to keep; install.html falls back to the Releases page`);
  }
}

const text = JSON.stringify(next, null, 2) + '\n';
if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text) console.log(`${OUT} unchanged`);
else {
  fs.mkdirSync(OUT.includes('/') ? OUT.slice(0, OUT.lastIndexOf('/')) : '.', { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`${OUT} updated: desktop ${prev.desktop?.tag ?? 'none'} -> ${next.desktop?.tag ?? 'none'}, cli ${prev.cli?.tag ?? 'none'} -> ${next.cli?.tag ?? 'none'}`);
}
