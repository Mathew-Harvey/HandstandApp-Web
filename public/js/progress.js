/* ================================================================
   Progress Dashboard — Motivational stats & visualizations
   Heatmap, volume chart, level journey, personal bests
   ================================================================ */

const PD_EXERCISE_NAMES = {
  wrist_heel_raises: 'Wrist Heel Raises',
  fin_pushups: 'Fingertip Push-ups',
  desk_stretch_ext: 'Desk Wrist Stretch (Ext)',
  overhead_desk: 'Overhead Desk Stretch',
  hang: 'Dead Hang',
  protracted_plank: 'Protracted Plank',
  body_line_drill: 'Body Line Drill',
  wrist_fin_2: 'Wrist & Finger Work',
  desk_hang_2: 'Desk & Hang Combo',
  chest_to_wall: 'Chest-to-Wall HS',
  hollow_body: 'Hollow Body Hold',
  wrist_fin_3: 'Wrist & Finger Work',
  desk_hang_3: 'Desk & Hang Combo',
  heel_pulls: 'Heel Pulls',
  toe_pulls: 'Toe Pulls',
  box_balance: 'Box Balance',
  ctw_3: 'Chest-to-Wall HS',
  wrist_fin_4: 'Wrist & Finger Work',
  desk_hang_4: 'Desk & Hang Combo',
  balance_game_15: 'Balance Game (15s)',
  ctw_4: 'Chest-to-Wall HS',
  kickup: 'Kick-up Practice',
  wrist_fin_5: 'Wrist & Finger Work',
  desk_hang_5: 'Desk & Hang Combo',
  ctw_5: 'Chest-to-Wall HS',
  kickup_5: 'Kick-up + Hold',
  shoulder_tap: 'Shoulder Taps',
  freestanding: 'Freestanding Handstand',
};

function pdExName(key) {
  return PD_EXERCISE_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function pdFormatHold(seconds) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? m + 'm ' + s + 's' : m + 'm';
}

