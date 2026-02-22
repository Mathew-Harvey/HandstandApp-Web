/* ================================================================
   Handstand Tracker — SPA Client
   Hash-based routing, API integration, timer, progress logging
   ================================================================ */

const $ = (s) => document.querySelector(s);
const app = $('#app');
const nav = $('#nav');
let LEVELS = [];
let currentUser = null;

// Exercise key (normalized: no underscores, no trailing digits) → image filenames in /images/
// Aligned with "The handstand - complete training guide" and assets/images
const EXERCISE_IMAGES = {
  wristheelraises: ['wrist01.png', 'writs02.png', 'wrist03.png'],
  finpushups: ['wrist01.png', 'writs02.png', 'wrist03.png'],
  deskstretchexternalrotation: ['overheaddeskstretch01.png'],
  overheaddeskstretch: ['overheaddeskstretch01.png', 'overheaddeskstretch02.png'],
  hang: ['hang.png'],
  plank: ['protractedplank.png', 'protractedplankbeginer.png'],
  bodylinedrill: ['protractedplank.png', 'protractedplankbeginer.png'],
  chesttowallhandstand: ['chesttowallhandstand01.png', 'chesttowallhandstand02.png'],
  hollowbody: ['hollowbodyBeginner.png', 'hollowbodyAdv.png'],
  heelpulls: ['handstandheelpulls01.png', 'handstandheelpulls02.png'],
  toepulls: ['handstandtoepulls01.png', 'handstandtoepull02.png', 'handstandtoepull03.png'],
  boxassistedbalance: ['boxassistedhandstand01.png', 'boxassistedhandstand02.png', 'boxassistedhandstand03.png'],
  balancegame: ['boxassistedhandstand01.png', 'boxassistedhandstand02.png'],
  kickup: ['handstandkickup01.png', 'handstandkickup02.png', 'handstandkickup03.png', 'handstandkickup04.png'],
  handstandshouldertap: ['wallhandstandshouldertap01.png', 'wallhandstandshouldertap02.png'],
  freestandinghandstand: ['freestandinghandstand1.png'],
  handstand: ['handstand01.png'],
};
function getExerciseImages(key) {
  if (!key) return [];
  const n = String(key).toLowerCase().replace(/_/g, '').replace(/\d+$/, '');
  return EXERCISE_IMAGES[n] || [];
}

