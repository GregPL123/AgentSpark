// ─── CORE UI ──────────────────────────────────────────────
import { state, resetState } from './state.js';

// ─── API SETUP TOGGLE ─────────────────────────────────────
let _apiSetupOpen = true;

export function toggleApiSetup(forceState) {
  const body    = document.getElementById('api-setup-body');
  const chevron = document.getElementById('api-setup-chevron');
  if (!body) return;
  _apiSetupOpen = forceState !== undefined ? forceState : !_apiSetupOpen;
  body.classList.toggle('open', _apiSetupOpen);
  if (chevron) chevron.classList.toggle('open', _apiSetupOpen);
}

export function _updateApiKeyDot(status) {
  const dot   = document.getElementById('api-key-dot');
  const label = document.getElementById('api-setup-toggle-label');
  if (!dot) return;
  dot.className = 'api-key-dot' + (status ? ' ' + status : '');
  if (status === 'ready' && label) {
    const sel = document.getElementById('modelSelect');
    const modelText = sel ? sel.options[sel.selectedIndex]?.text : 'AI Model';
    label.textContent = modelText + ' · Ready';
    toggleApiSetup(false);
  } else if (label) {
    label.textContent = 'AI Model & API Key';
  }
}

// ─── SKELETON LOADING ─────────────────────────────────────
export function _renderSkeletonCards(count = 4) {
  const grid = document.getElementById('agents-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <span class="skeleton skeleton-avatar"></span>
      <span class="skeleton skeleton-line w65"></span>
      <span class="skeleton skeleton-line w40"></span>
      <span class="skeleton skeleton-line w100" style="margin-top:1rem;height:11px;"></span>
      <span class="skeleton skeleton-line w90" style="height:11px;"></span>
      <span class="skeleton skeleton-line w75" style="height:11px;"></span>
      <div class="skeleton-chips">
        <span class="skeleton skeleton-chip"></span>
        <span class="skeleton skeleton-chip" style="width:80px;"></span>
      </div>
    `;
    grid.appendChild(card);
  }
}

export function _showGeneratingState(stepIndex) {
  const lang = state.lang;
  const steps = [
    lang === 'en' ? 'Analyzing your requirements…' : 'Analizuję wymagania…',
    lang === 'en' ? 'Designing agent team…'        : 'Projektuję zespół agentów…',
    lang === 'en' ? 'Writing configuration files…' : 'Zapisuję pliki konfiguracyjne…',
    lang === 'en' ? 'Finalizing…'                  : 'Finalizuję…',
  ];
  const grid = document.getElementById('agents-grid');
  if (!grid) return;
  const overlay = document.createElement('div');
  overlay.className = 'generating-overlay';
  overlay.id = 'generating-overlay';
  const stepsHtml = steps.map((s, i) => `
    <div class="gen-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}">
      <span class="gen-step-dot"></span>
      <span>${i < stepIndex ? '✓ ' : ''}${s}</span>
    </div>
  `).join('');
  overlay.innerHTML = `
    <div class="generating-spinner"></div>
    <div class="generating-label">${lang === 'en' ? 'Building your AI team…' : 'Buduję Twój zespół AI…'}</div>
    <div class="generating-steps">${stepsHtml}</div>
  `;
  grid.innerHTML = '';
  grid.appendChild(overlay);
}

// ─── FAB ──────────────────────────────────────────────────
export function _syncFab() {
  const fab = document.getElementById('results-fab');
  if (!fab) return;
  const resultsActive = document.getElementById('screen-results')?.classList.contains('active');
  const shouldShow = resultsActive && state.generatedAgents.length > 0;
  fab.classList.toggle('fab-visible', shouldShow);
}

// ─── SCREEN NAVIGATION ────────────────────────────────────
export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  syncIosTabBar(name);
  _syncFab();
}

export function syncIosTabBar(screenName) {
  const tabMap = { topic: 'home', projects: 'projects', chat: 'chat', results: 'results' };
  const activeTab = tabMap[screenName] || 'home';
  const chatTab    = document.getElementById('tab-chat');
  const resultsTab = document.getElementById('tab-results');
  if (chatTab)    chatTab.style.display    = (screenName === 'chat' || screenName === 'results') ? '' : 'none';
  if (resultsTab) resultsTab.style.display = screenName === 'results' ? '' : 'none';
  document.querySelectorAll('.ios-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + activeTab);
  if (activeBtn) activeBtn.classList.add('active');
}

export function iosTabNav(tab) {
  if (tab === 'home')      window.showScreen('topic');
  else if (tab === 'chat')     window.showScreen('chat');
  else if (tab === 'results')  window.showScreen('results');
  else if (tab === 'projects') import('./db.js').then(m => m.openProjectsScreen());
  else if (tab === 'settings') openSettingsSheet();
}

export function openSettingsSheet() {
  let sheet = document.getElementById('ios-settings-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'ios-settings-sheet';
    sheet.className = 'ios-sheet-overlay';
    sheet.innerHTML = `
      <div class="ios-sheet" style="max-height:80vh;">
        <div class="ios-sheet-handle"></div>
        <div class="ios-sheet-header">
          <span class="ios-sheet-title">Settings</span>
          <button class="ios-sheet-close" onclick="document.getElementById('ios-settings-sheet').classList.remove('open')">✕</button>
        </div>
        <div class="ios-sheet-body">
          <div class="ios-section-label" style="margin-bottom:0.5rem;">Appearance</div>
          <div class="ios-list-group">
            <div class="ios-list-item" onclick="window._app.toggleTheme()">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🌙</div>
              <div style="flex:1"><div class="ios-list-label" id="settings-theme-label">Dark Mode</div></div>
              <span class="ios-list-chevron">›</span>
            </div>
          </div>
          <div class="ios-section-label" style="margin-bottom:0.5rem;">Language</div>
          <div class="ios-list-group">
            <div class="ios-list-item" onclick="window._app.setLang('en');document.getElementById('ios-settings-sheet').classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇬🇧</div>
              <div style="flex:1"><div class="ios-list-label">English</div></div>
              <span id="settings-lang-en" style="color:var(--accent);font-size:0.9rem;">✓</span>
            </div>
            <div class="ios-list-item" onclick="window._app.setLang('pl');document.getElementById('ios-settings-sheet').classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇵🇱</div>
              <div style="flex:1"><div class="ios-list-label">Polski</div></div>
              <span id="settings-lang-pl" style="color:var(--accent);font-size:0.9rem;display:none;">✓</span>
            </div>
          </div>
          <div class="ios-section-label" style="margin-bottom:0.5rem;">About</div>
          <div class="ios-list-group">
            <div class="ios-list-item">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">⚡</div>
              <div style="flex:1">
                <div class="ios-list-label">AgentSpark</div>
                <div class="ios-list-sub">v2.4.0 — AI Agent Team Generator</div>
              </div>
            </div>
            <div class="ios-list-item" onclick="window._app.openImportModal();document.getElementById('ios-settings-sheet').classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">📥</div>
              <div style="flex:1"><div class="ios-list-label">Import Project</div></div>
              <span class="ios-list-chevron">›</span>
            </div>
          </div>
        </div>
      </div>
    `;
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.classList.remove('open'); });
    document.body.appendChild(sheet);
  }
  const isEn = state.lang === 'en';
  const langEn = document.getElementById('settings-lang-en');
  const langPl = document.getElementById('settings-lang-pl');
  if (langEn) langEn.style.display = isEn ? '' : 'none';
  if (langPl) langPl.style.display = !isEn ? '' : 'none';
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const themeLabel = document.getElementById('settings-theme-label');
  if (themeLabel) themeLabel.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  sheet.classList.add('open');
}

// ─── SIDEBAR ──────────────────────────────────────────────
let _sidebarCollapsed = false;

export function toggleChatSidebar() {
  _sidebarCollapsed = !_sidebarCollapsed;
  const layout = document.querySelector('.chat-layout');
  const btn    = document.getElementById('sidebar-toggle-btn');
  if (layout) layout.classList.toggle('sidebar-collapsed', _sidebarCollapsed);
  if (btn)    btn.textContent = _sidebarCollapsed ? '◀' : '▶';
  localStorage.setItem('agentspark-sidebar-collapsed', _sidebarCollapsed ? '1' : '0');
}

export function initSidebar() {
  if (localStorage.getItem('agentspark-sidebar-collapsed') === '1') {
    _sidebarCollapsed = true;
    const layout = document.querySelector('.chat-layout');
    const btn    = document.getElementById('sidebar-toggle-btn');
    if (layout) layout.classList.add('sidebar-collapsed');
    if (btn)    btn.textContent = '◀';
  }
}

// renderResults alias — used when loading a project
export function renderResults() {
  import('./results.js').then(m => m.showResults(false));
}

// ─── RESTART ──────────────────────────────────────────────
export function restart() {
  if (state.generatedAgents.length) {
    const save = window.confirm(
      state.lang === 'en'
        ? 'Save current project before starting over?'
        : 'Zapisać bieżący projekt przed rozpoczęciem od nowa?'
    );
    if (save) import('./db.js').then(m => m.saveCurrentProject(false));
  }

  // Reset all session state (preserves lang, apiKey, selectedModel)
  if (state.graphAnimFrame) { cancelAnimationFrame(state.graphAnimFrame); }
  resetState();

  document.getElementById('chat-messages').innerHTML = '';
  import('./interview.js').then(m => m.clearOptions());
  if (document.getElementById('refine-history')) document.getElementById('refine-history').innerHTML = '';
  document.getElementById('refine-panel').style.display    = 'none';
  document.getElementById('version-panel').style.display   = 'none';
  document.getElementById('scoring-panel').style.display   = 'none';
  document.getElementById('trace-panel').style.display     = 'none';
  document.getElementById('graph-section').style.display   = 'none';
  document.getElementById('instructions-section').style.display = 'none';
  document.getElementById('apiKeyHeader').style.display    = 'none';
  const gc = document.querySelector('.graph-container');
  if (gc) { const leg = gc.querySelector('.graph-legend'); if (leg) leg.remove(); }

  // Używa window.showScreen żeby przejść przez patch z navigation.js
  // (updateContextBar, updateDrawerActive, resetNavHide)
  window.showScreen('topic');
}

// ─── NOTIFICATIONS ────────────────────────────────────────
export function showNotif(msg, isError = false) {
  const old = document.querySelector('.notif');
  if (old) { old.classList.add('hiding'); setTimeout(() => old.remove(), 260); }

  const div = document.createElement('div');
  div.className = 'notif' + (isError ? ' error' : '');
  div.textContent = (isError ? '⚠ ' : '') + msg;
  if (isError) {
    div.style.color = 'var(--accent2)';
  } else if (msg.startsWith('✓') || msg.startsWith('↩')) {
    div.style.color = 'var(--success)';
  } else {
    div.style.color = 'var(--text)';
  }
  document.body.appendChild(div);

  clearTimeout(state.notifTimeout);
  state.notifTimeout = setTimeout(() => {
    div.classList.add('hiding');
    setTimeout(() => div.remove(), 260);
  }, 3200);
}
