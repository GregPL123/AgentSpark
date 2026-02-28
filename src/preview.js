// ─── FILE PREVIEW MODAL ──────────────────────────────────
import { state } from './state.js';
import { renderMarkdown } from './markdown.js';
import { showNotif } from './ui.js';
import JSZip from 'jszip';

// ─── FILE PREVIEW MODAL ───────────────────────────────────
export function previewFile(filename) {
  const content = state.generatedFiles[filename];
  if(!content) return;

  state.currentModalFile = filename;
  state.currentModalTab = 'preview';

  document.getElementById('modal-title').textContent = filename;
  document.getElementById('modal-filesize').textContent =
    `${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  // Render both panes
  document.getElementById('modal-preview-pane').innerHTML = renderMarkdown(content);
  document.getElementById('modal-raw-pane').textContent = content;

  // Show preview by default
  switchModalTab('preview');

  document.getElementById('modal').classList.add('open');
}

export function switchModalTab(tab) {
  state.currentModalTab = tab;
  const previewPane = document.getElementById('modal-preview-pane');
  const rawPane = document.getElementById('modal-raw-pane');
  const tabPreview = document.getElementById('tab-preview');
  const tabRaw = document.getElementById('tab-raw');

  if(tab === 'preview') {
    previewPane.style.display = 'block';
    rawPane.style.display = 'none';
    tabPreview.classList.add('active');
    tabRaw.classList.remove('active');
  } else {
    previewPane.style.display = 'none';
    rawPane.style.display = 'block';
    tabPreview.classList.remove('active');
    tabRaw.classList.add('active');
  }
}

export function downloadCurrentFile() {
  if(!state.currentModalFile || !state.generatedFiles[state.currentModalFile]) return;
  const blob = new Blob([state.generatedFiles[state.currentModalFile]], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.currentModalFile;
  a.click();
  showNotif(`✓ ${state.currentModalFile} downloaded`);
}

export function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// ─── MARKDOWN BROWSER (all files) ─────────────────────────
export function openMarkdownPreview() {
  if(!Object.keys(state.generatedFiles).length) {
    showNotif(state.lang==='en' ? '⚠ No files yet — generate a team first' : '⚠ Brak plików — najpierw wygeneruj zespół', true);
    return;
  }
  const modal = document.getElementById('md-browser-modal');
  modal.classList.add('open');

  const mdFiles = Object.keys(state.generatedFiles).filter(f => f.endsWith('.md'));
  const sidebar = document.getElementById('md-browser-sidebar');
  sidebar.innerHTML = '';

  // File groups
  const groups = [
    { label: state.lang==='en' ? '📋 Config' : '📋 Konfiguracja', files: mdFiles.filter(f => f === 'README.md' || f === 'team-config.md') },
    { label: state.lang==='en' ? '⚙️ Agents' : '⚙️ Agenci', files: mdFiles.filter(f => f.startsWith('agent-')) },
    { label: state.lang==='en' ? '🎯 Skills' : '🎯 Umiejętności', files: mdFiles.filter(f => f.startsWith('skill-')) },
  ];

  groups.forEach(group => {
    if(!group.files.length) return;

    const groupLabel = document.createElement('div');
    groupLabel.style.cssText = 'font-size:0.6rem;font-family:"Space Mono",monospace;color:var(--muted);padding:0.6rem 1rem 0.3rem;letter-spacing:0.1em;text-transform:uppercase;';
    groupLabel.textContent = group.label;
    sidebar.appendChild(groupLabel);

    group.files.forEach(f => {
      const item = document.createElement('button');
      item.style.cssText = `
        display:block;width:100%;text-align:left;
        background:none;border:none;border-left:2px solid transparent;
        color:var(--muted);padding:0.5rem 1rem;
        font-family:'Space Mono',monospace;font-size:0.68rem;
        cursor:pointer;transition:all 0.15s;line-height:1.4;
        word-break:break-all;
      `;
      item.textContent = f;
      item.dataset.file = f;
      item.onmouseenter = () => { if(f !== state.mdBrowserActiveFile) item.style.color = 'var(--text)'; };
      item.onmouseleave = () => { if(f !== state.mdBrowserActiveFile) item.style.color = 'var(--muted)'; };
      item.onclick = () => selectMdBrowserFile(f);
      sidebar.appendChild(item);
    });
  });

  // Select first file
  if(mdFiles.length > 0) {
    selectMdBrowserFile('README.md' in state.generatedFiles ? 'README.md' : mdFiles[0]);
  }
}

export function selectMdBrowserFile(filename) {
  state.mdBrowserActiveFile = filename;
  const content = state.generatedFiles[filename] || '';

  // Update sidebar active state
  document.querySelectorAll('#md-browser-sidebar button').forEach(btn => {
    const isActive = btn.dataset.file === filename;
    btn.style.borderLeftColor = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--muted)';
    btn.style.background = isActive ? 'rgba(242,185,13,0.06)' : 'none';
  });

  document.getElementById('md-browser-rendered').innerHTML = renderMarkdown(content);
  document.getElementById('md-browser-active-file').textContent =
    `${filename} · ${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  // Scroll content pane to top
  const contentPane = document.getElementById('md-browser-content');
  contentPane.scrollTop = 0;
}

export function closeMdBrowser() {
  document.getElementById('md-browser-modal').classList.remove('open');
}

export async function downloadAllMd() {
  if(typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true); return;
  }
  const zip = new JSZip();
  Object.entries(state.generatedFiles)
    .filter(([name]) => name.endsWith('.md'))
    .forEach(([name, content]) => zip.file(name, content));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-docs-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(state.lang === 'en' ? '✓ Docs ZIP downloaded!' : '✓ Docs ZIP pobrany!');
}