// ===== API HELPER =====
async function api(path, opts = {}) {
  const res = await fetch(`${window.API_URL}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !path.includes('/auth/')) {
    currentUser = null;
    navigate('/login');
    return null;
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// ===== ROUTING =====
function navigate(path) { window.location.hash = '#' + path; }

function getSetPasswordTokenFromUrl() {
  if (window.location.pathname !== '/set-password') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || params.get('set_password_token') || null;
}

// Set-password flow (email link): GET validate (with credentials → session cookie), then show form; POST on submit (with credentials), then redirect.
async function handleSetPasswordFlow() {
  const token = getSetPasswordTokenFromUrl();
  if (!token) {
    navigate('/login');
    return;
  }
  nav.style.display = 'none';
  app.innerHTML = '<div class="auth-page"><div class="auth-card"><p class="auth-sub">Checking link…</p></div></div>';
  try {
    // GET with credentials so the backend can set the session cookie
    const data = await api(`/auth/validate-set-password-token?token=${encodeURIComponent(token)}`);
    if (!data || !data.user) {
      app.innerHTML = `<div class="auth-page"><div class="auth-card"><div class="alert alert-error">This link is invalid or has expired.</div><p class="auth-footer auth-footer-links"><a href="#/login">Back to log in</a> · <a href="#/forgot-password">Forgot password?</a></p></div></div>`;
      return;
    }
    currentUser = data.user;
    showSetPasswordModal(token);
  } catch (err) {
    app.innerHTML = `<div class="auth-page"><div class="auth-card"><div class="alert alert-error">${esc(err.message)}</div><p class="auth-footer auth-footer-links"><a href="#/login">Back to log in</a> · <a href="#/forgot-password">Forgot password?</a></p></div></div>`;
  }
}

function showSetPasswordModal(token) {
  const modal = $('#setPasswordModal');
  const errEl = $('#setPasswordError');
  const form = $('#setPasswordForm');
  if (!modal || !form) return;
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  form.newPassword.value = '';
  form.confirmNewPassword.value = '';
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal-overlay--visible');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;
    if (newPassword !== confirmNewPassword) {
      if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = ''; }
      return;
    }
    if (newPassword.length < 6) {
      if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = ''; }
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    if (errEl) errEl.style.display = 'none';
    try {
      // POST with credentials; then redirect into the app
      await api('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      closeSetPasswordModal();
      window.history.replaceState(null, '', window.location.origin + '/');
      navigate('/dashboard');
      toast('Password set. Welcome!', true);
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Failed to set password.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Set password & continue'; }
    }
  };
}

function closeSetPasswordModal() {
  const modal = $('#setPasswordModal');
  if (modal) {
    modal.classList.remove('modal-overlay--visible');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function router() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');

  // Check auth on every navigation
  if (!currentUser && !['/login', '/register', '/forgot-password'].includes(path)) {
    try {
      const me = await api('/auth/me');
      if (me?.authenticated) {
        currentUser = me.user;
      } else {
        navigate('/login');
        return;
      }
    } catch {
      navigate('/login');
      return;
    }
  }

  // Load levels if not cached (skip on auth pages — requires login)
  if (!['/login', '/register', '/forgot-password'].includes(path) && !LEVELS.length) {
    try {
      const data = await api('/levels');
      if (Array.isArray(data)) LEVELS = data;
    } catch {
      LEVELS = [];
    }
  }

  // Show/hide nav
  nav.style.display = currentUser ? '' : 'none';
  if (currentUser) $('#navUser').textContent = currentUser.display_name;

  // Route
  if (path === '/login') return renderLogin();
  if (path === '/register') return renderRegister();
  if (path === '/forgot-password') return renderForgotPassword();
  if (path === '/dashboard') return renderDashboard();
  if (path.startsWith('/level/')) return renderLevel(parseInt(path.split('/')[2]));

  // Default
  navigate(currentUser ? '/dashboard' : '/login');
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  if (getSetPasswordTokenFromUrl()) {
    await handleSetPasswordFlow();
    return;
  }
  router();
});

// Logout
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    currentUser = null;
    navigate('/login');
  }
});

// ===== PAGE RENDERERS =====

function renderLogin() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">The <span>Bodyweight</span> Gym</div>
        <h1>Welcome back</h1>
        <p class="auth-sub">Log in to track your handstand progress.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <form class="auth-form" id="loginForm">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••">
          <button type="submit" class="btn btn-primary btn-full">Log In</button>
        </form>
        <p class="auth-footer auth-footer-links">
          <a href="#/forgot-password">Forgot password?</a><br>
          Don't have an account? <a href="#/register">Sign up</a>
        </p>
      </div>
    </div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Logging in...';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.email.value, password: f.password.value }),
      });
      currentUser = data.user;
      navigate('/dashboard');
    } catch (err) {
      const el = $('#authError');
      el.textContent = err.message;
      el.style.display = '';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}

function renderRegister() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">The <span>Bodyweight</span> Gym</div>
        <h1>Create your account</h1>
        <p class="auth-sub">Start tracking your handstand journey.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <form class="auth-form" id="registerForm">
          <label for="display_name">Your name</label>
          <input type="text" id="display_name" name="display_name" required autocomplete="name" placeholder="First name">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" placeholder="At least 6 characters">
          <label for="confirm_password">Confirm password</label>
          <input type="password" id="confirm_password" name="confirm_password" required minlength="6" autocomplete="new-password" placeholder="••••••••">
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </div>`;
  $('#registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          display_name: f.display_name.value,
          email: f.email.value,
          password: f.password.value,
          confirm_password: f.confirm_password.value,
        }),
      });
      currentUser = data.user;
      navigate('/dashboard');
    } catch (err) {
      const el = $('#authError');
      el.textContent = err.message;
      el.style.display = '';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}

