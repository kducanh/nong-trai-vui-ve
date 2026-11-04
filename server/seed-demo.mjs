/*
 * Tạo dữ liệu demo: Lan, Minh, Hoa + tình bạn + tin nhắn mẫu.
 * Chạy sau khi server đã khởi động:
 *   npm run seed:demo
 * Script có thể chạy lại: chỉ tạo phần còn thiếu, không ghi đè save đã có.
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8123').replace(/\/$/, '');
const DEMO_PASSWORD = 'Demo@12345';
const jars = new Map();

async function request(path, { method = 'GET', body, who = 'anon' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookie = jars.get(who);
  if (cookie) headers.Cookie = cookie;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (err) {
    throw new Error(`Không kết nối được ${BASE}. Hãy chạy "npm start" trước. (${err.message})`);
  }
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
    const v = c.split(';')[0];
    if (v.startsWith('nt_sid=')) jars.set(who, v);
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e = new Error(data.error || `HTTP ${res.status}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

function stateFor(name, coins, level, crops) {
  const now = Date.now();
  const plots = Array.from({ length: 12 }, (_, i) => {
    const crop = crops[i] || null;
    if (!crop) return { tilled: i < 8, crop: null, startedAt: 0, growMs: 0, watered: false, fertilized: false, progress: 0 };
    return {
      tilled: true, crop,
      startedAt: now - 30000 - i * 4000,
      growMs: 75000,
      watered: i % 2 === 0,
      fertilized: false,
      progress: 0.55
    };
  });
  return {
    version: 1,
    createdAt: now - 86400000 * 3,
    savedAt: now,
    player: { name, coins, xp: level * 80, level, energy: 45 + (level - 1) * 5, energyTs: now },
    ui: { tool: 'hoe', seed: 'carrot' },
    flags: { started: true, welcomeSeen: true },
    settings: { sound: true, music: true },
    plots,
    seeds: { carrot: 4, tomato: 2, corn: 1 },
    inventory: { fertilizer: 2, hay: 3 },
    animals: [
      { id: 'cow', type: 'cow', name: 'Bò Sữa', x: 804, y: 322, homeX: 804, homeY: 322, dir: -1, phase: 0.4, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: now + 2600, targetX: 804, targetY: 322 },
      { id: 'hen1', type: 'chicken', name: 'Gà Mơ', x: 758, y: 344, homeX: 758, homeY: 344, dir: 1, phase: 1.7, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: now + 3600, targetX: 758, targetY: 344 },
      { id: 'hen2', type: 'chicken', name: 'Gà Bông', x: 878, y: 346, homeX: 878, homeY: 346, dir: -1, phase: 3.2, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: now + 5200, targetX: 878, targetY: 346 }
    ],
    tree: { readyAt: now - 1000, shakeUntil: 0 },
    mail: { lastClaim: 0 },
    friends: {},
    quests: { chainIndex: 1, chainProgress: 2, chainDone: false, dailyDate: '', daily: [], dailyProgress: [] },
    stats: { till: 3, plant: 8, water: 12, harvest: 5, sell: 3, feed: 2, fish: 1, buySeed: 4 }
  };
}

const specs = [
  ['lan', 'Lan', 680, 3, ['strawberry', 'carrot', 'tomato', 'sunflower', 'corn']],
  ['minh', 'Minh', 520, 4, ['corn', 'pumpkin', 'carrot', 'tomato', 'strawberry']],
  ['hoa', 'Hoa', 260, 2, ['carrot', 'tomato', 'corn', null, null]]
];

async function ensureUser(username, displayName, state) {
  let data;
  try {
    data = await request('/api/auth/register', {
      method: 'POST',
      who: username,
      body: { username, displayName, password: DEMO_PASSWORD }
    });
    console.log(`+ tạo tài khoản ${username}`);
  } catch (e) {
    if (e.status !== 409) throw e;
    data = await request('/api/auth/login', {
      method: 'POST',
      who: username,
      body: { username, password: DEMO_PASSWORD }
    });
    console.log(`= đã có tài khoản ${username}`);
  }
  const current = await request('/api/game/state', { who: username });
  if (!current.state) {
    await request('/api/game/state', { method: 'PUT', who: username, body: state });
    console.log(`  ↳ tạo save game mẫu`);
  }
  return data.user;
}

async function main() {
  console.log(`Seed demo vào ${BASE}`);
  const users = {};
  for (const [u, name, coins, level, crops] of specs) {
    users[u] = await ensureUser(u, name, stateFor(name, coins, level, crops));
  }

  // Lan <-> Minh
  let lanSocial = await request('/api/social', { who: 'lan' });
  let minhSocial = await request('/api/social', { who: 'minh' });
  let lanMinh = lanSocial.friends.find(f => f.username === 'minh') || minhSocial.friends.find(f => f.username === 'lan');
  if (!lanMinh) {
    let pending = false;
    if (!lanSocial.outgoing.some(o => o.to.username === 'minh')) {
      try {
        await request('/api/friends/request', { method: 'POST', who: 'lan', body: { username: 'minh' } });
        pending = true;
      } catch (e) { if (e.status !== 409) throw e; pending = true; }
    }
    minhSocial = await request('/api/social', { who: 'minh' });
    const incoming = minhSocial.incoming.find(r => r.from.username === 'lan');
    if (incoming) {
      await request('/api/friends/respond', { method: 'POST', who: 'minh', body: { id: incoming.id, accept: true } });
      console.log('+ kết bạn Lan ↔ Minh');
    } else if (pending) {
      console.log('… lời mời Lan → Minh đang chờ (có thể đã được xử lý)');
    }
  } else {
    console.log('= Lan và Minh đã là bạn');
  }

  // Hoa gửi lời mời cho Lan (để demo thông báo)
  lanSocial = await request('/api/social', { who: 'lan' });
  const hoaRel = lanSocial.incoming.find(r => r.from.username === 'hoa')
    || lanSocial.friends.find(f => f.username === 'hoa')
    || lanSocial.outgoing.find(o => o.to.username === 'hoa');
  if (!hoaRel) {
    try {
      await request('/api/friends/request', { method: 'POST', who: 'hoa', body: { username: 'lan' } });
      console.log('+ Hoa gửi lời mời kết bạn cho Lan');
    } catch (e) { if (e.status !== 409) throw e; }
  } else {
    console.log('= quan hệ Hoa → Lan đã tồn tại');
  }

  // Tin nhắn mẫu
  lanSocial = await request('/api/social', { who: 'lan' });
  const minhFriend = lanSocial.friends.find(f => f.username === 'minh');
  if (minhFriend) {
    const msgs = await request(`/api/messages?with=${minhFriend.id}`, { who: 'lan' });
    if (!msgs.messages.length) {
      await request(`/api/friends/${minhFriend.id}/chat`, {
        method: 'POST', who: 'lan',
        body: { text: 'Chào Minh, mình ghé vườn tưới giúp nhé!' }
      });
      const lanId = users.lan.id;
      await request(`/api/friends/${lanId}/chat`, {
        method: 'POST', who: 'minh',
        body: { text: 'Cảm ơn Lan nhiều! Vườn dâu nhà mình sắp chín rồi.' }
      });
      console.log('+ tạo tin nhắn mẫu Lan ↔ Minh');
    }
  }

  console.log('\nXong. Tài khoản demo:');
  console.log('  lan  / Demo@12345');
  console.log('  minh / Demo@12345');
  console.log('  hoa  / Demo@12345');
  console.log('  admin / xem server/data/admin-credentials.txt');
}

main().catch(err => {
  console.error('Seed thất bại:', err.message);
  process.exitCode = 1;
});
