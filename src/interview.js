// ─── CHAT INTERVIEW ──────────────────────────────────────
import { state } from './state.js';
import { t } from './i18n.js';
import { callLLM } from './api.js';
import { addMessage, addTypingIndicator, removeTypingIndicator, renderProgressSteps } from './chat.js';
import { showNotif, _renderSkeletonCards, _showGeneratingState } from './ui.js';
import { showResults } from './results.js';
import { updateContextBar } from './navigation.js';
import { buildGraphFromAgents } from './graph.js';

// ─── CHAT SCREEN ──────────────────────────────────────────
export function startChat() {
  window.showScreen('chat');
  updateContextBar('chat');
  // Reset trace for new session
  state.traceSpans = [];
  state.tracePanelOpen = false;
  state.traceSessionStart = null;
  document.getElementById('apiKeyHeader').style.display = 'flex';
  document.getElementById('apiKeyInput').value = state.apiKey;
  // Show model badge in header
  const badgeEl = document.getElementById('headerModelBadge');
  if(badgeEl) badgeEl.textContent = state.selectedModel.model;
  document.getElementById('sidebar-topic').textContent = state.currentTopic;
  const lvl = t('levels').find(l => l.id === state.currentLevel);
  if(lvl) {
    document.getElementById('sidebar-level').textContent = lvl.emoji;
    document.getElementById('sidebar-level-name').textContent = lvl.name;
    document.getElementById('sidebar-level-name').style.color = lvl.color;
    document.getElementById('sidebar-level-desc').textContent = lvl.tagline;
  }
  document.getElementById('chat-title').textContent = t('chatTitle');
  document.getElementById('chat-subtitle').textContent = t('chatSub');

  renderProgressSteps(0);
  state.chatHistory = [];
  state.questionCount = 0;
  state.conversationState = 'interview';

  const systemPrompt = getSystemPrompt();
  addTypingIndicator();
  callLLM(systemPrompt, `The user wants to build: "${state.currentTopic}". Start the interview with your FIRST question. Respond ONLY with the JSON object as specified — no greeting text, just the JSON.`, '🎤 Interview · Start')
    .then(reply => {
      removeTypingIndicator();
      let parsed = null;
      try {
        const m = reply.match(/\{[\s\S]*\}/);
        if(m) parsed = JSON.parse(m[0]);
      } catch(e) {}
      if(parsed && parsed.question && parsed.options) {
        addMessage('ai', parsed.question);
        renderOptions(parsed);
      } else {
        addMessage('ai', reply);
        renderOptionsLegacy(reply);
      }
    })
    .catch(err => {
      removeTypingIndicator();
      addMessage('ai', `Error: ${err.message}. Please check your API key.`);
    });
}

