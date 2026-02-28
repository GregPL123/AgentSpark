// ─── DOM EVENT HANDLERS ────────────────────────────────────────────────────────
// Replaces all inline onclick/oninput/onchange/onkeydown attributes in index.html.
// Every binding lives here — one place to audit, one place to change.
//
// Import chain: main.js → handlers.js → (all feature modules via _app)
// Called once after DOMContentLoaded. Elements are guaranteed to exist.

import { closeDrawer, toggleDrawer, scrollToTop, switchHomePanel } from './navigation.js';
import { setLang, onModelChange, syncApiKey, checkApiKey, toggleApiSetup } from './model.js';
import { renderTopicScreen, startWithTopic } from './topic.js';
import { submitAnswer } from './interview.js';
import { downloadZip } from './results.js';
import { openRefine, closeRefine, submitRefine, applyRefinement, backToRefineStep1, revertLastRefine } from './refine.js';
import { toggleVersionPanel } from './versions.js';
import { switchModalTab, downloadCurrentFile, closeModal, openMarkdownPreview, closeMdBrowser, downloadAllMd } from './preview.js';
import { toggleTracePanel } from './trace.js';
import { openImportModal, closeImportModal, handleImportFileSelect, confirmImport, resetImportModal, openPromptExport, closePromptExport, switchPromptTab, exportFramework, copyPromptToClipboard, downloadPromptTxt, _processImportFile } from './framework-ui.js';
import { openShareModal, closeShareModal, copyShareUrl, generateShareUrl, onShareModeChange } from './sharing.js';
import { restart, iosTabNav, renderResults, openSettingsSheet, toggleChatSidebar } from './ui.js';
import { saveCurrentProject, renderProjectsList } from './db.js';
import { renderHomeProjectsList } from './navigation.js';
import { toggleTheme } from './theme.js';
import { closeDiffModal } from './versions.js';

// ── Helper: safe getElementById bind ─────────────────────────────────────────
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function onAll(selector, event, handler) {
  document.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler));
}

// ── Nav drawer ────────────────────────────────────────────────────────────────
function bindDrawer() {
  on('nav-drawer-overlay', 'click',  closeDrawer);
  on('burger-btn',         'click',  toggleDrawer);
  on('drawer-close-btn',   'click',  closeDrawer);

  // Drawer nav items
  [
    ['dnav-home',     () => { closeDrawer(); iosTabNav('home'); }],
    ['dnav-projects', () => { closeDrawer(); iosTabNav('projects'); }],
    ['dnav-chat',     () => { closeDrawer(); iosTabNav('chat'); }],
    ['dnav-results',  () => { closeDrawer(); iosTabNav('results'); }],
    ['dnav-instr',    () => { closeDrawer(); window.showInstructions?.(); }],
    ['dnav-share',    () => { closeDrawer(); openShareModal(); }],
    ['dnav-import',   () => { closeDrawer(); openImportModal(); }],
    ['dnav-theme',    () => { closeDrawer(); toggleTheme(); }],
  ].forEach(([id, fn]) => on(id, 'click', fn));

  // Language buttons in drawer
  on('dnav-lang-en', 'click', () => { setLang('en'); import('./navigation.js').then(m => m.updateDrawerActive()); });
  on('dnav-lang-pl', 'click', () => { setLang('pl'); import('./navigation.js').then(m => m.updateDrawerActive()); });
}

// ── iOS tab bar ───────────────────────────────────────────────────────────────
function bindTabBar() {
  [
    ['tab-home',     'home'],
    ['tab-projects', 'projects'],
    ['tab-chat',     'chat'],
    ['tab-results',  'results'],
    ['tab-settings', 'settings'],
  ].forEach(([id, tab]) => on(id, 'click', () => iosTabNav(tab)));
}

// ── Header ────────────────────────────────────────────────────────────────────
function bindHeader() {
  on('apiKeyInput', 'input', () => checkApiKey());
  on('btn-en',      'click', () => setLang('en'));
  on('btn-pl',      'click', () => setLang('pl'));
}

// ── Projects screen ───────────────────────────────────────────────────────────
function bindProjects() {
  on('projects-back-btn',   'click', () => iosTabNav('home'));
  on('projects-new-btn',    'click', () => window.showScreen('topic'));
  on('projects-new-btn-2',  'click', () => window.showScreen('topic'));
  on('projects-new-empty',  'click', () => window.showScreen('topic'));
  on('projects-search',     'input', () => renderProjectsList());
}

// ── Home / topic screen ───────────────────────────────────────────────────────
function bindHome() {
  on('api-setup-toggle', 'click',  toggleApiSetup);
  on('modelSelect',      'change', onModelChange);
  on('apiKeySetupInput', 'input',  e => syncApiKey(e.target.value));

  on('hseg-topics',  'click', () => switchHomePanel('topics'));
  on('hseg-custom',  'click', () => switchHomePanel('custom'));

  on('home-projects-search', 'input', () => renderHomeProjectsList());
  on('home-new-btn',         'click', () => switchHomePanel('topics'));

  on('start-btn',       'click', startWithTopic);
  on('import-home-btn', 'click', openImportModal);
}

