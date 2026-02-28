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

/* ------------------------------------------------------------------
   Fill weekly volume — ensures 12 continuous weeks for the chart,
   filling gaps with zeros where the API has no data.
   ------------------------------------------------------------------ */
function pdFillWeeklyVolume(apiWeekly) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - ((dow + 6) % 7));

  const byStart = {};
  apiWeekly.forEach(w => { byStart[w.week_start] = w; });

  const result = [];
  for (let i = 11; i >= 0; i--) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - i * 7);
    const dateStr = monday.toISOString().split('T')[0];
    const entry = byStart[dateStr];
    result.push({
      sessions: entry ? entry.sessions : 0,
      sets: entry ? entry.sets : 0,
      weekStart: dateStr,
    });
  }
  return result;
}

/* ------------------------------------------------------------------
   Build complete 6-level timeline from sparse API data + dashboard
   ------------------------------------------------------------------ */
function pdBuildLevelTimeline(apiTimeline, user, graduations) {
  const timelineMap = {};
  apiTimeline.forEach(t => { timelineMap[t.level] = t; });
  const gradMap = {};
  graduations.forEach(g => { gradMap[g.level] = g.graduated_at; });

  const result = [];
  for (let lv = 1; lv <= 6; lv++) {
    result.push({
      level: lv,
      started_at: timelineMap[lv] ? timelineMap[lv].started_at : null,
      graduated_at: gradMap[lv] || null,
    });
  }
  return result;
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

  /** Map count to level 0–4 for theme-aware CSS (--pd-heatmap-0 … --pd-heatmap-4) */
  function level(c) {
    if (c <= 0) return 0;
    if (c === 1) return 1;
    if (c === 2) return 2;
    if (c <= 4) return 3;
    return 4;
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
      const levelClass = future ? '' : ` pd-hm-cell--l${level(cnt)}`;
      const label = future ? '' : `${cnt} log${cnt !== 1 ? 's' : ''} on ${pdFormatDate(dateStr)}`;
      cells += `<div class="pd-hm-cell${future ? ' pd-hm-cell--empty' : ''}${levelClass}" data-date="${dateStr}" data-count="${cnt}" aria-label="${label}" role="gridcell"></div>`;
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
    const [dashboard, stats] = await Promise.all([
      api('/dashboard'),
      api('/dashboard/stats'),
    ]);
    if (!dashboard || !stats) return;
    const { user } = dashboard;
    currentUser = user;

    const heatmap = stats.heatmap || [];
    const weeklyVolume = pdFillWeeklyVolume(stats.weeklyVolume || []);
    const personalBests = stats.personalBests || [];
    const levelTimeline = pdBuildLevelTimeline(stats.levelTimeline || [], user, dashboard.graduations || []);
    const exerciseBreakdown = stats.exerciseBreakdown || [];
    const totals = stats.totals || { totalSessions: 0, totalSets: 0, totalLogs: 0, memberSinceDays: 0 };
    const streakData = stats.streak || { current: 0, longest: 0 };

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
              <div class="pd-legend-cell pd-legend-cell--l0"></div>
              <div class="pd-legend-cell pd-legend-cell--l1"></div>
              <div class="pd-legend-cell pd-legend-cell--l2"></div>
              <div class="pd-legend-cell pd-legend-cell--l3"></div>
              <div class="pd-legend-cell pd-legend-cell--l4"></div>
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
          ${exerciseBreakdown.length ? `
          <div class="pd-card pd-bars-card">
            ${exerciseBreakdown.slice(0, 5).map((ex, i) => {
              const pct = Math.round((ex.total_logs / exerciseBreakdown[0].total_logs) * 100);
              return `<div class="pd-bar-row">
                <div class="pd-bar-rank">${i + 1}</div>
                <div class="pd-bar-name">${esc(pdExName(ex.exercise_key))}</div>
                <div class="pd-bar-track"><div class="pd-bar-fill" style="--w:${pct}%"></div></div>
                <div class="pd-bar-count">${ex.total_logs}</div>
              </div>`;
            }).join('')}
          </div>` : `
          <div class="pd-card pd-empty">
            <p>Start logging workouts to see your most practiced exercises!</p>
          </div>`}
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
