// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Application-wide constants — never mutated at runtime.

export const CACHE_NAME = 'agentspark-v2';

export const STORAGE_KEYS = {
  lang:   'agentspark-lang',
  apiKey: 'agentspark-apikey',
  model:  'agentspark-model',
  theme:  'agentspark-theme',
};

// Complexity levels — maps to agent count and prompt focus
export const LEVELS = [
  {
    id:         'iskra',
    name:       'Spark',
    emoji:      '✦',
    color:      '#7cc42a',
    tagline:    'Quick prototype',
    agentCount: 3,
    focus:      'Simple stack, minimal dependencies, fast MVP',
    maxQ:       5,
  },
  {
    id:         'plomien',
    name:       'Flame',
    emoji:      '🔥',
    color:      '#f59e0b',
    tagline:    'Production-ready app',
    agentCount: 4,
    focus:      'Balanced tech and business, real-world features',
    maxQ:       7,
  },
  {
    id:         'pozar',
    name:       'Fire',
    emoji:      '⚡',
    color:      '#e05a1a',
    tagline:    'Scalable platform',
    agentCount: 5,
    focus:      'Technical depth, integrations, scalability planning',
    maxQ:       9,
  },
  {
    id:         'inferno',
    name:       'Inferno',
    emoji:      '🌋',
    color:      '#c2185b',
    tagline:    'Enterprise system',
    agentCount: 6,
    focus:      'Enterprise architecture, compliance, multi-market',
    maxQ:       12,
  },
];

// Max questions per level (indexed to match LEVELS order)
export const MAX_QUESTIONS_BY_LEVEL = {
  iskra:   5,
  plomien: 7,
  pozar:   9,
  inferno: 12,
};
