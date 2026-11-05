import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createPlaza } from './server/plaza.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8123);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.join(ROOT, 'server', 'data');
const DB_PATH = path.join(DATA_DIR, 'nongtrai.db');
const ADMIN_CRED_PATH = path.join(DATA_DIR, 'admin-credentials.txt');
const SESSION_COOKIE = 'nt_sid';
const SESSION_DAYS = 30;
const MAX_BODY = 256 * 1024;
const plaza = createPlaza();
const plazaCookie = 'nt_plaza_guest';
const plazaGuestSecret = crypto.randomBytes(32);

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    banned INTEGER NOT NULL DEFAULT 0,
    ban_reason TEXT,
    theme TEXT NOT NULL DEFAULT 'peach',
    created_at INTEGER NOT NULL,
    last_login INTEGER,
    last_seen INTEGER NOT NULL DEFAULT 0,
    state_json TEXT,
    state_updated INTEGER
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_key TEXT NOT NULL UNIQUE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    friendship INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    accepted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_friend_requester ON friendships(requester_id, status);
  CREATE INDEX IF NOT EXISTS idx_friend_addressee ON friendships(addressee_id, status);

  CREATE TABLE IF NOT EXISTS friend_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    watered INTEGER NOT NULL DEFAULT 0,
    watered_plots TEXT NOT NULL DEFAULT '[]',
    gift INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    UNIQUE(actor_id, target_id, day)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_id, to_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id, read_at);

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_user_id INTEGER,
    meta_json TEXT,
    created_at INTEGER NOT NULL
  );
`);

const metrics = {
  startedAt: Date.now(),
  requests: 0,
  errors: 0,
  requestTimestamps: [],
  byPath: new Map()
};
const rateBuckets = new Map();

/* ---------------- utilities ---------------- */
function now() { return Date.now(); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function dayKey(ts = now()) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url'); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return { salt, hash: hash.toString('hex') };
}
function verifyPassword(password, salt, expectedHex) {
  const actual = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function safeJsonParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}
function publicUser(row, extra = {}) {
  const state = safeJsonParse(row.state_json, null);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    theme: row.theme,
    banned: !!row.banned,
    createdAt: row.created_at,
    level: state?.player?.level || 1,
    ...extra
  };
}
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}
function apiError(res, status, message, code = 'error') {
  json(res, status, { ok: false, error: message, code });
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 3600;
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
function clientIp(req) {
  if (process.env.TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}
function rateLimit(key, max, windowMs) {
  const t = now();
  const b = rateBuckets.get(key);
  if (!b || b.resetAt <= t) {
    rateBuckets.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  }
  b.count++;
  return b.count <= max;
}
function cleanRateBuckets() {
  const t = now();
  for (const [k, v] of rateBuckets) if (v.resetAt <= t) rateBuckets.delete(k);
}
setInterval(cleanRateBuckets, 60_000).unref();

async function readJson(req, limit = MAX_BODY) {
  const type = String(req.headers['content-type'] || '');
  if (!type.includes('application/json')) throw Object.assign(new Error('Cần Content-Type application/json'), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON không hợp lệ'), { status: 400 }); }
}
function cleanText(value, max = 100) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}
function validUsername(name) { return /^[a-zA-Z0-9_]{3,24}$/.test(name); }
function validTheme(theme) { return ['peach', 'mint', 'lavender'].includes(theme); }
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.host === req.headers.host;
  } catch { return false; }
}
function audit(adminId, action, targetUser, meta) {
  db.prepare('INSERT INTO audit_log(admin_id,action,target_user_id,meta_json,created_at) VALUES(?,?,?,?,?)')
    .run(adminId, action, targetUser || null, JSON.stringify(meta || {}), now());
}

/* ---------------- sessions / auth ---------------- */
const sessionCache = new Map(); // tokenHash -> {user, expiresAt, checkedAt}
function authUser(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashToken(token);
  const t = now();
  const cached = sessionCache.get(tokenHash);
  if (cached && cached.expiresAt > t && t - cached.checkedAt < 15_000) {
    return cached.user;
  }
  const row = db.prepare(`
    SELECT s.token_hash, s.expires_at, s.last_seen AS session_seen,
           u.id, u.username, u.display_name, u.password_hash, u.password_salt,
           u.role, u.banned, u.ban_reason, u.theme, u.created_at, u.last_login, u.last_seen,
           u.state_json, u.state_updated
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash);
  if (!row) { sessionCache.delete(tokenHash); return null; }
  if (row.expires_at <= t) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    sessionCache.delete(tokenHash);
    return null;
  }
  if (row.banned) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    sessionCache.delete(tokenHash);
    return null;
  }
  if (t - row.session_seen > 20_000) {
    db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(t, tokenHash);
    db.prepare('UPDATE users SET last_seen=? WHERE id=?').run(t, row.id);
    row.last_seen = t;
  }
  const user = publicUser(row, { stateJson: row.state_json, stateUpdated: row.state_updated });
  sessionCache.set(tokenHash, { user, expiresAt: row.expires_at, checkedAt: t });
  return user;
}
function createSession(userId) {
  const token = randomToken(32);
  const tokenHash = hashToken(token);
  const t = now();
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at,last_seen) VALUES(?,?,?,?,?)')
    .run(tokenHash, userId, t, t + SESSION_DAYS * 86400_000, t);
  return token;
}
function destroySession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return;
  const h = hashToken(token);
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(h);
  sessionCache.delete(h);
}
function requireUser(req, res) {
  const user = authUser(req, res);
  if (!user) { apiError(res, 401, 'Bạn cần đăng nhập.', 'unauthorized'); return null; }
  return user;
}
function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') { apiError(res, 403, 'Chỉ quản trị viên mới được làm việc này.', 'forbidden'); return null; }
  return user;
}