function pdFormatDate(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function pdShortDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// Deterministic PRNG (Mulberry32) for consistent mock data across reloads
function pdMulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pdISOWeek(d) {
  const dt = new Date(d.getTime());
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
  const w1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

/* ------------------------------------------------------------------
   Mock stats generator — produces realistic data aligned with the
   real /api/dashboard response so the UI looks believable.
   Replace with fetch('/api/dashboard/stats') when the endpoint exists.
   ------------------------------------------------------------------ */
function pdGenerateMockStats(dashboard) {
  const rng = pdMulberry32(42);
  const { user, graduations, totalSessions, streak } = dashboard;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Heatmap: ~6 months (182 days)
  const heatmap = [];
  for (let i = 181; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const monthsAgo = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
    const bias = Math.max(0.3, 1 - monthsAgo * 0.1);
    const r = rng();
    let count;
    if (dateStr === todayStr) {
      count = Math.floor(rng() * 3) + 1;
    } else if (r > bias) {
      count = 0;
    } else {
      const r2 = rng();
      if (r2 < 0.35) count = 1;
      else if (r2 < 0.6) count = 2;
      else if (r2 < 0.8) count = 3;
      else count = isWeekend ? Math.floor(rng() * 3) + 4 : Math.floor(rng() * 2) + 3;
    }
    heatmap.push({ date: dateStr, count });
  }

  // Weekly volume: last 12 weeks
  const weeklyVolume = [];
  for (let w = 11; w >= 0; w--) {
    const ws = new Date(today);
    ws.setDate(ws.getDate() - w * 7);
    const baseSessions = Math.floor(rng() * 3) + 3;
    const trend = 1 + (11 - w) * 0.03;
    const sessions = Math.round(baseSessions * trend);
    const sets = sessions * (Math.floor(rng() * 3) + 3);
    weeklyVolume.push({
      week: `${ws.getFullYear()}-W${String(pdISOWeek(ws)).padStart(2, '0')}`,
      sessions,
      sets,
      weekStart: ws.toISOString().split('T')[0],
    });
  }
  for (let i = weeklyVolume.length - 3; i < weeklyVolume.length; i++) {
    weeklyVolume[i].sets = Math.round(weeklyVolume[i].sets * 1.2);
  }

  // Personal bests
  const personalBests = [
    { exercise_key: 'hang', best_hold_seconds: 45, best_sets: 5, achieved_at: '2026-01-10' },
    { exercise_key: 'protracted_plank', best_hold_seconds: 60, best_sets: 3, achieved_at: '2025-11-22' },
    { exercise_key: 'hollow_body', best_hold_seconds: 35, best_sets: 3, achieved_at: '2026-01-05' },
    { exercise_key: 'chest_to_wall', best_hold_seconds: 120, best_sets: 4, achieved_at: '2025-12-20' },
    { exercise_key: 'body_line_drill', best_hold_seconds: 30, best_sets: 3, achieved_at: '2025-10-15' },
  ];

  // Level timeline
  const gradMap = {};
  graduations.forEach(g => { gradMap[g.level] = g.graduated_at; });
  const levelTimeline = [];
  for (let lv = 1; lv <= 6; lv++) {
    const prevGrad = lv > 1 ? gradMap[lv - 1] : user.created_at;
    levelTimeline.push({
      level: lv,
      started_at: lv <= user.current_level ? (prevGrad || null) : null,
      graduated_at: gradMap[lv] || null,
    });
  }

  // Exercise breakdown (sorted by total_logs desc)
  const exerciseBreakdown = [
    { exercise_key: 'heel_pulls', name: 'Heel Pulls', total_logs: 34 },
    { exercise_key: 'protracted_plank', name: 'Protracted Plank', total_logs: 28 },
    { exercise_key: 'chest_to_wall', name: 'Chest-to-Wall HS', total_logs: 25 },
    { exercise_key: 'hang', name: 'Dead Hang', total_logs: 22 },
    { exercise_key: 'toe_pulls', name: 'Toe Pulls', total_logs: 19 },
    { exercise_key: 'hollow_body', name: 'Hollow Body Hold', total_logs: 17 },
    { exercise_key: 'body_line_drill', name: 'Body Line Drill', total_logs: 14 },
    { exercise_key: 'wrist_heel_raises', name: 'Wrist Heel Raises', total_logs: 12 },
    { exercise_key: 'fin_pushups', name: 'Fingertip Push-ups', total_logs: 10 },
    { exercise_key: 'box_balance', name: 'Box Balance', total_logs: 8 },
  ];

  const daysSince = Math.floor((today - new Date(user.created_at)) / 86400000);

  return {
    heatmap,
    weeklyVolume,
    personalBests,
    levelTimeline,
    exerciseBreakdown,
    totals: { totalSessions, totalSets: 412, totalLogs: 193, memberSinceDays: daysSince },
    streak: { current: streak, longest: 23 },
  };
}

/* ------------------------------------------------------------------
   Count-up animation — easeInOutQuad from 0 → target over duration
   ------------------------------------------------------------------ */
function pdCountUp(el, target, duration) {
  if (!el) return;
  if (target <= 0) { el.textContent = '0'; return; }
  duration = duration || 1200;
  const start = performance.now();
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  (function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(ease(p) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(frame);
  })(start);
}

/* ------------------------------------------------------------------
   IntersectionObserver — fade-in-up when sections enter viewport
   ------------------------------------------------------------------ */
function pdScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('pd-visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.pd-section').forEach(s => obs.observe(s));
}

/* ------------------------------------------------------------------
   Heatmap builder — CSS Grid, 7 rows × 26 columns
   ------------------------------------------------------------------ */
function pdBuildHeatmap(gridEl, monthsEl, data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const mondayOff = dow === 0 ? -6 : 1 - dow;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + mondayOff);
  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 25 * 7);

  const countMap = {};
  data.forEach(d => { countMap[d.date] = d.count; });

  const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
  function color(c) {
    if (c <= 0) return COLORS[0];
    if (c === 1) return COLORS[1];
    if (c === 2) return COLORS[2];
    if (c <= 4) return COLORS[3];
    return COLORS[4];
  }

  let cells = '';
  let prevMonth = -1;
  const step = 16; // cellSize(13) + gap(3)

  for (let week = 0; week < 26; week++) {
    const mondayOfWeek = new Date(startMonday);
    mondayOfWeek.setDate(startMonday.getDate() + week * 7);
    const m = mondayOfWeek.getMonth();
    if (m !== prevMonth) {
      monthsEl.innerHTML += `<span style="left:${week * step}px">${mondayOfWeek.toLocaleString('en', { month: 'short' })}</span>`;
      prevMonth = m;
    }
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + week * 7 + day);
      const dateStr = cellDate.toISOString().split('T')[0];
      const future = cellDate > today;
      const cnt = future ? -1 : (countMap[dateStr] || 0);
      const bg = future ? 'transparent' : color(cnt);
      const label = future ? '' : `${cnt} log${cnt !== 1 ? 's' : ''} on ${pdFormatDate(dateStr)}`;
      cells += `<div class="pd-hm-cell${future ? ' pd-hm-cell--empty' : ''}" style="background:${bg}" data-date="${dateStr}" data-count="${cnt}" aria-label="${label}" role="gridcell"></div>`;
    }
  }
  gridEl.innerHTML = cells;

  // Tooltip via event delegation
  const tooltip = document.getElementById('pdTooltip');
  if (!tooltip) return;
  gridEl.addEventListener('mouseover', e => {
    const cell = e.target.closest('.pd-hm-cell:not(.pd-hm-cell--empty)');
    if (!cell) return;
    const c = cell.dataset.count;
    tooltip.textContent = `${c} log${c !== '1' ? 's' : ''} on ${pdFormatDate(cell.dataset.date)}`;
    tooltip.classList.add('pd-tooltip--show');
    const r = cell.getBoundingClientRect();
    tooltip.style.left = (r.left + r.width / 2) + 'px';
    tooltip.style.top = (r.top - 8) + 'px';
  });
  gridEl.addEventListener('mouseout', e => {
    if (e.target.closest('.pd-hm-cell')) {
      tooltip.classList.remove('pd-tooltip--show');
    }
  });
}

