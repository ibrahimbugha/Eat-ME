'use strict';
const express = require('express');
const crypto = require('crypto');
const path = require('path');

/* ---------- game economy rules (the server is the boss) ---------- */
const FOOD_PRICE = [0, 0, 0, 0, 150, 200, 250, 300, 350, 400, 450, 500];
const PERMS = {
  hp:    { base: 200, max: 3 },
  dmg:   { base: 150, max: 10 },
  coin:  { base: 150, max: 10 },
  start: { base: 120, max: 5 },
  cd:    { base: 150, max: 10 }
};
const permCost = (k, lvl) => Math.round(PERMS[k].base * (1 + 0.6 * lvl));
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const today = (d = new Date()) => d.toISOString().slice(0, 10);
const yesterday = () => today(new Date(Date.now() - 864e5));

/* ---------- storage: Postgres on Render, memory when testing locally ---------- */
function newData() {
  return { bank: 0, un: FOOD_PRICE.map(p => (p === 0 ? 1 : 0)), perm: { hp: 0, dmg: 0, coin: 0, start: 0, cd: 0 }, xp: {}, lastDaily: '', streak: 0, lastRun: 0 };
}
let store;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : false, max: 5 });
  store = {
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL,
        data JSONB NOT NULL, best INT NOT NULL DEFAULT 0, wins INT NOT NULL DEFAULT 0,
        created TIMESTAMPTZ NOT NULL DEFAULT now())`);
    },
    async byName(n) { const r = await pool.query('SELECT * FROM users WHERE username=$1', [n.toLowerCase()]); return r.rows[0] || null; },
    async create(n, pass) {
      try { const r = await pool.query('INSERT INTO users(username,pass,data) VALUES($1,$2,$3) RETURNING *', [n.toLowerCase(), pass, newData()]); return r.rows[0]; }
      catch (e) { if (e.code === '23505') return null; throw e; }
    },
    async mutate(id, fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [id]);
        const u = r.rows[0]; if (!u) { await c.query('ROLLBACK'); return null; }
        const out = fn(u);
        await c.query('UPDATE users SET data=$2,best=$3,wins=$4 WHERE id=$1', [id, u.data, u.best, u.wins]);
        await c.query('COMMIT');
        return { user: u, out };
      } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
    },
    async top(n) { const r = await pool.query('SELECT username,best,wins FROM users WHERE best>0 ORDER BY best DESC, wins DESC LIMIT $1', [n]); return r.rows; }
  };
} else {
  const users = new Map(); let seq = 1;
  store = {
    async init() {},
    async byName(n) { return [...users.values()].find(u => u.username === n.toLowerCase()) || null; },
    async create(n, pass) { if (await this.byName(n)) return null; const u = { id: seq++, username: n.toLowerCase(), pass, data: newData(), best: 0, wins: 0 }; users.set(u.id, u); return u; },
    async mutate(id, fn) { const u = users.get(id); if (!u) return null; return { user: u, out: fn(u) }; },
    async top(n) { return [...users.values()].filter(u => u.best > 0).sort((a, b) => b.best - a.best || b.wins - a.wins).slice(0, n).map(u => ({ username: u.username, best: u.best, wins: u.wins })); }
  };
}

/* ---------- passwords and tokens (built-in crypto, no extra packages) ---------- */
function hashPass(pw) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex'); }
function checkPass(pw, stored) {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(crypto.scryptSync(pw, salt, 32).toString('hex')), b = Buffer.from(h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const b64 = s => Buffer.from(s).toString('base64url');
function sign(id) { const p = b64(JSON.stringify({ id, exp: Date.now() + 30 * 864e5 })); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('base64url'); }
function verify(t) {
  if (!t || !t.includes('.')) return null;
  const [p, s] = t.split('.');
  const good = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o.id : null; } catch (e) { return null; }
}

/* ---------- profile the game receives ---------- */
function dailyReward(d) { const streak = d.lastDaily === yesterday() ? d.streak + 1 : 1; return { streak, reward: 50 + 25 * Math.min(streak - 1, 8) }; }
function profile(u) {
  const d = u.data, costs = {};
  for (const k of Object.keys(PERMS)) costs[k] = permCost(k, d.perm[k] || 0);
  const ready = d.lastDaily !== today();
  return { username: u.username, bank: d.bank, un: d.un, perm: d.perm, xp: d.xp, best: u.best, wins: u.wins, streak: d.streak, dailyReady: ready, dailyReward: ready ? dailyReward(d).reward : 0, costs, prices: FOOD_PRICE };
}

/* ---------- web server ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const hits = new Map();
function limit(max, ms) {
  return (req, res, next) => {
    const k = req.ip + req.path, now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < ms);
    if (a.length >= max) return res.status(429).json({ error: 'Too many tries. Wait a minute.' });
    a.push(now); hits.set(k, a); next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some(t => now - t < 120000)) hits.delete(k); }, 60000).unref();

const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });
const auth = fn => wrap(async (req, res) => {
  const id = verify((req.headers.authorization || '').replace('Bearer ', ''));
  if (!id) return res.status(401).json({ error: 'Please log in again' });
  await fn(req, res, id);
});
const validName = n => typeof n === 'string' && /^[A-Za-z0-9_]{3,16}$/.test(n);
const validPass = p => typeof p === 'string' && p.length >= 6 && p.length <= 64;

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/register', limit(8, 60000), wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!validName(username)) return res.status(400).json({ error: 'Username: 3 to 16 letters, numbers or _' });
  if (!validPass(password)) return res.status(400).json({ error: 'Password: 6 to 64 characters' });
  const u = await store.create(username, hashPass(password));
  if (!u) return res.status(409).json({ error: 'That username is taken' });
  res.json({ token: sign(u.id), profile: profile(u) });
}));

app.post('/api/login', limit(12, 60000), wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const u = typeof username === 'string' && typeof password === 'string' ? await store.byName(username) : null;
  if (!u || !checkPass(password, u.pass)) return res.status(401).json({ error: 'Wrong username or password' });
  res.json({ token: sign(u.id), profile: profile(u) });
}));

app.get('/api/me', auth(async (req, res, id) => {
  const r = await store.mutate(id, u => u);
  if (!r) return res.status(401).json({ error: 'Please log in again' });
  res.json({ profile: profile(r.user) });
}));

app.post('/api/run', limit(20, 60000), auth(async (req, res, id) => {
  const b = req.body || {};
  const wave = Math.max(0, Math.min(60, Math.floor(+b.wave || 0)));
  const kills = Math.max(0, Math.min(2000, Math.floor(+b.kills || 0)));
  const secs = Math.max(0, Math.min(7200, Math.floor(+b.secs || 0)));
  const won = !!b.won && b.mode === 'story' && wave >= 20;
  const foods = Array.isArray(b.foods) ? [...new Set(b.foods.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < FOOD_PRICE.length))].slice(0, 2) : [];
  const r = await store.mutate(id, u => {
    const d = u.data, now = Date.now();
    if (now - (d.lastRun || 0) < 15000) return { err: 'Slow down: runs can only be saved every 15 seconds' };
    if (wave < 1 || secs < wave * 6) return { err: 'That run was too short to count' };
    const gain = Math.max(0, Math.min(Math.floor(+b.coins || 0), wave * 160 + 300, secs * 12 + 100)) + (won ? 200 : 0);
    d.bank += gain; d.lastRun = now;
    const xp = Math.min(400, kills + wave * 5);
    for (const fi of foods) { if (!d.un[fi]) continue; const key = String(fi); d.xp[key] = (d.xp[key] || 0) + xp; }
    u.best = Math.max(u.best, wave); if (won) u.wins += 1;
    return { gain, xp };
  });
  if (!r) return res.status(401).json({ error: 'Please log in again' });
  if (r.out.err) return res.status(400).json({ error: r.out.err });
  res.json({ gain: r.out.gain, xp: r.out.xp, profile: profile(r.user) });
}));

app.post('/api/unlock', auth(async (req, res, id) => {
  const fi = Number((req.body || {}).food);
  if (!Number.isInteger(fi) || fi < 0 || fi >= FOOD_PRICE.length) return res.status(400).json({ error: 'Unknown food' });
  const r = await store.mutate(id, u => {
    const d = u.data;
    if (d.un[fi]) return { err: 'Already unlocked' };
    if (d.bank < FOOD_PRICE[fi]) return { err: 'Not enough coins' };
    d.bank -= FOOD_PRICE[fi]; d.un[fi] = 1; return {};
  });
  if (!r) return res.status(401).json({ error: 'Please log in again' });
  if (r.out.err) return res.status(400).json({ error: r.out.err });
  res.json({ profile: profile(r.user) });
}));

app.post('/api/perm', auth(async (req, res, id) => {
  const k = (req.body || {}).key;
  if (!Object.prototype.hasOwnProperty.call(PERMS, k)) return res.status(400).json({ error: 'Unknown upgrade' });
  const r = await store.mutate(id, u => {
    const d = u.data, lvl = d.perm[k] || 0;
    if (lvl >= PERMS[k].max) return { err: 'Already maxed' };
    const c = permCost(k, lvl);
    if (d.bank < c) return { err: 'Not enough coins' };
    d.bank -= c; d.perm[k] = lvl + 1; return {};
  });
  if (!r) return res.status(401).json({ error: 'Please log in again' });
  if (r.out.err) return res.status(400).json({ error: r.out.err });
  res.json({ profile: profile(r.user) });
}));

app.post('/api/daily', auth(async (req, res, id) => {
  const r = await store.mutate(id, u => {
    const d = u.data;
    if (d.lastDaily === today()) return { err: 'Already claimed today. Come back tomorrow!' };
    const { streak, reward } = dailyReward(d);
    d.bank += reward; d.streak = streak; d.lastDaily = today();
    return { reward, streak };
  });
  if (!r) return res.status(401).json({ error: 'Please log in again' });
  if (r.out.err) return res.status(400).json({ error: r.out.err });
  res.json({ reward: r.out.reward, streak: r.out.streak, profile: profile(r.user) });
}));

app.get('/api/leaderboard', wrap(async (req, res) => { res.json({ rows: await store.top(10) }); }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m' }));

const PORT = process.env.PORT || 3000;
store.init().then(() => app.listen(PORT, () => console.log('Don\'t Eat Me server on ' + PORT))).catch(e => { console.error(e); process.exit(1); });
