// ─── LANGUAGE & MODEL SELECTION ───────────────────────────
import { state } from './state.js';
import { _updateApiKeyDot } from './ui.js';

export function setLang(l) {
  state.lang = l;
  document.getElementById('btn-en').classList.toggle('active', l === 'en');
  document.getElementById('btn-pl').classList.toggle('active', l === 'pl');
  // Lazy import to break model→topic cycle
  import('./topic.js').then(m => m.renderTopicScreen());
}

const MODEL_KEY_HINTS = {
  gemini:    { label: 'Gemini API Key',    hint: 'Key: Google AI Studio → makersuite.google.com',   placeholder: 'AIza...' },
  openai:    { label: 'OpenAI API Key',    hint: 'Key: platform.openai.com/api-keys',                placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic API Key', hint: 'Key: console.anthropic.com/settings/keys',         placeholder: 'sk-ant-...' },
  mistral:   { label: 'Mistral API Key',   hint: 'Key: console.mistral.ai/api-keys',                 placeholder: 'your-mistral-key' },
  groq:      { label: 'Groq API Key',      hint: 'Key: console.groq.com/keys',                       placeholder: 'gsk_...' },
};

export function onModelChange() {
  const sel = document.getElementById('modelSelect');
  if (!sel) return;
  const parts = sel.value.split('|');
  const label = sel.options[sel.selectedIndex]?.text || parts[1];
  state.selectedModel = { provider: parts[0], model: parts[1], endpoint: parts[2], tag: parts[3], label };

  const info = MODEL_KEY_HINTS[state.selectedModel.tag] || MODEL_KEY_HINTS.gemini;
  const labelEl       = document.getElementById('apiKeyLabel');
  const hintEl        = document.getElementById('modelHint');
  const inputEl       = document.getElementById('apiKeySetupInput');
  const headerInputEl = document.getElementById('apiKeyInput');

  if (labelEl)        labelEl.textContent = info.label;
  if (hintEl)         hintEl.innerHTML = info.hint;
  if (inputEl)        inputEl.placeholder = info.placeholder;
  if (headerInputEl)  headerInputEl.placeholder = info.label;

  // Reset key when switching provider
  state.apiKey = '';
  if (inputEl) inputEl.value = '';
  const status = document.getElementById('apiKeySetupStatus');
  if (status) { status.textContent = ''; status.className = 'api-key-status'; }
}

export function syncApiKey(val) {
  state.apiKey = val.trim();
  const headerInput = document.getElementById('apiKeyInput');
  if (headerInput) headerInput.value = state.apiKey;
  if (state.apiKey.length > 10) localStorage.setItem('agentspark-api-key', state.apiKey);
  checkApiKey();
}

export function checkApiKey() {
  const val = state.apiKey || document.getElementById('apiKeySetupInput')?.value?.trim() || '';
  state.apiKey = val;
  const status = document.getElementById('apiKeySetupStatus');
  if (val.length > 10) {
    if (status) { status.textContent = '✓ Key set'; status.className = 'api-key-status ok'; }
    _updateApiKeyDot('ready');
  } else {
    if (status) { status.textContent = ''; status.className = 'api-key-status'; }
    _updateApiKeyDot('');
  }
}

export function toggleApiSetup(forceState) {
  const panel = document.getElementById('api-setup-panel');
  if (!panel) return;
  const isOpen = forceState !== undefined ? forceState : panel.classList.contains('collapsed');
  panel.classList.toggle('collapsed', !isOpen);
}
