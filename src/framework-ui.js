// ─── FRAMEWORK UI: modal · import · prompt export ────────────────────────────
// Pure UI — no code generation logic here. Generators live in same src/ dir.
import { state } from './state.js';
import { showNotif } from './ui.js';
import JSZip from 'jszip';
import { genCrewAI }    from './crewai.js';
import { genLangGraph } from './langgraph.js';
import { genAutoGen }   from './autogen.js';
import { genSwarm }     from './swarm.js';

// ── Framework registry ────────────────────────────────────────────────────────
export const FRAMEWORKS = [
  { id: 'crewai',    label: 'CrewAI',    badge: 'Python', logo: '🤝', pip: 'pip install crewai crewai-tools',
    desc: 'Role-based agents with tasks and tools. Best for sequential and hierarchical workflows.',
    url: 'https://docs.crewai.com', gen: genCrewAI },
  { id: 'langgraph', label: 'LangGraph', badge: 'Python', logo: '🔗', pip: 'pip install langgraph langchain-openai',
    desc: 'Stateful multi-agent graphs with cycles and branching. Best for complex conditional flows.',
    url: 'https://langchain-ai.github.io/langgraph', gen: genLangGraph },
  { id: 'autogen',   label: 'AutoGen',   badge: 'Python', logo: '🔄', pip: 'pip install pyautogen',
    desc: 'Conversational multi-agent framework with human-in-the-loop support. Best for agentic chat.',
    url: 'https://microsoft.github.io/autogen', gen: genAutoGen },
  { id: 'swarm',     label: 'Swarm',     badge: 'Python', logo: '🐝', pip: 'pip install git+https://github.com/openai/swarm.git',
    desc: 'Lightweight OpenAI Swarm with handoffs between agents. Best for simple agent routing.',
    url: 'https://github.com/openai/swarm', gen: genSwarm },
];

