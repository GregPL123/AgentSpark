// ─── PERSISTENT PROJECTS ────────────────────────────────────
import { state } from './state.js';
import { showNotif } from './ui.js';
// NOTE: model, showScreen, renderResults use lazy import() to break circular deps

const DB_NAME    = 'agentspark-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
let _db = null;
let _currentProjectId = null;
let _autoSaveTimer = null;

export function dbOpen() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

export async function dbGetAll() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('updatedAt').getAll();
    req.onsuccess = e => resolve(e.target.result.reverse());
    req.onerror   = e => reject(e.target.error);
  });
}

export async function dbGet(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function dbPut(project) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(project);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function dbDelete(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    req.onsuccess = e => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

function _projectSnapshot() {
  return {
    topic:          state.currentTopic,
    level:          state.currentLevel,
    lang:           state.lang,
    modelProvider:  state.selectedModel.provider,
    modelId:        state.selectedModel.model,
    agents:         JSON.parse(JSON.stringify(state.generatedAgents)),
    files:          JSON.parse(JSON.stringify(state.generatedFiles)),
    versionHistory: JSON.parse(JSON.stringify(state.versionHistory)),
    chatHistory:    JSON.parse(JSON.stringify(state.chatHistory)),
  };
}

function _projectName(topic) {
  return topic || 'Untitled Project';
}

export function scheduleAutoSave() {
  if (!state.generatedAgents.length) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveCurrentProject(true), 2000);
}

export async function saveCurrentProject(silent = false) {
  if (!state.generatedAgents.length) {
    if (!silent) showNotif(state.lang === 'en' ? '⚠ Generate a team first before saving' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  try {
    const now = Date.now();
    const snap = _projectSnapshot();
    if (_currentProjectId) {
      const existing = await dbGet(_currentProjectId);
      if (existing) {
        await dbPut({ ...existing, ...snap, updatedAt: now });
      } else {
        _currentProjectId = null;
      }
    }
    if (!_currentProjectId) {
      _currentProjectId = 'proj_' + now + '_' + Math.random().toString(36).slice(2,7);
      await dbPut({ id: _currentProjectId, name: _projectName(state.currentTopic), createdAt: now, updatedAt: now, ...snap });
    } else {
      const existing = await dbGet(_currentProjectId);
      if (existing) await dbPut({ ...existing, name: _projectName(state.currentTopic), updatedAt: now, ...snap });
    }
    _showSaveIndicator();
    await _updateProjectsBadge();
    if (!silent) showNotif(state.lang === 'en' ? '✓ Project saved!' : '✓ Projekt zapisany!');
  } catch(e) {
    console.error('[AgentSpark] Save failed:', e);
    if (!silent) showNotif(state.lang === 'en' ? '⚠ Save failed: ' + e.message : '⚠ Błąd zapisu: ' + e.message, true);
  }
}

function _showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = '✓ saved';
  el.classList.add('visible');
  clearTimeout(_showSaveIndicator._t);
  _showSaveIndicator._t = setTimeout(() => el.classList.remove('visible'), 2500);
}

export async function loadProject(id) {
  try {
    const proj = await dbGet(id);
    if (!proj) { showNotif('⚠ Project not found', true); return; }
    state.currentTopic    = proj.topic      || '';
    state.currentLevel    = proj.level      || 'iskra';
    state.lang            = proj.lang       || 'en';
    state.generatedAgents = proj.agents     || [];
    state.generatedFiles  = proj.files      || {};
    state.versionHistory  = proj.versionHistory || [];
    state.chatHistory     = proj.chatHistory    || [];
    _currentProjectId     = proj.id;
    if (proj.modelId) {
      const opt = document.querySelector(`#modelSelect option[value*="${proj.modelId}"]`);
      if (opt) { opt.selected = true; import('./model.js').then(m => m.onModelChange()); }
    }
    import('./model.js').then(m => m.setLang(state.lang));
    window.showScreen('results');
    document.getElementById('apiKeyHeader').style.display = 'flex';
    import('./ui.js').then(m => m.renderResults());
    _showSaveIndicator();
    showNotif(state.lang === 'en' ? `📂 "${proj.name}" loaded` : `📂 Załadowano "${proj.name}"`);
  } catch(e) {
    console.error('[AgentSpark] Load failed:', e);
    showNotif('⚠ Failed to load project: ' + e.message, true);
  }
}

export async function deleteProject(id, name) {
  const confirmed = window.confirm(
    state.lang === 'en'
      ? `Delete project "${name}"? This cannot be undone.`
      : `Usunąć projekt "${name}"? Tej operacji nie można cofnąć.`
  );
  if (!confirmed) return;
  try {
    await dbDelete(id);
    if (_currentProjectId === id) _currentProjectId = null;
    await renderProjectsList();
    await _updateProjectsBadge();
    showNotif(state.lang === 'en' ? '🗑 Project deleted' : '🗑 Projekt usunięty');
  } catch(e) {
    showNotif('⚠ Delete failed: ' + e.message, true);
  }
}

export async function forkProject(id) {
  try {
    const proj = await dbGet(id);
    if (!proj) return;
    const now = Date.now();
    const newId = 'proj_' + now + '_' + Math.random().toString(36).slice(2,7);
    await dbPut({ ...proj, id: newId, name: proj.name + ' (copy)', createdAt: now, updatedAt: now });
    await renderProjectsList();
    await _updateProjectsBadge();
    showNotif(state.lang === 'en' ? '✓ Project duplicated' : '✓ Projekt zduplikowany');
  } catch(e) {
    showNotif('⚠ Fork failed: ' + e.message, true);
  }
}

export async function openProjectsScreen() {
  _updateContextBar('projects');
  window.showScreen('projects');
  await renderProjectsList();
}

export async function renderProjectsList() {
  const list   = document.getElementById('projects-list');
  const empty  = document.getElementById('projects-empty');
  const search = (document.getElementById('projects-search')?.value || '').toLowerCase();
  if (!list) return;
  let projects = [];
  try { projects = await dbGetAll(); } catch(e) { console.error(e); }
  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search) || (p.topic||'').toLowerCase().includes(search))
    : projects;
  if (!filtered.length) {
    list.innerHTML  = '';
    list.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }
  list.style.display  = 'grid';
  empty.style.display = 'none';
  list.innerHTML = filtered.map(p => {
    const updated = _formatDate(p.updatedAt);
    const agentCount = (p.agents||[]).length;
    const isCurrent = p.id === _currentProjectId;
    return `
    <div class="project-card-wrap" id="wrap-${p.id}">
    <div class="project-swipe-actions" aria-hidden="true">
      <button class="swipe-action-btn open-btn" onclick="loadProject('${p.id}')"><span class="sa-icon">▶</span>Open</button>
      <button class="swipe-action-btn fork-btn" onclick="forkProject('${p.id}')"><span class="sa-icon">⎘</span>Fork</button>
      <button class="swipe-action-btn del-btn" onclick="deleteProject('${p.id}', '${_escHtml(p.name).replace(/'/g,"\\'")}')"><span class="sa-icon">🗑</span>Del</button>
    </div>
    <div class="project-card" tabindex="0" role="button" aria-label="${_escHtml(p.name)}" onclick="loadProject('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
        <div class="project-card-name">${_escHtml(p.name)}${isCurrent ? '<span class="project-unsaved-dot" title="Current project"></span>' : ''}</div>
      </div>
      <div class="project-card-topic">📌 ${_escHtml(p.topic||'No topic')}</div>
      <div class="project-card-meta">
        ${agentCount ? `<span class="project-card-tag">👥 ${agentCount} agents</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
        ${p.lang  ? `<span class="project-card-tag">${p.lang.toUpperCase()}</span>` : ''}
      </div>
      <div class="project-card-date">Updated ${updated}</div>
      <div class="project-card-actions" onclick="event.stopPropagation()">
        <button class="project-card-btn" onclick="loadProject('${p.id}')">▶ Open</button>
        <button class="project-card-btn" onclick="forkProject('${p.id}')">⎘ Fork</button>
        <button class="project-card-btn danger" onclick="deleteProject('${p.id}', '${_escHtml(p.name).replace(/'/g,"\\\'") }')">🗑</button>
      </div>
    </div>
    </div>`;
  }).join('');
}

async function _updateProjectsBadge() {
  try {
    const all = await dbGetAll();
    const badge = document.getElementById('projects-count-badge');
    const tabBadge = document.getElementById('tab-badge');
    if (!badge) return;
    if (all.length > 0) {
      badge.textContent = all.length + ' ';
      badge.style.display = 'inline';
      if (tabBadge) { tabBadge.textContent = all.length; tabBadge.style.display = ''; }
    } else {
      badge.style.display = 'none';
      if (tabBadge) tabBadge.style.display = 'none';
    }
  } catch(e) {}
}

function _formatDate(ts) {
  if (!ts) return '—';
  const d   = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
  return d.toLocaleDateString();
}

function _escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function onAgentsReady() {
  scheduleAutoSave();
  _updateProjectsBadge();
}

export async function initDb() {
  try {
    await dbOpen();
    await _updateProjectsBadge();
  } catch(e) {
    console.warn('[AgentSpark] IndexedDB init failed:', e);
  }
  import('./model.js').then(m => m.toggleApiSetup(true));
  const savedKey = localStorage.getItem('agentspark-api-key');
  if (savedKey) {
    state.apiKey = savedKey;
    const inp = document.getElementById('apiKeySetupInput');
    if (inp) inp.value = savedKey;
    import('./model.js').then(m => m.checkApiKey());
  }
}
