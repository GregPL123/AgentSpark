// ─── AGENTSPARK ENTRY POINT ───────────────────────────────────────────────────
// Responsibilities:
//   1. Boot: theme init, DB init, sidebar, handlers, hash-based restore
//   2. window._app: minimal shim for functions still called from JS-generated
//      HTML (agent cards, graph tooltips, dynamically rendered lists).
//      Static index.html no longer uses onclick= attributes — those are wired
//      in handlers.js via addEventListener.

import JSZip from 'jszip';
window.JSZip = JSZip;

import './styles/main.css';

// ── Core state (must be first) ────────────────────────────────────────────────
import { state } from './state.js';

// Expose state in dev builds only
if (import.meta.env?.DEV) {
  window._state = state;
}

// ── Theme (sync — prevents FOUC) ──────────────────────────────────────────────
import { initTheme, initApp, toggleTheme, themeHoldStart } from './theme.js';
initTheme();

// ── Feature modules ───────────────────────────────────────────────────────────
import { t } from './i18n.js';
import { setLang, onModelChange, syncApiKey, checkApiKey, toggleApiSetup } from './model.js';
import { renderTopicScreen, startWithTopic } from './topic.js';
import { startChat, selectOption, submitAnswer, clearOptions, generateAgents, generateReadme, getSystemPrompt } from './interview.js';
import { showResults, showInstructions, downloadZip } from './results.js';
import { openRefine, closeRefine, submitRefine, applyRefinement, backToRefineStep1, revertLastRefine, getRefineSystemPrompt } from './refine.js';
import { renderVersionPanel, toggleVersionPanel, restoreVersion, downloadVersionZip, showDiffModal, closeDiffModal } from './versions.js';
import { buildGraphFromAgents } from './graph.js';
import { previewFile, switchModalTab, downloadCurrentFile, closeModal, openMarkdownPreview, selectMdBrowserFile, closeMdBrowser, downloadAllMd } from './preview.js';
import { toggleTracePanel } from './trace.js';
import { openImportModal, closeImportModal, handleImportDrop, handleImportFileSelect, confirmImport, resetImportModal, openPromptExport, closePromptExport, switchPromptTab, switchFwTab, exportFramework, initFrameworkBackdrops, copyFwCode, downloadFwCode } from './framework-ui.js';
import { openShareModal, closeShareModal, copyShareUrl, generateShareUrl, onShareModeChange, loadFromHash } from './sharing.js';
import { showNotif, showScreen, restart, toggleChatSidebar, renderResults, iosTabNav, openSettingsSheet, _syncFab } from './ui.js';
import { saveCurrentProject, openProjectsScreen, renderProjectsList, loadProject, deleteProject, forkProject } from './db.js';
import { toggleDrawer, openDrawer, closeDrawer, scrollToTop, switchHomePanel, showSwToast } from './init.js';
import { updateDrawerActive } from './navigation.js';

// ── Static handler wiring (replaces all onclick= in index.html) ───────────────
import { initHandlers } from './handlers.js';

// ── window._app: only functions called from JS-generated HTML ─────────────────
// These are emitted by interview.js (option buttons), results.js (agent cards),
// graph.js (tooltips), db.js (project cards), versions.js (version rows), etc.
// They cannot be replaced by initHandlers() because the elements don't exist at
// DOMContentLoaded time — they are rendered dynamically.
window._app = {
  // i18n helper (used in dynamically-rendered strings)
  t,
  // interview dynamic buttons
  selectOption, submitAnswer, generateAgents,
  // results dynamic elements
  previewFile, selectMdBrowserFile,
  // graph / canvas callbacks
  buildGraphFromAgents,
  // db dynamic project cards
  loadProject, deleteProject, forkProject,
  // versions dynamic rows
  restoreVersion, downloadVersionZip, showDiffModal,
  // sharing callbacks (called from rendered share URL area)
  loadFromHash,
  // theme
  themeHoldStart, toggleTheme,
  // settings sheet (opened from dynamic FAB)
  openSettingsSheet,
  // import modal (called from settings sheet dynamic HTML)
  openImportModal,
  // context bar inline onclick functions
  restart, startWithTopic, downloadZip,
  // framework export modal (copyFwCode/downloadFwCode called from dynamic tab HTML)
  copyFwCode, downloadFwCode,
  // language switching (called from settings sheet dynamic HTML)
  setLang,
  // fallbacks for any remaining dynamic usages
  // NOTE: wraps window.showScreen so callers get the patched version
  // (with updateContextBar + updateDrawerActive), not raw ui.js original
  showScreen: (name) => window.showScreen(name),
  showNotif,
  // prompt export (called via window from framework-ui)
  getSystemPrompt, getRefineSystemPrompt, generateReadme,
};

// Shim so dynamic onclick="fnName()" still works without changes to generators
Object.keys(window._app).forEach(name => {
  if (!window[name]) window[name] = (...args) => window._app[name](...args);
});

// Expose _syncFab for navigation.js syncFab() delegate
window._syncFab = _syncFab;

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const { initDb }      = await import('./db.js');
  const { initSidebar } = await import('./ui.js');
  await initDb();
  initSidebar();
  initFrameworkBackdrops();
  initHandlers();           // ← wires all static DOM listeners
  await initApp();          // loads from hash or renders topic screen
});
