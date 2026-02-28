// ─── VERSION HISTORY ─────────────────────────────────────
import { state } from './state.js';
import { showNotif } from './ui.js';
// showResults is lazy-imported below to break circular dep
import JSZip from 'jszip';

// ─── VERSION HISTORY ──────────────────────────────────────

export function renderVersionPanel() {
  const panel = document.getElementById('version-panel');
  const timeline = document.getElementById('version-timeline');
  const badge = document.getElementById('version-count-badge');
  const icon = document.getElementById('version-toggle-icon');

  const total = state.versionHistory.length;
  if(total === 0) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  badge.textContent = total;
  icon.className = 'version-toggle-icon' + (state.versionPanelOpen ? ' open' : '');
  timeline.className = 'version-timeline' + (state.versionPanelOpen ? ' open' : '');

  timeline.innerHTML = '';

  // Show newest first
  const reversed = [...state.versionHistory].reverse();

  reversed.forEach((v, ri) => {
    const isCurrentIdx = ri === 0;
    const origIdx = state.versionHistory.indexOf(v);           // index in state.versionHistory array

    const entry = document.createElement('div');
    entry.className = 'version-entry' + (isCurrentIdx ? ' current' : '') + (v.isOrigin ? ' origin' : '');

    // Diff tags
    const diffHtml = [
      ...v.diff.added.map(id =>
        `<span class="diff-tag diff-added">+${v.agentNames?.[id] || id}</span>`),
      ...v.diff.removed.map(id =>
        `<span class="diff-tag diff-removed">−${v.removedNames?.[id] || id}</span>`),
      ...v.diff.changed.map(id =>
        `<span class="diff-tag diff-changed">~${v.agentNames?.[id] || id}</span>`),
    ].join('');

    // Agent list preview
    const agentPreview = v.agents.map(a => a.name).join(', ');

    // Time label
    const timeLabel = formatVersionTime(v.ts);

    // Actions: can't restore current, can't diff origin
    const restoreBtn = !isCurrentIdx
      ? `<button class="version-btn restore-btn" onclick="restoreVersion(${origIdx})">↩ ${state.lang==='en'?'Restore':'Przywróć'}</button>`
      : `<span class="version-current-tag">CURRENT</span>`;

    const diffBtn = origIdx > 0
      ? `<button class="version-btn diff-btn" onclick="showDiffModal(${origIdx})">🔍 ${state.lang==='en'?'Diff':'Porównaj'}</button>`
      : '';

    const downloadBtn = `<button class="version-btn" onclick="downloadVersionZip(${origIdx})">⬇ ZIP</button>`;

    entry.innerHTML = `
      <div class="version-dot-col">
        <div class="version-dot">${v.isOrigin ? '●' : 'v' + v.vNum}</div>
      </div>
      <div class="version-card">
        <div class="version-card-top">
          <div class="version-label">${escapeHtml(v.label)}</div>
          <div class="version-time">${timeLabel}</div>
        </div>
        ${diffHtml ? `<div class="version-diff">${diffHtml}</div>` : ''}
        <div class="version-agents">⚡ ${agentPreview}</div>
        <div class="version-actions">
          ${restoreBtn}
          ${diffBtn}
          ${downloadBtn}
        </div>
      </div>
    `;
    timeline.appendChild(entry);
  });
}

export function toggleVersionPanel() {
  state.versionPanelOpen = !state.versionPanelOpen;
  renderVersionPanel();
}