export function getSystemPrompt() {
  const levelData = t('levels').find(l => l.id === state.currentLevel) || t('levels')[0];
  return `You are AgentSpark, an expert AI system designer. Your job is to interview the user about their app idea using CLOSED questions with multiple choice answers.

Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${levelData.name} — ${levelData.tagline}
Agent count to generate: ${levelData.agentCount}
Focus areas for this level: ${levelData.focus}

INTERVIEW STRUCTURE — ${state.MAX_QUESTIONS} questions total, split into 3 adaptive sections:

SECTION 1 — BUSINESS (first ${Math.ceil(state.MAX_QUESTIONS * 0.3)} questions):
Focus: target users, monetization model, core value proposition, market.
Example topics: who uses the app, how it makes money, what problem it solves, main competitors.

SECTION 2 — FRONTEND (next ${Math.ceil(state.MAX_QUESTIONS * 0.35)} questions):
Focus: UI paradigm, navigation, key user flows, device targets, design priorities.
Example topics: onboarding flow, main screens, mobile vs web, key interactions.

SECTION 3 — BACKEND (remaining questions):
Focus: data storage, auth, external APIs, scalability, infrastructure.
Example topics: authentication method, data model, third-party integrations, hosting preferences.

ADAPTIVE RULES — CRITICAL:
- Each question MUST reference or build on previous answers. Never ask in a vacuum.
- If user chose "mobile-first" → ask about offline mode or push notifications next.
- If user chose "subscription model" → ask about billing provider and free tier strategy.
- If user chose "social login" → ask about user profile data needs.
- Questions must form a coherent decision tree that leads to a buildable specification.
- Calibrate depth: ${levelData.name} level — ${levelData.focus}
- For Spark: friendly, no jargon. For Flame: balanced. For Fire: technical. For Inferno: enterprise-deep.
- Always track what has been decided and reference it explicitly in the next question.

RESPONSE FORMAT — for EVERY question respond with ONLY this JSON, no extra text:
{
  "section": "Business" | "Frontend" | "Backend",
  "question": "Your question here — referencing prior choices where relevant?",
  "options": [
    { "label": "A", "text": "Option A text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "B", "text": "Option B text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "C", "text": "Option C text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "D", "text": "Option D text", "impact": "1 sentence: concrete consequence for the app under 15 words" }
  ]
}

After exactly ${state.MAX_QUESTIONS} questions respond with ONLY:
{ "complete": true, "summary": "Coherent 3-4 sentence spec summary covering business model, frontend approach, and backend architecture based on all answers." }

IMPORTANT: Pure JSON only. No markdown. No text outside JSON. Make every question feel like the natural next step after the previous answer.

GENERATION PHASE (when you receive [GENERATE]):
Respond with a JSON object ONLY, no markdown, no explanation. Format:
{
  "agents": [
    {
      "id": "slug-name",
      "name": "Agent Name",
      "emoji": "🤖",
      "type": "technical",
      "role": "ROLE_LABEL",
      "description": "What this agent does",
      "agentMd": "# Agent: Name\\n\\n## Identity\\n...\\n\\n## Goal\\n...\\n\\n## Personality\\n...\\n\\n## Context\\n...",
      "skillMd": "# Skill: Name\\n\\n## Capabilities\\n...\\n\\n## Instructions\\n...\\n\\n## Tools\\n...\\n\\n## Output Format\\n..."
    }
  ],
  "teamConfig": "# Team Configuration\\n\\n## Architecture\\n...\\n\\n## Agent Connections\\n...\\n\\n## Orchestration Mode\\n...\\n\\n## Workflow\\n..."
}

AGENT TYPES — you MUST generate both types:
- "technical" agents: builders who directly help code and implement the app
- "business" agents: strategists who provide context, validation and guidance

Distribute agent types based on level:
- Spark: 2 technical, 1 business
- Flame: 2 technical, 2 business
- Fire: 3 technical, 2 business
- Inferno: 4 technical, 2 business

Make agent files detailed and professional. Each agent should be genuinely useful for the specific app described.`;
}

export function selectOption(label, text) {
  // Mark all choice cards in the last choices-msg
  const msgs = document.querySelectorAll('.choices-msg');
  const last = msgs[msgs.length - 1];
  if(last) {
    last.querySelectorAll('.choice-wrap').forEach(w => {
      const card = w.querySelector('.choice-card');
      if(card) {
        if(card.dataset.label === label) {
          w.classList.add('selected');
          card.classList.add('selected');
        } else {
          card.classList.add('disabled');
        }
      }
    });
  }
  setTimeout(() => submitAnswer(label + ') ' + text), 400);
}

export async function submitAnswer(answer) {
  clearOptions();
  addMessage('user', answer);
  state.chatHistory.push({ role:'user', text: answer });
  state.questionCount++;

  if(state.conversationState === 'interview') {
    addTypingIndicator();
    try {
      const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
      const prompt = `${history}\n\nThis was answer ${state.questionCount} of ${state.MAX_QUESTIONS}. Ask next question or finalize.`;
      const reply = await callLLM(getSystemPrompt(), prompt, `🎤 Interview · Q${state.questionCount} of ${state.MAX_QUESTIONS}`);
      removeTypingIndicator();

      // Parse JSON response
      let parsed = null;
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if(jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch(e) { /* fallback below */ }

      if(parsed && parsed.complete) {
        // Interview complete
        if(parsed.summary) addMessage('ai', parsed.summary);
        state.chatHistory.push({ role:'ai', text: parsed.summary || 'Interview complete.' });
        state.conversationState = 'generating';
        renderProgressSteps(1);
        clearOptions();
        setTimeout(generateAgents, 1200);
      } else if(parsed && parsed.question && parsed.options) {
        // Valid question JSON — show question as AI message, options as cards
        addMessage('ai', parsed.question);
        state.chatHistory.push({ role:'ai', text: parsed.question });
        renderOptions(parsed);
      } else {
        // Fallback: show raw reply and try legacy parse
        addMessage('ai', reply);
        state.chatHistory.push({ role:'ai', text: reply });
        if(reply.includes('[INTERVIEW_COMPLETE]') || state.questionCount >= state.MAX_QUESTIONS) {
          state.conversationState = 'generating';
          renderProgressSteps(1);
          clearOptions();
          setTimeout(generateAgents, 1200);
        } else {
          renderOptionsLegacy(reply);
        }
      }
    } catch(err) {
      removeTypingIndicator();
      addMessage('ai', `Error: ${err.message}`);
    }
  }
}

export function _buildChoiceCard(label, optText, impact) {
  const wrap = document.createElement('div');
  wrap.className = 'choice-wrap';

  const card = document.createElement('button');
  card.className = 'choice-card';
  card.dataset.label = label;

  const labelEl = document.createElement('span');
  labelEl.className = 'choice-label';
  labelEl.textContent = label;

  const textEl = document.createElement('span');
  textEl.className = 'choice-text';
  textEl.textContent = optText;

  card.appendChild(labelEl);
  card.appendChild(textEl);

  if(impact) {
    const infoBtn = document.createElement('button');
    infoBtn.className = 'choice-info-btn';
    infoBtn.title = 'Show details';
    infoBtn.textContent = 'ℹ️';
    const impactEl = document.createElement('div');
    impactEl.className = 'choice-impact';
    impactEl.textContent = impact;
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      impactEl.classList.toggle('visible');
    };
    card.appendChild(infoBtn);
    wrap.appendChild(card);
    wrap.appendChild(impactEl);
  } else {
    wrap.appendChild(card);
  }

  card.onclick = () => selectOption(label, optText);
  return wrap;
}

