/* =========================================================
   NÔNG TRẠI VUI VẺ — luật chơi, giao diện, vòng lặp
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const now = () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n));

  const stage = $('#stage');
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const visitScreen = $('#visitScreen');
  const friendCanvas = $('#friendCanvas');
  const friendCtx = friendCanvas.getContext('2d');
  const areaPage = $('#areaPage');
  const plazaPage = $('#plazaPage');
  const areaCanvas = $('#areaCanvas');
  const areaCtx = areaCanvas.getContext('2d');
  const areaDock = $('#areaDock');
  const areaTitle = $('#areaTitle');
  const areaKicker = $('#areaKicker');
  const areaSubtitle = $('#areaSubtitle');
  const areaRes = $('#areaRes');
  const RENDER_SCALE = 1.5;
  let visitOpen = false;
  let farmArea = 'garden';
  let selectedAnimalId = 'cow';
  let areaRefreshTimer = null;
  let visitFriendId = 'lan';
  let friendSpeech = null;
  let friendHoverIndex = -1;
  let friendParticles = [];
  const L = ART.layout;
  const startScreen = $('#startScreen');
  const tooltipEl = $('#tooltip');
  const modalRoot = $('#modalRoot');
  const modalPanel = $('#modalPanel');
  const toastsEl = $('#toasts');

  const KEY = 'nongtrai.vui.ve.save.v1';
  const VERSION = 1;
  const REGEN_MS = 8500;
  const MAIL_COOLDOWN = 20 * 3600 * 1000;
  const TREE_COOLDOWN = 75 * 1000;
  const params = new URLSearchParams(location.search);
  const AUTO_PLAY = params.has('play');
  const FRESH = params.has('fresh');

  /* =========================================================
     Dữ liệu game
     ========================================================= */
  const CROPS = {
    carrot: { name: 'Cà rốt', price: 12, sell: 30, grow: 30, xp: 5, yield: 2, unlock: 1, blurb: 'Ngọt giòn, dễ trồng, lớn nhanh.' },
    tomato: { name: 'Cà chua', price: 22, sell: 60, grow: 45, xp: 8, yield: 2, unlock: 1, blurb: 'Đỏ mọng, bán được giá tốt.' },
    corn: { name: 'Bắp', price: 35, sell: 90, grow: 60, xp: 12, yield: 2, unlock: 2, blurb: 'Cây cao, hạt vàng, cho năng suất.' },
    strawberry: { name: 'Dâu tây', price: 55, sell: 140, grow: 75, xp: 16, yield: 3, unlock: 3, blurb: 'Mọng nước, thơm ngọt, được giá.' },
    sunflower: { name: 'Hướng dương', price: 70, sell: 175, grow: 90, xp: 20, yield: 2, unlock: 4, blurb: 'Khoe sắc vàng, ong bướm ghé thăm.' },
    pumpkin: { name: 'Bí ngô', price: 95, sell: 240, grow: 110, xp: 28, yield: 1, unlock: 5, blurb: 'Quả to, chín chậm nhưng rất có lời.' }
  };
  const CROP_IDS = Object.keys(CROPS);

  const GOODS = {}
  CROP_IDS.forEach(id => {
    GOODS[id] = { name: CROPS[id].name, sell: CROPS[id].sell, icon: id, crop: true };
  });
  Object.assign(GOODS, {
    milk: { name: 'Sữa bò', sell: 80, icon: 'milk' },
    egg: { name: 'Trứng gà', sell: 45, icon: 'egg' },
    fish: { name: 'Cá chép', sell: 65, icon: 'fish' },
    goldfish: { name: 'Cá vàng', sell: 130, icon: 'goldfish' },
    apple: { name: 'Táo đỏ', sell: 25, icon: 'apple' }
  });
  const GOOD_IDS = Object.keys(GOODS);

  const SUPPLIES = {
    fertilizer: { name: 'Phân bón', price: 25, icon: 'fertilizer', blurb: 'Thêm 1 nông sản khi thu hoạch.' },
    hay: { name: 'Cỏ khô', price: 12, icon: 'hay', blurb: 'Cho bò và gà ăn no.' }
  };
  const ENERGY_ITEM = { name: 'Nước tăng lực', price: 150, icon: 'energy', blurb: 'Hồi ngay 15 năng lượng.' };

  const FRIENDS = {
    lan: {
      id: 'lan', name: 'Lan', level: 6, emoji: '👩‍🌾', theme: 'peach',
      greeting: 'Vườn dâu nhà mình sắp chín rồi, ghé tưới giúp với nhé!',
      color: '#ff9b86'
    },
    minh: {
      id: 'minh', name: 'Minh', level: 8, emoji: '🧑‍🌾', theme: 'mint',
      greeting: 'Mình mới trồng thêm bắp. Cảm ơn bạn ghé thăm nha!',
      color: '#65b8d9'
    },
    batu: {
      id: 'batu', name: 'Bà Tư', level: 12, emoji: '👵', theme: 'lavender',
      greeting: 'Cháu đến chơi à? Bà có ít hạt giống mới, lát nhớ nhận quà nhé.',
      color: '#b69be8'
    }
  };
  const FRIEND_ORDER = ['lan', 'minh', 'batu'];
  const DEMO_FRIEND_IDS = ['lan', 'minh', 'batu'];
  let realFriendIds = [];
  const FRIEND_PLOTS = {
    lan: [
      { crop: 'strawberry', progress: 0.82 }, { crop: 'carrot', progress: 0.58 },
      { crop: 'tomato', progress: 0.38 }, { crop: 'sunflower', progress: 0.7 },
      { crop: 'corn', progress: 0.48 }, { crop: null, progress: 0 }
    ],
    minh: [
      { crop: 'corn', progress: 0.9 }, { crop: 'pumpkin', progress: 0.45 },
      { crop: 'carrot', progress: 0.66 }, { crop: 'tomato', progress: 0.8 },
      { crop: 'strawberry', progress: 0.3 }, { crop: null, progress: 0 }
    ],
    batu: [
      { crop: 'sunflower', progress: 0.86 }, { crop: 'pumpkin', progress: 0.62 },
      { crop: 'tomato', progress: 0.72 }, { crop: 'corn', progress: 0.42 },
      { crop: 'carrot', progress: 0.95 }, { crop: null, progress: 0 }
    ]
  };

  const LEVELS = [0, 60, 160, 320, 560, 900, 1320, 1850, 2500, 3300];
  const TOOL_KEYS = ['hand', 'hoe', 'seed', 'water', 'fertilize', 'harvest'];
  const TOOL_NAMES = {
    hand: 'Bàn tay', hoe: 'Cái cuốc', seed: 'Gieo hạt', water: 'Tưới nước',
    fertilize: 'Bón phân', harvest: 'Thu hoạch'
  };

  const CHAIN = [
    { id: 'q1', type: 'till', need: 2, title: 'Cuốc 2 ô đất', reward: { coins: 40, xp: 10 } },
    { id: 'q2', type: 'plant', crop: 'carrot', need: 2, title: 'Gieo 2 hạt cà rốt', reward: { coins: 50, xp: 15, seeds: { carrot: 2 } } },
    { id: 'q3', type: 'water', need: 2, title: 'Tưới nước 2 ô', reward: { coins: 40, xp: 10, items: { fertilizer: 1 } } },
    { id: 'q4', type: 'harvest', need: 2, title: 'Thu hoạch 2 cây', reward: { coins: 80, xp: 20 } },
    { id: 'q5', type: 'sell', need: 3, title: 'Bán 3 nông sản', reward: { coins: 60, xp: 15 } },
    { id: 'q6', type: 'buySeed', need: 1, title: 'Mua 1 gói hạt giống', reward: { coins: 30, xp: 10 } },
    { id: 'q7', type: 'feed', need: 1, title: 'Cho vật nuôi ăn', reward: { coins: 100, xp: 25, seeds: { corn: 2 } } },
    { id: 'q8', type: 'fish', need: 1, title: 'Câu được 1 con cá', reward: { coins: 80, xp: 20 } },
    { id: 'q9', type: 'level', need: 2, title: 'Đạt cấp 2', reward: { coins: 150, items: { fertilizer: 2 } } }
  ];
  const DAILY_POOL = [
    { type: 'harvest', need: 6, title: 'Thu hoạch 6 cây', reward: { coins: 120, xp: 25 } },
    { type: 'water', need: 5, title: 'Tưới 5 ô đất', reward: { coins: 90, xp: 15 } },
    { type: 'sell', need: 6, title: 'Bán 6 nông sản', reward: { coins: 110, xp: 20 } },
    { type: 'feed', need: 2, title: 'Cho vật nuôi ăn 2 lần', reward: { coins: 100, xp: 20 } },
    { type: 'fish', need: 2, title: 'Câu 2 con cá', reward: { coins: 130, xp: 25 } },
    { type: 'plant', need: 4, title: 'Gieo 4 hạt giống', reward: { coins: 95, xp: 18 } }
  ];

  function dayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function energyMax(level) { return 45 + (Math.max(1, level) - 1) * 5; }

  function freshFriends() {
    const out = {};
    DEMO_FRIEND_IDS.forEach((id, i) => {
      out[id] = {
        friendship: 8 + i * 6,
        wateredDate: '',
        watered: 0,
        giftDate: '',
        plots: FRIEND_PLOTS[id].map(p => ({ crop: p.crop, progress: p.progress, watered: false }))
      };
    });
    return out;
  }

  function fresh() {
    const t = now();
    const plots = Array.from({ length: 12 }, (_, i) => ({
      unlocked: LAND.initiallyUnlocked(i), tilled: false, crop: null, startedAt: 0, growMs: 0, watered: false, fertilized: false, progress: 0
    }));
    const animals = [
      { id: 'cow', type: 'cow', name: 'Bò Sữa', x: 804, y: 322, homeX: 804, homeY: 322, dir: -1, phase: 0.4, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: t + 2600, targetX: 804, targetY: 322 },
      { id: 'hen1', type: 'chicken', name: 'Gà Mơ', x: 758, y: 344, homeX: 758, homeY: 344, dir: 1, phase: 1.7, variant: 0, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: t + 3600, targetX: 758, targetY: 344 },
      { id: 'hen2', type: 'chicken', name: 'Gà Bông', x: 878, y: 346, homeX: 878, homeY: 346, dir: -1, phase: 3.2, variant: 1, state: 'hungry', fedAt: 0, readyAt: 0, moving: false, waitUntil: t + 5200, targetX: 878, targetY: 346 }
    ];
    return {
      version: VERSION,
      createdAt: t,
      savedAt: 0,
      player: { name: 'Bé Nông', coins: 320, xp: 0, level: 1, energy: 45, energyTs: t },
      ui: { tool: 'hoe', seed: 'carrot' },
      flags: { started: false, welcomeSeen: false },
      settings: { sound: true, music: true },
      plots,
      seeds: { carrot: 4, tomato: 2 },
      inventory: { fertilizer: 2, hay: 3 },
      animals,
      tree: { readyAt: 0, shakeUntil: 0 },
      mail: { lastClaim: 0 },
      friends: freshFriends(),
      quests: { chainIndex: 0, chainProgress: 0, chainDone: false, dailyDate: '', daily: [], dailyProgress: [] },
      stats: { till: 0, plant: 0, water: 0, harvest: 0, sell: 0, feed: 0, fish: 0, buySeed: 0 }
    };
  }

  function normalize(saved) {
    const s = fresh();
    s.createdAt = saved.createdAt || s.createdAt;
    s.player = Object.assign({}, s.player, saved.player || {});
    s.player.level = clamp(Math.round(s.player.level || 1), 1, 10);
    s.player.coins = Math.max(0, Math.round(s.player.coins || 0));
    s.player.xp = Math.max(0, s.player.xp || 0);
    s.player.name = s.player.name || 'Bé Nông';
    s.ui = Object.assign({}, s.ui, saved.ui || {});
    if (!TOOL_KEYS.includes(s.ui.tool)) s.ui.tool = 'hoe';
    if (!CROPS[s.ui.seed] || CROPS[s.ui.seed].unlock > s.player.level) s.ui.seed = 'carrot';
    s.flags = Object.assign({}, s.flags, saved.flags || {});
    s.settings = Object.assign({}, s.settings, saved.settings || {});
    s.stats = Object.assign({}, s.stats, saved.stats || {});
    s.inventory = Object.assign({}, s.inventory, saved.inventory || {});
    s.seeds = Object.assign({}, s.seeds, saved.seeds || {});
    s.tree = Object.assign({}, s.tree, saved.tree || {});
    s.mail = Object.assign({}, s.mail, saved.mail || {});
    s.friends = freshFriends();
    Object.keys(saved.friends || {}).forEach(id => {
      const sf = saved.friends[id];
      if (!sf) return;
      if (FRIEND_PLOTS[id]) {
        s.friends[id] = Object.assign({}, s.friends[id], sf);
        s.friends[id].plots = FRIEND_PLOTS[id].map((base, i) => {
          const sp = sf.plots && sf.plots[i];
          return Object.assign({ crop: base.crop, progress: base.progress, watered: false }, sp || {});
        });
      } else {
        // Bạn thật: dữ liệu sẽ được đồng bộ lại từ API social, nhưng vẫn giữ
        // bản lưu gần nhất để không mất trạng thái khi tải lại.
        s.friends[id] = Object.assign({}, sf);
        s.friends[id].plots = Array.from({ length: 6 }, (_, i) => {
          const sp = sf.plots && sf.plots[i];
          return Object.assign({ crop: null, progress: 0, watered: false }, sp || {});
        });
      }
    });
    s.plots = Array.from({ length: 12 }, (_, i) => {
      const p = LAND.normalizePlot(Object.assign({}, s.plots[i], (saved.plots && saved.plots[i]) || {}), i);
      if (p.crop && !CROPS[p.crop]) p.crop = null;
      if (!p.crop) {
        p.startedAt = 0; p.growMs = 0; p.watered = false; p.fertilized = false;
      }
      if (!p.watered) p.watered = false;
      if (!p.fertilized) p.fertilized = false;
      return p;
    });
    s.animals = s.animals.map((a, i) => {
      const sa = saved.animals && saved.animals[i];
      const out = Object.assign({}, a, sa || {});
      if (out.state === 'producing' && out.readyAt && now() >= out.readyAt) out.state = 'ready';
      if (!['hungry', 'producing', 'ready'].includes(out.state)) out.state = 'hungry';
      out.moving = false;
      out.waitUntil = now() + 1500 + i * 1100;
      out.targetX = out.x;
      out.targetY = out.y;
      return out;
    });
    s.quests = Object.assign({}, s.quests, saved.quests || {});
    s.quests.chainIndex = clamp(Math.round(s.quests.chainIndex || 0), 0, CHAIN.length);
    if (s.quests.chainIndex >= CHAIN.length) s.quests.chainDone = true;
    s.quests.chainProgress = Math.max(0, s.quests.chainProgress || 0);
    s.quests.dailyProgress = Array.isArray(s.quests.dailyProgress) ? s.quests.dailyProgress : [];
    s.quests.daily = Array.isArray(s.quests.daily) ? s.quests.daily : [];
    s.player.energy = clamp(Number(s.player.energy) || 0, 0, energyMax(s.player.level));
    s.player.energyTs = Number(s.player.energyTs) || now();
    return s;
  }

  function loadState() {
    if (FRESH) return fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== VERSION) return fresh();
      return normalize(saved);
    } catch (e) {
      return fresh();
    }
  }

  let state = loadState();
  let saveEnabled = !FRESH && (!!localStorage.getItem(KEY) || AUTO_PLAY);
  let currentTool = state.ui.tool;
  let selectedSeed = state.ui.seed;
  let shopTab = 'seeds';
  let shopQty = 1;
  let modalType = null;
  let landPlotIndex = null;
  let hover = null;
  let pointer = { x: 0, y: 0 };
  let fishing = { phase: null, biteAt: 0, until: 0 };
  let particles = [];
  let floaters = [];
  let lastFrame = performance.now();
  let lastHud = 0;
  let lastSave = now();
  let levelTimer = null;
  let panelRefreshTimer = null;
  let pendingStartConfirm = false;
  let accountUser = null;
  let serverSaveTimer = null;
  let suppressServerSave = false;

  /* =========================================================
     Lưu / đồng hồ sinh học
     ========================================================= */
  function save() {
    if (!saveEnabled) return;
    try {
      state.savedAt = now();
      state.ui.tool = currentTool;
      state.ui.seed = selectedSeed;
      state.player.energyTs = state.player.energyTs || now();
      localStorage.setItem(KEY, JSON.stringify(state));
      if (accountUser && !suppressServerSave) scheduleServerSave();
    } catch (e) { /* bộ nhớ đầy hoặc bị chặn */ }
  }

  function scheduleServerSave() {
    if (!accountUser) return;
    clearTimeout(serverSaveTimer);
    serverSaveTimer = setTimeout(() => uploadStateNow().catch(() => {}), 1400);
  }

  async function uploadStateNow() {
    if (!accountUser) return { ok: false };
    const res = await fetch('/api/game/state', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error('Không lưu được lên máy chủ.');
    return res.json();
  }

  function syncEnergy() {
    const max = energyMax(state.player.level);
    if (state.player.energy >= max) {
      state.player.energy = max;
      state.player.energyTs = now();
      return;
    }
    const ts = state.player.energyTs || now();
    const gained = Math.floor((now() - ts) / REGEN_MS);
    if (gained > 0) {
      state.player.energy = Math.min(max, state.player.energy + gained);
      state.player.energyTs = ts + gained * REGEN_MS;
      if (state.player.energy >= max) state.player.energyTs = now();
    }
  }

  function spendEnergy(n) {
    syncEnergy();
    if (state.player.energy < n) {
      toast('Hết năng lượng rồi! Nghỉ một chút hoặc mua Nước tăng lực trong Shop nhé.', 'err', 3400);
      GameAudio.sfx('error');
      return false;
    }
    state.player.energy -= n;
    if (state.player.energy < energyMax(state.player.level) && !state.player.energyTs) {
      state.player.energyTs = now();
    }
    updateHUD();
    return true;
  }

  function ensureDaily() {
    const key = dayKey();
    if (state.quests.dailyDate === key && state.quests.daily.length === 3) {
      if (state.quests.dailyProgress.length !== 3) state.quests.dailyProgress = [0, 0, 0];
      return;
    }
    const rnd = ART.util.makeRand(hashStr(key));
    const idx = [];
    while (idx.length < 3) {
      const i = Math.floor(rnd() * DAILY_POOL.length);
      if (!idx.includes(i)) idx.push(i);
    }
    state.quests.daily = idx.map((i, n) => Object.assign({}, DAILY_POOL[i], { id: 'd' + n, claimed: false }));
    state.quests.dailyProgress = [0, 0, 0];
    state.quests.dailyDate = key;
    updateQuestPreview();
  }

  function activeChain() {
    return state.quests.chainDone ? null : CHAIN[state.quests.chainIndex] || null;
  }
  function questProgress(q) {
    if (!q) return 0;
    if (q.type === 'level') return Math.min(q.need, state.player.level);
    return Math.min(q.need, state.quests.chainProgress || 0);
  }
  function dailyProgress(d, i) {
    return Math.min(d.need, state.quests.dailyProgress[i] || 0);
  }
  function questReady(q, progress) {
    return progress >= q.need;
  }

  function track(type, amount, opts) {
    amount = amount == null ? 1 : amount;
    opts = opts || {};
    const q = activeChain();
    if (q && q.type === type && (!q.crop || q.crop === opts.crop)) {
      const before = state.quests.chainProgress || 0;
      state.quests.chainProgress = Math.min(q.need, before + amount);
      if (before < q.need && state.quests.chainProgress >= q.need) {
        toast('Mục tiêu hoàn thành! Mở Nhiệm vụ để nhận thưởng.', 'gold', 3200);
        GameAudio.sfx('pop');
      }
    }
    if (type !== 'level') {
      state.quests.daily.forEach((d, i) => {
        if (d.claimed || d.type !== type) return;
        const before = state.quests.dailyProgress[i] || 0;
        const after = Math.min(d.need, before + amount);
        state.quests.dailyProgress[i] = after;
        if (before < d.need && after >= d.need) {
          toast('Nhiệm vụ hằng ngày hoàn thành! Nhận thưởng thôi.', 'gold', 3000);
        }
      });
    }
    state.stats[type] = (state.stats[type] || 0) + amount;
    updateQuestPreview();
    save();
  }

  function xpInfo() {
    const lvl = state.player.level;
    if (lvl >= 10) return { pct: 100, text: 'Cấp tối đa', cur: 1, need: 1 };
    const base = LEVELS[lvl - 1] || 0;
    const next = LEVELS[lvl] || base + 100;
    const cur = Math.max(0, state.player.xp - base);
    const need = next - base;
    return { pct: clamp(cur / need * 100, 0, 100), text: `${fmt(cur)} / ${fmt(need)} XP`, cur, need };
  }

  function addXp(n) {
    n = Math.round(n || 0);
    if (n <= 0) return;
    state.player.xp += n;
    let leveled = false;
    let unlocked = [];
    while (state.player.level < 10 && state.player.xp >= LEVELS[state.player.level]) {
      state.player.level++;
      const max = energyMax(state.player.level);
      state.player.energy = Math.min(max, state.player.energy + 10);
      state.player.energyTs = now();
      leveled = true;
      CROP_IDS.forEach(id => {
        if (CROPS[id].unlock === state.player.level) unlocked.push(CROPS[id].name);
      });
    }
    if (leveled) {
      showLevelBurst(state.player.level, unlocked);
      GameAudio.sfx('level');
      save();
    }
    updateHUD();
    if (selectedSeed && CROPS[selectedSeed].unlock > state.player.level) {
      selectedSeed = 'carrot';
      updateSeedBar();
    }
  }

  function grantReward(reward) {
    if (!reward) return [];
    const parts = [];
    if (reward.coins) {
      state.player.coins += reward.coins;
      parts.push('+' + fmt(reward.coins) + ' vàng');
    }
    if (reward.items) {
      Object.keys(reward.items).forEach(id => {
        state.inventory[id] = (state.inventory[id] || 0) + reward.items[id];
        parts.push('+' + reward.items[id] + ' ' + (SUPPLIES[id] ? SUPPLIES[id].name : id));
      });
    }
    if (reward.seeds) {
      Object.keys(reward.seeds).forEach(id => {
        state.seeds[id] = (state.seeds[id] || 0) + reward.seeds[id];
        parts.push('+' + reward.seeds[id] + ' hạt ' + CROPS[id].name.toLowerCase());
      });
    }
    if (reward.xp) {
      parts.push('+' + reward.xp + ' XP');
      addXp(reward.xp);
    }
    updateHUD();
    updateSeedBar();
    return parts;
  }

  function claimChain() {
    const q = activeChain();
    if (!q) { toast('Bạn đã hoàn thành lịch canh tác rồi!', 'gold'); return; }
    if (!questReady(q, questProgress(q))) { toast('Chưa hoàn thành mục tiêu này.', 'err'); return; }
    const parts = grantReward(q.reward);
    state.quests.chainIndex++;
    state.quests.chainProgress = 0;
    if (state.quests.chainIndex >= CHAIN.length) {
      state.quests.chainDone = true;
      state.quests.chainIndex = CHAIN.length;
      grantReward({ coins: 300, xp: 80 });
      toast('Hoàn thành Lịch canh tác! Thưởng lớn: 300 vàng + 80 XP.', 'gold', 4200);
    } else {
      toast('Nhận thưởng: ' + parts.join(' • '), 'gold', 3300);
    }
    GameAudio.sfx('gift');
    addParticles(pointer.x, pointer.y, 'spark', '#ffe27a', 14);
    updateHUD();
    updateQuestPreview();
    save();
    if (modalType === 'quests') refreshModal();
  }

  function claimDaily(i) {
    const d = state.quests.daily[i];
    if (!d || d.claimed) return;
    const p = dailyProgress(d, i);
    if (p < d.need) { toast('Chưa hoàn thành nhiệm vụ này.', 'err'); return; }
    d.claimed = true;
    const parts = grantReward(d.reward);
    toast('Nhận thưởng: ' + parts.join(' • '), 'gold', 3200);
    GameAudio.sfx('gift');
    updateHUD();
    updateQuestPreview();
    save();
    if (modalType === 'quests') refreshModal();
  }

  /* =========================================================
     Giao diện HUD
     ========================================================= */
  const seedEls = {};
  const el = {
    levelBadge: $('#levelBadge'), xpFill: $('#xpFill'), xpText: $('#xpText'),
    coinText: $('#coinText'), energyText: $('#energyText'), energyFill: $('#energyFill'),
    bagBadge: $('#bagBadge'), mailDot: $('#mailDot'), dayText: $('#dayText'),
    weatherText: $('#weatherText'), questBadge: $('#questBadge'),
    seedBar: $('#seedBar'), soundBtn: $('#soundBtn'),
    seedInfoName: $('#seedInfoName'), seedInfoMeta: $('#seedInfoMeta'),
    seedInfoCount: $('#seedInfoCount'), seedInfoIcon: $('#seedInfoIcon'),
    farmTaskText: $('#farmTaskText'), farmTaskFill: $('#farmTaskFill'), farmTaskCount: $('#farmTaskCount'),
    friendsDot: $('#friendsDot'), animalReadyDot: $('#animalReadyDot'), orchardReadyDot: $('#orchardReadyDot'),
    waterAllBtn: $('#waterAllBtn'), waterAllCount: $('#waterAllCount'),
    harvestAllBtn: $('#harvestAllBtn'), harvestAllCount: $('#harvestAllCount'),
    visitCoinText: $('#visitCoinText'), visitEnergyText: $('#visitEnergyText'),
    friendTabs: $('#friendTabs'), visitTitle: $('#visitTitle'), visitName: $('#visitName'),
    visitLevel: $('#visitLevel'), visitAvatar: $('#visitAvatar'), visitHearts: $('#visitHearts'),
    visitWaterText: $('#visitWaterText'), visitWaterFill: $('#visitWaterFill'),
    visitHint: $('#visitHint'), visitWaterAll: $('#visitWaterAll'), visitGift: $('#visitGift'),
    visitChat: $('#visitChat')
  };
  let seedInfoShown = null;

  function updateHUD() {
    syncEnergy();
    const p = state.player;
    el.levelBadge.textContent = p.level;
    const xi = xpInfo();
    el.xpFill.style.width = xi.pct + '%';
    el.xpText.textContent = xi.text;
    el.coinText.textContent = fmt(p.coins);
    const maxE = energyMax(p.level);
    el.energyText.textContent = `${Math.floor(p.energy)} / ${maxE}`;
    el.energyFill.style.width = clamp(p.energy / maxE * 100, 0, 100) + '%';
    let bagCount = 0;
    GOOD_IDS.forEach(id => { bagCount += state.inventory[id] || 0; });
    el.bagBadge.textContent = bagCount > 99 ? '99+' : bagCount;
    el.bagBadge.style.display = bagCount > 0 ? 'grid' : 'none';
    el.mailDot.classList.toggle('hidden', !mailReady());
    const days = Math.max(1, Math.floor((now() - state.createdAt) / 86400000) + 1);
    el.dayText.textContent = 'Ngày ' + days;
    const weathers = ['Nắng đẹp', 'Nắng nhẹ', 'Trời trong', 'Gió mát'];
    el.weatherText.textContent = weathers[hashStr(dayKey() + days) % weathers.length];
    el.soundBtn.classList.toggle('muted', !state.settings.sound);
    el.soundBtn.title = state.settings.sound ? 'Tắt âm thanh' : 'Bật âm thanh';
    updateSeedBar();
    updateSeedInfo();
    updateToolUI();
    updateFarmUI();
    updateVisitWallet();
    if (el.friendsDot) el.friendsDot.classList.toggle('hidden', !friendAnyAvailable());
    if (el.animalReadyDot) el.animalReadyDot.classList.toggle('hidden', !state.animals.some(a => animalReady(a)));
    if (el.orchardReadyDot) el.orchardReadyDot.classList.toggle('hidden', !treeReady());
  }

  function updateToolUI() {
    $$('.tool[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === currentTool);
      btn.setAttribute('aria-pressed', String(btn.dataset.tool === currentTool));
      btn.title = (TOOL_NAMES[btn.dataset.tool] || '') + ' (' + (TOOL_KEYS.indexOf(btn.dataset.tool) + 1) + ')';
    });
    const hints = {
      hand: ['Ngắm khu vườn', 'Chạm cây để xem; chạm cây chín để thu.'],
      hoe: ['Cuốc đất', 'Cuốc ô đã mở; chạm ô có khóa để mua đất.'],
      seed: ['Gieo ' + CROPS[selectedSeed].name, (state.seeds[selectedSeed] || 0) > 0 ? 'Chạm ô đất đã cuốc để gieo hạt.' : 'Đã hết hạt. Mua thêm ở khay hạt giống.'],
      water: ['Tưới nước', 'Chạm cây có giọt nước để giúp cây lớn nhanh.'],
      fertilize: ['Bón phân', 'Bón cho cây đang lớn để thu thêm nông sản.'],
      harvest: ['Thu hoạch', 'Chạm luống có dấu ✓ để hái nông sản.']
    };
    const hintName = $('#toolHintName'), hintText = $('#toolHintText');
    if (hintName.textContent !== hints[currentTool][0]) hintName.textContent = hints[currentTool][0];
    if (hintText.textContent !== hints[currentTool][1]) hintText.textContent = hints[currentTool][1];
  }

  function makeIconCanvas(id) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    cv.className = 'item-icon';
    cv.setAttribute('aria-hidden', 'true');
    const c = cv.getContext('2d');
    c.scale(2, 2);
    ART.drawItemIcon(c, id, 64);
    return cv;
  }

  function buildSeedBar() {
    el.seedBar.innerHTML = '';
    CROP_IDS.forEach(id => {
      const btn = document.createElement('button');
      btn.className = 'seed-chip';
      btn.dataset.seed = id;
      btn.title = CROPS[id].name;
      const cv = makeIconCanvas('seed_' + id);
      const copy = document.createElement('span');
      copy.className = 'seed-card-copy';
      const name = document.createElement('b');
      name.textContent = CROPS[id].name;
      const detail = document.createElement('small');
      copy.append(name, detail);
      const count = document.createElement('span');
      count.className = 'seed-count';
      count.textContent = '0';
      const lock = document.createElement('span');
      lock.className = 'mini-lock hidden';
      lock.textContent = 'C' + CROPS[id].unlock;
      btn.appendChild(cv);
      btn.appendChild(copy);
      btn.appendChild(count);
      btn.appendChild(lock);
      el.seedBar.appendChild(btn);
      seedEls[id] = { btn, count, lock, detail };
    });
    updateSeedBar();
  }

  function updateSeedBar() {
    CROP_IDS.forEach(id => {
      const s = seedEls[id];
      if (!s) return;
      const qty = state.seeds[id] || 0;
      const locked = state.player.level < CROPS[id].unlock;
      s.count.textContent = qty;
      s.detail.textContent = locked ? `Cấp ${CROPS[id].unlock}` : `${CROPS[id].grow} giây`;
      s.btn.classList.toggle('active', selectedSeed === id && currentTool === 'seed');
      s.btn.setAttribute('aria-pressed', String(selectedSeed === id && currentTool === 'seed'));
      s.btn.setAttribute('aria-disabled', String(locked));
      s.btn.classList.toggle('empty', qty <= 0);
      s.btn.classList.toggle('locked', locked);
      s.lock.classList.toggle('hidden', !locked);
      s.btn.title = `${CROPS[id].name} • Có ${qty} hạt` + (locked ? ` • Mở khóa cấp ${CROPS[id].unlock}` : '');
      s.btn.setAttribute('aria-label', s.btn.title);
    });
    updateSeedInfo();
  }

  function updateSeedInfo() {
    if (!el.seedInfoName) return;
    const c = CROPS[selectedSeed];
    if (!c) return;
    el.seedInfoName.textContent = c.name;
    el.seedInfoMeta.textContent = c.blurb;
    el.seedInfoCount.textContent = `Còn ${state.seeds[selectedSeed] || 0} hạt`;
    $('#seedGrowTime').textContent = c.grow + ' giây';
    $('#seedYield').textContent = c.yield + ' nông sản';
    $('#seedSellPrice').textContent = c.sell + ' vàng';
    $('#seedXp').textContent = '+' + c.xp + ' XP';
    if (seedInfoShown !== selectedSeed && el.seedInfoIcon) {
      const cv = el.seedInfoIcon;
      const cctx = cv.getContext('2d');
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, cv.width, cv.height);
      cctx.scale(2, 2);
      ART.drawItemIcon(cctx, 'seed_' + selectedSeed, 64);
      seedInfoShown = selectedSeed;
    }
  }

  function updateFarmUI() {
    let ready = 0, thirsty = 0, planted = 0, empty = 0, owned = 0;
    state.plots.forEach(p => {
      if (p.unlocked === false) return;
      owned++;
      if (!p.crop) { if (p.tilled) empty++; return; }
      planted++;
      if (plotProgress(p) >= 1) ready++;
      else if (!p.watered) thirsty++;
    });
    $('#gardenPlanted').textContent = planted + ' ô có cây';
    $('#gardenOwned').textContent = 'Đã mở ' + owned + ' / ' + state.plots.length + ' ô';
    $('#expandLandBtn').disabled = owned === state.plots.length;
    const nextLand = LAND.nextLocked(state.plots);
    const nextLevel = LAND.levelFor(nextLand);
    $('#expandLandLabel').textContent = nextLand < 0 ? 'Hoàn tất ✓' : state.player.level < nextLevel ? 'Cần cấp ' + nextLevel : 'Mở đất ＋';
    $('#expandLandBtn').title = nextLand < 0 ? 'Đã mở toàn bộ đất' : `Ô tiếp theo: cấp ${nextLevel} + ${fmt(LAND.priceFor(nextLand))} vàng`;
    $('#gardenReady').textContent = ready;
    $('#gardenThirsty').textContent = thirsty;
    $('#gardenEmpty').textContent = empty;
    if (el.waterAllCount) el.waterAllCount.textContent = thirsty;
    if (el.harvestAllCount) el.harvestAllCount.textContent = ready;
    if (el.waterAllBtn) {
      el.waterAllBtn.disabled = thirsty === 0;
      el.waterAllBtn.title = thirsty ? `Tưới ${thirsty} ô đang khát (1 năng lượng/ô)` : 'Tất cả cây đã được tưới';
    }
    if (el.harvestAllBtn) {
      el.harvestAllBtn.disabled = ready === 0;
      el.harvestAllBtn.title = ready ? `Thu hoạch ${ready} cây đã chín` : 'Chưa có cây nào chín';
    }
  }

  function updateQuestPreview() {
    const q = activeChain();
    let anyClaim = false;
    let view = null;
    if (q) {
      const p = questProgress(q);
      view = { text: q.title, p, need: q.need, claim: p >= q.need };
    }
    state.quests.daily.forEach((d, i) => {
      const p = dailyProgress(d, i);
      if (!d.claimed && p >= d.need) anyClaim = true;
    });
    if (q && view.claim) anyClaim = true;
    if (!view) {
      const di = state.quests.daily.findIndex((d, i) => !d.claimed);
      if (di >= 0) {
        const d = state.quests.daily[di];
        view = { text: d.title, p: dailyProgress(d, di), need: d.need, claim: dailyProgress(d, di) >= d.need };
      } else {
        view = { text: 'Hôm nay đã hoàn tất!', p: 1, need: 1, claim: false };
      }
    }
    if (el.farmTaskText) el.farmTaskText.textContent = view.text;
    if (el.farmTaskCount) el.farmTaskCount.textContent = view.claim ? 'Nhận!' : `${view.p}/${view.need}`;
    if (el.farmTaskFill) el.farmTaskFill.style.width = clamp(view.p / view.need * 100, 0, 100) + '%';
    if (el.questBadge) el.questBadge.classList.toggle('hidden', !anyClaim);
  }

  function updateSoundIcon() {
    el.soundBtn.classList.toggle('muted', !state.settings.sound);
    el.soundBtn.title = state.settings.sound ? 'Tắt âm thanh' : 'Bật âm thanh';
  }

  function setActiveNav(name) {
    $$('.nav-tab[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === name));
  }

  /* =========================================================
     Vườn bạn
     ========================================================= */
  function setRealFriends(list) {
    const oldReal = FRIEND_ORDER.filter(id => id.startsWith('r'));
    oldReal.forEach(id => {
      delete FRIENDS[id];
      delete state.friends[id];
    });
    realFriendIds = [];
    (list || []).forEach(f => {
      const id = 'r' + f.id;
      realFriendIds.push(id);
      FRIENDS[id] = {
        id,
        name: f.displayName || f.username,
        username: f.username,
        level: f.level || 1,
        emoji: f.emoji || '🧑‍🌾',
        theme: f.theme || 'mint',
        color: f.color || '#65b8d9',
        greeting: 'Ghé thăm vườn của mình nhé, cảm ơn bạn nhiều!',
        online: !!f.online,
        real: true
      };
      state.friends[id] = {
        friendship: f.friendship || 0,
        wateredDate: f.watered ? dayKey() : '',
        watered: f.watered || 0,
        giftDate: f.giftDate || '',
        plots: (f.plots || []).slice(0, 6).map(p => ({
          crop: p.crop || null,
          progress: clamp(Number(p.progress) || 0, 0, 1),
          watered: !!p.watered
        })),
        online: !!f.online,
        username: f.username,
        userId: f.id
      };
      if (state.friends[id].plots.length < 6) {
        while (state.friends[id].plots.length < 6) state.friends[id].plots.push({ crop: null, progress: 0, watered: false });
      }
    });
    const ids = realFriendIds.length ? realFriendIds : DEMO_FRIEND_IDS.slice();
    FRIEND_ORDER.splice(0, FRIEND_ORDER.length, ...ids);
    if (!FRIEND_ORDER.includes(visitFriendId)) visitFriendId = FRIEND_ORDER[0];
    updateFriendTabs();
    if (visitOpen) updateVisitUI();
    updateHUD();
  }

  function applyFriendUpdate(friendKey, data) {
    const fd = state.friends[friendKey];
    if (!fd || !data) return;
    fd.friendship = data.friendship ?? fd.friendship;
    fd.watered = data.watered ?? fd.watered;
    fd.wateredDate = fd.watered ? dayKey() : '';
    fd.giftDate = data.giftDate || '';
    fd.online = !!data.online;
    if (Array.isArray(data.plots) && data.plots.length) {
      fd.plots = data.plots.slice(0, 6).map(p => ({ crop: p.crop || null, progress: clamp(Number(p.progress) || 0, 0, 1), watered: !!p.watered }));
      while (fd.plots.length < 6) fd.plots.push({ crop: null, progress: 0, watered: false });
    }
    if (FRIENDS[friendKey]) FRIENDS[friendKey].online = !!data.online;
    if (visitOpen) updateVisitUI();
    updateFriendTabs();
    updateHUD();
    save();
  }

  function ensureFriendsDaily() {
    const key = dayKey();
    FRIEND_ORDER.forEach(id => {
      const fd = state.friends[id];
      if (!fd) return;
      if (fd.wateredDate !== key) {
        fd.wateredDate = key;
        fd.watered = 0;
        (fd.plots || []).forEach(p => { p.watered = false; });
      }
      if (fd.giftDate !== key) fd.giftAvailable = true;
      else fd.giftAvailable = false;
    });
  }
  function friendGiftAvailable(id) {
    ensureFriendsDaily();
    const fd = state.friends[id];
    return !!fd && fd.giftDate !== dayKey();
  }
  function friendAvailability(id) {
    const fd = state.friends[id];
    if (!fd) return false;
    if (fd.giftDate !== dayKey()) return true;
    if (fd.watered < 3 && fd.plots.some(p => p.crop && !p.watered && (p.progress || 0) < 1)) return true;
    return false;
  }
  function friendAnyAvailable() {
    return FRIEND_ORDER.some(id => friendAvailability(id));
  }
  function updateVisitWallet() {
    if (el.visitCoinText) el.visitCoinText.textContent = fmt(state.player.coins);
    if (el.visitEnergyText) el.visitEnergyText.textContent = `${Math.floor(state.player.energy)}/${energyMax(state.player.level)}`;
  }
  function updateFriendTabs() {
    if (!el.friendTabs) return;
    el.friendTabs.innerHTML = FRIEND_ORDER.map(id => {
      const f = FRIENDS[id];
      const fd = state.friends[id];
      const dot = fd && fd.giftDate !== dayKey();
      return `<button class="friend-tab ${id === visitFriendId ? 'active' : ''}" data-friend="${id}" title="${f.real ? 'Bạn thật • ' + (f.online ? 'đang online' : 'offline') : 'Hàng xóm mẫu'}">
        <span class="ft-avatar">${f.emoji}</span>
        <span class="ft-name">${f.name}</span>
        ${f.real ? `<i class="ft-live ${f.online ? '' : 'hidden'}" title="Đang online"></i>` : ''}
        <i class="ft-dot ${dot ? '' : 'hidden'}"></i>
      </button>`;
    }).join('');
  }
  function updateVisitUI() {
    ensureFriendsDaily();
    const f = FRIENDS[visitFriendId];
    const fd = state.friends[visitFriendId];
    if (!f || !fd) return;
    el.visitTitle.textContent = 'Vườn nhà ' + f.name;
    el.visitName.textContent = f.name;
    el.visitLevel.textContent = `Cấp ${f.level} • ${fd.friendship} điểm thân thiết${f.real ? (f.online ? ' • Đang online' : ' • Offline') : ''}`;
    el.visitAvatar.innerHTML = `<span>${f.emoji}</span>`;
    el.visitAvatar.style.background = `radial-gradient(circle at 35% 25%,#fffdf0,${f.color} 62%,#d9a35c)`;
    const hearts = Math.max(1, Math.min(5, Math.round(fd.friendship / 8)));
    el.visitHearts.textContent = '♥'.repeat(hearts) + '♡'.repeat(5 - hearts);
    const left = Math.max(0, 3 - fd.watered);
    el.visitWaterText.textContent = `${fd.watered}/3`;
    el.visitWaterFill.style.width = clamp(fd.watered / 3 * 100, 0, 100) + '%';
    const canWater = fd.watered < 3 && fd.plots.some(p => p.crop && !p.watered && (p.progress || 0) < 1);
    el.visitWaterAll.disabled = !canWater;
    el.visitWaterAll.textContent = fd.watered >= 3 ? 'Đã giúp đủ' : 'Tưới giúp';
    const gift = fd.giftDate !== dayKey();
    el.visitGift.disabled = !gift;
    el.visitGift.textContent = gift ? 'Nhận quà' : 'Đã nhận quà';
    el.visitHint.textContent = fd.watered >= 3
      ? 'Hôm nay bạn đã tưới giúp đủ 3 luống. Mai ghé lại nhé!'
      : 'Click vào luống cây để tưới giúp bạn.';
    updateFriendTabs();
    updateVisitWallet();
    // cập nhật chấm đỏ trên tab
    $$('.friend-tab', el.friendTabs).forEach(btn => {
      const id = btn.dataset.friend;
      const dot = $('.ft-dot', btn);
      if (dot) dot.classList.toggle('hidden', !(state.friends[id] && state.friends[id].giftDate !== dayKey()));
      btn.classList.toggle('active', id === visitFriendId);
    });
  }

  function openVisit(id) {
    if (farmArea === 'plaza') setFarmArea('garden');
    ensureFriendsDaily();
    if (id && FRIENDS[id]) visitFriendId = id;
    visitOpen = true;
    friendSpeech = null;
    friendHoverIndex = -1;
    visitScreen.classList.remove('hidden');
    stage.classList.add('visit-mode');
    setActiveNav('friends');
    hideTooltip();
    updateVisitUI();
    updateVisitWallet();
    GameAudio.sfx('open');
    save();
  }
  function openFriendVisit(friendId) {
    if (!FRIENDS[friendId]) return false;
    openVisit(friendId);
    return true;
  }
  function closeVisit() {
    visitOpen = false;
    friendHoverIndex = -1;
    visitScreen.classList.add('hidden');
    stage.classList.remove('visit-mode');
    setActiveNav('farm');
    GameAudio.sfx('close');
    updateHUD();
    save();
  }
  function switchFriend(id) {
    if (!FRIENDS[id] || id === visitFriendId) return;
    visitFriendId = id;
    friendSpeech = null;
    friendHoverIndex = -1;
    GameAudio.sfx('click');
    updateVisitUI();
    toast(`Đang ghé thăm vườn nhà ${FRIENDS[id].name}.`, 'gold', 1800);
  }

  function waterFriendPlot(index, silent) {
    ensureFriendsDaily();
    const fd = state.friends[visitFriendId];
    const p = fd && fd.plots[index];
    if (!p) return false;
    if (!p.crop) {
      if (!silent) toast('Luống này đang nghỉ, không cần tưới đâu.', '', 2000);
      return false;
    }
    if (p.watered) {
      if (!silent) toast('Luống này vừa được tưới rồi.', '', 2000);
      return false;
    }
    if ((p.progress || 0) >= 1) {
      if (!silent) toast('Luống này đã chín, bạn ấy sắp thu hoạch rồi.', '', 2000);
      return false;
    }
    if (fd.watered >= 3) {
      if (!silent) toast('Hôm nay bạn đã tưới giúp 3 luống rồi. Mai quay lại nhé!', 'err', 2600);
      return false;
    }
    if (!spendEnergy(1)) return false;
    p.watered = true;
    p.progress = Math.min(1, (p.progress || 0) + 0.04);
    fd.watered++;
    fd.friendship += 1;
    state.player.coins += 10;
    addXp(4);
    GameAudio.sfx('water');
    if (!silent) {
      toast(`Đã tưới giúp ${FRIENDS[visitFriendId].name} • +10 vàng, +4 XP`, 'gold', 2200);
    }
    save();
    updateHUD();
    if (FRIENDS[visitFriendId]?.real && window.SOCIAL) {
      window.SOCIAL.friendAction('water', visitFriendId, { index }).catch(() => {});
    }
    if (!silent) updateVisitUI();
    return true;
  }
  function waterAllFriend() {
    ensureFriendsDaily();
    const fd = state.friends[visitFriendId];
    let count = 0;
    for (let i = 0; i < fd.plots.length; i++) {
      if (fd.watered >= 3) break;
      const p = fd.plots[i];
      if (!p.crop || p.watered || (p.progress || 0) >= 1) continue;
      if (!waterFriendPlot(i, true)) break;
      count++;
    }
    updateVisitUI();
    if (count > 0) toast(`Đã tưới giúp ${count} luống • +${count * 10} vàng`, 'gold', 2400);
    else toast('Không còn luống nào cần tưới, hoặc bạn đã giúp đủ hôm nay.', '', 2400);
  }
  function claimFriendGift() {
    ensureFriendsDaily();
    const fd = state.friends[visitFriendId];
    const f = FRIENDS[visitFriendId];
    if (!fd || fd.giftDate === dayKey()) { toast('Hôm nay bạn đã nhận quà của ' + f.name + ' rồi.', '', 2200); return; }
    fd.giftDate = dayKey();
    fd.friendship += 2;
    state.player.coins += 80;
    const seed = CROP_IDS[hashStr(visitFriendId + dayKey()) % 3];
    state.seeds[seed] = (state.seeds[seed] || 0) + 2;
    addXp(5);
    GameAudio.sfx('gift');
    toast(`Nhận quà từ ${f.name}: 80 vàng + 2 hạt ${CROPS[seed].name.toLowerCase()}!`, 'gold', 3400);
    if (f.real && window.SOCIAL) window.SOCIAL.friendAction('gift', visitFriendId).catch(() => {});
    updateHUD();
    updateVisitUI();
    save();
  }
  function chatFriend() {
    const lines = {
      lan: ['Cảm ơn bạn ghé thăm! Vườn dâu nhà mình sắp chín rồi.', 'Bạn có bí quyết trồng cà chua không? Chỉ mình với!', 'Mai mình sang vườn bạn chơi nhé!'],
      minh: ['Bắp nhà mình năm nay cao quá, sắp bằng mái nhà rồi!', 'Bạn tưới giúp mình một luống nhé, mình cảm ơn nhiều.', 'Câu cá ở hồ nhà bạn vui lắm, hôm nào cho mình qua với!'],
      batu: ['Cháu ngoan quá, đến thăm bà là bà vui rồi.', 'Bà vừa làm bánh khoai, lát nữa cháu cầm về nhé.', 'Đất vườn này bà trồng từ hồi cháu còn bé tí đấy.']
    }[visitFriendId] || [FRIENDS[visitFriendId]?.greeting || 'Chào bạn, cảm ơn đã ghé thăm!'];
    const line = lines[Math.floor(Math.random() * lines.length)];
    friendSpeech = { text: line, until: now() + 4500 };
    if (FRIENDS[visitFriendId]?.real && window.SOCIAL) window.SOCIAL.friendAction('chat', visitFriendId, { text: line }).catch(() => {});
    GameAudio.sfx('pop');
    updateVisitUI();
  }

  function handleFriendCanvasClick(e) {
    if (!visitOpen) return;
    const r = friendCanvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 1280;
    const y = (e.clientY - r.top) / r.height * 720;
    const hit = FRIEND.hit(x, y);
    if (!hit) return;
    if (hit.kind === 'plot') waterFriendPlot(hit.index, false);
    else if (hit.kind === 'gift') claimFriendGift();
    else if (hit.kind === 'host') chatFriend();
  }

  function friendlyHover(e) {
    if (!visitOpen) return;
    const r = friendCanvas.getBoundingClientRect();
    const hit = FRIEND.hit((e.clientX - r.left) / r.width * 1280, (e.clientY - r.top) / r.height * 720);
    friendHoverIndex = hit && hit.kind === 'plot' ? hit.index : -1;
    friendCanvas.style.cursor = hit ? 'pointer' : 'default';
  }

  function drawFriendFrame(t) {
    friendCtx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    friendCtx.clearRect(0, 0, 1280, 720);
    const fd = state.friends[visitFriendId];
    if (!fd) return;
    FRIEND.draw(friendCtx, t, {
      friend: FRIENDS[visitFriendId],
      state: fd,
      giftAvailable: fd.giftDate !== dayKey(),
      hoverIndex: friendHoverIndex,
      speech: friendSpeech && friendSpeech.until > now() ? friendSpeech.text : null
    });
  }

  /* =========================================================
     Toast / hiệu ứng chữ
     ========================================================= */
  function toast(message, type, duration) {
    const div = document.createElement('div');
    div.className = 'toast ' + (type || '');
    div.textContent = message;
    toastsEl.appendChild(div);
    const max = 3;
    while (toastsEl.children.length > max) toastsEl.removeChild(toastsEl.firstChild);
    const life = duration || 2700;
    setTimeout(() => {
      div.classList.add('out');
      setTimeout(() => div.remove(), 320);
    }, life);
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color: color || '#fffbe6', born: now(), life: 1500 });
    if (floaters.length > 30) floaters.shift();
  }

  function addParticles(x, y, kind, color, count, spread) {
    count = count || 8;
    spread = spread || 40;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 18 + Math.random() * spread;
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25,
        g: kind === 'drop' ? 90 : 52, life: 0.6 + Math.random() * 0.7,
        max: 1.2, size: 1.6 + Math.random() * 2.8, kind: kind || 'dot',
        color: color || '#ffe27a', rot: Math.random() * 6
      });
    }
    if (particles.length > 180) particles = particles.slice(-160);
  }

  function showLevelBurst(level, unlocked) {
    const burst = $('#levelBurst');
    $('#burstLevel').textContent = level;
    $('#burstText').textContent = '+5 năng lượng tối đa' + (unlocked && unlocked.length ? ' • Mở khóa ' + unlocked.join(', ') : '');
    burst.classList.remove('hidden');
    if (levelTimer) clearTimeout(levelTimer);
    levelTimer = setTimeout(() => burst.classList.add('hidden'), 2600);
  }

  /* =========================================================
     Vòng lặp vẽ
     ========================================================= */
  function resize() {
    const w = stage.clientWidth;
    const size = clamp(w / 80, 10, 21);
    stage.style.fontSize = size.toFixed(2) + 'px';
  }
  window.addEventListener('resize', resize);

  function plotProgress(p) {
    if (!p.crop || !p.growMs) return 0;
    return clamp((now() - p.startedAt) / p.growMs, 0, 1.3);
  }

  function plotCenter(i) {
    return ART.layout.plotCenter(i % 4, Math.floor(i / 4));
  }

  function updateAnimals(dt) {
    const t = now();
    const bounds = { x1: 664, x2: 896, y1: 266, y2: 344 };
    state.animals.forEach(a => {
      if (a.state === 'producing' && a.readyAt && t >= a.readyAt) a.state = 'ready';
      if (a.moving) {
        const dx = a.targetX - a.x, dy = a.targetY - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) {
          a.moving = false;
          a.waitUntil = t + 2400 + Math.random() * 5000;
        } else {
          const speed = (a.type === 'cow' ? 12 : 22) * dt;
          a.x += dx / dist * Math.min(speed, dist);
          a.y += dy / dist * Math.min(speed, dist);
          if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? 1 : -1;
          a._walk = true;
        }
      } else {
        if (t > a.waitUntil) {
          if (Math.random() < 0.65) {
            a.targetX = bounds.x1 + Math.random() * (bounds.x2 - bounds.x1);
            a.targetY = bounds.y1 + Math.random() * (bounds.y2 - bounds.y1);
            if (a.type === 'cow' && a.targetY < 290) a.targetY = 290 + Math.random() * 40;
            a.moving = true;
            a.waitUntil = t + 12000 + Math.random() * 6000;
          } else {
            a.waitUntil = t + 2600 + Math.random() * 4200;
          }
        }
      }
      a.moving = !!a.moving;
    });
  }

  function updateFishing() {
    const t = now();
    if (!fishing.phase) return;
    if (fishing.phase === 'wait' && t >= fishing.biteAt) {
      fishing.phase = 'bite';
      fishing.until = t + 1800;
      GameAudio.sfx('splash');
      addParticles(L.pond.x, L.pond.y - 40, 'drop', '#bdf4ff', 8, 35);
    } else if (fishing.phase === 'bite' && t >= fishing.until) {
      fishing.phase = null;
      toast('Cá đã bơi mất rồi! Thử lại nhé.', 'err', 2600);
      GameAudio.sfx('error');
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 2;
    }
    const t = now();
    floaters = floaters.filter(f => t - f.born < f.life);
  }

  function drawParticles() {
    const t = now();
    particles.forEach(p => {
      const alpha = clamp(p.life / p.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      if (p.kind === 'heart') {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.8);
        ctx.bezierCurveTo(-s * 1.4, -s * 0.4, -s * 0.5, -s * 1.3, 0, -s * 0.5);
        ctx.bezierCurveTo(s * 0.5, -s * 1.3, s * 1.4, -s * 0.4, 0, s * 0.8);
        ctx.fill();
      } else if (p.kind === 'coin') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd34f';
        ctx.fill();
        ctx.strokeStyle = '#d79b12';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else if (p.kind === 'leaf') {
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        const s = p.size * 2.2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
          ctx.lineTo(Math.cos(a + 0.785) * s * 0.32, Math.sin(a + 0.785) * s * 0.32);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'drop') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.8, p.size * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    floaters.forEach(f => {
      const k = (t - f.born) / f.life;
      const y = f.y - k * 46;
      ctx.save();
      ctx.globalAlpha = clamp(1 - k * 1.25, 0, 1);
      ctx.font = '800 15px "Segoe UI", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(67,48,17,.55)';
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function treeReady() {
    return now() >= (state.tree.readyAt || 0);
  }
  function mailReady() {
    return now() - (state.mail.lastClaim || 0) >= MAIL_COOLDOWN;
  }

  function drawWorld(t) {
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.clearRect(0, 0, 1280, 720);
    // Trang Trồng trọt chỉ có ruộng rau, nhà dụng cụ và bù nhìn.
    ART.drawGardenBackground(ctx);

    const order = Array.from({ length: 12 }, (_, i) => i).sort((a, b) => {
      return plotCenter(a).y - plotCenter(b).y;
    });
    order.forEach(i => {
      const p = state.plots[i];
      const c = plotCenter(i);
      const ready = !!(p.unlocked !== false && p.crop && p.progress >= 1);
      let hv = null;
      if (hover && hover.kind === 'plot' && hover.index === i) hv = ready ? 'ready' : 'hover';
      if (ready) ART.drawReadyGlow(ctx, c.x, c.y, t);
      ART.drawPlotGround(ctx, p, i, c.x, c.y, hv, t);
      if (p.unlocked !== false && p.crop) {
        ART.drawPlant(ctx, p, c.x, c.y, t, i);
      }
    });
    order.forEach(i => {
      const c = plotCenter(i);
      const price = LAND.priceFor(i);
      const requiredLevel = LAND.levelFor(i);
      ART.drawPlotStatus(ctx, state.plots[i], i, c.x, c.y, t, { price, requiredLevel, levelMet: state.player.level >= requiredLevel, affordable: state.player.coins >= price });
    });

    ART.drawButterflies(ctx, t);
    ART.drawBirds(ctx, t);
    ART.drawPollen(ctx, t);
    drawParticles();
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastFrame) / 1000);
    lastFrame = ts;
    updateAnimals(dt);
    if (!visitOpen) updateFishing();
    updateParticles(dt);
    state.plots.forEach(p => { if (p.crop) p.progress = plotProgress(p); });
    if (visitOpen) drawFriendFrame(ts / 1000);
    else if (farmArea === 'garden') drawWorld(ts / 1000);
    else if (farmArea !== 'plaza') drawAreaFrame(ts / 1000);
    requestAnimationFrame(frame);
  }

  /* =========================================================
     Tương tác trên canvas
     ========================================================= */
  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m + ' phút' + (r ? ' ' + r + ' giây' : '');
    }
    return s + ' giây';
  }

  function animalReady(a) {
    return a.state === 'ready' || (a.state === 'producing' && a.readyAt && now() >= a.readyAt);
  }

  function targetAt(x, y) {
    // Trang Trồng trọt chỉ có 12 ô đất. Ưu tiên đúng viên đất trước, rồi mới
    // tới thân cây để cây cao ở ô trước không "che" mất ô phía sau.
    const order = Array.from({ length: 12 }, (_, i) => i).sort((a, b) => plotCenter(b).y - plotCenter(a).y);
    for (const i of order) {
      const c = plotCenter(i);
      const dx = Math.abs(x - c.x) / (L.field.tw / 2);
      const dy = Math.abs(y - c.y) / (L.field.th / 2);
      if (dx + dy <= 1) {
        return { kind: 'plot', index: i, x: c.x, y: c.y, plot: state.plots[i] };
      }
    }
    for (const i of order) {
      const p = state.plots[i];
      if (p.unlocked === false || !p.crop) continue;
      const c = plotCenter(i);
      const h = ART.cropHeight(p.crop) * (0.55 + 0.45 * Math.min(1, p.progress || 0));
      if (x > c.x - 50 && x < c.x + 50 && y > c.y - h - 30 && y < c.y + 6) {
        return { kind: 'plot', index: i, x: c.x, y: c.y, plot: p };
      }
    }
    return null;
  }

  function tooltipFor(target) {
    if (!target) return '';
    if (target.kind === 'plot') {
      const p = target.plot;
      if (p.unlocked === false) {
        const price = LAND.priceFor(target.index);
        const requiredLevel = LAND.levelFor(target.index);
        const shortfall = Math.max(0, price - state.player.coins);
        const hint = state.player.level < requiredLevel ? `Cần đạt cấp ${requiredLevel} (hiện tại cấp ${state.player.level}).` : shortfall ? `Còn thiếu ${fmt(shortfall)} vàng.` : 'Click để xem và mở ô đất này.';
        return `<b>Ô đất chưa mở</b><div class="tt-meta">Cấp ${requiredLevel} + ${fmt(price)} vàng.</div><span class="tt-hint">${hint}</span>`;
      }
      if (!p.crop) {
        if (!p.tilled) {
          return `<b>Ô đất cỏ</b><div class="tt-meta">Một mảnh đất còn hoang, cỏ mọc xanh um.</div><span class="tt-hint">Chọn Cuốc (2) rồi click để khai hoang.</span>`;
        }
        return `<b>Đất đã cuốc</b><div class="tt-meta">Đất tơi xốp, sẵn sàng đón hạt giống.</div><span class="tt-hint">Chọn Gieo hạt (3) để trồng cây.</span>`;
      }
      const c = CROPS[p.crop];
      const ready = (p.progress || 0) >= 1;
      const left = Math.max(0, p.growMs - (now() - p.startedAt));
      const flags = [p.watered ? 'Đã tưới' : 'Chưa tưới', p.fertilized ? 'Đã bón phân' : ''].filter(Boolean).join(' • ');
      if (ready) {
        return `<b>${c.name} — chín rồi!</b><div class="tt-meta">${flags}</div><span class="tt-hint tt-done">Click để thu hoạch ${c.yield + (p.fertilized ? 1 : 0)} nông sản.</span>`;
      }
      return `<b>${c.name}</b><div class="tt-meta">${flags}</div><div class="tt-meta">Còn khoảng ${fmtTime(left)} nữa.</div><span class="tt-hint">${currentTool === 'water' ? (p.watered ? 'Đã tưới rồi.' : 'Click để tưới mát cho cây.') : currentTool === 'fertilize' ? (p.fertilized ? 'Đã bón phân.' : 'Click để bón thêm dinh dưỡng.') : 'Tưới nước và bón phân để cây lớn nhanh.'}</span>`;
    }
    if (target.kind === 'animal') {
      const a = target.animal;
      const ready = animalReady(a);
      if (ready) {
        return `<b>${a.name}</b><div class="tt-meta">${a.type === 'cow' ? 'Bò đã cho sữa thơm.' : 'Gà vừa đẻ trứng.'}</div><span class="tt-hint tt-done">Mở chuồng thú để thu hoạch.</span>`;
      }
      if (a.state === 'producing') {
        return `<b>${a.name}</b><div class="tt-meta">Đang chăm chỉ cho sản phẩm...</div><span class="tt-hint">Mở chuồng thú để xem tiến độ.</span>`;
      }
      return `<b>${a.name}</b><div class="tt-meta">Đang đói bụng, kêu ụt ịt.</div><span class="tt-hint">Mở chuồng thú để cho ăn.</span>`;
    }
    if (target.kind === 'pond') {
      return `<b>Hồ cá mát lạnh</b><div class="tt-meta">Nước trong veo, có cá chép và cá vàng.</div><span class="tt-hint">Click để mở Hồ cá và thả câu.</span>`;
    }
    if (target.kind === 'tree') {
      if (treeReady()) return `<b>Cây táo</b><div class="tt-meta">Cành nào cũng sai trĩu quả.</div><span class="tt-hint tt-done">Mở vườn cây để hái táo.</span>`;
      return `<b>Cây táo</b><div class="tt-meta">Táo đang chín dần trên cành.</div><span class="tt-hint">Mở vườn cây để xem thời gian chín.</span>`;
    }
    if (target.kind === 'mailbox') {
      if (mailReady()) return `<b>Hòm thư làng</b><div class="tt-meta">Có một lá thư mới gửi cho bạn!</div><span class="tt-hint tt-done">Click để mở thư và nhận quà.</span>`;
      return `<b>Hòm thư làng</b><div class="tt-meta">Hôm nay chưa có thư mới.</div><span class="tt-hint">Thư tiếp theo sau ${fmtTime(MAIL_COOLDOWN - (now() - state.mail.lastClaim))}.</span>`;
    }
    if (target.kind === 'barn') {
      return `<b>Nhà kho</b><div class="tt-meta">Nơi cất giữ nông sản và đồ dùng.</div><span class="tt-hint">Click để mở túi đồ.</span>`;
    }
    return '';
  }

  function placeTooltip(html, x, y) {
    if (!html) { hideTooltip(); return; }
    tooltipEl.innerHTML = html;
    tooltipEl.classList.remove('hidden');
    const w = tooltipEl.offsetWidth || 200;
    const stageW = stage.clientWidth || 1280;
    const sx = stageW / 1280;
    const leftPx = clamp(x * sx, w / 2 + 8, stageW - w / 2 - 8);
    tooltipEl.style.left = (leftPx / stageW * 100) + '%';
    tooltipEl.style.top = clamp(y / 720 * 100, 9, 94) + '%';
  }
  function hideTooltip() {
    tooltipEl.classList.add('hidden');
  }

  function refreshHover(updatePointer) {
    if (updatePointer) pointer = updatePointer;
    if (!startScreen.classList.contains('hide') || !modalRoot.classList.contains('hidden') || visitOpen || farmArea !== 'garden') {
      hideTooltip();
      hover = null;
      canvas.style.cursor = 'default';
      return;
    }
    const target = targetAt(pointer.x, pointer.y);
    hover = target;
    if (!target) {
      hideTooltip();
      canvas.style.cursor = 'default';
      return;
    }
    canvas.style.cursor = 'pointer';
    if (target.kind === 'pond' && fishing.phase) {
      hideTooltip();
      return;
    }
    placeTooltip(tooltipFor(target), target.x, target.y);
  }

  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    const p = {
      x: (e.clientX - r.left) / r.width * 1280,
      y: (e.clientY - r.top) / r.height * 720
    };
    pointer = p;
    refreshHover();
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    hideTooltip();
  });

  canvas.addEventListener('click', e => {
    if (!startScreen.classList.contains('hide') || !modalRoot.classList.contains('hidden') || farmArea !== 'garden') return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 1280;
    const y = (e.clientY - r.top) / r.height * 720;
    pointer = { x, y };
    if (fishing.phase === 'bite') { catchFish(); return; }
    const target = targetAt(x, y);
    if (!target) return;
    GameAudio.resume();
    if (target.kind === 'plot') actPlot(target.index);
    else if (target.kind === 'animal') openAnimals();
    else if (target.kind === 'pond') openFishing();
    else if (target.kind === 'tree') openOrchard();
    else if (target.kind === 'mailbox') openMail();
    else if (target.kind === 'barn') openBag();
    updateHUD();
    refreshHover();
  });

  function selectTool(tool) {
    if (!TOOL_KEYS.includes(tool)) return;
    currentTool = tool;
    if (tool === 'seed') {
      if (!CROPS[selectedSeed] || state.player.level < CROPS[selectedSeed].unlock) {
        selectedSeed = CROP_IDS.find(id => state.player.level >= CROPS[id].unlock) || 'carrot';
      }
    }
    state.ui.tool = currentTool;
    updateToolUI();
    updateSeedBar();
    GameAudio.sfx('click');
    save();
  }

  function selectSeed(id) {
    const c = CROPS[id];
    if (!c) return;
    if (state.player.level < c.unlock) {
      toast(`Hạt ${c.name} mở khóa ở cấp ${c.unlock}. Cố lên nhé!`, 'err');
      GameAudio.sfx('error');
      return;
    }
    selectedSeed = id;
    currentTool = 'seed';
    state.ui.seed = id;
    state.ui.tool = 'seed';
    updateToolUI();
    updateSeedBar();
    GameAudio.sfx('click');
    save();
  }

  /* ---------------- mở rộng đất ---------------- */
  function landHTML(index) {
    const price = LAND.priceFor(index);
    const requiredLevel = LAND.levelFor(index);
    const levelMet = state.player.level >= requiredLevel;
    const coins = state.player.coins;
    const shortfall = Math.max(0, price - coins);
    return modalHead('Mở thêm một ô đất', `Ô số ${index + 1} · Sở hữu vĩnh viễn trong ván chơi này`) +
      `<div class="modal-body">
        <div class="land-offer">
          <div class="land-preview" aria-hidden="true"><span>🌱</span></div>
          <div><small>THÊM CHỖ CHO MÙA VỤ MỚI</small><b>${fmt(price)} <span>vàng</span></b><p>Mở đất rồi dùng Cuốc để tạo luống và gieo hạt.</p></div>
        </div>
        <dl class="land-wallet"><div><dt>Cấp độ yêu cầu</dt><dd id="landLevel" class="${levelMet ? '' : 'shortfall'}">Cấp ${requiredLevel} · Bạn: cấp ${state.player.level}</dd></div><div><dt>Vàng hiện có</dt><dd id="landWallet">${fmt(coins)}</dd></div><div><dt>${shortfall ? 'Còn thiếu' : 'Còn lại sau khi mở'}</dt><dd id="landBalance" class="${shortfall ? 'shortfall' : ''}">${fmt(shortfall || coins - price)} vàng</dd></div></dl>
        <p class="land-note">Mỗi ô chỉ trả vàng một lần. Mở đất không tốn năng lượng.</p>
        ${!levelMet ? `<p class="land-shortfall" role="status">Cần đạt cấp ${requiredLevel} để mở ô này. Chăm cây và nhận thưởng nhiệm vụ để tăng XP.</p>` : ''}
        ${shortfall ? '<p class="land-shortfall" role="status">Chưa đủ vàng. Bạn có thể bán nông sản trong Túi đồ để tích lũy thêm.</p>' : ''}
      </div>
      <div class="modal-foot land-actions">
        <button class="btn btn-ghost" data-close>Để sau</button>
        ${!levelMet ? '<button class="btn btn-ghost" data-open-quests>Nhiệm vụ</button>' : shortfall ? '<button class="btn btn-ghost" data-open-bag>Bán nông sản</button>' : ''}
        <button id="confirmLandBtn" class="btn btn-gold" data-buy-land="${index}" ${!levelMet || shortfall ? 'disabled' : ''}>${!levelMet ? `Cần đạt cấp ${requiredLevel}` : shortfall ? 'Chưa đủ vàng' : `Mở đất · ${fmt(price)} vàng`}</button>
      </div>`;
  }

  function openLand(index) {
    if (!state.plots[index] || state.plots[index].unlocked !== false || LAND.priceFor(index) === null) return;
    landPlotIndex = index;
    openModal('land', landHTML(index), 'land-modal');
    const confirm = $('#confirmLandBtn');
    (confirm.disabled ? $('.modal-close', modalPanel) : confirm).focus({ preventScroll: true });
  }

  function buyLand(index) {
    if (modalType !== 'land' || index !== landPlotIndex) return;
    const result = LAND.purchase(state, index);
    if (!result.ok) {
      if (result.reason === 'funds' || result.reason === 'level') {
        toast(result.reason === 'level' ? `Cần đạt cấp ${result.requiredLevel} để mở ô đất này.` : 'Bạn chưa đủ vàng để mở ô đất này.', 'err');
        refreshModal();
      } else closeModal(true);
      return;
    }
    const c = plotCenter(index);
    closeModal(true);
    selectTool('hoe');
    addParticles(c.x, c.y - 6, 'spark', '#f0ce80', 14, 40);
    addFloater(c.x, c.y - 34, 'Đất mới của bạn!', '#fff4c8');
    toast(`Đã mở ô số ${index + 1} với ${fmt(result.cost)} vàng. Cuốc đất để bắt đầu trồng nhé!`, 'gold', 3200);
    GameAudio.sfx('pop');
    updateHUD();
    save();
    refreshHover();
  }

  /* ---------------- hành động ruộng ---------------- */
  function actPlot(i) {
    const p = state.plots[i];
    if (p.unlocked === false) { openLand(i); return; }
    const c = plotCenter(i);
    p.progress = plotProgress(p);
    if (p.crop && p.progress >= 1) {
      harvestPlot(i);
      return;
    }
    if (currentTool === 'hand') {
      inspectPlot(i);
      return;
    }
    if (currentTool === 'hoe') {
      if (p.crop) { toast('Ô này đang có cây, không cuốc được đâu!', 'err'); GameAudio.sfx('error'); return; }
      if (p.tilled) { toast('Đất đã được cuốc tơi rồi. Gieo hạt thôi!'); return; }
      if (!spendEnergy(1)) return;
      p.tilled = true;
      track('till', 1);
      addXp(1);
      addParticles(c.x, c.y + 2, 'dot', '#b98a55', 10, 32);
      addFloater(c.x, c.y - 8, 'Đất tơi xốp!', '#fff4cf');
      GameAudio.sfx('till');
      save();
      refreshHover();
      return;
    }
    if (currentTool === 'seed') {
      if (!p.tilled) { toast('Hãy cuốc đất trước khi gieo hạt nhé.', 'err'); GameAudio.sfx('error'); return; }
      if (p.crop) { toast('Ô này đã có cây đang lớn.', 'err'); return; }
      const crop = CROPS[selectedSeed];
      if (!crop) return;
      if (state.player.level < crop.unlock) { toast(`Cần đạt cấp ${crop.unlock} để trồng ${crop.name}.`, 'err'); return; }
      if ((state.seeds[selectedSeed] || 0) <= 0) {
        toast(`Đã hết hạt ${crop.name}. Ghé Shop mua thêm nhé!`, 'err');
        GameAudio.sfx('error');
        return;
      }
      if (!spendEnergy(1)) return;
      state.seeds[selectedSeed]--;
      p.crop = selectedSeed;
      p.startedAt = now();
      p.growMs = crop.grow * 1000;
      p.watered = false;
      p.fertilized = false;
      p.progress = 0;
      track('plant', 1, { crop: selectedSeed });
      addXp(2);
      addParticles(c.x, c.y, 'spark', '#bff08a', 8, 26);
      addFloater(c.x, c.y - 10, 'Đã gieo ' + crop.name, '#e8ffc8');
      GameAudio.sfx('plant');
      updateSeedBar();
      save();
      refreshHover();
      return;
    }
    if (currentTool === 'water') {
      if (!p.crop) { toast('Ô đất trống thì tưới gì đây? Hãy gieo hạt trước.', 'err'); return; }
      if (p.progress >= 1) { toast('Cây đã chín, thu hoạch thôi!', 'gold'); return; }
      if (p.watered) { toast('Ô này vừa được tưới, đất vẫn còn ẩm.', 'err'); return; }
      if (!spendEnergy(1)) return;
      const prog = clamp((now() - p.startedAt) / p.growMs, 0, 1);
      p.growMs = Math.max(4000, p.growMs * 0.78);
      p.startedAt = now() - prog * p.growMs;
      p.watered = true;
      track('water', 1);
      addXp(1);
      addParticles(c.x, c.y - 10, 'drop', '#bdefff', 12, 45);
      addFloater(c.x, c.y - 30, 'Mát quá!', '#d8f8ff');
      GameAudio.sfx('water');
      save();
      refreshHover();
      return;
    }
    if (currentTool === 'fertilize') {
      if (!p.crop) { toast('Chỉ bón phân khi ô đã có cây thôi.', 'err'); return; }
      if (p.progress >= 1) { toast('Cây chín rồi, không cần bón nữa.', 'gold'); return; }
      if (p.fertilized) { toast('Ô này đã được bón phân rồi.', 'err'); return; }
      if ((state.inventory.fertilizer || 0) <= 0) {
        toast('Đã hết phân bón. Mua thêm trong Shop nhé!', 'err');
        GameAudio.sfx('error');
        return;
      }
      if (!spendEnergy(1)) return;
      state.inventory.fertilizer--;
      const prog = clamp((now() - p.startedAt) / p.growMs, 0, 1);
      p.growMs = Math.max(4000, p.growMs * 0.85);
      p.startedAt = now() - prog * p.growMs;
      p.fertilized = true;
      addXp(2);
      addParticles(c.x, c.y - 10, 'spark', '#ffe27a', 10, 35);
      addFloater(c.x, c.y - 32, 'Thêm dinh dưỡng!', '#fff0a8');
      GameAudio.sfx('pop');
      save();
      refreshHover();
      return;
    }
    if (currentTool === 'harvest') {
      if (!p.crop) { toast('Ô đất trống, chưa có gì để thu hoạch.', 'err'); return; }
      toast(`Cây còn ${fmtTime(Math.max(0, p.growMs - (now() - p.startedAt)))} nữa mới chín.`, '', 2400);
      return;
    }
  }

  function inspectPlot(i) {
    const p = state.plots[i];
    if (!p.crop) {
      toast(p.tilled ? 'Đất đã cuốc, hãy chọn hạt giống để gieo.' : 'Ô cỏ hoang. Chọn Cuốc (2) để khai hoang nhé.');
      return;
    }
    const c = CROPS[p.crop];
    const ready = (p.progress || 0) >= 1;
    if (ready) {
      toast(`${c.name} đã chín! Click để thu hoạch.`, 'gold');
    } else {
      const left = fmtTime(Math.max(0, p.growMs - (now() - p.startedAt)));
      toast(`${c.name} • còn ${left} • ${p.watered ? 'đã tưới' : 'chưa tưới'}${p.fertilized ? ' • đã bón phân' : ''}`, '', 3000);
    }
  }

  function harvestPlot(i) {
    const p = state.plots[i];
    if (p.unlocked === false || !p.crop) return;
    p.progress = plotProgress(p);
    if (p.progress < 1) return;
    if (!spendEnergy(1)) return;
    const c = CROPS[p.crop];
    const cpt = plotCenter(i);
    const qty = c.yield + (p.fertilized ? 1 : 0);
    state.inventory[p.crop] = (state.inventory[p.crop] || 0) + qty;
    addXp(c.xp);
    track('harvest', 1, { crop: p.crop });
    addParticles(cpt.x, cpt.y - 18, 'coin', '#ffd45e', 8, 55);
    addParticles(cpt.x, cpt.y - 30, 'leaf', '#7fc447', 6, 45);
    addFloater(cpt.x, cpt.y - 55, '+' + qty + ' ' + c.name, '#fff3b0');
    addFloater(cpt.x, cpt.y - 82, '+' + c.xp + ' XP', '#c9ff9a');
    GameAudio.sfx('harvest');
    if (Math.random() < 0.14) {
      state.seeds[p.crop] = (state.seeds[p.crop] || 0) + 1;
      addFloater(cpt.x + 24, cpt.y - 100, '+1 hạt giống', '#bff5a0');
    }
    p.crop = null;
    p.startedAt = 0;
    p.growMs = 0;
    p.watered = false;
    p.fertilized = false;
    p.progress = 0;
    p.tilled = true;
    save();
    updateHUD();
    refreshHover();
  }

  function waterAllPlots() {
    let count = 0;
    for (let i = 0; i < state.plots.length; i++) {
      const p = state.plots[i];
      p.progress = plotProgress(p);
      if (p.unlocked === false || !p.crop || p.watered || p.progress >= 1) continue;
      if (!spendEnergy(1)) break;
      const prog = clamp((now() - p.startedAt) / p.growMs, 0, 1);
      p.growMs = Math.max(4000, p.growMs * 0.78);
      p.startedAt = now() - prog * p.growMs;
      p.watered = true;
      const c = plotCenter(i);
      addParticles(c.x, c.y - 10, 'drop', '#bdefff', 8, 30);
      count++;
    }
    if (count > 0) {
      track('water', count);
      addXp(count);
      GameAudio.sfx('water');
      toast(`Đã tưới ${count} ô đất. Cây sẽ lớn nhanh hơn!`, 'gold', 2400);
      save();
      updateHUD();
      refreshHover();
    } else {
      toast('Không còn ô nào cần tưới, hoặc bạn đã hết năng lượng.', '', 2200);
    }
  }

  function harvestAllPlots() {
    const ready = [];
    state.plots.forEach((p, i) => {
      p.progress = plotProgress(p);
      if (p.unlocked !== false && p.crop && p.progress >= 1) ready.push(i);
    });
    if (!ready.length) { toast('Chưa có cây nào chín để thu hoạch.', '', 2200); return; }
    let count = 0;
    for (const i of ready) {
      if (state.player.energy < 1) break;
      harvestPlot(i);
      count++;
    }
    if (count > 0) {
      updateHUD();
      save();
      toast(`Đã thu hoạch ${count} cây. Mở Túi đồ để bán nông sản nhé!`, 'gold', 2600);
    }
  }

  /* ---------------- động vật ---------------- */
  function interactAnimal(a) {
    if (animalReady(a)) {
      if (a.state === 'producing') a.state = 'ready';
      const isCow = a.type === 'cow';
      const id = isCow ? 'milk' : 'egg';
      const qty = isCow ? (Math.random() < 0.18 ? 2 : 1) : 1;
      state.inventory[id] = (state.inventory[id] || 0) + qty;
      a.state = 'hungry';
      a.fedAt = 0;
      a.readyAt = 0;
      addXp(isCow ? 7 : 4);
      addParticles(a.x, a.y - 50, 'heart', '#ff9aa2', 9, 30);
      addFloater(a.x, a.y - 92, '+' + qty + ' ' + GOODS[id].name, '#fff3b0');
      GameAudio.sfx('collect');
      if (isCow) GameAudio.sfx('moo');
      save();
      updateHUD();
      refreshHover();
      if (modalType === 'animals') refreshModal();
      return;
    }
    if (a.state === 'producing') {
      toast(`${a.name} đang chăm chỉ lắm, còn ${fmtTime(Math.max(0, a.readyAt - now()))} nữa.`, '', 2400);
      return;
    }
    if ((state.inventory.hay || 0) <= 0) {
      toast('Đã hết cỏ khô. Mua thêm trong Shop (Vật tư) nhé!', 'err');
      GameAudio.sfx('error');
      return;
    }
    if (!spendEnergy(1)) return;
    state.inventory.hay--;
    a.state = 'producing';
    a.fedAt = now();
    a.readyAt = now() + (a.type === 'cow' ? 30000 : 22000);
    track('feed', 1);
    addXp(2);
    addParticles(a.x, a.y - 20, 'heart', '#ffb8a4', 7, 26);
    addFloater(a.x, a.y - 84, 'Măm măm!', '#fff1c4');
    GameAudio.sfx('feed');
    GameAudio.sfx(a.type === 'cow' ? 'moo' : 'cluck');
    save();
    updateHUD();
    refreshHover();
    if (modalType === 'animals') refreshModal();
  }

  /* ---------------- câu cá ---------------- */
  function handlePond() {
    if (fishing.phase === 'bite') { catchFish(); return; }
    if (fishing.phase === 'wait') {
      toast('Suỵt... cá đang tới gần, kiên nhẫn nhé!', '', 2000);
      return;
    }
    if (fishing.phase) return;
    if (!spendEnergy(2)) return;
    fishing.phase = 'wait';
    fishing.biteAt = now() + 2200 + Math.random() * 2600;
    fishing.until = 0;
    GameAudio.sfx('water');
    addFloater(L.pond.x - 10, L.pond.y - 80, 'Thả câu...', '#d8fff8');
    refreshHover();
  }

  function catchFish() {
    if (fishing.phase !== 'bite') return;
    fishing.phase = null;
    const gold = Math.random() < 0.14;
    const id = gold ? 'goldfish' : 'fish';
    state.inventory[id] = (state.inventory[id] || 0) + 1;
    addXp(6);
    track('fish', 1);
    addParticles(L.pond.x, L.pond.y - 50, 'drop', '#c9fbff', 16, 55);
    addParticles(L.pond.x, L.pond.y - 50, 'spark', '#ffe27a', 8, 40);
    addFloater(L.pond.x, L.pond.y - 120, '+1 ' + GOODS[id].name, gold ? '#ffe27a' : '#fff5ce');
    toast(gold ? 'Ôi! Câu được Cá vàng quý hiếm!' : 'Câu được một con Cá chép béo mập!', 'gold', 2800);
    GameAudio.sfx('fish');
    save();
    updateHUD();
  }

  /* ---------------- cây táo ---------------- */
  function handleTree() {
    if (!treeReady()) {
      toast(`Táo còn chín dở, quay lại sau ${fmtTime(Math.max(0, state.tree.readyAt - now()))} nhé.`, '', 2400);
      return;
    }
    state.inventory.apple = (state.inventory.apple || 0) + 3;
    state.tree.readyAt = now() + TREE_COOLDOWN;
    state.tree.shakeUntil = now() + 700;
    addXp(5);
    for (let i = 0; i < 9; i++) {
      addParticles(L.tree.x - 50 + Math.random() * 100, L.tree.y - 250 + Math.random() * 80, 'leaf', i % 2 ? '#ff8b72' : '#79c24a', 1, 30);
    }
    addFloater(L.tree.x, L.tree.y - 270, '+3 Táo đỏ', '#fff0b8');
    toast('Hái được 3 quả táo đỏ mọng!', 'gold', 2400);
    GameAudio.sfx('shake');
    save();
    updateHUD();
    refreshHover();
  }

  /* ---------------- học sinh nhỏ: bảng, shop, túi ---------------- */
  function modalHead(title, sub) {
    return `<div class="modal-head">
      <div class="modal-title"><h2>${title}</h2><p>${sub}</p></div>
      <button class="modal-close" data-close aria-label="Đóng">×</button>
    </div>`;
  }

  function iconTag(id) {
    return `<canvas class="item-icon" data-icon="${id}" aria-hidden="true"></canvas>`;
  }

  function hydrateIcons(root) {
    root.querySelectorAll('canvas[data-icon]').forEach(cv => {
      if (cv.dataset.ready === '1') return;
      cv.width = 128;
      cv.height = 128;
      const c = cv.getContext('2d');
      c.scale(2, 2);
      ART.drawItemIcon(c, cv.dataset.icon, 64);
      cv.dataset.ready = '1';
    });
  }

  function paintModal(html, cls) {
    modalPanel.className = 'modal-panel ' + (cls || '');
    modalPanel.innerHTML = html;
    hydrateIcons(modalPanel);
    hydrateAnimalPortraits(modalPanel);
    hydrateOrchard(modalPanel);
  }

  function openModal(type, html, cls) {
    modalType = type;
    paintModal(html, cls);
    modalRoot.classList.remove('hidden');
    if (farmArea === 'plaza') syncPlazaPlayback();
    hideTooltip();
    GameAudio.sfx('open');
  }

  function closeModal(silent) {
    if (modalType === 'welcome' && !state.flags.welcomeSeen) {
      state.flags.welcomeSeen = true;
      save();
    }
    if (modalType === 'fishing') clearFishTimers();
    const panelModal = modalType === 'animals' || modalType === 'fishing' || modalType === 'orchard';
    clearInterval(panelRefreshTimer);
    panelRefreshTimer = null;
    modalRoot.classList.add('hidden');
    modalPanel.innerHTML = '';
    modalType = null;
    landPlotIndex = null;
    if (panelModal) setRailActive('crops');
    if (!visitOpen) setActiveNav('farm');
    if (!silent) GameAudio.sfx('close');
    if (pendingStartConfirm) {
      pendingStartConfirm = false;
      startScreen.classList.remove('hide');
    }
    if (farmArea === 'plaza') syncPlazaPlayback();
  }

  function refreshModal() {
    const oldBody = $('.modal-body', modalPanel);
    const scroll = oldBody ? oldBody.scrollTop : 0;
    if (modalType === 'shop') paintModal(shopHTML(), 'shop-modal');
    else if (modalType === 'bag') paintModal(bagHTML(), 'bag-modal');
    else if (modalType === 'quests') paintModal(questsHTML(), 'quest-modal');
    else if (modalType === 'mail') paintModal(mailHTML(), 'mail-modal');
    else if (modalType === 'help') paintModal(helpHTML(), 'help-modal');
    else if (modalType === 'animals') paintModal(animalsHTML(), 'animals-modal');
    else if (modalType === 'orchard') paintModal(orchardHTML(), 'orchard-modal');
    else if (modalType === 'land') paintModal(landHTML(landPlotIndex), 'land-modal');
    const body = $('.modal-body', modalPanel);
    if (body) body.scrollTop = scroll;
  }

  /* ---------------- cửa hàng ---------------- */
  function shopHTML() {
    const lvl = state.player.level;
    const qty = shopQty;
    const tabs = `<div class="tabs">
      <button class="tab ${shopTab === 'seeds' ? 'active' : ''}" data-tab="seeds">🌱 Hạt giống</button>
      <button class="tab ${shopTab === 'supplies' ? 'active' : ''}" data-tab="supplies">🧺 Vật tư</button>
      <span class="qty-wrap">Mua:
        <button class="tab ${qty === 1 ? 'active' : ''}" data-qty="1">×1</button>
        <button class="tab ${qty === 5 ? 'active' : ''}" data-qty="5">×5</button>
      </span>
    </div>`;

    let cards = '';
    if (shopTab === 'seeds') {
      cards = CROP_IDS.map(id => {
        const c = CROPS[id];
        const locked = lvl < c.unlock;
        const owned = state.seeds[id] || 0;
        const total = c.price * qty;
        return `<div class="shop-card">
          <div class="shop-card-top">
            <div class="card-icon-wrap">${iconTag('seed_' + id)}</div>
            <div>
              <div class="card-name">${c.name}</div>
              <div class="card-sub">Lớn sau ${c.grow}s • Bán ${c.sell} vàng</div>
              <div class="card-level">${locked ? '🔒 Mở khóa cấp ' + c.unlock : 'Sẵn sàng gieo trồng'}</div>
            </div>
          </div>
          <div class="card-bottom">
            <span class="owned">Có ${owned}</span>
            <span class="price"><span class="coin-ic"></span>${fmt(total)}</span>
            <button class="btn-buy" data-buy-seed="${id}" ${locked ? 'disabled' : ''}>Mua${qty > 1 ? ' ×' + qty : ''}</button>
          </div>
          ${locked ? `<div class="card-locked"><span class="lock-ic">🔒</span>Cấp ${c.unlock}</div>` : ''}
        </div>`;
      }).join('');
    } else {
      cards = Object.keys(SUPPLIES).map(id => {
        const s = SUPPLIES[id];
        const owned = state.inventory[id] || 0;
        const total = s.price * qty;
        return `<div class="shop-card">
          <div class="shop-card-top">
            <div class="card-icon-wrap">${iconTag(s.icon)}</div>
            <div>
              <div class="card-name">${s.name}</div>
              <div class="card-sub">${s.blurb}</div>
              <div class="card-level">Có thể mua ngay</div>
            </div>
          </div>
          <div class="card-bottom">
            <span class="owned">Có ${owned}</span>
            <span class="price"><span class="coin-ic"></span>${fmt(total)}</span>
            <button class="btn-buy" data-buy-supply="${id}">Mua${qty > 1 ? ' ×' + qty : ''}</button>
          </div>
        </div>`;
      }).join('');
      const maxE = energyMax(lvl);
      cards += `<div class="shop-card">
        <div class="shop-card-top">
          <div class="card-icon-wrap">${iconTag(ENERGY_ITEM.icon)}</div>
          <div>
            <div class="card-name">${ENERGY_ITEM.name}</div>
            <div class="card-sub">${ENERGY_ITEM.blurb}</div>
            <div class="card-level">Hiện tại: ${Math.floor(state.player.energy)}/${maxE}</div>
          </div>
        </div>
        <div class="card-bottom">
          <span class="owned">Hồi nhanh</span>
          <span class="price"><span class="coin-ic"></span>${fmt(ENERGY_ITEM.price)}</span>
          <button class="btn-buy" data-buy-energy ${state.player.energy > maxE - 10 ? 'disabled' : ''}>Mua</button>
        </div>
      </div>`;
    }

    return modalHead('Cửa hàng nông trại', 'Hạt giống tốt, vật tư đủ, mùa màng bội thu!') +
      `<div class="modal-body">
        <p class="modal-intro">Mua hạt giống để gieo trồng, mua vật tư để chăm sóc cây và vật nuôi. Nông sản thu hoạch đem bán trong Túi đồ.</p>
        ${tabs}
        <div class="shop-grid">${cards}</div>
      </div>
      <div class="modal-foot">
        <span class="bag-total" style="margin:0;padding:.4em .7em">Ví của bạn: <b><span class="coin-ic"></span> ${fmt(state.player.coins)}</b></span>
        <button class="btn btn-ghost" data-close>Đóng</button>
      </div>`;
  }

  function buySeed(id) {
    const c = CROPS[id];
    if (!c) return;
    if (state.player.level < c.unlock) {
      toast(`Cần đạt cấp ${c.unlock} để mua hạt ${c.name}.`, 'err');
      GameAudio.sfx('error');
      return;
    }
    const qty = shopQty;
    const cost = c.price * qty;
    if (state.player.coins < cost) {
      toast('Không đủ vàng rồi! Bán nông sản trong Túi đồ để có thêm.', 'err');
      GameAudio.sfx('error');
      return;
    }
    state.player.coins -= cost;
    state.seeds[id] = (state.seeds[id] || 0) + qty;
    track('buySeed', qty);
    GameAudio.sfx('coin');
    toast(`Đã mua ${qty} hạt ${c.name}.`, 'gold', 2000);
    updateHUD();
    save();
    refreshModal();
  }

  function buySupply(id) {
    const s = SUPPLIES[id];
    if (!s) return;
    const qty = shopQty;
    const cost = s.price * qty;
    if (state.player.coins < cost) {
      toast('Không đủ vàng rồi!', 'err');
      GameAudio.sfx('error');
      return;
    }
    state.player.coins -= cost;
    state.inventory[id] = (state.inventory[id] || 0) + qty;
    GameAudio.sfx('coin');
    toast(`Đã mua ${qty} ${s.name}.`, 'gold', 2000);
    updateHUD();
    save();
    refreshModal();
  }

  function buyEnergy() {
    const maxE = energyMax(state.player.level);
    if (state.player.energy > maxE - 10) {
      toast('Năng lượng đang đầy, chưa cần dùng tới.', 'err');
      return;
    }
    if (state.player.coins < ENERGY_ITEM.price) {
      toast('Không đủ vàng rồi!', 'err');
      GameAudio.sfx('error');
      return;
    }
    state.player.coins -= ENERGY_ITEM.price;
    state.player.energy = Math.min(maxE, state.player.energy + 15);
    state.player.energyTs = now();
    GameAudio.sfx('coin');
    toast('Nước tăng lực mát lạnh! +15 năng lượng.', 'gold');
    updateHUD();
    save();
    refreshModal();
  }

  /* ---------------- túi đồ ---------------- */
  function bagHTML() {
    const cards = [];
    let totalQty = 0, totalValue = 0;
    GOOD_IDS.forEach(id => {
      const qty = state.inventory[id] || 0;
      if (!qty) return;
      totalQty += qty;
      totalValue += qty * GOODS[id].sell;
      cards.push(`<div class="stuff-card">
        ${iconTag(GOODS[id].icon)}
        <div class="stuff-name">${GOODS[id].name}</div>
        <div class="stuff-qty">Có ${qty} • ${GOODS[id].sell} vàng/cái</div>
        <div class="sell-row">
          <button class="btn-sell" data-sell="${id}">Bán 1</button>
          <button class="btn-sell" data-sell-stack="${id}">Bán hết</button>
        </div>
      </div>`);
    });

    const supplies = Object.keys(SUPPLIES).map(id => {
      const qty = state.inventory[id] || 0;
      return `<span class="gift-item">${iconTag(SUPPLIES[id].icon)}${SUPPLIES[id].name} × ${qty}</span>`;
    }).join('');

    const body = cards.length
      ? `<div class="bag-total">
          <span>Đang có <b>${totalQty}</b> nông sản, trị giá <b>${fmt(totalValue)} vàng</b>.</span>
          <button class="btn btn-gold" data-sell-all>Bán tất cả</button>
        </div>
        <div class="stuff-grid">${cards.join('')}</div>
        <div class="modal-intro" style="margin-top:1em">Vật tư trong nhà: ${supplies}</div>`
      : `<div class="empty-state"><span class="big">🧺</span>Túi đang trống trơn.<br>Hãy ra vườn thu hoạch nông sản nhé!</div>`;

    return modalHead('Túi nông sản', 'Thu hoạch rồi đem bán, vàng sẽ đầy túi!') +
      `<div class="modal-body">
        ${body}
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-go-shop>Gé cửa hàng</button>
        <button class="btn" data-close>Đóng</button>
      </div>`;
  }

  function sellItem(id, qty) {
    const have = state.inventory[id] || 0;
    qty = Math.min(qty || 1, have);
    if (qty <= 0) { toast('Không còn nông sản này để bán.', 'err'); return; }
    const g = GOODS[id];
    const money = g.sell * qty;
    state.inventory[id] = have - qty;
    state.player.coins += money;
    track('sell', qty);
    addParticles(640 + (Math.random() - 0.5) * 80, 470, 'coin', '#ffd45e', 8, 40);
    GameAudio.sfx('sell');
    toast(`Bán ${qty} ${g.name} được ${fmt(money)} vàng.`, 'gold', 2200);
    updateHUD();
    save();
    refreshModal();
  }

  function sellAll() {
    let qty = 0, money = 0;
    GOOD_IDS.forEach(id => {
      const n = state.inventory[id] || 0;
      if (!n) return;
      qty += n;
      money += n * GOODS[id].sell;
      state.inventory[id] = 0;
    });
    if (!qty) { toast('Túi đang trống, chẳng có gì để bán.', 'err'); return; }
    state.player.coins += money;
    track('sell', qty);
    GameAudio.sfx('sell');
    addParticles(640, 460, 'coin', '#ffd45e', 18, 60);
    toast(`Bán ${qty} nông sản, thu về ${fmt(money)} vàng!`, 'gold', 3200);
    updateHUD();
    save();
    refreshModal();
  }

  /* ---------------- lịch canh tác ---------------- */
  function rewardChips(r) {
    const out = [];
    if (r.coins) out.push(`+${fmt(r.coins)} vàng`);
    if (r.xp) out.push(`+${r.xp} XP`);
    if (r.items) Object.keys(r.items).forEach(id => out.push(`+${r.items[id]} ${SUPPLIES[id] ? SUPPLIES[id].name : id}`));
    if (r.seeds) Object.keys(r.seeds).forEach(id => out.push(`+${r.seeds[id]} hạt ${CROPS[id].name.toLowerCase()}`));
    return out.map(t => `<span class="reward-chip">${t}</span>`).join('');
  }

  function questsHTML() {
    const chainDone = state.quests.chainDone;
    const current = state.quests.chainIndex;
    const doneCount = chainDone ? CHAIN.length : current;
    const rows = [];
    if (!chainDone) {
      for (let k = 0; k < 3; k++) {
        const i = current + k;
        if (i >= CHAIN.length) break;
        const q = CHAIN[i];
        const isCurrent = i === current;
        const prog = isCurrent ? questProgress(q) : 0;
        const can = isCurrent && prog >= q.need;
        const pct = q.need ? prog / q.need * 100 : 0;
        rows.push(`<div class="quest-item" style="${isCurrent ? '' : 'opacity:.45'}">
          <div class="quest-check">${isCurrent ? '' : ''}</div>
          <div class="quest-info">
            <div class="quest-name">${i + 1}. ${q.title}${isCurrent ? ' <small>• đang làm</small>' : ''}</div>
            <div class="quest-rewards">${rewardChips(q.reward)}</div>
            ${isCurrent ? `<div class="quest-progress"><i style="width:${clamp(pct, 0, 100)}%"></i></div>` : ''}
          </div>
          ${can ? `<button class="claim-btn" data-claim-chain>Nhận</button>` : `<span class="done-label">${isCurrent ? prog + '/' + q.need : 'Sắp tới'}</span>`}
        </div>`);
      }
    }
    const completedNote = doneCount > 0
      ? `<div class="quest-completed-note">✓ Đã hoàn thành ${doneCount}/${CHAIN.length} mục tiêu lớn</div>`
      : '';

    const dailyRows = state.quests.daily.map((d, i) => {
      const p = dailyProgress(d, i);
      const can = !d.claimed && p >= d.need;
      return `<div class="quest-item ${d.claimed ? 'claimed' : p >= d.need ? 'done' : ''}">
        <div class="quest-check">${d.claimed || p >= d.need ? '✓' : ''}</div>
        <div class="quest-info">
          <div class="quest-name">${d.title}</div>
          <div class="quest-rewards">${rewardChips(d.reward)}</div>
          <div class="quest-progress"><i style="width:${clamp(p / d.need * 100, 0, 100)}%"></i></div>
        </div>
        ${can ? `<button class="claim-btn" data-claim-daily="${i}">Nhận</button>` : d.claimed ? `<span class="done-label">Đã nhận</span>` : `<span class="done-label">${p}/${d.need}</span>`}
      </div>`;
    }).join('');

    return modalHead('Lịch canh tác', 'Việc hôm nay, vàng hôm nay — làm xong nhớ nhận thưởng!') +
      `<div class="modal-body">
        <p class="modal-intro">Hoàn thành từng mục tiêu để nhận vàng, XP và hạt giống. Lịch canh tác chỉ dẫn bạn từ những ô đất đầu tiên tới cả khu vườn bội thu.</p>
        ${chainDone ? `<div class="help-tip" style="border-color:#ffd35c;color:#ffe9ac;background:rgba(255,210,90,.12)">🌟 Bạn đã hoàn thành trọn vẹn Lịch canh tác! Phần thưởng lớn đã được trao. Tiếp tục chăm sóc nông trại và hoàn thành nhiệm vụ hằng ngày nhé.</div>` : ''}
        <div class="quest-board-inner">
          <h3 class="quest-section-title">Việc lớn trong mùa</h3>
          ${completedNote}
          ${rows.join('')}
        </div>
        <div class="quest-board-inner">
          <h3 class="quest-section-title">Nhiệm vụ hôm nay</h3>
          ${dailyRows || '<div class="q-empty">Hôm nay chưa có nhiệm vụ mới.</div>'}
        </div>
      </div>
      <div class="modal-foot">
        <span class="bag-total" style="margin:0;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:#e8e3c5">Cấp ${state.player.level} • ${fmt(state.player.xp)} XP</span>
        <button class="btn btn-ghost" data-close>Đóng</button>
      </div>`;
  }

  /* ---------------- hòm thư ---------------- */
  function mailGiftSeed() {
    return CROP_IDS[hashStr(dayKey() + '-mail') % 3];
  }

  function mailHTML() {
    const ready = mailReady();
    const seed = mailGiftSeed();
    const left = Math.max(0, MAIL_COOLDOWN - (now() - state.mail.lastClaim));
    const gifts = `<div class="gift-list">
      <span class="gift-item">${iconTag('coin')}120 vàng</span>
      <span class="gift-item">${iconTag('fertilizer')}1 phân bón</span>
      <span class="gift-item">${iconTag('seed_' + seed)}2 hạt ${CROPS[seed].name.toLowerCase()}</span>
      <span class="gift-item">${iconTag('energy')}10 năng lượng</span>
    </div>`;
    const letter = ready
      ? `<div class="letter-paper">
          <h3>Gửi Bé Nông mến thương,</h3>
          <p>Bà Tư nghe nói nông trại của cháu mùa này xanh tốt lắm. Bà gửi chút quà nhỏ để cháu mua thêm hạt giống, chăm đàn gà và bò cho thật khỏe nhé.</p>
          <p>Nhớ tưới cây mỗi ngày, đừng để đất khô. Khi nào rảnh, ghé thăm vườn thú và câu cá cùng bà con trong làng.</p>
          ${gifts}
          <div class="sign">Thương cháu — Bà Tư 🌾</div>
        </div>`
      : `<div class="letter-paper">
          <h3>Hòm thư đang trống...</h3>
          <p>Bà Tư chưa gửi thư mới. Cháu hãy chăm sóc khu vườn, rồi quay lại sau nhé. Thư tiếp theo sẽ đến sau <b>${fmtTime(left)}</b>.</p>
          <p>Trong lúc chờ, thử câu một con cá ở hồ nước cuối vườn xem sao?</p>
          <div class="sign">Hẹn gặp lại — Bà Tư</div>
        </div>`;

    return modalHead('Hòm thư làng', ready ? 'Có thư mới từ Bà Tư!' : 'Hôm nay chưa có thư mới') +
      `<div class="modal-body">${letter}</div>
      <div class="modal-foot">
        ${ready
          ? `<button class="btn btn-gold" data-mail-claim>Nhận quà</button>`
          : `<span class="modal-intro" style="margin:0">Thư mới sau ${fmtTime(left)}</span>`}
        <button class="btn btn-ghost" data-close>Đóng</button>
      </div>`;
  }

  function claimMail() {
    if (!mailReady()) return;
    const seed = mailGiftSeed();
    state.mail.lastClaim = now();
    state.player.coins += 120;
    state.inventory.fertilizer = (state.inventory.fertilizer || 0) + 1;
    state.seeds[seed] = (state.seeds[seed] || 0) + 2;
    state.player.energy = Math.min(energyMax(state.player.level), state.player.energy + 10);
    state.player.energyTs = now();
    addXp(10);
    GameAudio.sfx('gift');
    addParticles(640, 460, 'spark', '#ffe27a', 18, 80);
    toast('Đã nhận quà từ Bà Tư: 120 vàng, 1 phân bón, 2 hạt giống và 10 năng lượng!', 'gold', 3800);
    updateHUD();
    save();
    refreshModal();
  }

  /* ---------------- hướng dẫn / cài đặt ---------------- */
  function helpHTML() {
    return modalHead('Sổ tay nông dân', 'Mọi điều cần biết để khu vườn thêm xanh') +
      `<div class="modal-body">
        <div class="help-grid">
          <div class="help-step"><span class="hs-ico">⛏️</span><div><b>1. Mở đất & khai hoang</b>Bắt đầu với 2 ô miễn phí. Ô khóa cần đủ cả cấp độ và vàng. Mỗi cấp từ 2 đến 6 cho phép mua thêm 2 ô; giá 80–800 vàng. Dùng Cuốc để tạo luống sau khi mở.</div></div>
          <div class="help-step"><span class="hs-ico">🌱</span><div><b>2. Gieo & tưới</b>Chọn hạt giống, click ô đất để gieo. Tưới nước giúp cây lớn nhanh hơn.</div></div>
          <div class="help-step"><span class="hs-ico">🧺</span><div><b>3. Thu hoạch</b>Khi cây chín, click để hái. Mở Túi đồ để bán nông sản lấy vàng.</div></div>
          <div class="help-step"><span class="hs-ico">🐄</span><div><b>4. Chăn nuôi</b>Mở trang “Chăn nuôi” ở cột bên trái để cho ăn, thu sữa và trứng.</div></div>
          <div class="help-step"><span class="hs-ico">🎣</span><div><b>5. Câu cá</b>Mở “Hồ cá”, thả câu rồi nhấn KÉO thật nhanh khi cá cắn.</div></div>
          <div class="help-step"><span class="hs-ico">🌳</span><div><b>6. Vườn cây</b>Mở “Vườn cây” để hái 3 quả táo mỗi 75 giây.</div></div>
          <div class="help-step"><span class="hs-ico">👩‍🌾</span><div><b>7. Vườn bạn</b>Mở “Vườn bạn” trên thanh menu để ghé thăm, tưới giúp và nhận quà từ bạn bè.</div></div>
        </div>
        <div class="help-tip">
          <b>Mẹo nhỏ:</b> Nước và phân bón giúp cây chín nhanh hơn; bón phân còn tăng thêm 1 nông sản mỗi lần thu hoạch. Đừng quên mở Hòm thư mỗi ngày để nhận quà của Bà Tư.
        </div>
        <h3 class="quest-section-title" style="color:#55703a;margin-top:1em">Phím tắt</h3>
        <p class="modal-intro" style="margin-bottom:.4em">
          <kbd>1</kbd> Bàn tay &nbsp; <kbd>2</kbd> Cuốc &nbsp; <kbd>3</kbd> Gieo hạt &nbsp; <kbd>4</kbd> Tưới &nbsp; <kbd>5</kbd> Bón phân &nbsp; <kbd>6</kbd> Thu hoạch &nbsp;
          <kbd>S</kbd> Shop &nbsp; <kbd>B</kbd> Túi &nbsp; <kbd>Q</kbd> Nhiệm vụ &nbsp; <kbd>M</kbd> Thư &nbsp; <kbd>H</kbd> Trợ giúp
        </p>
        <h3 class="quest-section-title" style="color:#55703a;margin-top:1.1em">Tùy chọn</h3>
        <div class="settings-list">
          <div class="setting-row"><div class="sr-info"><b>Âm thanh</b><small>Tiếng động khi làm vườn</small></div><button class="switch ${state.settings.sound ? 'on' : ''}" data-toggle-sound aria-label="Bật tắt âm thanh"></button></div>
          <div class="setting-row"><div class="sr-info"><b>Nhạc nền</b><small>Giai điệu đồng quê nhẹ nhàng</small></div><button class="switch ${state.settings.music ? 'on' : ''}" data-toggle-music aria-label="Bật tắt nhạc nền"></button></div>
          <div class="setting-row"><div class="sr-info"><b>Bắt đầu lại</b><small>Xóa toàn bộ ván chơi hiện tại</small></div><button class="danger-btn" data-reset>Xóa ván</button></div>
        </div>
        <p class="credits">Nông Trại Vui Vẻ • Tựa game tuổi thơ được vẽ lại bằng tình yêu<br>Toàn bộ hình ảnh và âm thanh được tạo trực tiếp trong trình duyệt, không dùng tài nguyên ngoài.</p>
      </div>
      <div class="modal-foot"><button class="btn" data-close>Tiếp tục làm nông</button></div>`;
  }

  function welcomeHTML() {
    return modalHead('Chào mừng về nông trại!', 'Một ngày nắng đẹp đang chờ Bé Nông') +
      `<div class="modal-body">
        <p class="modal-intro">Đây là nông trại nhỏ của bạn, được chia thành các trang riêng: Trồng trọt, Chăn nuôi, Hồ cá và Vườn cây. Hãy bắt đầu ở trang Trồng trọt bằng những việc đơn giản nhất.</p>
        <div class="help-grid">
          <div class="help-step"><span class="hs-ico">⛏️</span><div><b>Chọn Cuốc</b>Click vào ô cỏ để khai hoang. Mỗi hành động tốn 1 năng lượng.</div></div>
          <div class="help-step"><span class="hs-ico">🌱</span><div><b>Gieo & tưới</b>Chọn hạt giống ở thanh dưới, click ô đất. Tưới nước để cây lớn nhanh.</div></div>
          <div class="help-step"><span class="hs-ico">🏆</span><div><b>Nhận thưởng</b>Mở “Nhiệm vụ” trên thanh menu, hoặc bấm thẻ “Việc đang làm” bên trái.</div></div>
          <div class="help-step"><span class="hs-ico">🧺</span><div><b>Bán nông sản</b>Mở Túi đồ, bán những gì đã thu hoạch để mua thêm hạt giống.</div></div>
        </div>
        <div class="help-tip">Bạn bắt đầu với 2 ô đất. Hoàn thành các nhiệm vụ cuốc, gieo, tưới và thu hoạch để lên cấp 2. Đủ cấp và vàng mới mở thêm đất; mỗi cấp từ 2 đến 6 có thêm 2 ô có thể mua.</div>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" data-welcome>Bắt đầu làm nông</button></div>`;
  }

  function confirmHTML() {
    return modalHead('Bắt đầu lại ván mới?', 'Khu vườn cũ sẽ được thay bằng một mảnh đất mới') +
      `<div class="modal-body">
        <p class="modal-intro">Toàn bộ vàng, cấp độ, cây trồng và vật nuôi sẽ bị xóa. Bạn chắc chắn muốn làm lại từ đầu chứ?</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-close>Giữ ván cũ</button>
          <button class="btn btn-gold" data-confirm-reset>Xóa và chơi lại</button>
        </div>
      </div>`;
  }

  /* ---------------- bảng chăn nuôi ---------------- */
  function drawAnimalPortrait(cv, a) {
    const c = cv.getContext('2d');
    cv.width = 360;
    cv.height = 225;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.scale(2, 2);
    const w = 180, h = 112.5;
    const sky = c.createLinearGradient(0, 0, 0, 65);
    sky.addColorStop(0, '#d4f3ff');
    sky.addColorStop(1, '#f3fbe4');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, 65);
    const grass = c.createLinearGradient(0, 55, 0, h);
    grass.addColorStop(0, '#a5e372');
    grass.addColorStop(1, '#6dbb43');
    c.fillStyle = grass;
    c.fillRect(0, 55, w, h - 55);
    // hàng rào
    for (let i = 0; i < 5; i++) ART.util.drawFencePost(c, 12 + i * 39, 62, 26, 6);
    ART.util.drawRail(c, 10, 48, 170, 48, 3);
    ART.util.drawRail(c, 10, 56, 170, 56, 3);
    // cỏ khô
    ART.util.drawStone(c, 20, 96, 16, 6, 0, '#e7c269');
    c.strokeStyle = 'rgba(150,100,25,.5)';
    c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(8 + i * 7, 92); c.lineTo(10 + i * 7, 101); c.stroke();
    }
    // con vật
    c.save();
    if (a.type === 'cow') {
      c.translate(2, 2);
      ART.drawAnimal(c, Object.assign({}, a, { x: 88, y: 105, dir: 1, moving: false, phase: 0.4 }), now() / 1000);
    } else {
      c.translate(0, 5);
      c.scale(1.85, 1.85);
      ART.drawAnimal(c, Object.assign({}, a, { x: 47, y: 55, dir: 1, moving: false, phase: 0.8 }), now() / 1000);
    }
    c.restore();
    // bóng nhẹ viền
    c.strokeStyle = 'rgba(80,55,20,.12)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
  }

  function hydrateAnimalPortraits(root) {
    root.querySelectorAll('canvas[data-animal]').forEach(cv => {
      if (cv.dataset.done === '1') return;
      const a = state.animals.find(x => x.id === cv.dataset.animal);
      if (!a) return;
      drawAnimalPortrait(cv, a);
      cv.dataset.done = '1';
    });
  }

  function areaHeaderRes(html) {
    areaRes.innerHTML = html;
    hydrateIcons(areaRes);
  }

  function animalsPageHTML() {
    const hay = state.inventory.hay || 0;
    const cards = state.animals.map(a => {
      const isCow = a.type === 'cow';
      const ready = animalReady(a);
      const producing = a.state === 'producing' && !ready;
      const progress = producing
        ? clamp((now() - a.fedAt) / Math.max(1, a.readyAt - a.fedAt), 0, 1)
        : 0;
      const statusClass = ready ? 'ready' : producing ? 'producing' : '';
      const statusText = ready ? 'Sẵn sàng thu hoạch' : producing ? 'Đang cho sản phẩm' : 'Đang đói';
      let action = '';
      if (ready) {
        action = `<button class="animal-action gold" data-animal-collect="${a.id}">Thu hoạch ${isCow ? 'sữa' : 'trứng'}</button>`;
      } else if (producing) {
        action = `<button class="animal-action" disabled>Còn ${fmtTime(Math.max(0, a.readyAt - now()))}</button>`;
      } else {
        action = `<button class="animal-action" data-animal-feed="${a.id}" ${hay <= 0 ? 'disabled' : ''}>Cho ăn (1 cỏ)</button>`;
      }
      return `<div class="animal-card">
        <div class="animal-portrait">
          <canvas data-animal="${a.id}"></canvas>
          <span class="animal-status ${statusClass}">${statusText}</span>
        </div>
        <div class="animal-body">
          <div class="animal-name">${a.name}</div>
          <div class="animal-sub">${isCow ? 'Bò sữa • cho sữa sau 30 giây' : 'Gà mái • cho trứng sau 22 giây'}</div>
          ${producing ? `<div class="animal-progress"><i style="width:${progress * 100}%"></i></div>` : ''}
          <div class="animal-actions">${action}${ready ? `<span class="animal-note">+${isCow ? 'sữa' : 'trứng'} vào túi</span>` : ''}</div>
          ${!producing && !ready ? `<div class="animal-note">Tốn 1 năng lượng và 1 cỏ khô.</div>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="animals-intro">
        <p class="modal-intro" style="margin:0">Cho vật nuôi ăn no, chờ một chút rồi quay lại thu hoạch. Sản phẩm sẽ nằm trong Túi đồ.</p>
      </div>
      <div class="animals-grid">${cards}</div>
      <div class="area-actions">
        <button class="btn btn-ghost" data-open-supplies>Mua cỏ khô</button>
        <button class="btn btn-ghost" data-open-bag>Mở túi đồ</button>
      </div>
      <div class="area-tip">Mẹo: cho bò ăn trước rồi quay sang tưới vườn, lát quay lại là có sữa. Gà cho trứng nhanh hơn bò.</div>`;
  }

  function fishingPageHTML() {
    const p = fishPanel.phase;
    return `<div class="area-fishing-grid">
      <div>
        <div class="fish-pond ${p === 'waiting' ? 'waiting' : ''} ${p === 'bite' ? 'bite' : ''}" id="fishPond">
          <span class="fish-lily l1"></span><span class="fish-lily l2"></span><span class="fish-lily l3"></span>
          <span class="fish-reed r1"></span><span class="fish-reed r2"></span><span class="fish-reed r3"></span>
          <span class="fish-shadow f1"></span><span class="fish-shadow f2"></span>
          <span class="fish-ripple"></span><span class="fish-bobber"></span>
          <div class="fish-message ${p === 'bite' ? 'gold' : ''}" id="fishMessage">${p === 'waiting' ? 'Chờ cá cắn câu...' : p === 'bite' ? 'CÁ CẮN CÂU! Nhấn ngay!' : p === 'result' ? fishPanel.result : 'Nước hồ phẳng lặng...'}</div>
        </div>
        <div class="fish-timer ${p === 'bite' ? 'active' : ''}" id="fishTimer"><i></i></div>
        <div class="fish-panel-actions">
          <button class="btn ${p === 'bite' ? 'btn-gold' : ''}" id="fishAction" data-fish-action="${p === 'bite' ? 'reel' : 'cast'}" ${p === 'waiting' ? 'disabled' : ''}>${p === 'waiting' ? 'Đang chờ...' : p === 'bite' ? 'KÉO!' : p === 'result' ? 'Câu tiếp' : 'Thả câu (2 năng lượng)'}</button>
          <span class="fish-result" id="fishResult">${p === 'result' ? fishPanel.result : 'Cá chép 65 vàng • Cá vàng 130 vàng'}</span>
        </div>
        <div class="fish-collection" id="fishInv">${fishCollectionHTML()}</div>
      </div>
      <aside class="area-fishing-side">
        <b>Cẩm nang câu cá</b>
        <p>Mỗi lần thả câu tốn 2 năng lượng. Khi phao rung và hiện “CÁ CẮN CÂU!”, nhấn KÉO thật nhanh trước khi cá bơi mất.</p>
        <p>Cá chép bán 65 vàng, cá vàng quý hiếm bán 130 vàng.</p>
        <button class="btn btn-ghost" data-open-bag>Túi cá</button>
      </aside>
    </div>`;
  }

  function orchardPageHTML() {
    const ready = treeReady();
    const left = Math.max(0, state.tree.readyAt - now());
    const apples = state.inventory.apple || 0;
    return `<div class="orchard-stage"><canvas id="orchardCanvas"></canvas></div>
      <div class="orchard-stats">
        <div class="orchard-stat"><small>Trạng thái</small><b>${ready ? 'Táo đã chín!' : 'Đang chín • ' + fmtTime(left)}</b></div>
        <div class="orchard-stat"><small>Táo trong túi</small><b>${apples} quả</b></div>
        <div class="orchard-stat"><small>Giá bán</small><b>25 vàng/quả</b></div>
      </div>
      <p class="orchard-note">Mỗi lần hái được 3 quả táo đỏ. Táo có thể bán trong Túi đồ. Cây sẽ chín lại sau 75 giây.</p>
      <div class="area-actions">
        <button class="btn ${ready ? 'btn-gold' : ''}" data-orchard-harvest ${ready ? '' : 'disabled'}>${ready ? 'Hái 3 quả táo' : 'Chờ táo chín'}</button>
        <button class="btn btn-ghost" data-open-bag>Mở túi đồ</button>
      </div>`;
  }

  function updateAreaRes() {
    if (farmArea === 'animals') {
      areaHeaderRes(`<span class="gift-item">${iconTag('hay')}Cỏ khô × ${state.inventory.hay || 0}</span><span class="gift-item">${iconTag('energy')}${Math.floor(state.player.energy)} năng lượng</span>`);
    } else if (farmArea === 'fishing') {
      areaHeaderRes(`<span class="gift-item">${iconTag('energy')}Mỗi lần câu: 2 năng lượng</span><span class="gift-item">${iconTag('fish')}<b id="areaFishCount">${(state.inventory.fish || 0) + (state.inventory.goldfish || 0)}</b>&nbsp;cá</span>`);
    } else if (farmArea === 'orchard') {
      areaHeaderRes(`<span class="gift-item">${iconTag('apple')}${state.inventory.apple || 0} táo</span><span class="gift-item">${iconTag('coin')}${fmt(state.player.coins)} vàng</span>`);
    }
  }

  function animalDockHTML() {
    const a = state.animals.find(x => x.id === selectedAnimalId) || state.animals[0];
    const hay = state.inventory.hay || 0;
    const pickers = state.animals.map(x => {
      const ready = animalReady(x);
      const producing = x.state === 'producing' && !ready;
      const dot = ready ? 'ready' : producing ? 'producing' : '';
      return `<button class="animal-pick ${x.id === a.id ? 'active' : ''}" data-select-animal="${x.id}">
        <span class="ap-emoji">${x.type === 'cow' ? '🐄' : '🐔'}</span>
        <span class="ap-name">${x.name}</span>
        <i class="ap-dot ${dot}"></i>
      </button>`;
    }).join('');
    const ready = animalReady(a);
    const producing = a.state === 'producing' && !ready;
    const progress = producing ? clamp((now() - a.fedAt) / Math.max(1, a.readyAt - a.fedAt), 0, 1) : 0;
    const status = ready ? 'Sẵn sàng thu hoạch' : producing ? `Đang cho sản phẩm • ${fmtTime(Math.max(0, a.readyAt - now()))}` : 'Đang đói bụng';
    let action = '';
    if (ready) {
      action = `<button class="animal-action gold" data-animal-collect="${a.id}">Thu hoạch ${a.type === 'cow' ? 'sữa' : 'trứng'}</button>`;
    } else if (producing) {
      action = `<button class="animal-action" disabled>Đang chờ...</button>`;
    } else {
      action = `<button class="animal-action" data-animal-feed="${a.id}" ${hay <= 0 ? 'disabled' : ''}>Cho ăn (1 cỏ)</button>`;
    }
    return `<div class="animal-picker">${pickers}</div>
      <div class="animal-selected">
        <div class="sel-copy">
          <b>${a.name}</b>
          <span>${status}</span>
          <div class="sel-bar"><i style="width:${progress * 100}%"></i></div>
        </div>
        <div class="animal-actions">${action}</div>
      </div>
      <span class="hay-chip">${iconTag('hay')}× ${hay}</span>`;
  }

  function fishingDockHTML() {
    return `<div class="fish-state">
        <span class="fish-emoji">🎣</span>
        <div>
          <b id="fishDockTitle">Hồ cá phẳng lặng</b>
          <small id="fishDockText">Thả câu và chờ phao rung.</small>
          <div class="fish-mini-bar"><i id="fishDockBar" style="width:0%"></i></div>
        </div>
      </div>
      <div class="dock-actions">
        <button class="btn" id="fishAction" data-fish-action="cast">Thả câu (2 năng lượng)</button>
        <button class="btn btn-ghost" data-open-bag>Túi cá</button>
      </div>`;
  }

  function orchardDockHTML() {
    const ready = treeReady();
    const apples = state.inventory.apple || 0;
    return `<div class="orchard-state">
        <span class="ap-emoji">🍎</span>
        <div>
          <b>${ready ? 'Táo đã chín!' : 'Táo đang chín • ' + fmtTime(Math.max(0, state.tree.readyAt - now()))}</b>
          <small>Trong túi: ${apples} quả • 25 vàng/quả</small>
        </div>
      </div>
      <div class="dock-actions">
        <button class="btn ${ready ? 'btn-gold' : ''}" data-orchard-harvest ${ready ? '' : 'disabled'}>${ready ? 'Hái 3 quả táo' : 'Chờ táo chín'}</button>
        <button class="btn btn-ghost" data-open-bag>Mở túi đồ</button>
      </div>`;
  }

  function renderAreaDock() {
    if (farmArea === 'garden') return;
    updateAreaRes();
    areaDock.className = 'area-dock ' + (farmArea === 'animals' ? 'animal-dock' : farmArea === 'fishing' ? 'fish-dock' : 'orchard-dock');
    let html = '';
    if (farmArea === 'animals') html = animalDockHTML();
    else if (farmArea === 'fishing') html = fishingDockHTML();
    else html = orchardDockHTML();
    areaDock.innerHTML = html;
    hydrateIcons(areaDock);
    if (farmArea === 'fishing') updateFishingPanel();
  }

  function drawAreaFrame(t) {
    if (farmArea === 'garden' || visitOpen) return;
    areaCtx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    areaCtx.clearRect(0, 0, 1280, 720);
    AREAS.draw(areaCtx, farmArea, t, {
      animals: state.animals,
      selectedAnimalId,
      treeReady: treeReady(),
      treeShake: now() < (state.tree.shakeUntil || 0),
      fishPhase: fishPanel.phase
    });
  }

  function renderAreaPage() {
    if (farmArea === 'garden') return;
    areaPage.className = 'area-page ' + farmArea;
    areaPage.classList.remove('hidden');
    const meta = {
      animals: { kicker: 'KHU CHĂN NUÔI', title: 'Chuồng thú', sub: 'Cho ăn, chờ sản phẩm và thu hoạch sữa, trứng.' },
      fishing: { kicker: 'KHU AO CÁ', title: 'Hồ cá', sub: 'Thả câu, chờ cá cắn rồi kéo lên thật nhanh.' },
      orchard: { kicker: 'KHU VƯỜN CÂY', title: 'Vườn cây ăn quả', sub: 'Cây táo sai quả, hái 3 quả mỗi 75 giây.' }
    }[farmArea];
    areaKicker.textContent = meta.kicker;
    areaTitle.textContent = meta.title;
    areaSubtitle.textContent = meta.sub;
    renderAreaDock();
    drawAreaFrame(now() / 1000);
  }

  function startAreaRefresh() {
    clearInterval(areaRefreshTimer);
    areaRefreshTimer = setInterval(() => {
      if ((farmArea === 'animals' || farmArea === 'orchard') && areaPage && !areaPage.classList.contains('hidden')) {
        renderAreaDock();
      } else {
        clearInterval(areaRefreshTimer);
        areaRefreshTimer = null;
      }
    }, 1000);
  }

  function syncPlazaPlayback() {
    if (farmArea === 'plaza' && !visitOpen && modalRoot.classList.contains('hidden') && !$('#accountOverlay:not(.hidden)')) {
      Plaza.enter();
    } else {
      Plaza.leave();
    }
  }

  function setFarmArea(area) {
    if (!['garden', 'animals', 'fishing', 'orchard', 'plaza'].includes(area)) area = 'garden';
    if (area === 'plaza' && area === farmArea) { syncPlazaPlayback(); return; }
    if (area === farmArea && (area === 'garden' || !areaPage.classList.contains('hidden'))) {
      if (area !== 'garden') renderAreaPage();
      return;
    }
    clearInterval(areaRefreshTimer);
    areaRefreshTimer = null;
    if (farmArea === 'fishing' && area !== 'fishing') clearFishTimers();
    if (farmArea === 'plaza') Plaza.leave();
    if (area === 'fishing' && farmArea !== 'fishing') {
      clearFishTimers();
      fishPanel.phase = 'idle';
      fishPanel.result = '';
    }
    farmArea = area;
    plazaPage.classList.toggle('hidden', area !== 'plaza');
    stage.classList.toggle('plaza-mode', area === 'plaza');
    applyAudioSettings();
    setRailActive(area === 'garden' ? 'crops' : area);
    setActiveNav('farm');
    hideTooltip();
    if (area === 'garden') {
      areaPage.classList.add('hidden');
      stage.classList.remove('area-mode');
      updateHUD();
      save();
      return;
    }
    stage.classList.add('area-mode');
    if (area === 'plaza') {
      areaPage.classList.add('hidden');
      syncPlazaPlayback();
      updateHUD();
      save();
      return;
    }
    areaPage.classList.remove('hidden');
    renderAreaPage();
    updateHUD();
    if (area === 'animals' || area === 'orchard') startAreaRefresh();
    save();
  }

  function animalsHTML() {
    const hay = state.inventory.hay || 0;
    const cards = state.animals.map(a => {
      const isCow = a.type === 'cow';
      const ready = animalReady(a);
      const producing = a.state === 'producing' && !ready;
      const progress = producing
        ? clamp((now() - a.fedAt) / Math.max(1, a.readyAt - a.fedAt), 0, 1)
        : 0;
      const statusClass = ready ? 'ready' : producing ? 'producing' : '';
      const statusText = ready ? 'Sẵn sàng thu hoạch' : producing ? 'Đang cho sản phẩm' : 'Đang đói';
      let action = '';
      if (ready) {
        action = `<button class="animal-action gold" data-animal-collect="${a.id}">Thu hoạch ${isCow ? 'sữa' : 'trứng'}</button>`;
      } else if (producing) {
        action = `<button class="animal-action" disabled>Còn ${fmtTime(Math.max(0, a.readyAt - now()))}</button>`;
      } else {
        action = `<button class="animal-action" data-animal-feed="${a.id}" ${hay <= 0 ? 'disabled' : ''}>Cho ăn (1 cỏ)</button>`;
      }
      return `<div class="animal-card">
        <div class="animal-portrait">
          <canvas data-animal="${a.id}"></canvas>
          <span class="animal-status ${statusClass}">${statusText}</span>
        </div>
        <div class="animal-body">
          <div class="animal-name">${a.name}</div>
          <div class="animal-sub">${isCow ? 'Bò sữa • cho sữa sau 30 giây' : 'Gà mái • cho trứng sau 22 giây'}</div>
          ${producing ? `<div class="animal-progress"><i style="width:${progress * 100}%"></i></div>` : ''}
          <div class="animal-actions">${action}${ready ? `<span class="animal-note">+${isCow ? 'sữa' : 'trứng'} vào túi</span>` : ''}</div>
          ${!producing && !ready ? `<div class="animal-note">Tốn 1 năng lượng và 1 cỏ khô.</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return modalHead('Chuồng thú', 'Chăm sóc bò và gà để nhận sữa, trứng mỗi ngày') +
      `<div class="modal-body">
        <div class="animals-intro">
          <p class="modal-intro" style="margin:0">Cho vật nuôi ăn no, chờ một chút rồi quay lại thu hoạch. Sản phẩm sẽ nằm trong Túi đồ.</p>
          <div class="animals-resources">
            <span class="gift-item">${iconTag('hay')}Cỏ khô × ${hay}</span>
            <span class="gift-item">${iconTag('energy')}Năng lượng ${Math.floor(state.player.energy)}</span>
          </div>
        </div>
        <div class="animals-grid">${cards}</div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-open-supplies>Mua cỏ khô</button>
        <button class="btn" data-close>Đóng</button>
      </div>`;
  }

  function startPanelRefresh() {
    clearInterval(panelRefreshTimer);
    panelRefreshTimer = setInterval(() => {
      if (modalType === 'animals' || modalType === 'orchard') refreshModal();
      else { clearInterval(panelRefreshTimer); panelRefreshTimer = null; }
    }, 1200);
  }

  function openAnimals() {
    setFarmArea('animals');
  }

  /* ---------------- bảng vườn cây ---------------- */
  function drawOrchardScene(cv) {
    const c = cv.getContext('2d');
    cv.width = 1600;
    cv.height = 640;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.scale(2, 2);
    const w = 800, h = 320;
    const sky = c.createLinearGradient(0, 0, 0, 180);
    sky.addColorStop(0, '#c9f0ff');
    sky.addColorStop(1, '#f0f9d8');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    // mặt trời, mây
    c.fillStyle = 'rgba(255,240,160,.45)';
    c.beginPath(); c.arc(690, 50, 55, 0, Math.PI * 2); c.fill();
    ART.util.drawCloud(c, 170, 55, 0.65, 0.75);
    ART.util.drawCloud(c, 560, 36, 0.45, 0.55);
    // đồi cỏ
    const g = c.createLinearGradient(0, 170, 0, h);
    g.addColorStop(0, '#a5de76');
    g.addColorStop(1, '#68b747');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 190);
    c.bezierCurveTo(150, 160, 280, 200, 420, 178);
    c.bezierCurveTo(560, 158, 670, 196, 800, 172);
    c.lineTo(800, h); c.lineTo(0, h); c.closePath();
    c.fill();
    // cây
    const tx = 400, ty = 300;
    ART.util.ellipse(c, tx, ty + 6, 100, 24, 'rgba(50,85,25,.22)');
    c.fillStyle = '#8a5a2d';
    ART.util.fillRR(c, tx - 12, ty - 150, 24, 155, 8, '#8a5a2d');
    c.strokeStyle = '#6b421f'; c.lineWidth = 3;
    ART.util.rr(c, tx - 12, ty - 150, 24, 155, 8);
    c.stroke();
    c.strokeStyle = '#8a5a2d'; c.lineWidth = 12;
    c.beginPath();
    c.moveTo(tx - 4, ty - 135); c.quadraticCurveTo(tx - 75, ty - 190, tx - 100, ty - 210);
    c.moveTo(tx + 4, ty - 150); c.quadraticCurveTo(tx + 75, ty - 200, tx + 102, ty - 215);
    c.stroke();
    const blobs = [
      [-82, -215, 58, 48, '#4f9b36'], [8, -235, 68, 54, '#5dab3e'],
      [82, -208, 50, 42, '#4a9131'], [-8, -190, 72, 48, '#67b348'],
      [-112, -190, 36, 30, '#43862d'], [58, -260, 42, 34, '#70bc4c']
    ];
    blobs.forEach(([bx, by, rx, ry, col]) => {
      ART.util.ellipse(c, tx + bx, ty + by, rx, ry, col);
      c.globalAlpha = 0.25;
      ART.util.ellipse(c, tx + bx - rx * 0.2, ty + by - ry * 0.3, rx * 0.55, ry * 0.42, '#c7f095');
      c.globalAlpha = 1;
    });
    const ready = treeReady();
    const rnd = ART.util.makeRand(88);
    for (let i = 0; i < 10; i++) {
      const ax = tx - 105 + rnd() * 210;
      const ay = ty - 265 + rnd() * 120;
      if (ready) {
        c.beginPath(); c.arc(ax, ay, 7, 0, Math.PI * 2);
        c.fillStyle = i % 2 ? '#e8483a' : '#d73834'; c.fill();
        c.strokeStyle = '#a52220'; c.lineWidth = 1; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.6)';
        c.beginPath(); c.arc(ax - 2, ay - 2, 1.8, 0, Math.PI * 2); c.fill();
      } else {
        c.beginPath(); c.arc(ax, ay, 4, 0, Math.PI * 2);
        c.fillStyle = '#87b74b'; c.fill();
      }
    }
    // cỏ và hoa
    for (let i = 0; i < 30; i++) {
      ART.util.drawGrassTuft(c, 30 + rnd() * 740, 255 + rnd() * 60, 1.5 + rnd() * 2, rnd() > 0.5 ? '#4a9632' : '#6dbb43');
    }
    ART.util.drawFlower(c, 200, 290, 1.8, '#fff4df');
    ART.util.drawFlower(c, 610, 300, 1.7, '#ffe27a');
    // giỏ táo
    c.fillStyle = '#b98348';
    c.beginPath(); c.ellipse(590, 300, 36, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8a5a2c'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(590, 300, 36, 12, 0, 0, Math.PI * 2); c.stroke();
    if (ready) {
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.arc(574 + i * 11, 292 - (i % 2) * 6, 7, 0, Math.PI * 2);
        c.fillStyle = '#e8483a'; c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.arc(572 + i * 11, 290 - (i % 2) * 6, 1.7, 0, Math.PI * 2); c.fill();
      }
    }
  }

  function hydrateOrchard(root) {
    const cv = root.querySelector('#orchardCanvas');
    if (cv && cv.dataset.done !== '1') {
      drawOrchardScene(cv);
      cv.dataset.done = '1';
    }
  }

  function orchardHTML() {
    const ready = treeReady();
    const left = Math.max(0, state.tree.readyAt - now());
    const apples = state.inventory.apple || 0;
    return modalHead('Vườn cây ăn quả', 'Cây táo nhà bạn đang sai quả') +
      `<div class="modal-body">
        <div class="orchard-stage"><canvas id="orchardCanvas"></canvas></div>
        <div class="orchard-stats">
          <div class="orchard-stat"><small>Trạng thái</small><b>${ready ? 'Táo đã chín!' : 'Đang chín • ' + fmtTime(left)}</b></div>
          <div class="orchard-stat"><small>Táo trong túi</small><b>${apples} quả</b></div>
          <div class="orchard-stat"><small>Giá bán</small><b>25 vàng/quả</b></div>
        </div>
        <p class="orchard-note">Mỗi lần hái được 3 quả táo đỏ. Táo có thể bán trong Túi đồ. Cây sẽ chín lại sau 75 giây.</p>
      </div>
      <div class="modal-foot">
        <button class="btn ${ready ? 'btn-gold' : ''}" data-orchard-harvest ${ready ? '' : 'disabled'}>${ready ? 'Hái 3 quả táo' : 'Chờ táo chín'}</button>
        <button class="btn btn-ghost" data-open-bag>Mở túi đồ</button>
        <button class="btn" data-close>Đóng</button>
      </div>`;
  }

  function openOrchard() {
    setFarmArea('orchard');
  }

  function harvestTree() {
    if (!treeReady()) {
      toast(`Táo còn chín dở, quay lại sau ${fmtTime(Math.max(0, state.tree.readyAt - now()))} nhé.`, '', 2400);
      return false;
    }
    state.inventory.apple = (state.inventory.apple || 0) + 3;
    state.tree.readyAt = now() + TREE_COOLDOWN;
    state.tree.shakeUntil = now() + 700;
    addXp(5);
    addFloater(L.tree.x, L.tree.y - 270, '+3 Táo đỏ', '#fff0b8');
    toast('Hái được 3 quả táo đỏ mọng!', 'gold', 2400);
    GameAudio.sfx('shake');
    updateHUD();
    save();
    return true;
  }

  /* ---------------- hồ cá ---------------- */
  let fishPanel = { phase: 'idle', mainTimer: null, biteTimer: null, result: '' };

  function fishCollectionHTML() {
    const ids = ['fish', 'goldfish'];
    const items = ids.filter(id => (state.inventory[id] || 0) > 0);
    if (!items.length) return '<span class="fish-chip">Túi cá đang trống</span>';
    return items.map(id => `<span class="fish-chip">${iconTag(GOODS[id].icon)}${GOODS[id].name} × ${state.inventory[id]}</span>`).join('');
  }

  function fishingHTML() {
    const p = fishPanel.phase;
    return modalHead('Hồ cá', 'Thả câu, chờ cá cắn rồi kéo lên thật nhanh') +
      `<div class="modal-body">
        <p class="modal-intro">Mỗi lần thả câu tốn 2 năng lượng. Khi phao rung và hiện chữ “CÁ CẮN CÂU!”, hãy nhấn KÉO thật nhanh trước khi cá bơi mất.</p>
        <div class="fish-pond ${p === 'waiting' ? 'waiting' : ''} ${p === 'bite' ? 'bite' : ''}" id="fishPond">
          <span class="fish-lily l1"></span><span class="fish-lily l2"></span><span class="fish-lily l3"></span>
          <span class="fish-reed r1"></span><span class="fish-reed r2"></span><span class="fish-reed r3"></span>
          <span class="fish-shadow f1"></span><span class="fish-shadow f2"></span>
          <span class="fish-ripple"></span><span class="fish-bobber"></span>
          <div class="fish-message ${p === 'bite' ? 'gold' : ''}" id="fishMessage">${p === 'waiting' ? 'Chờ cá cắn câu...' : p === 'bite' ? 'CÁ CẮN CÂU! Nhấn ngay!' : p === 'result' ? fishPanel.result : 'Nước hồ phẳng lặng...'}</div>
        </div>
        <div class="fish-timer ${p === 'bite' ? 'active' : ''}" id="fishTimer"><i></i></div>
        <div class="fish-panel-actions">
          <button class="btn ${p === 'bite' ? 'btn-gold' : ''}" id="fishAction" data-fish-action="${p === 'bite' ? 'reel' : 'cast'}" ${p === 'waiting' ? 'disabled' : ''}>${p === 'waiting' ? 'Đang chờ...' : p === 'bite' ? 'KÉO!' : p === 'result' ? 'Câu tiếp' : 'Thả câu (2 năng lượng)'}</button>
          <span class="fish-result" id="fishResult">${p === 'result' ? fishPanel.result : 'Cá chép 65 vàng • Cá vàng 130 vàng'}</span>
        </div>
        <div class="fish-collection" id="fishInv">${fishCollectionHTML()}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-open-bag>Túi cá</button><button class="btn" data-close>Đóng</button></div>`;
  }

  function updateFishingPanel() {
    const action = $('#fishAction');
    if (!action) return;
    const p = fishPanel.phase;
    const title = $('#fishDockTitle');
    const text = $('#fishDockText');
    if (title) title.textContent = p === 'waiting' ? 'Đang chờ cá...' : p === 'bite' ? 'CÁ CẮN CÂU!' : p === 'result' ? 'Vừa câu được cá!' : 'Hồ cá phẳng lặng';
    if (text) text.textContent = p === 'waiting' ? 'Phao đang lập lờ trên mặt nước...' : p === 'bite' ? 'Nhấn KÉO thật nhanh trước khi cá bơi mất!' : p === 'result' ? fishPanel.result : 'Thả câu và chờ phao rung.';
    action.disabled = p === 'waiting';
    action.className = 'btn' + (p === 'bite' ? ' btn-gold' : '');
    action.dataset.fishAction = p === 'bite' ? 'reel' : 'cast';
    action.textContent = p === 'waiting' ? 'Đang chờ...' : p === 'bite' ? 'KÉO!' : p === 'result' ? 'Câu tiếp' : 'Thả câu (2 năng lượng)';
    areaDock.classList.toggle('bite', p === 'bite');
    if (p === 'bite') {
      areaDock.classList.remove('bite');
      void areaDock.offsetWidth;
      areaDock.classList.add('bite');
    }
    const ac = $('#areaFishCount');
    if (ac) ac.textContent = (state.inventory.fish || 0) + (state.inventory.goldfish || 0);
  }

  function openFishing() {
    fishPanel.phase = 'idle';
    fishPanel.result = '';
    clearFishTimers();
    setFarmArea('fishing');
    updateFishingPanel();
  }

  function startFishingGame() {
    if (!spendEnergy(2)) return;
    fishPanel.phase = 'waiting';
    fishPanel.result = '';
    updateFishingPanel();
    clearTimeout(fishPanel.mainTimer);
    clearTimeout(fishPanel.biteTimer);
    fishPanel.mainTimer = setTimeout(() => {
      fishPanel.phase = 'bite';
      GameAudio.sfx('splash');
      updateFishingPanel();
      fishPanel.biteTimer = setTimeout(() => {
        if (fishPanel.phase !== 'bite') return;
        fishPanel.phase = 'result';
        fishPanel.result = 'Cá đã bơi mất rồi! Thử lại nhé.';
        GameAudio.sfx('error');
        updateFishingPanel();
      }, 1800);
    }, 2200 + Math.random() * 2200);
  }

  function reelFishingGame() {
    if (fishPanel.phase === 'waiting') {
      toast('Suỵt... cá đang tới gần, chờ phao rung đã nhé!', '', 1800);
      return;
    }
    if (fishPanel.phase !== 'bite') {
      startFishingGame();
      return;
    }
    clearTimeout(fishPanel.mainTimer);
    clearTimeout(fishPanel.biteTimer);
    const gold = Math.random() < 0.14;
    const id = gold ? 'goldfish' : 'fish';
    state.inventory[id] = (state.inventory[id] || 0) + 1;
    addXp(6);
    track('fish', 1);
    fishPanel.phase = 'result';
    fishPanel.result = gold ? 'Ôi! Câu được Cá vàng quý hiếm!' : 'Câu được một con Cá chép béo mập!';
    GameAudio.sfx('fish');
    toast(`${fishPanel.result} +6 XP`, gold ? 'gold' : '', 2800);
    updateHUD();
    save();
    updateFishingPanel();
  }

  function clearFishTimers() {
    clearTimeout(fishPanel.mainTimer);
    clearTimeout(fishPanel.biteTimer);
    fishPanel.mainTimer = null;
    fishPanel.biteTimer = null;
    fishPanel.phase = 'idle';
  }

  function setRailActive(area) {
    $$('.rail-btn[data-area]').forEach(btn => btn.classList.toggle('active', btn.dataset.area === area));
  }

  /* ---------------- mở các bảng ---------------- */
  function openShop(tab) {
    shopTab = tab || shopTab || 'seeds';
    shopQty = 1;
    setActiveNav('shop');
    openModal('shop', shopHTML(), 'shop-modal');
  }
  function openBag() { setActiveNav('bag'); openModal('bag', bagHTML(), 'bag-modal'); }
  function openQuests() { setActiveNav('quests'); openModal('quests', questsHTML(), 'quest-modal'); }
  function openMail() { setActiveNav('mail'); openModal('mail', mailHTML(), 'mail-modal'); }
  function openHelp() { openModal('help', helpHTML(), 'help-modal'); }
  function openConfirmReset() { openModal('confirm', confirmHTML(), 'confirm-modal'); }
  function showWelcome() { openModal('welcome', welcomeHTML(), 'welcome-modal'); }

  /* ---------------- âm thanh ---------------- */
  function applyAudioSettings() {
    if (!GameAudio.ready) return;
    GameAudio.setSound(state.settings.sound);
    GameAudio.setMusic(farmArea !== 'plaza' && state.settings.sound && state.settings.music);
    updateSoundIcon();
  }
  function toggleSound() {
    GameAudio.init();
    state.settings.sound = !state.settings.sound;
    applyAudioSettings();
    updateSoundIcon();
    toast(state.settings.sound ? 'Đã bật âm thanh.' : 'Đã tắt âm thanh.', 'gold', 1600);
    save();
    if (modalType === 'help') refreshModal();
  }
  function toggleMusic() {
    GameAudio.init();
    state.settings.music = !state.settings.music;
    applyAudioSettings();
    toast(state.settings.music ? 'Nhạc nền đang ngân nga.' : 'Đã tắt nhạc nền.', 'gold', 1600);
    save();
    if (modalType === 'help') refreshModal();
  }

  /* ---------------- bắt đầu / reset ---------------- */
  function configureStart() {
    const hasSave = !FRESH && !!localStorage.getItem(KEY);
    $('#btnStart').classList.toggle('hidden', hasSave);
    $('#btnContinue').classList.toggle('hidden', !hasSave);
    $('#btnNewGame').classList.toggle('hidden', !hasSave);
  }

  function startGame() {
    GameAudio.init();
    applyAudioSettings();
    state.flags.started = true;
    saveEnabled = true;
    startScreen.classList.add('hide');
    stage.classList.remove('start-mode');
    stage.classList.remove('area-mode');
    farmArea = 'garden';
    areaPage.classList.add('hidden');
    setActiveNav('farm');
    setRailActive('crops');
    ensureDaily();
    ensureFriendsDaily();
    updateHUD();
    updateQuestPreview();
    updateToolUI();
    save();
    GameAudio.sfx('pop');
    if (!state.flags.welcomeSeen) {
      setTimeout(showWelcome, 420);
    }
  }

  function resetGame() {
    if (farmArea === 'plaza') setFarmArea('garden');
    state = fresh();
    state.flags.started = true;
    state.flags.welcomeSeen = false;
    saveEnabled = true;
    currentTool = 'hoe';
    selectedSeed = 'carrot';
    shopTab = 'seeds';
    shopQty = 1;
    fishing.phase = null;
    fishPanel.phase = 'idle';
    clearFishTimers();
    clearInterval(panelRefreshTimer);
    particles = [];
    floaters = [];
    friendSpeech = null;
    visitOpen = false;
    visitScreen.classList.add('hidden');
    farmArea = 'garden';
    clearInterval(areaRefreshTimer);
    areaRefreshTimer = null;
    areaPage.classList.add('hidden');
    stage.classList.remove('area-mode');
    pendingStartConfirm = false;
    modalRoot.classList.add('hidden');
    modalPanel.innerHTML = '';
    modalType = null;
    toastsEl.innerHTML = '';
    $('#levelBurst').classList.add('hidden');
    startScreen.classList.add('hide');
    stage.classList.remove('start-mode');
    stage.classList.remove('visit-mode');
    setActiveNav('farm');
    setRailActive('crops');
    ensureDaily();
    ensureFriendsDaily();
    buildSeedBar();
    updateHUD();
    updateQuestPreview();
    updateToolUI();
    save();
    toast('Một ván mới bắt đầu! Chúc bạn mùa màng bội thu.', 'gold', 3200);
    setTimeout(showWelcome, 420);
  }

  /* ---------------- sự kiện giao diện ---------------- */
  function bindEvents() {
    $('#navFarm').addEventListener('click', () => {
      if (visitOpen) closeVisit();
      setFarmArea('garden');
      setActiveNav('farm');
    });
    $('#navFriends').addEventListener('click', () => openVisit(visitFriendId));
    $('#navQuests').addEventListener('click', openQuests);
    $('#shopBtn').addEventListener('click', () => openShop('seeds'));
    $('#seedShopBtn').addEventListener('click', () => openShop('seeds'));
    $('#bagBtn').addEventListener('click', openBag);
    $('#mailBtn').addEventListener('click', openMail);
    $('#helpBtn').addEventListener('click', openHelp);
    el.soundBtn.addEventListener('click', toggleSound);
    $('#farmTaskChip').addEventListener('click', openQuests);
    $('#expandLandBtn').addEventListener('click', () => {
      const index = LAND.nextLocked(state.plots);
      if (index >= 0) openLand(index);
    });

    $$('.rail-btn[data-area]').forEach(btn => {
      btn.addEventListener('click', () => {
        const area = btn.dataset.area;
        if (area === 'crops') {
          if (!modalRoot.classList.contains('hidden')) closeModal();
          setFarmArea('garden');
          return;
        }
        if (area === 'animals') openAnimals();
        else if (area === 'fishing') openFishing();
        else if (area === 'orchard') openOrchard();
        else if (area === 'plaza') setFarmArea('plaza');
      });
    });

    el.waterAllBtn.addEventListener('click', waterAllPlots);
    el.harvestAllBtn.addEventListener('click', harvestAllPlots);
    $('#plazaBack').addEventListener('click', () => setFarmArea('garden'));
    document.addEventListener('account-visibility', () => { if (farmArea === 'plaza') syncPlazaPlayback(); });
    window.addEventListener('pagehide', () => { if (farmArea === 'plaza') Plaza.leave(); });
    window.addEventListener('pageshow', event => { if (event.persisted && farmArea === 'plaza') syncPlazaPlayback(); });

    areaPage.addEventListener('click', e => {
      if (e.target.closest('[data-area-back]')) { setFarmArea('garden'); return; }
      let t;
      if ((t = e.target.closest('[data-select-animal]'))) {
        selectedAnimalId = t.dataset.selectAnimal;
        renderAreaDock();
        return;
      }
      if ((t = e.target.closest('[data-animal-feed]'))) {
        const a = state.animals.find(x => x.id === t.dataset.animalFeed);
        if (a) { selectedAnimalId = a.id; interactAnimal(a); renderAreaDock(); }
        return;
      }
      if ((t = e.target.closest('[data-animal-collect]'))) {
        const a = state.animals.find(x => x.id === t.dataset.animalCollect);
        if (a) { selectedAnimalId = a.id; interactAnimal(a); renderAreaDock(); }
        return;
      }
      if (e.target.closest('[data-orchard-harvest]')) {
        if (harvestTree()) renderAreaDock();
        return;
      }
      if (e.target.closest('[data-fish-action]')) {
        const action = e.target.closest('[data-fish-action]').dataset.fishAction;
        if (action === 'reel') reelFishingGame();
        else startFishingGame();
        return;
      }
      if (e.target.closest('[data-open-bag]')) { openBag(); return; }
      if (e.target.closest('[data-open-supplies]')) { openShop('supplies'); return; }
    });

    function areaPoint(e) {
      const r = areaCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * 1280,
        y: (e.clientY - r.top) / r.height * 720
      };
    }
    areaCanvas.addEventListener('pointermove', e => {
      if (farmArea === 'garden' || areaPage.classList.contains('hidden')) return;
      const p = areaPoint(e);
      const hit = AREAS.hit(farmArea, p.x, p.y, {});
      areaCanvas.style.cursor = hit ? 'pointer' : 'default';
    });
    areaCanvas.addEventListener('click', e => {
      if (farmArea === 'garden' || areaPage.classList.contains('hidden')) return;
      const p = areaPoint(e);
      const hit = AREAS.hit(farmArea, p.x, p.y, {});
      if (!hit) return;
      if (hit.kind === 'animal') {
        selectedAnimalId = hit.id;
        renderAreaDock();
      } else if (hit.kind === 'water') {
        if (fishPanel.phase === 'bite') reelFishingGame();
        else if (fishPanel.phase !== 'waiting') startFishingGame();
      } else if (hit.kind === 'tree') {
        if (treeReady()) { if (harvestTree()) renderAreaDock(); }
        else toast(`Táo còn ${fmtTime(Math.max(0, state.tree.readyAt - now()))} nữa mới chín.`, 'gold', 2200);
      }
    });

    el.friendTabs.addEventListener('click', e => {
      const b = e.target.closest('[data-friend]');
      if (b) switchFriend(b.dataset.friend);
    });
    $('#visitBack').addEventListener('click', closeVisit);
    $('#visitBack2').addEventListener('click', closeVisit);
    el.visitWaterAll.addEventListener('click', waterAllFriend);
    el.visitGift.addEventListener('click', claimFriendGift);
    el.visitChat.addEventListener('click', chatFriend);
    friendCanvas.addEventListener('click', handleFriendCanvasClick);
    friendCanvas.addEventListener('pointermove', friendlyHover);
    friendCanvas.addEventListener('pointerleave', () => {
      friendCanvas.style.cursor = 'default';
      friendHoverIndex = -1;
    });

    $$('.tool[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });

    el.seedBar.addEventListener('click', e => {
      const b = e.target.closest('.seed-chip');
      if (!b) return;
      selectSeed(b.dataset.seed);
    });

    $('#btnStart').addEventListener('click', startGame);
    $('#btnContinue').addEventListener('click', startGame);
    $('#btnNewGame').addEventListener('click', () => {
      pendingStartConfirm = true;
      startScreen.classList.add('hide');
      openConfirmReset();
    });

    modalRoot.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) {
        closeModal();
        return;
      }
      let t;
      if ((t = e.target.closest('[data-buy-land]'))) { buyLand(Number(t.dataset.buyLand)); return; }
      if (e.target.closest('[data-open-quests]')) { openQuests(); return; }
      if ((t = e.target.closest('[data-tab]'))) {
        shopTab = t.dataset.tab;
        GameAudio.sfx('click');
        refreshModal();
        return;
      }
      if ((t = e.target.closest('[data-qty]'))) {
        shopQty = Number(t.dataset.qty) || 1;
        GameAudio.sfx('click');
        refreshModal();
        return;
      }
      if ((t = e.target.closest('[data-buy-seed]'))) { buySeed(t.dataset.buySeed); return; }
      if ((t = e.target.closest('[data-buy-supply]'))) { buySupply(t.dataset.buySupply); return; }
      if (e.target.closest('[data-buy-energy]')) { buyEnergy(); return; }
      if ((t = e.target.closest('[data-sell]'))) { sellItem(t.dataset.sell, 1); return; }
      if ((t = e.target.closest('[data-sell-stack]'))) { sellItem(t.dataset.sellStack, state.inventory[t.dataset.sellStack] || 0); return; }
      if (e.target.closest('[data-sell-all]')) { sellAll(); return; }
      if (e.target.closest('[data-claim-chain]')) { claimChain(); return; }
      if ((t = e.target.closest('[data-claim-daily]'))) { claimDaily(Number(t.dataset.claimDaily)); return; }
      if (e.target.closest('[data-mail-claim]')) { claimMail(); return; }
      if ((t = e.target.closest('[data-animal-feed]'))) {
        const a = state.animals.find(x => x.id === t.dataset.animalFeed);
        if (a) interactAnimal(a);
        return;
      }
      if ((t = e.target.closest('[data-animal-collect]'))) {
        const a = state.animals.find(x => x.id === t.dataset.animalCollect);
        if (a) interactAnimal(a);
        return;
      }
      if (e.target.closest('[data-orchard-harvest]')) {
        if (harvestTree()) refreshModal();
        return;
      }
      if (e.target.closest('[data-open-bag]')) { openBag(); return; }
      if (e.target.closest('[data-open-supplies]')) { openShop('supplies'); return; }
      if (e.target.closest('[data-fish-action]')) {
        const action = e.target.closest('[data-fish-action]').dataset.fishAction;
        if (action === 'reel') reelFishingGame();
        else startFishingGame();
        return;
      }
      if (e.target.closest('[data-go-shop]')) { openShop('seeds'); return; }
      if (e.target.closest('[data-toggle-sound]')) { toggleSound(); return; }
      if (e.target.closest('[data-toggle-music]')) { toggleMusic(); return; }
      if (e.target.closest('[data-reset]')) { openConfirmReset(); return; }
      if (e.target.closest('[data-confirm-reset]')) { resetGame(); return; }
      if (e.target.closest('[data-welcome]')) { closeModal(); return; }
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ($('#accountOverlay:not(.hidden)')) return;
      if (e.target.closest?.('input, textarea, [contenteditable="true"]') && e.key !== 'Escape') return;
      if (!startScreen.classList.contains('hide')) {
        if (e.key === 'Enter') {
          const btn = !$('#btnContinue').classList.contains('hidden') ? $('#btnContinue') : $('#btnStart');
          if (btn) btn.click();
        }
        return;
      }
      if (!modalRoot.classList.contains('hidden')) {
        if (e.key === 'Escape') closeModal();
        return;
      }
      if (visitOpen) {
        if (e.key === 'Escape') closeVisit();
        return;
      }
      if (farmArea !== 'garden') {
        if (e.key === 'Escape') setFarmArea('garden');
        return;
      }
      const k = e.key.toLowerCase();
      if (e.key >= '1' && e.key <= '6') {
        selectTool(TOOL_KEYS[Number(e.key) - 1]);
        e.preventDefault();
      } else if (k === 's') openShop('seeds');
      else if (k === 'b') openBag();
      else if (k === 'q') openQuests();
      else if (k === 'm') openMail();
      else if (k === 'h') openHelp();
      else if (k === 'escape') { hideTooltip(); }
    });

    document.addEventListener('pointerdown', function first() {
      GameAudio.init();
      applyAudioSettings();
    }, { once: true });

    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
    });
  }

  function applyServerState(saved) {
    if (!saved || typeof saved !== 'object') return false;
    suppressServerSave = true;
    try {
      state = normalize(saved);
      currentTool = state.ui.tool;
      selectedSeed = state.ui.seed;
      saveEnabled = true;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
      buildSeedBar();
      syncEnergy();
      updateToolUI();
      updateQuestPreview();
      updateHUD();
      updateFarmUI();
      if (!startScreen.classList.contains('hide')) configureStart();
      if (visitOpen) updateVisitUI();
      if (accountUser) {
        const nameEl = $('#playerName');
        if (nameEl) nameEl.textContent = accountUser.displayName || state.player.name || 'Bé Nông';
      }
      return true;
    } finally {
      suppressServerSave = false;
    }
  }

  function onAccountLogin(user) {
    accountUser = user;
    saveEnabled = true;
    if (state.player.name === 'Bé Nông' || !state.player.name) state.player.name = user.displayName || user.username;
    const nameEl = $('#playerName');
    if (nameEl) nameEl.textContent = user.displayName || user.username || state.player.name;
    updateHUD();
    configureStart();
  }

  function applyAccountProfile(user) {
    if (!user) return;
    accountUser = user;
    state.player.name = user.displayName || state.player.name;
    const nameEl = $('#playerName');
    if (nameEl) nameEl.textContent = state.player.name;
    updateHUD();
    save();
  }

  function onAccountLogout() {
    accountUser = null;
    clearTimeout(serverSaveTimer);
    serverSaveTimer = null;
    if (visitOpen) closeVisit();
    setRealFriends([]);
    const nameEl = $('#playerName');
    if (nameEl) nameEl.textContent = state.player.name || 'Bé Nông';
    updateHUD();
    configureStart();
  }

  function uploadState() {
    return uploadStateNow();
  }

  function resetToFresh() {
    suppressServerSave = true;
    try {
      state = fresh();
      currentTool = state.ui.tool;
      selectedSeed = state.ui.seed;
      saveEnabled = true;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
      buildSeedBar();
      syncEnergy();
      updateToolUI();
      updateQuestPreview();
      updateHUD();
      updateFarmUI();
      return true;
    } finally {
      suppressServerSave = false;
    }
  }

  function refreshStart() {
    configureStart();
    updateHUD();
  }

  function uiTick() {
    syncEnergy();
    ensureDaily();
    ensureFriendsDaily();
    updateHUD();
    if (visitOpen) updateVisitWallet();
    else if (hover) refreshHover();
  }

  function init() {
    resize();
    ART.ensureGardenStatic();
    ensureDaily();
    ensureFriendsDaily();
    buildSeedBar();
    bindEvents();
    areaPage.classList.add('hidden');
    stage.classList.remove('area-mode');
    syncEnergy();
    updateHUD();
    updateQuestPreview();
    updateToolUI();
    configureStart();

    if (AUTO_PLAY) {
      state.flags.started = true;
      saveEnabled = true;
      startScreen.classList.add('hide');
      stage.classList.remove('start-mode');
      updateHUD();
      save();
    } else {
      stage.classList.add('start-mode');
    }

    requestAnimationFrame(frame);
    setInterval(uiTick, 650);
    setInterval(() => {
      if (state.flags.started) save();
    }, 7000);
  }

  // API nhỏ dùng cho kiểm thử / gỡ lỗi
  window.NT = {
    get state() { return state; },
    get fishing() { return fishing; },
    get tool() { return currentTool; },
    save,
    openShop,
    openBag,
    openQuests,
    openMail,
    openHelp,
    resetGame,
    getState() { return state; },
    applyServerState,
    onAccountLogin,
    onAccountLogout,
    applyAccountProfile,
    uploadState,
    resetToFresh,
    refreshStart,
    setRealFriends,
    applyFriendUpdate,
    openFriendVisit,
    getCurrentFriendId() { return visitFriendId; },
    addCoins(n) { state.player.coins += n; updateHUD(); save(); },
    addXp(n) { addXp(n); save(); }
  };

  init();

})();
