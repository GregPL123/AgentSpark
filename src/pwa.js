// ─── PWA: manifest · service worker · offline · install banner · update toast ──
import { showNotif } from './ui.js';
import { CACHE_NAME } from './config.js';

export function initPWA() {
  _injectManifest();
  _registerServiceWorker();
  _initOfflineDetection();
  _initInstallPrompt();
  _syncThemeColor();
}

// ── 1. Inline Manifest ────────────────────────────────────────────────────────
function _injectManifest() {
  const manifest = {
    name: 'AgentSpark',
    short_name: 'AgentSpark',
    description: 'Build your AI agent team in minutes',
    start_url: './',
    display: 'standalone',
    background_color: '#1a170d',
    theme_color: '#1a170d',
    orientation: 'any',
    categories: ['productivity', 'developer', 'utilities'],
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%231a170d'/%3E%3Crect width='192' height='192' rx='40' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='192' y2='192' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='96' y='128' font-size='96' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
        sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable'
      },
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='100' fill='%231a170d'/%3E%3Crect width='512' height='512' rx='100' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='512' y2='512' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='256' y='340' font-size='256' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
        sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable'
      }
    ],
    shortcuts: [
      {
        name: 'New Team', short_name: 'New',
        description: 'Start building a new AI agent team',
        url: './',
        icons: [{ src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Ctext y='80' font-size='80'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E", sizes: '96x96' }]
      }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const link = document.getElementById('pwa-manifest');
  if (link) link.href = URL.createObjectURL(blob);
}

// ── 2. Service Worker ─────────────────────────────────────────────────────────
let _swReg     = null;
let _newWorker = null;

function _registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const swCode = `
const CACHE = '${CACHE_NAME}';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./']).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('generateContent')) {
    e.respondWith(fetch(e.request)); return;
  }
  if (['openai.com','anthropic.com','mistral.ai','groq.com'].some(h => url.hostname.includes(h))) {
    e.respondWith(fetch(e.request)); return;
  }
  if (url.hostname.includes('fonts.g') || e.request.destination === 'font') {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      caches.open(CACHE).then(cache => cache.put(e.request, r.clone())); return r;
    }))); return;
  }
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(r => { if(r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => cached);
      return cached || fresh;
    })
  ));
});
self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });
`;

  const swURL = URL.createObjectURL(new Blob([swCode], { type: 'text/javascript' }));
  navigator.serviceWorker.register(swURL)
    .then(reg => {
      _swReg = reg;
      reg.addEventListener('updatefound', () => {
        _newWorker = reg.installing;
        _newWorker.addEventListener('statechange', () => {
          if (_newWorker.state === 'installed' && navigator.serviceWorker.controller) _showUpdateToast();
        });
      });
      window.addEventListener('focus', () => reg.update());
    })
    .catch(err => console.warn('[AgentSpark SW]', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

// ── 3. Offline detection ──────────────────────────────────────────────────────
function _initOfflineDetection() {
  const bar = document.getElementById('offline-bar');
  const sync = () => bar?.classList.toggle('visible', !navigator.onLine);
  window.addEventListener('online',  sync);
  window.addEventListener('offline', sync);
  sync();
}

// ── 4. Install prompt (A2HS) ──────────────────────────────────────────────────
const DISMISSED_KEY = 'agentspark-pwa-dismissed';
let _deferredPrompt = null;

function _initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;
    setTimeout(_showInstallBanner, 3000);
  });
  window.addEventListener('appinstalled', () => {
    _hideInstallBanner();
    showNotif('✓ AgentSpark installed!');
    _deferredPrompt = null;
  });

  window._pwaInstall = async () => {
    if (!_deferredPrompt) return;
    _hideInstallBanner();
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    if (outcome === 'dismissed') localStorage.setItem(DISMISSED_KEY, Date.now());
  };
  window._pwaDismiss = () => {
    _hideInstallBanner();
    localStorage.setItem(DISMISSED_KEY, Date.now());
  };
}

function _showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-install-icon">⚡</div>
    <div class="pwa-install-text">
      <div class="pwa-install-title">Install AgentSpark</div>
      <div class="pwa-install-sub">Add to home screen — works offline</div>
    </div>
    <div class="pwa-install-actions">
      <button class="pwa-install-btn" onclick="window._pwaInstall()">Install</button>
      <button class="pwa-dismiss-btn" onclick="window._pwaDismiss()">✕</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function _hideInstallBanner() {
  const b = document.getElementById('pwa-install-banner');
  if (!b) return;
  Object.assign(b.style, { animation: 'none', opacity: '0', transform: 'translateY(20px)', transition: 'all 0.3s ease' });
  setTimeout(() => b.remove(), 300);
}

// ── 5. Update toast ───────────────────────────────────────────────────────────
function _showUpdateToast() {
  if (document.getElementById('pwa-update-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.className = 'pwa-update-toast pwa-bottom-sheet';
  toast.innerHTML = `
    <span>🔄 New version available</span>
    <button class="pwa-update-btn" onclick="window._pwaUpdate()">Update</button>
    <button class="pwa-dismiss-btn" onclick="this.parentElement.remove()" style="font-size:0.7rem;padding:0.25rem 0.5rem;">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 15000);
}

window._pwaUpdate = () => {
  document.getElementById('pwa-update-toast')?.remove();
  if (_newWorker) _newWorker.postMessage('skipWaiting');
  else if (_swReg?.waiting) _swReg.waiting.postMessage('skipWaiting');
};

// ── 6. Theme-color meta sync ──────────────────────────────────────────────────
function _syncThemeColor() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const meta   = document.getElementById('meta-theme-color');
  if (meta) meta.content = isDark ? '#1a170d' : '#faf7ee';
}

// ── showSwToast (exported for init.js re-export) ──────────────────────────────
export function showSwToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = 'pwa-update-toast pwa-bottom-sheet' + (isError ? ' error' : '');
  toast.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()" style="font-size:0.7rem;padding:0.25rem 0.5rem;">✕</button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
