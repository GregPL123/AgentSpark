// ─── NAVIGATION: drawer · context bar · back-to-top · home panels · accordion ─
import { state } from './state.js';
import { dbGetAll } from './db.js';
import { initSwipeGestures, initNavHideOnScroll } from './gestures.js';
import { showScreen, _syncFab } from './ui.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString(state.lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric' });
}

// ── Drawer ────────────────────────────────────────────────────────────────────
let _drawerOpen = false;

export function toggleDrawer() { _drawerOpen ? closeDrawer() : openDrawer(); }

export function openDrawer() {
  _drawerOpen = true;
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('nav-drawer-overlay').classList.add('open');
  const btn = document.getElementById('burger-btn');
  if (btn) { btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  document.body.style.overflow = 'hidden';
  updateDrawerActive();
}

export function closeDrawer() {
  _drawerOpen = false;
  document.getElementById('nav-drawer').classList.remove('open');
  const overlay = document.getElementById('nav-drawer-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.classList.remove('open'); overlay.style.opacity = ''; }, 280);
  const btn = document.getElementById('burger-btn');
  if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  document.body.style.overflow = '';
}

export function updateDrawerActive() {
  const screens = ['home', 'projects', 'chat', 'results'];
  let active = 'home';
  screens.forEach(s => {
    const el = document.getElementById('screen-' + (s === 'home' ? 'topic' : s));
    if (el?.classList.contains('active')) active = s;
  });
  document.querySelectorAll('.drawer-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('dnav-' + active)?.classList.add('active');

  // Sync badge
  const tabBadge  = document.getElementById('tab-badge');
  const dnavBadge = document.getElementById('dnav-badge');
  if (dnavBadge && tabBadge) {
    dnavBadge.textContent  = tabBadge.textContent;
    dnavBadge.style.display = tabBadge.style.display;
  }

  // Sync theme icon
  const themeIcon = document.getElementById('dnav-theme-icon');
  if (themeIcon) themeIcon.textContent = document.documentElement.getAttribute('data-theme') !== 'light' ? '🌙' : '☀️';
}

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape' && _drawerOpen) closeDrawer(); });

// ── Back-to-top button ────────────────────────────────────────────────────────
export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let _bttVisible = false;
function syncBackToTop() {
  const visible = window.scrollY > 320;
  if (visible !== _bttVisible) {
    _bttVisible = visible;
    document.getElementById('back-to-top')?.classList.toggle('visible', visible);
  }
}
window.addEventListener('scroll', syncBackToTop, { passive: true });

// ── Context bar ───────────────────────────────────────────────────────────────
const CTX_BAR_CONFIGS = {
  topic:    { btns: [{ label: '⚡ Generate', cls: 'primary', fn: 'startWithTopic()' }] },
  chat:     { btns: [{ label: '↩ Cancel',    cls: '',        fn: 'restart()' }] },
  results:  { btns: [{ label: '↩ Start Over', cls: '',       fn: 'restart()' }] },
  projects: { btns: [{ label: '+ New Project', cls: 'primary', fn: "showScreen('topic')" }] },
};

export function updateContextBar(screenName) {
  const bar = document.getElementById('sticky-context-bar');
  if (!bar) return;
  const cfg = CTX_BAR_CONFIGS[screenName];
  if (!cfg) { bar.classList.remove('visible'); return; }
  bar.innerHTML = cfg.btns
    .map(b => `<button class="ctx-btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`)
    .join('');
  // Double rAF so spring animation triggers after paint
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('visible')));
}

// ── Home segmented navigation ─────────────────────────────────────────────────
let _activeHomePanel = 'topics';

export function switchHomePanel(panel) {
  _activeHomePanel = panel;
  ['topics', 'projects', 'custom'].forEach(p => {
    document.getElementById('hpanel-' + p)?.classList.toggle('active', p === panel);
    const btn = document.getElementById('hseg-' + p);
    if (btn) {
      btn.classList.toggle('active', p === panel);
      btn.setAttribute('aria-selected', String(p === panel));
    }
  });
  if (panel === 'projects') renderHomeProjectsList();
}

export async function renderHomeProjectsList() {
  const list   = document.getElementById('home-projects-list');
  const empty  = document.getElementById('home-projects-empty');
  const search = (document.getElementById('home-projects-search')?.value || '').toLowerCase();
  if (!list) return;

  let projects = [];
  try { projects = await dbGetAll(); } catch (_) {}

  const filtered = search
    ? projects.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.topic || '').toLowerCase().includes(search)
      )
    : projects;

  if (!filtered.length) {
    list.innerHTML     = '';
    list.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  list.style.display = 'grid';
  if (empty) empty.style.display = 'none';

  list.innerHTML = filtered.map(p => `
    <div class="project-card" tabindex="0" role="button" aria-label="${_escHtml(p.name)}"
      onclick="loadProject('${p.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div class="project-card-name">${_escHtml(p.name)}</div>
      <div class="project-card-topic">📌 ${_escHtml(p.topic || 'No topic')}</div>
      <div class="project-card-meta">
        ${(p.agents || []).length ? `<span class="project-card-tag">👥 ${(p.agents || []).length}</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
      </div>
      <div class="project-card-date">Updated ${_formatDate(p.updatedAt)}</div>
    </div>
  `).join('');
}

// ── Accordion for instructions ────────────────────────────────────────────────
export function renderAccordionInstructions(steps) {
  const container = document.getElementById('instr-steps');
  if (!container) return;
  container.innerHTML = '';

  steps.forEach((step, i) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <div class="accordion-header" onclick="toggleAccordion(this.parentElement)" role="button" tabindex="0"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion(this.parentElement)}">
        <div class="accordion-num">0${i + 1}</div>
        <div class="accordion-title">${step.title}</div>
        <span class="accordion-chevron">▾</span>
      </div>
      <div class="accordion-body">
        <div class="accordion-content">${step.body}</div>
      </div>
    `;
    container.appendChild(item);
  });

  if (container.firstElementChild) toggleAccordion(container.firstElementChild);
}

