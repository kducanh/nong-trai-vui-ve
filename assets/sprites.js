/* =========================================================
   SPRITES — cây trồng, con vật, hiệu ứng hồ cá, cây táo, icon
   Vẽ động trên nền cảnh tĩnh của art.js
   ========================================================= */
(function () {
  'use strict';
  const ART = window.ART;
  const U = ART.util;
  const TAU = Math.PI * 2;
  const L = ART.layout;
  const clamp = U.clamp;
  const lerp = U.lerp;

  const CROP_HEIGHT = {
    carrot: 58, tomato: 86, corn: 146, strawberry: 42,
    sunflower: 156, pumpkin: 54
  };
  ART.cropHeight = id => CROP_HEIGHT[id] || 70;

  /* =========================================================
     Ô đất
     ========================================================= */
  ART.drawPlotGround = function (ctx, plot, i, cx, cy, hovered, t) {
    const tw = L.field.tw - 10, th = L.field.th - 8;
    ctx.save();

    // cạnh đất dày
    U.diamondPath(ctx, cx, cy + 4, tw, th);
    ctx.fillStyle = 'rgba(57,88,32,.35)';
    ctx.fill();

    if (!plot.tilled) {
      // ô cỏ non
      U.diamondPath(ctx, cx, cy, tw, th);
      const g = ctx.createLinearGradient(cx, cy - th / 2, cx, cy + th / 2);
      g.addColorStop(0, '#a4e16b');
      g.addColorStop(0.55, '#8bd555');
      g.addColorStop(1, '#74c145');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,129,43,.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.save();
      U.diamondPath(ctx, cx, cy, tw - 4, th - 4);
      ctx.clip();
      // luống cỏ
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#d3f79b';
      ctx.lineWidth = 8;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - tw / 2, cy + k * 13 + 1);
        ctx.lineTo(cx + tw / 2, cy + k * 13 - 11);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const seed = i * 7.7 + 2;
      for (let k = 0; k < 4; k++) {
        const px = cx + Math.cos(seed + k * 1.9) * 35;
        const py = cy + Math.sin(seed * 1.3 + k * 2.2) * 14;
        ctx.globalAlpha = 0.7;
        U.drawGrassTuft(ctx, px, py, 1.7, k % 2 ? '#5da536' : '#6fba42');
      }
      ctx.globalAlpha = 1;
      if (i === 3 || i === 8) {
        ctx.globalAlpha = 0.85;
        U.drawFlower(ctx, cx + 26, cy + 3, 1.3, '#fff8e8');
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } else {
      // đất đã cuốc
      U.diamondPath(ctx, cx, cy, tw, th);
      const wet = plot.watered;
      const g = ctx.createLinearGradient(cx, cy - th / 2, cx, cy + th / 2);
      if (wet) {
        g.addColorStop(0, '#5a3a22');
        g.addColorStop(0.5, '#6b4628');
        g.addColorStop(1, '#7f5733');
      } else {
        g.addColorStop(0, '#8b5b33');
        g.addColorStop(0.48, '#a06a3b');
        g.addColorStop(1, '#b37a45');
      }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(74,45,22,.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.save();
      U.diamondPath(ctx, cx, cy, tw - 5, th - 5);
      ctx.clip();
      // luống cày
      ctx.strokeStyle = wet ? 'rgba(40,24,12,.35)' : 'rgba(94,57,27,.32)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - 90, cy + k * 10 - 4);
        ctx.quadraticCurveTo(cx, cy + k * 10 + 3, cx + 90, cy + k * 10 - 13);
        ctx.stroke();
      }
      // cục đất
      const rnd = U.makeRand(300 + i * 17);
      for (let k = 0; k < 7; k++) {
        const px = cx - 58 + rnd() * 116;
        const py = cy - 26 + rnd() * 52;
        ctx.globalAlpha = 0.45 + rnd() * 0.3;
        ctx.fillStyle = k % 2 ? '#6f4626' : '#c08a55';
        ctx.beginPath();
        ctx.ellipse(px, py, 2 + rnd() * 4.4, 1.4 + rnd() * 2.4, rnd(), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // ánh nước
      if (wet) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#d9f3ff';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(cx - 24 + k * 26, cy - 5 + k * 7, 10, 2.4, 0.2, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // phân bón
      if (plot.fertilized) {
        ctx.globalAlpha = 0.75;
        for (let k = 0; k < 6; k++) {
          const px = cx - 45 + (k * 29) % 90;
          const py = cy - 10 + (k * 13) % 30;
          ctx.fillStyle = '#ffdf76';
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // viền nổi để từng ô luống rõ ràng
    ctx.save();
    U.diamondPath(ctx, cx, cy, tw, th);
    ctx.strokeStyle = plot.tilled ? 'rgba(69,41,20,.62)' : 'rgba(52,100,28,.5)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    U.diamondPath(ctx, cx, cy - 1, tw - 6, th - 5);
    ctx.strokeStyle = plot.tilled ? 'rgba(232,183,124,.34)' : 'rgba(226,255,178,.5)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    if (hovered) {
      ctx.save();
      ctx.shadowColor = hovered === 'ready' ? 'rgba(255,211,74,.9)' : 'rgba(255,255,220,.9)';
      ctx.shadowBlur = 12;
      U.diamondPath(ctx, cx, cy, tw + 4, th + 4);
      ctx.strokeStyle = hovered === 'ready' ? '#ffd34a' : '#fffbe0';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  ART.drawReadyGlow = function (ctx, cx, cy, t) {
    const a = 0.32 + Math.sin(t * 3.2) * 0.12;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 52);
    g.addColorStop(0, `rgba(255,225,105,${a})`);
    g.addColorStop(0.6, `rgba(255,211,68,${a * 0.4})`);
    g.addColorStop(1, 'rgba(255,211,68,0)');
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy / 0.5, 52, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  };

  /* =========================================================
     Cây trồng
     ========================================================= */
  function baseShadow(ctx, cx, cy, w) {
    U.ellipse(ctx, cx, cy + 7, w || 27, (w || 27) * 0.32, 'rgba(45,30,10,.28)');
  }

  ART.drawPlant = function (ctx, plot, cx, cy, t, idx) {
    if (!plot.crop) return;
    const p = clamp(plot.progress || 0, 0, 1.25);
    const g = Math.pow(clamp(p, 0, 1), 0.82);
    const ready = p >= 1;
    const seed = idx * 1.77 + 0.4;
    const wet = plot.watered;
    const fert = plot.fertilized;

    baseShadow(ctx, cx, cy + 8, 20 + 20 * g);
    ctx.save();
    ctx.translate(cx, cy + 8);
    const sway = Math.sin(t * 1.45 + seed) * 0.032;
    ctx.rotate(sway);

    const painter = {
      carrot: drawCarrotNew,
      tomato: drawTomatoNew,
      corn: drawCorn,
      strawberry: drawStrawberry,
      sunflower: drawSunflower,
      pumpkin: drawPumpkin
    }[plot.crop];
    if (p < 0.24) drawSeedling(ctx, g, ready, t, seed);
    else if (painter) painter(ctx, g, ready, t, seed);

    if (wet) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#cdf3ff';
      ctx.beginPath(); ctx.arc(-9, -2, 1.8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -4, 1.3, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (fert) {
      ctx.globalAlpha = 0.55 + Math.sin(t * 4 + seed) * 0.25;
      ctx.fillStyle = '#ffe57d';
      for (let i = 0; i < 3; i++) {
        const a = t * 1.2 + seed + i * 2.1;
        const px = Math.cos(a) * (18 + i * 5);
        const py = -12 - Math.sin(a * 1.7) * 8;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  function drawSeedling(ctx, g, ready, t, seed) {
    const h = 8 + 9 * g;
    ctx.strokeStyle = '#4e9330';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-1, -h * 0.6, 0, -h);
    ctx.stroke();
    const cols = ['#6fbe45', '#54a338'];
    for (let i = 0; i < 2; i++) {
      U.leafShape(ctx, 0, -h * 0.85, 11 + g * 5, 5.5, i ? Math.PI - 0.35 : -0.35, cols[i], '#3f7f27');
    }
    ctx.fillStyle = 'rgba(90,60,30,.35)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 8, 3.2, 0, 0, TAU);
    ctx.fill();
  }

  function drawCarrotNew(ctx, g, ready, t, seed) {
    const len = (24 + 37 * g);
    // củ nhô lên khi chín
    if (ready) {
      const root = ctx.createLinearGradient(-12, -12, 12, 8);
      root.addColorStop(0, '#ffab45');
      root.addColorStop(1, '#e7781a');
      ctx.beginPath();
      ctx.moveTo(-13, 3);
      ctx.quadraticCurveTo(-14, -8, -7, -12);
      ctx.quadraticCurveTo(0, -15, 8, -11);
      ctx.quadraticCurveTo(15, -5, 12, 3);
      ctx.quadraticCurveTo(0, 11, -13, 3);
      ctx.closePath();
      ctx.fillStyle = root;
      ctx.fill();
      ctx.strokeStyle = '#b4540e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,65,0,.45)';
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 2, -4);
        ctx.lineTo(i * 5 + 1, 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,190,120,.55)';
      ctx.beginPath();
      ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-2, -10, 3, -8);
      ctx.stroke();
    }
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.34;
      const l = len * (i === 2 ? 1.06 : 0.88 + (i % 2) * 0.1);
      ctx.save();
      ctx.rotate(a + Math.sin(t * 1.3 + seed + i) * 0.028);
      drawFernFrond(ctx, l, i % 2, g);
      ctx.restore();
    }
    // lá non sát gốc
    if (g < 0.55) {
      for (let i = 0; i < 2; i++) {
        U.leafShape(ctx, 0, -2, 12, 5, i ? -0.4 : Math.PI + 0.4, '#65b542', '#3f7f27');
      }
    }
  }

  function drawFernFrond(ctx, len, dark, g) {
    ctx.strokeStyle = dark ? '#3d7d27' : '#4b8d2e';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-2, -len * 0.55, 2, -len);
    ctx.stroke();
    const rows = 5;
    for (let k = 0; k < rows; k++) {
      const tt = 0.22 + k * 0.17;
      const yy = -len * tt;
      const sz = (5.5 + 7 * (1 - tt)) * (0.6 + g * 0.5);
      U.leafShape(ctx, 0, yy, sz, sz * 0.48, -0.5, dark ? '#4d9a30' : '#5cae39', '#3b7924');
      U.leafShape(ctx, 0, yy - 1, sz * 0.9, sz * 0.42, -Math.PI + 0.5, dark ? '#458d2b' : '#53a334', '#3b7924');
    }
    U.leafShape(ctx, 1, -len, 10, 4.6, -1.45, dark ? '#5aab3a' : '#6cbe45');
  }

  function drawTomatoNew(ctx, g, ready, t, seed) {
    const H = 34 + 56 * g;
    // cọc tre
    ctx.strokeStyle = '#b88a4d';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(18, 3);
    ctx.lineTo(21, -H - 16);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(19, 2); ctx.lineTo(22, -H - 15);
    ctx.stroke();

    // thân chính
    ctx.strokeStyle = '#477f2a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(-6, -H * 0.5, 2, -H);
    ctx.stroke();
    ctx.strokeStyle = '#5da53a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-1, -3);
    ctx.quadraticCurveTo(-5, -H * 0.5, 2, -H + 2);
    ctx.stroke();

    // các tầng cành
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const yy = -H * (0.3 + i * 0.2);
      const side = i % 2 ? 1 : -1;
      const bx = side * (15 + 10 * g);
      const by = yy - 7;
      ctx.strokeStyle = i % 2 ? '#4d8d2f' : '#588f33';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(side * bx * 0.5, yy - 4, bx, by);
      ctx.stroke();
      // chùm lá ở đầu cành
      for (let k = 0; k < 4; k++) {
        const a = -2.8 + k * 0.55;
        const col = k % 2 ? '#54a336' : '#68b843';
        U.leafShape(ctx, bx, by, 15 + 6 * g, 6.5, a, col, '#3d7b27');
      }
      U.leafShape(ctx, side * 6, yy + 3, 12, 5, side > 0 ? -0.6 : Math.PI + 0.6, '#5aab39');
    }

    // ngọn
    for (let k = 0; k < 3; k++) {
      U.leafShape(ctx, 0, -H, 12, 5, -2.4 + k * 0.8, k % 2 ? '#61b13d' : '#4e9b32');
    }

    // quả
    const show = clamp((g - 0.34) / 0.35, 0, 1);
    if (show > 0.05) {
      const fruits = [
        [-22, -H * 0.4, 7.2], [22, -H * 0.52, 8], [-13, -H * 0.66, 6.3], [16, -H * 0.3, 6]
      ];
      fruits.forEach(([fx, fy, fr], i) => {
        const rr = fr * show * (ready ? 1.2 : 0.9);
        const green = !ready && (i < 3 || g < 0.78);
        const col = green ? '#93c94f' : '#e94c38';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(fx, fy, rr, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = green ? '#5d8b2b' : '#a72c1e';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.62)';
        ctx.beginPath();
        ctx.arc(fx - rr * 0.34, fy - rr * 0.35, rr * 0.26, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#4d8d2b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(fx - rr * 0.75, fy - rr * 0.7);
        ctx.lineTo(fx, fy - rr * 0.92);
        ctx.lineTo(fx + rr * 0.75, fy - rr * 0.68);
        ctx.stroke();
      });
    }
  }

  function drawCarrot(ctx, g, ready, t, seed) {
    const h = 20 + 44 * g;
    // củ cà rốt nhô lên khi chín
    if (ready) {
      const rg = ctx.createLinearGradient(-10, -14, 10, 8);
      rg.addColorStop(0, '#ffb04d');
      rg.addColorStop(1, '#e9761d');
      ctx.beginPath();
      ctx.moveTo(-11, 3);
      ctx.quadraticCurveTo(-13, -8, -6, -12);
      ctx.quadraticCurveTo(0, -15, 7, -11);
      ctx.quadraticCurveTo(14, -6, 11, 3);
      ctx.quadraticCurveTo(0, 10, -11, 3);
      ctx.closePath();
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = '#b9530e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,65,0,.5)';
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 2, -4);
        ctx.lineTo(i * 5 + 1, 2);
        ctx.stroke();
      }
    }
    const n = Math.max(2, Math.round(2 + g * 4));
    const len = 14 + h;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3;
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = i % 2 ? '#4f9d31' : '#63b43e';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.28, -len * 0.55, len * 0.18, -len);
      ctx.stroke();
      for (let k = 1; k <= 3; k++) {
        const tt = k / 3.4;
        const px = len * 0.18 * tt + Math.sin(tt * 2) * 3;
        const py = -len * tt;
        U.leafShape(ctx, px, py, 7 + g * 4, 2.4, a + 0.9, k % 2 ? '#5aac39' : '#71c04b');
        U.leafShape(ctx, px, py, 7 + g * 4, 2.4, a - 0.9, k % 2 ? '#4e9d30' : '#66b642');
      }
      ctx.restore();
    }
    if (!ready && g > 0.35) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f0c56e';
      ctx.beginPath(); ctx.arc(21, -6, 2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawTomato(ctx, g, ready, t, seed) {
    const h = 26 + 62 * g;
    // cọc tre
    if (g > 0.45) {
      ctx.strokeStyle = '#b98a4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(20, -h - 14);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,236,190,.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(17, 1); ctx.lineTo(21, -h - 14); ctx.stroke();
    }
    ctx.strokeStyle = '#4f8f2f';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-7, -h * 0.5, 2, -h);
    ctx.stroke();

    const leafPairs = 3 + Math.round(g * 2);
    for (let i = 0; i < leafPairs; i++) {
      const yy = -h * (0.25 + i * 0.16);
      const side = i % 2 ? 1 : -1;
      U.leafShape(ctx, 0, yy, (13 + g * 16) * (i === leafPairs - 1 ? 0.8 : 1), 6, side > 0 ? -0.35 : Math.PI + 0.35, i % 2 ? '#4d9c31' : '#5eae3a');
      U.leafShape(ctx, 0, yy + 2, (10 + g * 12) * 0.8, 4.5, side > 0 ? -0.85 : Math.PI + 0.85, '#6cbb45');
    }
    // chùm quả
    const fruits = [
      [-18, -h * 0.38, 7.5], [14, -h * 0.52, 8.5], [-8, -h * 0.7, 7], [20, -h * 0.72, 6]
    ];
    const show = clamp((g - 0.42) / 0.3, 0, 1);
    if (show > 0) {
      fruits.forEach(([fx, fy, fr], i) => {
        const rr = fr * show * (ready ? 1 : 0.8);
        const green = !ready && (i < 3 || g < 0.8);
        const col = green ? '#8fc34b' : '#ea4c38';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(fx, fy, rr, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = green ? '#5d8b2b' : '#a72c1e';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(fx - rr * 0.32, fy - rr * 0.35, rr * 0.25, 0, TAU); ctx.fill();
        // đài
        ctx.strokeStyle = '#4d8d2b';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(fx - rr * 0.7, fy - rr * 0.75);
        ctx.lineTo(fx, fy - rr * 0.95);
        ctx.lineTo(fx + rr * 0.7, fy - rr * 0.7);
        ctx.stroke();
      });
    }
  }

  function drawCorn(ctx, g, ready, t, seed) {
    const h = 48 + 100 * g;
    ctx.strokeStyle = '#4d922e';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-4, -h * 0.5, 0, -h);
    ctx.stroke();
    // lá dài
    const n = 5 + Math.round(g * 2);
    for (let i = 0; i < n; i++) {
      const tt = 0.16 + i * (0.72 / n);
      const yy = -h * tt;
      const side = i % 2 ? 1 : -1;
      const len = (24 + 34 * g) * (0.7 + (i % 3) * 0.16);
      ctx.save();
      ctx.translate(0, yy);
      ctx.rotate(side > 0 ? -0.28 : Math.PI + 0.28);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.3, -12, len * 0.72, -18, len, 7);
      ctx.bezierCurveTo(len * 0.6, 2, len * 0.25, 8, 0, 0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#5fae3a' : '#4e9c31';
      ctx.fill();
      ctx.strokeStyle = '#3c7a22';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,240,150,.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.quadraticCurveTo(len * 0.5, -6, len * 0.92, 5);
      ctx.stroke();
      ctx.restore();
    }
    // bắp
    if (g > 0.63) {
      const show = clamp((g - 0.63) / 0.25, 0, 1);
      [[18, -h * 0.45, 0.55], [-17, -h * 0.58, -0.5]].forEach(([bx, by, rot], i) => {
        ctx.save();
        ctx.translate(bx * 0.7, by);
        ctx.rotate(rot);
        // lá bao
        ctx.fillStyle = '#599b32';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 * show, 22 * show, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#f2c84c';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 * show, 18 * show, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,125,20,.5)';
        ctx.lineWidth = 0.9;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.ellipse(0, k * 4 * show, 6.5 * show, 1.4 * show, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.strokeStyle = '#4b8228';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 18 * show);
        ctx.quadraticCurveTo(-12 * show, 8 * show, -8 * show, -6 * show);
        ctx.stroke();
        ctx.restore();
      });
    }
    // cờ bắp
    if (g > 0.72) {
      ctx.strokeStyle = '#c9b45c';
      ctx.lineWidth = 1.6;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(i * 5, -h - 10, i * 7, -h - 16);
        ctx.stroke();
      }
    }
  }

  function drawStrawberry(ctx, g, ready, t, seed) {
    const s = 0.55 + g * 0.7;
    const leaves = [
      [-16, -9, -2.6], [15, -10, -0.5], [-7, -17, -1.8], [7, -18, -1.3], [0, -12, -1.6]
    ];
    leaves.forEach(([lx, ly, la], i) => {
      ctx.save();
      ctx.translate(lx * s, ly * s);
      ctx.rotate(la);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(6, -14, 22, -14, 25, -3);
      ctx.bezierCurveTo(25, 7, 12, 10, 0, 0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#4c9c31' : '#60b33c';
      ctx.fill();
      ctx.strokeStyle = '#3c7a22';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(210,245,170,.4)';
      ctx.beginPath();
      ctx.moveTo(2, -2); ctx.lineTo(20, -5);
      ctx.stroke();
      ctx.restore();
    });
    // hoa trắng
    if (g > 0.38 && !ready) {
      ctx.globalAlpha = clamp((g - 0.38) * 4, 0, 1);
      for (let i = 0; i < 3; i++) {
        const fx = -17 + i * 17, fy = -20 - (i % 2) * 6;
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU;
          U.ellipse(ctx, fx + Math.cos(a) * 3.6, fy + Math.sin(a) * 2.6, 2.6, 1.8, '#fff9ec', a);
        }
        U.ellipse(ctx, fx, fy, 1.8, 1.6, '#ffd34f');
      }
      ctx.globalAlpha = 1;
    }
    // quả
    if (ready || g > 0.72) {
      const berries = [[-20, -10, 0.9], [0, -14, 1.1], [18, -9, 0.85], [9, -4, 0.7]];
      berries.forEach(([bx, by, bs], i) => {
        const s2 = bs * clamp((g - 0.65) / 0.3, 0, 1) * 1.25;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(s2, s2);
        const gr = ctx.createLinearGradient(-8, -8, 8, 10);
        gr.addColorStop(0, '#ff7b72');
        gr.addColorStop(1, '#d93232');
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.bezierCurveTo(-12, 2, -11, -8, 0, -8);
        ctx.bezierCurveTo(11, -8, 12, 2, 0, 10);
        ctx.closePath();
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.strokeStyle = '#a92424';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(-4 + (k % 2) * 8, -2 + Math.floor(k / 2) * 6, 0.9, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#5b9c35';
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.ellipse(k * 3, -8, 2.4, 1.2, k * 0.4, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      });
    }
  }

  function drawSunflower(ctx, g, ready, t, seed) {
    const h = 56 + 96 * g;
    ctx.strokeStyle = '#4b8c2d';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-6, -h * 0.5, 0, -h);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const yy = -h * (0.22 + i * 0.18);
      const side = i % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(0, yy);
      ctx.rotate(side > 0 ? -0.45 : Math.PI + 0.45);
      ctx.beginPath();
      ctx.ellipse(18, 0, 18, 8, 0.15, 0, TAU);
      ctx.fillStyle = i % 2 ? '#4f9c31' : '#60b03a';
      ctx.fill();
      ctx.strokeStyle = '#3c7922';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
    // đầu hoa
    const show = clamp((g - 0.42) / 0.35, 0, 1);
    if (show > 0) {
      const cx = 0, cy = -h - 4;
      const rad = (8 + 15 * show) * (ready ? 1.05 : 0.9);
      if (g < 0.78 && !ready) {
        ctx.fillStyle = '#6aa93a';
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          U.ellipse(ctx, cx + Math.cos(a) * rad * 0.6, cy + Math.sin(a) * rad * 0.6, rad * 0.38, rad * 0.26, '#78bc45', a);
        }
        U.ellipse(ctx, cx, cy, rad * 0.7, rad * 0.6, '#568f2e');
      } else {
        // cánh hoa
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU + Math.sin(t * 0.4) * 0.02;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a);
          const grd = ctx.createLinearGradient(0, -rad * 1.5, 0, -rad * 0.5);
          grd.addColorStop(0, '#ffe45f');
          grd.addColorStop(1, '#f5ae16');
          ctx.beginPath();
          ctx.ellipse(0, -rad * 1.05, rad * 0.28, rad * 0.62, 0, 0, TAU);
          ctx.fillStyle = grd;
          ctx.fill();
          ctx.strokeStyle = '#ce830b';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
        const cg = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, rad * 0.72);
        cg.addColorStop(0, '#8a5a24');
        cg.addColorStop(1, '#4e3012');
        U.ellipse(ctx, cx, cy, rad * 0.68, rad * 0.62, cg);
        ctx.fillStyle = 'rgba(255,214,120,.6)';
        for (let i = 0; i < 12; i++) {
          const a = i * 2.4;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * rad * 0.36, cy + Math.sin(a) * rad * 0.3, 1.1, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function drawPumpkin(ctx, g, ready, t, seed) {
    // dây leo
    ctx.strokeStyle = '#4e9130';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-24 - i * 6, -6, -36 + i * 10, 4, -46 + i * 6, -2);
      ctx.stroke();
      U.leafShape(ctx, -46 + i * 6, -2, 14 * (0.6 + g * 0.4), 7, -0.2 + i * 0.6, i % 2 ? '#5aa737' : '#4b9730');
    }
    // lá to
    for (let i = 0; i < 4; i++) {
      const a = -1.8 + i * 0.85;
      ctx.save();
      ctx.translate(Math.cos(a) * 18, -4 + Math.sin(a) * 6);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(10, -16, 26, -14, 27, 0);
      ctx.bezierCurveTo(25, 11, 9, 13, 0, 0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#519d33' : '#62b13d';
      ctx.fill();
      ctx.strokeStyle = '#3f7a24';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    // hoa vàng
    if (g > 0.3 && g < 0.55) {
      const fx = 27, fy = -18;
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU;
        U.ellipse(ctx, fx + Math.cos(a) * 5, fy + Math.sin(a) * 4, 4, 2.6, '#ffd94e', a);
      }
      U.ellipse(ctx, fx, fy, 2.4, 2.2, '#e9a51b');
    }
    // quả bí
    if (g > 0.55) {
      const bs = clamp((g - 0.55) / 0.3, 0, 1);
      const rx = 15 + 9 * bs, ry = 11 + 7 * bs;
      ctx.save();
      ctx.translate(10, -ry * 0.15);
      const pg = ctx.createLinearGradient(0, -ry, 0, ry);
      if (ready) {
        pg.addColorStop(0, '#ffb24c');
        pg.addColorStop(0.65, '#f18a25');
        pg.addColorStop(1, '#cf6514');
      } else {
        pg.addColorStop(0, '#a6c85b');
        pg.addColorStop(1, '#6c9934');
      }
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ready ? '#b35b0e' : '#547a26';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = ready ? 'rgba(170,75,0,.35)' : 'rgba(60,100,20,.3)';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * (0.42 + Math.abs(i) * 0.18), ry, 0, 0, TAU);
        ctx.stroke();
      }
      // cuống
      ctx.fillStyle = '#6d8c2c';
      U.fillRR(ctx, -2, -ry - 5, 4, 9, 2, '#6d8c2c');
      ctx.restore();
    }
  }

  /* =========================================================
     Huy hiệu "chín rồi"
     ========================================================= */
  ART.drawReadyBadge = function (ctx, cropId, cx, cy, t) {
    const h = ART.cropHeight(cropId);
    const bx = cx, by = cy - h - 22 + Math.sin(t * 2.4 + cx * 0.02) * 3;
    ctx.save();
    // tia
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i / 6 * TAU;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * 18, by + Math.sin(a) * 18);
      ctx.lineTo(bx + Math.cos(a) * 24, by + Math.sin(a) * 24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bong bóng
    ctx.beginPath();
    ctx.arc(bx, by, 15, 0, TAU);
    ctx.fillStyle = 'rgba(255,252,231,.96)';
    ctx.fill();
    ctx.strokeStyle = '#e6b247';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + 13);
    ctx.lineTo(bx, by + 20);
    ctx.lineTo(bx + 5, by + 13);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,252,231,.96)';
    ctx.fill();
    // icon
    ctx.save();
    ctx.translate(bx - 11, by - 11);
    ctx.scale(22 / 64, 22 / 64);
    drawItemIconRaw(ctx, cropId, 64);
    ctx.restore();
    // lấp lánh
    ctx.fillStyle = '#ffe16a';
    const sx = bx + 17 + Math.sin(t * 3) * 2;
    const sy = by - 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 1.6, sy - 1.6); ctx.lineTo(sx + 5, sy);
    ctx.lineTo(sx + 1.6, sy + 1.6); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 1.6, sy + 1.6);
    ctx.lineTo(sx - 5, sy); ctx.lineTo(sx - 1.6, sy - 1.6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  /* =========================================================
     Con vật
     ========================================================= */
  ART.drawAnimal = function (ctx, a, t) {
    if (a.type === 'cow') drawCow(ctx, a, t);
    else drawChicken(ctx, a, t);
  };

  function drawCow(ctx, a, t) {
    const dir = a.dir || 1;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(dir * 0.84, 0.84);
    const moving = a.moving;
    const phase = a.phase || 0;
    const bob = moving ? Math.sin(t * 9 + phase) * 1.6 : Math.sin(t * 1.8 + phase) * 0.8;
    U.ellipse(ctx, 0, 3, 53, 14, 'rgba(45,60,25,.25)');

    // chân sau
    ctx.fillStyle = '#e9e4d6';
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 1.8;
    const step = moving ? Math.sin(t * 9 + phase) * 4 : 0;
    drawCowLeg(ctx, -30, -2 + step);
    drawCowLeg(ctx, 20, -2 - step);

    ctx.translate(0, bob);
    // đuôi
    ctx.strokeStyle = '#c9c2b0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-44, -47);
    ctx.quadraticCurveTo(-59, -34, -55, -18);
    ctx.stroke();
    ctx.fillStyle = '#3b3733';
    ctx.beginPath();
    ctx.ellipse(-55, -16, 3.5, 7, 0.2, 0, TAU);
    ctx.fill();

    // thân
    const bg = ctx.createLinearGradient(0, -72, 0, -20);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.55, '#f6f1e3');
    bg.addColorStop(1, '#ddd4c1');
    ctx.beginPath();
    ctx.ellipse(0, -46, 46, 29, 0, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // mảng đen
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -46, 45, 28, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#3f3a34';
    ctx.beginPath();
    ctx.ellipse(-20, -55, 18, 15, -0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, -36, 13, 11, 0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(36, -62, 10, 8, 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // bầu sữa
    U.ellipse(ctx, -4, -22, 15, 8, '#ffc5b5');
    U.ellipse(ctx, -10, -20, 2, 3, '#d98f80');
    U.ellipse(ctx, 4, -20, 2, 3, '#d98f80');

    // chân trước
    drawCowLeg(ctx, -6, -2 - step);
    drawCowLeg(ctx, 34, -2 + step);

    // cổ & đầu
    ctx.fillStyle = '#f7f2e5';
    ctx.beginPath();
    ctx.ellipse(38, -55, 19, 18, 0.25, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // mảng đen trên đầu
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(38, -55, 18, 17, 0.25, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#3f3a34';
    ctx.beginPath();
    ctx.ellipse(53, -62, 9, 8, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // tai
    U.ellipse(ctx, 24, -65, 9, 5.5, '#e5dcc9', -0.6);
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(24, -65, 9, 5.5, -0.6, 0, TAU);
    ctx.stroke();
    // sừng
    ctx.strokeStyle = '#f0e2b8';
    ctx.lineWidth = 4.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, -71);
    ctx.quadraticCurveTo(12, -84, 4, -80);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(39, -73);
    ctx.quadraticCurveTo(46, -86, 55, -81);
    ctx.stroke();
    // chỏm lông
    ctx.fillStyle = '#e8dcc5';
    ctx.beginPath();
    ctx.ellipse(34, -72, 5, 3, -0.2, 0, TAU);
    ctx.fill();

    // mõm
    const mg = ctx.createLinearGradient(46, -52, 64, -38);
    mg.addColorStop(0, '#ffc9ba');
    mg.addColorStop(1, '#eb9c90');
    ctx.beginPath();
    ctx.ellipse(54, -45, 11, 8, 0.15, 0, TAU);
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = '#a8665c';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    U.ellipse(ctx, 50.5, -46.5, 1.7, 1.2, '#a45c52');
    U.ellipse(ctx, 58, -44, 1.7, 1.2, '#a45c52');
    ctx.strokeStyle = 'rgba(150,75,65,.6)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(54, -42, 4.5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // mắt
    U.ellipse(ctx, 42, -57, 4.2, 4.6, '#fffdf8');
    ctx.fillStyle = '#2e261f';
    ctx.beginPath();
    ctx.arc(43.3, -56.4, 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(43.9, -57.2, 0.7, 0, TAU);
    ctx.fill();
    // lông mày
    ctx.strokeStyle = '#3f3a34';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(38, -63); ctx.lineTo(46, -62);
    ctx.stroke();

    // chuông
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(32, -38); ctx.lineTo(44, -36);
    ctx.stroke();
    ctx.fillStyle = '#ffd34f';
    ctx.beginPath();
    ctx.arc(38, -32, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b77d0b';
    ctx.stroke();

    ctx.restore();
  }

  function drawCowLeg(ctx, x, y) {
    U.fillRR(ctx, x - 5, y - 24, 11, 28, 4, '#f2ece0');
    U.rr(ctx, x - 5, y - 24, 11, 28, 4);
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    U.fillRR(ctx, x - 5, y, 11, 6, 3, '#4b3b2b');
  }

  function drawChicken(ctx, a, t) {
    const dir = a.dir || 1;
    const phase = a.phase || 0;
    const white = a.variant !== 1;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(dir * 0.9, 0.9);
    U.ellipse(ctx, 0, 2, 19, 6, 'rgba(45,60,25,.25)');
    const moving = a.moving;
    const bob = moving ? Math.sin(t * 11 + phase) * 1.2 : 0;
    const peck = !moving ? Math.max(0, Math.sin(t * 1.7 + phase)) : 0;
    ctx.translate(0, bob);

    // chân
    ctx.strokeStyle = '#c7862c';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -4); ctx.lineTo(-7, 1);
    ctx.moveTo(5, -4); ctx.lineTo(8, 1);
    ctx.stroke();

    // đuôi
    const tail = white ? '#e8e3d6' : '#b47a3e';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-13, -20);
      ctx.rotate(-0.6 - i * 0.28);
      ctx.beginPath();
      ctx.ellipse(0, -10, 4.5, 13, 0, 0, TAU);
      ctx.fillStyle = tail;
      ctx.fill();
      ctx.strokeStyle = '#6d4b2a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // thân
    const bg = ctx.createLinearGradient(0, -30, 0, -2);
    if (white) {
      bg.addColorStop(0, '#fffdf7');
      bg.addColorStop(1, '#e4dccb');
    } else {
      bg.addColorStop(0, '#dfa45b');
      bg.addColorStop(1, '#b97833');
    }
    ctx.beginPath();
    ctx.ellipse(0, -16, 17, 15, -0.1, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#5c4025';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // cánh
    ctx.beginPath();
    ctx.ellipse(-2, -15, 9, 7, 0.25, 0, TAU);
    ctx.fillStyle = white ? '#f0e9db' : '#cf8c45';
    ctx.fill();
    ctx.strokeStyle = '#8a6035';
    ctx.lineWidth = 1;
    ctx.stroke();

    // đầu
    ctx.save();
    ctx.translate(10, -30 + peck * 5);
    ctx.rotate(peck * 0.5);
    U.ellipse(ctx, 0, 0, 9, 9, white ? '#fffdf7' : '#d99650');
    ctx.strokeStyle = '#5c4025';
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 9, 0, 0, TAU); ctx.stroke();
    // mào
    ctx.fillStyle = '#e14b38';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-3 + i * 3.7, -9 - (i === 1 ? 2 : 0), 3, 0, TAU);
      ctx.fill();
    }
    // mỏ
    ctx.fillStyle = '#f2ae2e';
    ctx.beginPath();
    ctx.moveTo(8, -1);
    ctx.lineTo(15, 2);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a86d0a';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // mắt
    ctx.fillStyle = '#2f251b';
    ctx.beginPath(); ctx.arc(4, -2, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(4.5, -2.6, 0.5, 0, TAU); ctx.fill();
    // yếm
    ctx.fillStyle = '#e14b38';
    ctx.beginPath();
    ctx.ellipse(3, 8, 2.4, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  ART.drawAnimalBadge = function (ctx, a, now, t) {
    if (a.state === 'hungry') return;
    let kind = null;
    if (a.state === 'ready') kind = a.type === 'cow' ? 'milk' : 'egg';
    else if (a.state === 'producing') kind = 'clock';
    if (!kind) return;
    const isCow = a.type === 'cow';
    const bx = a.x - (isCow ? (a.dir || 1) * 26 : 4);
    const by = a.y - (isCow ? 96 : 60) + Math.sin(t * 2.2 + (a.phase || 0)) * 2.5;
    ctx.save();
    ctx.globalAlpha = 0.97;
    const w = kind === 'clock' ? 34 : 30;
    const h = 30;
    U.rr(ctx, bx - w / 2, by - h / 2, w, h, 10);
    ctx.fillStyle = 'rgba(255,252,236,.96)';
    ctx.fill();
    ctx.strokeStyle = kind === 'ready' ? '#f0b12e' : '#c9a76a';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 4, by + h / 2 - 1);
    ctx.lineTo(bx + 2, by + h / 2 + 6);
    ctx.lineTo(bx + 6, by + h / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,252,236,.96)';
    ctx.fill();

    if (kind === 'clock') {
      const p = clamp((now - (a.fedAt || now)) / Math.max(1, (a.readyAt || now) - (a.fedAt || now)), 0, 1);
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, TAU);
      ctx.fillStyle = '#fff5d6';
      ctx.fill();
      ctx.strokeStyle = '#c49b52';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 9, -Math.PI / 2, -Math.PI / 2 + p * TAU);
      ctx.strokeStyle = '#67b23d';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = '#6b4a1f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - 4.5);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 3.5, by + 1.5);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(bx - 11, by - 11);
      ctx.scale(22 / 64, 22 / 64);
      drawItemIconRaw(ctx, kind, 64);
      ctx.restore();
    }
    if (kind === 'ready') {
      ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2;
      ctx.strokeStyle = '#ffd35c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, 17, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* =========================================================
     Hồ cá
     ========================================================= */
  ART.drawPondFx = function (ctx, t, fishing) {
    const p = L.pond;
    ctx.save();
    ART.pondPath(ctx, -6);
    ctx.clip();
    // lấp lánh mặt nước
    for (let i = 0; i < 12; i++) {
      const a = 0.1 + (Math.sin(t * 1.1 + i * 1.7) + 1) * 0.12;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8fffa';
      const x = 970 + ((i * 137 + Math.sin(t * 0.5 + i) * 20) % 300);
      const y = 590 + ((i * 53) % 110);
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + (i % 4) * 5, 1.7, 0.1, 0, TAU);
      ctx.fill();
    }
    // bong bóng
    for (let i = 0; i < 4; i++) {
      const bt = (t * 0.35 + i * 0.27) % 1;
      ctx.globalAlpha = (1 - bt) * 0.4;
      ctx.strokeStyle = '#d6fff8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(1030 + i * 43, 688 - bt * 70, 2 + bt * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    if (fishing && fishing.phase) {
      const bite = fishing.phase === 'bite';
      const bobX = 1108 + Math.sin(t * 1.6) * 2;
      const bobY = 636 + (bite ? 8 : Math.sin(t * 2.2) * 2.5);
      // dây câu
      ctx.strokeStyle = 'rgba(255,255,245,.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1176, 566);
      ctx.quadraticCurveTo(1145, 590, bobX, bobY - 7);
      ctx.stroke();
      // phao
      ctx.beginPath();
      ctx.ellipse(bobX, bobY, 5.5, 8, 0, 0, TAU);
      ctx.fillStyle = '#f8f6e8';
      ctx.fill();
      ctx.strokeStyle = '#b34a33';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bobX, bobY - 3.4, 5.4, 3.4, 0, 0, TAU);
      ctx.fillStyle = '#e8533c';
      ctx.fill();
      ctx.strokeStyle = '#7e2c1d';
      ctx.stroke();
      // gợn
      for (let i = 0; i < (bite ? 3 : 1); i++) {
        const k = ((t * 0.8 + i * 0.33) % 1);
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.strokeStyle = '#ecfffa';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(bobX, bobY + 5, 10 + k * 28, 3 + k * 7, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // bong bóng hướng dẫn
      const text = bite ? 'CẮN CÂU! Nhấn ngay!' : 'Chờ cá cắn câu...';
      drawBubble(ctx, p.x - 6, 552, text, bite ? '#ffe27a' : '#fff9e5', bite ? 1.05 : 1);
    }
  };

  function drawBubble(ctx, x, y, text, bg, pop) {
    ctx.save();
    ctx.translate(x, y);
    if (pop) ctx.scale(pop, pop);
    ctx.font = '800 15px "Segoe UI", "Trebuchet MS", sans-serif';
    const w = ctx.measureText(text).width + 30;
    const h = 34;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 14);
    else U.rr(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.fillStyle = 'rgba(47,63,28,.2)';
    ctx.save(); ctx.translate(0, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#c9a465';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // đuôi
    ctx.beginPath();
    ctx.moveTo(-6, h / 2 - 1);
    ctx.lineTo(0, h / 2 + 8);
    ctx.lineTo(7, h / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#c9a465';
    ctx.stroke();
    ctx.fillStyle = '#5b431f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  /* =========================================================
     Cây táo
     ========================================================= */
  const APPLE_POS = [
    [-62, -170], [12, -190], [66, -162], [-90, -146], [42, -144],
    [-24, -204], [94, -186], [-110, -182], [76, -214], [-44, -152]
  ];

  ART.drawTreeFx = function (ctx, ready, t, shake) {
    const x = L.tree.x, y = L.tree.y;
    ctx.save();
    ctx.translate(shake ? Math.sin(t * 30) * shake : 0, 0);
    APPLE_POS.forEach(([ax, ay], i) => {
      const sway = Math.sin(t * 1.3 + i) * 1.2;
      const px = x + ax + sway, py = y + ay;
      if (ready) {
        const glow = 0.12 + Math.sin(t * 3 + i) * 0.05;
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#ffcf5a';
        ctx.beginPath(); ctx.arc(px, py, 12, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(px - 3, py - 4, 1, px, py, 8);
        g.addColorStop(0, '#ff8f7a');
        g.addColorStop(0.5, '#e8483a');
        g.addColorStop(1, '#b71f24');
        ctx.beginPath();
        ctx.arc(px, py, 7.4, 0, TAU);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,25,20,.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath();
        ctx.ellipse(px - 2.4, py - 3, 2, 3, -0.5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#6d4a1f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py - 7);
        ctx.lineTo(px + 1, py - 11);
        ctx.stroke();
        U.leafShape(ctx, px + 1, py - 11, 6, 2.4, -0.4, '#5da538');
      } else {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, TAU);
        ctx.fillStyle = '#8dbb4e';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    // bong bóng khi chín
    if (ready) {
      const by = y - 246 + Math.sin(t * 2.2) * 3;
      ctx.beginPath();
      ctx.arc(x + 6, by, 15, 0, TAU);
      ctx.fillStyle = 'rgba(255,252,231,.96)';
      ctx.fill();
      ctx.strokeStyle = '#e6b247';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 1, by + 13);
      ctx.lineTo(x + 6, by + 20);
      ctx.lineTo(x + 11, by + 13);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,252,231,.96)';
      ctx.fill();
      ctx.save();
      ctx.translate(x - 5, by - 11);
      ctx.scale(22 / 64, 22 / 64);
      drawItemIconRaw(ctx, 'apple', 64);
      ctx.restore();
    }
    ctx.restore();
  };

  /* =========================================================
     Hiệu ứng môi trường
     ========================================================= */
  ART.drawButterflies = function (ctx, t) {
    const specs = [
      { x: 470, y: 380, rx: 95, ry: 45, sp: 0.35, c: '#ffb24a', ph: 0 },
      { x: 760, y: 460, rx: 120, ry: 55, sp: 0.27, c: '#8ed7ff', ph: 2.1 },
      { x: 330, y: 640, rx: 70, ry: 35, sp: 0.42, c: '#ffd45e', ph: 4.2 }
    ];
    specs.forEach((s, i) => {
      const x = s.x + Math.cos(t * s.sp + s.ph) * s.rx;
      const y = s.y + Math.sin(t * s.sp * 1.6 + s.ph) * s.ry;
      const flap = Math.abs(Math.sin(t * 9 + s.ph));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.cos(t * s.sp + s.ph) * 0.3);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.ellipse(-4, -3, 4, 7 * (0.4 + flap), -0.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, -3, 4, 7 * (0.4 + flap), 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(-4, -4, 1.6, 3 * flap, -0.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#5b431f';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 5); ctx.stroke();
      ctx.restore();
    });
  };

  ART.drawBirds = function (ctx, t) {
    for (let i = 0; i < 3; i++) {
      const x = ((t * (13 + i * 5) + i * 430) % 1600) - 160;
      const y = 52 + i * 26 + Math.sin(t * 0.7 + i) * 8;
      if (x > 980) continue;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#456b34';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      const f = Math.sin(t * 5 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 7, y + f);
      ctx.quadraticCurveTo(x - 3, y - 2, x, y);
      ctx.quadraticCurveTo(x + 3, y - 2, x + 7, y + f);
      ctx.stroke();
      ctx.restore();
    }
  };

  ART.drawPollen = function (ctx, t) {
    for (let i = 0; i < 24; i++) {
      const x = 120 + ((i * 197 + t * (7 + i % 5)) % 1080);
      const y = 300 + ((i * 91 + Math.sin(t * 0.4 + i) * 28) % 380);
      const a = 0.12 + (Math.sin(t * 1.6 + i * 1.2) + 1) * 0.1;
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 3 ? '#fff7cd' : '#d8ffb0';
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* =========================================================
     ICON cho UI (shop, túi đồ, bong bóng)
     ========================================================= */
  ART.drawItemIcon = function (ctx, id, size) {
    ctx.save();
    const s = size / 64;
    ctx.scale(s, s);
    drawItemIconRaw(ctx, id, 64);
    ctx.restore();
  };

  function drawItemIconRaw(ctx, id, size) {
    ctx.save();
    // bóng nhẹ
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.ellipse(32, 56, 20, 5, 0, 0, TAU);
    ctx.fillStyle = '#4a3418';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (id && id.indexOf('seed_') === 0) {
      drawSeedPacket(ctx, id.slice(5));
    } else {
      switch (id) {
        case 'carrot': paintCarrot(ctx); break;
        case 'tomato': paintTomato(ctx); break;
        case 'corn': paintCorn(ctx); break;
        case 'strawberry': paintStrawberry(ctx); break;
        case 'sunflower': paintSunflower(ctx); break;
        case 'pumpkin': paintPumpkin(ctx); break;
        case 'milk': paintMilk(ctx); break;
        case 'egg': paintEgg(ctx); break;
        case 'fish': paintFish(ctx, '#5aa9c9', '#2e7d9c'); break;
        case 'goldfish': paintFish(ctx, '#ff9c4a', '#d6641c'); break;
        case 'apple': paintApple(ctx); break;
        case 'hay': paintHay(ctx); break;
        case 'fertilizer': paintFertilizer(ctx); break;
        case 'energy': paintEnergy(ctx); break;
        case 'coin': paintCoin(ctx); break;
        case 'water': paintWater(ctx); break;
        default: paintStar(ctx);
      }
    }
    ctx.restore();
  }

  function outline(ctx, w) {
    ctx.strokeStyle = '#4a3418';
    ctx.lineWidth = w || 2;
    ctx.stroke();
  }

  function paintCarrot(ctx) {
    const g = ctx.createLinearGradient(24, 22, 40, 52);
    g.addColorStop(0, '#ffb24f');
    g.addColorStop(1, '#e6761a');
    ctx.beginPath();
    ctx.moveTo(22, 24);
    ctx.quadraticCurveTo(20, 34, 32, 54);
    ctx.quadraticCurveTo(44, 34, 42, 24);
    ctx.quadraticCurveTo(32, 18, 22, 24);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.strokeStyle = 'rgba(160,65,0,.5)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(28 + i * 2, 32 + i * 6);
      ctx.lineTo(37 - i * 2, 31 + i * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4e982f';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(32, 23);
      ctx.quadraticCurveTo(18 + i * 8, 8, 16 + i * 10, 5 + (i % 2) * 4);
      ctx.stroke();
    }
    U.leafShape(ctx, 32, 22, 13, 5, -2.2, '#69b840');
    U.leafShape(ctx, 32, 22, 12, 4.5, -0.9, '#4f9c31');
  }

  function paintTomato(ctx) {
    const g = ctx.createRadialGradient(26, 28, 3, 32, 36, 24);
    g.addColorStop(0, '#ff8f7c');
    g.addColorStop(0.55, '#e94b38');
    g.addColorStop(1, '#b72a23');
    ctx.beginPath();
    ctx.arc(32, 36, 18, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(25, 28, 4.5, 3, -0.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5b9d35';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      U.ellipse(ctx, 32 + Math.cos(a) * 6, 18 + Math.sin(a) * 3, 7, 3.1, i % 2 ? '#68b23f' : '#4f992f', a);
    }
    ctx.strokeStyle = '#3f7c24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 16); ctx.lineTo(32, 9);
    ctx.stroke();
  }

  function paintCorn(ctx) {
    ctx.save();
    ctx.translate(32, 34);
    ctx.rotate(-0.22);
    ctx.fillStyle = '#5a9e34';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.ellipse(i * 6, 3, 9, 24, i * 0.18, 0, TAU);
      ctx.fill();
      outline(ctx, 1.6);
    }
    const g = ctx.createLinearGradient(-7, 0, 9, 0);
    g.addColorStop(0, '#f7d55b');
    g.addColorStop(0.5, '#ffe88a');
    g.addColorStop(1, '#e8b32d');
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 23, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2);
    ctx.strokeStyle = 'rgba(168,118,16,.5)';
    ctx.lineWidth = 0.9;
    for (let r = -3; r <= 3; r++) {
      for (let c = -2; c <= 2; c++) {
        ctx.beginPath();
        ctx.arc(c * 3.2, r * 5.4, 1.1, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function paintStrawberry(ctx) {
    const g = ctx.createLinearGradient(20, 22, 44, 54);
    g.addColorStop(0, '#ff7f74');
    g.addColorStop(1, '#d52f32');
    ctx.beginPath();
    ctx.moveTo(32, 55);
    ctx.bezierCurveTo(12, 42, 14, 22, 32, 22);
    ctx.bezierCurveTo(50, 22, 52, 42, 32, 55);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.fillStyle = '#ffe9a1';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3;
      ctx.beginPath();
      ctx.ellipse(32 + Math.cos(a) * 9, 36 + Math.sin(a) * 10, 1.3, 2.1, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#61ab3c';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      U.ellipse(ctx, 32 + Math.cos(a) * 8, 20 + Math.sin(a) * 3, 8, 3.2, i % 2 ? '#6dbb44' : '#4d982f', a);
    }
  }

  function paintSunflower(ctx) {
    ctx.save();
    ctx.translate(32, 32);
    ctx.strokeStyle = '#4d8f2e';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.quadraticCurveTo(-4, 12, 0, 2);
    ctx.stroke();
    U.leafShape(ctx, 0, 18, 12, 5, 2.4, '#5aa737');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      ctx.save();
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, -22, 0, -10);
      g.addColorStop(0, '#ffe45e');
      g.addColorStop(1, '#f0a414');
      ctx.beginPath();
      ctx.ellipse(0, -17, 4.2, 9, 0, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 1.1);
      ctx.restore();
    }
    const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
    cg.addColorStop(0, '#8d5f27');
    cg.addColorStop(1, '#4c2f13');
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, TAU);
    ctx.fillStyle = cg;
    ctx.fill();
    outline(ctx, 2);
    ctx.fillStyle = 'rgba(255,215,130,.7)';
    for (let i = 0; i < 8; i++) {
      const a = i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function paintPumpkin(ctx) {
    const g = ctx.createLinearGradient(12, 22, 52, 52);
    g.addColorStop(0, '#ffb24a');
    g.addColorStop(1, '#dd7415');
    ctx.beginPath();
    ctx.ellipse(32, 38, 22, 17, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.strokeStyle = 'rgba(150,65,0,.45)';
    ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(32, 38, 8 + Math.abs(i) * 6, 17, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#638a2b';
    U.fillRR(ctx, 29, 15, 6, 10, 3, '#638a2b');
    outline(ctx, 1.4);
    U.leafShape(ctx, 35, 18, 13, 5, -0.5, '#75a63a');
  }

  function paintMilk(ctx) {
    const g = ctx.createLinearGradient(20, 18, 42, 54);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#e6eef0');
    ctx.beginPath();
    ctx.moveTo(23, 20);
    ctx.lineTo(41, 20);
    ctx.lineTo(43, 32);
    ctx.lineTo(41, 54);
    ctx.lineTo(23, 54);
    ctx.lineTo(21, 32);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    // sữa
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(23, 30); ctx.lineTo(41, 30); ctx.lineTo(41, 54); ctx.lineTo(23, 54);
    ctx.closePath();
    ctx.fillStyle = '#fffdf4';
    ctx.fill();
    ctx.restore();
    // nắp
    ctx.fillStyle = '#6fb6d8';
    U.fillRR(ctx, 22, 14, 20, 8, 3, '#6fb6d8');
    outline(ctx, 1.8);
    // nhãn
    U.fillRR(ctx, 26, 36, 12, 10, 3, '#d9edf2');
    ctx.fillStyle = '#5f8f9e';
    ctx.font = '800 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SỮA', 32, 43);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    U.fillRR(ctx, 24, 24, 3, 20, 2, 'rgba(255,255,255,.8)');
  }

  function paintEgg(ctx) {
    const g = ctx.createRadialGradient(27, 28, 3, 32, 36, 23);
    g.addColorStop(0, '#fffdf0');
    g.addColorStop(1, '#e8d3ac');
    ctx.beginPath();
    ctx.ellipse(32, 35, 16, 21, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(26, 27, 4, 7, -0.4, 0, TAU); ctx.fill();
    // ổ rơm
    ctx.strokeStyle = '#c99b4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, 50); ctx.quadraticCurveTo(32, 58, 51, 50);
    ctx.stroke();
    ctx.strokeStyle = '#e2b96b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 53); ctx.quadraticCurveTo(32, 60, 48, 53);
    ctx.stroke();
  }

  function paintFish(ctx, c1, c2) {
    ctx.save();
    ctx.translate(32, 34);
    const g = ctx.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.beginPath();
    ctx.ellipse(-1, 0, 18, 12, -0.08, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    // đuôi
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.lineTo(-28, -10);
    ctx.lineTo(-27, 10);
    ctx.closePath();
    ctx.fillStyle = c1;
    ctx.fill();
    outline(ctx, 1.7);
    // vây
    ctx.beginPath();
    ctx.ellipse(0, -11, 8, 4, -0.2, 0, TAU);
    ctx.fillStyle = c2;
    ctx.fill();
    outline(ctx, 1.3);
    // mắt
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(9, -3, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3418'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#2e251b';
    ctx.beginPath(); ctx.arc(10, -3, 2, 0, TAU); ctx.fill();
    // vảy
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-4 - i * 5, 0, 5, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintApple(ctx) {
    const g = ctx.createRadialGradient(25, 26, 2, 32, 36, 23);
    g.addColorStop(0, '#ff8e79');
    g.addColorStop(0.55, '#e8483a');
    g.addColorStop(1, '#b51f23');
    ctx.beginPath();
    ctx.arc(27, 37, 15, 0, TAU);
    ctx.arc(38, 37, 15, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.ellipse(24, 29, 4, 6, -0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6b4a1f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(32, 24); ctx.quadraticCurveTo(34, 16, 31, 12);
    ctx.stroke();
    U.leafShape(ctx, 33, 18, 12, 5, -0.4, '#63ac39');
    outline(ctx, 0.8);
  }

  function paintHay(ctx) {
    const g = ctx.createLinearGradient(0, 18, 0, 50);
    g.addColorStop(0, '#f4d376');
    g.addColorStop(1, '#c18c2b');
    U.fillRR(ctx, 12, 22, 40, 28, 5, g);
    U.rr(ctx, 12, 22, 40, 28, 5);
    outline(ctx, 2.2);
    ctx.strokeStyle = '#a97720';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(16 + i * 7, 25);
      ctx.lineTo(18 + i * 7, 47);
      ctx.stroke();
    }
    ctx.strokeStyle = '#8f6420';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(23, 21); ctx.lineTo(23, 51);
    ctx.moveTo(41, 21); ctx.lineTo(41, 51);
    ctx.stroke();
  }

  function paintFertilizer(ctx) {
    const g = ctx.createLinearGradient(0, 16, 0, 54);
    g.addColorStop(0, '#f2e2b3');
    g.addColorStop(1, '#d6bd83');
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(44, 18);
    ctx.lineTo(48, 49);
    ctx.quadraticCurveTo(48, 54, 42, 54);
    ctx.lineTo(22, 54);
    ctx.quadraticCurveTo(16, 54, 16, 49);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    U.fillRR(ctx, 23, 14, 18, 7, 3, '#b99a5c');
    outline(ctx, 1.6);
    ctx.fillStyle = '#6eaa3c';
    ctx.beginPath();
    ctx.moveTo(32, 42);
    ctx.bezierCurveTo(22, 42, 20, 32, 23, 28);
    ctx.bezierCurveTo(30, 30, 32, 35, 32, 38);
    ctx.bezierCurveTo(33, 33, 38, 29, 43, 30);
    ctx.bezierCurveTo(43, 37, 39, 42, 32, 42);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.3);
    ctx.strokeStyle = '#8c6f36';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(44, 24); ctx.stroke();
  }

  function paintEnergy(ctx) {
    const g = ctx.createLinearGradient(20, 12, 42, 54);
    g.addColorStop(0, '#8fe5ff');
    g.addColorStop(1, '#2d9fc9');
    U.fillRR(ctx, 22, 20, 20, 34, 6, g);
    U.rr(ctx, 22, 20, 20, 34, 6);
    outline(ctx, 2.2);
    U.fillRR(ctx, 26, 13, 12, 8, 3, '#e8f7ff');
    outline(ctx, 1.6);
    ctx.fillStyle = '#ffe14f';
    ctx.beginPath();
    ctx.moveTo(35, 24); ctx.lineTo(27, 38); ctx.lineTo(32, 38); ctx.lineTo(29, 48);
    ctx.lineTo(39, 34); ctx.lineTo(34, 34); ctx.closePath();
    ctx.fill();
    outline(ctx, 1.3);
    U.fillRR(ctx, 25, 24, 3, 16, 2, 'rgba(255,255,255,.65)');
  }

  function paintCoin(ctx) {
    const g = ctx.createRadialGradient(26, 26, 2, 32, 34, 24);
    g.addColorStop(0, '#fff3a8');
    g.addColorStop(0.55, '#ffd23f');
    g.addColorStop(1, '#dc930c');
    ctx.beginPath();
    ctx.arc(32, 34, 21, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.4);
    ctx.strokeStyle = '#c48106';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 34, 15.5, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#b16f00';
    ctx.font = '900 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 32, 35);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath(); ctx.ellipse(24, 24, 5, 3, -0.6, 0, TAU); ctx.fill();
  }

  function paintWater(ctx) {
    const g = ctx.createLinearGradient(0, 16, 0, 52);
    g.addColorStop(0, '#b7efff');
    g.addColorStop(1, '#4cb9dd');
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.bezierCurveTo(46, 30, 50, 38, 50, 44);
    ctx.bezierCurveTo(50, 54, 40, 58, 32, 58);
    ctx.bezierCurveTo(24, 58, 14, 54, 14, 44);
    ctx.bezierCurveTo(14, 38, 18, 30, 32, 12);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    outline(ctx, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath(); ctx.ellipse(25, 42, 4, 7, 0.3, 0, TAU); ctx.fill();
  }

  function paintStar(ctx) {
    ctx.fillStyle = '#ffd45e';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i / 10 * TAU;
      const r = i % 2 ? 8 : 20;
      const px = 32 + Math.cos(a) * r, py = 34 + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    outline(ctx, 2);
  }

  function drawSeedPacket(ctx, crop) {
    const colors = {
      carrot: '#ef8a28', tomato: '#df4b39', corn: '#e8b92c',
      strawberry: '#e24545', sunflower: '#f0b220', pumpkin: '#e1811f'
    };
    ctx.save();
    ctx.translate(32, 34);
    ctx.rotate(-0.065);
    // bóng
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#4a3418';
    ctx.beginPath();
    ctx.ellipse(0, 19, 20, 5, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    // gói giấy
    const g = ctx.createLinearGradient(-18, -22, 18, 22);
    g.addColorStop(0, '#fffdf2');
    g.addColorStop(1, '#f0d9a6');
    U.fillRR(ctx, -19, -22, 38, 44, 4, g);
    U.rr(ctx, -19, -22, 38, 44, 4);
    outline(ctx, 2.2);
    // dải màu trên
    U.fillRR(ctx, -16, -19, 32, 10, 2, colors[crop] || '#7cb342');
    ctx.strokeStyle = 'rgba(80,45,15,.25)';
    ctx.lineWidth = 1;
    U.rr(ctx, -16, -19, 32, 10, 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.46)';
    U.fillRR(ctx, -14, -18, 28, 2.5, 1, 'rgba(255,255,255,.46)');
    // hạt nhỏ trên dải
    ctx.fillStyle = 'rgba(70,40,10,.4)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-10 + i * 7, -13.5, 1.3, 0.9, 0.4, 0, TAU);
      ctx.fill();
    }
    // biểu tượng nông sản
    drawSeedEmblem(ctx, crop);
    // nhãn nhỏ
    ctx.fillStyle = '#7b5a2a';
    ctx.font = '800 5.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HẠT GIỐNG', 0, 18.6);
    // góc gấp
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(19, -15);
    ctx.lineTo(19, -22);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,15,.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawSeedEmblem(ctx, crop) {
    ctx.save();
    ctx.translate(0, 1);
    if (crop === 'carrot') {
      const g = ctx.createLinearGradient(-5, -4, 5, 12);
      g.addColorStop(0, '#ffbb58');
      g.addColorStop(1, '#e57619');
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.quadraticCurveTo(-9, 9, 0, 14);
      ctx.quadraticCurveTo(9, 9, 8, -5);
      ctx.quadraticCurveTo(0, -9, -8, -5);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 1.4);
      ctx.strokeStyle = '#4b922e';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(-9 + i * 9, -14, -10 + i * 10, -18);
        ctx.stroke();
      }
      U.leafShape(ctx, 0, -7, 9, 3.8, -1.9, '#64b23e');
      U.leafShape(ctx, 0, -7, 9, 3.8, -1.2, '#4f9a31');
    } else if (crop === 'tomato') {
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 3, 12);
      g.addColorStop(0, '#ff8e7b');
      g.addColorStop(1, '#c62d26');
      ctx.beginPath();
      ctx.arc(0, 3, 10, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 1.5);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.ellipse(-3.5, -1, 2.6, 1.8, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a9f35';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55;
        U.ellipse(ctx, Math.cos(a) * 3.4, -7 + Math.sin(a) * 1.8, 4, 1.8, i % 2 ? '#69b53f' : '#4e972e', a);
      }
      ctx.strokeStyle = '#3e7a24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -12); ctx.stroke();
    } else if (crop === 'corn') {
      ctx.fillStyle = '#5a9e34';
      ctx.beginPath(); ctx.ellipse(-6, 2, 5, 13, -0.15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, 2, 5, 13, 0.15, 0, TAU); ctx.fill();
      outline(ctx, 1.1);
      const g = ctx.createLinearGradient(-5, 0, 5, 0);
      g.addColorStop(0, '#f6d04a');
      g.addColorStop(1, '#e2ab1e');
      ctx.beginPath(); ctx.ellipse(0, 1, 6.5, 13, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
      outline(ctx, 1.3);
      ctx.strokeStyle = 'rgba(160,110,10,.45)'; ctx.lineWidth = 0.8;
      for (let r = -2; r <= 2; r++) {
        for (let c = -1; c <= 1; c++) {
          ctx.beginPath(); ctx.arc(c * 3, r * 4, 0.8, 0, TAU); ctx.stroke();
        }
      }
    } else if (crop === 'strawberry') {
      const g = ctx.createLinearGradient(0, -5, 0, 15);
      g.addColorStop(0, '#ff7f74');
      g.addColorStop(1, '#cf2f31');
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.bezierCurveTo(-13, 7, -12, -6, 0, -6);
      ctx.bezierCurveTo(12, -6, 13, 7, 0, 15);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      outline(ctx, 1.5);
      ctx.fillStyle = '#ffe9a1';
      for (let i = 0; i < 6; i++) {
        const a = i * 2.1;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 5, 4 + Math.sin(a) * 6, 0.8, 1.3, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#5ba739';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5;
        U.ellipse(ctx, Math.cos(a) * 5, -7 + Math.sin(a) * 2, 4.6, 2, i % 2 ? '#69b740' : '#4b942e', a);
      }
    } else if (crop === 'sunflower') {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, -10, 2.8, 6, 0, 0, TAU);
        ctx.fillStyle = i % 2 ? '#ffdf55' : '#f4b51b'; ctx.fill();
        ctx.strokeStyle = '#c57c08'; ctx.lineWidth = 0.7; ctx.stroke();
        ctx.restore();
      }
      const cg = ctx.createRadialGradient(-2, 0, 1, 0, 2, 7);
      cg.addColorStop(0, '#8b5b24'); cg.addColorStop(1, '#4c2e11');
      ctx.beginPath(); ctx.arc(0, 2, 6.5, 0, TAU); ctx.fillStyle = cg; ctx.fill();
      outline(ctx, 1.4);
    } else {
      const g = ctx.createLinearGradient(0, -8, 0, 12);
      g.addColorStop(0, '#ffb24a'); g.addColorStop(1, '#dd7415');
      ctx.beginPath(); ctx.ellipse(0, 3, 12, 9, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
      outline(ctx, 1.5);
      ctx.strokeStyle = 'rgba(150,65,0,.4)'; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(0, 3, 4 + Math.abs(i) * 3.5, 9, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#5d8a2b';
      U.fillRR(ctx, -2.5, -9, 5, 6, 2, '#5d8a2b');
      outline(ctx, 1);
    }
    ctx.restore();
  }

  ART.drawCropIcon = function (ctx, id, size) {
    ART.drawItemIcon(ctx, id, size);
  };

})();
