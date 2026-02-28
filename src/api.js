// ─── API ──────────────────────────────────────────────────────────────────────
// callLLM: single entry point for all LLM calls.
// Handles fallback chains, retry on transient errors, and trace span recording.

import { state } from './state.js';
import { FALLBACK_CHAINS, isFallbackable, fetchProvider } from './providers.js';

// ── Trace span recording ───────────────────────────────────────────────────────
function _startSpan(label, model) {
  const span = {
    id:     Date.now() + Math.random(),
    label,
    model:  model || '?',
    start:  Date.now(),
    end:    null,
    tokens: null,
    status: 'pending',
  };
  state.traceSpans.push(span);
  _renderTraceLive();
  return span;
}

function _endSpan(span, status, tokens) {
  span.end    = Date.now();
  span.status = status;
  span.tokens = tokens ?? null;
  _renderTraceLive();
}

function _renderTraceLive() {
  // Delegate to trace.js if panel is open — avoid circular dep by using window
  if (state.tracePanelOpen && window.renderTraceLive) {
    window.renderTraceLive(state.traceSpans);
  }
}

// ── Typing status indicator ────────────────────────────────────────────────────
function setTypingStatus(active, modelLabel) {
  const badge = document.getElementById('headerModelBadge');
  if (!badge) return;
  if (active) {
    badge.textContent = (modelLabel || state.selectedModel?.label || '?') + ' ✦';
    badge.classList.add('typing');
  } else {
    badge.textContent = state.selectedModel?.label || state.selectedModel?.model || '';
    badge.classList.remove('typing');
  }
}

// ── Main LLM call ─────────────────────────────────────────────────────────────
/**
 * Call the currently selected LLM with automatic fallback.
 *
 * @param {string} systemInstruction
 * @param {string} userMessage
 * @param {string} [traceLabel]   — label shown in the trace panel
 * @returns {Promise<string>}     — raw text response
 */
export async function callLLM(systemInstruction, userMessage, traceLabel) {
  const key = state.apiKey || document.getElementById('apiKeyInput')?.value?.trim()
    || document.getElementById('apiKeySetupInput')?.value?.trim();

  if (!key) throw new Error('No API key — please enter your key above');

  // Build attempt list: primary model first, then rest of fallback chain (excluding primary)
  const primary  = { ...state.selectedModel };
  const chain    = FALLBACK_CHAINS[primary.tag] || [];
  const rest     = chain.filter(m => m.model !== primary.model);
  const attempts = [primary, ...rest];

  // Init trace session on first call
  if (!state.traceSessionStart) state.traceSessionStart = new Date();

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const modelDef = attempts[i];
    const label    = traceLabel || 'LLM call';
    const span     = _startSpan(i === 0 ? label : `${label} (fallback: ${modelDef.label})`, modelDef.model);

    // Update badge to show current model
    setTypingStatus(true, modelDef.label || modelDef.model);

    // Show fallback badge in header
    if (i > 0) {
      const badge = document.getElementById('headerModelBadge');
      if (badge) badge.textContent = modelDef.model + ' (fallback) ✦';
    }

    try {
      const { result, tokens } = await fetchProvider(modelDef, key, systemInstruction, userMessage);
      _endSpan(span, 'ok', tokens);
      setTypingStatus(false);
      return result;

    } catch (err) {
      _endSpan(span, 'error', null);
      lastError = err;

      const canFallback = isFallbackable(err.status, err.message);
      const hasNext     = i < attempts.length - 1;

      if (!canFallback || !hasNext) break;

      // Brief pause before trying next model
      await new Promise(r => setTimeout(r, 600));
    }
  }

  setTypingStatus(false);

  // Restore correct badge text
  const badge = document.getElementById('headerModelBadge');
  if (badge) badge.textContent = state.selectedModel?.label || state.selectedModel?.model || '';

  throw lastError || new Error('All models failed');
}