function renderForgotPassword() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">The <span>Bodyweight</span> Gym</div>
        <h1>Reset password</h1>
        <p class="auth-sub">Enter your email and we'll send you a link to set a new password.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <div class="alert alert-success" id="authSuccess" style="display:none"></div>
        <div class="auth-dev-reset" id="authDevReset" style="display:none"></div>
        <form class="auth-form" id="forgotPasswordForm">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <button type="submit" class="btn btn-primary btn-full">Send reset link</button>
        </form>
        <p class="auth-footer"><a href="#/login">Back to log in</a></p>
      </div>
    </div>`;
  $('#forgotPasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const errEl = $('#authError');
    const successEl = $('#authSuccess');
    const devResetEl = $('#authDevReset');
    if (errEl) errEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    if (devResetEl) { devResetEl.style.display = 'none'; devResetEl.innerHTML = ''; }
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: f.email.value.trim() }),
      });
      if (successEl) {
        successEl.textContent = "If an account exists for that email, we've sent you a link to set a new password. Check your inbox and spam folder.";
        successEl.style.display = '';
      }
      if (data && data.devResetToken && devResetEl) {
        const origin = window.location.origin;
        const resetUrl = `${origin}/set-password?token=${encodeURIComponent(data.devResetToken)}`;
        devResetEl.innerHTML = `<strong>Development:</strong> No email sent. Use this link to set your password: <a href="${esc(resetUrl)}">Set password</a>`;
        devResetEl.style.display = '';
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Send reset link'; }
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Something went wrong.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Send reset link'; }
    }
  };
}

async function renderDashboard() {
  app.innerHTML = '<div class="container"><p class="auth-sub">Loading…</p></div>';
  try {
    const d = await api('/dashboard');
    if (!d) return;
    const { user, graduations, recentLogs, totalSessions, streak } = d;
    currentUser = user;

    const levelMeta = [
      { num:1, title:'Building the Foundation', sub:'Wrists · Shoulders · Core', thumb:'protractedplank.png' },
      { num:2, title:'Going Upside Down', sub:'Chest-to-wall · Hollow body', thumb:'chesttowallhandstand01.png' },
      { num:3, title:'Learning to Balance', sub:'Heel pulls · Toe pulls · Balance game', thumb:'boxassistedhandstand01.png' },
      { num:4, title:'Finding the Hold', sub:'Kick-ups · Extended balance', thumb:'handstandkickup01.png' },
      { num:5, title:'Building Endurance', sub:'Shoulder taps · Consistency', thumb:'wallhandstandshouldertap01.png' },
      { num:6, title:'The 60-Second Handstand', sub:'Chase the minute', thumb:'freestandinghandstand1.png' },
    ];

    const gradSet = new Set(graduations.map(g => g.level));

    app.innerHTML = `
      <div class="container">
        <div class="dashboard-hero" aria-hidden="true">
          <img src="/images/freestandinghandstand1.png" alt="" class="dashboard-hero-img">
        </div>
        <section class="stats-bar">
          <div class="stat"><div class="stat-num">${user.current_level}</div><div class="stat-label">Current Level</div></div>
          <div class="stat"><div class="stat-num">${totalSessions}</div><div class="stat-label">Sessions</div></div>
          <div class="stat"><div class="stat-num">${streak}</div><div class="stat-label">Day Streak</div></div>
          <div class="stat"><div class="stat-num">${graduations.length}</div><div class="stat-label">Graduated</div></div>
        </section>
        <h2 class="section-heading">Your Programme</h2>
        <div class="level-grid">
          ${levelMeta.map(lv => {
            const done = gradSet.has(lv.num);
            const current = lv.num === user.current_level;
            const locked = lv.num > user.current_level && !done;
            const cls = ['level-card', current && 'level-card--current', done && 'level-card--done', locked && 'level-card--locked'].filter(Boolean).join(' ');
            return `
              <a href="#/level/${lv.num}" class="${cls}">
                <div class="level-card-thumb">
                  <img src="/images/${lv.thumb}" alt="" loading="lazy">
                </div>
                <div class="level-card-num">${done ? '✓' : lv.num}</div>
                <div class="level-card-body">
                  <div class="level-card-title">${lv.title}</div>
                  <div class="level-card-sub">${lv.sub}</div>
                  ${current ? '<span class="badge badge-accent">Current</span>' : ''}
                  ${done ? '<span class="badge badge-success">Graduated</span>' : ''}
                </div>
                <div class="level-card-arrow">›</div>
              </a>`;
          }).join('')}
        </div>
        ${recentLogs.length ? `
          <h2 class="section-heading">Recent Activity</h2>
          <div class="activity-list">
            ${recentLogs.map(log => `
              <div class="activity-row">
                <div class="activity-level">L${log.level}</div>
                <div class="activity-body">
                  <div class="activity-name">${log.exercise_key.replace(/_/g, ' ').replace(/\d+$/, '')}</div>
                  <div class="activity-detail">${log.sets_completed} sets${log.hold_time_seconds ? ' · ' + log.hold_time_seconds + 's hold' : ''}${log.notes ? ' · ' + esc(log.notes) : ''}</div>
                </div>
                <div class="activity-date">${fmtDate(log.session_date)}</div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  } catch (err) {
    app.innerHTML = `<div class="container"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

async function renderLevel(num) {
  num = parseInt(num, 10);
  if (!Number.isInteger(num) || num < 1 || num > 6 || !LEVELS.length) return navigate('/dashboard');
  const levelData = LEVELS[num - 1];
  if (!levelData) return navigate('/dashboard');
  app.innerHTML = '<div class="container"><p class="auth-sub">Loading…</p></div>';

  try {
    const d = await api(`/levels/${num}/logs`);
    if (!d) return;
    const { logs, graduated } = d;

    app.innerHTML = `
      <div class="container">
        <div class="level-header">
          <a href="#/dashboard" class="back-link">← Dashboard</a>
          <div class="level-header-num">Level ${num}</div>
          <h1>${esc(levelData.title)}</h1>
          <p class="level-header-sub">${esc(levelData.subtitle)}</p>
          ${graduated ? `<span class="badge badge-success">Graduated ${fmtDate(graduated.graduated_at)}</span>` : ''}
        </div>

        <!-- Timer -->
        <div class="timer-widget" id="timer">
          <div class="timer-display" id="timerDisplay">0:00</div>
          <div class="timer-controls">
            <button class="btn btn-sm btn-ghost" data-time="30">0:30</button>
            <button class="btn btn-sm btn-ghost" data-time="60">1:00</button>
            <button class="btn btn-sm btn-ghost" data-time="120">2:00</button>
            <button class="btn btn-sm btn-ghost" data-time="600">10:00</button>
            <button class="btn btn-sm btn-ghost" data-time="900">15:00</button>
          </div>
          <div class="timer-actions">
            <button class="btn btn-primary btn-sm" id="timerStart">Start</button>
            <button class="btn btn-ghost btn-sm" id="timerReset">Reset</button>
          </div>
          <div class="timer-elapsed" id="timerElapsed"></div>
        </div>

        <!-- Exercises -->
        ${levelData.exercises.map((ex, i) => {
          const vid = extractVideoId(ex.video);
          const imgs = getExerciseImages(ex.key);
          const imgBlock = imgs.length ? `<div class="exercise-images" aria-label="Form reference: ${esc(ex.name)}">${imgs.slice(0, 4).map(img => `<img src="/images/${img}" alt="" loading="lazy" class="exercise-img">`).join('')}</div>` : '';
          return `
            <div class="exercise-card" id="ex-${ex.key}">
              <div class="exercise-card-header">
                <h3>${esc(ex.name)}</h3>
                <div class="exercise-rx">${esc(ex.rx)}</div>
              </div>
              ${imgBlock}
              ${vid ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${vid}" title="${esc(ex.name)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : ''}
              <form class="log-form" data-level="${num}" data-key="${ex.key}">
                <div class="log-form-row">
                  <div class="form-group"><label>Sets</label><input type="number" name="sets_completed" min="0" max="20" value="3" inputmode="numeric"></div>
                  <div class="form-group"><label>Reps / Duration</label><input type="text" name="reps_or_duration" placeholder="e.g. 10 reps"></div>
                  ${ex.hasTimer ? '<div class="form-group"><label>Hold (sec)</label><input type="number" name="hold_time_seconds" min="0" max="999" inputmode="numeric" placeholder="60"></div>' : ''}
                </div>
                <div class="form-group"><label>Notes <span class="optional">(optional)</span></label><input type="text" name="notes" placeholder="How did it feel?"></div>
                <button type="submit" class="btn btn-primary btn-sm btn-full">Log Exercise</button>
              </form>
            </div>`;
        }).join('')}

        <!-- Graduation -->
        <div class="grad-section">
          <div class="grad-box">
            <div class="grad-check">${graduated ? '✓' : '○'}</div>
            <div>
              <div class="grad-title">Graduation Test</div>
              <div class="grad-desc">${esc(levelData.graduation)}</div>
            </div>
          </div>
          ${!graduated ? `<button class="btn btn-accent btn-full" id="graduateBtn">I've passed — Graduate Level ${num}</button>` : ''}
        </div>

        <!-- History -->
        ${logs.length ? `
          <h2 class="section-heading">Level ${num} History</h2>
          <div class="activity-list" id="historyList">
            ${logs.map(log => `
              <div class="activity-row" data-log-id="${log.id}">
                <div class="activity-body">
                  <div class="activity-name">${log.exercise_key.replace(/_/g, ' ').replace(/\d+$/, '')}</div>
                  <div class="activity-detail">${log.sets_completed} sets${log.reps_or_duration ? ' · ' + esc(log.reps_or_duration) : ''}${log.hold_time_seconds ? ' · ' + log.hold_time_seconds + 's' : ''}${log.notes ? ' · <em>' + esc(log.notes) + '</em>' : ''}</div>
                </div>
                <div class="activity-date">${fmtDate(log.session_date)}</div>
                <button class="btn-icon delete-log-btn" title="Delete">&times;</button>
              </div>`).join('')}
          </div>` : ''}
      </div>`;

    // Bind events
    bindTimer();
    bindLogForms(num);
    bindGraduate(num);
    bindDeleteLogs();

  } catch (err) {
    app.innerHTML = `<div class="container"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

// ===== EVENT BINDERS =====

function bindLogForms() {
  document.querySelectorAll('.log-form').forEach(form => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = {
        level: parseInt(f.dataset.level),
        exercise_key: f.dataset.key,
        sets_completed: parseInt(f.sets_completed.value) || 0,
        reps_or_duration: f.reps_or_duration?.value || '',
        hold_time_seconds: f.hold_time_seconds ? parseInt(f.hold_time_seconds.value) || null : null,
        notes: f.notes?.value || '',
      };
      try {
        await api('/log', { method: 'POST', body: JSON.stringify(body) });
        toast('Logged ✓', true);
        if (f.notes) f.notes.value = '';
      } catch (err) {
        toast(err.message || 'Failed to save', false);
      }
    };
  });
}