/* ---------------- social helpers ---------------- */
const THEME_INFO = {
  peach: { color: '#ff9b86', emoji: '👩‍🌾' },
  mint: { color: '#65b8d9', emoji: '🧑‍🌾' },
  lavender: { color: '#b69be8', emoji: '👵' }
};
function pairKey(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
function friendshipBetween(a, b) {
  return db.prepare('SELECT * FROM friendships WHERE pair_key=?').get(pairKey(a, b));
}
function areFriends(a, b) {
  const f = friendshipBetween(a, b);
  return !!f && f.status === 'accepted';
}
function extractGarden(stateJson, wateredPlots = []) {
  const state = safeJsonParse(stateJson, null);
  const plots = Array.isArray(state?.plots) ? state.plots : [];
  return Array.from({ length: 6 }, (_, i) => {
    const p = plots[i] || {};
    return {
      crop: p.crop || null,
      progress: p.crop ? clamp(Number(p.progress) || 0, 0, 1) : 0,
      watered: wateredPlots.includes(i)
    };
  });
}
function friendPayload(f, viewerId) {
  const friendId = f.requester_id === viewerId ? f.addressee_id : f.requester_id;
  const row = db.prepare('SELECT * FROM users WHERE id=?').get(friendId);
  if (!row || row.banned) return null;
  const action = db.prepare('SELECT * FROM friend_actions WHERE actor_id=? AND target_id=? AND day=?')
    .get(viewerId, friendId, dayKey());
  const wateredPlots = safeJsonParse(action?.watered_plots, []);
  const state = safeJsonParse(row.state_json, null);
  const info = THEME_INFO[row.theme] || THEME_INFO.peach;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    theme: row.theme,
    color: info.color,
    emoji: info.emoji,
    level: state?.player?.level || 1,
    online: row.last_seen > now() - 120_000,
    lastSeen: row.last_seen,
    friendship: f.friendship,
    watered: Number(action?.watered) || 0,
    giftDate: action?.gift ? dayKey() : '',
    wateredPlots,
    plots: extractGarden(row.state_json, wateredPlots),
    since: f.accepted_at || f.created_at,
    status: f.status
  };
}
function socialPayload(userId) {
  const accepted = db.prepare(`SELECT * FROM friendships WHERE status='accepted' AND (requester_id=? OR addressee_id=?) ORDER BY accepted_at DESC`).all(userId, userId);
  const friends = accepted.map(f => friendPayload(f, userId)).filter(Boolean);
  const incoming = db.prepare(`SELECT f.*, u.username, u.display_name, u.theme FROM friendships f JOIN users u ON u.id=f.requester_id WHERE f.addressee_id=? AND f.status='pending' ORDER BY f.created_at DESC`).all(userId)
    .map(r => ({ id: r.id, from: { id: r.requester_id, username: r.username, displayName: r.display_name, theme: r.theme }, createdAt: r.created_at }));
  const outgoing = db.prepare(`SELECT f.*, u.username, u.display_name, u.theme FROM friendships f JOIN users u ON u.id=f.addressee_id WHERE f.requester_id=? AND f.status='pending' ORDER BY f.created_at DESC`).all(userId)
    .map(r => ({ id: r.id, to: { id: r.addressee_id, username: r.username, displayName: r.display_name, theme: r.theme }, createdAt: r.created_at }));
  const unread = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE to_id=? AND read_at IS NULL').get(userId).n;
  return { friends, incoming, outgoing, unread };
}

function adminStats() {
  const t = now();
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;
  const online = count('SELECT COUNT(*) AS n FROM users WHERE last_seen > ? AND banned=0', t - 120_000);
  const totalUsers = count('SELECT COUNT(*) AS n FROM users');
  const banned = count('SELECT COUNT(*) AS n FROM users WHERE banned=1');
  const admins = count("SELECT COUNT(*) AS n FROM users WHERE role='admin'");
  const friends = count("SELECT COUNT(*) AS n FROM friendships WHERE status='accepted'");
  const pending = count("SELECT COUNT(*) AS n FROM friendships WHERE status='pending'");
  const messages = count('SELECT COUNT(*) AS n FROM messages');
  const messagesToday = count('SELECT COUNT(*) AS n FROM messages WHERE created_at > ?', new Date().setHours(0, 0, 0, 0));
  const sessions = count('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', t);
  const newToday = count('SELECT COUNT(*) AS n FROM users WHERE created_at > ?', new Date().setHours(0, 0, 0, 0));
  const since = t - 60_000;
  while (metrics.requestTimestamps.length && metrics.requestTimestamps[0] < since) metrics.requestTimestamps.shift();
  const dbSize = [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm'].reduce((sum, f) => {
    try { return sum + fs.statSync(f).size; } catch { return sum; }
  }, 0);
  return {
    totalUsers, online, banned, admins, friends, pending, messages, messagesToday,
    sessions, newToday,
    requestsPerMinute: metrics.requestTimestamps.length,
    totalRequests: metrics.requests,
    errors: metrics.errors,
    uptimeSec: Math.round((t - metrics.startedAt) / 1000),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    load1: os.loadavg()[0],
    dbSizeMb: Math.round(dbSize / 104857.6) / 10,
    dbSizeKb: Math.round(dbSize / 1024),
    serverTime: t
  };
}

