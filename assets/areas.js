/* =========================================================
   AREAS — ba khu vực riêng: Chuồng thú, Hồ cá, Vườn cây
   Mỗi khu là một cảnh full-screen, không phải popup.
   ========================================================= */
(function () {
  'use strict';
  const ART = window.ART;
  const U = ART.util;
  const TAU = Math.PI * 2;
  const W = 1280, H = 720;

  const ANIMAL_POS = {
    cow: { x: 730, y: 512, type: 'cow' },
    hen1: { x: 594, y: 544, type: 'chicken' },
    hen2: { x: 872, y: 538, type: 'chicken' }
  };

  const ORCHARD = {
    tree: { x: 655, y: 486 },
    side1: { x: 224, y: 436 },
    side2: { x: 1058, y: 416 },
    basket: { x: 812, y: 546 }
  };

  function draw(ctx, area, t, data) {
    ctx.clearRect(0, 0, W, H);
    if (area === 'animals') drawAnimals(ctx, t, data);
    else if (area === 'fishing') drawFishing(ctx, t, data);
    else if (area === 'orchard') drawOrchard(ctx, t, data);
  }

  /* =========================================================
     CHUỒNG THÚ
     ========================================================= */
  function drawAnimals(ctx, t, data) {
    const rnd = U.makeRand(320);
    drawBaseSky(ctx, t, {
      sky1: '#b5d5da', sky2: '#edf1d9'
    });
    drawHills(ctx, rnd, '#c5d2a5', '#9eb18a');
    // bãi cỏ
    ctx.fillStyle = createGrass(ctx, '#b4c785', '#789b62');
    ctx.beginPath();
    ctx.moveTo(-20, 255);
    ctx.bezierCurveTo(180, 238, 360, 268, 520, 250);
    ctx.bezierCurveTo(690, 233, 830, 266, 990, 248);
    ctx.bezierCurveTo(1130, 234, 1220, 258, 1300, 242);
    ctx.lineTo(1300, H); ctx.lineTo(-20, H); ctx.closePath();
    ctx.fill();
    drawMeadow(ctx, 320);

    // đường mòn nhỏ
    ctx.save();
    const path = new Path2D();
    path.moveTo(210, 690);
    path.bezierCurveTo(430, 590, 660, 620, 850, 500);
    path.bezierCurveTo(960, 432, 1000, 415, 1040, 390);
    ctx.strokeStyle = '#c9b27c'; ctx.lineWidth = 94; ctx.lineCap = 'round'; ctx.stroke(path);
    ctx.strokeStyle = '#e8d7aa'; ctx.lineWidth = 78; ctx.stroke(path);
    ctx.strokeStyle = '#f1e4c1'; ctx.lineWidth = 54; ctx.stroke(path);
    ctx.restore();

    // rào sau (vẽ trước nhà để không cắt ngang chuồng)
    for (let x = 300; x <= 810; x += 64) U.drawFencePost(ctx, x, 334, 48, 9);
    U.drawRail(ctx, 298, 308, 814, 308, 6);
    U.drawRail(ctx, 298, 324, 814, 324, 6);
    // chuồng bò lớn
    drawBarnArea(ctx, 1018, 428);
    // chuồng gà nhỏ
    drawCoopArea(ctx, 554, 366, 0.92);

    // cỏ khô, máng, đồ
    drawHay(ctx, 468, 492, 1.15, -0.04);
    drawHay(ctx, 516, 478, 0.8, 0.05);
    drawTrough(ctx, 952, 518);
    drawMilkChurn(ctx, 1080, 496, 0.9);
    drawMilkChurn(ctx, 1110, 504, 0.7);
    drawFlowerBed(ctx, 1160, 560, '#ffb4a2');

    // con vật
    const animals = data.animals || [];
    const selected = data.selectedAnimalId;
    const order = ['cow', 'hen1', 'hen2'];
    order.forEach(id => {
      const pos = ANIMAL_POS[id];
      const a = animals.find(x => x.id === id);
      if (!a) return;
      if (selected === id) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#fff4b8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 3, a.type === 'cow' ? 68 : 30, a.type === 'cow' ? 19 : 9, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      const sc = a.type === 'cow' ? 1.3 : 1.22;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(sc, sc);
      ART.drawAnimal(ctx, {
        id: a.id, type: a.type, name: a.name,
        x: 0, y: 0, dir: id === 'hen2' ? -1 : 1,
        phase: a.phase, state: a.state, fedAt: a.fedAt, readyAt: a.readyAt,
        moving: false
      }, t);
      ctx.restore();
      ART.drawAnimalBadge(ctx, {
        id: a.id, type: a.type, x: pos.x, y: pos.y, dir: id === 'hen2' ? -1 : 1,
        state: a.state, fedAt: a.fedAt, readyAt: a.readyAt, phase: a.phase
      }, Date.now(), t);
    });

    // rào trước (che chân con vật)
    for (let x = 290; x <= 1130; x += 67) U.drawFencePost(ctx, x, 615, 55, 10);
    U.drawRail(ctx, 288, 584, 1134, 584, 7);
    U.drawRail(ctx, 288, 604, 1134, 604, 7);
    // cây hai bên
    drawSimpleTree(ctx, 148, 500, 1.15);
    drawSimpleTree(ctx, 1206, 512, 0.85);
    // hoa, bướm
    const flowers = [[330, 466, '#fff4dc'], [610, 600, '#ffe27a'], [1150, 480, '#ffb5c5'], [840, 600, '#fff']];
    flowers.forEach(([x, y, c]) => U.drawFlower(ctx, x, y, 1.8, c));
    drawButterflies(ctx, t);
    // vignette
    drawVignette(ctx);
  }

  function drawBarnArea(ctx, x, base) {
    ctx.save();
    U.ellipse(ctx, x, base + 16, 185, 34, 'rgba(50,75,20,.25)');
    // thân
    const wall = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
    wall.addColorStop(0, '#cfaa78');
    wall.addColorStop(0.45, '#b98b59');
    wall.addColorStop(1, '#8a6542');
    U.rr(ctx, x - 152, base - 190, 304, 196, 7);
    ctx.fillStyle = wall; ctx.fill();
    ctx.strokeStyle = '#713f1d'; ctx.lineWidth = 3; ctx.stroke();
    // ván
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#6b3b18'; ctx.lineWidth = 1.6;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(x - 152 + i * 38, base - 188); ctx.lineTo(x - 152 + i * 38, base + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // cửa lớn
    ctx.beginPath();
    ctx.moveTo(x - 58, base + 2);
    ctx.lineTo(x - 58, base - 120);
    ctx.quadraticCurveTo(x - 54, base - 155, x, base - 158);
    ctx.quadraticCurveTo(x + 56, base - 155, x + 60, base - 118);
    ctx.lineTo(x + 60, base + 2);
    ctx.closePath();
    ctx.fillStyle = '#3d2715'; ctx.fill();
    ctx.strokeStyle = '#6b3f1c'; ctx.lineWidth = 4; ctx.stroke();
    ctx.globalAlpha = 0.65; ctx.fillStyle = '#d3a444';
    ctx.beginPath(); ctx.ellipse(x, base - 4, 50, 10, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // mái đỏ
    ctx.beginPath();
    ctx.moveTo(x - 188, base - 184);
    ctx.quadraticCurveTo(x - 98, base - 300, x, base - 322);
    ctx.quadraticCurveTo(x + 102, base - 300, x + 192, base - 184);
    ctx.lineTo(x + 164, base - 172);
    ctx.lineTo(x - 162, base - 172);
    ctx.closePath();
    const roof = ctx.createLinearGradient(0, base - 322, 0, base - 170);
    roof.addColorStop(0, '#d99072');
    roof.addColorStop(0.45, '#ba6953');
    roof.addColorStop(1, '#8a5145');
    ctx.fillStyle = roof; ctx.fill();
    ctx.strokeStyle = '#6d2e22'; ctx.lineWidth = 3; ctx.stroke();
    // ngói
    ctx.save(); ctx.clip();
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#6b2d20'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.moveTo(x - 170 + i * 43, base - 170); ctx.lineTo(x - 95 + i * 43, base - 320); ctx.stroke();
    }
    ctx.restore();
    // Warm eaves and a soft cast shadow give the facade depth.
    U.fillRR(ctx, x - 150, base - 170, 300, 9, 2, 'rgba(70,48,30,.20)');
    U.fillRR(ctx, x - 160, base - 178, 320, 5, 2, '#e7bd91');
    // cửa sổ
    [-90, 70].forEach((wx, i) => {
      U.fillRR(ctx, x + wx, base - 150, 34, 38, 3, '#f7e7c1');
      U.fillRR(ctx, x + wx + 4, base - 146, 26, 30, 2, '#4d7c66');
      ctx.strokeStyle = '#f8ebc8'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x + wx + 17, base - 146); ctx.lineTo(x + wx + 17, base - 116);
      ctx.moveTo(x + wx + 4, base - 131); ctx.lineTo(x + wx + 30, base - 131); ctx.stroke();
      U.fillRR(ctx, x + wx - 3, base - 108, 40, 8, 2, '#8a5a2c');
      U.drawFlower(ctx, x + wx + 8, base - 106, 1.3, '#ff9f8c');
    });
    // biển bò
    ctx.save();
    ctx.translate(x + 2, base - 192);
    U.fillRR(ctx, -52, -23, 104, 46, 6, '#fff7e2');
    ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 2.4;
    U.rr(ctx, -52, -23, 104, 46, 6); ctx.stroke();
    ctx.fillStyle = '#6b4a24';
    ctx.font = '900 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('BÒ SỮA', 0, -4);
    ctx.fillStyle = '#a08046';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText('CHUỒNG TRẠI', 0, 11);
    ctx.restore();
    // dụng cụ
    ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 170, base + 2); ctx.lineTo(x - 202, base - 76); ctx.stroke();
    ctx.strokeStyle = '#c7d3d5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 202, base - 76); ctx.lineTo(x - 192, base - 90); ctx.stroke();
    // đèn
    U.fillRR(ctx, x + 132, base - 174, 12, 18, 2, '#f3cd67');
    ctx.strokeStyle = '#7a4a20'; ctx.lineWidth = 2;
    U.rr(ctx, x + 132, base - 174, 12, 18, 2); ctx.stroke();
    ctx.restore();
  }

  function drawCoopArea(ctx, x, base, s) {
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(s, s);
    U.ellipse(ctx, 0, 46, 66, 16, 'rgba(55,75,25,.2)');
    const wall = ctx.createLinearGradient(-55, 0, 55, 0);
    wall.addColorStop(0, '#d77a54');
    wall.addColorStop(1, '#b45037');
    U.fillRR(ctx, -55, -28, 110, 76, 5, wall);
    ctx.strokeStyle = '#79331f'; ctx.lineWidth = 2.4;
    U.rr(ctx, -55, -28, 110, 76, 5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-70, -26); ctx.lineTo(0, -74); ctx.lineTo(70, -26);
    ctx.lineTo(60, -16); ctx.lineTo(0, -58); ctx.lineTo(-60, -16);
    ctx.closePath();
    ctx.fillStyle = '#eeb85d'; ctx.fill();
    ctx.strokeStyle = '#8a4d1d'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 20, 16, 0, TAU);
    ctx.fillStyle = '#64381d'; ctx.fill();
    ctx.strokeStyle = '#f5e5bf'; ctx.lineWidth = 2.6; ctx.stroke();
    U.fillRR(ctx, -20, 36, 40, 10, 3, '#b98348');
    drawSimpleTree(ctx, -84, 26, 0.5);
    ctx.restore();
  }

  function drawHay(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    U.ellipse(ctx, 0, 9, 38, 11, 'rgba(55,75,25,.2)');
    const g = ctx.createLinearGradient(0, -30, 0, 12);
    g.addColorStop(0, '#f0c96a'); g.addColorStop(1, '#bd882d');
    U.fillRR(ctx, -38, -28, 76, 38, 5, g);
    ctx.strokeStyle = '#94651f'; ctx.lineWidth = 2;
    U.rr(ctx, -38, -28, 76, 38, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,160,.55)'; ctx.lineWidth = 1.2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 10, -26); ctx.lineTo(i * 10 + 2, 9); ctx.stroke();
    }
    ctx.strokeStyle = '#9d6f25'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-22, -28); ctx.lineTo(-22, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(23, -28); ctx.lineTo(23, 10); ctx.stroke();
    ctx.restore();
  }

  function drawTrough(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    U.ellipse(ctx, 0, 16, 48, 11, 'rgba(55,75,25,.2)');
    U.fillRR(ctx, -45, -8, 90, 24, 6, '#8f6234');
    U.fillRR(ctx, -40, -4, 80, 7, 3, '#58c8d8');
    U.fillRR(ctx, -48, 8, 9, 20, 3, '#a9743b');
    U.fillRR(ctx, 39, 8, 9, 20, 3, '#a9743b');
    ctx.restore();
  }

  function drawMilkChurn(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    U.ellipse(ctx, 0, 4, 14, 5, 'rgba(55,75,25,.2)');
    U.fillRR(ctx, -11, -34, 22, 38, 4, '#c7d4d7');
    ctx.strokeStyle = '#6a7b80'; ctx.lineWidth = 1.7;
    U.rr(ctx, -11, -34, 22, 38, 4); ctx.stroke();
    U.fillRR(ctx, -7, -41, 14, 8, 3, '#aebbc0');
    U.rr(ctx, -7, -41, 14, 8, 3); ctx.stroke();
    ctx.strokeStyle = '#f0f6f6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -27); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.restore();
  }

  function drawFlowerBed(ctx, x, y, color) {
    U.drawFlower(ctx, x, y, 2.2, color);
    U.drawFlower(ctx, x + 24, y + 8, 1.6, '#ffe27a');
    U.drawFlower(ctx, x - 22, y + 6, 1.5, '#fff');
  }

  function drawPumpkin(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    U.ellipse(ctx, 0, 4, 20, 6, 'rgba(55,75,25,.2)');
    U.ellipse(ctx, 0, -8, 18, 14, '#e98a2d');
    U.ellipse(ctx, -11, -8, 8, 13, '#f09a3b');
    U.ellipse(ctx, 11, -8, 8, 13, '#dc7a21');
    ctx.strokeStyle = '#b95e16'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7, -20); ctx.quadraticCurveTo(-5, -8, -7, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -20); ctx.quadraticCurveTo(5, -8, 7, 4); ctx.stroke();
    ctx.strokeStyle = '#6a8a32'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(2, -28, 7, -31); ctx.stroke();
    U.leafShape(ctx, 7, -28, 12, 5, -0.4, '#5da737');
    ctx.restore();
  }

  function drawSimpleTree(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    U.ellipse(ctx, 12, 7, 54, 13, 'rgba(48,70,43,.16)');
    ctx.fillStyle = '#82532b';
    U.fillRR(ctx, -8, -92, 16, 100, 6, '#82532b');
    ctx.strokeStyle = '#5f3a1c'; ctx.lineWidth = 2;
    U.rr(ctx, -8, -92, 16, 100, 6); ctx.stroke();
    const blobs = [
      [-38, -140, 38, 32], [8, -160, 50, 40], [46, -134, 32, 28],
      [-4, -118, 44, 32], [26, -104, 28, 24]
    ];
    blobs.forEach(([bx, by, rx, ry], i) => {
      drawCanopy(ctx, bx, by, rx, ry, i);
    });
    ctx.restore();
  }

  /* =========================================================
     HỒ CÁ
     ========================================================= */
  function drawFishing(ctx, t, data) {
    const rnd = U.makeRand(808);
    drawBaseSky(ctx, t, {
      sky1: '#b1d6de', sky2: '#e6eedb'
    });
    drawHills(ctx, rnd, '#b9ceac', '#8eaf91');
    // nền cỏ
    ctx.fillStyle = createGrass(ctx, '#abc38c', '#729c78');
    ctx.beginPath();
    ctx.moveTo(-20, 255);
    ctx.bezierCurveTo(180, 235, 340, 268, 520, 250);
    ctx.bezierCurveTo(680, 235, 830, 268, 990, 250);
    ctx.bezierCurveTo(1130, 238, 1220, 258, 1300, 244);
    ctx.lineTo(1300, H); ctx.lineTo(-20, H); ctx.closePath();
    ctx.fill();
    drawMeadow(ctx, 808);

    // hồ lớn
    const p = { x: 690, y: 465, rx: 470, ry: 192 };
    U.blobPath(ctx, p.x, p.y, p.rx + 34, p.ry + 27, [1, .93, 1.04, .95, 1.02, .92, 1.05, .94, 1.01, .96], -0.12);
    ctx.fillStyle = '#c5b68e'; ctx.fill();
    ctx.strokeStyle = 'rgba(115,90,45,.4)'; ctx.lineWidth = 3; ctx.stroke();
    U.blobPath(ctx, p.x, p.y, p.rx + 20, p.ry + 16, [1, .93, 1.04, .95, 1.02, .92, 1.05, .94, 1.01, .96], -0.12);
    ctx.fillStyle = '#d8dfb6'; ctx.fill();
    U.blobPath(ctx, p.x, p.y, p.rx, p.ry, [1, .93, 1.04, .95, 1.02, .92, 1.05, .94, 1.01, .96], -0.12);
    const wg = ctx.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry);
    wg.addColorStop(0, '#b7dbcf');
    wg.addColorStop(0.42, '#73b4b2');
    wg.addColorStop(1, '#447f8b');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(12,90,105,.35)'; ctx.lineWidth = 3; ctx.stroke();

    // mặt nước lấp lánh
    ctx.save();
    U.blobPath(ctx, p.x, p.y, p.rx, p.ry, [1, .93, 1.04, .95, 1.02, .92, 1.05, .94, 1.01, .96], -0.12);
    ctx.clip();
    // Reflected sky and shaded shallows stay inside the water's contour.
    const reflection = ctx.createLinearGradient(0, 290, 0, 440);
    reflection.addColorStop(0, 'rgba(251,247,214,.38)');
    reflection.addColorStop(1, 'rgba(251,247,214,0)');
    ctx.fillStyle = reflection; ctx.fillRect(200, 270, 1000, 190);
    ctx.strokeStyle = 'rgba(43,90,83,.17)'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.ellipse(p.x + 5, p.y + 2, p.rx - 8, p.ry - 8, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const x = 300 + rnd() * 780;
      const y = 315 + rnd() * 260;
      ctx.globalAlpha = 0.1 + (Math.sin(t * 1.1 + i) + 1) * 0.08;
      ctx.strokeStyle = '#e6fffa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 16 + i * 2, 2.2, 0.05, 0, TAU); ctx.stroke();
    }
    // cá bơi
    drawKoi(ctx, 560, 415, 0.8, -0.2, '#ff9b51');
    drawKoi(ctx, 790, 512, 0.65, 2.7, '#ffd45e');
    drawKoi(ctx, 430, 535, 0.55, 1.1, '#f08b5b');
    ctx.globalAlpha = 1;
    ctx.restore();

    // đá ven hồ
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * TAU;
      const x = p.x + Math.cos(a) * (p.rx + 24 + rnd() * 12);
      const y = p.y + Math.sin(a) * (p.ry + 20 + rnd() * 10);
      if (y < 300) continue;
      U.drawStone(ctx, x, y, 7 + rnd() * 8, 4 + rnd() * 5, a, rnd() > 0.5 ? '#d8d6c7' : '#c0c7b9');
    }

    // sen, sậy
    drawLily(ctx, 480, 390, 30, 0.9);
    drawLily(ctx, 860, 392, 22, 0.8);
    drawLily(ctx, 640, 540, 26, 0.7);
    drawLily(ctx, 960, 530, 18, 0.75);
    drawLotus(ctx, 480, 380, 11);
    drawReeds(ctx, 300, 500, 1.25);
    drawReeds(ctx, 1100, 480, 1.0);
    drawReeds(ctx, 1050, 590, 0.8);

    // cầu gỗ
    drawDock(ctx, 220, 566);
    // cần câu
    drawRod(ctx, 360, 506, data.fishPhase, t);
    if (data.fishPhase === 'bite') drawBiteAlert(ctx, t);

    // thuyền nhỏ xa
    ctx.save();
    ctx.translate(1080, 352);
    ctx.fillStyle = '#9b6436';
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(22, 13); ctx.lineTo(-22, 13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6d421f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -13); ctx.stroke();
    ctx.restore();

    // cây ven hồ
    drawSimpleTree(ctx, 140, 490, 1.2);
    drawSimpleTree(ctx, 1210, 500, 0.95);
    drawSimpleTree(ctx, 1080, 330, 0.6);
    // hoa
    [[330, 625, '#fff'], [1000, 630, '#ffe27a'], [1150, 590, '#ffc1cf']].forEach(([x, y, c]) => U.drawFlower(ctx, x, y, 1.8, c));
    drawButterflies(ctx, t);
    drawVignette(ctx);
  }

  function drawDock(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // cọc
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(-125 + i * 105, -8, 11, 76);
      ctx.fillStyle = '#c99758';
      ctx.fillRect(-123 + i * 105, -8, 4, 74);
    }
    // sàn
    const g = ctx.createLinearGradient(0, -20, 0, 18);
    g.addColorStop(0, '#d9a866'); g.addColorStop(1, '#a46d38');
    ctx.beginPath();
    ctx.moveTo(-155, -16); ctx.lineTo(170, -22); ctx.lineTo(150, 8); ctx.lineTo(-135, 14); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#73441f'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,232,185,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(-145 + i * 50, -14); ctx.lineTo(-135 + i * 50, 10); ctx.stroke();
    }
    // xô
    U.fillRR(ctx, -126, -40, 28, 28, 3, '#6fa9b6');
    ctx.strokeStyle = '#345d68'; ctx.lineWidth = 2;
    U.rr(ctx, -126, -40, 28, 28, 3); ctx.stroke();
    ctx.beginPath(); ctx.arc(-112, -40, 14, Math.PI, 0); ctx.stroke();
    ctx.restore();
  }

  function drawRod(ctx, x, y, phase, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#6e4a25'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, 22); ctx.quadraticCurveTo(80, -60, 212, -88); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,.45)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-12, 20); ctx.quadraticCurveTo(80, -58, 210, -86); ctx.stroke();
    // dây câu
    const bobX = 340, bobY = -76;
    ctx.strokeStyle = 'rgba(255,255,245,.6)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(210, -88);
    ctx.quadraticCurveTo(330, -40, bobX, bobY);
    ctx.stroke();
    // phao
    if (phase) {
      const dip = phase === 'bite' ? 8 + Math.sin(t * 16) * 2 : Math.sin(t * 2) * 3;
      const bx = bobX, by = bobY + dip;
      ctx.beginPath(); ctx.ellipse(bx, by, 6, 9, 0, 0, TAU);
      ctx.fillStyle = '#fffdf0'; ctx.fill();
      ctx.strokeStyle = '#a6382a'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(bx, by - 3.5, 5.6, 3.5, 0, 0, TAU);
      ctx.fillStyle = '#e8533c'; ctx.fill();
      ctx.strokeStyle = '#7d2b1c'; ctx.stroke();
      for (let i = 0; i < (phase === 'bite' ? 3 : 1); i++) {
        const k = (t * 0.8 + i * 0.34) % 1;
        ctx.globalAlpha = (1 - k) * 0.65;
        ctx.strokeStyle = '#e7fff9'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(bx, by + 7, 12 + k * 34, 4 + k * 8, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (phase === 'bite') {
        const by2 = by - 46 + Math.sin(t * 4) * 3;
        ctx.beginPath(); ctx.arc(bx, by2, 20, 0, TAU);
        ctx.fillStyle = 'rgba(255,250,220,.96)'; ctx.fill();
        ctx.strokeStyle = '#e3ae3d'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#b3472e'; ctx.font = '900 24px "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', bx, by2 + 1);
      }
    }
    ctx.restore();
  }

  function drawBiteAlert(ctx, t) {
    const x = 700, y = 344 + Math.sin(t * 4.5) * 4;
    ctx.save();
    ctx.globalAlpha = .35;
    ctx.fillStyle = '#fff2a8';
    ctx.beginPath(); ctx.arc(x, y, 38 + Math.sin(t * 5) * 4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU);
    ctx.fillStyle = 'rgba(255,253,232,.97)'; ctx.fill();
    ctx.strokeStyle = '#e6ad35'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 18); ctx.lineTo(x, y + 29); ctx.lineTo(x + 7, y + 18);
    ctx.closePath(); ctx.fillStyle = 'rgba(255,253,232,.97)'; ctx.fill();
    ctx.strokeStyle = '#e6ad35'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c0472e';
    ctx.font = '900 27px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 1);
    ctx.restore();
  }

  function drawKoi(ctx, x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-38, -11); ctx.lineTo(-36, 0); ctx.lineTo(-38, 11); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(6, -3, 12, 3, 0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawLily(ctx, x, y, r, a) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(0, 0, r, 0.28, TAU - 0.28); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#4f9e3d'; ctx.fill();
    ctx.strokeStyle = '#33752a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function drawLotus(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.42;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, -r, r * 0.42, r * 0.9, 0, 0, TAU);
      ctx.fillStyle = i % 2 ? '#ffb9cf' : '#ffd7e2'; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, TAU);
    ctx.fillStyle = '#ffe06a'; ctx.fill();
    ctx.restore();
  }

  function drawReeds(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#4d8c34'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const h = 40 + Math.abs(i) * 8;
      ctx.beginPath(); ctx.moveTo(i * 5, 0); ctx.quadraticCurveTo(i * 9, -h * 0.55, i * 6 + 4, -h); ctx.stroke();
      if (i % 2 === 0) {
        ctx.beginPath(); ctx.ellipse(i * 6 + 4, -h - 3, 2.6, 8, 0.3, 0, TAU);
        ctx.fillStyle = '#8c5b2a'; ctx.fill();
      }
    }
    ctx.restore();
  }

  /* =========================================================
     VƯỜN CÂY
     ========================================================= */
  function drawOrchard(ctx, t, data) {
    const rnd = U.makeRand(111);
    drawBaseSky(ctx, t, {
      sky1: '#e7d5b3', sky2: '#f1efd5'
    });
    drawHills(ctx, rnd, '#c4cda1', '#a6b98a');
    ctx.fillStyle = createGrass(ctx, '#bdcb8b', '#879e61');
    ctx.beginPath();
    ctx.moveTo(-20, 250);
    ctx.bezierCurveTo(180, 234, 340, 266, 520, 250);
    ctx.bezierCurveTo(680, 233, 830, 264, 990, 248);
    ctx.bezierCurveTo(1130, 234, 1220, 258, 1300, 242);
    ctx.lineTo(1300, H); ctx.lineTo(-20, H); ctx.closePath();
    ctx.fill();
    drawMeadow(ctx, 111);

    // đường mòn
    const path = new Path2D();
    path.moveTo(-20, 650);
    path.bezierCurveTo(300, 580, 560, 620, 800, 520);
    path.bezierCurveTo(980, 445, 1080, 430, 1300, 420);
    ctx.strokeStyle = '#c9b37d'; ctx.lineWidth = 90; ctx.lineCap = 'round'; ctx.stroke(path);
    ctx.strokeStyle = '#e7d8ae'; ctx.lineWidth = 74; ctx.stroke(path);
    ctx.strokeStyle = '#f1e6c4'; ctx.lineWidth = 52; ctx.stroke(path);

    // hàng rào
    for (let x = 100; x <= 1180; x += 74) U.drawFencePost(ctx, x, 316, 46, 8);
    U.drawRail(ctx, 98, 292, 1182, 292, 5);
    U.drawRail(ctx, 98, 306, 1182, 306, 5);

    // cây chính
    const ready = data.treeReady;
    const shake = data.treeShake ? Math.sin(t * 38) * 3 : 0;
    drawAppleTree(ctx, ORCHARD.tree.x, ORCHARD.tree.y, ready, shake, 1.15);
    // cây phụ
    drawAppleTree(ctx, ORCHARD.side1.x, ORCHARD.side1.y, false, 0, 0.68);
    drawAppleTree(ctx, ORCHARD.side2.x, ORCHARD.side2.y, false, 0, 0.78);

    // giỏ táo
    drawBasket(ctx, ORCHARD.basket.x, ORCHARD.basket.y, ready);
    // thang
    drawLadder(ctx, 850, 550);
    // hay, bí
    drawHay(ctx, 340, 565, 0.9, 0.03);
    drawPumpkin(ctx, 1060, 566, 0.9);
    drawPumpkin(ctx, 1090, 574, 0.6);
    // biển
    U.drawSign(ctx, 930, 500, 130, 34, 'VƯỜN TÁO', 0.08, '#d8a35d');
    // hoa
    [[260, 600, '#fff3df'], [760, 600, '#ffe27a'], [1180, 610, '#ffc4d3'], [430, 610, '#fff']].forEach(([x, y, c]) => U.drawFlower(ctx, x, y, 2, c));
    drawButterflies(ctx, t);
    drawVignette(ctx);
  }

  function drawAppleTree(ctx, x, y, ready, shake, s) {
    ctx.save();
    ctx.translate(x + shake, y);
    ctx.scale(s, s);
    U.ellipse(ctx, 18, 11, 114, 28, 'rgba(48,68,37,.18)');
    // thân
    const tg = ctx.createLinearGradient(-20, 0, 24, 0);
    tg.addColorStop(0, '#7a4a24'); tg.addColorStop(0.45, '#b37b3e'); tg.addColorStop(1, '#6b3d1b');
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.bezierCurveTo(-16, -70, -12, -100, -22, -150);
    ctx.bezierCurveTo(-10, -174, 16, -174, 22, -146);
    ctx.bezierCurveTo(12, -95, 20, -45, 25, 0);
    ctx.closePath();
    ctx.fillStyle = tg; ctx.fill();
    ctx.strokeStyle = '#5b3417'; ctx.lineWidth = 2.5; ctx.stroke();
    // cành
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -130); ctx.quadraticCurveTo(-80, -178, -120, -212);
    ctx.moveTo(10, -142); ctx.quadraticCurveTo(82, -194, 126, -224);
    ctx.stroke();
    // tán
    const blobs = [
      [-92, -208, 62, 52, '#4f9b36'], [0, -242, 78, 62, '#5dab3e'],
      [92, -212, 58, 48, '#4a9131'], [-40, -180, 66, 50, '#67b348'],
      [50, -174, 54, 44, '#5aa33b'], [132, -238, 36, 30, '#4c9434']
    ];
    blobs.forEach(([bx, by, rx, ry], i) => {
      drawCanopy(ctx, bx, by, rx, ry, i);
    });
    // quả
    const rnd = U.makeRand(55);
    for (let i = 0; i < 14; i++) {
      const ax = -110 + rnd() * 240;
      const ay = -260 + rnd() * 120;
      if (ready) {
        ctx.beginPath(); ctx.arc(ax, ay, 7.5, 0, TAU);
        const apple = ctx.createRadialGradient(ax - 3, ay - 3, 1, ax, ay, 9);
        apple.addColorStop(0, '#f28f68'); apple.addColorStop(1, '#b94136');
        ctx.fillStyle = apple; ctx.fill();
        ctx.strokeStyle = '#a52220'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(ax - 2, ay - 2, 1.8, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(ax, ay, 4, 0, TAU);
        ctx.fillStyle = '#8ab84e'; ctx.fill();
      }
    }
    // rễ, cỏ
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -5); ctx.quadraticCurveTo(-38, 2, -62, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -5); ctx.quadraticCurveTo(40, 2, 64, 16); ctx.stroke();
    ctx.restore();
  }

  function drawBasket(ctx, x, y, full) {
    ctx.save();
    ctx.translate(x, y);
    U.ellipse(ctx, 0, 8, 52, 13, 'rgba(50,75,25,.2)');
    ctx.beginPath(); ctx.ellipse(0, -4, 52, 15, 0, 0, TAU);
    ctx.fillStyle = '#b88148'; ctx.fill();
    ctx.strokeStyle = '#7a4b22'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-52, -4); ctx.quadraticCurveTo(-38, 30, 0, 32);
    ctx.quadraticCurveTo(38, 30, 52, -4);
    ctx.strokeStyle = '#8a5b2e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,185,.4)'; ctx.lineWidth = 1.3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 12, -2); ctx.lineTo(i * 8, 26); ctx.stroke();
    }
    if (full) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(-24 + i * 12, -12 - (i % 2) * 7, 8, 0, TAU);
        ctx.fillStyle = '#e8483a'; ctx.fill();
        ctx.strokeStyle = '#a52220'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(-26 + i * 12, -14 - (i % 2) * 7, 1.8, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawLadder(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.08);
    ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(30, 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 6); ctx.lineTo(54, 146); ctx.stroke();
    ctx.strokeStyle = '#c99758'; ctx.lineWidth = 3.2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(1 + i * 4.2, 18 + i * 18); ctx.lineTo(26 + i * 4.2, 14 + i * 18); ctx.stroke();
    }
    ctx.restore();
  }

  /* =========================================================
     NỀN CHUNG
     ========================================================= */
  function drawBaseSky(ctx, t, colors) {
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, colors.sky1);
    g.addColorStop(0.7, colors.sky2);
    g.addColorStop(1, '#f2fbe0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 310);
    // mặt trời
    const sun = ctx.createRadialGradient(1050, 58, 4, 1050, 58, 130);
    sun.addColorStop(0, 'rgba(255,247,190,.9)');
    sun.addColorStop(0.45, 'rgba(255,231,150,.3)');
    sun.addColorStop(1, 'rgba(255,231,150,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(870, 0, 360, 240);
    // mây
    U.drawCloud(ctx, 200, 72, 1.0, .9);
    U.drawCloud(ctx, 600 + Math.sin(t * 0.02) * 8, 44, .7, .65);
    U.drawCloud(ctx, 1120, 116, .8, .6);
    // bóng cây xa
  }

  function drawHills(ctx, rnd, c1, c2) {
    // Pale ridges recede behind the more detailed near tree line.
    ctx.beginPath();
    ctx.moveTo(-30, 221);
    ctx.bezierCurveTo(180, 130, 270, 179, 410, 145);
    ctx.bezierCurveTo(610, 109, 730, 187, 920, 145);
    ctx.bezierCurveTo(1080, 112, 1190, 177, 1310, 150);
    ctx.lineTo(1310, 300); ctx.lineTo(-30, 300); ctx.closePath();
    ctx.fillStyle = '#d3dcc0'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-30, 262);
    ctx.bezierCurveTo(140, 170, 310, 222, 470, 188);
    ctx.bezierCurveTo(640, 154, 800, 220, 960, 188);
    ctx.bezierCurveTo(1110, 158, 1220, 210, 1310, 178);
    ctx.lineTo(1310, 320); ctx.lineTo(-30, 320); ctx.closePath();
    const g = ctx.createLinearGradient(0, 155, 0, 320);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i < 24; i++) {
      const x = 40 + i * 54 + rnd() * 22, y = 236 + Math.sin(i) * 9;
      const s = 16 + rnd() * 18;
      ctx.globalAlpha = .32;
      U.ellipse(ctx, x, y - s * .5, s * .7, s * .55, '#587d5c');
      U.ellipse(ctx, x + s * .4, y - s * .8, s * .5, s * .4, '#79955d');
      ctx.globalAlpha = 1;
    }
  }

  function createGrass(ctx, c1, c2) {
    const g = ctx.createLinearGradient(0, 230, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    return g;
  }

  // Deterministic texture is painted once; animation frames reuse the bitmap.
  const meadowLayers = new Map();
  function drawMeadow(ctx, seed) {
    if (!meadowLayers.has(seed)) {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d');
      const rnd = U.makeRand(seed + 73);
      const light = c.createRadialGradient(770, 325, 20, 770, 325, 570);
      light.addColorStop(0, 'rgba(255,243,190,.18)');
      light.addColorStop(1, 'rgba(255,243,190,0)');
      c.fillStyle = light; c.fillRect(0, 270, W, H - 270);
      for (let i = 0; i < 100; i++) {
        const x = rnd() * W, y = 280 + rnd() * 440;
        c.globalAlpha = .16 + rnd() * .16;
        U.drawGrassTuft(c, x, y, 1 + rnd() * 2, i % 2 ? '#526e42' : '#eef1c0');
      }
      for (let i = 0; i < 22; i++) {
        c.globalAlpha = .7;
        U.drawFlower(c, 20 + rnd() * 1240, 320 + rnd() * 380, .8 + rnd() * .65, i % 3 ? '#fff5dc' : '#e6bc86');
      }
      meadowLayers.set(seed, cv);
    }
    ctx.drawImage(meadowLayers.get(seed), 0, 0);
  }

  function drawCanopy(ctx, x, y, rx, ry, variant) {
    const leaf = ctx.createRadialGradient(x - rx * .4, y - ry * .55, 2, x, y, rx * 1.15);
    leaf.addColorStop(0, variant % 2 ? '#a8bf75' : '#b5c980');
    leaf.addColorStop(.5, variant % 2 ? '#789450' : '#839e59');
    leaf.addColorStop(1, '#486b48');
    U.ellipse(ctx, x, y, rx, ry, leaf);
    // Short leaf-shaped highlights break up the round silhouette.
    ctx.save();
    ctx.globalAlpha = .28;
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4 + variant;
      U.ellipse(ctx, x + Math.cos(a) * rx * .55, y + Math.sin(a) * ry * .55,
        rx * .12, ry * .065, '#eef1b8', -.4);
    }
    ctx.restore();
  }

  function drawButterflies(ctx, t) {
    for (let i = 0; i < 3; i++) {
      const x = 400 + Math.cos(t * .3 + i * 2.1) * 230;
      const y = 360 + Math.sin(t * .5 + i * 1.7) * 80;
      const flap = Math.abs(Math.sin(t * 8 + i));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i === 1 ? '#8ed7ff' : '#ffd34f';
      ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.ellipse(-3, -2, 3.5, 6.5 * (.4 + flap), -.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, -2, 3.5, 6.5 * (.4 + flap), .5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawVignette(ctx) {
    const vg = ctx.createRadialGradient(640, 350, 280, 640, 350, 760);
    vg.addColorStop(0, 'rgba(255,245,190,0)');
    vg.addColorStop(1, 'rgba(47,68,48,.10)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* =========================================================
     HIT TEST
     ========================================================= */
  function hit(area, x, y, data) {
    if (area === 'animals') {
      const ids = ['cow', 'hen1', 'hen2'];
      for (const id of ids) {
        const p = ANIMAL_POS[id];
        const isCow = p.type === 'cow';
        const hw = isCow ? 76 : 36;
        const top = isCow ? 132 : 72;
        if (x > p.x - hw && x < p.x + hw && y > p.y - top && y < p.y + 10) {
          return { kind: 'animal', id };
        }
      }
    } else if (area === 'fishing') {
      if (((x - 690) / 500) ** 2 + ((y - 465) / 220) ** 2 < 1) return { kind: 'water' };
    } else if (area === 'orchard') {
      const p = ORCHARD.tree;
      if (x > p.x - 130 && x < p.x + 145 && y > p.y - 300 && y < p.y + 10) return { kind: 'tree' };
    }
    return null;
  }

  window.AREAS = { draw, hit, ANIMAL_POS, ORCHARD };
})();
