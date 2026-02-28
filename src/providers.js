// ─── LLM PROVIDERS ────────────────────────────────────────────────────────────
// Fallback chains and per-provider fetch adapters.
// api.js orchestrates retries; this file only knows how to talk to each API.

// ── Fallback chains ───────────────────────────────────────────────────────────
// Each chain is tried in order when the primary model fails with a fallbackable
// error (rate limit, overload, timeout, quota, etc.).

/** @type {Record<string, Array<{provider:string, model:string, endpoint:string, tag:string, label:string}>>} */
export const FALLBACK_CHAINS = {
  gemini: [
    { provider: 'gemini', model: 'gemini-3-flash-preview', tag: 'gemini', label: 'Gemini 3 Flash Preview',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}' },
    { provider: 'gemini', model: 'gemini-3-flash',         tag: 'gemini', label: 'Gemini 3 Flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}' },
    { provider: 'gemini', model: 'gemini-2.5-pro',         tag: 'gemini', label: 'Gemini 2.5 Pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}' },
    { provider: 'gemini', model: 'gemini-3.1-pro',         tag: 'gemini', label: 'Gemini 3.1 Pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}' },
  ],
  openai: [
    { provider: 'openai', model: 'gpt-5',      tag: 'openai', label: 'GPT-5',
      endpoint: 'https://api.openai.com/v1/chat/completions' },
    { provider: 'openai', model: 'gpt-5-mini', tag: 'openai', label: 'GPT-5 mini',
      endpoint: 'https://api.openai.com/v1/chat/completions' },
    { provider: 'openai', model: 'gpt-5-nano', tag: 'openai', label: 'GPT-5 nano',
      endpoint: 'https://api.openai.com/v1/chat/completions' },
  ],
  anthropic: [
    { provider: 'anthropic', model: 'claude-opus-4-6',         tag: 'anthropic', label: 'Claude Opus 4.6',
      endpoint: 'https://api.anthropic.com/v1/messages' },
    { provider: 'anthropic', model: 'claude-opus-4-5',         tag: 'anthropic', label: 'Claude Opus 4.5',
      endpoint: 'https://api.anthropic.com/v1/messages' },
    { provider: 'anthropic', model: 'claude-sonnet-4-5',       tag: 'anthropic', label: 'Claude Sonnet 4.5',
      endpoint: 'https://api.anthropic.com/v1/messages' },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', tag: 'anthropic', label: 'Claude Haiku 4.5',
      endpoint: 'https://api.anthropic.com/v1/messages' },
  ],
  mistral: [
    { provider: 'openai', model: 'mistral-large-latest',  tag: 'mistral', label: 'Mistral Large 3',
      endpoint: 'https://api.mistral.ai/v1/chat/completions' },
    { provider: 'openai', model: 'ministral-14b-latest',  tag: 'mistral', label: 'Ministral 14B',
      endpoint: 'https://api.mistral.ai/v1/chat/completions' },
    { provider: 'openai', model: 'ministral-8b-latest',   tag: 'mistral', label: 'Ministral 8B',
      endpoint: 'https://api.mistral.ai/v1/chat/completions' },
    { provider: 'openai', model: 'ministral-3b-latest',   tag: 'mistral', label: 'Ministral 3B',
      endpoint: 'https://api.mistral.ai/v1/chat/completions' },
  ],
  groq: [
    { provider: 'openai', model: 'llama-3.3-70b-versatile', tag: 'groq', label: 'Llama 3.3 70B',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
    { provider: 'openai', model: 'llama-3.1-8b-instant',    tag: 'groq', label: 'Llama 3.1 8B',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  ],
};

// ── Fallback eligibility ──────────────────────────────────────────────────────
/** Returns true for transient errors that warrant trying the next model. */
export function isFallbackable(status, message) {
  if ([429, 500, 502, 503, 504, 529].includes(status)) return true;
  const msg = (message || '').toLowerCase();
  return (
    msg.includes('rate limit')  ||
    msg.includes('overloaded')  ||
    msg.includes('capacity')    ||
    msg.includes('timeout')     ||
    msg.includes('quota')       ||
    msg.includes('unavailable')
  );
}

// ── Per-provider fetch adapters ───────────────────────────────────────────────
// Each returns { result: string, tokens: number|null } or throws with err.status.

export async function fetchGemini({ model, endpoint }, key, systemInstruction, userMessage) {
  const url = endpoint.replace('{model}', model).replace('{key}', key);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e   = new Error(err.error?.message || `Gemini error ${res.status}`);
    e.status  = res.status;
    throw e;
  }

  const data   = await res.json();
  const tokens = data.usageMetadata?.totalTokenCount ?? null;
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { result, tokens };
}

export async function fetchOpenAI({ model, endpoint }, key, systemInstruction, userMessage) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.8,
      max_tokens:  4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e   = new Error(err.error?.message || `API error ${res.status}`);
    e.status  = res.status;
    throw e;
  }

  const data   = await res.json();
  const tokens = data.usage?.total_tokens ?? null;
  const result = data.choices?.[0]?.message?.content || '';
  return { result, tokens };
}

export async function fetchAnthropic({ model, endpoint }, key, systemInstruction, userMessage) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system:     systemInstruction,
      messages:   [{ role: 'user', content: userMessage }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e   = new Error(err.error?.message || `Anthropic error ${res.status}`);
    e.status  = res.status;
    throw e;
  }

  const data   = await res.json();
  const tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : null;
  const result = data.content?.[0]?.text || '';
  return { result, tokens };
}

// ── Dispatch to correct adapter ───────────────────────────────────────────────
export async function fetchProvider(modelDef, key, systemInstruction, userMessage) {
  switch (modelDef.provider) {
    case 'gemini':    return fetchGemini(modelDef, key, systemInstruction, userMessage);
    case 'openai':    return fetchOpenAI(modelDef, key, systemInstruction, userMessage);
    case 'anthropic': return fetchAnthropic(modelDef, key, systemInstruction, userMessage);
    default: {
      const e = new Error(`Unknown provider: ${modelDef.provider}`);
      e.status = 0;
      throw e;
    }
  }
}
