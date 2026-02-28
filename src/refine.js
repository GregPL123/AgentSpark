// ─── REFINE TEAM ─────────────────────────────────────────
import { state } from './state.js';
import { t } from './i18n.js';
import { callLLM } from './api.js';
import { showNotif, _showGeneratingState, _syncFab } from './ui.js';
import { renderMarkdown } from './markdown.js';
import { showResults } from './results.js';
import { renderVersionPanel, toggleVersionPanel } from './versions.js';
import { scheduleAutoSave } from './db.js';
import { generateReadme } from './interview.js';
import { buildGraphFromAgents } from './graph.js';

// ─── REFINE MODE ─────────────────────────────────────────────

export function openRefine() {
  const panel = document.getElementById('refine-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('refine-title').textContent = t('refineTitle');
  document.getElementById('refine-sub').textContent = t('refineSub');
  document.getElementById('refine-input').placeholder = t('refinePlaceholder');
  document.getElementById('refine-submit-label').textContent = t('refineApply');

  // Always start at step 1
  const s1 = document.getElementById('refine-step1');
  const s2 = document.getElementById('refine-step2');
  if(s1) s1.style.display = 'block';
  if(s2) s2.style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  document.getElementById('refine-history').innerHTML = '';
  _pendingRefineData = null;

  const chips = document.getElementById('refine-action-chips');
  chips.innerHTML = '';
  t('refineActions').forEach(action => {
    const chip = document.createElement('button');
    chip.className = 'refine-chip' + (state.selectedRefineAction === action.id ? ' active' : '');
    chip.dataset.id = action.id;
    chip.innerHTML = `<span>${action.emoji}</span><span>${action.label}</span>`;
    chip.title = action.desc;
    chip.onclick = () => {
      state.selectedRefineAction = action.id;
      chips.querySelectorAll('.refine-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ta = document.getElementById('refine-input');
      if(!ta.value.trim()) {
        const hints = {
          improve: state.lang === 'en' ? 'Improve overall agent descriptions and add more specific skills...' : 'Ulepsz opisy agentów i dodaj bardziej szczegółowe umiejętności...',
          add: state.lang === 'en' ? 'Add a [type] agent that handles [responsibility]...' : 'Dodaj agenta [typ] który zajmuje się [odpowiedzialność]...',
          remove: state.lang === 'en' ? 'Remove the [agent name] agent and redistribute its responsibilities...' : 'Usuń agenta [nazwa] i redystrybuuj jego obowiązki...',
          connections: state.lang === 'en' ? 'Change the connection so that [agent A] sends results directly to [agent B]...' : 'Zmień połączenie tak żeby [agent A] wysyłał wyniki bezpośrednio do [agent B]...',
        };
        ta.value = '';
        ta.placeholder = hints[action.id] || t('refinePlaceholder');
      }
      ta.focus();
    };
    chips.appendChild(chip);
  });

  updateRefineCounter();
}

export function closeRefine() {
  document.getElementById('refine-panel').style.display = 'none';
  state.selectedRefineAction = null;
  _pendingRefineData = null;
  // Reset to step 1
  const s1 = document.getElementById('refine-step1');
  const s2 = document.getElementById('refine-step2');
  if(s1) s1.style.display = 'block';
  if(s2) s2.style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  if(state.isRefining) {
    state.isRefining = false;
    document.getElementById('refine-submit-btn').disabled = false;
    removeRefineThinking();
  }
}

export function updateRefineCounter() {
  const count = state.refineSnapshots.length;
  const counter = document.getElementById('refine-counter');
  const revertBtn = document.getElementById('refine-revert-btn');
  // ── FIX: was missing quotes around 'ę' causing SyntaxError ──
  if(state.lang === 'pl') {
    const suffix = count === 1 ? 'ę' : count > 1 && count < 5 ? 'e' : 'i';
    counter.textContent = count > 0 ? `Wykonano ${count} rewizj${suffix}` : '';
  } else {
    counter.textContent = count > 0 ? `${count} revision${count > 1 ? 's' : ''} made` : '';
  }
  revertBtn.style.display = count > 0 ? 'block' : 'none';
}

export function addRefineMessage(role, html) {
  const history = document.getElementById('refine-history');
  const div = document.createElement('div');
  div.className = `refine-msg ${role}`;
  div.innerHTML = `
    <div class="refine-msg-sender">${role === 'ai' ? '⚡ AgentSpark' : (state.lang === 'en' ? 'You' : 'Ty')}</div>
    <div class="refine-bubble">${html}</div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

export function addRefineThinking() {
  const history = document.getElementById('refine-history');
  const div = document.createElement('div');
  div.className = 'refine-msg ai';
  div.id = 'refine-thinking-indicator';
  div.innerHTML = `
    <div class="refine-msg-sender">⚡ AgentSpark</div>
    <div class="refine-bubble">
      <div class="refine-thinking">
        <span>${t('refineThinking')}</span>
        <span class="thinking-dots"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

export function removeRefineThinking() {
  const el = document.getElementById('refine-thinking-indicator');
  if(el) el.remove();
}

export function getRefineSystemPrompt() {
  const lvl = t('levels').find(l => l.id === state.currentLevel);
  const currentTeamJSON = JSON.stringify(state.generatedAgents.map(a => ({
    id: a.id, name: a.name, type: a.type, role: a.role, description: a.description
  })), null, 2);

  return `You are AgentSpark, an expert AI system designer in REFINE mode.
Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${lvl ? lvl.name : state.currentLevel}

CURRENT TEAM:
${currentTeamJSON}

The user wants to modify their agent team. Apply their requested changes and return the complete updated team as JSON.

RESPONSE FORMAT — two parts:
1. A brief human-readable summary of what changed (1-3 sentences), using these tags for changes:
   - New agent: <span class="refine-diff-added">+AgentName</span>
   - Removed: <span class="refine-diff-removed">-AgentName</span>  
   - Modified: <span class="refine-diff-changed">~AgentName</span>

2. Then the full updated JSON (same format as original generation):
[UPDATED_TEAM]
{
  "agents": [...complete updated agents array with all fields: id, name, emoji, type, role, description, agentMd, skillMd...],
  "teamConfig": "...updated team config md..."
}

RULES:
- Always return the COMPLETE agents array, not just changed agents
- Keep unchanged agents exactly as they are
- New agents must follow same structure (id, name, emoji, type, role, description, agentMd, skillMd)
- type must be "technical" or "business"
- agentMd and skillMd must be full detailed markdown, not placeholders
- The [UPDATED_TEAM] marker must appear on its own line`;
}

// Pending refine data (step 2 buffer)
let _pendingRefineData = null;

export async function submitRefine() {
  const input = document.getElementById('refine-input');
  const text = input.value.trim();
  if(!text || state.isRefining) return;

  const actionCtx = state.selectedRefineAction ? '[Action: ' + state.selectedRefineAction + '] ' : '';
  const fullRequest = actionCtx + text;

  state.isRefining = true;
  document.getElementById('refine-submit-btn').disabled = true;

  // Switch to step 2
  document.getElementById('refine-step1').style.display = 'none';
  document.getElementById('refine-step2').style.display = 'block';

  const histEl = document.getElementById('refine-history');
  histEl.innerHTML = '';
  addRefineMessage('user', text);
  addRefineThinking();

  try {
    const history = state.refineHistory.map(m => (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text).join('\n');
    const prompt = history
      ? 'Previous context:\n' + history + '\n\nNew request: ' + fullRequest
      : 'Request: ' + fullRequest;

    const refineActionEmoji = { improve:'⚡', add:'➕', remove:'🗑', connections:'🔗' };
    const refineEmoji = refineActionEmoji[state.selectedRefineAction] || '✏️';
    const refineVer = state.versionHistory.length + 1;
    const raw = await callLLM(getRefineSystemPrompt(), prompt, refineEmoji + ' Refine · v' + refineVer + (state.selectedRefineAction ? ' · ' + state.selectedRefineAction : ''));
    removeRefineThinking();

    const markerIdx = raw.indexOf('[UPDATED_TEAM]');
    let summary = '', jsonPart = '';
    if(markerIdx !== -1) {
      summary = raw.slice(0, markerIdx).trim();
      jsonPart = raw.slice(markerIdx + '[UPDATED_TEAM]'.length).trim();
    } else {
      const jm = raw.match(/\{[\s\S]*"agents"[\s\S]*\}/);
      if(jm) {
        jsonPart = jm[0];
        summary = raw.slice(0, raw.indexOf(jm[0])).trim() || (state.lang === 'en' ? 'Team updated.' : 'Zespół zaktualizowany.');
      } else {
        throw new Error(state.lang === 'en' ? 'Could not parse updated team.' : 'Nie udało się przetworzyć zaktualizowanego zespołu.');
      }
    }

    const jm2 = jsonPart.match(/\{[\s\S]*\}/);
    if(!jm2) throw new Error('No JSON in response');
    const data = JSON.parse(jm2[0]);
    if(!data.agents || !Array.isArray(data.agents)) throw new Error('Invalid agents data');

    const prevIds = new Set(state.generatedAgents.map(a => a.id));
    const newIds  = new Set(data.agents.map(a => a.id));
    const addedIds   = [...newIds].filter(id => !prevIds.has(id));
    const removedIds = [...prevIds].filter(id => !newIds.has(id));
    const changedIds = [...newIds].filter(id => prevIds.has(id) && JSON.stringify(data.agents.find(a=>a.id===id)) !== JSON.stringify(state.generatedAgents.find(a=>a.id===id)));
    const removedNames = Object.fromEntries(removedIds.map(id => [id, state.generatedAgents.find(a => a.id === id)?.name || id]));

    const diffBadges = [
      ...addedIds.map(id => '<span class="refine-diff-added">+' + (data.agents.find(a=>a.id===id)?.name || id) + '</span>'),
      ...removedIds.map(id => '<span class="refine-diff-removed">-' + removedNames[id] + '</span>'),
      ...changedIds.map(id => '<span class="refine-diff-changed">~' + (data.agents.find(a=>a.id===id)?.name || id) + '</span>'),
    ].join(' ');

    addRefineMessage('ai', (summary || '') + (diffBadges ? '<br/><br/>' + diffBadges : ''));
    _pendingRefineData = { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary };

    const applyBtn = document.getElementById('refine-apply-btn');
    if(applyBtn) {
      applyBtn.style.display = 'inline-flex';
      document.getElementById('refine-apply-label').textContent = t('refineApply');
    }
    updateRefineCounter();

  } catch(err) {
    removeRefineThinking();
    addRefineMessage('ai', '<span style="color:var(--accent2)">⚠ ' + err.message + '</span>');
    showNotif(state.lang === 'en' ? '⚠ Refine failed.' : '⚠ Błąd generowania.', true);
    _pendingRefineData = null;
  }

  state.isRefining = false;
  document.getElementById('refine-submit-btn').disabled = false;
}

export function applyRefinement() {
  if(!_pendingRefineData) return;
  const { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary } = _pendingRefineData;
  _pendingRefineData = null;

  state.refineSnapshots.push(JSON.parse(JSON.stringify({ agents: state.generatedAgents, files: state.generatedFiles })));

  state.generatedAgents = data.agents;
  data.agents.forEach(a => {
    state.generatedFiles['agent-' + a.id + '.md'] = a.agentMd || '# Agent: ' + a.name + '\n\n**Role:** ' + (a.role || '') + '\n\n' + (a.description || '');
    state.generatedFiles['skill-' + a.id + '.md'] = a.skillMd || '# Skill: ' + a.name + '\n\n## Capabilities\n\n' + (a.description || '');
  });
  removedIds.forEach(id => {
    delete state.generatedFiles['agent-' + id + '.md'];
    delete state.generatedFiles['skill-' + id + '.md'];
  });
  if(data.teamConfig) state.generatedFiles['team-config.md'] = data.teamConfig;
  state.generatedFiles['README.md'] = generateReadme();

  state.refineHistory.push({ role: 'user', text: fullRequest });
  state.refineHistory.push({ role: 'ai', text: summary });

  const vNum = state.versionHistory.length + 2;
  state.versionHistory.push({
    id: Date.now(),
    label: text.length > 60 ? text.slice(0, 57) + '…' : text,
    ts: new Date(),
    agents: JSON.parse(JSON.stringify(state.generatedAgents)),
    files: JSON.parse(JSON.stringify(state.generatedFiles)),
    diff: { added: addedIds, removed: removedIds, changed: changedIds },
    removedNames,
    agentNames: Object.fromEntries(data.agents.map(a => [a.id, a.name])),
    vNum,
  });
  renderVersionPanel();
  closeRefine();
  showResults(true);
  scheduleAutoSave();

  setTimeout(() => {
    addedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if(c) c.classList.add('just-added'); });
    changedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if(c) c.classList.add('just-updated'); });
  }, 150);
  setTimeout(() => buildGraphFromAgents(), 300);
  showNotif(state.lang === 'en' ? '✓ Team updated!' : '✓ Zespół zaktualizowany!');
  const revertBtn = document.getElementById('refine-revert-btn');
  if(revertBtn) revertBtn.style.display = 'inline-flex';
}

export function backToRefineStep1() {
  _pendingRefineData = null;
  document.getElementById('refine-step1').style.display = 'block';
  document.getElementById('refine-step2').style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  document.getElementById('refine-history').innerHTML = '';
  document.getElementById('refine-input').focus();
}

export function revertLastRefine() {
  if(!state.refineSnapshots.length) return;
  const snap = state.refineSnapshots.pop();
  state.generatedAgents = snap.agents;
  state.generatedFiles = snap.files;
  state.refineHistory = state.refineHistory.slice(0, -2);
  updateRefineCounter();
  showResults(true);
  buildGraphFromAgents();
  addRefineMessage('ai', state.lang === 'en' ? '↩ Reverted to previous version.' : '↩ Przywrócono poprzednią wersję.');
  showNotif(state.lang === 'en' ? '↩ Reverted.' : '↩ Przywrócono.');
}