function bindGraduate(level) {
  const btn = $('#graduateBtn');
  if (!btn) return;
  btn.onclick = async () => {
    if (!confirm(`Are you sure you've passed the Level ${level} graduation test?`)) return;
    try {
      await api('/graduate', { method: 'POST', body: JSON.stringify({ level }) });
      toast('Congratulations! 🎉', true);
      setTimeout(() => router(), 1200);
    } catch (err) {
      toast(err.message || 'Failed', false);
    }
  };
}

function bindDeleteLogs() {
  document.querySelectorAll('.delete-log-btn').forEach(btn => {
    btn.onclick = async () => {
      const row = btn.closest('.activity-row');
      const id = row?.dataset.logId;
      if (!id || !confirm('Delete this entry?')) return;
      try {
        await api(`/log/${id}`, { method: 'DELETE' });
        row.remove();
        toast('Deleted', true);
      } catch {
        toast('Failed', false);
      }
    };
  });
}

// ===== TIMER =====
let timerInterval = null;
let timerTarget = 0;
let timerElapsed = 0;
let timerRunning = false;

function bindTimer() {
  document.querySelectorAll('[data-time]').forEach(btn => {
    btn.onclick = () => {
      resetTimer();
      timerTarget = parseInt(btn.dataset.time);
      updateTimerDisplay(timerTarget);
    };
  });
  const startBtn = $('#timerStart');
  const resetBtn = $('#timerReset');
  if (startBtn) startBtn.onclick = toggleTimer;
  if (resetBtn) resetBtn.onclick = resetTimer;
}