function capacityEstimate(dau, concurrencyPct, reqPerUserPerMin) {
  const peak = Math.round(dau * concurrencyPct);
  const rps = Math.max(1, Math.round(peak * reqPerUserPerMin / 60));
  // Kinh nghiệm: 1 vCPU Node xử lý ~600-900 req/s JSON nhỏ, nhưng chừa headroom 60%.
  const appVcpu = Math.max(1, Math.ceil(rps / 650));
  const appRamGb = Math.max(1, Math.ceil(appVcpu * 1.5));
  const postgresVcpu = Math.max(2, Math.ceil(rps / 450));
  const postgresRamGb = Math.max(4, postgresVcpu * 4);
  const redisRamGb = Math.max(1, Math.ceil(peak / 250_000));
  const stateKb = 20;
  const storageGb = Math.max(5, Math.ceil(dau * stateKb / 1_048_576 * 3 + 10));
  // req/người/phút * 1.440 phút/ngày * payload 2,5 KB.
  const bandwidthGbPerDay = Math.round(peak * reqPerUserPerMin * 1440 * 2.5 / 1_048_576 * 10) / 10;
  return { dau, concurrencyPct, peakConcurrent: peak, reqPerMin: Math.round(peak * reqPerUserPerMin), reqPerSec: rps, appVcpu, appRamGb, postgresVcpu, postgresRamGb, redisRamGb, storageGb, bandwidthGbPerDay };
}

/* ---------------- Quảng trường ---------------- */
function signPlazaGuest(nonce) {
  return crypto.createHmac('sha256', plazaGuestSecret).update(nonce).digest('base64url');
}

function plazaVisitor(req, res, allowNewGuest) {
  const user = authUser(req, res);
  if (user) return { key: `user:${user.id}`, name: user.displayName || user.username };
  const cookie = parseCookies(req)[plazaCookie] || '';
  const match = /^([\w-]{24})\.([\w-]{43})$/.exec(cookie);
  if (match && crypto.timingSafeEqual(Buffer.from(match[2]), Buffer.from(signPlazaGuest(match[1])))) {
    return { key: `guest:${match[1]}`, name: 'Khách' };
  }
  if (!allowNewGuest) throw Object.assign(new Error('Hãy vào quảng trường trước khi thao tác.'), { status: 403 });
  if (!rateLimit(`${clientIp(req)}:plaza-guests`, 40, 60_000)) {
    throw Object.assign(new Error('Vui lòng chờ một lúc rồi vào lại quảng trường.'), { status: 429 });
  }
  const nonce = randomToken(18);
  res.setHeader('Set-Cookie', `${plazaCookie}=${nonce}.${signPlazaGuest(nonce)}; HttpOnly; SameSite=Lax; Path=/api/plaza; Max-Age=604800`);
  return { key: `guest:${nonce}`, name: 'Khách' };
}

async function handlePlaza(req, res, pathname) {
  const action = pathname.slice('/api/plaza'.length);
  if (!['', '/queue', '/skip', '/ended', '/leave'].includes(action)) {
    return apiError(res, 404, 'Không tìm thấy thao tác quảng trường.');
  }
  if (req.method !== (action ? 'POST' : 'GET')) return apiError(res, 405, 'Phương thức không hợp lệ.');
  const viewer = plazaVisitor(req, res, !action);
  if (!action) {
    if (!rateLimit(`${viewer.key}:plaza-read`, 120, 60_000)) return apiError(res, 429, 'Bạn đang tải quảng trường quá nhanh.');
    return json(res, 200, plaza.poll(viewer.key));
  }
  if (!rateLimit(`${clientIp(req)}:plaza-write`, 180, 60_000) ||
      !rateLimit(`${viewer.key}:plaza${action}`, action === '/queue' ? 8 : 30, 60_000)) {
    return apiError(res, 429, 'Bạn thao tác quá nhanh. Hãy thử lại sau một lúc.');
  }
  const body = await readJson(req, 4 * 1024);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return apiError(res, 400, 'Dữ liệu không hợp lệ.');
  if (action === '/queue') return json(res, 200, plaza.enqueue(viewer.key, viewer.name, body));
  if (action === '/skip') return json(res, 200, plaza.skip(viewer.key, body));
  if (action === '/ended') return json(res, 200, plaza.ended(viewer.key, body));
  return json(res, 200, plaza.leave(viewer.key));
}

