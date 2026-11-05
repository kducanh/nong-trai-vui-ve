/* Public square: one queue and one playback clock for everyone in the room. */
(() => {
  'use strict';

  const $ = id => document.getElementById('plaza' + id);
  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
  const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
  const PRIVATE_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);
  let room = null;
  let departure = null;

  function youtubeId(input) {
    const value = String(input || '').trim();
    if (VIDEO_ID.test(value)) return value;
    if (!value || /[\s\\]/.test(value)) return null;
    let url;
    try { url = new URL(value.includes('://') ? value : 'https://' + value); } catch { return null; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const path = url.pathname.replace(/\/$/, '');
    let id = null;
    if (url.hostname === 'youtu.be' && /^\/[^/]+$/.test(path)) id = path.slice(1);
    if (YOUTUBE_HOSTS.has(url.hostname)) {
      if (path === '/watch') id = url.searchParams.get('v');
      else id = path.match(/^\/(?:shorts|live|embed)\/([^/]+)$/)?.[1];
    }
    if (PRIVATE_HOSTS.has(url.hostname)) id = path.match(/^\/embed\/([^/]+)$/)?.[1];
    return VIDEO_ID.test(id || '') ? id : null;
  }

  function text(el, value) {
    const next = String(value);
    if (el.textContent !== next) el.textContent = next;
  }

  function show(el, visible) {
    el.hidden = !visible;
    el.classList.toggle('hidden', !visible);
  }

  async function fetchJSON(url, init, signal, timeout) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, timeout);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Yêu cầu chưa thực hiện được.');
      return data;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
  }

  function api(r, path = '', body) {
    const init = { credentials: 'same-origin', cache: 'no-store' };
    if (body !== undefined) Object.assign(init, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return fetchJSON('/api/plaza' + path, init, r.controller.signal, 10000);
  }

  function message(error) {
    if (error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError) {
      return 'Chưa kết nối được quảng trường. Hãy thử lại.';
    }
    return error.message || 'Yêu cầu chưa thực hiện được. Hãy thử lại.';
  }

  function updateControls(r) {
    const current = r.snapshot?.now;
    const votes = r.snapshot?.skipVotes || 0;
    const needed = r.snapshot?.skipNeeded || 1;
    $('Add').disabled = !r.snapshot || r.adding;
    $('Skip').disabled = !current || r.skipping || !!r.snapshot?.voted;
    text($('Skip'), r.snapshot?.voted ? `Đã bỏ phiếu · ${votes}/${needed}` : current ? `Bỏ qua · ${votes}/${needed}` : 'Bỏ qua');
    $('Live').disabled = !r.movie?.ready;
    show($('Retry'), !!(r.connection || r.movie?.failed || r.movie?.autoplayBlocked));
    const feedback = Date.now() - r.feedbackAt < 6500 ? r.feedback : '';
    text($('Status'), [feedback, r.connection, r.movie?.note].filter(Boolean).join(' '));
  }

  function feedback(r, value) {
    r.feedback = value;
    r.feedbackAt = Date.now();
    updateControls(r);
  }

  function renderQueue(r, queue) {
    const key = JSON.stringify(queue);
    if (key === r.queueKey) return;
    r.queueKey = key;
    text($('QueueCount'), queue.length);
    const rows = queue.map(entry => {
      const li = document.createElement('li');
      const title = document.createElement('strong');
      const author = document.createElement('small');
      title.textContent = entry.title || 'Video YouTube';
      author.textContent = entry.addedBy || 'Khách';
      li.append(title, author);
      return li;
    });
    if (!rows.length) {
      const empty = document.createElement('li');
      empty.className = 'plaza-queue-empty';
      empty.textContent = 'Chưa có video trong hàng chờ.';
      rows.push(empty);
    }
    $('Queue').replaceChildren(...rows);
  }

  function loadYouTube(signal) {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      const previous = window.onYouTubeIframeAPIReady;
      const finish = (error) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
        tag.onerror = null;
        tag.remove();
        if (error) reject(error);
        else resolve(window.YT);
      };
      const ready = () => {
        try { if (typeof previous === 'function') previous(); }
        finally { finish(window.YT?.Player ? null : new Error('YouTube chưa sẵn sàng.')); }
      };
      const cancel = () => finish(new Error('Đã rời trình phát.'));
      const timer = setTimeout(() => finish(new Error('YouTube phản hồi quá chậm.')), 12000);
      if (signal.aborted) { cancel(); return; }
      signal.addEventListener('abort', cancel, { once: true });
      window.onYouTubeIframeAPIReady = ready;
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => finish(new Error('Không tải được trình phát YouTube.'));
      document.head.appendChild(tag);
    });
  }

  function isCurrent(r, movie) { return room === r && r.movie === movie; }

  function releasePlayer(movie) {
    clearTimeout(movie.timer);
    movie.controller.abort();
    movie.ready = false;
    if (movie.player) {
      try { movie.player.destroy(); } catch { /* Removing the iframe also stops playback. */ }
      movie.player = null;
    }
    $('PlayerMount').replaceChildren();
  }

  function stopMovie(r) {
    const previous = r.movie;
    r.movie = null;
    if (previous) releasePlayer(previous);
    show($('Placeholder'), true);
  }

  function failMovie(r, movie, reason) {
    if (!isCurrent(r, movie) || movie.failed) return;
    movie.failed = true;
    movie.note = reason + ' Bạn có thể thử lại, mở trên YouTube hoặc bỏ phiếu bỏ qua.';
    releasePlayer(movie);
    show($('Placeholder'), true);
    updateControls(r);
  }

  function elapsed(r, movie) {
    return Math.max(0, (Date.now() + r.clockOffset - movie.track.startedAt) / 1000);
  }

  async function reportEnded(r, movie, duration) {
    if (!Number.isFinite(duration) || duration <= 0 || movie.ending || elapsed(r, movie) + .5 < duration) return;
    movie.ending = true;
    const seq = ++r.sequence;
    try {
      const data = await api(r, '/ended', { id: movie.track.id, duration });
      if (room === r) applySnapshot(r, data, seq);
    } catch (error) {
      if (!isCurrent(r, movie)) return;
      movie.ending = false;
      feedback(r, message(error));
    }
  }

  function sync(r, movie, userGesture = false) {
    if (!movie?.ready || !movie.player || movie.failed) return;
    const player = movie.player;
    const pos = elapsed(r, movie);
    const duration = player.getDuration();
    const target = duration > 0 ? Math.min(pos, Math.max(0, duration - .4)) : pos;
    const state = player.getPlayerState();
    if (state === 0 && !userGesture) { reportEnded(r, movie, duration); return; }
    if (userGesture) {
      player.seekTo(target, true);
      player.playVideo();
      movie.lastSeek = Date.now();
    } else if (state === 1 && Date.now() - movie.lastSeek > 6000 && Math.abs(player.getCurrentTime() - target) > 3) {
      player.seekTo(target, true);
      movie.lastSeek = Date.now();
    }
  }

  async function startMovie(r, track) {
    stopMovie(r);
    const movie = {
      track, controller: new AbortController(), player: null, ready: false, failed: false,
      ending: false, autoplayBlocked: false, lastSeek: 0, note: 'Đang kết nối với YouTube…'
    };
    r.movie = movie;
    updateControls(r);
    try {
      const YT = await loadYouTube(movie.controller.signal);
      if (!isCurrent(r, movie)) return;
      const iframe = document.createElement('iframe');
      iframe.title = track.title || 'Video YouTube của quảng trường';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.width = '100%';
      iframe.height = '100%';
      const src = new URL('https://www.youtube-nocookie.com/embed/' + track.videoId);
      src.search = new URLSearchParams({
        enablejsapi: '1', origin: location.origin, controls: '1', playsinline: '1',
        start: String(Math.floor(elapsed(r, movie)))
      });
      iframe.src = src.href;
      $('PlayerMount').replaceChildren(iframe);
      show($('Placeholder'), false);
      movie.timer = setTimeout(() => failMovie(r, movie, 'Trình phát YouTube chưa phản hồi.'), 12000);
      movie.player = new YT.Player(iframe, {
        host: 'https://www.youtube-nocookie.com', videoId: track.videoId,
        events: {
          onReady(event) {
            if (!isCurrent(r, movie) || movie.failed) return;
            clearTimeout(movie.timer);
            movie.player = event.target;
            movie.ready = true;
            movie.note = 'Bấm phát trên video nếu trình duyệt đang chờ thao tác.';
            sync(r, movie, true);
            updateControls(r);
          },
          onStateChange(event) {
            if (!isCurrent(r, movie) || !movie.ready || movie.failed) return;
            if (event.data === 0) reportEnded(r, movie, event.target.getDuration());
            if (event.data === 1) {
              movie.note = '';
              movie.autoplayBlocked = false;
            }
            if (event.data === 2 && !movie.autoplayBlocked) movie.note = 'Đã tạm dừng trên máy của bạn.';
            updateControls(r);
          },
          onAutoplayBlocked() {
            if (!isCurrent(r, movie) || movie.failed) return;
            movie.autoplayBlocked = true;
            movie.note = 'Trình duyệt đang chặn tự phát. Bấm phát trên video hoặc bấm Xem cùng phòng.';
            updateControls(r);
          },
          onError(event) {
            const reason = {
              100: 'Video đã bị xóa hoặc đặt riêng tư.',
              101: 'Chủ video đã tắt phát nhúng.', 150: 'Chủ video đã tắt phát nhúng.',
              153: 'YouTube không xác thực được trang nhúng.'
            }[event.data] || 'YouTube không phát được video này.';
            failMovie(r, movie, reason);
          }
        }
      });
    } catch (error) {
      failMovie(r, movie, error.message || 'Không tải được trình phát YouTube.');
    }
  }

  function applySnapshot(r, data, seq, sentAt = Date.now()) {
    if (room !== r || !Number.isFinite(data.serverTime) || !Array.isArray(data.queue)) return;
    const previousTime = r.snapshot?.serverTime ?? 0;
    if (data.serverTime < previousTime || (data.serverTime === previousTime && seq < r.applied)) return;
    r.snapshot = data;
    r.applied = seq;
    r.clockOffset = data.serverTime - (sentAt + Date.now()) / 2;
    r.connection = '';
    const track = VIDEO_ID.test(data.now?.videoId || '') ? data.now : null;
    text($('NowTitle'), track?.title || (track ? 'Video YouTube' : 'Chưa có video đang phát'));
    text($('NowBy'), track ? 'Đề xuất bởi ' + (track.addedBy || 'Khách') : '');
    text($('Online'), data.online || 0);
    renderQueue(r, data.queue);
    const link = $('WatchLink');
    if (track) {
      link.href = 'https://www.youtube.com/watch?v=' + track.videoId;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else link.removeAttribute('href');
    show(link, !!track);
    if (!track) stopMovie(r);
    else if (r.movie?.track.id !== track.id || r.movie.track.videoId !== track.videoId) startMovie(r, track);
    else sync(r, r.movie);
    updateControls(r);
  }

  async function refresh(r) {
    if (room !== r || r.reading) return;
    r.reading = true;
    const sentAt = Date.now();
    const seq = ++r.sequence;
    try { applySnapshot(r, await api(r), seq, sentAt); }
    catch (error) {
      if (room === r && seq >= r.applied) { r.connection = message(error); updateControls(r); }
    } finally { r.reading = false; }
  }

  async function addVideo(r) {
    const input = $('Input');
    const id = youtubeId(input.value);
    if (!id) { feedback(r, 'Hãy nhập liên kết hoặc mã video YouTube hợp lệ.'); input.focus(); return; }
    if (r.adding || !r.snapshot) return;
    r.adding = true;
    updateControls(r);
    try {
      const watch = 'https://www.youtube.com/watch?v=' + id;
      let title = 'Video YouTube ' + id;
      try {
        const meta = await fetchJSON('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watch),
          { credentials: 'omit' }, r.controller.signal, 1800);
        if (typeof meta.title === 'string' && meta.title.trim()) title = meta.title.trim().slice(0, 120);
      } catch { /* The queue also accepts an ID when metadata is unavailable. */ }
      if (room !== r) return;
      const seq = ++r.sequence;
      const data = await api(r, '/queue', { videoId: id, title });
      if (room !== r) return;
      if (youtubeId(input.value) === id) input.value = '';
      applySnapshot(r, data, seq);
      feedback(r, 'Đã thêm video vào quảng trường.');
    } catch (error) { if (room === r) feedback(r, message(error)); }
    finally { r.adding = false; if (room === r) updateControls(r); }
  }

  async function skip(r) {
    const id = r.snapshot?.now?.id;
    if (id == null || r.skipping || r.snapshot.voted) return;
    r.skipping = true;
    updateControls(r);
    try {
      const seq = ++r.sequence;
      const data = await api(r, '/skip', { id });
      if (room === r) { applySnapshot(r, data, seq); feedback(r, 'Đã ghi nhận phiếu bỏ qua.'); }
    } catch (error) { if (room === r) feedback(r, message(error)); }
    finally { r.skipping = false; if (room === r) updateControls(r); }
  }

  function retry(r) {
    if (r.connection) refresh(r);
    if (r.movie?.failed) startMovie(r, r.movie.track);
    else if (r.movie?.autoplayBlocked) sync(r, r.movie, true);
  }

  function enter() {
    if (room) return;
    const r = {
      controller: new AbortController(), sequence: 0, applied: 0, snapshot: null,
      movie: null, reading: false, adding: false, skipping: false, feedbackAt: 0, connection: ''
    };
    room = r;
    show($('Placeholder'), true);
    show($('WatchLink'), false);
    $('WatchLink').removeAttribute('href');
    text($('NowTitle'), 'Đang vào quảng trường…');
    text($('NowBy'), '');
    text($('Online'), '…');
    renderQueue(r, []);
    updateControls(r);
    const listen = { signal: r.controller.signal };
    $('Form').addEventListener('submit', event => { event.preventDefault(); addVideo(r); }, listen);
    $('Skip').addEventListener('click', () => skip(r), listen);
    $('Live').addEventListener('click', () => sync(r, r.movie, true), listen);
    $('Retry').addEventListener('click', () => retry(r), listen);
    // A quick return must rejoin after the previous presence removal reaches the server.
    Promise.resolve(departure).then(() => {
      if (room !== r) return;
      refresh(r);
      r.timer = setInterval(() => refresh(r), 3000);
    });
  }

  function leave() {
    const r = room;
    if (!r) return;
    room = null;
    clearInterval(r.timer);
    r.controller.abort();
    stopMovie(r);
    departure = fetch('/api/plaza/leave', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: '{}', keepalive: true, signal: AbortSignal.timeout(4500)
    }).catch(() => {});
  }

  let restoreAfterBack = false;
  window.addEventListener('pagehide', event => { restoreAfterBack = event.persisted && !!room; leave(); });
  window.addEventListener('pageshow', () => { if (restoreAfterBack) { restoreAfterBack = false; enter(); } });
  window.Plaza = { enter, leave, youtubeId };
})();

