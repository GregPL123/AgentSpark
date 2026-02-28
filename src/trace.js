// ─── TRACE VIEWER ─────────────────────────────────────────
import { state } from './state.js';

function _escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toggleTracePanel() {
  state.tracePanelOpen = !state.tracePanelOpen;
  document.getElementById('trace-body').classList.toggle('open', state.tracePanelOpen);
  document.getElementById('trace-toggle-icon').classList.toggle('open', state.tracePanelOpen);
}

export function renderTraceLive() {
  const panel = document.getElementById('trace-panel');
  if (!panel) return;
  if (!state.traceSpans.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  document.getElementById('trace-span-count').textContent = state.traceSpans.length;

  const pills = document.getElementById('trace-summary-pills');
  const totalMs  = state.traceSpans.reduce((n, s) => n + (s.durationMs || 0), 0);
  const totalTok = state.traceSpans.reduce((n, s) => n + (s.tokens || 0), 0);
  const hasFallback = state.traceSpans.some(s => s.isFallback);
  const hasError    = state.traceSpans.some(s => s.status === 'error');
  const hasPending  = state.traceSpans.some(s => s.status === 'pending');
  pills.innerHTML = `
    <span class="trace-pill ${hasError ? 'error' : hasFallback ? 'warn' : 'ok'}">
      ${hasError ? '⚠ error' : hasFallback ? '↩ fallback' : '✓ ok'}
    </span>
    <span class="trace-pill">${(totalMs/1000).toFixed(1)}s total</span>
    ${totalTok ? `<span class="trace-pill">${totalTok.toLocaleString()} tokens</span>` : ''}
    ${hasPending ? `<span class="trace-pill">⏳ running…</span>` : ''}
  `;

  const spansEl = document.getElementById('trace-spans');
  const sessionStart = state.traceSessionStart || (state.traceSpans[0]?.startMs || Date.now());
  const sessionEnd   = Math.max(...state.traceSpans.map(s => s.endMs || Date.now()));
  const sessionRange = Math.max(sessionEnd - sessionStart, 1);

  spansEl.innerHTML = '';
  state.traceSpans.forEach(s => {
    const left  = ((s.startMs - sessionStart) / sessionRange) * 100;
    const width = s.durationMs
      ? Math.max((s.durationMs / sessionRange) * 100, 1.5)
      : Math.max(((Date.now() - s.startMs) / sessionRange) * 100, 3);

    const fillClass  = s.status === 'ok' ? 'fill-ok' : s.status === 'fallback' ? 'fill-fallback' : s.status === 'error' ? 'fill-error' : 'fill-pending';
    const badgeClass = s.status === 'ok' ? 'badge-ok' : s.status === 'fallback' ? 'badge-fallback' : s.status === 'error' ? 'badge-error' : 'badge-pending';
    const badgeText  = s.status === 'ok' ? 'OK' : s.status === 'fallback' ? '↩ FALLBACK' : s.status === 'error' ? 'ERROR' : '…';
    const durText    = s.durationMs ? (s.durationMs >= 1000 ? `${(s.durationMs/1000).toFixed(1)}s` : `${s.durationMs}ms`) : '…';
    const tokenText  = s.tokens ? s.tokens.toLocaleString() : '–';

    const rawLabel = s.label || 'API Call';
    let phase = rawLabel, detail = '';
    const dotSep   = rawLabel.indexOf(' · ');
    const colonSep = rawLabel.indexOf(': ');
    if (dotSep !== -1)   { phase = rawLabel.slice(0, dotSep);   detail = rawLabel.slice(dotSep + 3); }
    else if (colonSep !== -1) { phase = rawLabel.slice(0, colonSep); detail = rawLabel.slice(colonSep + 2); }

    const modelDisplay = s.model || '';
    const modelShort   = modelDisplay.length > 22 ? modelDisplay.slice(0, 20) + '…' : modelDisplay;
    const relSec  = ((s.startMs - sessionStart) / 1000).toFixed(2);
    const absTime = new Date(s.startMs).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const tooltipLines = [
      `Step: ${rawLabel}`, `Model: ${modelDisplay}`, `Started: ${absTime} (+${relSec}s into session)`,
      s.durationMs ? `Duration: ${durText}` : 'Duration: pending…',
      s.tokens     ? `Tokens: ${s.tokens.toLocaleString()}` : '',
      s.isFallback ? `↩ Fell back from primary model` : '',
      s.error      ? `Error: ${s.error}` : '',
    ].filter(Boolean).join('\n');

    const row = document.createElement('div');
    row.className = 'trace-span';
    row.title     = tooltipLines;
    row.innerHTML = `
      <div class="span-name">
        <div class="span-label" title="${phase}">${phase}</div>
        ${detail ? `<div class="span-detail">${_escHtml(detail)}</div>` : ''}
        <div class="span-model" title="${modelDisplay}">${modelShort}</div>
      </div>
      <div class="span-bar-col">
        <div class="span-bar-track">
          <div class="span-bar-fill ${fillClass}" style="margin-left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></div>
        </div>
      </div>
      <div class="span-duration">${durText}</div>
      <div class="span-tokens">${tokenText}</div>
      <div class="span-status"><span class="span-badge ${badgeClass}">${badgeText}</span></div>
    `;
    spansEl.appendChild(row);
  });

  const footerEl = document.getElementById('trace-footer');
  const calls     = state.traceSpans.length;
  const errors    = state.traceSpans.filter(s => s.status === 'error').length;
  const fallbacks = state.traceSpans.filter(s => s.isFallback).length;
  const avgDur    = calls ? Math.round(totalMs / calls) : 0;
  const lang      = state.lang;
  footerEl.innerHTML = `
    <span><strong>${calls}</strong> ${lang === 'en' ? (calls === 1 ? 'call' : 'calls') : 'wywołań'}</span>
    <span><strong>${(totalMs/1000).toFixed(1)}s</strong> ${lang === 'en' ? 'total' : 'łącznie'}</span>
    ${totalTok ? `<span><strong>${totalTok.toLocaleString()}</strong> tok</span>` : ''}
    ${calls > 1 ? `<span style="color:var(--muted)">~${avgDur >= 1000 ? (avgDur/1000).toFixed(1)+'s' : avgDur+'ms'} ${lang === 'en' ? 'avg/call' : 'śr/call'}</span>` : ''}
    ${fallbacks ? `<span>↩ <strong>${fallbacks}</strong> fallback</span>` : ''}
    ${errors ? `<span style="color:var(--accent2)">⚠ <strong>${errors}</strong> ${lang === 'en' ? 'error' : 'błąd'}</span>` : ''}
    <span style="margin-left:auto;color:var(--muted);font-size:0.68rem;">${new Date(sessionStart).toLocaleTimeString()}</span>
  `;
}
