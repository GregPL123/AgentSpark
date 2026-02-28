// ─── STATE ────────────────────────────────────────────────────────────────────
// Single source of truth for all runtime mutable state.
// Imported as { state } by every module that needs to read/write session data.
// resetState() restores non-persisted fields to their initial values.

import { LEVELS, MAX_QUESTIONS_BY_LEVEL } from './config.js';

// Default model — Gemini 3 Flash Preview (free tier, fast)
const DEFAULT_MODEL = {
  provider: 'gemini',
  model:    'gemini-3-flash-preview',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}',
  tag:      'gemini',
  label:    'Gemini 3 Flash Preview',
};

/** @type {AppState} */
export const state = {
  // ── Persisted across page reloads (restored in model.js / init) ────────────
  lang:          localStorage.getItem('agentspark-lang') || 'en',
  apiKey:        localStorage.getItem('agentspark-apikey') || '',
  selectedModel: (() => {
    try {
      const raw = localStorage.getItem('agentspark-model');
      return raw ? JSON.parse(raw) : DEFAULT_MODEL;
    } catch {
      return DEFAULT_MODEL;
    }
  })(),

  // ── Session: topic & level ─────────────────────────────────────────────────
  currentTopic:  '',
  currentLevel:  'iskra',           // selected complexity level id
  MAX_QUESTIONS: 5,                 // updated when level changes

  // ── Session: interview ─────────────────────────────────────────────────────
  chatHistory:        [],           // [{role, text}]
  questionCount:      0,
  conversationState:  'interview',  // 'interview' | 'generating' | 'done'

  // ── Session: generated output ─────────────────────────────────────────────
  generatedAgents:    [],           // [{id, name, emoji, type, role, description, agentMd, skillMd}]
  generatedFiles:     {},           // { 'filename.md': 'content' }

  // ── Session: refine ────────────────────────────────────────────────────────
  refineHistory:      [],           // [{role, text}] — refine conversation
  refineSnapshots:    [],           // [{agents, files}] — for revert
  selectedRefineAction: null,       // 'improve'|'add'|'remove'|'connections'
  isRefining:         false,

  // ── Session: versions ─────────────────────────────────────────────────────
  versionHistory:     [],           // [{id, label, ts, agents, files, diff, vNum, isOrigin}]

  // ── Session: trace ────────────────────────────────────────────────────────
  traceSpans:         [],           // [{label, start, end, tokens, status}]
  tracePanelOpen:     false,
  traceSessionStart:  null,         // Date | null

  // ── Framework export ──────────────────────────────────────────────────────
  activeFwTab:        'crewai',

  // ── Modal / browser ──────────────────────────────────────────────────────────
  currentModalFile:    '',
  currentModalTab:     'preview',
  mdBrowserActiveFile: '',

  // ── Versions ─────────────────────────────────────────────────────────────────
  versionPanelOpen: false,

  // ── Graph ─────────────────────────────────────────────────────────────────────
  graphNodes:    [],
  graphEdges:    [],
  graphAnimFrame: null,             // requestAnimationFrame id

  // ── Topic ──────────────────────────────────────────────────────────────────────
  activeTopicCat: 'all',

  // ── UI ────────────────────────────────────────────────────────────────────
  notifTimeout:       null,
};

/**
 * Reset all session-specific state while preserving persisted prefs
 * (lang, apiKey, selectedModel).
 */
export function resetState() {
  state.currentTopic        = '';
  state.currentLevel        = 'iskra';
  state.MAX_QUESTIONS       = 5;
  state.chatHistory         = [];
  state.questionCount       = 0;
  state.conversationState   = 'interview';
  state.generatedAgents     = [];
  state.generatedFiles      = {};
  state.refineHistory       = [];
  state.refineSnapshots     = [];
  state.selectedRefineAction = null;
  state.isRefining          = false;
  state.versionHistory      = [];
  state.traceSpans          = [];
  state.tracePanelOpen      = false;
  state.traceSessionStart   = null;
  state.activeFwTab         = 'crewai';
  state.graphAnimFrame      = null;
  state.currentModalFile    = '';
  state.currentModalTab     = 'preview';
  state.mdBrowserActiveFile = '';
  state.versionPanelOpen    = false;
  state.graphNodes          = [];
  state.graphEdges          = [];
  state.activeTopicCat      = 'all';
}

/**
 * Called when user selects a level — updates MAX_QUESTIONS to match.
 */
export function setLevel(levelId) {
  state.currentLevel  = levelId;
  state.MAX_QUESTIONS = MAX_QUESTIONS_BY_LEVEL[levelId] ?? 7;
}