export function renderOptions(parsed) {
  // parsed is a JSON object: { question, options: [{label, text, impact}] }
  if(!parsed || !parsed.options) return;
  const panel = document.getElementById('question-panel');
  const panelText = document.getElementById('question-panel-text');
  const panelChoices = document.getElementById('question-panel-choices');
  if(!panel || !panelText || !panelChoices) return;

  // Show section badge if present
  let sectionBadge = panel.querySelector('.question-section-badge');
  if(!sectionBadge) {
    sectionBadge = document.createElement('div');
    sectionBadge.className = 'question-section-badge';
    panel.insertBefore(sectionBadge, panel.firstChild);
  }
  const sectionIcons = { Business: '💼', Frontend: '🎨', Backend: '⚙️' };
  if(parsed.section) {
    sectionBadge.textContent = (sectionIcons[parsed.section] || '') + ' ' + parsed.section;
    sectionBadge.style.display = 'inline-block';
  } else {
    sectionBadge.style.display = 'none';
  }

  panelText.textContent = parsed.question || '';
  panelChoices.innerHTML = '';
  parsed.options.forEach(opt => {
    panelChoices.appendChild(_buildChoiceCard(opt.label, opt.text, opt.impact || null));
  });
  panel.style.display = 'flex';

  const chatEl = document.getElementById('chat-messages');
  if(chatEl) chatEl.scrollTop = chatEl.scrollHeight;
}

