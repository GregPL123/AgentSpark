// ─── CHAT HELPERS ─────────────────────────────────────────
import { state } from './state.js';
import { t } from './i18n.js';

export function addMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const cleanText = text.replace('[INTERVIEW_COMPLETE]', '').trim();
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = role === 'ai' ? '⚡ AgentSpark' : (state.lang === 'en' ? 'You' : 'Ty');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (role === 'user') {
    bubble.textContent = cleanText;
  } else {
    const sanitized = cleanText
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
      .replace(/\s+href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');
    bubble.innerHTML = sanitized;
  }
  div.appendChild(sender);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

export function addTypingIndicator() {
  removeTypingIndicator();
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-sender">⚡ AgentSpark</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

export function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

export function renderProgressSteps(activeIndex) {
  const container = document.getElementById('progress-steps');
  container.innerHTML = '';
  t('progressSteps').forEach((label, i) => {
    const div = document.createElement('div');
    div.className = `step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}`;
    div.innerHTML = `<div class="step-num">${i < activeIndex ? '✓' : i+1}</div><span>${label}</span>`;
    container.appendChild(div);
  });
  const iosBar = document.getElementById('ios-progress-bar');
  if (iosBar) {
    const steps = t('progressSteps');
    iosBar.innerHTML = steps.map((_, i) =>
      `<div class="ios-progress-segment ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}"></div>`
    ).join('');
  }
  const stepLabel = document.getElementById('ios-chat-step-label');
  if (stepLabel) stepLabel.textContent = `${activeIndex + 1}/${t('progressSteps').length}`;
}
