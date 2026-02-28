// ─── TOPIC SCREEN ─────────────────────────────────────────
import { state } from './state.js';
import { t } from './i18n.js';
import { showNotif } from './ui.js';
import { startChat } from './interview.js';

const MODEL_KEY_HINTS = {
  gemini:    { label: 'Gemini API Key' },
  openai:    { label: 'OpenAI API Key' },
  anthropic: { label: 'Anthropic API Key' },
  mistral:   { label: 'Mistral API Key' },
  groq:      { label: 'Groq API Key' },
};

function renderLevelGrid() {
  const grid = document.getElementById('level-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const label = document.getElementById('level-section-label');
  if (label) label.textContent = state.lang === 'en' ? 'COMPLEXITY LEVEL' : 'POZIOM ZŁOŻONOŚCI';

  t('levels').forEach(level => {
    const div = document.createElement('div');
    div.className = 'level-card' + (state.currentLevel === level.id ? ' selected' : '');
    div.style.borderColor = state.currentLevel === level.id ? level.color : '';
    div.style.boxShadow   = state.currentLevel === level.id ? `0 0 20px ${level.color}33` : '';
    div.innerHTML = `
      <span class="level-emoji">${level.emoji}</span>
      <div class="level-name" style="color:${level.color}">${level.name}</div>
      <div class="level-tagline">${level.tagline}</div>
      <div class="level-agents" style="color:${level.color};border-color:${level.color}33;background:${level.color}11">
        ${level.agentCount} ${state.lang === 'en' ? 'agents' : 'agentów'}
      </div>
    `;
    div.title = level.desc;
    div.tabIndex = 0;
    div.setAttribute('role', 'radio');
    div.setAttribute('aria-checked', state.currentLevel === level.id ? 'true' : 'false');
    div.onclick = () => {
      state.currentLevel = level.id;
      state.MAX_QUESTIONS = level.questions;
      renderLevelGrid();
    };
    div.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

export function renderTopicScreen() {
  renderLevelGrid();
  document.getElementById('badge-text').textContent   = t('badge');
  document.getElementById('hero-title').innerHTML     = t('heroTitle');
  document.getElementById('hero-sub').textContent     = t('heroSub');
  document.getElementById('or-text').textContent      = t('orText');
  document.getElementById('start-btn').textContent    = t('startBtn');

  const filtersEl = document.getElementById('template-filters');
  filtersEl.innerHTML = '';
  const seg = document.createElement('div');
  seg.className = 'ios-segmented';
  t('topicCats').slice(0, 5).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'ios-seg-btn' + (state.activeTopicCat === cat.id ? ' active' : '');
    btn.textContent = cat.label;
    btn.onclick = () => { state.activeTopicCat = cat.id; renderTopicScreen(); };
    seg.appendChild(btn);
  });
  filtersEl.appendChild(seg);

  const grid = document.getElementById('topic-grid');
  grid.innerHTML = '';
  t('topics').forEach(topic => {
    const div = document.createElement('div');
    div.className = 'topic-card' + (state.activeTopicCat !== 'all' && topic.cat !== state.activeTopicCat ? ' hidden' : '');
    div.innerHTML = `
      <div class="time-badge">${topic.time}</div>
      <div class="icon">${topic.icon}</div>
      <div class="label">${topic.label}</div>
      <div class="sub">${topic.sub}</div>
      <div class="agents-preview">⚡ ${topic.agents}</div>
    `;
    div.onclick = () => { document.getElementById('customTopic').value = topic.label; startWithTopic(); };
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

export function startWithTopic() {
  const val = document.getElementById('apiKeySetupInput').value.trim();
  state.apiKey = val;
  if (!state.apiKey || state.apiKey.length < 10) {
    showNotif(
      state.lang === 'en'
        ? `⚠ Please enter a valid ${MODEL_KEY_HINTS[state.selectedModel.tag]?.label || 'API key'}`
        : `⚠ Podaj prawidłowy klucz ${MODEL_KEY_HINTS[state.selectedModel.tag]?.label || 'API'}`,
      true
    );
    return;
  }
  const topic = document.getElementById('customTopic').value.trim();
  if (!topic) {
    showNotif(state.lang === 'en' ? '⚠ Please select or enter a topic' : '⚠ Wybierz lub wpisz temat', true);
    return;
  }
  state.currentTopic = topic;
  startChat();
}