/* ---------------- API ---------------- */
async function handleApi(req, res, pathname, url) {
  const method = req.method;
  const t = now();
  metrics.requests++;
  metrics.requestTimestamps.push(t);
  metrics.byPath.set(pathname, (metrics.byPath.get(pathname) || 0) + 1);
  if (metrics.requestTimestamps.length > 5000) metrics.requestTimestamps.splice(0, 1000);

  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) { apiError(res, 405, 'Method không hỗ trợ.'); return; }
  if (method !== 'GET' && !sameOrigin(req)) { apiError(res, 403, 'Origin không hợp lệ.'); return; }

  if (pathname === '/api/plaza' || pathname.startsWith('/api/plaza/')) return handlePlaza(req, res, pathname);

  /* auth */
  if (pathname === '/api/auth/register' && method === 'POST') {
    if (!rateLimit(`${clientIp(req)}:register`, 8, 3600_000)) { apiError(res, 429, 'Bạn đã thử đăng ký quá nhiều lần. Thử lại sau.'); return; }
    const body = await readJson(req, 16 * 1024);
    const username = cleanText(body.username, 24);
    const displayName = cleanText(body.displayName || body.display_name, 30);
    const password = String(body.password || '');
    if (!validUsername(username)) { apiError(res, 400, 'Tên tài khoản 3-24 ký tự, chỉ chữ, số và dấu gạch dưới.'); return; }
    if (displayName.length < 2 || displayName.length > 30) { apiError(res, 400, 'Tên hiển thị phải từ 2 đến 30 ký tự.'); return; }
    if (password.length < 8 || password.length > 72) { apiError(res, 400, 'Mật khẩu phải từ 8 đến 72 ký tự.'); return; }
    if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) { apiError(res, 409, 'Tên tài khoản đã có người dùng.', 'taken'); return; }
    const { salt, hash } = hashPassword(password);
    const theme = ['peach', 'mint', 'lavender'][crypto.randomInt(3)];
    let info;
    try {
      info = db.prepare('INSERT INTO users(username,display_name,password_hash,password_salt,theme,created_at,last_seen) VALUES(?,?,?,?,?,?,?)')
        .run(username, displayName, hash, salt, theme, t, t);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) apiError(res, 409, 'Tên tài khoản đã có người dùng.');
      else throw e;
      return;
    }
    const userId = Number(info.lastInsertRowid);
    const token = createSession(userId);
    setSessionCookie(res, token);
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    json(res, 201, { ok: true, user: publicUser(row), state: null, social: socialPayload(userId) });
    return;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    if (!rateLimit(`${clientIp(req)}:login`, 20, 900_000)) { apiError(res, 429, 'Thử đăng nhập quá nhiều lần. Chờ 15 phút nhé.'); return; }
    const body = await readJson(req, 16 * 1024);
    const username = cleanText(body.username, 24);
    const password = String(body.password || '');
    const row = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!row || !verifyPassword(password, row.password_salt, row.password_hash)) {
      apiError(res, 401, 'Tên tài khoản hoặc mật khẩu không đúng.', 'bad_credentials');
      return;
    }
    if (row.banned) { apiError(res, 403, 'Tài khoản đang bị khóa. ' + (row.ban_reason || '')); return; }
    db.prepare('UPDATE users SET last_login=?, last_seen=? WHERE id=?').run(t, t, row.id);
    // Một phiên hoạt động cho mỗi tài khoản: đăng nhập thiết bị mới sẽ thu hồi phiên cũ.
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);
    for (const [k, v] of sessionCache) if (v.user.id === row.id) sessionCache.delete(k);
    const token = createSession(row.id);
    setSessionCookie(res, token);
    const user = publicUser({ ...row, last_seen: t });
    json(res, 200, { ok: true, user, state: safeJsonParse(row.state_json, null), social: socialPayload(row.id) });
    return;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    destroySession(req);
    clearSessionCookie(res);
    json(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/me' && method === 'GET') {
    const user = requireUser(req, res); if (!user) return;
    const social = socialPayload(user.id);
    json(res, 200, { ok: true, user, social, unread: social.unread });
    return;
  }

  if (pathname === '/api/me' && method === 'PATCH') {
    const user = requireUser(req, res); if (!user) return;
    const body = await readJson(req, 16 * 1024);
    const displayName = cleanText(body.displayName ?? user.displayName, 30);
    const theme = validTheme(body.theme) ? body.theme : user.theme;
    if (displayName.length < 2) { apiError(res, 400, 'Tên hiển thị quá ngắn.'); return; }
    db.prepare('UPDATE users SET display_name=?, theme=? WHERE id=?').run(displayName, theme, user.id);
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    json(res, 200, { ok: true, user: publicUser(row) });
    return;
  }

  if (pathname === '/api/auth/change-password' && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    if (!rateLimit(`${user.id}:password`, 8, 3600_000)) { apiError(res, 429, 'Thử đổi mật khẩu quá nhiều lần.'); return; }
    const body = await readJson(req, 16 * 1024);
    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 8 || newPassword.length > 72) { apiError(res, 400, 'Mật khẩu mới phải từ 8 đến 72 ký tự.'); return; }
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    if (!row || !verifyPassword(oldPassword, row.password_salt, row.password_hash)) {
      apiError(res, 400, 'Mật khẩu hiện tại không đúng.', 'bad_password');
      return;
    }
    const { salt, hash } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash=?, password_salt=? WHERE id=?').run(hash, salt, user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    for (const [k, v] of sessionCache) if (v.user.id === user.id) sessionCache.delete(k);
    const token = createSession(user.id);
    setSessionCookie(res, token);
    json(res, 200, { ok: true, message: 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.' });
    return;
  }

  if (pathname === '/api/presence' && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    db.prepare('UPDATE users SET last_seen=? WHERE id=?').run(t, user.id);
    const online = db.prepare('SELECT COUNT(*) AS n FROM users WHERE last_seen > ? AND banned=0').get(t - 120_000).n;
    json(res, 200, { ok: true, online });
    return;
  }

  /* game state */
  if (pathname === '/api/game/state' && method === 'GET') {
    const user = requireUser(req, res); if (!user) return;
    const row = db.prepare('SELECT state_json, state_updated FROM users WHERE id=?').get(user.id);
    json(res, 200, { ok: true, state: safeJsonParse(row.state_json, null), updatedAt: row.state_updated || 0 });
    return;
  }
  if (pathname === '/api/game/state' && method === 'PUT') {
    const user = requireUser(req, res); if (!user) return;
    if (!rateLimit(`${user.id}:state`, 120, 60_000)) { apiError(res, 429, 'Lưu quá nhanh, thử lại sau.'); return; }
    const body = await readJson(req, MAX_BODY);
    if (!body || typeof body !== 'object' || Array.isArray(body)) { apiError(res, 400, 'State không hợp lệ.'); return; }
    const stateJson = JSON.stringify(body);
    if (Buffer.byteLength(stateJson) > MAX_BODY) { apiError(res, 413, 'State quá lớn.'); return; }
    db.prepare('UPDATE users SET state_json=?, state_updated=? WHERE id=?').run(stateJson, t, user.id);
    json(res, 200, { ok: true, updatedAt: t });
    return;
  }

  /* social */
  if (pathname === '/api/social' && method === 'GET') {
    const user = requireUser(req, res); if (!user) return;
    json(res, 200, { ok: true, ...socialPayload(user.id) });
    return;
  }

  if (pathname === '/api/friends/request' && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    if (!rateLimit(`${user.id}:friendreq`, 30, 3600_000)) { apiError(res, 429, 'Bạn gửi lời mời quá nhiều lần.'); return; }
    const body = await readJson(req, 8 * 1024);
    const username = cleanText(body.username, 24);
    const target = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!target) { apiError(res, 404, 'Không tìm thấy tài khoản này.'); return; }
    if (target.id === user.id) { apiError(res, 400, 'Không thể kết bạn với chính mình.'); return; }
    if (target.banned) { apiError(res, 403, 'Tài khoản này đang bị khóa.'); return; }
    const existing = friendshipBetween(user.id, target.id);
    if (existing) {
      if (existing.status === 'accepted') apiError(res, 409, 'Hai bạn đã là bạn bè rồi.');
      else apiError(res, 409, 'Đã có lời mời đang chờ xử lý.');
      return;
    }
    db.prepare('INSERT INTO friendships(pair_key,requester_id,addressee_id,status,friendship,created_at) VALUES(?,?,?,?,?,?)')
      .run(pairKey(user.id, target.id), user.id, target.id, 'pending', 0, t);
    json(res, 201, { ok: true, message: `Đã gửi lời mời kết bạn tới @${target.username}.` });
    return;
  }

  if (pathname === '/api/friends/respond' && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    const body = await readJson(req, 8 * 1024);
    const id = Number(body.id);
    const f = db.prepare('SELECT * FROM friendships WHERE id=?').get(id);
    if (!f || f.addressee_id !== user.id || f.status !== 'pending') { apiError(res, 404, 'Lời mời không tồn tại.'); return; }
    if (body.accept) {
      db.prepare('UPDATE friendships SET status=?, accepted_at=? WHERE id=?').run('accepted', t, id);
    } else {
      db.prepare('DELETE FROM friendships WHERE id=?').run(id);
    }
    json(res, 200, { ok: true, ...socialPayload(user.id) });
    return;
  }

  if (pathname === '/api/friends/remove' && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    const body = await readJson(req, 8 * 1024);
    const id = Number(body.id);
    const f = db.prepare('SELECT * FROM friendships WHERE id=?').get(id);
    if (!f || (f.requester_id !== user.id && f.addressee_id !== user.id)) { apiError(res, 404, 'Không tìm thấy quan hệ bạn bè.'); return; }
    db.prepare('DELETE FROM friendships WHERE id=?').run(id);
    json(res, 200, { ok: true, ...socialPayload(user.id) });
    return;
  }

  const friendActionMatch = pathname.match(/^\/api\/friends\/(\d+)\/(water|gift|chat)$/);
  if (friendActionMatch && method === 'POST') {
    const user = requireUser(req, res); if (!user) return;
    const targetId = Number(friendActionMatch[1]);
    const kind = friendActionMatch[2];
    if (!areFriends(user.id, targetId)) { apiError(res, 403, 'Hai bạn chưa phải bạn bè.'); return; }
    const target = db.prepare('SELECT * FROM users WHERE id=?').get(targetId);
    if (!target || target.banned) { apiError(res, 404, 'Người bạn này không còn hoạt động.'); return; }
    const day = dayKey();
    const action = db.prepare('SELECT * FROM friend_actions WHERE actor_id=? AND target_id=? AND day=?').get(user.id, targetId, day);
    const f = friendshipBetween(user.id, targetId);

    if (kind === 'water') {
      if (!rateLimit(`${user.id}:water`, 30, 60_000)) { apiError(res, 429, 'Tưới quá nhanh.'); return; }
      const body = await readJson(req, 4 * 1024);
      const index = Number(body.index);
      if (!Number.isInteger(index) || index < 0 || index > 5) { apiError(res, 400, 'Luống không hợp lệ.'); return; }
      const targetState = safeJsonParse(target.state_json, null);
      const plots = Array.isArray(targetState?.plots) ? targetState.plots : [];
      const p = plots[index];
      if (!p || !p.crop) { apiError(res, 400, 'Luống này không có cây để tưới.'); return; }
      const wateredPlots = safeJsonParse(action?.watered_plots, []);
      if (wateredPlots.includes(index)) { apiError(res, 409, 'Luống này hôm nay đã được bạn tưới.'); return; }
      if ((Number(action?.watered) || 0) >= 3) { apiError(res, 429, 'Hôm nay bạn đã giúp người này 3 luống rồi.'); return; }
      return json(res, 200, waterFriend(user, target, f, action, index, plots, wateredPlots, day));
    }

    if (kind === 'gift') {
      if (action?.gift) { apiError(res, 409, 'Hôm nay bạn đã nhận quà của người này.'); return; }
      if (!action) {
        db.prepare('INSERT INTO friend_actions(actor_id,target_id,day,watered,watered_plots,gift,updated_at) VALUES(?,?,?,?,?,?,?)')
          .run(user.id, targetId, day, 0, '[]', 1, t);
      } else {
        db.prepare('UPDATE friend_actions SET gift=1, updated_at=? WHERE id=?').run(t, action.id);
      }
      db.prepare('UPDATE friendships SET friendship=friendship+2 WHERE id=?').run(f.id);
      const updated = db.prepare('SELECT * FROM friendships WHERE id=?').get(f.id);
      json(res, 200, { ok: true, friend: friendPayload(updated, user.id) });
      return;
    }

    if (kind === 'chat') {
      if (!rateLimit(`${user.id}:chat`, 60, 60_000)) { apiError(res, 429, 'Gửi tin nhắn quá nhanh.'); return; }
      const body = await readJson(req, 8 * 1024);
      const text = cleanText(body.text, 500);
      if (!text) { apiError(res, 400, 'Tin nhắn rỗng.'); return; }
      db.prepare('INSERT INTO messages(from_id,to_id,body,created_at) VALUES(?,?,?,?)').run(user.id, targetId, text, t);
      json(res, 200, { ok: true, message: { from: user.id, to: targetId, body: text, createdAt: t } });
      return;
    }
  }

  if (pathname === '/api/messages' && method === 'GET') {
    const user = requireUser(req, res); if (!user) return;
    const withId = Number(url.searchParams.get('with'));
    if (!Number.isInteger(withId) || !areFriends(user.id, withId)) { apiError(res, 403, 'Chỉ xem tin nhắn với bạn bè.'); return; }
    const rows = db.prepare(`
      SELECT * FROM messages
      WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)
      ORDER BY created_at DESC LIMIT 50
    `).all(user.id, withId, withId, user.id).reverse();
    db.prepare('UPDATE messages SET read_at=? WHERE to_id=? AND from_id=? AND read_at IS NULL').run(t, user.id, withId);
    const other = db.prepare('SELECT * FROM users WHERE id=?').get(withId);
    json(res, 200, {
      ok: true,
      friend: { id: other.id, username: other.username, displayName: other.display_name, theme: other.theme },
      messages: rows.map(r => ({ id: r.id, from: r.from_id, to: r.to_id, body: r.body, createdAt: r.created_at, mine: r.from_id === user.id }))
    });
    return;
  }

  /* admin */
  if (pathname.startsWith('/api/admin/')) {
    const admin = requireAdmin(req, res); if (!admin) return;

    if (pathname === '/api/admin/stats' && method === 'GET') {
      json(res, 200, { ok: true, stats: adminStats(), capacity: capacityEstimate(10000, 0.15, 12) });
      return;
    }
    if (pathname === '/api/admin/capacity' && method === 'GET') {
      const dau = clamp(Number(url.searchParams.get('dau')) || 10000, 1000, 10_000_000);
      const concurrency = clamp(Number(url.searchParams.get('concurrency')) || 0.15, 0.02, 0.8);
      const req = clamp(Number(url.searchParams.get('req')) || 12, 2, 120);
      json(res, 200, { ok: true, model: capacityEstimate(dau, concurrency, req) });
      return;
    }
    if (pathname === '/api/admin/users' && method === 'GET') {
      const q = cleanText(url.searchParams.get('q') || '', 40);
      const limit = clamp(Number(url.searchParams.get('limit')) || 25, 1, 100);
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const where = q ? 'WHERE username LIKE ? OR display_name LIKE ?' : '';
      const args = q ? [`%${q}%`, `%${q}%`] : [];
      const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${where}`).get(...args).n;
      const rows = db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
      json(res, 200, {
        ok: true, total, limit, offset,
        users: rows.map(r => ({
          id: r.id, username: r.username, displayName: r.display_name, role: r.role,
          banned: !!r.banned, banReason: r.ban_reason || '', theme: r.theme,
          level: safeJsonParse(r.state_json, null)?.player?.level || 1,
          stateBytes: r.state_json ? Buffer.byteLength(r.state_json) : 0,
          createdAt: r.created_at, lastLogin: r.last_login, lastSeen: r.last_seen,
          online: r.last_seen > t - 120_000
        }))
      });
      return;
    }
    const userAdminMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/(ban|role|reset-password|delete)$/);
    if (userAdminMatch && method === 'POST') {
      const targetId = Number(userAdminMatch[1]);
      const action = userAdminMatch[2];
      const target = db.prepare('SELECT * FROM users WHERE id=?').get(targetId);
      if (!target) { apiError(res, 404, 'Không tìm thấy người dùng.'); return; }
      const body = await readJson(req, 8 * 1024);
      if (targetId === admin.id && action !== 'reset-password') { apiError(res, 400, 'Không thể tự khóa hoặc tự đổi quyền của mình.'); return; }
      if (action === 'delete') {
        if (target.role === 'admin') {
          const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n;
          if (adminCount <= 1) { apiError(res, 400, 'Không thể xóa quản trị viên cuối cùng.'); return; }
        }
        db.prepare('DELETE FROM audit_log WHERE target_user_id=?').run(targetId);
        db.prepare('DELETE FROM users WHERE id=?').run(targetId);
        for (const [k, v] of sessionCache) if (v.user.id === targetId) sessionCache.delete(k);
        audit(admin.id, 'delete_user', null, { deleted: targetId, username: target.username });
        json(res, 200, { ok: true, deleted: targetId });
        return;
      }
      if (action === 'ban') {
        const banned = !!body.banned;
        db.prepare('UPDATE users SET banned=?, ban_reason=? WHERE id=?').run(banned ? 1 : 0, banned ? cleanText(body.reason || 'Vi phạm nội quy', 200) : null, targetId);
        if (banned) {
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(targetId);
          for (const [k, v] of sessionCache) if (v.user.id === targetId) sessionCache.delete(k);
        }
        audit(admin.id, banned ? 'ban' : 'unban', targetId, { reason: body.reason || '' });
        json(res, 200, { ok: true });
        return;
      }
      if (action === 'role') {
        const role = body.role === 'admin' ? 'admin' : 'player';
        if (targetId === admin.id && role !== 'admin') { apiError(res, 400, 'Không thể tự hạ quyền.'); return; }
        if (target.role === 'admin' && role !== 'admin') {
          const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n;
          if (adminCount <= 1) { apiError(res, 400, 'Phải còn ít nhất một quản trị viên.'); return; }
        }
        db.prepare('UPDATE users SET role=? WHERE id=?').run(role, targetId);
        for (const [k, v] of sessionCache) if (v.user.id === targetId) sessionCache.delete(k);
        audit(admin.id, 'role', targetId, { role });
        json(res, 200, { ok: true });
        return;
      }
      if (action === 'reset-password') {
        const temp = 'NT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const { salt, hash } = hashPassword(temp);
        db.prepare('UPDATE users SET password_hash=?, password_salt=? WHERE id=?').run(hash, salt, targetId);
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(targetId);
        for (const [k, v] of sessionCache) if (v.user.id === targetId) sessionCache.delete(k);
        audit(admin.id, 'reset_password', targetId, {});
        json(res, 200, { ok: true, temporaryPassword: temp });
        return;
      }
    }
    if (pathname === '/api/admin/audit' && method === 'GET') {
      const rows = db.prepare(`
        SELECT a.*, u.username AS admin_name, t.username AS target_name
        FROM audit_log a
        LEFT JOIN users u ON u.id=a.admin_id
        LEFT JOIN users t ON t.id=a.target_user_id
        ORDER BY a.id DESC LIMIT 100
      `).all();
      json(res, 200, { ok: true, audit: rows });
      return;
    }
    apiError(res, 404, 'API admin không tồn tại.');
    return;
  }

  apiError(res, 404, 'API không tồn tại.');
}

function waterFriend(user, target, f, action, index, plots, wateredPlots, day) {
  const t = now();
  const p = plots[index];
  const nextPlots = plots.slice();
  const nextPlot = { ...p, watered: true, progress: Math.min(1, (Number(p.progress) || 0) + 0.04) };
  // Đẩy startedAt lùi lại để chủ vườn cũng thấy cây lớn lên, vì client tự tính
  // tiến độ từ startedAt/growMs chứ không đọc progress đã lưu.
  if (p.crop && Number(p.startedAt) > 0 && Number(p.growMs) > 0) {
    nextPlot.startedAt = Math.max(0, Number(p.startedAt) - Number(p.growMs) * 0.04);
  }
  nextPlots[index] = nextPlot;
  const targetState = safeJsonParse(target.state_json, {});
  targetState.plots = nextPlots.slice(0, 12);
  const newPlots = wateredPlots.concat(index);
  db.prepare('UPDATE users SET state_json=?, state_updated=? WHERE id=?').run(JSON.stringify(targetState), t, target.id);
  if (!action) {
    db.prepare('INSERT INTO friend_actions(actor_id,target_id,day,watered,watered_plots,gift,updated_at) VALUES(?,?,?,?,?,?,?)')
      .run(user.id, target.id, day, 1, JSON.stringify(newPlots), 0, t);
  } else {
    db.prepare('UPDATE friend_actions SET watered=watered+1, watered_plots=?, updated_at=? WHERE id=?')
      .run(JSON.stringify(newPlots), t, action.id);
  }
  db.prepare('UPDATE friendships SET friendship=friendship+1 WHERE id=?').run(f.id);
  const updated = db.prepare('SELECT * FROM friendships WHERE id=?').get(f.id);
  return { ok: true, friend: friendPayload(updated, user.id), watered: newPlots.length };
}

/* ---------------- static files ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};
function isPublicPath(pathname) {
  if (pathname === '/') return true;
  if (pathname === '/index.html' || pathname === '/admin.html' || pathname === '/README.md' || pathname === '/favicon.ico') return true;
  return pathname.startsWith('/assets/') || pathname.startsWith('/screenshots/') || pathname.startsWith('/docs/');
}
function serveStatic(req, res, pathname) {
  if (!isPublicPath(pathname)) { res.writeHead(404); res.end('Not found'); return; }
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(ROOT, '.' + rel);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy trang.');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const isHtml = ext === '.html';
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': rel === '/index.html' ? 'strict-origin-when-cross-origin' : 'same-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': isHtml ? 'no-store' : 'no-cache'
  };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

/* ---------------- bootstrap ---------------- */
function ensureAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (existing) return;
  let username = cleanText(process.env.ADMIN_USERNAME || 'admin', 24);
  if (!validUsername(username)) username = 'admin';
  let password = process.env.ADMIN_PASSWORD;
  const generated = !password;
  if (!password) password = randomToken(12).replace(/[-_]/g, '').slice(0, 14) + 'Aa1!';
  const existingUser = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existingUser) return;
  const { salt, hash } = hashPassword(password);
  const info = db.prepare('INSERT INTO users(username,display_name,password_hash,password_salt,role,theme,created_at,last_seen) VALUES(?,?,?,?,?,?,?,?)')
    .run(username, 'Quản trị viên', hash, salt, 'admin', 'lavender', now(), now());
  const text = `Nông Trại Vui Vẻ — tài khoản quản trị\nUsername: ${username}\nPassword: ${password}\nTạo lúc: ${new Date().toISOString()}\n${generated ? 'Mật khẩu được tạo tự động. Hãy đổi sau khi đăng nhập (hoặc đặt ADMIN_PASSWORD).' : 'Mật khẩu lấy từ biến môi trường ADMIN_PASSWORD.'}\n`;
  fs.writeFileSync(ADMIN_CRED_PATH, text, { mode: 0o600 });
  console.log('\n=== TÀI KHOẢN ADMIN ===');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log(`Đã lưu: ${ADMIN_CRED_PATH}\n`);
}
ensureAdmin();

const server = http.createServer(async (req, res) => {
  const started = now();
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, url);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, pathname);
    } else {
      res.writeHead(405); res.end('Method not allowed');
    }
  } catch (err) {
    metrics.errors++;
    const status = err.status || 500;
    if (status >= 500) console.error('[server]', err);
    if (!res.headersSent) apiError(res, status, status >= 500 ? 'Máy chủ gặp lỗi.' : err.message);
    else try { res.end(); } catch {}
  } finally {
    if (process.env.LOG_REQUESTS) console.log(`${req.method} ${req.url} ${res.statusCode} ${now() - started}ms`);
  }
});
server.requestTimeout = 20_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.listen(PORT, HOST, () => {
  console.log(`Nông Trại Vui Vẻ server: http://${HOST}:${PORT}`);
  console.log(`SQLite: ${DB_PATH}`);
});
process.on('SIGINT', () => { try { db.close(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { try { db.close(); } catch {} process.exit(0); });
setInterval(() => {
  const cutoff = now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(cutoff);
  for (const [k, v] of sessionCache) if (v.expiresAt < cutoff) sessionCache.delete(k);
}, 3600_000).unref();