/* ------------------------------------------------------------------
   Chart.js area chart — weekly sets over 12 weeks
   ------------------------------------------------------------------ */
function pdInitChart(canvasId, weeklyVolume) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(88,166,255,0.28)');
  grad.addColorStop(1, 'rgba(88,166,255,0)');

  const labels = weeklyVolume.map(w => {
    const d = new Date(w.weekStart + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  });
  const sets = weeklyVolume.map(w => w.sets);
  const lastIdx = sets.length - 1;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: sets,
        fill: true,
        backgroundColor: grad,
        borderColor: '#58a6ff',
        borderWidth: 2,
        tension: 0.35,
        pointBackgroundColor: sets.map((_, i) => i === lastIdx ? '#f0883e' : '#58a6ff'),
        pointBorderColor: '#0d1117',
        pointBorderWidth: 2,
        pointRadius: sets.map((_, i) => i === lastIdx ? 6 : 3),
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2128',
          titleColor: '#e6edf3',
          bodyColor: '#e6edf3',
          borderColor: '#30363d',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.parsed.y} sets`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(48,54,61,0.4)', drawBorder: false },
          ticks: { color: '#8b949e', font: { size: 11 }, maxRotation: 45 },
        },
        y: {
          grid: { color: 'rgba(48,54,61,0.25)', drawBorder: false },
          ticks: { color: '#8b949e', font: { size: 11 } },
          beginAtZero: true,
          title: { display: true, text: 'Sets', color: '#8b949e', font: { size: 11 } },
        },
      },
      interaction: { intersect: false, mode: 'index' },
    },
  });

  // Trend badge
  if (sets.length >= 6) {
    const recent = sets.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlier = sets.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    const trendEl = document.getElementById('pdTrend');
    if (trendEl && recent > earlier) {
      trendEl.textContent = '↑ trending up';
      trendEl.classList.add('pd-trend--up');
    }
  }

  // Screen-reader summary
  const summary = document.getElementById('pdChartSummary');
  if (summary) {
    const total = sets.reduce((a, b) => a + b, 0);
    summary.textContent = `Weekly training volume over ${sets.length} weeks. Total sets: ${total}. Average: ${Math.round(total / sets.length)} sets per week.`;
  }
}

/* ------------------------------------------------------------------
   Main render — composes and wires everything together
   ------------------------------------------------------------------ */
async function renderProgress() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="pd-page"><div class="pd-inner"><p style="color:#8b949e;text-align:center;padding:3rem 0">Loading…</p></div></div>';

  try {
    const dashboard = await api('/dashboard');
    if (!dashboard) return;
    const { user } = dashboard;
    currentUser = user;

    // Mock stats — swap with api('/dashboard/stats') when ready
    const stats = pdGenerateMockStats(dashboard);
    const { heatmap, weeklyVolume, personalBests, levelTimeline, exerciseBreakdown, totals, streak: streakData } = stats;

    const todayStr = new Date().toISOString().split('T')[0];
    const loggedToday = heatmap.some(h => h.date === todayStr && h.count > 0);
    const holdBests = personalBests.filter(pb => pb.best_hold_seconds > 0);

    const checkSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    app.innerHTML = `
    <div class="pd-page">
      <div class="pd-inner">
        <div class="pd-header">
          <a href="#/dashboard" class="back-link">← Dashboard</a>
          <h1 class="pd-title">Your Progress</h1>
          <p class="pd-subtitle">Keep showing up, ${esc(user.display_name)}. Every rep counts.</p>
        </div>

        <!-- Hero Stats -->
        <section class="pd-hero" aria-label="Key statistics">
          <div class="pd-card pd-card--streak ${loggedToday ? 'pd-card--active' : ''}">
            <div class="pd-stat-icon">🔥</div>
            <div class="pd-stat-value pd-stat-value--amber" data-target="${streakData.current}">0</div>
            <div class="pd-stat-label">Current Streak</div>
          </div>
          <div class="pd-card">
            <div class="pd-stat-icon">⚡</div>
            <div class="pd-stat-value" data-target="${streakData.longest}">0</div>
            <div class="pd-stat-label">Longest Streak</div>
          </div>
          <div class="pd-card">
            <div class="pd-stat-icon">💪</div>
            <div class="pd-stat-value" data-target="${totals.totalSessions}">0</div>
            <div class="pd-stat-label">Total Sessions</div>
          </div>
          <div class="pd-card">
            <div class="pd-stat-icon">📅</div>
            <div class="pd-stat-value" data-target="${totals.memberSinceDays}">0</div>
            <div class="pd-stat-label">Days Since Joined</div>
          </div>
        </section>

        <!-- Heatmap -->
        <section class="pd-section" aria-label="Activity heatmap">
          <h2 class="pd-heading">Activity</h2>
          <div class="pd-card pd-heatmap-card">
            <div class="pd-heatmap">
              <div class="pd-heatmap-days">
                <span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span>
              </div>
              <div class="pd-heatmap-scroll">
                <div class="pd-heatmap-months" id="pdHeatmapMonths"></div>
                <div class="pd-heatmap-grid" id="pdHeatmapGrid" role="grid" aria-label="Activity contribution grid"></div>
              </div>
            </div>
            <div class="pd-heatmap-legend">
              <span>Less</span>
              <div class="pd-legend-cell" style="background:#161b22"></div>
              <div class="pd-legend-cell" style="background:#0e4429"></div>
              <div class="pd-legend-cell" style="background:#006d32"></div>
              <div class="pd-legend-cell" style="background:#26a641"></div>
              <div class="pd-legend-cell" style="background:#39d353"></div>
              <span>More</span>
            </div>
          </div>
        </section>

        <!-- Volume Chart -->
        <section class="pd-section" aria-label="Weekly training volume">
          <div class="pd-heading-row">
            <h2 class="pd-heading">Weekly Volume</h2>
            <span class="pd-trend" id="pdTrend"></span>
          </div>
          <div class="pd-card pd-chart-card">
            <div class="pd-chart-wrap">
              <canvas id="pdVolumeChart" aria-hidden="true"></canvas>
            </div>
            <p class="sr-only" id="pdChartSummary"></p>
          </div>
        </section>

        <!-- Level Journey -->
        <section class="pd-section" aria-label="Level progression">
          <h2 class="pd-heading">Level Journey</h2>
          <div class="pd-card pd-journey-card">
            <div class="pd-journey">
              ${levelTimeline.map(lv => {
                const isDone = lv.graduated_at !== null;
                const isCurrent = lv.level === user.current_level && !isDone;
                const cls = isDone ? 'pd-step--done' : isCurrent ? 'pd-step--current' : 'pd-step--future';
                const dot = isDone ? checkSvg : lv.level;
                const dateLabel = isDone ? pdShortDate(lv.graduated_at) : isCurrent ? 'Current' : '';
                return `<div class="pd-step ${cls}">
                  <div class="pd-step-dot">${dot}</div>
                  <div class="pd-step-level">Level ${lv.level}</div>
                  <div class="pd-step-date">${dateLabel}</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </section>

        <!-- Personal Bests -->
        <section class="pd-section" aria-label="Personal bests">
          <h2 class="pd-heading">Personal Bests</h2>
          ${holdBests.length ? `
          <div class="pd-bests">
            ${holdBests.map(pb => `
            <div class="pd-card pd-best-card">
              <div class="pd-best-trophy">🏆</div>
              <div class="pd-best-name">${pdExName(pb.exercise_key)}</div>
              <div class="pd-best-value">${pdFormatHold(pb.best_hold_seconds)}</div>
              <div class="pd-best-date">${pdFormatDate(pb.achieved_at)}</div>
            </div>`).join('')}
          </div>` : `
          <div class="pd-card pd-empty">
            <p>Keep logging — your PRs will appear here! 🎯</p>
          </div>`}
        </section>

        <!-- Most Practiced -->
        <section class="pd-section" aria-label="Most practiced exercises">
          <h2 class="pd-heading">Most Practiced</h2>
          <div class="pd-card pd-bars-card">
            ${exerciseBreakdown.slice(0, 5).map((ex, i) => {
              const pct = Math.round((ex.total_logs / exerciseBreakdown[0].total_logs) * 100);
              return `<div class="pd-bar-row">
                <div class="pd-bar-rank">${i + 1}</div>
                <div class="pd-bar-name">${esc(ex.name)}</div>
                <div class="pd-bar-track"><div class="pd-bar-fill" style="--w:${pct}%"></div></div>
                <div class="pd-bar-count">${ex.total_logs}</div>
              </div>`;
            }).join('')}
          </div>
        </section>
      </div>

      <div class="pd-tooltip" id="pdTooltip"></div>
    </div>`;

    // Build heatmap cells
    pdBuildHeatmap(
      document.getElementById('pdHeatmapGrid'),
      document.getElementById('pdHeatmapMonths'),
      heatmap,
    );

    // Init Chart.js (allow DOM to settle)
    setTimeout(() => pdInitChart('pdVolumeChart', weeklyVolume), 60);

    // Count-up hero numbers
    setTimeout(() => {
      document.querySelectorAll('.pd-stat-value[data-target]').forEach(el => {
        pdCountUp(el, parseInt(el.dataset.target, 10), 1200);
      });
    }, 150);

    // Scroll-triggered animations
    pdScrollAnim();

  } catch (err) {
    app.innerHTML = `<div class="pd-page"><div class="pd-inner"><div class="alert alert-error">${typeof esc === 'function' ? esc(err.message) : err.message}</div></div></div>`;
  }
}