export function renderOptionsLegacy(text) {
  // Fallback for non-JSON AI responses
  const matches = [...text.matchAll(/([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs)];
  if(matches.length === 0) return;
  const panel = document.getElementById('question-panel');
  const panelText = document.getElementById('question-panel-text');
  const panelChoices = document.getElementById('question-panel-choices');
  if(!panel) return;
  panelText.textContent = '';
  panelChoices.innerHTML = '';
  matches.forEach(m => {
    const label = m[1];
    const full = m[2].trim().replace(/\n/g, ' ');
    const parts = full.split(/\s*\|\s*IMPACT:\s*/i);
    panelChoices.appendChild(_buildChoiceCard(label, parts[0].trim(), parts[1] ? parts[1].trim() : null));
  });
  panel.style.display = 'flex';
}

export function clearOptions() {
  const panel = document.getElementById('question-panel');
  if(panel) panel.style.display = 'none';
  const panelChoices = document.getElementById('question-panel-choices');
  if(panelChoices) panelChoices.innerHTML = '';
}

export async function generateScoring(history) {
  const lvl = t('levels').find(l => l.id === state.currentLevel);
  const scoringPrompt = `You are a project complexity analyst. Based on this interview about the app "${state.currentTopic}", generate a project scoring report.

Interview:
${history}

Chosen level: ${lvl ? lvl.name : state.currentLevel}

Respond ONLY with a JSON object, no markdown:
{
  "overallScore": 72,
  "overallLabel": "Medium-High Complexity",
  "metrics": [
    { "label": "Technical Complexity", "value": 80, "color": "#f2b90d" },
    { "label": "Business Complexity", "value": 60, "color": "#e05a1a" },
    { "label": "Integration Needs", "value": 70, "color": "#c49a0a" },
    { "label": "Scalability Demand", "value": 55, "color": "#7cc42a" }
  ],
  "risks": ["Risk 1 in 10 words max", "Risk 2", "Risk 3"],
  "levelMatch": "ok",
  "levelSuggestion": "Your chosen level matches the project complexity well.",
  "suggestedLevel": "${state.currentLevel}"
}

levelMatch must be: "ok", "upgrade", or "downgrade".
suggestedLevel must be one of: iskra, plomien, pozar, inferno.
Keep risks under 12 words each. Be specific to this project.
Language: ${state.lang === 'en' ? 'English' : 'Polish'}`;

  try {
    const raw = await callLLM('You are a project analyst. Return only JSON.', scoringPrompt, '📊 Scoring · Complexity analysis');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch(e) {
    console.warn('Scoring failed:', e);
    return null;
  }
}

export function renderScoring(data) {
  if(!data) return;
  const panel = document.getElementById('scoring-panel');
  panel.style.display = 'block';

  const scoreColor = data.overallScore >= 75 ? 'var(--accent2)' : data.overallScore >= 50 ? '#f59e0b' : 'var(--success)';
  const isWarn = data.levelMatch !== 'ok';
  const suggestedLvl = t('levels').find(l => l.id === data.suggestedLevel);

  const _metricInfo = {
    'Technical Complexity':  { low: '0–40: Simple tech stack, mostly standard tools.', mid: '40–70: Custom logic, APIs or real-time features needed.', high: '70–100: Complex architecture, microservices or AI.' },
    'Business Complexity':   { low: '0–40: Straightforward model, few stakeholders.', mid: '40–70: Multiple user roles or revenue streams.', high: '70–100: Complex ops, compliance or multi-market.' },
    'Integration Needs':     { low: '0–40: Few or no external services required.', mid: '40–70: Several APIs like payments or auth needed.', high: '70–100: Heavy integrations, real-time data sync.' },
    'Scalability Demand':    { low: '0–40: Small user base, no scaling pressure.', mid: '40–70: Growth expected, some infrastructure planning.', high: '70–100: High traffic, distributed systems required.' },
  };
  const metricsHTML = (data.metrics || []).map(m => {
    const info = _metricInfo[m.label] || {};
    const tier = m.value < 40 ? info.low : m.value < 70 ? info.mid : info.high;
    const tipId = 'tip-' + m.label.replace(/\s+/g,'-');
    const infoBtn = tier ? '<button class="metric-info-btn" onclick="document.getElementById(\'' + tipId + '\').classList.toggle(\'visible\')" title="What does this mean?">\u2139\ufe0f</button>' : '';
    const tipDiv = tier ? '<div class="metric-tip" id="' + tipId + '">' + tier + '</div>' : '';
    return '<div class="score-metric">'
      + '<div class="score-metric-label">' + m.label + infoBtn + '</div>'
      + tipDiv
      + '<div class="score-metric-bar"><div class="score-metric-fill" style="width:0%;background:' + m.color + '" data-target="' + m.value + '"></div></div>'
      + '<div class="score-metric-value">' + m.value + '/100</div>'
      + '</div>';
  }).join('');

  const risksHTML = (data.risks || []).map(r => `<div class="risk-item">${r}</div>`).join('');
  const suggestionIcon = data.levelMatch === 'upgrade' ? '⬆' : data.levelMatch === 'downgrade' ? '⬇' : '✓';

  panel.innerHTML = `
    <div class="scoring-header">
      <h3>${state.lang==='en' ? 'PROJECT SCORING' : 'OCENA PROJEKTU'}</h3>
      <div class="score-badge">
        <div class="score-number" style="color:${scoreColor}">${data.overallScore}</div>
        <div class="score-label"><strong>${data.overallLabel}</strong>${state.lang==='en'?'out of 100':'na 100'}</div>
      </div>
    </div>
    <div class="scoring-grid">${metricsHTML}</div>
    ${risksHTML ? `<div class="scoring-risks"><h4>${state.lang==='en'?'⚠ POTENTIAL RISKS':'⚠ POTENCJALNE RYZYKA'}</h4>${risksHTML}</div>` : ''}
    <div class="level-suggestion ${isWarn ? 'warn' : ''}">
      <span class="ls-icon">${suggestionIcon}</span>
      <span>${data.levelSuggestion}${suggestedLvl && isWarn ? ' <strong>→ ' + suggestedLvl.name + '</strong>' : ''}</span>
    </div>
  `;

  // Single-frame rAF to trigger CSS transition after DOM paint
  requestAnimationFrame(() => {
    if(!document.getElementById('screen-results').classList.contains('active')) return;
    panel.querySelectorAll('.score-metric-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = (bar.dataset.target || 0) + '%'; }, 100);
    });
  });
}

export async function generateAgents() {
  addTypingIndicator();
  const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
  const prompt = `Here is the complete interview:\n${history}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

  try {
    const levelData = t('levels').find(l => l.id === state.currentLevel) || t('levels')[0];
    const raw = await callLLM(getSystemPrompt(), prompt, `⚡ Generate Team · ${levelData.agentCount} agents · ${state.currentLevel}`);
    removeTypingIndicator();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('Could not parse agent data');
    const data = JSON.parse(jsonMatch[0]);

    state.generatedAgents = data.agents || [];
    state.generatedFiles = {};

    state.generatedAgents.forEach(a => {
      state.generatedFiles[`agent-${a.id}.md`] = a.agentMd || `# Agent: ${a.name}\n\n**Role:** ${a.role || ''}\n\n${a.description || ''}`;
      state.generatedFiles[`skill-${a.id}.md`] = a.skillMd || `# Skill: ${a.name}\n\n## Capabilities\n\n${a.description || ''}`;
    });
    state.generatedFiles['team-config.md'] = data.teamConfig || `# Team Configuration\n\n**Project:** ${state.currentTopic}\n\n## Agents\n\n${state.generatedAgents.map(a => `- **${a.name}** (${a.role || a.id})`).join('\n')}`;
    state.generatedFiles['README.md'] = generateReadme();

    window._scoringData = undefined;
    const historyForScoring = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
    generateScoring(historyForScoring).then(scoreData => {
      window._scoringData = scoreData;
    });

    renderProgressSteps(3);
    addMessage('ai', state.lang==='en'
      ? `✅ Done! I've designed ${state.generatedAgents.length} specialized agents for your "${state.currentTopic}" app. Your files are ready — switching to results view now!`
      : `✅ Gotowe! Zaprojektowałem ${state.generatedAgents.length} wyspecjalizowanych agentów dla Twojej aplikacji "${state.currentTopic}". Pliki są gotowe — przechodzę do widoku wyników!`
    );

    setTimeout(() => {
      // Seed v1 "Origin" snapshot
      state.versionHistory = [];
      state.versionHistory.push({
        id: Date.now(),
        label: state.lang === 'en' ? `Original team — ${state.currentTopic}` : `Oryginalny zespół — ${state.currentTopic}`,
        ts: new Date(),
        agents: JSON.parse(JSON.stringify(state.generatedAgents)),
        files: JSON.parse(JSON.stringify(state.generatedFiles)),
        diff: { added: [], removed: [], changed: [] },
        removedNames: {},
        agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
        vNum: 1,
        isOrigin: true,
      });
      showResults();
    }, 1800);
  } catch(err) {
    removeTypingIndicator();
    addMessage('ai', `Generation error: ${err.message}. Please try again.`);
  }
}

export function generateReadme() {
  const technical = state.generatedAgents.filter(a => a.type === 'technical');
  const business  = state.generatedAgents.filter(a => a.type !== 'technical');
  const techList = technical.map(a => `- **${a.name}** [TECHNICAL] (${a.role}): ${a.description}`).join('\n');
  const bizList  = business.map(a  => `- **${a.name}** [BUSINESS] (${a.role}): ${a.description}`).join('\n');
  const lvl = t('levels').find(l => l.id === state.currentLevel);
  return `# AgentSpark — Generated Team\n\n**Project:** ${state.currentTopic}\n**Level:** ${lvl ? lvl.name : state.currentLevel}\n**Generated:** ${new Date().toLocaleString()}\n**Language:** ${state.lang.toUpperCase()}\n\n## ⚙️ Technical Agents\n\n${techList || 'none'}\n\n## 💼 Business Agents\n\n${bizList || 'none'}\n\n## Files\n\n${Object.keys(state.generatedFiles).filter(f=>f!=='README.md').map(f=>`- \`${f}\``).join('\n')}\n\n## How to use\n\nSee instructions inside the app or visit antigravity.google\n`;
}
