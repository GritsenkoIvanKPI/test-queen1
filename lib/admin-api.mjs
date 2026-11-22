// Admin API, shared by the Vercel functions in /api and the local dev server (serve.mjs).
//
// Production (Vercel): set these environment variables in the Vercel project
//   ADMIN_PASSWORD   password for /admin
//   GITHUB_TOKEN     fine-grained token with "Contents: read and write" on the site repository
//   GITHUB_REPO      owner/name, e.g. GritsenkoIvanKPI/test-queen1
//   GITHUB_BRANCH    optional, defaults to main
// Publishing commits the edited data, new photos and all regenerated pages in one commit;
// Vercel then redeploys the site automatically.
//
// Local (node serve.mjs, no GITHUB_TOKEN): content is read from and written to this folder.
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { createSite, GENERATED_DIRS } from './render.mjs';

const DATA_FILES = ['brands', 'models', 'collections', 'posts', 'site', 'translations'];
const env = (k, d = '') => process.env[k] || d;
const isGithub = () => !!env('GITHUB_TOKEN');

/* ───────── Auth: stateless signed token ───────── */
function password() {
  const p = env('ADMIN_PASSWORD');
  if (p) return p;
  return isGithub() ? '' : 'queen'; // local development only
}
const sign = (payload) => createHmac('sha256', env('ADMIN_SECRET', password() + '|queen-admin')).update(payload).digest('base64url');
function makeToken() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 12); // 12 hours
  return `${exp}.${sign(exp)}`;
}
function checkToken(header) {
  const t = String(header || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ───────── Storage backends ───────── */
const gh = {
  repo: () => env('GITHUB_REPO'),
  branch: () => env('GITHUB_BRANCH', 'main'),
  async call(path, opts = {}) {
    const res = await fetch(`https://api.github.com/repos/${gh.repo()}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
        Accept: opts.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return opts.raw ? res.text() : res.json();
  },
};

async function localFs() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  return { fs, path, root: process.cwd() };
}

async function loadContent() {
  const data = {};
  if (isGithub()) {
    const ref = await gh.call(`/git/ref/heads/${gh.branch()}`);
    await Promise.all(DATA_FILES.map(async (f) => {
      data[f] = JSON.parse(await gh.call(`/contents/data/${f}.json?ref=${ref.object.sha}`, { raw: true }));
    }));
    return { data, mode: 'github', head: ref.object.sha };
  }
  const { fs, path, root } = await localFs();
  for (const f of DATA_FILES) data[f] = JSON.parse(fs.readFileSync(path.join(root, 'data', `${f}.json`), 'utf8'));
  return { data, mode: 'local', head: null };
}

const SAFE_ASSET = /^assets\/(catalog|img|uploads)\/[a-z0-9][a-z0-9/._-]*\.(jpg|jpeg|png|webp)$/i;

async function upload({ path: file, data }) {
  if (!SAFE_ASSET.test(file || '') || file.includes('..')) throw Object.assign(new Error('Invalid file path'), { status: 400 });
  const b64 = String(data || '').replace(/^data:[^,]+,/, '');
  if (!b64 || b64.length > 6_000_000) throw Object.assign(new Error('Image is empty or too large'), { status: 400 });
  if (isGithub()) {
    const blob = await gh.call('/git/blobs', { method: 'POST', body: { content: b64, encoding: 'base64' } });
    return { path: file, sha: blob.sha };
  }
  const { fs, path, root } = await localFs();
  const abs = path.join(root, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(b64, 'base64'));
  return { path: file, sha: null };
}

function validate(data) {
  for (const f of DATA_FILES) if (!data || data[f] == null) throw Object.assign(new Error(`Missing ${f}`), { status: 400 });
  const ids = new Set();
  for (const m of data.models) {
    if (!m.id || !m.brand || !m.article) throw Object.assign(new Error(`A product is missing its brand or article`), { status: 400 });
    if (ids.has(m.id)) throw Object.assign(new Error(`Two products share the id "${m.id}"`), { status: 400 });
    ids.add(m.id);
  }
}

const json = (x) => JSON.stringify(x, null, 2) + '\n';
const blobSha = (text) => {
  const buf = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
};

async function publish({ data, uploads = [], message }) {
  validate(data);
  const pages = createSite(data).pages();
  const files = [
    ...DATA_FILES.map((f) => ({ file: `data/${f}.json`, html: json(data[f]) })),
    ...pages,
  ];
  const msg = (message || 'Content update from the admin panel').slice(0, 200);

  if (isGithub()) {
    const ref = await gh.call(`/git/ref/heads/${gh.branch()}`);
    const head = await gh.call(`/git/commits/${ref.object.sha}`);
    const tree = await gh.call(`/git/trees/${head.tree.sha}?recursive=1`);
    const existing = new Map(tree.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));
    const wanted = new Set(files.map((f) => f.file));
    const entries = [];
    for (const f of files) if (existing.get(f.file) !== blobSha(f.html)) entries.push({ path: f.file, mode: '100644', type: 'blob', content: f.html });
    for (const u of uploads) if (u.sha && SAFE_ASSET.test(u.path)) entries.push({ path: u.path, mode: '100644', type: 'blob', sha: u.sha });
    // Pages of deleted products, brands or posts
    for (const p of existing.keys()) {
      if (GENERATED_DIRS.some((d) => p.startsWith(d)) && /\/[^/]+\/index\.html$/.test(p) && !wanted.has(p)) entries.push({ path: p, mode: '100644', type: 'blob', sha: null });
    }
    if (!entries.length) return { ok: true, changed: 0, commit: ref.object.sha };
    const newTree = await gh.call('/git/trees', { method: 'POST', body: { base_tree: head.tree.sha, tree: entries } });
    const commit = await gh.call('/git/commits', { method: 'POST', body: { message: msg, tree: newTree.sha, parents: [ref.object.sha] } });
    await gh.call(`/git/refs/heads/${gh.branch()}`, { method: 'PATCH', body: { sha: commit.sha } });
    return { ok: true, changed: entries.length, commit: commit.sha };
  }

  const { fs, path, root } = await localFs();
  let changed = 0;
  for (const f of files) {
    const abs = path.join(root, f.file);
    const prev = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (prev === f.html) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.html);
    changed++;
  }
  const wanted = new Set(files.map((f) => f.file));
  for (const d of GENERATED_DIRS) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
      if (sub.isDirectory() && !wanted.has(`${d}${sub.name}/index.html`)) { fs.rmSync(path.join(dir, sub.name), { recursive: true }); changed++; }
    }
  }
  return { ok: true, changed, commit: null };
}

/* ───────── Request handling ───────── */
// action: 'login' | 'content' | 'upload' | 'publish'
export async function handle(action, { method, body, headers }) {
  try {
    if (action === 'login') {
      if (method !== 'POST') return { status: 405, json: { error: 'Use POST' } };
      const pw = password();
      if (!pw) return { status: 500, json: { error: 'ADMIN_PASSWORD is not set on the server.' } };
      const given = Buffer.from(String(body?.password || '')), real = Buffer.from(pw);
      if (given.length !== real.length || !timingSafeEqual(given, real)) return { status: 401, json: { error: 'Wrong password' } };
      return { status: 200, json: { token: makeToken(), mode: isGithub() ? 'github' : 'local' } };
    }
    if (!checkToken(headers.authorization)) return { status: 401, json: { error: 'Please sign in again' } };
    if (action === 'content' && method === 'GET') return { status: 200, json: await loadContent() };
    if (action === 'upload' && method === 'POST') return { status: 200, json: await upload(body || {}) };
    if (action === 'publish' && method === 'POST') return { status: 200, json: await publish(body || {}) };
    return { status: 404, json: { error: 'Unknown action' } };
  } catch (e) {
    return { status: e.status || 500, json: { error: e.message || 'Server error' } };
  }
}

// Adapter for Vercel functions: export default vercel('content')
export const vercel = (action) => async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const r = await handle(action, { method: req.method, body, headers: req.headers });
  res.setHeader('Cache-Control', 'no-store');
  res.status(r.status).json(r.json);
};