export function generateFrameworkCode(fwId) {
  return FRAMEWORKS.find(f => f.id === fwId)?.gen() ?? '# Unknown framework';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Framework export modal ────────────────────────────────────────────────────
export function exportFramework() {
  if (!state.generatedAgents.length) {
    showNotif(state.lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  _renderFwModal();
  document.getElementById('fw-modal').classList.add('open');
}

export function switchFwTab(id) {
  state.activeFwTab = id;
  _renderFwModal();
}

function _renderFwModal() {
  const tabsEl = document.getElementById('fw-tabs');
  const bodyEl = document.getElementById('fw-body');
  tabsEl.innerHTML = '';
  bodyEl.innerHTML = '';

  FRAMEWORKS.forEach(fw => {
    // Tab button
    const tab = document.createElement('button');
    tab.className = 'fw-tab' + (state.activeFwTab === fw.id ? ' active' : '');
    tab.innerHTML = `${fw.logo} ${fw.label} <span class="fw-badge">${fw.badge}</span>`;
    tab.onclick   = () => switchFwTab(fw.id);
    tabsEl.appendChild(tab);

    // Pane
    const pane = document.createElement('div');
    pane.className = 'fw-pane' + (state.activeFwTab === fw.id ? ' active' : '');
    const code = fw.gen();
    pane.innerHTML = `
      <div class="fw-info">
        <div class="fw-info-text">
          <div class="fw-info-title">${fw.logo} ${fw.label}</div>
          <div class="fw-info-desc">${fw.desc} <a href="${fw.url}" target="_blank" style="color:var(--accent);text-decoration:none;">Docs ↗</a></div>
        </div>
      </div>
      <div class="fw-code-wrap">
        <pre id="fw-code-${fw.id}">${escapeHtml(code)}</pre>
      </div>
      <div class="fw-footer-row">
        <div class="fw-pip">$ ${fw.pip}</div>
        <button class="modal-download-btn" onclick="copyFwCode('${fw.id}')">📋 ${state.lang === 'en' ? 'Copy' : 'Kopiuj'}</button>
        <button class="modal-download-btn" onclick="downloadFwCode('${fw.id}')">⬇ ${state.lang === 'en' ? 'Download .py' : 'Pobierz .py'}</button>
      </div>
    `;
    bodyEl.appendChild(pane);
  });
}

export function copyFwCode(fwId) {
  navigator.clipboard.writeText(generateFrameworkCode(fwId))
    .then(() => showNotif(state.lang === 'en' ? '✓ Code copied to clipboard!' : '✓ Kod skopiowany!'))
    .catch(() => showNotif(state.lang === 'en' ? '⚠ Copy failed — select manually' : '⚠ Kopiowanie nieudane', true));
}

export function downloadFwCode(fwId) {
  const code     = generateFrameworkCode(fwId);
  const slug     = state.currentTopic.toLowerCase().replace(/\s+/g, '_');
  const filename = `${fwId}_${slug}.py`;
  const a        = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
    download: filename,
  });
  a.click();
  showNotif(`✓ ${filename} downloaded`);
}

// ── Import modal ──────────────────────────────────────────────────────────────
let _importParsed = null;

export function openImportModal()  { resetImportModal(); document.getElementById('import-modal').classList.add('open'); }
export function closeImportModal() { document.getElementById('import-modal').classList.remove('open'); _importParsed = null; }

export function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById('import-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _processImportFile(file);
}

export function handleImportFileSelect(input) {
  const file = input.files?.[0];
  if (file) _processImportFile(file);
  input.value = '';
}

export async function _processImportFile(file) {
  _clearImportError();
  const ext = file.name.split('.').pop().toLowerCase();
  try {
    if      (ext === 'json') await _parseImportJson(await file.text(), file.name);
    else if (ext === 'zip')  await _parseImportZip(file);
    else _showImportError(`Unsupported file type ".${ext}". Please use .json or .zip`);
  } catch (e) {
    _showImportError('Failed to read file: ' + e.message);
  }
}

async function _parseImportJson(text, filename) {
  let data;
  try   { data = JSON.parse(text); }
  catch (e) { _showImportError('Invalid JSON: ' + e.message); return; }

  let payload;
  if (Array.isArray(data) && data[0]?.id && data[0]?.name) {
    payload = { agents: data, topic: 'Imported', level: 'iskra', files: {} };
  } else if (data.agents?.length) {
    payload = data;
  } else {
    _showImportError("No agents found in this JSON file. Make sure it's an AgentSpark export.");
    return;
  }
  _importParsed = { ...payload, _sourceFile: filename };
  _showImportPreview(payload, filename);
}

async function _parseImportZip(file) {
  let zip;
  try   { zip = await JSZip.loadAsync(file); }
  catch (e) { _showImportError('Cannot open ZIP: ' + e.message); return; }

  // Strategy 1: agentspark.json manifest
  const manifestFile = zip.file('agentspark.json');
  if (manifestFile) {
    return _parseImportJson(await manifestFile.async('text'), file.name + ' → agentspark.json');
  }

  // Strategy 2: any JSON with agents
  for (const jf of Object.keys(zip.files).filter(n => n.endsWith('.json') && !zip.files[n].dir)) {
    try {
      const data = JSON.parse(await zip.file(jf).async('text'));
      if (data.agents?.length) {
        _importParsed = { ...data, _sourceFile: file.name };
        _showImportPreview(data, file.name);
        return;
      }
    } catch (_) { /* try next */ }
  }

  // Strategy 3: reconstruct from .md files
  const mdNames = Object.keys(zip.files).filter(n => n.endsWith('.md') && !zip.files[n].dir);
  if (!mdNames.length) { _showImportError('No recognizable AgentSpark files found in this ZIP.'); return; }

  const mdFiles = {};
  for (const mf of mdNames) mdFiles[mf] = await zip.file(mf).async('text');

  const reconstructed = _reconstructFromMdFiles(mdFiles);
  if (!reconstructed.agents.length) { _showImportError('Could not reconstruct agents from .md files in this ZIP.'); return; }
  _importParsed = { ...reconstructed, _sourceFile: file.name };
  _showImportPreview(reconstructed, file.name);
}

function _reconstructFromMdFiles(mdFiles) {
  const agents = [];
  const files  = { ...mdFiles };
  let topic    = 'Imported from ZIP';

  const topicMatch = mdFiles['README.md']?.match(/\*\*Project:\*\*\s*(.+)/);
  if (topicMatch) topic = topicMatch[1].trim();

  Object.entries(mdFiles).forEach(([name, content]) => {
    if (!name.startsWith('agent-') || !name.endsWith('.md')) return;
    const idSlug   = name.replace(/^agent-/, '').replace(/\.md$/, '');
    const nameM    = content.match(/^#\s+Agent:\s+(.+)/m);
    const roleM    = content.match(/\*\*Role:\*\*\s*(.+)/m);
    const emojiM   = content.match(/^##\s+Identity[\s\S]*?([^\w\s])/m);
    const descM    = content.match(/^##\s+Goal\s*\n+([\s\S]+?)(?:\n##|$)/m);
    agents.push({
      id:          idSlug,
      name:        nameM?.[1]?.trim()  || idSlug,
      emoji:       emojiM?.[1]         || '🤖',
      type:        'technical',
      role:        roleM?.[1]?.trim()  || 'Agent',
      description: descM?.[1]?.trim().slice(0, 200) || '',
      agentMd:     content,
      skillMd:     mdFiles[`skill-${idSlug}.md`] || '',
    });
  });

  return { agents, files, topic, level: 'iskra', lang: 'en' };
}

function _showImportPreview(payload, filename) {
  const agents    = payload.agents || [];
  const fileCount = Object.keys(payload.files || {}).length;

  document.getElementById('import-preview-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1.5rem;margin-bottom:0.75rem;">
      <div><span style="color:var(--muted);font-size:0.72rem;">FILE</span><br/><strong style="font-size:0.85rem;">${_escHtml(filename)}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">TOPIC</span><br/><strong style="font-size:0.85rem;">${_escHtml(payload.topic || '—')}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">LEVEL</span><br/><strong style="font-size:0.85rem;">${payload.level || '—'}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">FILES</span><br/><strong style="font-size:0.85rem;">${fileCount} .md files</strong></div>
    </div>
    <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.4rem;">AGENTS (${agents.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
      ${agents.map(a => `<span style="font-size:0.75rem;padding:0.2rem 0.55rem;border-radius:5px;
        background:${a.type === 'technical' ? 'rgba(124,58,255,0.12)' : 'rgba(255,107,53,0.12)'};
        border:1px solid ${a.type === 'technical' ? 'rgba(196,147,10,0.3)' : 'rgba(255,107,53,0.3)'};
        color:${a.type === 'technical' ? 'var(--accent3)' : 'var(--accent2)'}">${a.emoji || '🤖'} ${_escHtml(a.name)}</span>`).join('')}
    </div>
    ${!agents.length ? '<div style="color:var(--accent2);">⚠ No agents detected</div>' : ''}
  `;

  document.getElementById('import-preview').style.display = 'block';
  const dz = document.getElementById('import-dropzone');
  dz.style.opacity        = '0.5';
  dz.style.pointerEvents  = 'none';
}

export async function confirmImport() {
  if (!_importParsed) return;
  const p          = _importParsed;
  const saveToDb   = document.getElementById('import-save-checkbox')?.checked !== false;

  state.currentTopic    = p.topic  || 'Imported Project';
  state.currentLevel    = p.level  || 'iskra';
  if (p.lang) { state.lang = p.lang; window.setLang?.(state.lang); }
  state.generatedAgents = JSON.parse(JSON.stringify(p.agents || []));
  state.generatedFiles  = JSON.parse(JSON.stringify(p.files  || {}));

  // Regenerate missing files
  if (!state.generatedFiles['README.md'] && state.generatedAgents.length) {
    state.generatedFiles['README.md'] = window.generateReadme?.() ?? '';
  }
  state.generatedAgents.forEach(a => {
    if (!state.generatedFiles[`agent-${a.id}.md`] && a.agentMd) state.generatedFiles[`agent-${a.id}.md`] = a.agentMd;
    if (!state.generatedFiles[`skill-${a.id}.md`]  && a.skillMd)  state.generatedFiles[`skill-${a.id}.md`]  = a.skillMd;
  });

  state.versionHistory = [{
    id: Date.now(),
    label: state.lang === 'en' ? `Imported: ${state.currentTopic}` : `Zaimportowany: ${state.currentTopic}`,
    ts:    new Date(),
    agents: JSON.parse(JSON.stringify(state.generatedAgents)),
    files:  JSON.parse(JSON.stringify(state.generatedFiles)),
    diff:   { added: [], removed: [], changed: [] },
    removedNames: {},
    agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
    vNum: 1,
    isOrigin: true,
  }];

  window._currentProjectId = null;

  closeImportModal();
  window.showScreen('results');
  document.getElementById('apiKeyHeader').style.display = 'flex';
  window.showResults?.(false);

  if (saveToDb) await window.saveCurrentProject?.(true);

  showNotif(state.lang === 'en'
    ? `✓ Imported "${state.currentTopic}" — ${state.generatedAgents.length} agents`
    : `✓ Zaimportowano "${state.currentTopic}" — ${state.generatedAgents.length} agentów`
  );
}

export function resetImportModal() {
  _importParsed = null;
  document.getElementById('import-preview') ?.style && (document.getElementById('import-preview').style.display  = 'none');
  document.getElementById('import-error')   ?.style && (document.getElementById('import-error').style.display    = 'none');
  const dz = document.getElementById('import-dropzone');
  if (dz) { dz.style.opacity = ''; dz.style.pointerEvents = ''; }
}

function _showImportError(msg) {
  const el = document.getElementById('import-error');
  if (!el) return;
  el.textContent   = '⚠ ' + msg;
  el.style.display = 'block';
}

function _clearImportError() {
  const el = document.getElementById('import-error');
  if (el) el.style.display = 'none';
}

// ── Prompt export modal ───────────────────────────────────────────────────────
let _activePromptTab = 'interview';

const PROMPT_TAB_DESCS = {
  interview: 'System prompt used during the AI interview phase — guides question format, depth calibration, and IMPACT notes.',
  generate:  'System prompt used to generate your agent team JSON from interview answers.',
  refine:    'System prompt used when refining / editing an existing team.',
};

export function openPromptExport()  { _activePromptTab = 'interview'; _renderPromptTab('interview'); document.getElementById('prompt-export-modal').classList.add('open'); }
export function closePromptExport() { document.getElementById('prompt-export-modal').classList.remove('open'); }

export function switchPromptTab(tab) {
  _activePromptTab = tab;
  document.querySelectorAll('.prompt-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('ptab-' + tab)?.classList.add('active');
  _renderPromptTab(tab);
}

function _getPromptForTab(tab) {
  if (tab === 'interview') return window.getSystemPrompt?.()       ?? '';
  if (tab === 'generate')  return (window.getSystemPrompt?.()      ?? '') + '\n\n--- GENERATION PHASE TRIGGER ---\nWhen user sends [GENERATE], respond with the JSON agent team.';
  if (tab === 'refine')    return window.getRefineSystemPrompt?.() ?? '';
  return '';
}

function _renderPromptTab(tab) {
  const ta   = document.getElementById('prompt-export-textarea');
  const desc = document.getElementById('prompt-tab-desc');
  if (ta)   ta.value          = _getPromptForTab(tab);
  if (desc) desc.textContent  = PROMPT_TAB_DESCS[tab] || '';
  const fb = document.getElementById('copy-prompt-feedback');
  if (fb) { fb.textContent = ''; fb.style.opacity = '0'; }
}

export async function copyPromptToClipboard() {
  const ta  = document.getElementById('prompt-export-textarea');
  const fb  = document.getElementById('copy-prompt-feedback');
  const btn = document.getElementById('copy-prompt-btn');
  if (!ta) return;
  try {
    await navigator.clipboard.writeText(ta.value);
  } catch (_) {
    ta.select();
    document.execCommand('copy');
  }
  if (fb)  { fb.textContent = '✓ Copied!'; fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 2000); }
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = orig; }, 1500); }
}

export function downloadPromptTxt() {
  const content  = _getPromptForTab(_activePromptTab);
  const slug     = (state.currentTopic || 'agentspark').toLowerCase().replace(/\s+/g, '-');
  const filename = `prompt-${_activePromptTab}-${slug}.txt`;
  const a        = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: 'text/plain' })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Modal backdrop listeners ──────────────────────────────────────────────────
export function initFrameworkBackdrops() {
  [
    ['fw-modal',             () => document.getElementById('fw-modal').classList.remove('open')],
    ['diff-modal',           () => window.closeDiffModal?.()],
    ['prompt-export-modal',  closePromptExport],
    ['import-modal',         closeImportModal],
  ].forEach(([id, fn]) => {
    document.getElementById(id)?.addEventListener('click', function (e) {
      if (e.target === this) fn();
    });
  });
}
