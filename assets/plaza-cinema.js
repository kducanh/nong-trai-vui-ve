/* Rạp chiếu 2.5D cho Quảng trường — nền canvas dưới iframe YouTube. */
(() => {
  'use strict';
  const W = 1280, H = 720;
  const SCREEN = { x: 290, y: 125, w: 700, h: 394 };
  const canvas = document.getElementById('plazaCinema');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let raf = 0;
  let startedAt = 0;
  let running = false;

  function rr(c, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }

  function drawRoom(t) {
    const px = 640, horizon = 122;
    // Không gian tối
    const bg = ctx.createRadialGradient(700, 260, 50, 700, 360, 760);
    bg.addColorStop(0, '#20251a');
    bg.addColorStop(0.48, '#10130d');
    bg.addColorStop(1, '#050704');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Trần và dầm
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = 'rgba(210,196,150,.10)';
    ctx.lineWidth = 3;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 95, horizon);
      ctx.lineTo(px + i * 260, -20);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(217,240,138,.07)';
    ctx.lineWidth = 1.5;
    for (let y = 10; y < 110; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y - 22);
      ctx.stroke();
    }
    ctx.restore();

    // Tường hai bên, có thanh đèn vàng
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#161a12');
    wall.addColorStop(1, '#080a07');
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(430, 0); ctx.lineTo(540, 430); ctx.lineTo(0, 720);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(850, 0); ctx.lineTo(740, 430); ctx.lineTo(W, 720);
    ctx.closePath(); ctx.fill();

    // Ánh sáng viền tường
    for (const x of [140, 1140]) {
      const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
      g.addColorStop(0, 'rgba(200,169,106,0)');
      g.addColorStop(0.5, 'rgba(244,215,157,.60)');
      g.addColorStop(1, 'rgba(200,169,106,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 8, 120, 16, 440);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#f1dca7';
      ctx.fillRect(x - 24, 120, 48, 440);
      ctx.globalAlpha = 1;
    }

    // Sàn + lối đi
    const floor = ctx.createLinearGradient(0, 430, 0, H);
    floor.addColorStop(0, '#171a12');
    floor.addColorStop(1, '#090b07');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(SCREEN.x, SCREEN.y + SCREEN.h); ctx.lineTo(SCREEN.x + SCREEN.w, SCREEN.y + SCREEN.h); ctx.lineTo(1160, 720); ctx.lineTo(120, 720);
    ctx.closePath(); ctx.fill();

    // Đèn lối đi
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const y = 500 + i * 32;
      const alpha = 0.36 + 0.22 * Math.sin(t * 1.3 + i);
      for (const x of [432 - i * 18, 848 + i * 18]) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f4d88c';
        ctx.beginPath();
        ctx.ellipse(x, y, 7 + i, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Sân khấu
    ctx.fillStyle = '#1a1c13';
    ctx.beginPath();
    ctx.moveTo(SCREEN.x + 40, 527); ctx.lineTo(SCREEN.x + SCREEN.w - 40, 527); ctx.lineTo(SCREEN.x + SCREEN.w + 55, 560); ctx.lineTo(SCREEN.x - 55, 560);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(217,240,138,.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Khung màn chiếu
    ctx.save();
    ctx.shadowColor = 'rgba(244,221,163,.42)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#dcd2b5';
    rr(ctx, SCREEN.x - 12, SCREEN.y - 12, SCREEN.w + 24, SCREEN.h + 24, 9);
    ctx.fill();
    ctx.restore();
    const screenGrad = ctx.createLinearGradient(0, SCREEN.y, 0, SCREEN.y + SCREEN.h);
    screenGrad.addColorStop(0, '#17201a');
    screenGrad.addColorStop(1, '#090d0a');
    ctx.fillStyle = screenGrad;
    rr(ctx, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 4);
    ctx.fill();
    // Ánh sáng màn chiếu hắt xuống
    const glow = ctx.createRadialGradient(px, SCREEN.y + SCREEN.h, 20, px, SCREEN.y + SCREEN.h, 400);
    glow.addColorStop(0, 'rgba(217,240,138,.08)');
    glow.addColorStop(1, 'rgba(217,240,138,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, SCREEN.y, W, 360);

    // Rèm nhung hai bên màn chiếu
    for (const side of [-1, 1]) {
      const x = side < 0 ? SCREEN.x - 64 : SCREEN.x + SCREEN.w + 6;
      const g = ctx.createLinearGradient(x, 0, x + 58, 0);
      g.addColorStop(0, 'rgba(57,22,19,.30)');
      g.addColorStop(0.45, 'rgba(104,38,30,.82)');
      g.addColorStop(1, 'rgba(35,14,12,.30)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, SCREEN.y + 9);
      ctx.lineTo(x + 58, SCREEN.y + 9);
      ctx.quadraticCurveTo(x + 38, SCREEN.y + SCREEN.h / 2, x + 58, SCREEN.y + SCREEN.h + 9);
      ctx.lineTo(x, SCREEN.y + SCREEN.h + 9);
      ctx.quadraticCurveTo(x + 18, SCREEN.y + SCREEN.h / 2, x, SCREEN.y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = .22;
      ctx.strokeStyle = '#e3b57e';
      ctx.lineWidth = 1.2;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 11, SCREEN.y + 15);
        ctx.quadraticCurveTo(x + i * 8, SCREEN.y + SCREEN.h / 2, x + i * 11, SCREEN.y + SCREEN.h + 1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Loa hai bên sân khấu
    for (const x of [SCREEN.x - 42, SCREEN.x + SCREEN.w + 16]) {
      ctx.fillStyle = '#11150e';
      rr(ctx, x, SCREEN.y + 105, 26, 180, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,169,106,.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,169,106,.16)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 13, SCREEN.y + 140 + i * 38, 7 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Đèn sân khấu
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const x of [SCREEN.x - 120, SCREEN.x + 100, SCREEN.x + SCREEN.w - 100, SCREEN.x + SCREEN.w + 120]) {
      const cg = ctx.createLinearGradient(x, 105, x, 560);
      cg.addColorStop(0, 'rgba(244,232,178,.14)');
      cg.addColorStop(1, 'rgba(244,232,178,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(x - 9, 105);
      ctx.lineTo(x + 9, 105);
      ctx.lineTo(x + 120, 560);
      ctx.lineTo(x - 120, 560);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Quả cầu disco + tia laser
    const bx = SCREEN.x + SCREEN.w / 2, by = 122;
    ctx.save();
    ctx.strokeStyle = 'rgba(201,233,255,.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const a = -2.7 + i * 0.36 + Math.sin(t * 0.24 + i) * 0.05;
      ctx.globalAlpha = 0.16 + (i % 3) * 0.045;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * 700, by - Math.sin(a) * 250);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2e3429';
    ctx.beginPath(); ctx.arc(bx, by, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(235,242,216,.65)';
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.ellipse(bx, by, 19, Math.abs(i) * 5 + 2, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(bx, by - 30); ctx.lineTo(bx, 0); ctx.stroke();
    ctx.restore();

    // 100 ghế: 10 hàng x 10, phối cảnh
    // Vẽ từ hàng xa đến gần để hàng trước che chân hàng sau.
    for (let row = 0; row <= 9; row++) {
      const y = 527 + row * 16.5;
      const span = 740 + row * 34;
      const aisle = 28 + row * 2;
      const gap = 3 + row * .25;
      const seatW = (span - aisle - gap * 9) / 10;
      const start = px - span / 2;
      const seatH = 9 + row * 1.6;
      // Lối đi tối giữa hai dãy ghế
      const aisleX = start + 5 * (seatW + gap);
      ctx.fillStyle = 'rgba(217,240,138,.035)';
      ctx.fillRect(aisleX, y - seatH, aisle, seatH + 9);
      for (let col = 0; col < 10; col++) {
        const x = start + col * (seatW + gap) + (col > 4 ? aisle : 0);
        const accentSeat = (row * 3 + col * 5) % 19 === 4;
        const cushion = accentSeat ? '#7f3327' : '#2b3324';
        const back = accentSeat ? '#4a211b' : '#20281b';
        const edge = accentSeat ? 'rgba(218,175,104,.72)' : 'rgba(196,208,164,.28)';
        // bóng dưới ghế
        ctx.fillStyle = 'rgba(0,0,0,.36)';
        ctx.beginPath();
        ctx.ellipse(x + seatW / 2, y + 7, seatW * .56, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // tựa ghế
        const bg = ctx.createLinearGradient(0, y - seatH, 0, y + 4);
        bg.addColorStop(0, back);
        bg.addColorStop(1, '#10140e');
        ctx.fillStyle = bg;
        rr(ctx, x, y - seatH, seatW, seatH + 6, 3);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1;
        ctx.stroke();
        // đệm
        ctx.fillStyle = cushion;
        rr(ctx, x + 2, y - seatH + 3, seatW - 4, seatH * .48, 2);
        ctx.fill();
        // đường viền trên tựa
        ctx.strokeStyle = accentSeat ? 'rgba(255,218,165,.48)' : 'rgba(217,240,138,.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 3, y - seatH + 2);
        ctx.lineTo(x + seatW - 3, y - seatH + 2);
        ctx.stroke();
        // tay vịn
        ctx.fillStyle = 'rgba(200,169,106,.42)';
        ctx.fillRect(x - 1, y + 2, 2, 4);
        ctx.fillRect(x + seatW - 1, y + 2, 2, 4);
      }
      // đèn lối đi hai bên
      for (const lx of [start - 12, start + span + 12]) {
        ctx.fillStyle = `rgba(244,216,140,${.22 + row * .035})`;
        ctx.beginPath();
        ctx.ellipse(lx, y + 2, 4 + row * .5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Lối đi giữa sân khấu
    ctx.save();
    ctx.setLineDash([9, 12]);
    ctx.strokeStyle = 'rgba(217,240,138,.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(640, 445);
    ctx.lineTo(640, 712);
    ctx.stroke();
    ctx.restore();

    // Bụi sáng
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const x = 200 + ((i * 137 + t * 8) % 900);
      const y = 100 + ((i * 83 + t * 11) % 420);
      ctx.globalAlpha = 0.08 + (i % 4) * 0.03;
      ctx.fillStyle = '#ecf6c8';
      ctx.beginPath(); ctx.arc(x, y, 1 + i % 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Viền tối nhẹ
    const vg = ctx.createRadialGradient(640, 350, 260, 640, 350, 800);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(ts) {
    if (!running) return;
    if (!startedAt) startedAt = ts;
    const t = (ts - startedAt) / 1000;
    ctx.setTransform(1.5, 0, 0, 1.5, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom(t);
    raf = requestAnimationFrame(loop);
  }

  window.PlazaCinema = {
    start() {
      if (running) return;
      running = true;
      startedAt = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
})();
