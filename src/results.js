// ─── RESULTS SCREEN ──────────────────────────────────────
import { state } from './state.js';
import { t } from './i18n.js';
import { renderMarkdown } from './markdown.js';
import { buildGraphFromAgents } from './graph.js';
import { showNotif, _showGeneratingState } from './ui.js';
// renderVersionPanel is lazy-imported below to break circular dep
import { onAgentsReady } from './db.js';
import JSZip from 'jszip';

// ─── RESULTS SCREEN ───────────────────────────────────────
export function showResults(skipReset = false) {
  window.showScreen('results');
  _updateContextBar('results');
  // Show skeleton while agents render
  if (!skipReset) _renderSkeletonCards(4);

  document.getElementById('result-badge').textContent = t('resultBadge');
  document.getElementById('result-title').textContent = t('resultTitle');
  document.getElementById('result-sub').textContent = t('resultSub');
  document.getElementById('download-btn').textContent = t('downloadBtn');
  document.getElementById('instr-btn').textContent = t('instrBtn');
  document.getElementById('refine-btn').textContent = t('refineBtn');
  document.getElementById('md-preview-btn').textContent = state.lang === 'en' ? '📄 Preview Docs' : '📄 Podgląd Docs';
  document.getElementById('fw-export-btn').textContent = state.lang === 'en' ? '🚀 Export Framework' : '🚀 Eksport Framework';

  import('./versions.js').then(m => m.renderVersionPanel());
  renderTraceLive();

  if(!skipReset) {
    refineHistory = [];
    isRefining = false;
    refineSnapshots = [];
    selectedRefineAction = null;
    document.getElementById('refine-panel').style.display = 'none';
    document.getElementById('refine-history').innerHTML = '';
  }

  const lvl = t('levels').find(l => l.id === currentLevel);
  if(lvl) {
    document.getElementById('result-badge').textContent = lvl.emoji + ' ' + lvl.name.toUpperCase() + ' — ' + t('resultBadge');
    document.getElementById('result-badge').style.borderColor = lvl.color + '66';
    document.getElementById('result-badge').style.color = lvl.color;
  }

  if(!skipReset) {
    let scoringAttempts = 0;
    const tryRenderScoring = () => {
      scoringAttempts++;
      if(window._scoringData !== undefined) {
        renderScoring(window._scoringData);
      } else if(scoringAttempts < 30) {
        setTimeout(tryRenderScoring, 400);
      }
      // silently give up after 12s — scoring is non-critical
    };
    setTimeout(tryRenderScoring, 300);
  }

  // Always ensure graph section is visible when results are shown
  document.getElementById('graph-title').textContent = state.lang==='en' ? 'Agent Dependency Graph' : 'Graf Zależności Agentów';
  document.getElementById('graph-section').style.display = 'block';

  // Auto-save hook (#1)
  _onAgentsReady();

  const grid = document.getElementById('agents-grid');
  grid.innerHTML = '';

  const technical = state.generatedAgents.filter(a => a.type === 'technical');
  const business  = state.generatedAgents.filter(a => a.type !== 'technical');

  function makeAgentCard(agent) {
    const isTech = agent.type === 'technical';
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.type = agent.type || 'technical';
    card.dataset.agentId = agent.id;
    card.innerHTML = `
      <div class="agent-card-header">
        <div class="agent-avatar" style="background:${isTech ? 'linear-gradient(145deg,#c49a0a,#f2b90d)' : 'linear-gradient(145deg,#c44010,#e05a1a)'}">${agent.emoji || '🤖'}</div>
        <div class="agent-card-meta">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-role">${agent.role}</div>
          <div class="agent-type-badge ${isTech ? 'badge-tech' : 'badge-biz'}" style="display:inline-block;margin-top:0.4rem;">${isTech ? (state.lang==='en'?'Technical':'Techniczny') : (state.lang==='en'?'Business':'Biznesowy')}</div>
        </div>
      </div>
      <div class="agent-card-divider"></div>
      <div class="agent-card-body">
        <div class="agent-desc">${agent.description}</div>
        <div class="file-chips-group">
          <span class="file-chips-label">Files</span>
          <div class="file-chips">
            <div class="file-chip" tabindex="0" role="button" onclick="previewFile('agent-${agent.id}.md')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('agent-${agent.id}.md')}">agent-${agent.id}.md</div>
            <div class="file-chip" tabindex="0" role="button" onclick="previewFile('skill-${agent.id}.md')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('skill-${agent.id}.md')}">skill-${agent.id}.md</div>
          </div>
        </div>
      </div>
    `;
    card.tabIndex = 0;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `${agent.name} — ${agent.role}`);
    return card;
  }

  function makeSection(title, icon, agents, colorClass) {
    if(agents.length === 0) return;
    const section = document.createElement('div');
    section.className = 'agent-section';
    section.innerHTML = `<div class="agent-section-header ${colorClass}"><span>${icon}</span><span>${title}</span><span class="section-count">${agents.length}</span></div>`;
    const sg = document.createElement('div');
    sg.className = 'agents-grid';
    agents.forEach(a => sg.appendChild(makeAgentCard(a)));
    section.appendChild(sg);
    grid.appendChild(section);
  }

  makeSection(
    state.lang==='en' ? 'Technical Agents — Build your app' : 'Agenci Techniczni — Budują aplikację',
    '⚙️', technical, 'section-tech'
  );
  makeSection(
    state.lang==='en' ? 'Business Agents — Shape your vision' : 'Agenci Biznesowi — Nadają kontekst',
    '💼', business, 'section-biz'
  );

  const configWrap = document.createElement('div');
  configWrap.className = 'agent-section';
  configWrap.innerHTML = `<div class="agent-section-header section-config"><span>🔗</span><span>${state.lang==='en'?'Team Configuration':'Konfiguracja Zespołu'}</span></div>`;
  const configGrid = document.createElement('div');
  configGrid.className = 'agents-grid';
  const configCard = document.createElement('div');
  configCard.className = 'agent-card';
  configCard.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-avatar" style="background:linear-gradient(145deg,#2a2510,#3a3218)">🔗</div>
      <div class="agent-card-meta">
        <div class="agent-name">${state.lang==='en' ? 'Team Configuration' : 'Konfiguracja Zespołu'}</div>
        <div class="agent-role">Orchestration</div>
      </div>
    </div>
    <div class="agent-card-divider"></div>
    <div class="agent-card-body">
      <div class="agent-desc">${state.lang==='en' ? 'Defines how all agents connect and collaborate.' : 'Definiuje jak agenci się łączą i współpracują.'}</div>
      <div class="file-chips-group">
        <span class="file-chips-label">Files</span>
        <div class="file-chips">
          <div class="file-chip" onclick="previewFile('team-config.md')">team-config.md</div>
          <div class="file-chip" onclick="previewFile('README.md')">README.md</div>
        </div>
      </div>
    </div>
  `;
  configGrid.appendChild(configCard);
  configWrap.appendChild(configGrid);
  grid.appendChild(configWrap);
  // Sync FAB after agents rendered
  _syncFab();

  setTimeout(() => {
    buildGraphFromAgents();
    const gc = document.querySelector('.graph-container');
    if(gc && !gc.querySelector('.graph-legend')) {
      const leg = document.createElement('div');
      leg.className = 'graph-legend';
      leg.innerHTML = `
        <span><div class="legend-dot" style="background:#f2b90d"></div>${state.lang==='en'?'Technical agent':'Agent techniczny'}</span>
        <span><div class="legend-dot" style="background:#e05a1a"></div>${state.lang==='en'?'Business agent':'Agent biznesowy'}</span>
        <span style="font-size:0.65rem;margin-left:auto;color:var(--muted)">— — ${state.lang==='en'?'context flow':'przepływ kontekstu'} &nbsp;&nbsp;—— ${state.lang==='en'?'pipeline':'pipeline'}</span>
      `;
      gc.appendChild(leg);
    }
  }, 100);
}

export function showInstructions() {
  const section = document.getElementById('instructions-section');
  const isHidden = getComputedStyle(section).display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  if(isHidden) {
    document.getElementById('instr-title').textContent = t('instrTitle');
    const steps = document.getElementById('instr-steps');
    steps.innerHTML = '';
    t('instrSteps').forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'instruction-step';
      div.innerHTML = `<div class="num">0${i+1}</div><div class="content"><strong>${step.title}</strong><p>${step.body}</p></div>`;
      steps.appendChild(div);
    });
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export async function downloadZip() {
  if(typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true); return;
  }
  const zip = new JSZip();
  Object.entries(state.generatedFiles).forEach(([name, content]) => {
    zip.file(name, content);
  });
  // Embed project manifest for lossless re-import (#4)
  const manifest = {
    v: 2,
    source: 'agentspark',
    topic: state.currentTopic,
    level: currentLevel,
    state.lang,
    agents: state.generatedAgents,
    files: state.generatedFiles,
    ts: Date.now(),
  };
  zip.file('agentspark.json', JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-${state.currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(state.lang==='en' ? '✓ ZIP downloaded successfully!' : '✓ ZIP pobrany pomyślnie!');
}

