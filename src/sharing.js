// ─── URL SHARING + AES ENCRYPTION ────────────────────────
import { state } from './state.js';
import { showNotif, renderResults } from './ui.js';
import { renderTopicScreen } from './topic.js';
import { setLang } from './model.js';

// ─── SHARING VIA URL ──────────────────────────────────────

// Compress string → Uint8Array (gzip via CompressionStream)
export async function compress(str) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();
  writer.write(enc.encode(str));
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

// Decompress Uint8Array → string
export async function decompress(bytes) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

// Uint8Array → URL-safe base64
export function uint8ToBase64url(bytes) {
  let bin = '';
  for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// URL-safe base64 → Uint8Array
export function base64urlToUint8(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Simple XOR kept ONLY for backward-compat reading of v:2 links
export function xorObfuscate(str, password) {
  const key = password.split('').map(c => c.charCodeAt(0));
  return str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ key[i % key.length])
  ).join('');
}

// ── AES-256-GCM helpers (#3) ──────────────────────────────
// Derive a 256-bit key from a password using PBKDF2 + a fixed app salt
export async function _aesKeyFromPassword(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function aesGcmEncrypt(plaintext, password) {
  const enc      = new TextEncoder();
  const iv       = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
  const salt     = crypto.getRandomValues(new Uint8Array(16));  // 128-bit PBKDF2 salt
  const key      = await _aesKeyFromPassword(password, salt);
  const ctBuf    = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  // Pack: [salt 16B][iv 12B][ciphertext …]
  const ct = new Uint8Array(ctBuf);
  const packed = new Uint8Array(salt.length + iv.length + ct.length);
  packed.set(salt, 0);
  packed.set(iv,   salt.length);
  packed.set(ct,   salt.length + iv.length);
  return packed;
}

export async function aesGcmDecrypt(packedBytes, password) {
  const salt = packedBytes.slice(0, 16);
  const iv   = packedBytes.slice(16, 28);
  const ct   = packedBytes.slice(28);
  const key  = await _aesKeyFromPassword(password, salt);
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  return new TextDecoder().decode(ptBuf);
}

// ── Password unlock modal promise ─────────────────────────
let _unlockResolve = null;
let _unlockRejectCb = null;

export function _unlockReject() {
  document.getElementById('unlock-modal').classList.remove('open');
  if (_unlockRejectCb) { _unlockRejectCb(new Error('cancelled')); _unlockRejectCb = null; }
}

export function _promptPassword(descText) {
  return new Promise((resolve, reject) => {
    _unlockResolve  = resolve;
    _unlockRejectCb = reject;
    const descEl = document.getElementById('unlock-modal-desc');
    if (descEl && descText) descEl.textContent = descText;
    const input = document.getElementById('unlock-password-input');
    if (input) input.value = '';
    const errEl = document.getElementById('unlock-error');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('unlock-modal').classList.add('open');
    setTimeout(() => input?.focus(), 80);
  });
}

export function _unlockConfirm() {
  const pw = document.getElementById('unlock-password-input')?.value || '';
  if (!pw) return;
  document.getElementById('unlock-modal').classList.remove('open');
  if (_unlockResolve) { _unlockResolve(pw); _unlockResolve = null; }
}

export function _unlockShowError() {
  const errEl = document.getElementById('unlock-error');
  if (errEl) errEl.style.display = 'block';
  const input = document.getElementById('unlock-password-input');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('unlock-modal').classList.add('open');
}

let _shareUrl  = '';
let _shareMode = 'open';

export async function generateShareUrl() {
  const password    = document.getElementById('share-password-input')?.value?.trim() || '';
  const usePassword = _shareMode === 'password' && password.length > 0;

  // Build state payload
  const payload = {
    v:      3,             // v3 = AES-GCM encrypted (v2 = legacy XOR)
    topic:  state.currentTopic,
    level:  state.currentLevel,
    state.lang,
    agents: state.generatedAgents,
    files:  state.generatedFiles,
    ts:     Date.now(),
    pw:     usePassword,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    let dataToCompress;

    if (usePassword) {
      // Encrypt with AES-256-GCM, then compress the packed binary
      const encrypted = await aesGcmEncrypt(jsonStr, password);
      dataToCompress  = encrypted;                       // Uint8Array
      const compressed = await _compressBytes(dataToCompress);
      const encoded    = uint8ToBase64url(compressed);
      const base       = window.location.href.split('#')[0];
      _shareUrl        = `${base}#share=${encoded}`;
    } else {
      const compressed = await compress(jsonStr);
      const encoded    = uint8ToBase64url(compressed);
      const base       = window.location.href.split('#')[0];
      _shareUrl        = `${base}#share=${encoded}`;
    }

    const displayEl = document.getElementById('share-url-display');
    if (displayEl) displayEl.value = _shareUrl;

    const kb     = (_shareUrl.length / 1024).toFixed(1);
    const sizeEl = document.getElementById('share-size-label');
    if (sizeEl) {
      sizeEl.textContent = `${kb} KB`;
      sizeEl.className   = parseFloat(kb) > 100 ? 'share-size-warn' : '';
    }
    const agentEl = document.getElementById('share-agent-count');
    if (agentEl) agentEl.textContent = `${state.generatedAgents.length} agents`;
    const verEl   = document.getElementById('share-version-label');
    if (verEl)    verEl.textContent = `v${state.versionHistory.length || 1} (latest)`;

  } catch(e) {
    const displayEl = document.getElementById('share-url-display');
    if (displayEl) displayEl.value = 'Error generating link: ' + e.message;
  }
}

// Compress raw Uint8Array (for encrypted binary blobs)
export async function _compressBytes(bytes) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n,c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

export async function _decompressBytes(bytes) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n,c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

export function onShareModeChange() {
  const val = document.querySelector('input[name="share-mode"]:checked')?.value || 'open';
  _shareMode = val;

  document.getElementById('share-opt-open').classList.toggle('active', val === 'open');
  document.getElementById('share-opt-password').classList.toggle('active', val === 'password');

  const pwRow = document.getElementById('share-password-row');
  if(pwRow) pwRow.style.display = val === 'password' ? 'flex' : 'none';

  generateShareUrl();
}

export function openShareModal() {
  if(!state.generatedAgents.length) {
    showNotif(state.lang==='en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  _shareMode = 'open';
  // Reset UI
  const openOpt = document.querySelector('input[name="share-mode"][value="open"]');
  if(openOpt) openOpt.checked = true;
  document.getElementById('share-opt-open').classList.add('active');
  document.getElementById('share-opt-password').classList.remove('active');
  document.getElementById('share-password-row').style.display = 'none';
  const pwInput = document.getElementById('share-password-input');
  if(pwInput) pwInput.value = '';

  const copyBtn = document.getElementById('share-copy-btn');
  if(copyBtn) { copyBtn.textContent = '📋 Copy'; copyBtn.classList.remove('copied'); }

  document.getElementById('share-modal').classList.add('open');
  generateShareUrl();
}

export function closeShareModal() {
  document.getElementById('share-modal').classList.remove('open');
}

export async function copyShareUrl() {
  if(!_shareUrl) return;
  try {
    await navigator.clipboard.writeText(_shareUrl);
    const btn = document.getElementById('share-copy-btn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2500);
    showNotif(state.lang==='en' ? '✓ Share link copied!' : '✓ Link skopiowany!');
  } catch(e) {
    showNotif(state.lang==='en' ? '⚠ Copy failed' : '⚠ Kopiowanie nieudane', true);
  }
}

// ── Load from URL hash on startup ──────────────────────────
export async function loadFromHash() {
  const hash = window.location.hash;
  if(!hash.startsWith('#share=')) return false;

  const encoded = hash.slice('#share='.length);
  if(!encoded) return false;

  try {
    const bytes = base64urlToUint8(encoded);

    // Try 1: decompress as plain text (unencrypted, v1 or v2 open link)
    let payload = null;
    let jsonStr = null;
    try {
      jsonStr = await decompress(bytes);
      payload = JSON.parse(jsonStr);
    } catch(e) {
      // Not valid plain JSON after decompress — could be:
      // (a) v3 AES-GCM encrypted binary, or
      // (b) v2 XOR-obfuscated (legacy)
      // In both cases, decompress gave us bytes or garbled text.
      // We'll re-decompress the raw bytes and attempt AES-GCM first.
    }

    // If payload has pw:true it was flagged as password-protected
    if (payload && payload.pw) {
      // v2 legacy XOR path
      let pw;
      try {
        pw = await _promptPassword(
          state.lang === 'en'
            ? '🔒 This team is password protected. Enter the password to unlock it.'
            : '🔒 Ten zespół jest chroniony hasłem. Podaj hasło, aby go odblokować.'
        );
      } catch(e) { return false; } // user cancelled

      while (true) {
        const decrypted = xorObfuscate(jsonStr, pw);
        try {
          payload = JSON.parse(decrypted);
          break; // success
        } catch(e2) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch(e3) { return false; }
        }
      }
    }

    // If no valid plain payload yet → treat as v3 AES-GCM encrypted binary
    if (!payload) {
      let decompressedBytes;
      try {
        decompressedBytes = await _decompressBytes(bytes);
      } catch(e) {
        decompressedBytes = bytes; // maybe not compressed
      }

      let pw;
      try {
        pw = await _promptPassword(
          state.lang === 'en'
            ? '🔒 This team is password protected (AES-256-GCM). Enter the password to unlock it.'
            : '🔒 Ten zespół jest zaszyfrowany (AES-256-GCM). Podaj hasło, aby go odblokować.'
        );
      } catch(e) { return false; }

      while (true) {
        try {
          const decrypted = await aesGcmDecrypt(decompressedBytes, pw);
          payload = JSON.parse(decrypted);
          break; // success
        } catch(e) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch(e2) { return false; }
        }
      }
    }

    if(!payload?.agents?.length) return false;

    // Restore state
    state.currentTopic = payload.topic || 'Shared Team';
    state.currentLevel = payload.level || 'iskra';
    if(payload.state.lang) state.lang = payload.state.lang;
    state.generatedAgents = payload.agents;
    state.generatedFiles  = payload.files || {};
    state.versionHistory  = [{
      id: Date.now(),
      label: state.lang==='en' ? `Shared: ${state.currentTopic}` : `Udostępniony: ${state.currentTopic}`,
      ts: new Date(payload.ts || Date.now()),
      agents: JSON.parse(JSON.stringify(state.generatedAgents)),
      files:  JSON.parse(JSON.stringify(state.generatedFiles)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
      vNum: 1,
      isOrigin: true,
    }];

    // Show results
    showResults();

    // Show shared banner
    const banner = document.getElementById('shared-banner');
    const bannerTitle = document.getElementById('shared-banner-title');
    const bannerSub   = document.getElementById('shared-banner-sub');
    if(banner) {
      bannerTitle.textContent = state.lang==='en'
        ? `🔗 Shared team: "${state.currentTopic}"`
        : `🔗 Udostępniony zespół: "${state.currentTopic}"`;
      bannerSub.textContent = state.lang==='en'
        ? `${state.generatedAgents.length} agents · Read-only view · Start Over to create your own`
        : `${state.generatedAgents.length} agentów · Widok tylko do odczytu · Zacznij od nowa, by stworzyć własny`;
      banner.style.display = 'flex';
    }

    // Clean hash from URL (so refresh doesn't re-load)
    history.replaceState(null, '', window.location.pathname + window.location.search);

    return true;
  } catch(e) {
    console.warn('[AgentSpark] Failed to load shared URL:', e);
    return false;
  }
}

document.getElementById('share-modal').addEventListener('click', function(e) {
  if(e.target === this) closeShareModal();
});
document.getElementById('unlock-modal').addEventListener('click', function(e) {
  if(e.target === this) _unlockReject();
});

