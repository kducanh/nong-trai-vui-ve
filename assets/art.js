/* =========================================================
   ART — cảnh nông trại isometric được vẽ hoàn toàn bằng canvas
   Phần 1: tiện ích, bố cục, cảnh tĩnh (trời, cỏ, đường, ruộng,
   nhà kho, vườn thú, hồ cá, cây táo, biển gỗ...)
   ========================================================= */
(function () {
  'use strict';
  const ART = (window.ART = window.ART || {});
  const W = 1280, H = 720, TAU = Math.PI * 2;

  ART.W = W; ART.H = H;

  /* ---------------- tiện ích ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, pct) {
    const [r, g, b] = hexToRgb(hex);
    const t = pct < 0 ? 0 : 255;
    const p = Math.abs(pct);
    return `rgb(${Math.round(lerp(r, t, p))},${Math.round(lerp(g, t, p))},${Math.round(lerp(b, t, p))})`;
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function makeRand(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, fill) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function ellipse(ctx, x, y, rx, ry, fill, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function diamondPath(ctx, cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
  }
  function blobPath(ctx, cx, cy, rx, ry, pts, rot) {
    rot = rot || 0;
    const n = pts.length;
    const P = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU;
      P.push([cx + Math.cos(a) * rx * pts[i], cy + Math.sin(a) * ry * pts[i]]);
    }
    ctx.beginPath();
    ctx.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  function drawCloud(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#e7f5f8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-38, 4, 34, 21, 0, 0, TAU);
    ctx.ellipse(-4, -10, 43, 30, 0, 0, TAU);
    ctx.ellipse(38, 2, 32, 22, 0, 0, TAU);
    ctx.ellipse(8, 12, 58, 21, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-8, -16, 30, 16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  function leafShape(ctx, x, y, len, wid, ang, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid, len, 0);
    ctx.bezierCurveTo(len * 0.75, wid, len * 0.25, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = Math.max(0.7, wid * 0.14);
    ctx.stroke();
    ctx.restore();
  }
  function drawFlower(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#4f8f32';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-1, -s * 2.2, 0.5, -s * 3.6);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      ellipse(ctx, Math.cos(a) * s, -s * 3.6 + Math.sin(a) * s, s * 0.72, s * 0.55, color, a);
    }
    ellipse(ctx, 0.5, -s * 3.6, s * 0.42, s * 0.36, '#ffd34d');
    ctx.restore();
  }
  function drawGrassTuft(ctx, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.8, s * 0.28);
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * s * 0.45, y);
      ctx.quadraticCurveTo(x + i * s * 0.8, y - s * 1.4, x + i * s * 1.3, y - s * (2.1 + (i % 2 ? 0.3 : 0)));
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawStone(ctx, x, y, rx, ry, rot, tone) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const g = ctx.createLinearGradient(0, -ry, 0, ry);
    g.addColorStop(0, tone || '#dfe3dc');
    g.addColorStop(0.55, tone ? shade(tone, -0.08) : '#c3c9c1');
    g.addColorStop(1, tone ? shade(tone, -0.2) : '#9aa198');
    ellipse(ctx, 0, 0, rx, ry, g);
    ctx.globalAlpha = 0.5;
    ellipse(ctx, -rx * 0.2, -ry * 0.28, rx * 0.55, ry * 0.38, '#ffffff');
    ctx.restore();
  }
  function drawFencePost(ctx, x, y, h, w) {
    w = w || 9;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#b8844b');
    g.addColorStop(0.45, '#e0ae70');
    g.addColorStop(1, '#8d5b2e');
    fillRR(ctx, x - w / 2, y - h, w, h, w * 0.32, g);
    ellipse(ctx, x, y - h, w * 0.55, w * 0.24, '#f0c98b');
    ellipse(ctx, x, y - h, w * 0.4, w * 0.15, '#c8955b');
  }
  function drawRail(ctx, x1, y1, x2, y2, w) {
    w = w || 6;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a572b';
    ctx.lineWidth = w + 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#d5a366';
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1 - 1); ctx.lineTo(x2, y2 - 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,.45)';
    ctx.lineWidth = Math.max(1, w * 0.22);
    ctx.beginPath(); ctx.moveTo(x1, y1 - w * 0.25); ctx.lineTo(x2, y2 - w * 0.25); ctx.stroke();
    ctx.restore();
  }
  function drawSign(ctx, x, y, w, h, text, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    // cọc
    fillRR(ctx, -3.5, 0, 7, h + 34, 3, '#9a6633');
    ctx.globalAlpha = 0.35;
    fillRR(ctx, 1.5, 0, 2.5, h + 34, 2, '#5d3b17');
    ctx.globalAlpha = 1;
    // bảng
    ctx.save();
    ctx.translate(0, -h * 0.45);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, color ? shade(color, 0.18) : '#e8bd7c');
    g.addColorStop(0.5, color || '#cf9a56');
    g.addColorStop(1, color ? shade(color, -0.18) : '#a9763b');
    fillRR(ctx, -w / 2, -h / 2, w, h, 5, g);
    ctx.strokeStyle = '#7c4a20';
    ctx.lineWidth = 3;
    rr(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,215,.4)';
    ctx.lineWidth = 1;
    rr(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3);
    ctx.stroke();
    ctx.fillStyle = '#5f3a15';
    ctx.font = `800 ${Math.max(10, h * 0.32)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);
    ctx.fillStyle = '#8c5a28';
    ellipse(ctx, -w / 2 + 5, 0, 1.6, 1.6, '#6b451d');
    ellipse(ctx, w / 2 - 5, 0, 1.6, 1.6, '#6b451d');
    ctx.restore();
    ctx.restore();
  }

  ART.util = {
    clamp, lerp, shade, rgba, makeRand, rr, fillRR, ellipse,
    diamondPath, blobPath, drawCloud, leafShape, drawFlower,
    drawGrassTuft, drawStone, drawFencePost, drawRail, drawSign, hexToRgb
  };
  const U = ART.util;

  /* ---------------- bố cục thế giới ---------------- */
  const L = ART.layout = {
    field: { ox: 510, oy: 290, tw: 200, th: 88, cols: 4, rows: 3 },
    barn: { x: 1030, baseY: 355 },
    pond: { x: 1120, y: 662, rx: 195, ry: 108 },
    tree: { x: 148, y: 588 },
    pen: { x1: 636, y1: 208, x2: 918, y2: 356 },
    mailbox: { x: 1168, y: 438 },
    wheelbarrow: { x: 742, y: 528 },
    fieldSign: { x: 878, y: 476 },
    cow: { x: 806, y: 322 },
    chickens: [{ x: 692, y: 342 }, { x: 754, y: 350 }, { x: 880, y: 342 }]
  };
  L.plotCenter = function (c, r) {
    const f = L.field;
    return {
      x: f.ox + (c - r) * f.tw / 2,
      y: f.oy + (c + r) * f.th / 2
    };
  };
  L.fieldPoly = function (pad) {
    pad = pad || 0;
    const f = L.field;
    const tw = f.tw / 2 + pad, th = f.th / 2 + pad;
    const top = L.plotCenter(0, 0), right = L.plotCenter(f.cols - 1, 0);
    const bottom = L.plotCenter(f.cols - 1, f.rows - 1), left = L.plotCenter(0, f.rows - 1);
    return [
      { x: top.x, y: top.y - th },
      { x: right.x + tw, y: right.y },
      { x: bottom.x, y: bottom.y + th },
      { x: left.x - tw, y: left.y }
    ];
  };
  ART.pondPath = function (ctx, grow, squash) {
    const p = L.pond;
    blobPath(ctx, p.x, p.y, p.rx + (grow || 0), p.ry + (grow || 0) * 0.75,
      [1, 0.93, 1.03, 0.9, 1.05, 0.95, 1.02, 0.92, 1.04, 0.94, 1.01, 0.9],
      -0.18);
  };

  /* =========================================================
     CẢNH TĨNH
     ========================================================= */
  let staticCanvas = null;

  ART.ensureStatic = function () {
    if (staticCanvas) return staticCanvas;
    const cv = document.createElement('canvas');
    const scale = 1.5;
    cv.width = W * scale;
    cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    drawStatic(ctx);
    staticCanvas = cv;
    return cv;
  };

  ART.drawBackground = function (ctx) {
    ctx.drawImage(ART.ensureStatic(), 0, 0, W, H);
  };

  ART.refreshStatic = function () {
    staticCanvas = null;
    ART.ensureStatic();
  };

  function drawStatic(ctx) {
    drawSky(ctx);
    drawHills(ctx);
    drawGround(ctx);
    drawPath(ctx);
    drawFieldBase(ctx);
    drawPond(ctx);
    drawPenBack(ctx);
    drawBarn(ctx);
    drawAppleTree(ctx);
    drawMailbox(ctx);
    drawProps(ctx);
    drawForeground(ctx);
  }

  /* ---------------- trời và đồi ---------------- */
  function drawSky(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 260);
    sky.addColorStop(0, '#a9d5d8');
    sky.addColorStop(0.42, '#cee7df');
    sky.addColorStop(0.78, '#edf0d9');
    sky.addColorStop(1, '#f9efd5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 280);

    // mặt trời mờ phía sau mây
    const sun = ctx.createRadialGradient(760, 34, 4, 760, 34, 150);
    sun.addColorStop(0, 'rgba(255,250,200,.9)');
    sun.addColorStop(0.35, 'rgba(255,240,160,.35)');
    sun.addColorStop(1, 'rgba(255,240,160,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(560, 0, 400, 260);

    drawCloud(ctx, 185, 62, 1.15, 0.9);
    drawCloud(ctx, 530, 108, 0.7, 0.7);
    drawCloud(ctx, 830, 52, 0.85, 0.75);
    drawCloud(ctx, 1110, 96, 1.0, 0.82);
    drawCloud(ctx, 395, 38, 0.48, 0.5);
  }

  function drawHills(ctx) {
    // dãy đồi xa
    ctx.beginPath();
    ctx.moveTo(-30, 205);
    ctx.bezierCurveTo(90, 120, 210, 150, 320, 132);
    ctx.bezierCurveTo(440, 112, 500, 165, 610, 143);
    ctx.bezierCurveTo(740, 118, 820, 158, 930, 136);
    ctx.bezierCurveTo(1050, 112, 1150, 148, 1310, 122);
    ctx.lineTo(1310, 250); ctx.lineTo(-30, 250);
    ctx.closePath();
    let g = ctx.createLinearGradient(0, 110, 0, 250);
    g.addColorStop(0, '#c7d4a8');
    g.addColorStop(1, '#b2c292');
    ctx.fillStyle = g;
    ctx.fill();

    // Thin rows on the far hillside give the landscape a cultivated rhythm.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(248,245,215,.24)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(720 + i * 45, 132);
      ctx.bezierCurveTo(680 + i * 47, 168, 690 + i * 45, 198, 650 + i * 46, 244);
      ctx.stroke();
    }
    ctx.restore();

    // lớp đồi gần hơn
    ctx.beginPath();
    ctx.moveTo(-30, 238);
    ctx.bezierCurveTo(120, 166, 260, 205, 400, 182);
    ctx.bezierCurveTo(540, 160, 650, 206, 800, 185);
    ctx.bezierCurveTo(950, 164, 1080, 205, 1310, 176);
    ctx.lineTo(1310, 300); ctx.lineTo(-30, 300);
    ctx.closePath();
    g = ctx.createLinearGradient(0, 160, 0, 300);
    g.addColorStop(0, '#a4bd88');
    g.addColorStop(1, '#8fac73');
    ctx.fillStyle = g;
    ctx.fill();

    // rặng cây xa xa
    const rnd = makeRand(77);
    for (let i = 0; i < 46; i++) {
      const x = -20 + i * 29 + rnd() * 16;
      const y = 210 + Math.sin(i * 0.7) * 12 + rnd() * 18;
      const s = 10 + rnd() * 14;
      ctx.globalAlpha = 0.55;
      ellipse(ctx, x, y - s * 0.7, s * 0.8, s * 0.85, i % 3 === 0 ? '#779266' : '#849f70');
      ellipse(ctx, x + s * 0.3, y - s * 1.1, s * 0.55, s * 0.6, '#9bb482');
      ctx.globalAlpha = 1;
    }
    // vài cây thông nhỏ
    for (let i = 0; i < 8; i++) {
      const x = 60 + i * 163 + (i % 2) * 30;
      const y = 208 - (i % 3) * 3;
      ctx.fillStyle = '#6b8960';
      ctx.beginPath();
      ctx.moveTo(x, y - 36);
      ctx.lineTo(x + 13, y);
      ctx.lineTo(x - 13, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#88a373';
      ctx.beginPath();
      ctx.moveTo(x, y - 48);
      ctx.lineTo(x + 10, y - 18);
      ctx.lineTo(x - 10, y - 18);
      ctx.closePath();
      ctx.fill();
    }

    // viền cỏ mềm chuyển xuống đồng cỏ
    ctx.beginPath();
    ctx.moveTo(-20, 248);
    ctx.bezierCurveTo(180, 232, 310, 262, 470, 246);
    ctx.bezierCurveTo(650, 228, 790, 262, 960, 246);
    ctx.bezierCurveTo(1110, 232, 1220, 252, 1300, 240);
    ctx.lineTo(1300, 300); ctx.lineTo(-20, 300);
    ctx.closePath();
    ctx.fillStyle = '#a5bc7d';
    ctx.fill();
  }

  function drawGround(ctx) {
    const g = ctx.createLinearGradient(0, 200, 0, H);
    g.addColorStop(0, '#b0c78a');
    g.addColorStop(0.45, '#95b570');
    g.addColorStop(1, '#729653');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-20, 252);
    ctx.bezierCurveTo(150, 235, 300, 260, 470, 247);
    ctx.bezierCurveTo(640, 234, 800, 260, 960, 246);
    ctx.bezierCurveTo(1120, 232, 1220, 252, 1300, 240);
    ctx.lineTo(1300, H + 20); ctx.lineTo(-20, H + 20);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    const light = ctx.createRadialGradient(535, 320, 40, 535, 320, 700);
    light.addColorStop(0, 'rgba(255,248,191,.23)');
    light.addColorStop(0.58, 'rgba(255,248,191,.04)');
    light.addColorStop(1, 'rgba(39,71,44,.15)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 230, W, H);
    // dải cỏ mowed mềm
    const rnd = makeRand(1234);
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.032;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#2e6b21';
      ctx.beginPath();
      const x = -200 + i * 190;
      ctx.moveTo(x, 260);
      ctx.lineTo(x + 120, 260);
      ctx.lineTo(x + 520, 760);
      ctx.lineTo(x + 400, 760);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // đốm cỏ
    for (let i = 0; i < 650; i++) {
      const x = rnd() * W, y = 256 + rnd() * (H - 240);
      ctx.globalAlpha = 0.08 + rnd() * 0.12;
      ctx.fillStyle = rnd() > 0.5 ? '#5e814b' : '#d3dca1';
      const s = 0.6 + rnd() * 1.7;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.8, s * 0.8, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // túm cỏ nhỏ rải rác
    for (let i = 0; i < 130; i++) {
      const x = 20 + rnd() * (W - 40);
      const y = 270 + rnd() * (H - 280);
      ctx.globalAlpha = 0.32 + rnd() * 0.35;
      drawGrassTuft(ctx, x, y, 1.6 + rnd() * 2.6, rnd() > 0.5 ? '#718d53' : '#90a85f');
    }
    ctx.globalAlpha = 1;
    // hoa dại
    const flowers = [
      [58, 312, 2.2, '#fff8e3'], [202, 286, 1.8, '#ffe27a'], [352, 224, 1.7, '#ffffff'],
      [892, 256, 1.8, '#fff1f1'], [1216, 300, 2.1, '#ffe27a'], [82, 690, 2.2, '#fff5df'],
      [438, 646, 1.7, '#ffd9e3'], [939, 690, 1.9, '#fff'], [1176, 528, 1.7, '#ffe06e'],
      [300, 612, 1.6, '#f7f2ff'], [705, 672, 1.8, '#ffe27a'], [1205, 690, 2, '#ffd9e3']
    ];
    flowers.forEach(([x, y, s, c], i) => {
      ctx.globalAlpha = 0.9;
      drawFlower(ctx, x, y, s, c);
      if (i % 2 === 0) drawFlower(ctx, x + 16, y + 9, s * 0.8, c);
    });
    ctx.globalAlpha = 1;
    // vài hòn sỏi
    for (let i = 0; i < 26; i++) {
      const x = 30 + rnd() * (W - 60), y = 300 + rnd() * (H - 320);
      ctx.globalAlpha = 0.5;
      drawStone(ctx, x, y, 2 + rnd() * 4, 1.4 + rnd() * 2.4, rnd(), '#c9d0c3');
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // bụi cây ven đồng cỏ
    drawBush(ctx, 22, 286, 1.15);
    drawBush(ctx, 292, 264, 0.8);
    drawBush(ctx, 540, 264, 0.65);
    drawBush(ctx, 900, 272, 0.7);
    drawBush(ctx, 1230, 286, 1.0);
    drawBush(ctx, 34, 430, 0.7);
  }

  function drawBush(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = 0.95;
    ellipse(ctx, 0, 6, 34, 12, 'rgba(50,95,28,.2)');
    ellipse(ctx, -16, -5, 19, 17, '#5c804e');
    ellipse(ctx, 7, -11, 24, 21, '#779653');
    ellipse(ctx, 24, 0, 16, 14, '#638449');
    ellipse(ctx, -2, -18, 15, 12, '#96ad68');
    ctx.globalAlpha = 0.5;
    ellipse(ctx, -8, -14, 8, 5, '#c0ce89');
    ctx.restore();
  }

  /* ---------------- con đường ---------------- */
  function drawPath(ctx) {
    ctx.save();
    // nền đất mòn
    const stroke = (color, w) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    const p = new Path2D();
    p.moveTo(-80, 678);
    p.bezierCurveTo(170, 596, 336, 664, 520, 618);
    p.bezierCurveTo(678, 579, 778, 590, 864, 508);
    p.bezierCurveTo(916, 461, 944, 432, 1006, 402);
    stroke('#a98c58', 142);
    stroke('#cdb27c', 128);
    stroke('#dfc996', 112);
    stroke('#edddb4', 90);

    // sân nhà kho
    ctx.beginPath();
    ctx.ellipse(1072, 434, 262, 135, -0.12, 0, TAU);
    ctx.fillStyle = '#e6d3a4';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1072, 430, 244, 120, -0.12, 0, TAU);
    ctx.fillStyle = '#f0e2bc';
    ctx.fill();

    // vệt bánh xe
    ctx.globalAlpha = 0.28;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#b49966';
    ctx.lineWidth = 6;
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.moveTo(-60, 668 + k * 18);
      ctx.bezierCurveTo(180, 592 + k * 16, 350, 656 + k * 14, 528, 610 + k * 12);
      ctx.bezierCurveTo(690, 574 + k * 10, 792, 580 + k * 10, 878, 500 + k * 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // đá lát & sỏi
    const rnd = makeRand(909);
    for (let i = 0; i < 60; i++) {
      const t = rnd();
      const x = 100 + t * 960;
      const y = 650 - t * 210 + (rnd() - 0.5) * 100;
      ctx.globalAlpha = 0.32 + rnd() * 0.3;
      drawStone(ctx, x, y, 1.6 + rnd() * 4, 1 + rnd() * 2.4, rnd(), rnd() > 0.5 ? '#d6cbb0' : '#c2b292');
    }
    // vết cỏ mọc giữa đường
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 24; i++) {
      const x = 60 + rnd() * 1000;
      const y = 616 + rnd() * 70;
      drawGrassTuft(ctx, x, y, 1.1 + rnd() * 1.6, '#8bbd58');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------------- nền ruộng ---------------- */
  function drawFieldBase(ctx) {
    const poly = L.fieldPoly(0);
    const pad = 16;
    const p2 = L.fieldPoly(pad);
    const cx = 542, cy = 426;

    // bóng đổ
    ctx.save();
    ctx.translate(0, 9);
    ctx.beginPath();
    p2.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = 'rgba(45,82,28,.28)';
    ctx.fill();
    ctx.restore();

    // The front timber faces give the raised bed a clear thickness.
    [[1, 2, '#987346'], [2, 3, '#b48b53']].forEach(([a, b, color]) => {
      ctx.beginPath();
      ctx.moveTo(p2[a].x, p2[a].y);
      ctx.lineTo(p2[b].x, p2[b].y);
      ctx.lineTo(p2[b].x, p2[b].y + 12);
      ctx.lineTo(p2[a].x, p2[a].y + 12);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(91,67,37,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // viền đất
    ctx.beginPath();
    p2.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = '#b9894b';
    ctx.fill();
    ctx.strokeStyle = '#7c5226';
    ctx.lineWidth = 3;
    ctx.stroke();

    // mặt cỏ trong ruộng
    const inner = L.fieldPoly(2);
    ctx.beginPath();
    inner.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 250, 0, 560);
    g.addColorStop(0, '#a2bb78');
    g.addColorStop(0.5, '#8cac64');
    g.addColorStop(1, '#729553');
    ctx.fillStyle = g;
    ctx.fill();

    // vân cỏ nhẹ
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = '#d6dda3';
    ctx.lineWidth = 12;
    for (let i = -4; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(210 + i * 80, 250);
      ctx.lineTo(400 + i * 80, 590);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // cỏ lún
    const rnd = makeRand(451);
    for (let i = 0; i < 160; i++) {
      const x = 250 + rnd() * 590;
      const y = 260 + rnd() * 290;
      ctx.globalAlpha = 0.22 + rnd() * 0.25;
      drawGrassTuft(ctx, x, y, 1.1 + rnd() * 1.4, '#7c9757');
    }
    ctx.restore();

    // viền gỗ
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.strokeStyle = '#8f5f30';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#d2a066';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,232,185,.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // cọc góc
    poly.forEach((p, i) => {
      const h = 15;
      fillRR(ctx, p.x - 5, p.y - h, 10, h + 7, 4, '#b07a40');
      ctx.fillStyle = '#e2b476';
      ctx.fillRect(p.x - 3, p.y - h + 2, 3, h);
      ellipse(ctx, p.x, p.y - h, 6, 2.6, '#f0cd93');
      ellipse(ctx, p.x, p.y - h, 4, 1.6, '#c48d51');
    });

    // cọc giữa các cạnh
    const mids = [
      [(poly[0].x + poly[1].x) / 2, (poly[0].y + poly[1].y) / 2],
      [(poly[1].x + poly[2].x) / 2, (poly[1].y + poly[2].y) / 2],
      [(poly[2].x + poly[3].x) / 2, (poly[2].y + poly[3].y) / 2],
      [(poly[3].x + poly[0].x) / 2, (poly[3].y + poly[0].y) / 2]
    ];
    mids.forEach(([x, y]) => {
      fillRR(ctx, x - 3.5, y - 8, 7, 12, 3, '#a9743b');
      ellipse(ctx, x, y - 8, 4, 1.8, '#e4bc80');
    });

    // đá nhỏ & hoa quanh ruộng
    ctx.globalAlpha = 0.85;
    drawFlower(ctx, L.fieldPoly(22)[3].x, L.fieldPoly(22)[3].y + 20, 1.8, '#fff5df');
    drawFlower(ctx, L.fieldPoly(22)[1].x, L.fieldPoly(22)[1].y + 10, 1.7, '#ffe27a');
    drawFlower(ctx, L.fieldPoly(12)[1].x - 4, L.fieldPoly(12)[1].y + 28, 1.5, '#fff');
    drawGrassTuft(ctx, L.fieldPoly(20)[3].x - 4, L.fieldPoly(20)[3].y + 32, 3, '#7c9757');
    drawGrassTuft(ctx, L.fieldPoly(20)[1].x + 3, L.fieldPoly(20)[1].y - 6, 2.6, '#7c9757');
    ctx.globalAlpha = 1;
  }

  /* ---------------- hồ cá ---------------- */
  function drawPond(ctx) {
    const p = L.pond;

    // bờ đất
    ART.pondPath(ctx, 26);
    ctx.fillStyle = '#cdb47f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,95,45,.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ART.pondPath(ctx, 15);
    ctx.fillStyle = '#e5d4a7';
    ctx.fill();

    // nước
    ART.pondPath(ctx, 0);
    const wg = ctx.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry);
    wg.addColorStop(0, '#8ce9e0');
    wg.addColorStop(0.45, '#46c9cd');
    wg.addColorStop(1, '#1e96aa');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,105,120,.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // mép nước sáng
    ctx.save();
    ART.pondPath(ctx, -5);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#e6fff6';
    ctx.lineWidth = 10;
    ART.pondPath(ctx, -8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // gợn nước tĩnh
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#d9fff8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = 596 + i * 17;
      ctx.beginPath();
      ctx.ellipse(p.x - 20 + (i % 3) * 18, y, 55 + i * 8, 5 + i, 0.02, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // cá koi mờ
    ctx.globalAlpha = 0.5;
    drawKoi(ctx, 1082, 634, 0.5, -0.3, '#ff8b47');
    drawKoi(ctx, 1178, 678, 0.4, 2.6, '#ffd45e');
    ctx.globalAlpha = 1;
    ctx.restore();

    // đá quanh hồ
    const rnd = makeRand(613);
    for (let i = 0; i < 28; i++) {
      const a = -0.1 + i / 28 * TAU;
      const rx = p.rx + 22 + rnd() * 9;
      const ry = p.ry + 18 + rnd() * 8;
      const x = p.x + Math.cos(a) * rx;
      const y = p.y + Math.sin(a) * ry;
      if (y < 556 || x > 1290) continue;
      drawStone(ctx, x, y, 7 + rnd() * 8, 4 + rnd() * 5, a, rnd() > 0.5 ? '#d8d5c5' : '#bfc4b7');
    }

    // sen & sậy
    drawLily(ctx, 1048, 634, 20, 0.9);
    drawLily(ctx, 1186, 660, 16, 0.8);
    drawLily(ctx, 1096, 700, 22, 0.7);
    drawLily(ctx, 1216, 616, 13, 0.75);
    drawLotus(ctx, 1048, 628, 9);

    drawReeds(ctx, 966, 610, 1.0);
    drawReeds(ctx, 1272, 656, 0.8);
    drawReeds(ctx, 1010, 706, 0.9);

    // biển câu cá
    drawSign(ctx, 956, 612, 84, 30, 'CÂU CÁ', -0.12, '#d8a35d');
  }

  function drawKoi(ctx, x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 10, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-38, -11); ctx.lineTo(-36, 0); ctx.lineTo(-38, 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(6, -3, 12, 3.5, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5d3a1a';
    ctx.beginPath(); ctx.arc(20, -3, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawLily(ctx, x, y, r, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.55);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.28, TAU - 0.28);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = '#4f9e3d';
    ctx.fill();
    ctx.strokeStyle = '#33752a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.2, r * 0.55, 0, TAU);
    ctx.fillStyle = '#8ed468';
    ctx.fill();
    ctx.restore();
  }

  function drawLotus(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.42;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -r, r * 0.42, r * 0.9, 0, 0, TAU);
      ctx.fillStyle = i % 2 ? '#ffb9cf' : '#ffd7e2';
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.36, 0, TAU);
    ctx.fillStyle = '#ffe06a';
    ctx.fill();
    ctx.restore();
  }

  function drawReeds(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = '#4d8c34';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const h = 34 + Math.abs(i) * 7;
      ctx.beginPath();
      ctx.moveTo(i * 5, 0);
      ctx.quadraticCurveTo(i * 10, -h * 0.6, i * 6 + 5, -h);
      ctx.stroke();
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.ellipse(i * 6 + 5, -h - 3, 2.6, 7, 0.3, 0, TAU);
        ctx.fillStyle = '#8c5b2a';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------------- vườn thú (phần sau) ---------------- */
  function drawPenBack(ctx) {
    const P = L.pen;

    // nền đất
    ctx.beginPath();
    ctx.ellipse(778, 306, 152, 60, -0.04, 0, TAU);
    ctx.fillStyle = '#d8c08b';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(778, 302, 138, 50, -0.04, 0, TAU);
    ctx.fillStyle = '#e7d5a6';
    ctx.fill();

    // chuồng gà nhỏ
    drawCoop(ctx, 714, 232);

    // hàng rào sau
    drawRail(ctx, P.x1, P.y1 - 16, P.x2, P.y1 - 16, 6);
    drawRail(ctx, P.x1, P.y1 + 4, P.x2, P.y1 + 4, 6);
    for (let x = P.x1; x <= P.x2; x += 46) {
      drawFencePost(ctx, x, P.y1 + 12, 44, 9);
    }

    // máng nước
    ctx.save();
    ctx.translate(866, 330);
    fillRR(ctx, -30, -12, 60, 17, 6, '#8f6234');
    fillRR(ctx, -26, -9, 52, 6, 3, '#54c4d8');
    ctx.fillStyle = '#c99556';
    fillRR(ctx, -34, 4, 8, 14, 3, '#a9743b');
    fillRR(ctx, 26, 4, 8, 14, 3, '#a9743b');
    ctx.restore();

    // đống cỏ khô
    ctx.save();
    ctx.translate(668, 322);
    ellipse(ctx, 0, 6, 30, 11, 'rgba(80,55,15,.2)');
    ellipse(ctx, 0, -2, 25, 15, '#e4b34d');
    ctx.strokeStyle = '#b97f27';
    ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7, -15);
      ctx.lineTo(i * 6 + 2, 8);
      ctx.stroke();
    }
    ctx.restore();

    // biển vườn thú
    drawSign(ctx, 582, 250, 78, 29, 'VƯỜN THÚ', -0.04, '#d8a35d');

    // cây nhỏ trong vườn
    drawSmallTree(ctx, 900, 300, 0.7);
  }

  function drawPenFront(ctx) {
    const P = L.pen;
    drawRail(ctx, P.x1, P.y2 - 14, P.x2, P.y2 - 16, 7);
    drawRail(ctx, P.x1, P.y2 + 8, P.x2, P.y2 + 6, 7);
    for (let x = P.x1; x <= P.x2; x += 47) {
      drawFencePost(ctx, x, P.y2 + 18, 50, 10);
    }
    // rào hai bên
    for (let side = 0; side < 2; side++) {
      const x = side ? P.x2 : P.x1;
      for (let i = 0; i < 3; i++) {
        drawFencePost(ctx, x + (side ? 2 : -2), P.y1 + 26 + i * 44, 46, 8);
      }
      drawRail(ctx, x, P.y1 + 6, x, P.y2 + 2, 5);
    }
  }

  function drawCoop(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ellipse(ctx, 0, 55, 54, 15, 'rgba(70,45,15,.22)');
    // thân
    const g = ctx.createLinearGradient(0, -18, 0, 54);
    g.addColorStop(0, '#e07a55');
    g.addColorStop(1, '#b64b34');
    fillRR(ctx, -45, -18, 90, 72, 5, g);
    ctx.strokeStyle = '#7d3221';
    ctx.lineWidth = 2.5;
    rr(ctx, -45, -18, 90, 72, 5);
    ctx.stroke();
    // ván
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#7d3221';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-43 + i * 19, -16);
      ctx.lineTo(-43 + i * 19, 52);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // mái
    ctx.beginPath();
    ctx.moveTo(-58, -18);
    ctx.lineTo(0, -62);
    ctx.lineTo(58, -18);
    ctx.lineTo(52, -10);
    ctx.lineTo(0, -48);
    ctx.lineTo(-52, -10);
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, -62, 0, -8);
    rg.addColorStop(0, '#f6c05f');
    rg.addColorStop(1, '#c97c2d');
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = '#8b4d1d';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // cửa tròn
    ctx.beginPath();
    ctx.arc(0, 22, 17, 0, TAU);
    ctx.fillStyle = '#6b3a1d';
    ctx.fill();
    ctx.strokeStyle = '#f2dfb4';
    ctx.lineWidth = 3;
    ctx.stroke();
    // cầu thang
    ctx.fillStyle = '#b98348';
    ctx.beginPath();
    ctx.moveTo(-14, 38);
    ctx.lineTo(16, 38);
    ctx.lineTo(26, 60);
    ctx.lineTo(-22, 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-18 + i * 2, 44 + i * 6);
      ctx.lineTo(20 - i * 3, 44 + i * 6);
      ctx.stroke();
    }
    // ổ rơm
    ellipse(ctx, 38, 50, 15, 7, '#e3b454');
    ctx.restore();
  }

  function drawSmallTree(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 8, 26, 9, 'rgba(50,85,25,.24)');
    ctx.fillStyle = '#8d5a2d';
    fillRR(ctx, -5, -32, 10, 40, 4, '#8d5a2d');
    ellipse(ctx, -16, -44, 22, 18, '#4f9b36');
    ellipse(ctx, 12, -48, 25, 21, '#779653');
    ellipse(ctx, 0, -60, 20, 17, '#6cbd4b');
    ellipse(ctx, -4, -50, 10, 7, 'rgba(190,235,140,.55)');
    ctx.restore();
  }

  /* ---------------- nhà kho ---------------- */
  function drawBarn(ctx) {
    const x = L.barn.x, base = L.barn.baseY;
    ctx.save();

    // bóng
    ctx.beginPath();
    ctx.ellipse(x, base + 22, 186, 38, 0, 0, TAU);
    ctx.fillStyle = 'rgba(62,82,32,.26)';
    ctx.fill();

    // cỏ khô & đồ dưới sàn
    drawHayBale(ctx, x - 115, base - 10, 1.1, 0.1);
    drawHayBale(ctx, x - 58, base - 2, 0.9, -0.06);
    drawHayBale(ctx, x + 92, base - 6, 1.0, 0.05);
    drawMilkCan(ctx, x + 38, base - 2, 0.9);
    drawMilkCan(ctx, x + 61, base + 2, 0.72);
    drawPumpkin(ctx, x - 18, base - 2, 0.9, '#e98a2d');
    drawPumpkin(ctx, x + 10, base + 4, 0.6, '#d97822');

    // bốn chân sàn
    const legs = [[-128, 0], [-70, 10], [74, 10], [132, 0]];
    legs.forEach(([lx, off]) => {
      const top = base - 100 + off;
      const g = ctx.createLinearGradient(x + lx - 6, 0, x + lx + 6, 0);
      g.addColorStop(0, '#7b4b22');
      g.addColorStop(0.45, '#b57c3d');
      g.addColorStop(1, '#6a3f1d');
      fillRR(ctx, x + lx - 7, top, 14, base - top + 8, 4, g);
      ctx.globalAlpha = 0.4;
      fillRR(ctx, x + lx + 1, top + 6, 3, base - top, 2, '#4d2a10');
      ctx.globalAlpha = 1;
    });
    // thanh giằng
    ctx.strokeStyle = '#8b5a2c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 120, base - 18); ctx.lineTo(x - 72, base - 78);
    ctx.moveTo(x + 78, base - 18); ctx.lineTo(x + 122, base - 78);
    ctx.stroke();

    // sàn gỗ
    const deck = ctx.createLinearGradient(0, base - 116, 0, base - 88);
    deck.addColorStop(0, '#e2b171');
    deck.addColorStop(1, '#a9743c');
    ctx.beginPath();
    ctx.moveTo(x - 152, base - 100);
    ctx.lineTo(x - 102, base - 116);
    ctx.lineTo(x + 152, base - 104);
    ctx.lineTo(x + 114, base - 88);
    ctx.closePath();
    ctx.fillStyle = deck;
    ctx.fill();
    ctx.strokeStyle = '#7a4a20';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(105,64,24,.4)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 152 + i * 15, base - 100);
      ctx.lineTo(x + 108 + i * 7, base - 91);
      ctx.stroke();
    }

    // vách gỗ
    const wallTop = base - 244, wallBot = base - 108;
    const wall = ctx.createLinearGradient(x - 110, 0, x + 120, 0);
    wall.addColorStop(0, '#b9824a');
    wall.addColorStop(0.45, '#d6a265');
    wall.addColorStop(1, '#a56d38');
    fillRR(ctx, x - 122, wallTop, 244, wallBot - wallTop, 8, wall);
    ctx.strokeStyle = '#76451e';
    ctx.lineWidth = 3;
    rr(ctx, x - 122, wallTop, 244, wallBot - wallTop, 8);
    ctx.stroke();
    // ván dọc
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#6f421d';
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 122 + i * 31, wallTop + 3);
      ctx.lineTo(x - 122 + i * 31, wallBot - 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // cửa mở, bên trong tối và rơm vàng
    ctx.beginPath();
    ctx.moveTo(x - 54, wallBot);
    ctx.lineTo(x - 54, wallTop + 58);
    ctx.quadraticCurveTo(x - 50, wallTop + 24, x, wallTop + 20);
    ctx.quadraticCurveTo(x + 52, wallTop + 24, x + 58, wallTop + 60);
    ctx.lineTo(x + 58, wallBot);
    ctx.closePath();
    const inside = ctx.createLinearGradient(0, wallTop + 20, 0, wallBot);
    inside.addColorStop(0, '#3a2411');
    inside.addColorStop(0.7, '#593718');
    inside.addColorStop(1, '#8e5c27');
    ctx.fillStyle = inside;
    ctx.fill();
    ctx.strokeStyle = '#6f421d';
    ctx.lineWidth = 4;
    ctx.stroke();
    // rơm trong cửa
    ctx.globalAlpha = 0.9;
    ellipse(ctx, x, wallBot - 12, 48, 9, '#d8a53f');
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#f1cd75';
    ctx.lineWidth = 1.4;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 10, wallBot - 4);
      ctx.lineTo(x + i * 11 + 3, wallBot - 22);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // thanh chắn sàn trước
    ctx.strokeStyle = '#8b5b2e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - 124, base - 112);
    ctx.lineTo(x + 126, base - 100);
    ctx.stroke();
    ctx.strokeStyle = '#d2a064';
    ctx.lineWidth = 4;
    ctx.stroke();

    // mái rơm lớn
    const roofTop = base - 334, eave = base - 212;
    ctx.beginPath();
    ctx.moveTo(x, roofTop);
    ctx.bezierCurveTo(x + 82, roofTop + 20, x + 158, eave - 54, x + 196, eave);
    ctx.quadraticCurveTo(x + 198, eave + 14, x + 172, eave + 8);
    ctx.quadraticCurveTo(x + 158, eave + 26, x + 136, eave + 8);
    ctx.quadraticCurveTo(x + 118, eave + 27, x + 98, eave + 9);
    ctx.quadraticCurveTo(x + 78, eave + 26, x + 58, eave + 8);
    ctx.quadraticCurveTo(x + 38, eave + 27, x + 18, eave + 9);
    ctx.quadraticCurveTo(x - 2, eave + 26, x - 22, eave + 8);
    ctx.quadraticCurveTo(x - 42, eave + 25, x - 62, eave + 8);
    ctx.quadraticCurveTo(x - 82, eave + 24, x - 102, eave + 8);
    ctx.quadraticCurveTo(x - 122, eave + 24, x - 142, eave + 8);
    ctx.quadraticCurveTo(x - 164, eave + 24, x - 180, eave + 4);
    ctx.bezierCurveTo(x - 154, eave - 60, x - 80, roofTop + 20, x, roofTop);
    ctx.closePath();
    const roof = ctx.createLinearGradient(0, roofTop, 0, eave + 20);
    roof.addColorStop(0, '#f3ce70');
    roof.addColorStop(0.45, '#dca84b');
    roof.addColorStop(0.8, '#bd8230');
    roof.addColorStop(1, '#9b6a24');
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.strokeStyle = '#7c521a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // lớp tranh
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, roofTop);
    ctx.bezierCurveTo(x + 82, roofTop + 20, x + 158, eave - 54, x + 188, eave - 4);
    ctx.lineTo(x - 180, eave - 4);
    ctx.bezierCurveTo(x - 154, eave - 60, x - 80, roofTop + 20, x, roofTop);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.4;
    for (let i = 1; i < 6; i++) {
      const yy = roofTop + i * 23;
      ctx.strokeStyle = i % 2 ? '#8d5c20' : '#f5d786';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 200, yy + 10);
      ctx.quadraticCurveTo(x, yy - 12, x + 200, yy + 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#7a4c18';
    ctx.lineWidth = 1.1;
    const rnd = makeRand(88);
    for (let i = 0; i < 90; i++) {
      const yy = roofTop + 8 + rnd() * (eave - roofTop - 20);
      const xx = x - 170 + rnd() * 340;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + (rnd() - 0.5) * 9, yy + 10 + rnd() * 8);
      ctx.stroke();
    }
    ctx.restore();

    // nóc mái
    ctx.beginPath();
    ctx.moveTo(x - 10, roofTop + 4);
    ctx.quadraticCurveTo(x, roofTop - 12, x + 12, roofTop + 5);
    ctx.quadraticCurveTo(x + 6, roofTop + 14, x - 10, roofTop + 12);
    ctx.fillStyle = '#b9832c';
    ctx.fill();
    ctx.strokeStyle = '#7c521a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ống khói nhỏ
    fillRR(ctx, x + 78, roofTop + 22, 26, 50, 3, '#c08d58');
    ctx.strokeStyle = '#7b4a23';
    ctx.lineWidth = 2;
    rr(ctx, x + 78, roofTop + 22, 26, 50, 3);
    ctx.stroke();
    ctx.fillStyle = '#8b5a2c';
    ctx.fillRect(x + 74, roofTop + 18, 34, 8);

    // cửa sổ xanh + hộp hoa
    ctx.save();
    ctx.translate(x + 78, wallTop + 86);
    fillRR(ctx, -26, -26, 52, 48, 4, '#f5e4bd');
    fillRR(ctx, -21, -21, 42, 38, 3, '#3c6b58');
    ctx.strokeStyle = '#f4e6c2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(0, 16);
    ctx.moveTo(-20, -2); ctx.lineTo(20, -2);
    ctx.stroke();
    fillRR(ctx, -30, 20, 60, 11, 3, '#8a5a2c');
    for (let i = 0; i < 5; i++) {
      drawFlower(ctx, -22 + i * 11, 20, 1.1, i % 2 ? '#ff8d7a' : '#ffd35c');
    }
    ctx.restore();

    // bảng bò sữa
    ctx.save();
    ctx.translate(x - 24, wallTop + 88);
    ctx.rotate(-0.03);
    fillRR(ctx, -46, -34, 92, 68, 7, '#fff8e6');
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 3;
    rr(ctx, -46, -34, 92, 68, 7);
    ctx.stroke();
    // mặt bò
    ellipse(ctx, 0, -2, 27, 22, '#fffdf5');
    ellipse(ctx, -16, -14, 12, 9, '#4a4038', -0.2);
    ellipse(ctx, 17, 4, 10, 8, '#4a4038', 0.3);
    ellipse(ctx, -7, 7, 11, 8, '#4a4038', 0.1);
    ellipse(ctx, 0, 12, 14, 8, '#ffb6a8');
    ellipse(ctx, -6, 12, 2, 1.5, '#8a4c43');
    ellipse(ctx, 6, 12, 2, 1.5, '#8a4c43');
    ellipse(ctx, -14, -4, 2.2, 2.2, '#3a2a1a');
    ellipse(ctx, 14, -4, 2.2, 2.2, '#3a2a1a');
    // tai
    ellipse(ctx, -29, -12, 9, 5, '#d8c7a8', -0.5);
    ellipse(ctx, 29, -12, 9, 5, '#d8c7a8', 0.5);
    // sừng
    ctx.strokeStyle = '#e8d6a5';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, -25);
    ctx.quadraticCurveTo(-27, -38, -18, -38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, -25);
    ctx.quadraticCurveTo(27, -38, 18, -38);
    ctx.stroke();
    // dây treo
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-36, -34); ctx.lineTo(-30, -46);
    ctx.moveTo(36, -34); ctx.lineTo(30, -46);
    ctx.stroke();
    ctx.restore();

    // thang
    ctx.save();
    ctx.translate(x - 160, base - 104);
    ctx.rotate(0.18);
    ctx.strokeStyle = '#8d5a2c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 108); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(36, 104); ctx.stroke();
    ctx.strokeStyle = '#c89052';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(1 + i * 3.5, 8 + i * 16);
      ctx.lineTo(15 + i * 3.5, 4 + i * 16);
      ctx.stroke();
    }
    ctx.restore();

    // dây leo & lá
    ctx.globalAlpha = 0.9;
    leafShape(ctx, x - 118, base - 170, 24, 8, 0.5, '#66a846', '#4a7f32');
    leafShape(ctx, x - 110, base - 142, 18, 6, -0.4, '#7cbf50');
    leafShape(ctx, x + 126, base - 150, 22, 7, 0.7, '#6fb246');
    ctx.globalAlpha = 1;

    // mèo ngủ trên sàn
    drawCat(ctx, x - 82, base - 102, 0.8);
    ctx.restore();
  }

  function drawHayBale(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s, s);
    ellipse(ctx, 0, 8, 37, 11, 'rgba(75,50,12,.18)');
    const g = ctx.createLinearGradient(0, -30, 0, 12);
    g.addColorStop(0, '#f2cc6d');
    g.addColorStop(1, '#c08a2c');
    fillRR(ctx, -38, -28, 76, 38, 6, g);
    ctx.strokeStyle = '#96671f';
    ctx.lineWidth = 2;
    rr(ctx, -38, -28, 76, 38, 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,160,.55)';
    ctx.lineWidth = 1.2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -26);
      ctx.lineTo(i * 10 + 3, 8);
      ctx.stroke();
    }
    ctx.strokeStyle = '#b1802e';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-24, -29); ctx.lineTo(-24, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, -29); ctx.lineTo(24, 10); ctx.stroke();
    ctx.restore();
  }

  function drawMilkCan(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 4, 15, 5, 'rgba(70,50,20,.2)');
    fillRR(ctx, -11, -32, 22, 36, 4, '#c7d3d6');
    ctx.strokeStyle = '#6b7a80';
    ctx.lineWidth = 1.7;
    rr(ctx, -11, -32, 22, 36, 4);
    ctx.stroke();
    fillRR(ctx, -7, -39, 14, 8, 3, '#aebbc0');
    ctx.strokeStyle = '#6b7a80';
    rr(ctx, -7, -39, 14, 8, 3);
    ctx.stroke();
    ctx.strokeStyle = '#eef5f5';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.restore();
  }

  function drawPumpkin(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 3, 20, 6, 'rgba(70,50,15,.2)');
    const g = ctx.createLinearGradient(0, -20, 0, 6);
    g.addColorStop(0, '#ffb24a');
    g.addColorStop(1, color || '#e07c1d');
    ellipse(ctx, 0, -6, 20, 14, g);
    ctx.strokeStyle = 'rgba(150,70,0,.4)';
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -6, 7 * Math.abs(i) + 5, 14, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#6b8f2c';
    fillRR(ctx, -2, -22, 4, 8, 2, '#6b8f2c');
    ctx.restore();
  }

  function drawCat(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 0, 22, 9, '#d9a15f');
    ctx.beginPath();
    ctx.arc(16, -3, 9, 0, TAU);
    ctx.fillStyle = '#e0aa68';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -9); ctx.lineTo(11, -17); ctx.lineTo(16, -10);
    ctx.moveTo(19, -10); ctx.lineTo(24, -17); ctx.lineTo(25, -8);
    ctx.fillStyle = '#c98d4b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,15,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-21, -2); ctx.quadraticCurveTo(-34, -12, -28, -18); ctx.stroke();
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(15, -3); ctx.moveTo(18, -3); ctx.lineTo(23, -3); ctx.stroke();
    ctx.restore();
  }

  /* ---------------- cây táo ---------------- */
  function drawAppleTree(ctx) {
    const x = L.tree.x, y = L.tree.y;
    ctx.save();
    ellipse(ctx, x, y + 8, 116, 34, 'rgba(48,82,25,.25)');
    // rễ
    ctx.strokeStyle = '#7c4d24';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 8);
    ctx.quadraticCurveTo(x - 45, y + 2, x - 72, y + 10);
    ctx.moveTo(x + 2, y - 8);
    ctx.quadraticCurveTo(x + 42, y + 2, x + 66, y + 12);
    ctx.stroke();
    // thân
    const tg = ctx.createLinearGradient(x - 22, 0, x + 24, 0);
    tg.addColorStop(0, '#73441f');
    tg.addColorStop(0.4, '#a56d36');
    tg.addColorStop(1, '#6b3d1b');
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 2);
    ctx.bezierCurveTo(x - 18, y - 60, x - 12, y - 90, x - 20, y - 128);
    ctx.bezierCurveTo(x - 8, y - 150, x + 14, y - 148, x + 20, y - 122);
    ctx.bezierCurveTo(x + 12, y - 84, x + 20, y - 40, x + 26, y - 2);
    ctx.closePath();
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = '#5a3417';
    ctx.lineWidth = 2;
    ctx.stroke();
    // vân vỏ
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#4e2b10';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 12 + i * 8, y - 14);
      ctx.quadraticCurveTo(x - 18 + i * 8, y - 60, x - 10 + i * 6, y - 105);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // cành
    ctx.strokeStyle = '#7c4d24';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 108);
    ctx.quadraticCurveTo(x - 60, y - 150, x - 92, y - 176);
    ctx.moveTo(x + 12, y - 118);
    ctx.quadraticCurveTo(x + 66, y - 158, x + 92, y - 184);
    ctx.stroke();

    // tán lá
    const blobs = [
      [-68, -178, 58, 48, '#4b9434'], [18, -190, 66, 52, '#54a03a'],
      [84, -172, 48, 42, '#468b30'], [-6, -152, 62, 45, '#5dac41'],
      [-98, -154, 40, 35, '#3f852c'], [52, -214, 44, 38, '#63b448'],
      [-48, -218, 40, 34, '#5aa63d'], [112, -204, 34, 28, '#4b9434']
    ];
    blobs.forEach(([bx, by, rx, ry, c], i) => {
      ellipse(ctx, x + bx, y + by, rx, ry, c);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ellipse(ctx, x + bx - rx * 0.22, y + by - ry * 0.32, rx * 0.62, ry * 0.5, '#9ad76e');
      ctx.restore();
    });
    // lá nhỏ viền tán
    const rnd = makeRand(333);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU, r = 74 + rnd() * 58;
      const bx = x + Math.cos(a) * r, by = y - 182 + Math.sin(a) * r * 0.78;
      ctx.globalAlpha = 0.75;
      leafShape(ctx, bx, by, 12 + rnd() * 8, 4, a, i % 2 ? '#70bd4d' : '#4e9a36');
    }
    ctx.globalAlpha = 1;
    // dây đu & tổ chim
    ctx.strokeStyle = '#9a7b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 88, y - 164);
    ctx.lineTo(x - 88, y - 118);
    ctx.moveTo(x - 104, y - 118);
    ctx.lineTo(x - 72, y - 118);
    ctx.stroke();
    ctx.fillStyle = '#b58a52';
    ellipse(ctx, x + 46, y - 214, 15, 7, '#b58a52');
    ctx.strokeStyle = '#8a6536';
    ctx.lineWidth = 1;
    ctx.stroke();
    // nấm dưới gốc
    drawMushroom(ctx, x - 62, y - 2, 0.8);
    drawMushroom(ctx, x + 72, y + 6, 0.6);
    // hoa
    drawFlower(ctx, x - 110, y + 2, 1.6, '#fff3e0');
    drawFlower(ctx, x + 112, y + 8, 1.5, '#ffe076');
    ctx.restore();
  }

  function drawMushroom(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#f2e6cd';
    fillRR(ctx, -4, -12, 8, 14, 3, '#f2e6cd');
    ctx.beginPath();
    ctx.arc(0, -14, 12, Math.PI, 0);
    ctx.fillStyle = '#e26546';
    ctx.fill();
    ctx.fillStyle = '#ffe7d6';
    ellipse(ctx, -5, -18, 2.2, 1.6, '#ffe7d6');
    ellipse(ctx, 4, -20, 1.8, 1.4, '#ffe7d6');
    ctx.restore();
  }

  /* ---------------- hòm thư ---------------- */
  function drawMailbox(ctx) {
    const x = L.mailbox.x, y = L.mailbox.y;
    ctx.save();
    ellipse(ctx, x, y + 4, 24, 9, 'rgba(50,80,25,.25)');
    fillRR(ctx, x - 5, y - 52, 10, 56, 4, '#9a6633');
    ctx.fillStyle = '#d3a064';
    ctx.fillRect(x - 3, y - 50, 2.5, 54);
    // hộp thư
    const g = ctx.createLinearGradient(x - 22, y - 92, x + 22, y - 52);
    g.addColorStop(0, '#e9b875');
    g.addColorStop(1, '#b98045');
    ctx.beginPath();
    ctx.moveTo(x - 23, y - 56);
    ctx.lineTo(x - 23, y - 78);
    ctx.quadraticCurveTo(x - 23, y - 94, x, y - 94);
    ctx.quadraticCurveTo(x + 23, y - 94, x + 23, y - 78);
    ctx.lineTo(x + 23, y - 56);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#75461e';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,190,.5)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 75);
    ctx.quadraticCurveTo(x, y - 87, x + 18, y - 75);
    ctx.stroke();
    // phong bì
    ctx.save();
    ctx.translate(x, y - 73);
    ctx.rotate(-0.06);
    fillRR(ctx, -12, -8, 24, 16, 2, '#fff8e8');
    ctx.strokeStyle = '#b28a55';
    ctx.lineWidth = 1.2;
    rr(ctx, -12, -8, 24, 16, 2);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(0, 1); ctx.lineTo(11, -7);
    ctx.stroke();
    ctx.restore();
    // cờ đỏ
    ctx.strokeStyle = '#7a4a20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 23, y - 66);
    ctx.lineTo(x + 23, y - 90);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, y - 90);
    ctx.lineTo(x + 43, y - 85);
    ctx.lineTo(x + 24, y - 77);
    ctx.closePath();
    ctx.fillStyle = '#dd4b38';
    ctx.fill();
    ctx.strokeStyle = '#9c2e1e';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------- đạo cụ ---------------- */
  function drawProps(ctx) {
    // xe cút kít
    drawWheelbarrow(ctx, L.wheelbarrow.x, L.wheelbarrow.y);

    // biển vườn nhà
    drawSign(ctx, L.fieldSign.x, L.fieldSign.y, 90, 34, 'VƯỜN NHÀ', 0.15, '#d8a35d');

    // thùng gỗ cạnh nhà kho
    drawCrate(ctx, 1218, 378, 0.8);
    drawCrate(ctx, 1194, 392, 0.55);

    // bụi hoa hồng
    drawRoseBush(ctx, 1200, 486, 0.9);
    drawRoseBush(ctx, 70, 660, 1.1);
    drawRoseBush(ctx, 953, 276, 0.6);

    // hàng rào ven sân
    for (let i = 0; i < 5; i++) {
      drawFencePost(ctx, 1198 + i * 30, 548 - i * 4, 42, 8);
    }
    drawRail(ctx, 1194, 526, 1320, 506, 5);
    drawRail(ctx, 1194, 540, 1320, 520, 5);
  }

  function drawWheelbarrow(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ellipse(ctx, 6, 24, 48, 13, 'rgba(60,85,25,.24)');
    ctx.rotate(-0.04);
    // thùng xe
    const g = ctx.createLinearGradient(0, -30, 0, 16);
    g.addColorStop(0, '#7aa3b8');
    g.addColorStop(1, '#4c7f96');
    ctx.beginPath();
    ctx.moveTo(-48, -20);
    ctx.lineTo(46, -26);
    ctx.lineTo(36, 12);
    ctx.lineTo(-35, 17);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#33586b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // cà rốt trong xe
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(-28 + i * 16, -22 + (i % 2) * 3);
      ctx.rotate(-0.5 + i * 0.15);
      ctx.fillStyle = '#f08a2a';
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, 22); ctx.closePath();
      ctx.fill();
      leafShape(ctx, 0, 0, 16, 5, -1.1, '#5aa83a');
      leafShape(ctx, 0, 0, 14, 4, -0.4, '#6fbe45');
      ctx.restore();
    }
    // tay cầm
    ctx.strokeStyle = '#8b5a2c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-42, -6); ctx.lineTo(-92, 9);
    ctx.moveTo(-42, 4); ctx.lineTo(-90, 16);
    ctx.stroke();
    // bánh xe
    ctx.beginPath();
    ctx.arc(42, 22, 18, 0, TAU);
    ctx.fillStyle = '#59452d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 22, 9, 0, TAU);
    ctx.fillStyle = '#c9b189';
    ctx.fill();
    ctx.strokeStyle = '#7a5f3a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(42, 6); ctx.lineTo(42, 38); ctx.moveTo(26, 22); ctx.lineTo(58, 22); ctx.stroke();
    ctx.restore();
  }

  function drawCrate(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 30, 32, 8, 'rgba(60,80,25,.2)');
    const g = ctx.createLinearGradient(0, -6, 0, 30);
    g.addColorStop(0, '#d8a562');
    g.addColorStop(1, '#a57038');
    ctx.fillStyle = g;
    ctx.fillRect(-26, -4, 52, 32);
    ctx.strokeStyle = '#815427';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-26, -4, 52, 32);
    ctx.beginPath();
    ctx.moveTo(-26, 8); ctx.lineTo(26, 8);
    ctx.moveTo(-26, 20); ctx.lineTo(26, 20);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-20, 1, 40, 18);
    ctx.restore();
  }

  function drawRoseBush(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ellipse(ctx, 0, 8, 34, 10, 'rgba(45,80,25,.2)');
    ellipse(ctx, -14, -8, 21, 18, '#468f31');
    ellipse(ctx, 12, -12, 24, 20, '#57a53b');
    ellipse(ctx, 0, -24, 18, 15, '#65b446');
    for (let i = 0; i < 5; i++) {
      const bx = -22 + i * 11, by = -20 + (i % 3) * 7;
      ctx.fillStyle = i % 2 ? '#f26d6d' : '#ff9a9a';
      ellipse(ctx, bx, by, 4.5, 4, i % 2 ? '#f26d6d' : '#ff9a9a');
      ellipse(ctx, bx - 1, by - 1, 2, 1.6, '#ffd0d0');
    }
    ctx.restore();
  }

  /* ---------------- nền trước ---------------- */
  function drawForeground(ctx) {
    // đám cỏ lớn góc dưới
    const rnd = makeRand(1010);
    for (let i = 0; i < 20; i++) {
      const x = 20 + rnd() * 180;
      const y = 690 + rnd() * 20;
      drawGrassTuft(ctx, x, y, 4 + rnd() * 5, '#53764a');
    }
    for (let i = 0; i < 14; i++) {
      const x = 1160 + rnd() * 120;
      const y = 700 + rnd() * 15;
      drawGrassTuft(ctx, x, y, 4 + rnd() * 4, '#53764a');
    }
    drawFlower(ctx, 252, 712, 2.6, '#ffe27a');
    drawFlower(ctx, 986, 708, 2.4, '#fff6e3');
  }

  /* =========================================================
     KHU VƯỜN RIÊNG — chỉ có ruộng rau, nhà dụng cụ, bù nhìn
     ========================================================= */
  let gardenCanvas = null;

  ART.ensureGardenStatic = function () {
    if (gardenCanvas) return gardenCanvas;
    const cv = document.createElement('canvas');
    const scale = 1.5;
    cv.width = W * scale;
    cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    drawGardenStatic(ctx);
    gardenCanvas = cv;
    return cv;
  };

  ART.drawGardenBackground = function (ctx) {
    ctx.drawImage(ART.ensureGardenStatic(), 0, 0, W, H);
  };

  function drawGardenStatic(ctx) {
    drawSky(ctx);
    drawHills(ctx);
    drawGround(ctx);
    drawGardenPath(ctx);
    drawGardenFence(ctx);
    drawGardenLandscaping(ctx);
    drawFieldBase(ctx);
    // Keep the field dominant and reserve the upper-right meadow for crop details.
    ctx.save();
    ctx.translate(1115, 560);
    ctx.scale(.48, .48);
    drawToolShed(ctx, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(954, 467);
    ctx.scale(.55, .55);
    drawScarecrow(ctx, 0, 0);
    ctx.restore();
    drawGardenProps(ctx);
    drawForegroundGarden(ctx);
  }

  function drawGardenPath(ctx) {
    ctx.save();
    const p = new Path2D();
    p.moveTo(-50, 665);
    p.bezierCurveTo(190, 610, 400, 660, 610, 590);
    p.bezierCurveTo(775, 563, 950, 577, 1115, 553);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(65,84,45,.13)';
    ctx.lineWidth = 116;
    ctx.stroke(p);
    ctx.strokeStyle = '#bba978';
    ctx.lineWidth = 104;
    ctx.stroke(p);
    ctx.strokeStyle = '#ddd0a6';
    ctx.lineWidth = 94;
    ctx.stroke(p);
    ctx.strokeStyle = '#eadfbd';
    ctx.lineWidth = 71;
    ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,246,215,.38)';
    ctx.lineWidth = 38;
    ctx.stroke(p);
    // The yard and stepping stones connect the path to the shed door.
    ellipse(ctx, 1115, 552, 112, 42, '#c9bd93', -0.08);
    ellipse(ctx, 1115, 549, 110, 40, '#e1d4af', -0.08);
    const rnd = makeRand(701);
    for (let i = 0; i < 100; i++) {
      const x = 1010 + rnd() * 210, y = 516 + rnd() * 70;
      if (((x - 1115) / 105) ** 2 + ((y - 549) / 35) ** 2 > 1) continue;
      ellipse(ctx, x, y, 1 + rnd() * 2, 0.5 + rnd(), 'rgba(151,125,83,.17)');
    }
    [[1106, 569, 14, 4], [1082, 578, 16, 5], [1055, 581, 17, 5]].forEach(([x,y,rx,ry]) => {
      ellipse(ctx, x + 2, y + 3, rx + 2, ry + 1, 'rgba(106,93,63,.15)', -.12);
      drawStone(ctx, x, y, rx, ry, -.12, '#c4bca0');
      ctx.beginPath(); ctx.ellipse(x - 2, y - 2, rx * .7, ry * .48, -.12, Math.PI, TAU);
      ctx.strokeStyle = 'rgba(255,250,224,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    for (let i = 0; i < 42; i++) {
      const x = 40 + rnd() * 930, y = 520 + rnd() * 120;
      ctx.globalAlpha = 0.3 + rnd() * 0.2;
      drawStone(ctx, x, y, 1.8 + rnd() * 3.5, 1.1 + rnd() * 2.2, rnd(), '#b8ad8c');
    }
    ctx.globalAlpha = .7;
    for (let i = 0; i < 16; i++) {
      drawGrassTuft(ctx, 40 + rnd() * 950, 560 + rnd() * 100, 1.2 + rnd() * 1.4, '#879f60');
    }
    ctx.restore();
  }

  function drawGardenLandscaping(ctx) {
    // All ornamental work is cached once with the scene, never per frame.
    function tree(x, y, scale, seed) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      const shade = ctx.createRadialGradient(24, 4, 4, 24, 4, 116);
      shade.addColorStop(0, 'rgba(48,72,40,.17)');
      shade.addColorStop(1, 'rgba(48,72,40,0)');
      ctx.save(); ctx.scale(1, .32); ctx.fillStyle = shade; ctx.fillRect(-120, -120, 270, 240); ctx.restore();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7a7150'; ctx.lineWidth = 17;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-7, -62, 2, -122); ctx.stroke();
      ctx.strokeStyle = '#a79668'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(-10, -60, -1, -106); ctx.stroke();
      ctx.strokeStyle = '#7a7150'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-1,-63); ctx.lineTo(-35,-103); ctx.moveTo(0,-72);ctx.lineTo(30,-115);ctx.stroke();
      const rnd = makeRand(seed);
      const clusters = [[-47,-118,48], [35,-121,53], [-10,-157,61], [-42,-164,35], [28,-170,43]];
      clusters.forEach(([cx, cy, r], i) => {
        const foliage = ctx.createRadialGradient(cx - r*.3, cy - r*.4, 4, cx, cy, r);
        foliage.addColorStop(0, i % 2 ? '#acc183' : '#9eb77a');
        foliage.addColorStop(.63, '#799953');
        foliage.addColorStop(1, '#5f824b');
        blobPath(ctx,cx,cy,r,r*.82,[1,.94,1.05,.93,1.02,.95,1,.95,1.05,.94],.1);ctx.fillStyle=foliage;ctx.fill();
        for(let j=0;j<9;j++){
          const a=rnd()*TAU,rad=rnd()*r*.65;
          ellipse(ctx,cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.7,3+rnd()*4,2+rnd()*2,'rgba(220,229,168,.15)',-.4);
        }
      });
      ctx.restore();
    }
    tree(75, 486, 1.05, 781);
    tree(1322, 520, .75, 782);
    // Lavender and daisies nestle beside the fence and shed.
    [[1211,574], [179,481], [297,578]].forEach(([x,y],j) => {
      ellipse(ctx,x,y+2,24,8,'rgba(68,88,47,.12)');
      for (let i=0;i<7;i++) {
        const px=x-19+i*6, py=y+(i%3)*2;
        drawGrassTuft(ctx,px,py,3,'#71884e');
        drawFlower(ctx,px,py-2,1.8,i%3 ? '#eee9cb' : '#b5a6be');
      }
    });
  }

  function drawGardenFence(ctx) {
    // hàng rào phía sau ruộng
    for (let x = 240; x <= 900; x += 58) drawFencePost(ctx, x, 250, 46, 9);
    drawRail(ctx, 238, 224, 904, 224, 6);
    drawRail(ctx, 238, 239, 904, 239, 6);
    // hàng rào bên phải
    for (let i = 0; i < 5; i++) drawFencePost(ctx, 1194, 300 + i * 56, 46, 9);
    drawRail(ctx, 1194, 278, 1194, 548, 5);
    drawRail(ctx, 1206, 278, 1206, 548, 5);
    // dây leo & hoa
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 10; i++) {
      const x = 250 + i * 65;
      drawFlower(ctx, x, 254 + (i % 3) * 5, 1.5, i % 2 ? '#fff6df' : '#ffe27a');
    }
    ctx.globalAlpha = 1;
  }

  function drawToolShed(ctx, x, base) {
    ctx.save();
    // bóng
    U.ellipse(ctx, x, base + 12, 140, 30, 'rgba(55,80,25,.25)');
    // nền đá
    ctx.beginPath();
    ctx.ellipse(x, base + 2, 124, 25, 0, 0, TAU);
    ctx.fillStyle = '#cbb78f';
    ctx.fill();
    // thân nhà
    const wall = ctx.createLinearGradient(x - 110, 0, x + 110, 0);
    wall.addColorStop(0, '#d2aa72');
    wall.addColorStop(0.55, '#e4c18c');
    wall.addColorStop(1, '#b28a57');
    U.rr(ctx, x - 112, base - 152, 224, 158, 6);
    ctx.fillStyle = wall;
    ctx.fill();
    U.rr(ctx, x - 112, base - 152, 224, 158, 6);
    ctx.strokeStyle = '#7a4a20';
    ctx.lineWidth = 3;
    ctx.stroke();
    // ván dọc
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#6b3d18';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 112 + i * 32, base - 149);
      ctx.lineTo(x - 112 + i * 32, base + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Fine grain and the eave shadow make the timber feel less flat.
    ctx.save();
    const grain = makeRand(438);
    for (let i = 0; i < 36; i++) {
      const gx = x - 105 + grain() * 210;
      const gy = base - 139 + grain() * 130;
      ctx.strokeStyle = 'rgba(126,87,47,.13)';
      ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx - 2, gy + 8, gx, gy + 17); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(83,56,36,.16)';
    ctx.fillRect(x - 110, base - 145, 220, 16);
    ctx.restore();
    // mái đỏ
    ctx.beginPath();
    ctx.moveTo(x - 140, base - 148);
    ctx.quadraticCurveTo(x - 90, base - 222, x + 8, base - 243);
    ctx.quadraticCurveTo(x + 106, base - 222, x + 148, base - 148);
    ctx.lineTo(x + 126, base - 138);
    ctx.lineTo(x - 120, base - 138);
    ctx.closePath();
    const roof = ctx.createLinearGradient(0, base - 245, 0, base - 135);
    roof.addColorStop(0, '#d78d71');
    roof.addColorStop(.35, '#bd745a');
    roof.addColorStop(1, '#995944');
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.strokeStyle = '#6f3024';
    ctx.lineWidth = 3;
    ctx.stroke();
    // ngói
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 140, base - 148);
    ctx.quadraticCurveTo(x - 90, base - 222, x + 8, base - 243);
    ctx.quadraticCurveTo(x + 106, base - 222, x + 148, base - 148);
    ctx.lineTo(x + 126, base - 138);
    ctx.lineTo(x - 120, base - 138);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#6b2d21';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 130 + i * 37, base - 135);
      ctx.lineTo(x - 80 + i * 37, base - 240);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,222,181,.45)';
    ctx.lineWidth = 1.2;
    for (let row = 0; row < 5; row++) {
      ctx.beginPath();
      ctx.moveTo(x - 142, base - 143 - row * 19);
      ctx.quadraticCurveTo(x, base - 132 - row * 19, x + 150, base - 143 - row * 19);
      ctx.stroke();
    }
    ctx.restore();
    // cửa
    U.fillRR(ctx, x - 34, base - 105, 68, 106, 5, '#7a4a24');
    U.rr(ctx, x - 34, base - 105, 68, 106, 5);
    ctx.strokeStyle = '#5b3416';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#d8aa68';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 25, base - 4); ctx.lineTo(x - 25, base - 96);
    ctx.moveTo(x + 25, base - 4); ctx.lineTo(x + 25, base - 96);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 32, base - 100); ctx.lineTo(x + 32, base - 10);
    ctx.moveTo(x + 32, base - 100); ctx.lineTo(x - 32, base - 10);
    ctx.stroke();
    ctx.fillStyle = '#f0c458';
    ctx.beginPath(); ctx.arc(x + 18, base - 54, 3.2, 0, TAU); ctx.fill();
    // cửa sổ
    U.fillRR(ctx, x + 62, base - 122, 36, 42, 4, '#a9dfe3');
    ctx.strokeStyle = '#f6e8c5';
    ctx.lineWidth = 3;
    U.rr(ctx, x + 62, base - 122, 36, 42, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 80, base - 120); ctx.lineTo(x + 80, base - 81);
    ctx.moveTo(x + 63, base - 101); ctx.lineTo(x + 97, base - 101);
    ctx.stroke();
    // hộp hoa
    U.fillRR(ctx, x + 56, base - 82, 48, 10, 3, '#8a5a2c');
    for (let i = 0; i < 3; i++) drawFlower(ctx, x + 63 + i * 15, base - 82, 1.2, i % 2 ? '#ff9a8b' : '#ffd35c');
    // biển dụng cụ
    ctx.save();
    ctx.translate(x - 70, base - 136);
    ctx.rotate(-0.02);
    U.fillRR(ctx, -44, -14, 88, 25, 4, '#f4e6c2');
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 2;
    U.rr(ctx, -44, -14, 88, 25, 4);
    ctx.stroke();
    ctx.fillStyle = '#6b4a1f';
    ctx.font = '800 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DỤNG CỤ', 0, 0);
    ctx.restore();
    // A stone doorstep and a small brass lantern add a lived-in finish.
    fillRR(ctx, x - 40, base + 1, 80, 8, 3, '#a49a7c');
    fillRR(ctx, x - 39, base - 1, 78, 5, 3, '#dad0b1');
    ctx.strokeStyle = '#675c42'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 53, base - 102); ctx.lineTo(x - 53, base - 112); ctx.lineTo(x - 62, base - 112); ctx.stroke();
    fillRR(ctx, x - 69, base - 108, 14, 19, 3, '#6a7052');
    fillRR(ctx, x - 66, base - 105, 8, 12, 2, '#f6da8c');
    ellipse(ctx, x - 62, base - 88, 9, 2, '#5c6348');
    for (let i = 0; i < 8; i++) {
      const ivyY = base - 42 - i * 11;
      leafShape(ctx, x + 108, ivyY, 13, 5, i % 2 ? -2.8 : -.5, i % 2 ? '#668348' : '#8c9d58');
    }
    // dụng cụ dựa tường
    ctx.strokeStyle = '#9a6633';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 128, base + 2); ctx.lineTo(x - 108, base - 94); ctx.stroke();
    ctx.strokeStyle = '#c7d2d4';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 112, base - 96); ctx.lineTo(x - 98, base - 86); ctx.stroke();
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 126, base); ctx.lineTo(x + 118, base - 74); ctx.stroke();
    // bao hạt & xô nước
    drawHayBale(ctx, x + 146, base + 4, 0.55, 0.08);
    drawMilkCan(ctx, x - 146, base + 2, 0.72);
    ctx.restore();
  }

  function drawScarecrow(ctx, x, base) {
    ctx.save();
    U.ellipse(ctx, x, base + 4, 34, 9, 'rgba(55,75,25,.24)');
    // cột
    ctx.fillStyle = '#8b5a2c';
    U.fillRR(ctx, x - 5, base - 156, 10, 160, 4, '#8b5a2c');
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 1.5;
    U.rr(ctx, x - 5, base - 156, 10, 160, 4);
    ctx.stroke();
    // tay ngang
    U.fillRR(ctx, x - 58, base - 122, 116, 8, 4, '#8b5a2c');
    // áo sơ mi
    ctx.beginPath();
    ctx.moveTo(x - 34, base - 130);
    ctx.quadraticCurveTo(x - 40, base - 82, x - 26, base - 66);
    ctx.lineTo(x + 26, base - 66);
    ctx.quadraticCurveTo(x + 40, base - 82, x + 34, base - 130);
    ctx.closePath();
    ctx.fillStyle = '#d98a53';
    ctx.fill();
    ctx.strokeStyle = '#8a4b2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // ô vuông caro
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#fff1cf';
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 11, base - 126);
      ctx.lineTo(x + i * 11, base - 70);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 28, base - 118 + i * 13);
      ctx.lineTo(x + 28, base - 118 + i * 13);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // ống tay rơm
    ctx.strokeStyle = '#e4bd5b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 58, base - 118);
      ctx.lineTo(x - 74, base - 126 + i * 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 58, base - 118);
      ctx.lineTo(x + 74, base - 126 + i * 5);
      ctx.stroke();
    }
    // đầu
    U.ellipse(ctx, x, base - 154, 24, 25, '#e7c998');
    ctx.strokeStyle = '#9a7745';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, base - 154, 24, 25, 0, 0, TAU); ctx.stroke();
    // mắt cúc áo
    U.ellipse(ctx, x - 8, base - 160, 2.7, 2.7, '#4a3520');
    U.ellipse(ctx, x + 8, base - 160, 2.7, 2.7, '#4a3520');
    // miệng khâu
    ctx.strokeStyle = '#7c5430';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, base - 146, 9, 0.2, Math.PI - 0.2); ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 5, base - 149);
      ctx.lineTo(x + i * 5, base - 144);
      ctx.stroke();
    }
    // mũ rơm
    ctx.beginPath(); ctx.ellipse(x, base - 174, 34, 8, 0, 0, TAU);
    ctx.fillStyle = '#d8a64d'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, base - 183, 20, 13, 0, Math.PI, 0);
    ctx.fillStyle = '#edc475'; ctx.fill();
    ctx.strokeStyle = '#a8782b';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, base - 174, 34, 8, 0, 0, TAU); ctx.stroke();
    // quạ trên mũ
    ctx.save();
    ctx.translate(x + 24, base - 188);
    U.ellipse(ctx, 0, 0, 9, 6, '#3d3a36');
    ctx.beginPath(); ctx.arc(7, -5, 4, 0, TAU); ctx.fillStyle = '#3d3a36'; ctx.fill();
    ctx.fillStyle = '#f0a21e';
    ctx.beginPath(); ctx.moveTo(11, -5); ctx.lineTo(16, -3); ctx.lineTo(11, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8, -6, 1, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawGardenProps(ctx) {
    // Small working-yard accents sit beyond the twelve planting targets.
    ctx.save();
    ctx.translate(1000, 558);
    ctx.scale(.58, .58);
    drawWheelbarrow(ctx, 0, 0);
    ctx.restore();
    drawSign(ctx, 858, 529, 82, 25, 'VƯỜN RAU', .07, '#cfad77');
    drawCrate(ctx, 1200, 545, .48);
    drawPumpkin(ctx, 1182, 571, .52, '#cf8b45');
    drawHayBale(ctx, 1210, 575, .48, -.05);
    drawRainBarrel(ctx, 1051, 553, .52);
    drawCompost(ctx, 236, 552, .64);
    drawRoseBush(ctx, 1222, 601, .64);
    drawRoseBush(ctx, 208, 600, .64);
    drawMushroom(ctx, 285, 578, .5);
    drawFlower(ctx, 194, 502, 1.8, '#fff1de');
    drawFlower(ctx, 1170, 599, 1.6, '#ffe076');
    drawFlower(ctx, 674, 585, 1.6, '#ffd9e3');
    drawGrassTuft(ctx, 927, 489, 3, '#7c9757');
  }

  function drawRainBarrel(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    U.ellipse(ctx, 0, 4, 22, 7, 'rgba(55,75,25,.22)');
    const g = ctx.createLinearGradient(-18, 0, 18, 0);
    g.addColorStop(0, '#7a4a24');
    g.addColorStop(0.5, '#c58a4b');
    g.addColorStop(1, '#6d3f1d');
    U.fillRR(ctx, -18, -44, 36, 48, 8, g);
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 2;
    U.rr(ctx, -18, -44, 36, 48, 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,170,.35)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-15, -36 + i * 10); ctx.lineTo(15, -36 + i * 10); ctx.stroke();
    }
    U.ellipse(ctx, 0, -44, 18, 6, '#3f6f86');
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-18, -33); ctx.lineTo(18, -33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(18, -12); ctx.stroke();
    ctx.fillStyle = '#6b4a1f';
    U.fillRR(ctx, -4, -12, 8, 15, 3, '#6b4a1f');
    ctx.restore();
  }

  function drawCompost(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    U.ellipse(ctx, 0, 8, 38, 11, 'rgba(55,75,25,.22)');
    const g = ctx.createLinearGradient(0, -34, 0, 10);
    g.addColorStop(0, '#a97743');
    g.addColorStop(1, '#7a4c25');
    U.fillRR(ctx, -34, -34, 68, 42, 5, g);
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 2.2;
    U.rr(ctx, -34, -34, 68, 42, 5);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(255,225,170,.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-30, -26 + i * 9); ctx.lineTo(30, -26 + i * 9); ctx.stroke();
    }
    // lá xanh
    U.leafShape(ctx, -24, -34, 18, 7, -1.4, '#5da737');
    U.leafShape(ctx, 6, -38, 20, 8, -0.4, '#76c24a');
    U.leafShape(ctx, 24, -30, 14, 6, 0.4, '#4f9a32');
    ctx.restore();
  }

  function drawForegroundGarden(ctx) {
    const rnd = makeRand(913);
    for (let i = 0; i < 13; i++) {
      drawGrassTuft(ctx, 20 + rnd() * 160, 700 + rnd() * 16, 4 + rnd() * 4, '#53764a');
      drawGrassTuft(ctx, 1120 + rnd() * 140, 702 + rnd() * 12, 4 + rnd() * 3, '#53764a');
    }
    drawFlower(ctx, 384, 704, 2.4, '#ffe27a');
    drawFlower(ctx, 1006, 700, 2.2, '#fff6e3');
  }

  /* ---------------- động vật, cây trồng & icon được tải ở sprites.js ---------------- */
  ART.drawPenFront = drawPenFront;
  ART.drawBush = drawBush;
})();