// ── Chat screen ───────────────────────────────────────────────────────────────
function bindChat() {
  on('chat-back-btn',     'click', restart);
  on('sidebar-toggle-btn','click', toggleChatSidebar);
}

// ── Results screen ────────────────────────────────────────────────────────────
function bindResults() {
  on('results-back-btn',  'click', restart);
  on('results-export-btn','click', downloadZip);
  on('download-btn',      'click', downloadZip);
  on('share-btn',         'click', openShareModal);
  on('refine-btn',        'click', openRefine);
  on('md-preview-btn',    'click', openMarkdownPreview);
  on('fw-export-btn',     'click', exportFramework);
  on('import-btn',        'click', openImportModal);
  on('prompt-export-btn', 'click', openPromptExport);
  on('instr-btn',         'click', () => window.showInstructions?.());
  on('results-start-over','click', restart);

  // Shared banner close
  on('shared-banner-close', 'click', () => {
    document.getElementById('shared-banner').style.display = 'none';
  });

  // Refine panel
  on('refine-close-btn',  'click', closeRefine);
  on('refine-submit-btn', 'click', submitRefine);
  on('refine-revert-btn', 'click', revertLastRefine);
  on('refine-edit-btn',   'click', backToRefineStep1);
  on('refine-apply-btn',  'click', applyRefinement);

  on('refine-input', 'keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitRefine(); }
  });

  // Trace / version panel headers (click to toggle)
  on('trace-panel-header',   'click', toggleTracePanel);
  on('version-panel-header', 'click', toggleVersionPanel);
}

// ── File preview modal ────────────────────────────────────────────────────────
function bindPreviewModal() {
  on('tab-preview',      'click', () => switchModalTab('preview'));
  on('tab-raw',          'click', () => switchModalTab('raw'));
  on('modal-close-btn',  'click', closeModal);
  on('modal-download',   'click', downloadCurrentFile);
  on('md-browser-close', 'click', closeMdBrowser);
  on('md-download-all',  'click', downloadAllMd);
}

// ── Share modal ───────────────────────────────────────────────────────────────
function bindShareModal() {
  on('share-modal-close',  'click',  closeShareModal);
  on('share-copy-btn',     'click',  copyShareUrl);
  on('share-password-input','input', generateShareUrl);

  onAll('input[name="share-mode"]', 'change', onShareModeChange);
}

// ── Framework export modal ────────────────────────────────────────────────────
function bindFwModal() {
  on('fw-modal-close', 'click', () => {
    document.getElementById('fw-modal')?.classList.remove('open');
  });
}

// ── Prompt export modal ───────────────────────────────────────────────────────
function bindPromptModal() {
  on('prompt-modal-close',   'click', closePromptExport);
  on('ptab-interview',       'click', () => switchPromptTab('interview'));
  on('ptab-generate',        'click', () => switchPromptTab('generate'));
  on('ptab-refine',          'click', () => switchPromptTab('refine'));
  on('copy-prompt-btn',      'click', copyPromptToClipboard);
  on('download-prompt-btn',  'click', downloadPromptTxt);
}

// ── Import modal ──────────────────────────────────────────────────────────────
function bindImportModal() {
  on('import-modal-close',  'click',  closeImportModal);
  on('import-confirm-btn',  'click',  confirmImport);
  on('import-clear-btn',    'click',  resetImportModal);
  on('import-file-input',   'change', e => handleImportFileSelect(e.target));

  const dropzone = document.getElementById('import-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop',      e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) _processImportFile(file);
    });
  }
}

// ── Password unlock modal ─────────────────────────────────────────────────────
function bindUnlockModal() {
  on('unlock-modal-close',  'click',  () => window._unlockReject?.());
  on('unlock-confirm-btn',  'click',  () => window._unlockConfirm?.());
  on('unlock-cancel-btn',   'click',  () => window._unlockReject?.());
  on('unlock-password-input','keydown', e => {
    if (e.key === 'Enter') window._unlockConfirm?.();
  });
}

// ── Diff modal ────────────────────────────────────────────────────────────────
function bindDiffModal() {
  on('diff-modal-close', 'click', closeDiffModal);
}

// ── Back-to-top ───────────────────────────────────────────────────────────────
function bindMisc() {
  on('back-to-top', 'click', scrollToTop);
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initHandlers() {
  bindDrawer();
  bindTabBar();
  bindHeader();
  bindProjects();
  bindHome();
  bindChat();
  bindResults();
  bindPreviewModal();
  bindShareModal();
  bindFwModal();
  bindPromptModal();
  bindImportModal();
  bindUnlockModal();
  bindDiffModal();
  bindMisc();
}