export function toggleAccordion(item) {
  const isOpen = item.classList.contains('open');
  item.parentElement.querySelectorAll('.accordion-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ── FAB sync ──────────────────────────────────────────────────────────────────
export function syncFab() {
  _syncFab();
}

// ── showScreen patch (adds context bar + drawer sync + nav-hide reset) ────────
// Importuje showScreen bezpośrednio z ui.js zamiast przez window.showScreen
// żeby uniknąć race condition gdy patch odpala przed ustawieniem window.showScreen
export function patchShowScreen(resetNavHideFn) {
  const origShowScreen = showScreen; // bezpośredni import z ui.js — zawsze dostępny
  window.showScreen = function (name) {
    origShowScreen(name);
    updateContextBar(name);
    updateDrawerActive();
    syncBackToTop();
    resetNavHideFn();
    if (name === 'projects') setTimeout(initSwipeGestures, 200);
  };
}

// ── showInstructions patch (accordion rendering) ──────────────────────────────
export function patchShowInstructions(tFn) {
  window.showInstructions = function () {
    const section  = document.getElementById('instructions-section');
    const isHidden = getComputedStyle(section).display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      document.getElementById('instr-title').textContent = tFn('instrTitle');
      renderAccordionInstructions(tFn('instrSteps'));
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}

// ── Modal backdrop dismiss ────────────────────────────────────────────────────
export function initModalBackdrops() {
  document.getElementById('modal')?.addEventListener('click', function (e) {
    if (e.target === this) window.closeModal?.();
  });
  document.getElementById('md-browser-modal')?.addEventListener('click', function (e) {
    if (e.target === this) window.closeMdBrowser?.();
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (e.target !== this) return;
      const closeBtn = this.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
      else this.classList.remove('open');
    });
  });
}

// ── DOMContentLoaded boot ─────────────────────────────────────────────────────
export function initNavigation(tFn) {
  const resetNavHide = initNavHideOnScroll();

  document.addEventListener('DOMContentLoaded', () => {
    syncFab();
    updateContextBar('topic');
    updateDrawerActive();
    initModalBackdrops();
    patchShowScreen(resetNavHide);
    patchShowInstructions(tFn);

    // Cmd/Ctrl+K → toggle drawer
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleDrawer();
      }
    });
  });
}
