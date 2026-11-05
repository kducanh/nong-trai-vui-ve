/* =========================================================
   Tài khoản, bạn bè thật, tin nhắn
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('vi-VN');
  const THEME_EMOJI = { peach: '🧑‍🌾', mint: '👩‍🌾', lavender: '👵' };

  let me = null;
  let social = { friends: [], incoming: [], outgoing: [], unread: 0 };
  let overlay = null;
  let chatWith = null;
  let chatMessages = [];
  let chatPoll = null;
  let socialPoll = null;
  let heartbeat = null;
  let authTab = 'login';
  let view = 'profile';
  let busy = false;
  let socialInitialized = false;

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || `Lỗi ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    let el = $('#accountToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'accountToast';
      el.className = 'account-toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.className = 'account-toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'account-toast'; }, 3200);
  }

  function avatar(theme) { return THEME_EMOJI[theme] || '🌱'; }
  function timeAgo(ts) {
    if (!ts) return '—';
    const d = Date.now() - ts;
    if (d < 60_000) return 'vừa xong';
    if (d < 3_600_000) return Math.floor(d / 60_000) + ' phút trước';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + ' giờ trước';
    return Math.floor(d / 86_400_000) + ' ngày trước';
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'accountOverlay';
    overlay.className = 'account-overlay hidden';
    overlay.innerHTML = `<div class="account-panel" role="dialog" aria-modal="true" aria-label="Tài khoản và bạn bè">
      <button class="account-close" data-acc-close aria-label="Đóng">×</button>
      <div id="accountContent"></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-acc-close]')) close();
    });
    overlay.addEventListener('click', onOverlayClick);
    overlay.addEventListener('submit', onSubmit);
    return overlay;
  }

  function open(tab = '') {
    ensureOverlay();
    overlay.classList.remove('hidden');
    document.dispatchEvent(new Event('account-visibility'));
    view = 'profile';
    if (!me) authTab = tab === 'register' ? 'register' : 'login';
    render();
  }
  function close() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.dispatchEvent(new Event('account-visibility'));
    stopChatPoll();
  }

  function updateTopbar() {
    const label = $('#accountLabel');
    const dot = $('#accountDot');
    const startBtn = $('#startAccountBtn');
    if (label) {
      label.textContent = me ? 'Tài khoản' : 'Đăng nhập';
      label.title = me ? `@${me.username}` : 'Đăng nhập / Đăng ký';
    }
    if (dot) {
      const has = me && ((social.incoming || []).length > 0 || social.unread > 0);
      dot.classList.toggle('hidden', !has);
      dot.title = has ? 'Có lời mời hoặc tin nhắn mới' : '';
    }
    if (startBtn) {
      startBtn.textContent = me ? `👤 ${me.displayName || me.username} · Tài khoản` : '👤 Đăng nhập / Đăng ký tài khoản';
    }
    const startNote = $('.start-note');
    if (startNote) startNote.textContent = me ? 'Đã đồng bộ tài khoản · Tiến trình lưu trên máy chủ' : 'Không cần cài đặt · Tự động lưu trên máy của bạn';
    const accountBtn = $('#accountBtn');
    if (accountBtn) accountBtn.classList.toggle('logged-in', !!me);
  }

  function socialStats() {
    const online = (social.friends || []).filter(f => f.online).length;
    return { friends: (social.friends || []).length, online, incoming: (social.incoming || []).length, unread: social.unread || 0 };
  }

  function render() {
    ensureOverlay();
    const box = $('#accountContent');
    if (!me) { box.innerHTML = authHTML(); return; }
    if (chatWith) { box.innerHTML = chatHTML(); return; }
    if (view === 'settings') { box.innerHTML = settingsHTML(); return; }
    const st = socialStats();
    const friends = social.friends || [];
    const incoming = social.incoming || [];
    const outgoing = social.outgoing || [];
    box.innerHTML = `
      <div class="account-head">
        <div class="account-avatar">${avatar(me.theme)}</div>
        <div class="account-head-copy">
          <small>TÀI KHOẢN NÔNG TRẠI</small>
          <h1>${esc(me.displayName)} ${me.role === 'admin' ? '<span class="role-badge">ADMIN</span>' : ''}</h1>
          <p>@${esc(me.username)} • Thành viên từ ${new Date(me.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        <div class="account-head-actions">
          ${me.role === 'admin' ? `<a class="account-btn2 ghost" href="/admin.html" target="_blank" rel="noopener">🛡️ Quản trị</a>` : ''}
          <button class="account-btn2 ghost" data-settings>⚙️ Cài đặt</button>
          <button class="account-btn2 ghost" data-acc-refresh>↻ Làm mới</button>
        </div>
      </div>
      <div class="acc-stats">
        <div class="acc-stat"><small>Bạn bè</small><b>${st.friends}</b><span>${st.online} đang online</span></div>
        <div class="acc-stat"><small>Lời mời</small><b>${st.incoming}</b><span>đang chờ bạn</span></div>
        <div class="acc-stat"><small>Tin nhắn mới</small><b>${st.unread}</b><span>chưa đọc</span></div>
        <div class="acc-stat"><small>Trạng thái</small><b>Online</b><span>đã kết nối máy chủ</span></div>
      </div>

      <div class="acc-section">
        <div class="acc-section-head"><h2>Tìm và kết bạn</h2><small>Nhập đúng tên tài khoản</small></div>
        <div class="acc-friend-search">
          <input id="friendUsername" maxlength="24" placeholder="Ví dụ: lan_nguyen">
          <button class="account-btn2 primary" data-add-friend>Gửi lời mời</button>
        </div>
        <div id="friendSearchMsg" class="acc-search-msg"></div>
        ${outgoing.length ? `<div class="pending-note">Đã gửi lời mời: ${outgoing.map(o => '@' + esc(o.to.username)).join(', ')}</div>` : ''}
      </div>

      ${incoming.length ? `<div class="acc-section">
        <div class="acc-section-head"><h2>Lời mời kết bạn</h2><small>${incoming.length} lời mời</small></div>
        <div class="request-list">${incoming.map(r => `
          <div class="request-row">
            <div class="fr-avatar">${avatar(r.from.theme)}</div>
            <div class="fr-copy"><b>${esc(r.from.displayName)}</b><small>@${esc(r.from.username)} • ${timeAgo(r.createdAt)}</small></div>
            <div class="req-actions">
              <button class="account-btn2 primary small" data-resp="${r.id}" data-accept="1">Đồng ý</button>
              <button class="account-btn2 ghost small" data-resp="${r.id}" data-accept="0">Từ chối</button>
            </div>
          </div>`).join('')}</div>
      </div>` : ''}

      <div class="acc-section">
        <div class="acc-section-head"><h2>Bạn bè của bạn</h2><small>${friends.length} người</small></div>
        <div class="friend-list">
          ${friends.length ? friends.map(f => `
            <div class="friend-row">
              <div class="fr-avatar">${avatar(f.theme)}</div>
              <div class="fr-copy"><b>${esc(f.displayName)} ${f.online ? '<span class="acc-badge">online</span>' : ''}</b><small>@${esc(f.username)} • Cấp ${f.level} • ${f.friendship || 0} điểm thân thiết</small></div>
              <div class="fr-status ${f.online ? 'online' : ''}" title="${f.online ? 'Đang online' : 'Offline'}"></div>
              <div class="fr-actions">
                <button class="account-btn2 primary small" data-visit="${f.id}">Thăm vườn</button>
                <button class="account-btn2 ghost small" data-chat="${f.id}">Chat</button>
                <button class="account-btn2 ghost small" data-remove="${f.id}" title="Xóa bạn">✕</button>
              </div>
            </div>`).join('') : `<div class="fr-empty">Chưa có bạn bè. Hãy gửi lời mời bằng tên tài khoản ở trên — khi họ đồng ý, hai bạn có thể thăm vườn, tưới cây và chat.</div>`}
        </div>
      </div>

      <div class="acc-logout-row">
        <span class="guest-note">Tiến trình được lưu trên máy chủ khi đăng nhập.</span>
        <button class="account-btn2 danger" data-logout>Đăng xuất</button>
      </div>`;
  }

  function authHTML() {
    return `
      <div class="account-head">
        <div class="account-avatar">🌱</div>
        <div class="account-head-copy">
          <small>KẾT NỐI MỌI NGƯỜI</small>
          <h1>Tài khoản nông trại</h1>
          <p>Đăng nhập để lưu tiến trình trên máy chủ, kết bạn và ghé thăm vườn thật.</p>
        </div>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab ${authTab === 'login' ? 'active' : ''}" data-auth-tab="login">Đăng nhập</button>
        <button class="auth-tab ${authTab === 'register' ? 'active' : ''}" data-auth-tab="register">Tạo tài khoản</button>
      </div>
      <form class="auth-form" data-auth-form="${authTab}">
        <label>Tên tài khoản
          <input name="username" maxlength="24" autocomplete="username" required placeholder="3-24 ký tự, chữ/số/gạch dưới">
        </label>
        ${authTab === 'register' ? `<label>Tên hiển thị
          <input name="displayName" maxlength="30" autocomplete="nickname" required placeholder="Tên bạn muốn mọi người thấy">
        </label>` : ''}
        <label>Mật khẩu
          <input name="password" type="password" minlength="8" maxlength="72" autocomplete="${authTab === 'register' ? 'new-password' : 'current-password'}" required placeholder="Ít nhất 8 ký tự">
        </label>
        ${authTab === 'register' ? `<label>Nhập lại mật khẩu
          <input name="password2" type="password" minlength="8" maxlength="72" autocomplete="new-password" required placeholder="Nhập lại mật khẩu">
        </label>` : ''}
        <div class="auth-error" data-auth-error></div>
        <button class="account-btn2 primary auth-submit" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Đang xử lý...' : authTab === 'register' ? 'Tạo tài khoản & đăng nhập' : 'Đăng nhập'}</button>
      </form>
      <p class="auth-note">Tài khoản dùng để kết nối bạn bè. Mật khẩu được băm bằng scrypt trên máy chủ, không lưu dạng chữ thường. Bạn vẫn có thể chơi khách nếu chưa muốn đăng ký.</p>
      <div class="guest-note">🔒 Không chia sẻ mật khẩu cho người khác.</div>`;
  }

  function chatHTML() {
    const f = chatWith;
    if (!f) return '';
    return `
      <div class="chat-view">
        <div class="chat-head">
          <button class="account-btn2 ghost small" data-chat-back>←</button>
          <div class="fr-avatar">${avatar(f.theme)}</div>
          <div><b>${esc(f.displayName)}</b><small>@${esc(f.username)} • ${f.online ? 'đang online' : 'offline'}</small></div>
        </div>
        <div class="chat-log" id="chatLog">
          ${chatMessages.length ? chatMessages.map(m => `<div class="chat-msg ${m.mine ? 'mine' : 'theirs'}">${esc(m.body)}<small>${new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : `<div class="chat-empty">Chưa có tin nhắn. Gửi lời chào đầu tiên nhé!</div>`}
        </div>
        <form class="chat-compose" data-chat-form>
          <input name="text" maxlength="500" placeholder="Nhập tin nhắn..." autocomplete="off">
          <button class="account-btn2 primary" type="submit">Gửi</button>
        </form>
        <div class="auth-note">Tin nhắn được lưu trên máy chủ và chỉ bạn bè mới xem được.</div>
      </div>`;
  }

  function settingsHTML() {
    return `
      <div class="chat-head">
        <button class="account-btn2 ghost small" data-settings-back>←</button>
        <div class="fr-avatar">⚙️</div>
        <div><b>Cài đặt tài khoản</b><small>@${esc(me.username)} • ${esc(me.displayName)}</small></div>
      </div>
      <div class="acc-section">
        <div class="acc-section-head"><h2>Hồ sơ hiển thị</h2><small>Mọi người sẽ thấy tên này</small></div>
        <form class="auth-form" data-profile-form>
          <label>Tên hiển thị
            <input name="displayName" maxlength="30" required value="${esc(me.displayName)}">
          </label>
          <label>Bảng màu
            <select name="theme" class="acc-select">
              <option value="peach" ${me.theme === 'peach' ? 'selected' : ''}>Đào ấm</option>
              <option value="mint" ${me.theme === 'mint' ? 'selected' : ''}>Bạc hà</option>
              <option value="lavender" ${me.theme === 'lavender' ? 'selected' : ''}>Oải hương</option>
            </select>
          </label>
          <div class="auth-error" data-profile-error></div>
          <button class="account-btn2 primary" type="submit">Lưu hồ sơ</button>
        </form>
      </div>
      <div class="acc-section">
        <div class="acc-section-head"><h2>Đổi mật khẩu</h2><small>Đăng xuất các thiết bị khác</small></div>
        <form class="auth-form" data-password-form>
          <label>Mật khẩu hiện tại
            <input name="oldPassword" type="password" autocomplete="current-password" required maxlength="72">
          </label>
          <label>Mật khẩu mới
            <input name="newPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" required>
          </label>
          <label>Nhập lại mật khẩu mới
            <input name="newPassword2" type="password" minlength="8" maxlength="72" autocomplete="new-password" required>
          </label>
          <div class="auth-error" data-password-error></div>
          <button class="account-btn2 primary" type="submit">Đổi mật khẩu</button>
        </form>
        <p class="auth-note">Sau khi đổi, tất cả phiên đăng nhập khác bị thu hồi. Phiên hiện tại vẫn được giữ.</p>
      </div>`;
  }

  async function saveProfile(form) {
    const fd = new FormData(form);
    const displayName = String(fd.get('displayName') || '').trim();
    const theme = String(fd.get('theme') || me.theme);
    const err = $('[data-profile-error]', form);
    try {
      const data = await api('/api/me', { method: 'PATCH', body: JSON.stringify({ displayName, theme }) });
      me = data.user;
      updateTopbar();
      if (window.NT && NT.applyAccountProfile) NT.applyAccountProfile(me);
      err.textContent = 'Đã lưu hồ sơ.';
      err.style.color = '#4d7c30';
      toast('Đã cập nhật hồ sơ.');
    } catch (e) { err.textContent = e.message; err.style.color = ''; }
  }

  async function changePassword(form) {
    const fd = new FormData(form);
    const oldPassword = String(fd.get('oldPassword') || '');
    const newPassword = String(fd.get('newPassword') || '');
    const newPassword2 = String(fd.get('newPassword2') || '');
    const err = $('[data-password-error]', form);
    if (newPassword !== newPassword2) { err.textContent = 'Hai lần nhập mật khẩu mới chưa khớp.'; return; }
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
      err.textContent = 'Đã đổi mật khẩu. Các thiết bị khác đã đăng xuất.';
      err.style.color = '#4d7c30';
      form.reset();
      toast('Đã đổi mật khẩu.');
    } catch (e) { err.textContent = e.message; err.style.color = ''; }
  }

  async function refreshSocial() {
    if (!me) return;
    try {
      const data = await api('/api/social');
      applySocial(data);
    } catch (e) { if (e.status === 401) handleLoggedOut(); }
  }
  function applySocial(data) {
    const prev = social;
    const next = {
      friends: data.friends || [],
      incoming: data.incoming || [],
      outgoing: data.outgoing || [],
      unread: data.unread || 0
    };
    if (socialInitialized) {
      const newReq = next.incoming.length - (prev.incoming || []).length;
      const newMsg = next.unread - (prev.unread || 0);
      if (newReq > 0) toast(`Bạn có ${newReq} lời mời kết bạn mới.`);
      else if (newMsg > 0) toast(`Bạn có ${newMsg} tin nhắn mới.`);
    }
    social = next;
    socialInitialized = true;
    if (window.NT && NT.setRealFriends) NT.setRealFriends(social.friends);
    updateTopbar();
    if (overlay && !overlay.classList.contains('hidden') && !chatWith) render();
  }

  async function applySession(user, socialData) {
    me = user;
    if (socialData) applySocial(socialData);
    updateTopbar();
    if (window.NT && NT.onAccountLogin) NT.onAccountLogin(user);
    try {
      const state = await api('/api/game/state');
      if (state.state && window.NT && NT.applyServerState) NT.applyServerState(state.state);
      else if (window.NT && NT.uploadState) await NT.uploadState();
    } catch (e) { toast('Không tải được tiến trình: ' + e.message, 'err'); }
    await refreshSocial();
    startTimers();
  }

  function startTimers() {
    clearInterval(socialPoll); clearInterval(heartbeat);
    socialPoll = setInterval(refreshSocial, 20_000);
    heartbeat = setInterval(async () => {
      if (!me) return;
      try { await api('/api/presence', { method: 'POST', body: '{}' }); } catch {}
    }, 25_000);
  }

  function handleLoggedOut() {
    me = null;
    social = { friends: [], incoming: [], outgoing: [], unread: 0 };
    socialInitialized = false;
    chatWith = null;
    clearInterval(socialPoll); clearInterval(heartbeat);
    stopChatPoll();
    if (window.NT && NT.onAccountLogout) NT.onAccountLogout();
    updateTopbar();
    if (overlay && !overlay.classList.contains('hidden')) render();
  }

  async function boot() {
    updateTopbar();
    try {
      const data = await api('/api/me');
      await applySession(data.user, data.social);
    } catch (e) {
      if (e.status !== 401) console.warn('[account]', e.message);
      updateTopbar();
    }
    bindGlobal();
  }

  async function loginOrRegister(form) {
    const mode = form.dataset.authForm;
    const err = $('[data-auth-error]', form);
    const fd = new FormData(form);
    const username = String(fd.get('username') || '').trim();
    const password = String(fd.get('password') || '');
    if (mode === 'register' && password !== String(fd.get('password2') || '')) {
      err.textContent = 'Hai lần nhập mật khẩu chưa khớp.';
      return;
    }
    busy = true;
    const btn = form.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }
    try {
      const payload = { username, password };
      if (mode === 'register') payload.displayName = String(fd.get('displayName') || '').trim();
      const data = await api(mode === 'register' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      me = data.user;
      if (data.social) applySocial(data.social);
      if (window.NT && NT.onAccountLogin) NT.onAccountLogin(me);
      if (data.state && window.NT && NT.applyServerState) NT.applyServerState(data.state);
      else {
        if (mode === 'login' && window.NT && NT.resetToFresh) NT.resetToFresh();
        if (mode === 'register' && window.NT && NT.resetToFresh && NT.state?.player?.name && NT.state.player.name !== 'Bé Nông') {
          NT.resetToFresh();
        }
        if (window.NT && NT.uploadState) await NT.uploadState();
      }
      await refreshSocial();
      startTimers();
      updateTopbar();
      toast(mode === 'register' ? 'Tạo tài khoản thành công! Chào mừng bạn.' : 'Đăng nhập thành công!');
      render();
      if (window.NT && NT.refreshStart) NT.refreshStart();
    } catch (e) {
      err.textContent = e.message;
    } finally {
      busy = false;
      if (btn) { btn.disabled = false; btn.textContent = mode === 'register' ? 'Tạo tài khoản & đăng nhập' : 'Đăng nhập'; }
    }
  }

  async function addFriend() {
    const input = $('#friendUsername');
    const msg = $('#friendSearchMsg');
    const username = (input?.value || '').trim();
    if (!username) { msg.textContent = 'Nhập tên tài khoản của người bạn muốn kết bạn.'; return; }
    try {
      const data = await api('/api/friends/request', { method: 'POST', body: JSON.stringify({ username }) });
      msg.textContent = data.message || 'Đã gửi lời mời kết bạn.';
      msg.style.color = '#4d7c30';
      input.value = '';
      await refreshSocial();
    } catch (e) {
      msg.textContent = e.message;
      msg.style.color = '#b64b38';
    }
  }

  async function respond(id, accept) {
    try {
      const data = await api('/api/friends/respond', { method: 'POST', body: JSON.stringify({ id: Number(id), accept }) });
      applySocial(data);
      toast(accept ? 'Đã chấp nhận lời mời kết bạn!' : 'Đã từ chối lời mời.');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function removeFriend(id) {
    if (!confirm('Xóa người bạn này khỏi danh sách?')) return;
    try {
      const data = await api('/api/friends/remove', { method: 'POST', body: JSON.stringify({ id: Number(id) }) });
      applySocial(data);
      toast('Đã xóa bạn.');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function visitFriend(id) {
    const friendId = 'r' + Number(id);
    if (!window.NT || !NT.openFriendVisit) { toast('Game chưa sẵn sàng.', 'err'); return; }
    const ok = NT.openFriendVisit(friendId);
    if (!ok) { toast('Chưa tải được dữ liệu vườn bạn.', 'err'); return; }
    close();
  }

  async function openChat(id) {
    const f = (social.friends || []).find(x => x.id === Number(id));
    if (!f) return;
    chatWith = f;
    chatMessages = [];
    render();
    try {
      const data = await api(`/api/messages?with=${f.id}`);
      chatMessages = data.messages || [];
      render();
      scrollChat();
    } catch (e) { toast(e.message, 'err'); }
    clearInterval(chatPoll);
    chatPoll = setInterval(async () => {
      if (!chatWith) return;
      try {
        const data = await api(`/api/messages?with=${chatWith.id}`);
        chatMessages = data.messages || [];
        const log = $('#chatLog');
        const atBottom = log ? log.scrollHeight - log.scrollTop - log.clientHeight < 40 : true;
        render();
        if (atBottom) scrollChat();
      } catch {}
    }, 4000);
  }
  function stopChatPoll() { clearInterval(chatPoll); chatPoll = null; }
  function scrollChat() { const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight; }

  async function sendChat(form) {
    if (!chatWith) return;
    const input = form.querySelector('input[name=text]');
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    try {
      const data = await api(`/api/friends/${chatWith.id}/chat`, { method: 'POST', body: JSON.stringify({ text }) });
      chatMessages.push({ ...data.message, mine: true });
      render(); scrollChat();
    } catch (e) { toast(e.message, 'err'); }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    handleLoggedOut();
    toast('Đã đăng xuất.');
    close();
  }

  function onOverlayClick(e) {
    const t = e.target;
    if (t.closest('[data-auth-tab]')) { authTab = t.closest('[data-auth-tab]').dataset.authTab; render(); return; }
    if (t.closest('[data-settings]')) { view = 'settings'; render(); return; }
    if (t.closest('[data-settings-back]')) { view = 'profile'; render(); return; }
    if (t.closest('[data-acc-refresh]')) { refreshSocial(); render(); return; }
    if (t.closest('[data-add-friend]')) { addFriend(); return; }
    const resp = t.closest('[data-resp]');
    if (resp) { respond(resp.dataset.resp, resp.dataset.accept === '1'); return; }
    const rem = t.closest('[data-remove]');
    if (rem) { removeFriend(rem.dataset.remove); return; }
    const vis = t.closest('[data-visit]');
    if (vis) { visitFriend(vis.dataset.visit); return; }
    const chat = t.closest('[data-chat]');
    if (chat) { openChat(chat.dataset.chat); return; }
    if (t.closest('[data-chat-back]')) { chatWith = null; stopChatPoll(); render(); return; }
    if (t.closest('[data-logout]')) { logout(); return; }
  }

  function onSubmit(e) {
    if (e.target.matches('[data-auth-form]')) { e.preventDefault(); loginOrRegister(e.target); return; }
    if (e.target.matches('[data-chat-form]')) { e.preventDefault(); sendChat(e.target); return; }
    if (e.target.matches('[data-profile-form]')) { e.preventDefault(); saveProfile(e.target); return; }
    if (e.target.matches('[data-password-form]')) { e.preventDefault(); changePassword(e.target); return; }
  }

  function bindGlobal() {
    $('#accountBtn')?.addEventListener('click', () => open());
    $('#visitSocialBtn')?.addEventListener('click', () => open());
    $('#startAccountBtn')?.addEventListener('click', () => open());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) close();
    });
  }

  function whenReady(fn) {
    if (window.NT) { fn(); return; }
    let tries = 0;
    const timer = setInterval(() => {
      if (window.NT) { clearInterval(timer); fn(); }
      else if (++tries > 100) { clearInterval(timer); fn(); }
    }, 50);
  }

  whenReady(boot);

  window.SOCIAL = {
    open,
    refresh: refreshSocial,
    get me() { return me; },
    get social() { return social; },
    async friendAction(kind, friendKey, payload = {}) {
      if (!me) return null;
      const id = Number(String(friendKey).replace(/^r/, ''));
      if (!Number.isInteger(id)) return null;
      try {
        let data;
        if (kind === 'water') data = await api(`/api/friends/${id}/water`, { method: 'POST', body: JSON.stringify({ index: payload.index }) });
        else if (kind === 'gift') data = await api(`/api/friends/${id}/gift`, { method: 'POST', body: '{}' });
        else if (kind === 'chat') data = await api(`/api/friends/${id}/chat`, { method: 'POST', body: JSON.stringify({ text: payload.text || '' }) });
        if (data && data.friend) {
          const entry = (social.friends || []).find(f => f.id === Number(friendKey.toString().replace(/^r/, '')));
          if (entry) Object.assign(entry, data.friend);
          if (window.NT && NT.applyFriendUpdate) NT.applyFriendUpdate(friendKey, data.friend);
          if (overlay && !overlay.classList.contains('hidden') && !chatWith) render();
        }
        return data;
      } catch (e) {
        toast('Đồng bộ bạn bè: ' + e.message, 'err');
        return null;
      }
    }
  };
})();
