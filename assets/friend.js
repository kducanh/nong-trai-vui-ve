/* =========================================================
   FRIEND — cảnh vườn của bạn bè khi ghé thăm
   Vẽ trên một canvas riêng, tách hẳn khỏi nông trại của mình.
   ========================================================= */
(function () {
  'use strict';
  const ART = window.ART;
  const U = ART.util;
  const TAU = Math.PI * 2;
  const W = 1280, H = 720;

  const LAYOUT = {
    field: { ox: 452, oy: 300, tw: 165, th: 82, cols: 3, rows: 2 },
    gift: { x: 752, y: 454 },
    host: { x: 700, y: 505 },
    pond: { x: 867, y: 570, rx: 112, ry: 49 },
    house: { x: 1002, y: 430 },
    tree: { x: 158, y: 554 },
    sign: { x: 772, y: 308 }
  };

  function plotCenter(c, r) {
    const f = LAYOUT.field;
    return { x: f.ox + (c - r) * f.tw / 2, y: f.oy + (c + r) * f.th / 2 };
  }
  const plotPositions = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) plotPositions.push(plotCenter(c, r));

  const THEMES = {
    peach: {
      sky: ['#e8d7ba', '#d7e8df'], hill: ['#c5d1a6', '#a0b388'], grass: '#a1b779',
      roof: '#ce896d', roof2: '#985747', wall: '#fff0d5', door: '#8a6441',
      accent: '#ff9b86', flower: '#ffb3a1'
    },
    mint: {
      sky: ['#c4dfd4', '#c1dce2'], hill: ['#bfd2b5', '#9ab69b'], grass: '#99b78a',
      roof: '#78a4a4', roof2: '#496f79', wall: '#fff6df', door: '#816340',
      accent: '#65b8d9', flower: '#8fe3c7'
    },
    lavender: {
      sky: ['#e3d7e4', '#cedfe7'], hill: ['#c6d2b8', '#a1b697'], grass: '#a2b88b',
      roof: '#a58ba7', roof2: '#77617f', wall: '#fff3dc', door: '#806344',
      accent: '#b69be8', flower: '#d6b6ff'
    }
  };

  function draw(ctx, t, data) {
    const friend = data.friend;
    const th = THEMES[friend.theme] || THEMES.peach;
    const fd = data.state;
    const rnd = U.makeRand(101 + friend.id.length * 17);

    drawSky(ctx, t, th);
    drawHills(ctx, th, rnd);
    drawGround(ctx, th, rnd);
    drawPath(ctx);
    drawPond(ctx, t, th);
    drawTree(ctx, t);
    drawFence(ctx);
    drawGardenBed(ctx, th);
    drawGardenPlots(ctx, t, data);
    drawCottage(ctx, th);
    drawGift(ctx, t, data);
    drawHost(ctx, t, data);
    drawSign(ctx, friend);
    drawAmbient(ctx, t, rnd);
    if (data.speech) drawSpeech(ctx, data.speech, LAYOUT.host.x, LAYOUT.host.y - 155);
    // vignette ấm
    const vg = ctx.createRadialGradient(640, 360, 220, 640, 360, 760);
    vg.addColorStop(0, 'rgba(255,245,190,0)');
    vg.addColorStop(1, 'rgba(47,68,48,.10)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------------- bầu trời, đồi, nền ---------------- */
  function drawSky(ctx, t, th) {
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(0.6, th.sky[1]);
    g.addColorStop(1, '#f0efdb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 310);

    const sun = ctx.createRadialGradient(1050, 80, 5, 1050, 80, 150);
    sun.addColorStop(0, 'rgba(255,250,190,.85)');
    sun.addColorStop(0.4, 'rgba(255,235,150,.3)');
    sun.addColorStop(1, 'rgba(255,235,150,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(850, 0, 430, 280);

    U.drawCloud(ctx, 250 + Math.sin(t * 0.02) * 12, 76, 1.05, 0.9);
    U.drawCloud(ctx, 650 + Math.sin(t * 0.016) * 8, 44, 0.7, 0.65);
    U.drawCloud(ctx, 1110, 120, 0.8, 0.62);
  }

  function drawHills(ctx, th, rnd) {
    ctx.beginPath();
    ctx.moveTo(-30, 219);
    ctx.bezierCurveTo(180, 133, 280, 176, 440, 149);
    ctx.bezierCurveTo(620, 112, 790, 177, 940, 150);
    ctx.bezierCurveTo(1100, 113, 1210, 174, 1320, 145);
    ctx.lineTo(1320, 300); ctx.lineTo(-30, 300); ctx.closePath();
    ctx.fillStyle = '#d5ddc4'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-30, 255);
    ctx.bezierCurveTo(150, 160, 300, 220, 480, 185);
    ctx.bezierCurveTo(650, 150, 790, 220, 940, 190);
    ctx.bezierCurveTo(1090, 160, 1200, 210, 1320, 175);
    ctx.lineTo(1320, 330); ctx.lineTo(-30, 330);
    ctx.closePath();
    let g = ctx.createLinearGradient(0, 150, 0, 330);
    g.addColorStop(0, th.hill[0]);
    g.addColorStop(1, th.hill[1]);
    ctx.fillStyle = g;
    ctx.fill();

    for (let i = 0; i < 28; i++) {
      const x = 30 + i * 47 + rnd() * 22;
      const y = 235 + Math.sin(i) * 10;
      const s = 16 + rnd() * 18;
      ctx.globalAlpha = 0.32;
      U.ellipse(ctx, x, y - s * 0.5, s * 0.7, s * 0.55, '#587d5c');
      U.ellipse(ctx, x + s * 0.4, y - s * 0.85, s * 0.5, s * 0.45, '#79955d');
      ctx.globalAlpha = 1;
    }
  }

  function drawGround(ctx, th, rnd) {
    const g = ctx.createLinearGradient(0, 200, 0, H);
    g.addColorStop(0, '#b8ca94');
    g.addColorStop(0.5, th.grass);
    g.addColorStop(1, '#76945e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-20, 255);
    ctx.bezierCurveTo(180, 238, 320, 265, 490, 250);
    ctx.bezierCurveTo(650, 238, 790, 263, 960, 248);
    ctx.bezierCurveTo(1120, 235, 1220, 258, 1300, 245);
    ctx.lineTo(1300, H + 20); ctx.lineTo(-20, H + 20);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#fff' : '#255f1d';
      ctx.beginPath();
      const x = -200 + i * 180;
      ctx.moveTo(x, 260); ctx.lineTo(x + 100, 260);
      ctx.lineTo(x + 500, 760); ctx.lineTo(x + 400, 760);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 120; i++) {
      const x = 20 + rnd() * 1240, y = 280 + rnd() * 410;
      ctx.globalAlpha = 0.25 + rnd() * 0.3;
      U.drawGrassTuft(ctx, x, y, 1.5 + rnd() * 2, rnd() > 0.5 ? '#617d4d' : '#c1d294');
    }
    ctx.globalAlpha = 1;
    const flowers = [
      [80, 300, '#fff6dd'], [310, 280, '#ffe17b'], [570, 270, '#fff'],
      [760, 300, '#ffd7e4'], [1130, 325, '#ffe17b'], [1230, 500, '#fff'],
      [270, 650, '#fff6dd'], [1050, 640, '#ffd7e4']
    ];
    flowers.forEach(([x, y, c]) => {
      ctx.globalAlpha = 0.9;
      U.drawFlower(ctx, x, y, 1.6, c);
    });
    ctx.globalAlpha = 1;
    // hàng rào gỗ phía xa
    for (let i = 0; i < 7; i++) U.drawFencePost(ctx, 620 + i * 46, 268, 34, 7);
    U.drawRail(ctx, 618, 250, 930, 250, 4);
    U.drawRail(ctx, 618, 262, 930, 262, 4);
    ctx.restore();
  }

  function drawPath(ctx) {
    const p = new Path2D();
    p.moveTo(120, 690);
    p.bezierCurveTo(360, 610, 520, 640, 700, 540);
    p.bezierCurveTo(810, 480, 855, 430, 930, 365);
    ctx.strokeStyle = '#c9b17b';
    ctx.lineWidth = 80;
    ctx.lineCap = 'round';
    ctx.stroke(p);
    ctx.strokeStyle = '#e7d6a8';
    ctx.lineWidth = 66;
    ctx.stroke(p);
    ctx.strokeStyle = '#f1e4bf';
    ctx.lineWidth = 44;
    ctx.stroke(p);
    const rnd = U.makeRand(191);
    for (let i = 0; i < 22; i++) {
      ctx.globalAlpha = 0.35;
      U.drawStone(ctx, 180 + rnd() * 800, 420 + rnd() * 260, 1.6 + rnd() * 3, 1 + rnd() * 2, rnd(), '#d3c3a3');
    }
    ctx.globalAlpha = 1;
  }

  function drawPond(ctx, t, th) {
    const p = LAYOUT.pond;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx + 18, p.ry + 13, -0.08, 0, TAU);
    ctx.fillStyle = '#d9c694';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, -0.08, 0, TAU);
    const g = ctx.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry);
    g.addColorStop(0, '#b7dbcf');
    g.addColorStop(0.5, '#73b4b2');
    g.addColorStop(1, '#447f8b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,100,110,.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = '#e7fffa';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(p.x - 20 + i * 23, p.y - 5 + i * 8, 16 + i * 5, 2.3 + i * 0.6, 0.1, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // sen
    ctx.save();
    ctx.translate(p.x - 30, p.y - 6);
    ctx.scale(1, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0.25, TAU - 0.25);
    ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#4c9e3d'; ctx.fill();
    ctx.restore();
    U.drawFlower(ctx, p.x - 26, p.y - 18, 2.2, '#ffc3d6');
    // đá ven hồ
    const rnd = U.makeRand(81);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      U.drawStone(ctx, p.x + Math.cos(a) * (p.rx + 8), p.y + Math.sin(a) * (p.ry + 7), 4 + rnd() * 5, 3 + rnd() * 3, a, '#d7d6c9');
    }
    // vịt
    ctx.save();
    ctx.translate(p.x + 34, p.y + 4);
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -6, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f0a21e';
    ctx.beginPath(); ctx.moveTo(13, -6); ctx.lineTo(18, -4); ctx.lineTo(13, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f261c';
    ctx.beginPath(); ctx.arc(10, -7, 1.1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawTree(ctx, t) {
    const x = LAYOUT.tree.x, y = LAYOUT.tree.y;
    ctx.save();
    U.ellipse(ctx, x + 15, y + 8, 98, 24, 'rgba(48,70,43,.18)');
    ctx.fillStyle = '#8a5a2d';
    U.fillRR(ctx, x - 9, y - 100, 18, 110, 7, '#8a5a2d');
    ctx.strokeStyle = '#67411f';
    ctx.lineWidth = 2;
    U.rr(ctx, x - 9, y - 100, 18, 110, 7);
    ctx.stroke();
    const blobs = [
      [-56, -150, 52, 42], [4, -176, 64, 50], [64, -150, 48, 40],
      [-6, -126, 58, 42], [36, -105, 40, 32], [-60, -115, 36, 30]
    ];
    blobs.forEach(([bx, by, rx, ry], i) => {
      const leaf = ctx.createRadialGradient(x + bx - rx * .4, y + by - ry * .55, 2, x + bx, y + by, rx * 1.15);
      leaf.addColorStop(0, i % 2 ? '#a8bf75' : '#b5c980');
      leaf.addColorStop(.5, i % 2 ? '#789450' : '#839e59');
      leaf.addColorStop(1, '#486b48');
      U.ellipse(ctx, x + bx, y + by, rx, ry, leaf);
      ctx.save(); ctx.globalAlpha = .28;
      for (let j = 0; j < 5; j++) {
        const a = j * 2.4 + i;
        U.ellipse(ctx, x + bx + Math.cos(a) * rx * .55, y + by + Math.sin(a) * ry * .55,
          rx * .12, ry * .065, '#eef1b8', -.4);
      }
      ctx.restore();
    });
    const rnd = U.makeRand(22);
    for (let i = 0; i < 8; i++) {
      const ax = x - 80 + rnd() * 150;
      const ay = y - 200 + rnd() * 100;
      const g = ctx.createRadialGradient(ax - 2, ay - 2, 1, ax, ay, 7);
      g.addColorStop(0, '#ff9f80'); g.addColorStop(1, '#c82f28');
      ctx.beginPath(); ctx.arc(ax, ay, 6.5, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(ax - 2, ay - 2, 1.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawFence(ctx) {
    for (let i = 0; i < 6; i++) U.drawFencePost(ctx, 290 + i * 78, 250, 38, 9);
    U.drawRail(ctx, 288, 226, 680, 226, 5);
    U.drawRail(ctx, 288, 240, 680, 240, 5);
  }

  function drawGardenBed(ctx, th) {
    const f = LAYOUT.field;
    const top = plotCenter(0, 0), right = plotCenter(2, 0);
    const bottom = plotCenter(2, 1), left = plotCenter(0, 1);
    const tw = f.tw / 2 + 22, thh = f.th / 2 + 18;
    const poly = [
      { x: top.x, y: top.y - thh }, { x: right.x + tw, y: right.y },
      { x: bottom.x, y: bottom.y + thh }, { x: left.x - tw, y: left.y }
    ];
    ctx.save();
    ctx.translate(0, 9);
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = 'rgba(45,80,25,.25)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = '#b8874a';
    ctx.fill();
    ctx.strokeStyle = '#7c5226'; ctx.lineWidth = 3; ctx.stroke();
    // mặt cỏ
    ctx.beginPath();
    poly.forEach((p, i) => {
      const cx = (top.x + bottom.x) / 2, cy = (top.y + bottom.y) / 2;
      const x = p.x + (cx - p.x) * 0.06, y = p.y + (cy - p.y) * 0.06;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 250, 0, 500);
    g.addColorStop(0, '#bbca8e');
    g.addColorStop(1, '#8fa967');
    ctx.fillStyle = g;
    ctx.fill();
    // viền gỗ mỏng
    ctx.strokeStyle = '#d9a86b';
    ctx.lineWidth = 4;
    ctx.stroke();
    // nơ hoa quanh vườn
    U.drawFlower(ctx, 302, 356, 1.8, th.flower);
    U.drawFlower(ctx, 688, 430, 1.8, '#fff3d4');
    U.drawFlower(ctx, 652, 468, 1.6, th.flower);
    ctx.restore();
  }

  function drawGardenPlots(ctx, t, data) {
    const fd = data.state;
    const order = plotPositions.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
    order.forEach(({ p, i }) => {
      const base = FRIEND_PLOT(i);
      const plot = fd.plots[i] || base;
      const watered = !!(plot.watered);
      const crop = plot.crop;
      const progress = crop ? Math.min(1, plot.progress || 0) : 0;
      if (crop && progress >= 1) ART.drawReadyGlow(ctx, p.x, p.y, t);
      ART.drawPlotGround(ctx, {
        tilled: true,
        crop,
        progress,
        watered,
        fertilized: false
      }, i, p.x, p.y, null, t);
      if (crop) {
        ART.drawPlant(ctx, {
          crop, progress, watered, fertilized: false
        }, p.x, p.y, t, i);
      }
      if (data.hoverIndex === i) {
        ctx.save();
        ctx.strokeStyle = '#fff6c8';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255,238,140,.8)';
        ctx.shadowBlur = 10;
        U.diamondPath(ctx, p.x, p.y, 154, 78);
        ctx.stroke();
        ctx.restore();
      }
      if (crop && progress < 1) {
        // dấu nước: luống nào cần tưới
        const bx = p.x + 38, by = p.y - 19;
        ctx.save();
        ctx.globalAlpha = watered ? 0.45 : 0.95;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, TAU);
        ctx.fillStyle = watered ? '#d9f7ff' : '#e9fbff';
        ctx.fill();
        ctx.strokeStyle = watered ? '#6aa8b8' : '#2f8aa2';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = watered ? '#4f93a5' : '#2f9ec4';
        ctx.beginPath();
        ctx.moveTo(bx, by - 4.5);
        ctx.bezierCurveTo(bx + 4, by + 1, bx + 3.5, by + 3.5, bx, by + 4);
        ctx.bezierCurveTo(bx - 3.5, by + 3.5, bx - 4, by + 1, bx, by - 4.5);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function FRIEND_PLOT(i) {
    // dữ liệu gốc chỉ dùng khi state chưa có
    return { crop: null, progress: 0, watered: false };
  }

  function drawCottage(ctx, th) {
    const x = LAYOUT.house.x, base = LAYOUT.house.y;
    ctx.save();
    U.ellipse(ctx, x, base + 20, 170, 32, 'rgba(55,80,25,.24)');
    // thân nhà
    const wall = ctx.createLinearGradient(x - 100, 0, x + 110, 0);
    wall.addColorStop(0, th.wall);
    wall.addColorStop(1, '#e8c98f');
    U.fillRR(ctx, x - 118, base - 195, 236, 198, 7, wall);
    ctx.strokeStyle = '#8a5a2c';
    ctx.lineWidth = 3;
    U.rr(ctx, x - 118, base - 195, 236, 198, 7);
    ctx.stroke();
    // khung gỗ
    ctx.strokeStyle = 'rgba(120,75,30,.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 80, base - 190); ctx.lineTo(x - 80, base + 1);
    ctx.moveTo(x + 80, base - 190); ctx.lineTo(x + 80, base + 1);
    ctx.moveTo(x - 118, base - 120); ctx.lineTo(x + 118, base - 120);
    ctx.stroke();
    // cửa
    U.fillRR(ctx, x - 25, base - 92, 50, 92, 22, th.door);
    ctx.strokeStyle = '#5d3a1a'; ctx.lineWidth = 2.5;
    U.rr(ctx, x - 25, base - 92, 50, 92, 22);
    ctx.stroke();
    ctx.fillStyle = '#f4c84d';
    ctx.beginPath(); ctx.arc(x + 14, base - 46, 3, 0, TAU); ctx.fill();
    // cửa sổ
    [[-78, -150], [46, -150]].forEach(([wx, wy]) => {
      U.fillRR(ctx, x + wx, base + wy, 34, 38, 4, '#f6e6bf');
      U.fillRR(ctx, x + wx + 4, base + wy + 4, 26, 30, 2, '#407463');
      ctx.strokeStyle = '#f8ebc9'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + wx + 17, base + wy + 4); ctx.lineTo(x + wx + 17, base + wy + 34);
      ctx.moveTo(x + wx + 4, base + wy + 19); ctx.lineTo(x + wx + 30, base + wy + 19);
      ctx.stroke();
      U.fillRR(ctx, x + wx - 3, base + wy + 38, 40, 8, 2, '#8a5a2c');
      for (let i = 0; i < 3; i++) U.drawFlower(ctx, x + wx + 3 + i * 12, base + wy + 38, 1.1, th.flower);
    });
    // mái
    ctx.beginPath();
    ctx.moveTo(x - 150, base - 188);
    ctx.quadraticCurveTo(x - 95, base - 280, x + 8, base - 300);
    ctx.quadraticCurveTo(x + 112, base - 280, x + 160, base - 188);
    ctx.lineTo(x + 138, base - 178);
    ctx.lineTo(x - 128, base - 178);
    ctx.closePath();
    const roof = ctx.createLinearGradient(0, base - 300, 0, base - 170);
    roof.addColorStop(0, th.roof);
    roof.addColorStop(1, th.roof2);
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.strokeStyle = '#6e3d24';
    ctx.lineWidth = 3;
    ctx.stroke();
    // ngói
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 148, base - 188);
    ctx.quadraticCurveTo(x - 95, base - 280, x + 8, base - 300);
    ctx.quadraticCurveTo(x + 112, base - 280, x + 158, base - 188);
    ctx.lineTo(x + 138, base - 178);
    ctx.lineTo(x - 128, base - 178);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#6d2f20';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 150 + i * 42, base - 180);
      ctx.lineTo(x - 90 + i * 42, base - 300);
      ctx.stroke();
    }
    ctx.restore();
    // ống khói
    U.fillRR(ctx, x - 116, base - 174, 232, 9, 2, 'rgba(70,48,30,.18)');
    U.fillRR(ctx, x - 128, base - 180, 266, 5, 2, '#e5c59b');
    U.fillRR(ctx, x + 90, base - 300, 26, 60, 3, '#b08058');
    ctx.strokeStyle = '#7a4a2c'; ctx.lineWidth = 2;
    U.rr(ctx, x + 90, base - 300, 26, 60, 3);
    ctx.stroke();
    // khói
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 3; i++) {
      const sy = base - 310 - i * 24;
      U.ellipse(ctx, x + 103 + Math.sin(performance.now() / 1200 + i) * 10, sy, 10 + i * 5, 7 + i * 3, '#fff8e4');
    }
    ctx.globalAlpha = 1;
    // bụi cây
    U.drawFlower(ctx, x - 140, base - 2, 2, th.flower);
    U.drawFlower(ctx, x + 138, base - 4, 1.8, '#fff3d4');
    ctx.restore();
  }

  function drawGift(ctx, t, data) {
    const g = LAYOUT.gift;
    const available = data.giftAvailable;
    ctx.save();
    ctx.translate(g.x, g.y);
    U.ellipse(ctx, 0, 10, 26, 8, 'rgba(60,80,25,.22)');
    if (available) {
      const a = 0.25 + Math.sin(t * 3) * 0.1;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd35c';
      ctx.beginPath(); ctx.ellipse(0, -10, 40, 28, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    U.fillRR(ctx, -23, -16, 46, 30, 5, '#a96b34');
    ctx.strokeStyle = '#5d3a1a'; ctx.lineWidth = 2.3;
    U.rr(ctx, -23, -16, 46, 30, 5);
    ctx.stroke();
    ctx.fillStyle = '#d9a14c';
    ctx.fillRect(-23, -16, 46, 7);
    ctx.fillStyle = '#f0c96d';
    ctx.fillRect(-3, -16, 6, 30);
    U.fillRR(ctx, -6, -8, 12, 12, 2, '#ffd35c');
    ctx.strokeStyle = '#9c6a11'; ctx.lineWidth = 1.4;
    U.rr(ctx, -6, -8, 12, 12, 2);
    ctx.stroke();
    if (available) {
      const by = -40 + Math.sin(t * 2.4) * 3;
      ctx.beginPath(); ctx.arc(24, by, 10, 0, TAU);
      ctx.fillStyle = 'rgba(255,252,231,.96)'; ctx.fill();
      ctx.strokeStyle = '#e6b247'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e94b3c'; ctx.font = '900 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', 24, by + 1);
    }
    ctx.restore();
  }

  function drawHost(ctx, t, data) {
    const f = data.friend;
    const x = LAYOUT.host.x, y = LAYOUT.host.y;
    const th = THEMES[f.theme] || THEMES.peach;
    ctx.save();
    ctx.translate(x, y);
    U.ellipse(ctx, 0, 4, 30, 9, 'rgba(45,70,20,.24)');
    const wave = Math.sin(t * 2.2) * 0.12;
    // chân
    ctx.fillStyle = '#6b4b2e';
    U.fillRR(ctx, -13, -15, 10, 20, 4, '#6b4b2e');
    U.fillRR(ctx, 4, -15, 10, 20, 4, '#6b4b2e');
    // váy / áo
    ctx.beginPath();
    ctx.moveTo(-24, -18);
    ctx.quadraticCurveTo(-30, -70, -16, -93);
    ctx.quadraticCurveTo(0, -103, 16, -93);
    ctx.quadraticCurveTo(30, -70, 24, -18);
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,20,.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // tạp dề
    U.fillRR(ctx, -12, -75, 24, 48, 5, 'rgba(255,250,230,.8)');
    // tay
    ctx.strokeStyle = '#ffd9ac';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, -78);
    ctx.quadraticCurveTo(-38, -60, -32, -42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(23, -78);
    ctx.quadraticCurveTo(38, -68 + wave * 30, 33, -92 + wave * 40);
    ctx.stroke();
    // đầu
    ctx.beginPath();
    ctx.arc(0, -116, 22, 0, TAU);
    ctx.fillStyle = '#ffd9ac';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,75,35,.4)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // tóc
    ctx.beginPath();
    ctx.arc(0, -122, 23, Math.PI * 1.05, Math.PI * 2.03);
    ctx.fillStyle = f.id === 'batu' ? '#d9d1c2' : '#5d3c24';
    ctx.fill();
    // mũ rơm
    ctx.beginPath();
    ctx.ellipse(0, -134, 30, 7, 0, 0, TAU);
    ctx.fillStyle = '#e8b75f'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -143, 18, 12, 0, Math.PI, 0);
    ctx.fillStyle = '#f2ca79'; ctx.fill();
    ctx.strokeStyle = '#b77f30'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -134, 30, 7, 0, 0, TAU); ctx.stroke();
    // mắt + miệng
    ctx.fillStyle = '#3f2a16';
    ctx.beginPath(); ctx.arc(-7, -115, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -115, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a4b2e'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(0, -110, 6, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,140,.45)';
    U.ellipse(ctx, -14, -110, 4, 2.5, 'rgba(255,150,140,.45)');
    U.ellipse(ctx, 14, -110, 4, 2.5, 'rgba(255,150,140,.45)');
    ctx.restore();
  }

  function drawSign(ctx, friend) {
    const s = LAYOUT.sign;
    U.drawSign(ctx, s.x, s.y, 132, 36, 'VƯỜN NHÀ ' + friend.name.toUpperCase(), -0.04, '#d9a35c');
  }

  function drawAmbient(ctx, t, rnd) {
    for (let i = 0; i < 16; i++) {
      const x = 120 + ((i * 173 + t * (5 + i % 4)) % 1040);
      const y = 300 + ((i * 83 + Math.sin(t * 0.5 + i) * 24) % 300);
      ctx.globalAlpha = 0.12 + (Math.sin(t * 1.5 + i) + 1) * 0.08;
      ctx.fillStyle = i % 3 ? '#fff8cf' : '#d8ffb0';
      ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 2), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // bướm
    for (let i = 0; i < 2; i++) {
      const x = 480 + Math.cos(t * 0.3 + i * 2) * 180;
      const y = 420 + Math.sin(t * 0.45 + i * 2) * 60;
      const flap = Math.abs(Math.sin(t * 8 + i));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i ? '#ffd34f' : '#f2a6b8';
      ctx.beginPath(); ctx.ellipse(-3, -2, 3, 6 * (0.4 + flap), -0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, -2, 3, 6 * (0.4 + flap), 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawSpeech(ctx, text, x, y) {
    ctx.save();
    ctx.font = '800 13px "Segoe UI", "Trebuchet MS", sans-serif';
    const maxW = 250;
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW) {
        if (line) lines.push(line);
        line = w;
      } else line = test;
    });
    if (line) lines.push(line);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 26;
    const h = lines.length * 18 + 18;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h, w, h, 12);
    else U.rr(ctx, x - w / 2, y - h, w, h, 12);
    ctx.fillStyle = 'rgba(255,252,236,.97)';
    ctx.fill();
    ctx.strokeStyle = '#d4ad69';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x + 1, y + 10);
    ctx.lineTo(x + 8, y - 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,252,236,.97)';
    ctx.fill();
    ctx.strokeStyle = '#d4ad69';
    ctx.stroke();
    ctx.fillStyle = '#5b431f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x, y - h + 16 + i * 18));
    ctx.restore();
  }

  function hit(x, y) {
    // luống cây
    const order = plotPositions.map((p, i) => ({ p, i })).sort((a, b) => b.p.y - a.p.y);
    for (const { p, i } of order) {
      const dx = Math.abs(x - p.x) / 92;
      const dy = Math.abs(y - p.y) / 52;
      if (dx + dy <= 1) return { kind: 'plot', index: i, x: p.x, y: p.y };
    }
    const g = LAYOUT.gift;
    if (x > g.x - 38 && x < g.x + 38 && y > g.y - 55 && y < g.y + 18) return { kind: 'gift', x: g.x, y: g.y };
    const hx = LAYOUT.host.x, hy = LAYOUT.host.y;
    if (x > hx - 42 && x < hx + 42 && y > hy - 155 && y < hy + 12) return { kind: 'host', x: hx, y: hy - 90 };
    return null;
  }

  window.FRIEND = { draw, hit, layout: LAYOUT, plotPositions, themes: THEMES };
})();