function toggleTimer() {
  if (timerRunning) return pauseTimer();
  timerRunning = true;
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) { widget.classList.add('timer--running'); widget.classList.remove('timer--done'); }
  if (btn) btn.textContent = 'Pause';
  const startTime = Date.now() - (timerElapsed * 1000);
  timerInterval = setInterval(() => {
    timerElapsed = Math.floor((Date.now() - startTime) / 1000);
    if (timerTarget > 0) {
      const rem = Math.max(0, timerTarget - timerElapsed);
      updateTimerDisplay(rem);
      updateElapsed(timerElapsed);
      if (rem <= 0) timerDone();
    } else {
      updateTimerDisplay(timerElapsed);
    }
  }, 100);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) widget.classList.remove('timer--running');
  if (btn) btn.textContent = 'Resume';
}

function resetTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerElapsed = 0;
  timerTarget = 0;
  updateTimerDisplay(0);
  updateElapsed('');
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) widget.classList.remove('timer--running', 'timer--done');
  if (btn) btn.textContent = 'Start';
}

function timerDone() {
  clearInterval(timerInterval);
  timerRunning = false;
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) { widget.classList.remove('timer--running'); widget.classList.add('timer--done'); }
  if (btn) btn.textContent = 'Start';
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {}
  toast('Time!', true);
}

function updateTimerDisplay(s) {
  const el = $('#timerDisplay');
  if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function updateElapsed(v) {
  const el = $('#timerElapsed');
  if (!el) return;
  el.textContent = typeof v === 'number' ? 'Elapsed: ' + Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') : v;
}

// ===== TOAST =====
let toastTimeout;
function toast(msg, success) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('toast--success', !!success);
  t.classList.remove('toast--visible');
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast--visible')));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('toast--visible'), 2500);
}

// ===== HELPERS =====
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }
  catch { return d; }
}

function extractVideoId(url) {
  if (!url) return '';
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
  if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
  return '';
}