export function formatVersionTime(ts) {
  if(!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffM = Math.floor(diffMs / 60000);
  if(diffM < 1)  return state.lang==='en' ? 'just now' : 'przed chwilą';
  if(diffM < 60) return `${diffM}m ${state.lang==='en'?'ago':'temu'}`;
  const diffH = Math.floor(diffM / 60);
  if(diffH < 24) return `${diffH}h ${state.lang==='en'?'ago':'temu'}`;
  return d.toLocaleDateString();
}

export function restoreVersion(idx) {
  if(idx < 0 || idx >= state.versionHistory.length) return;
  const v = state.versionHistory[idx];

  // Save current state as new version before restoring
  const alreadySaved = state.versionHistory[state.versionHistory.length - 1];
  // Don't double-save if idx is already last
  if(idx !== state.versionHistory.length - 1) {
    state.versionHistory.push({
      id: Date.now(),
      label: state.lang==='en' ? `Restored v${v.vNum}` : `Przywrócono v${v.vNum}`,
      ts: new Date(),
      agents: JSON.parse(JSON.stringify(v.agents)),
      files: JSON.parse(JSON.stringify(v.files)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(v.agents.map(a => [a.id, a.name])),
      vNum: state.versionHistory.length + 1,
    });
  }

  state.generatedAgents = JSON.parse(JSON.stringify(v.agents));
  state.generatedFiles  = JSON.parse(JSON.stringify(v.files));

  import('./results.js').then(m => m.showResults(true));
  buildGraphFromAgents();
  renderVersionPanel();

  showNotif(state.lang==='en'
    ? `↩ Restored to v${v.vNum}: "${v.label}"`
    : `↩ Przywrócono v${v.vNum}: "${v.label}"`);
}

export async function downloadVersionZip(idx) {
  if(typeof JSZip === 'undefined') { showNotif('JSZip not loaded', true); return; }
  const v = state.versionHistory[idx];
  if(!v) return;
  const zip = new JSZip();
  Object.entries(v.files).forEach(([name, content]) => zip.file(name, content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-v${v.vNum}-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(`✓ v${v.vNum} ZIP downloaded`);
}

export function showDiffModal(idx) {
  if(idx < 1 || idx >= state.versionHistory.length) return;
  const vNew = state.versionHistory[idx];
  const vOld = state.versionHistory[idx - 1];

  const modal = document.getElementById('diff-modal');
  const title = document.getElementById('diff-modal-title');
  const body  = document.getElementById('diff-modal-body');

  title.textContent = state.lang==='en'
    ? `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`
    : `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`;

  const { added, removed, changed } = vNew.diff;

  let html = '';

  if(added.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--success)">➕ ${state.lang==='en'?'Added Agents':'Dodani Agenci'} (${added.length})</div>
      ${added.map(id => {
        const a = vNew.agents.find(ag => ag.id === id);
        if(!a) return '';
        return `<div class="diff-agent-row row-added">
          <span class="row-icon">${a.emoji||'🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role||''}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(removed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--accent2)">🗑 ${state.lang==='en'?'Removed Agents':'Usunięci Agenci'} (${removed.length})</div>
      ${removed.map(id => {
        const a = vOld.agents.find(ag => ag.id === id);
        if(!a) return '';
        return `<div class="diff-agent-row row-removed">
          <span class="row-icon">${a.emoji||'🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role||''}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(changed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:#ffd580">✏ ${state.lang==='en'?'Modified Agents':'Zmodyfikowani Agenci'} (${changed.length})</div>
      ${changed.map(id => {
        const aNew = vNew.agents.find(ag => ag.id === id);
        const aOld = vOld.agents.find(ag => ag.id === id);
        if(!aNew) return '';
        const descChanged = aOld && aOld.description !== aNew.description;
        const roleChanged = aOld && aOld.role !== aNew.role;
        return `<div class="diff-agent-row row-changed">
          <span class="row-icon">${aNew.emoji||'🤖'}</span>
          <div style="flex:1">
            <div class="diff-agent-name">${aNew.name}</div>
            ${roleChanged ? `<div class="diff-agent-role" style="color:#ffd580">Role: ${aOld.role} → ${aNew.role}</div>` : ''}
            ${descChanged ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:0.25rem;line-height:1.4;">${aNew.description.slice(0,120)}${aNew.description.length>120?'…':''}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(!added.length && !removed.length && !changed.length) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.82rem;">
      ${state.lang==='en'?'No structural changes — metadata or descriptions updated.':'Brak zmian strukturalnych — zaktualizowano metadane lub opisy.'}
    </div>`;
  }

  // Agent count summary
  html = `<div style="display:flex;gap:1.5rem;padding:0 0 1.25rem;font-family:'Space Mono',monospace;font-size:0.72rem;color:var(--muted);border-bottom:1px solid var(--border);margin-bottom:1.25rem;">
    <span>${state.lang==='en'?'Before':'Przed'}: <strong style="color:var(--text)">${vOld.agents.length} ${state.lang==='en'?'agents':'agentów'}</strong></span>
    <span>→</span>
    <span>${state.lang==='en'?'After':'Po'}: <strong style="color:var(--text)">${vNew.agents.length} ${state.lang==='en'?'agents':'agentów'}</strong></span>
    <span style="margin-left:auto;">${state.lang==='en'?'Change':'Zmiana'}: ${vNew.agents.length - vOld.agents.length > 0 ? '+' : ''}${vNew.agents.length - vOld.agents.length}</span>
  </div>` + html;

  body.innerHTML = html;
  modal.classList.add('open');
}

export function closeDiffModal() {
  document.getElementById('diff-modal').classList.remove('open');
}

