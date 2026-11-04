/* =========================================================
   Âm thanh — nhạc nền mộc mạc + hiệu ứng tổng hợp bằng WebAudio
   Không dùng file ngoài, tất cả được tạo tại chỗ.
   ========================================================= */
(function () {
  'use strict';
  const A = window.GameAudio = {
    ctx: null,
    soundOn: true,
    musicOn: true,
    ready: false
  };

  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noiseBuf = null;
  let musicTimer = null;
  let nextNoteTime = 0;
  let step = 0;
  let startedMusic = false;

  const MELODY = [
    72, 0, 76, 79, 76, 0, 74, 72,
    69, 0, 72, 76, 74, 72, 67, 0,
    72, 0, 76, 79, 81, 0, 79, 76,
    74, 0, 72, 69, 67, 0, 64, 0
  ];
  const BASS = [48, 43, 45, 43, 48, 45, 41, 43];
  const STEP = 0.44;

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
    } catch (e) { return; }
    master = A.ctx.createGain();
    master.gain.value = 0.85;
    master.connect(A.ctx.destination);

    musicBus = A.ctx.createGain();
    musicBus.gain.value = A.musicOn ? 0.16 : 0;
    musicBus.connect(master);

    sfxBus = A.ctx.createGain();
    sfxBus.gain.value = A.soundOn ? 0.5 : 0;
    sfxBus.connect(master);

    // buffer nhiễu
    const len = A.ctx.sampleRate * 1.2;
    noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    A.ready = true;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (A.musicOn) startMusic();
  };

  A.resume = function () {
    if (!A.ctx) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
  };

  A.setSound = function (on) {
    A.soundOn = !!on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.5 : 0, A.ctx.currentTime, 0.03);
  };
  A.setMusic = function (on) {
    A.musicOn = !!on;
    if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.16 : 0, A.ctx.currentTime, 0.1);
    if (on) startMusic();
    else stopMusic();
  };
  A.toggle = function () {
    A.setSound(!A.soundOn);
    A.setMusic(A.soundOn && A.musicOn);
    return A.soundOn;
  };

  /* ---------------- nhạc nền ---------------- */
  function startMusic() {
    if (!A.ctx || !A.musicOn || startedMusic) return;
    startedMusic = true;
    nextNoteTime = A.ctx.currentTime + 0.08;
    step = 0;
    musicTimer = setInterval(scheduleMusic, 90);
  }
  function stopMusic() {
    startedMusic = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }
  function scheduleMusic() {
    if (!A.ctx || !A.musicOn) return;
    while (nextNoteTime < A.ctx.currentTime + 0.28) {
      const note = MELODY[step % MELODY.length];
      if (note) {
        pluck(note, nextNoteTime, 0.9, step % 4 === 0 ? 0.13 : 0.09);
        if (step % 4 === 2) pluck(note + 12, nextNoteTime + 0.015, 0.35, 0.03);
      }
      if (step % 8 === 0) {
        const b = BASS[Math.floor(step / 8) % BASS.length];
        bass(b, nextNoteTime, 2.9, 0.11);
        pad(b + 12, nextNoteTime, 2.7, 0.035);
        pad(b + 19, nextNoteTime, 2.7, 0.022);
      }
      step++;
      nextNoteTime += STEP;
    }
  }
  function pluck(midi, when, dur, vol) {
    if (!A.ctx) return;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = A.ctx.createOscillator();
    const o2 = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    const ftr = A.ctx.createBiquadFilter();
    ftr.type = 'lowpass';
    ftr.frequency.value = 2400;
    o.type = 'triangle';
    o.frequency.value = f;
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    const g2 = A.ctx.createGain();
    g2.gain.value = 0.18;
    o.connect(ftr); o2.connect(g2); g2.connect(ftr); ftr.connect(g);
    g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.start(when); o2.start(when);
    o.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
  }
  function bass(midi, when, dur, vol) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.start(when); o.stop(when + dur + 0.05);
  }
  function pad(midi, when, dur, vol) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    const ftr = A.ctx.createBiquadFilter();
    ftr.type = 'lowpass';
    ftr.frequency.value = 900;
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(ftr); ftr.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.start(when); o.stop(when + dur + 0.05);
  }

  /* ---------------- SFX ---------------- */
  function tone(freq, dur, type, vol, when, slideTo) {
    if (!A.ctx) return;
    const t = (when || 0) + A.ctx.currentTime;
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, when, type, freq, to) {
    if (!A.ctx || !noiseBuf) return;
    const t = (when || 0) + A.ctx.currentTime;
    const src = A.ctx.createBufferSource();
    src.buffer = noiseBuf;
    const ftr = A.ctx.createBiquadFilter();
    ftr.type = type || 'bandpass';
    ftr.frequency.setValueAtTime(freq || 1000, t);
    if (to) ftr.frequency.exponentialRampToValueAtTime(to, t + dur);
    ftr.Q.value = 0.9;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(ftr); ftr.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.03);
  }

  const sfx = {
    click() { tone(520, 0.05, 'triangle', 0.12); },
    open() { tone(620, 0.08, 'sine', 0.1, 0, 880); },
    close() { tone(420, 0.08, 'sine', 0.09, 0, 300); },
    plant() {
      tone(300, 0.12, 'sine', 0.16, 0, 540);
      noise(0.12, 0.05, 0, 'lowpass', 900, 300);
    },
    till() {
      noise(0.16, 0.16, 0, 'lowpass', 700, 200);
      tone(130, 0.12, 'triangle', 0.1, 0.01, 90);
    },
    water() {
      noise(0.45, 0.12, 0, 'bandpass', 1800, 500);
      tone(880, 0.1, 'sine', 0.05, 0.08, 1200);
      tone(1200, 0.08, 'sine', 0.035, 0.18, 1500);
    },
    harvest() {
      tone(523, 0.12, 'triangle', 0.14);
      tone(659, 0.14, 'triangle', 0.13, 0.08);
      tone(784, 0.22, 'triangle', 0.12, 0.16);
      noise(0.08, 0.04, 0.02, 'highpass', 2000);
    },
    coin() {
      tone(1046, 0.08, 'triangle', 0.1);
      tone(1318, 0.16, 'triangle', 0.11, 0.06);
    },
    sell() {
      tone(784, 0.07, 'triangle', 0.1);
      tone(988, 0.09, 'triangle', 0.1, 0.05);
      tone(1318, 0.18, 'triangle', 0.09, 0.11);
    },
    error() { tone(170, 0.18, 'sawtooth', 0.09, 0, 120); },
    level() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, i * 0.1));
      noise(0.5, 0.04, 0.1, 'highpass', 3000);
    },
    feed() {
      tone(220, 0.16, 'triangle', 0.12, 0, 180);
      noise(0.1, 0.06, 0.05, 'lowpass', 800);
    },
    collect() {
      tone(740, 0.1, 'sine', 0.1);
      tone(988, 0.16, 'sine', 0.09, 0.07);
    },
    moo() {
      tone(130, 0.55, 'sawtooth', 0.06, 0, 88);
      tone(195, 0.45, 'sine', 0.04, 0.04, 140);
      noise(0.3, 0.02, 0.05, 'lowpass', 500);
    },
    cluck() {
      tone(640, 0.07, 'square', 0.055);
      tone(780, 0.06, 'square', 0.045, 0.09);
    },
    splash() {
      noise(0.35, 0.16, 0, 'lowpass', 1400, 350);
      tone(300, 0.12, 'sine', 0.08, 0.03, 160);
    },
    fish() {
      tone(523, 0.1, 'triangle', 0.12);
      tone(784, 0.18, 'triangle', 0.11, 0.08);
      noise(0.2, 0.08, 0, 'highpass', 900);
    },
    gift() {
      [659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'sine', 0.1, i * 0.08));
    },
    levelup() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.11));
      tone(262, 0.6, 'sine', 0.1, 0);
    },
    pop() { tone(560, 0.06, 'sine', 0.1, 0, 760); },
    shake() { noise(0.25, 0.08, 0, 'bandpass', 1000, 400); }
  };

  A.sfx = function (name) {
    if (!A.ctx || !A.soundOn) return;
    A.resume();
    const fn = sfx[name];
    if (fn) {
      try { fn(); } catch (e) { /* bỏ qua lỗi âm thanh */ }
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (!A.ctx) return;
    if (document.hidden) {
      stopMusic();
      if (A.ctx.state === 'running') A.ctx.suspend();
    } else {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      if (A.musicOn && A.soundOn) startMusic();
    }
  });
})();
