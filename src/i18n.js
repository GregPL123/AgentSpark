// ─── I18N ─────────────────────────────────────────────────
import { state } from './state.js';

export const T = {
  en: {
    badge: 'AI AGENT TEAM GENERATOR',
    heroTitle: 'Build Your<br/>AI Dream Team',
    heroSub: 'Choose a topic. Answer a few questions. Get a complete AI agent team — ready to build your app with Google Antigravity.',
    orText: '— or describe your own —',
    startBtn: 'Start →',
    chatTitle: 'AI Interview',
    chatSub: 'Building your agent profile...',
    sendBtn: 'Send',
    resultBadge: 'MISSION COMPLETE',
    resultTitle: 'Your AI Team is Ready',
    resultSub: 'Download your files and deploy to Google Antigravity',
    downloadBtn: '⬇ Download ZIP',
    instrBtn: '📋 Instructions',
    restartBtn: '↩ Start Over',
    refineBtn: '✏ Refine Team',
    refineTitle: 'Refine Your Team',
    refineSub: 'Tell the AI what you want to change. Be specific.',
    refineActions: [
      { id: 'improve', emoji: '⚡', label: 'Improve team', desc: 'General improvements to all agents' },
      { id: 'add', emoji: '➕', label: 'Add an agent', desc: 'Add a new specialist to the team' },
      { id: 'remove', emoji: '🗑', label: 'Remove an agent', desc: 'Remove or merge an existing agent' },
      { id: 'connections', emoji: '🔗', label: 'Change connections', desc: 'Reroute how agents communicate' },
    ],
    refinePlaceholder: 'e.g. Add a Security Agent, or make the Backend Agent focus more on GraphQL...',
    refineApply: 'Apply Changes',
    refineCancel: 'Cancel',
    refineThinking: 'Refining your team...',
    instrTitle: 'How to upload to Google Antigravity',
    progressSteps: ['Topic chosen','Interview done','Team generated','Files ready'],

    levels: [
      {
        id: 'iskra', emoji: '✨', name: 'Spark', tagline: 'Spark — just getting started',
        desc: 'Simple MVP, 2-3 agents, no-code friendly. Perfect for beginners.',
        color: '#f2b90d', questions: 4, agentCount: '2-3',
        focus: 'core features, simplicity, ease of use'
      },
      {
        id: 'plomien', emoji: '🔥', name: 'Flame', tagline: 'Flame — ready to build',
        desc: 'Full-featured app, 3-4 agents, some technical knowledge assumed.',
        color: '#f59e0b', questions: 5, agentCount: '3-4',
        focus: 'features, integrations, user flows, basic tech stack'
      },
      {
        id: 'pozar', emoji: '🌋', name: 'Fire', tagline: 'Fire — serious project',
        desc: 'Complex system, 4-5 agents, APIs, auth, data pipelines.',
        color: '#ef4444', questions: 6, agentCount: '4-5',
        focus: 'architecture, scalability, security, APIs, data models'
      },
      {
        id: 'inferno', emoji: '💀', name: 'Inferno', tagline: 'Inferno — enterprise grade',
        desc: 'Full enterprise system, 5-6 agents, microservices, CI/CD, full stack.',
        color: '#f2b90d', questions: 7, agentCount: '5-6',
        focus: 'microservices, DevOps, security, compliance, scalability, multi-tenant architecture'
      }
    ],
    topics: [
      { icon:'🛒', label:'E-Commerce App', sub:'Store, payments, catalog', cat:'business', agents:'Product, Cart, Payments, Recommendations', time:'~45s' },
      { icon:'📊', label:'Analytics Dashboard', sub:'Data, charts, reports', cat:'business', agents:'Data Ingest, Aggregator, Visualizer, Alerts', time:'~40s' },
      { icon:'💼', label:'SaaS Dev Team', sub:'Multi-tenant SaaS product', cat:'business', agents:'Auth, Billing, API, Infra, Onboarding', time:'~50s' },
      { icon:'📈', label:'Marketing Crew', sub:'Campaigns, copy, SEO', cat:'business', agents:'Strategist, Copywriter, SEO, Analytics', time:'~40s' },
      { icon:'🎓', label:'EdTech Platform', sub:'Courses, quizzes, users', cat:'education', agents:'Curriculum, Assessment, Progress, Content', time:'~45s' },
      { icon:'🏥', label:'Healthcare Tool', sub:'Patients, records, booking', cat:'health', agents:'Records, Scheduler, Alerts, Compliance', time:'~50s' },
      { icon:'💬', label:'Chat Application', sub:'Messaging, rooms, media', cat:'social', agents:'Messaging, Presence, Media, Moderation', time:'~40s' },
      { icon:'🎮', label:'Game / Gamification', sub:'Points, levels, rewards', cat:'social', agents:'Game Loop, Rewards, Leaderboard, Events', time:'~40s' },
      { icon:'🤖', label:'AI Automation Bot', sub:'Tasks, scheduling, workflows', cat:'ai', agents:'Orchestrator, Task Runner, Notifier, Logger', time:'~45s' },
      { icon:'🔍', label:'Research Assistant', sub:'Web search, summaries, reports', cat:'ai', agents:'Searcher, Synthesizer, Fact-checker, Writer', time:'~40s' },
      { icon:'🏗', label:'DevOps Pipeline', sub:'CI/CD, infra, monitoring', cat:'dev', agents:'Builder, Deployer, Monitor, Incident', time:'~50s' },
      { icon:'💰', label:'FinTech App', sub:'Payments, wallets, compliance', cat:'business', agents:'Payments, Risk, KYC, Ledger, Reporting', time:'~50s' },
    ],
    topicCats: [
      { id:'all', label:'All' },
      { id:'business', label:'Business' },
      { id:'ai', label:'AI / Automation' },
      { id:'dev', label:'Dev Tools' },
      { id:'education', label:'Education' },
      { id:'health', label:'Health' },
      { id:'social', label:'Social' },
    ],
    apiPlaceholder: 'Type your answer...',
    instrSteps: [
      { title: 'Open Google Antigravity', body: 'Go to <code>antigravity.google</code> and sign in with your Google account.' },
      { title: 'Create a new Workspace', body: 'Click "New Workspace" and give it the name of your project.' },
      { title: 'Upload agent files', body: 'For each agent, create a new Agent. Upload the corresponding <code>agent-[name].md</code> as the Agent\'s knowledge base.' },
      { title: 'Upload skill files', body: 'Within each agent, attach the <code>skill-[name].md</code> file to define how the agent behaves.' },
      { title: 'Connect the team', body: 'In the Manager View, connect your agents using the wiring provided in <code>team-config.md</code>.' },
      { title: 'Choose orchestration mode', body: 'Set the team to <strong>Agent-driven</strong> (fully automatic) or <strong>Agent-assisted</strong> (user orchestrated) depending on your preference.' },
      { title: 'Launch!', body: 'Hit "Deploy" and start interacting with your AI team. They are ready to help you build your app.' },
    ]
  },
  pl: {
    badge: 'GENERATOR ZESPOŁU AGENTÓW AI',
    heroTitle: 'Zbuduj Swój<br/>Zespół AI',
    heroSub: 'Wybierz temat. Odpowiedz na kilka pytań. Otrzymaj kompletny zespół agentów AI — gotowy do budowania aplikacji w Google Antigravity.',
    orText: '— lub opisz własny temat —',
    startBtn: 'Zacznij →',
    chatTitle: 'Wywiad AI',
    chatSub: 'Budujemy Twój profil agentów...',
    sendBtn: 'Wyślij',
    resultBadge: 'MISJA WYKONANA',
    resultTitle: 'Twój Zespół AI jest Gotowy',
    resultSub: 'Pobierz pliki i wdróż do Google Antigravity',
    downloadBtn: '⬇ Pobierz ZIP',
    instrBtn: '📋 Instrukcja',
    restartBtn: '↩ Od Początku',
    refineBtn: '✏ Popraw Zespół',
    refineTitle: 'Popraw Swój Zespół',
    refineSub: 'Powiedz AI co chcesz zmienić. Im konkretniej, tym lepiej.',
    refineActions: [
      { id: 'improve', emoji: '⚡', label: 'Ulepsz zespół', desc: 'Ogólne ulepszenia wszystkich agentów' },
      { id: 'add', emoji: '➕', label: 'Dodaj agenta', desc: 'Dodaj nowego specjalistę do zespołu' },
      { id: 'remove', emoji: '🗑', label: 'Usuń agenta', desc: 'Usuń lub połącz istniejącego agenta' },
      { id: 'connections', emoji: '🔗', label: 'Zmień połączenia', desc: 'Przepnij sposób komunikacji agentów' },
    ],
    refinePlaceholder: 'np. Dodaj agenta ds. bezpieczeństwa, albo zmień Backend Agenta na GraphQL...',
    refineApply: 'Zastosuj Zmiany',
    refineCancel: 'Anuluj',
    refineThinking: 'Poprawiam Twój zespół...',
    instrTitle: 'Jak wgrać do Google Antigravity',
    progressSteps: ['Temat wybrany','Wywiad gotowy','Zespół wygenerowany','Pliki gotowe'],

    levels: [
      {
        id: 'iskra', emoji: '✨', name: 'Iskra', tagline: 'Dopiero zaczynam',
        desc: 'Proste MVP, 2-3 agenty, przyjazne dla początkujących. Zero kodowania.',
        color: '#f2b90d', questions: 4, agentCount: '2-3',
        focus: 'podstawowe funkcje, prostota, łatwość użycia'
      },
      {
        id: 'plomien', emoji: '🔥', name: 'Płomień', tagline: 'Gotowy do budowania',
        desc: 'Pełna aplikacja, 3-4 agenty, podstawowa wiedza techniczna wymagana.',
        color: '#f59e0b', questions: 5, agentCount: '3-4',
        focus: 'funkcje, integracje, przepływy użytkownika, podstawowy stack techniczny'
      },
      {
        id: 'pozar', emoji: '🌋', name: 'Pożar', tagline: 'Poważny projekt',
        desc: 'Złożony system, 4-5 agentów, API, autoryzacja, pipeline danych.',
        color: '#ef4444', questions: 6, agentCount: '4-5',
        focus: 'architektura, skalowalność, bezpieczeństwo, API, modele danych'
      },
      {
        id: 'inferno', emoji: '💀', name: 'Inferno', tagline: 'Poziom enterprise',
        desc: 'Pełny system enterprise, 5-6 agentów, mikroserwisy, CI/CD, full stack.',
        color: '#f2b90d', questions: 7, agentCount: '5-6',
        focus: 'mikroserwisy, DevOps, bezpieczeństwo, compliance, skalowalność, architektura multi-tenant'
      }
    ],
    topics: [
      { icon:'🛒', label:'Aplikacja E-Commerce', sub:'Sklep, płatności, katalog', cat:'business', agents:'Produkty, Koszyk, Płatności, Rekomendacje', time:'~45s' },
      { icon:'📊', label:'Dashboard Analityczny', sub:'Dane, wykresy, raporty', cat:'business', agents:'Dane, Agregator, Wizualizator, Alerty', time:'~40s' },
      { icon:'💼', label:'Zespół SaaS', sub:'Multi-tenant produkt SaaS', cat:'business', agents:'Auth, Billing, API, Infra, Onboarding', time:'~50s' },
      { icon:'📈', label:'Marketing Crew', sub:'Kampanie, teksty, SEO', cat:'business', agents:'Strateg, Copywriter, SEO, Analityk', time:'~40s' },
      { icon:'🎓', label:'Platforma EdTech', sub:'Kursy, quizy, użytkownicy', cat:'education', agents:'Curriculum, Ocenianie, Postępy, Treści', time:'~45s' },
      { icon:'🏥', label:'Narzędzie Medyczne', sub:'Pacjenci, dokumentacja, wizyty', cat:'health', agents:'Dokumentacja, Scheduler, Alerty, Compliance', time:'~50s' },
      { icon:'💬', label:'Aplikacja Czat', sub:'Wiadomości, pokoje, media', cat:'social', agents:'Wiadomości, Obecność, Media, Moderacja', time:'~40s' },
      { icon:'🎮', label:'Gra / Gamifikacja', sub:'Punkty, poziomy, nagrody', cat:'social', agents:'Pętla gry, Nagrody, Ranking, Eventy', time:'~40s' },
      { icon:'🤖', label:'Bot Automatyzacji AI', sub:'Zadania, harmonogram, workflow', cat:'ai', agents:'Orkiestrator, Executor, Notifier, Logger', time:'~45s' },
      { icon:'🔍', label:'Asystent Badań', sub:'Wyszukiwanie, podsumowania, raporty', cat:'ai', agents:'Wyszukiwarka, Synthesizer, Fact-checker, Pisarz', time:'~40s' },
      { icon:'🏗', label:'Pipeline DevOps', sub:'CI/CD, infra, monitoring', cat:'dev', agents:'Builder, Deployer, Monitor, Incident', time:'~50s' },
      { icon:'💰', label:'Aplikacja FinTech', sub:'Płatności, portfele, compliance', cat:'business', agents:'Płatności, Ryzyko, KYC, Księga, Raporty', time:'~50s' },
    ],
    topicCats: [
      { id:'all', label:'Wszystkie' },
      { id:'business', label:'Biznes' },
      { id:'ai', label:'AI / Automatyzacja' },
      { id:'dev', label:'Dev Tools' },
      { id:'education', label:'Edukacja' },
      { id:'health', label:'Zdrowie' },
      { id:'social', label:'Social' },
    ],
    apiPlaceholder: 'Wpisz odpowiedź...',
    instrSteps: [
      { title: 'Otwórz Google Antigravity', body: 'Przejdź na <code>antigravity.google</code> i zaloguj się kontem Google.' },
      { title: 'Utwórz nowy Workspace', body: 'Kliknij "New Workspace" i nadaj mu nazwę projektu.' },
      { title: 'Wgraj pliki agentów', body: 'Dla każdego agenta utwórz nowego Agenta. Wgraj <code>agent-[nazwa].md</code> jako bazę wiedzy.' },
      { title: 'Wgraj pliki umiejętności', body: 'W każdym agencie dołącz plik <code>skill-[nazwa].md</code> — definiuje on zachowanie agenta.' },
      { title: 'Połącz zespół', body: 'W Manager View połącz agentów zgodnie z konfiguracją z pliku <code>team-config.md</code>.' },
      { title: 'Wybierz tryb orkiestracji', body: 'Ustaw <strong>Agent-driven</strong> (w pełni automatyczny) lub <strong>Agent-assisted</strong> (sterowany przez użytkownika).' },
      { title: 'Uruchom!', body: 'Kliknij "Deploy" i zacznij pracę z zespołem AI gotowym do budowania Twojej aplikacji.' },
    ]
  }
};

export function t(key) { return T[state.lang][key]; }
