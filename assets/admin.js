(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('vi-VN');
  const timeAgo = ts => {
    if (!ts) return '—';
    const d = Date.now() - ts;
    if (d < 60_000) return 'vừa xong';
    if (d < 3_600_000) return Math.floor(d / 60_000) + ' phút trước';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + ' giờ trước';
    return Math.floor(d / 86_400_000) + ' ngày trước';
  };
  const dateTime = ts => ts ? new Date(ts).toLocaleString('vi-VN') : '—';

  const state = { me: null, stats: null, userPage: 0, userTotal: 0, userLimit: 25, query: '', tab: 'overview' };

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      if (res.status === 401) { showLogin(); }
      const err = new Error(data.error || `Lỗi ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  let toastTimer = null;
  function toast(text, kind = '') {
    const el = $('#adminToast');
    el.textContent = text;
    el.className = 'admin-toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'admin-toast'; }, 3200);
  }

  function showLogin(message = '') {
    $('#adminDashboard').classList.add('hidden');
    $('#adminLoginView').classList.remove('hidden');
    $('#adminLogout').classList.add('hidden');
    $('#adminLoginError').textContent = message;
  }
  function showDashboard() {
    $('#adminLoginView').classList.add('hidden');
    $('#adminDashboard').classList.remove('hidden');
    $('#adminLogout').classList.remove('hidden');
  }

  async function boot() {
    try {
      const data = await api('/api/me');
      if (data.user.role !== 'admin') {
        state.me = data.user;
        showLogin('Tài khoản này không có quyền quản trị.');
        return;
      }
      state.me = data.user;
      showDashboard();
      await refreshAll();
    } catch (e) {
      if (e.status !== 401) showLogin(e.message);
      else showLogin('');
    }
  }

  async function refreshAll() {
    try {
      const [statsData, usersData, auditData] = await Promise.all([
        api('/api/admin/stats'),
        api(`/api/admin/users?limit=${state.userLimit}&offset=${state.userPage * state.userLimit}&q=${encodeURIComponent(state.query)}`),
        api('/api/admin/audit')
      ]);
      state.stats = statsData.stats;
      renderStats(statsData.stats);
      renderQuickCapacity(statsData.capacity);
      renderUsers(usersData);
      renderAudit(auditData.audit);
      $('#adminUpdated').textContent = 'Cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN') + ' • dữ liệu SQLite trực tiếp';
    } catch (e) {
      if (e.status !== 401) toast(e.message);
    }
  }

  function renderStats(s) {
    const cards = [
      ['Người dùng', fmt(s.totalUsers), `${fmt(s.newToday)} mới hôm nay`],
      ['Đang online', fmt(s.online), `${fmt(s.sessions)} phiên đăng nhập`],
      ['Bạn bè', fmt(s.friends), `${fmt(s.pending)} lời mời chờ`],
      ['Tin nhắn', fmt(s.messages), `${fmt(s.messagesToday)} hôm nay`],
      ['Request / phút', fmt(s.requestsPerMinute), `${fmt(s.totalRequests)} tổng request`],
      ['RAM tiến trình', s.memoryMb + ' MB', `load ${Number(s.load1 || 0).toFixed(2)}`],
      ['SQLite', s.dbSizeKb < 1024 ? s.dbSizeKb + ' KB' : s.dbSizeMb + ' MB', 'WAL • single node'],
      ['Uptime', Math.floor(s.uptimeSec / 3600) + 'h ' + Math.floor((s.uptimeSec % 3600) / 60) + 'm', `${fmt(s.banned)} tài khoản bị khóa`]
    ];
    $('#statGrid').innerHTML = cards.map(([label, value, sub]) => `<div class="stat-card"><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(sub)}</span></div>`).join('');
    $('#adminOnlineBadge').textContent = fmt(s.online);
    $('#meterRam').textContent = s.memoryMb + ' MB';
    $('#meterRamFill').style.width = Math.min(100, s.memoryMb / 1024 * 100) + '%';
    $('#meterRamFill').classList.toggle('hot', s.memoryMb > 700);
    $('#meterLoad').textContent = Number(s.load1 || 0).toFixed(2);
    $('#meterLoadFill').style.width = Math.min(100, Number(s.load1 || 0) / 4 * 100) + '%';
    $('#meterLoadFill').classList.toggle('hot', Number(s.load1 || 0) > 2);
    $('#meterRpm').textContent = fmt(s.requestsPerMinute);
    $('#loadPill').textContent = s.requestsPerMinute > 200 ? 'đang chịu tải' : 'ổn định';
    $('#loadPill').className = 'pill' + (s.requestsPerMinute > 200 ? ' gold' : '');
  }

  function capacityFormula(dau, concurrencyPct, reqPerUserPerMin) {
    const peak = Math.round(dau * concurrencyPct);
    const rps = Math.max(1, Math.round(peak * reqPerUserPerMin / 60));
    const appVcpu = Math.max(1, Math.ceil(rps / 650));
    const appRamGb = Math.max(1, Math.ceil(appVcpu * 1.5));
    const postgresVcpu = Math.max(2, Math.ceil(rps / 450));
    const postgresRamGb = Math.max(4, postgresVcpu * 4);
    const redisRamGb = Math.max(1, Math.ceil(peak / 250_000));
    const storageGb = Math.max(5, Math.ceil(dau * 20 / 1_048_576 * 3 + 10));
    const bandwidthGbPerDay = Math.round(peak * reqPerUserPerMin * 1440 * 2.5 / 1_048_576 * 10) / 10;
    return { dau, peak, rps, appVcpu, appRamGb, postgresVcpu, postgresRamGb, redisRamGb, storageGb, bandwidthGbPerDay };
  }

  function renderQuickCapacity(c) {
    if (!c) return;
    $('#quickCapacity').innerHTML = `
      <div><small>Peak online</small><b>${fmt(c.peakConcurrent)}</b></div>
      <div><small>Request / giây</small><b>${fmt(c.reqPerSec)}</b></div>
      <div><small>App Node</small><b>${c.appVcpu} vCPU / ${c.appRamGb} GB</b></div>
      <div><small>Postgres</small><b>${c.postgresVcpu} vCPU / ${c.postgresRamGb} GB</b></div>
      <div><small>Redis</small><b>${c.redisRamGb} GB</b></div>
      <div><small>Lưu trữ</small><b>${c.storageGb} GB</b></div>`;
  }

  function renderUsers(data) {
    state.userTotal = data.total;
    const rows = data.users || [];
    $('#userRows').innerHTML = rows.length ? rows.map(u => `
      <tr>
        <td><div class="user-cell"><span class="user-avatar">${u.role === 'admin' ? '🛡️' : '🌱'}</span><span><b>${esc(u.displayName)}</b><small>@${esc(u.username)} • ${fmt(u.stateBytes)} B save</small></span></div></td>
        <td><span class="badge ${u.role === 'admin' ? 'admin' : ''}">${u.role === 'admin' ? 'Admin' : 'Player'}</span></td>
        <td>${u.banned ? `<span class="badge banned">Đã khóa</span>` : `<span class="status-dot ${u.online ? 'online' : ''}">${u.online ? 'Online' : 'Offline'}</span>`}</td>
        <td>${u.level}</td>
        <td>${timeAgo(u.lastSeen)}<br><small>${dateTime(u.createdAt)}</small></td>
        <td><div class="row-actions">
          <button class="admin-btn small ghost" data-action="role" data-id="${u.id}" data-role="${u.role === 'admin' ? 'player' : 'admin'}">${u.role === 'admin' ? 'Hạ quyền' : 'Cấp admin'}</button>
          <button class="admin-btn small ${u.banned ? 'ghost' : 'danger'}" data-action="ban" data-id="${u.id}" data-banned="${u.banned ? '0' : '1'}">${u.banned ? 'Mở khóa' : 'Khóa'}</button>
          <button class="admin-btn small ghost" data-action="reset" data-id="${u.id}" data-name="${esc(u.username)}">Reset MK</button>
          ${u.id !== state.me?.id ? `<button class="admin-btn small danger" data-action="delete" data-id="${u.id}" data-name="${esc(u.username)}">Xóa</button>` : ''}
        </div></td>
      </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:26px;color:#9a896c">Không có người dùng phù hợp.</td></tr>`;
    const from = state.userTotal ? state.userPage * state.userLimit + 1 : 0;
    const to = Math.min(state.userTotal, (state.userPage + 1) * state.userLimit);
    $('#userPageInfo').textContent = `${from}–${to} / ${fmt(state.userTotal)}`;
    $('#userPrev').disabled = state.userPage <= 0;
    $('#userNext').disabled = to >= state.userTotal;
  }

  function renderAudit(rows) {
    $('#auditRows').innerHTML = rows && rows.length ? rows.map(r => `
      <tr>
        <td>${dateTime(r.created_at)}</td>
        <td>@${esc(r.admin_name || '—')}</td>
        <td><span class="badge">${esc(r.action)}</span></td>
        <td>@${esc(r.target_name || '—')}</td>
      </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;padding:22px;color:#9a896c">Chưa có nhật ký.</td></tr>`;
  }

  async function loadCapacity() {
    const dau = Math.max(1000, Number($('#capDau').value) || 10000);
    const concurrency = Math.min(.8, Math.max(.02, (Number($('#capConc').value) || 15) / 100));
    const req = Math.min(120, Math.max(2, Number($('#capReq').value) || 12));
    try {
      const data = await api(`/api/admin/capacity?dau=${dau}&concurrency=${concurrency}&req=${req}`);
      const c = data.model;
      $('#capacityResult').innerHTML = `
        <div><small>Peak online</small><b>${fmt(c.peakConcurrent)}</b></div>
        <div><small>Request / giây</small><b>${fmt(c.reqPerSec)}</b></div>
        <div><small>App Node</small><b>${c.appVcpu} vCPU / ${c.appRamGb} GB</b></div>
        <div><small>Postgres</small><b>${c.postgresVcpu} vCPU / ${c.postgresRamGb} GB</b></div>
        <div><small>Redis</small><b>${c.redisRamGb} GB</b></div>
        <div><small>Ổ đĩa</small><b>${c.storageGb} GB</b></div>
        <div><small>Băng thông / ngày</small><b>${c.bandwidthGbPerDay} GB</b></div>
        <div><small>Request / phút</small><b>${fmt(c.reqPerMin)}</b></div>`;
    } catch (e) { toast(e.message); }
  }

  function renderTiers() {
    const tiers = [
      [1_000, .2, 12], [10_000, .15, 12], [100_000, .12, 15], [1_000_000, .08, 18], [5_000_000, .06, 20]
    ];
    $('#capacityTiers').innerHTML = tiers.map(([dau, conc, req]) => {
      const c = capacityFormula(dau, conc, req);
      return `<tr><td><b>${fmt(dau)}</b></td><td>${fmt(c.peak)}</td><td>${fmt(c.rps)}</td><td>${c.appVcpu} vCPU / ${c.appRamGb} GB</td><td>${c.postgresVcpu} vCPU / ${c.postgresRamGb} GB</td><td>${c.redisRamGb} GB</td><td>${c.bandwidthGbPerDay} GB</td></tr>`;
    }).join('');
  }

  $('#adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('button');
    const username = form.username.value.trim();
    const password = form.password.value;
    btn.disabled = true; btn.textContent = 'Đang đăng nhập...';
    $('#adminLoginError').textContent = '';
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      if (data.user.role !== 'admin') {
        $('#adminLoginError').textContent = 'Tài khoản này không có quyền quản trị.';
        await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
        return;
      }
      state.me = data.user;
      showDashboard();
      await refreshAll();
    } catch (err) {
      $('#adminLoginError').textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Đăng nhập quản trị';
    }
  });

  $('#adminLogout').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    state.me = null;
    showLogin('');
  });

  $('#adminTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.tab = b.dataset.tab;
    $$('.admin-tab').forEach(x => x.classList.toggle('active', x === b));
    $$('.admin-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== state.tab));
    if (state.tab === 'capacity') { loadCapacity(); renderTiers(); }
    if (state.tab === 'audit') refreshAll();
  });
  $$('[data-goto-tab]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.gotoTab;
    $(`.admin-tab[data-tab="${t}"]`)?.click();
  }));

  $('#userSearchBtn').addEventListener('click', () => { state.query = $('#userSearch').value.trim(); state.userPage = 0; refreshAll(); });
  $('#userSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { state.query = e.currentTarget.value.trim(); state.userPage = 0; refreshAll(); } });
  $('#userRefreshBtn').addEventListener('click', () => refreshAll());
  $('#userPrev').addEventListener('click', () => { if (state.userPage > 0) { state.userPage--; refreshAll(); } });
  $('#userNext').addEventListener('click', () => { if ((state.userPage + 1) * state.userLimit < state.userTotal) { state.userPage++; refreshAll(); } });
  $('#auditRefresh').addEventListener('click', () => refreshAll());
  $('#capCalc').addEventListener('click', loadCapacity);
  ['#capDau', '#capConc', '#capReq'].forEach(sel => $(sel).addEventListener('keydown', e => { if (e.key === 'Enter') loadCapacity(); }));

  $('#userRows').addEventListener('click', async e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const id = b.dataset.id;
    const action = b.dataset.action;
    try {
      if (action === 'role') {
        if (!confirm(`Đổi vai trò người dùng #${id}?`)) return;
        await api(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role: b.dataset.role }) });
        toast('Đã cập nhật vai trò.');
      } else if (action === 'ban') {
        const banned = b.dataset.banned === '1';
        let reason = '';
        if (banned) { reason = prompt('Lý do khóa tài khoản (có thể để trống):', 'Vi phạm nội quy') || ''; }
        if (!confirm(`${banned ? 'Khóa' : 'Mở khóa'} tài khoản #${id}?`)) return;
        await api(`/api/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ banned, reason }) });
        toast(banned ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      } else if (action === 'reset') {
        if (!confirm(`Đặt lại mật khẩu cho @${b.dataset.name}?`)) return;
        const data = await api(`/api/admin/users/${id}/reset-password`, { method: 'POST', body: '{}' });
        alert(`Mật khẩu tạm của @${b.dataset.name}:\n\n${data.temporaryPassword}\n\nHãy gửi cho người dùng và yêu cầu đổi ngay.`);
        toast('Đã đặt lại mật khẩu.');
      } else if (action === 'delete') {
        if (!confirm(`Xóa vĩnh viễn tài khoản @${b.dataset.name}? Hành động này không thể hoàn tác.`)) return;
        if (!confirm(`Xác nhận lần 2: xóa @${b.dataset.name} cùng toàn bộ bạn bè và tin nhắn?`)) return;
        await api(`/api/admin/users/${id}/delete`, { method: 'POST', body: '{}' });
        toast(`Đã xóa @${b.dataset.name}.`);
      }
      await refreshAll();
    } catch (err) { toast(err.message); }
  });

  setInterval(() => {
    if (!$('#adminDashboard').classList.contains('hidden') && state.tab === 'overview') refreshAll();
  }, 15000);

  boot();
})();
