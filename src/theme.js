// ─── THEME ────────────────────────────────────────────────
import { state } from './state.js';
import { showNotif } from './ui.js';
import { loadFromHash } from './sharing.js';
import { renderTopicScreen } from './topic.js';

function _toggleThemeCore() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('agentspark-theme', next);
  document.getElementById('theme-toggle-btn').textContent = next === 'light' ? '☀️' : '🌙';
  const metaTC = document.getElementById('meta-theme-color');
  if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
}

let _themeHoldTimer = null;

export function toggleTheme() {
  if (_themeHoldTimer === null) return;
  clearTimeout(_themeHoldTimer);
  _themeHoldTimer = null;
  _toggleThemeCore();
}

export function themeHoldStart() {
  _themeHoldTimer = setTimeout(() => {
    _themeHoldTimer = null;
    localStorage.removeItem('agentspark-theme');
    const next = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
    showNotif(state.lang === 'en' ? '🎨 Theme: following OS preference' : '🎨 Motyw: podąża za ustawieniami systemu');
  }, 600);
}

export function initTheme() {
  const saved = localStorage.getItem('agentspark-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('agentspark-theme')) return;
    const next = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
  });
}

export async function initApp() {
  const loaded = await loadFromHash();
  if (!loaded) renderTopicScreen();
}
