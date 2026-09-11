const $ = (id) => document.getElementById(id);
const API_URL = 'http://127.0.0.1:8000/notes/';
const PAGE_SIZE = 5;
const state = { notes: [], current: null, busy: false, more: false, offset: 0 };
const dirty = () => state.current !== null && ($('title').value !== state.current.title || $('editor').value !== state.current.content);

async function initializeMarkdown() {
  if (!window.marked || !window.DOMPurify) {
    throw new Error('The Markdown libraries could not be loaded. Keep the vendor folder alongside index.html and reload the page.');
  }
}

async function api(path = '', method = 'GET', data) {
  const options = { method, signal: AbortSignal.timeout(15000) };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error('Cannot reach the API. Check that the backend is running at http://127.0.0.1:8000 and allows this frontend origin in CORS.');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `The request failed (${response.status}). Please try again.`);
  }
  return response.status === 204 ? null : response.json();
}

function notice(message) {
  $('notice-text').textContent = message;
  $('notice').hidden = false;
}

function updateControls() {
  const active = state.current !== null;
  $('title').disabled = $('editor').disabled = !active || state.busy;
  $('save').disabled = !active || state.busy || (!dirty() && state.current.note_id !== null);
  $('delete-note').disabled = !active || state.current.note_id === null || state.busy;
  $('new-note').disabled = $('empty-new').disabled = $('refresh').disabled = state.busy;
  $('previous-page').disabled = state.busy || state.offset === 0;
  $('next-page').disabled = state.busy || !state.more;
  $('save-status').textContent = state.busy ? 'Working…' : !active ? 'Ready' : dirty() || state.current.note_id === null ? '● Unsaved changes' : '● Saved';
  $('empty-state').hidden = active;
}

function date(value) {
  if (!value) return '—';
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function renderList() {
  $('note-list').replaceChildren();
  $('note-count').textContent = state.notes.length;
  for (const note of state.notes) {
    const button = document.createElement('button');
    button.className = 'note-item';
    const selected = state.current?.note_id === note.note_id;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    const title = document.createElement('span');
    title.className = 'note-title';
    title.textContent = note.title;
    button.title = note.title;
    const meta = document.createElement('span');
    meta.className = 'note-meta';
    const type = document.createElement('span');
    const time = document.createElement('span');
    time.textContent = date(note.updated_at);
    meta.append(type, time);
    button.append(title, meta);
    button.addEventListener('click', () => openNote(note.note_id));
    $('note-list').append(button);
  }
  if (!state.notes.length) {
    const empty = document.createElement('p');
    empty.className = 'list-empty';
    empty.textContent = 'No notes yet.';
    $('note-list').append(empty);
  }
  $('page-number').textContent = `Page ${state.offset / PAGE_SIZE + 1}`;
}

function renderContent() {
  const content = $('editor').value;
  if (window.marked && window.DOMPurify) {
    $('preview').innerHTML = DOMPurify.sanitize(marked.parse(content, { gfm: true }));
    $('preview').querySelectorAll('a').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  } else {
    $('preview').textContent = content;
  }
  updateControls();
}

function select(note) {
  state.current = note;
  $('title').value = note?.title ?? '';
  $('editor').value = note?.content ?? '';
  $('created').textContent = date(note?.created_at);
  $('updated').textContent = date(note?.updated_at);
  document.title = note ? `${note.title || 'Untitled'} — semicolon` : 'semicolon — Markdown notes';
  renderList();
  renderContent();
}

async function run(action) {
  if (state.busy) return;
  state.busy = true;
  updateControls();
  try { await action(); } catch (error) { notice(error.message); }
  finally { state.busy = false; updateControls(); }
}

function confirmAction(title, description, label) {
  const dialog = $('confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  $('dialog-title').textContent = title;
  $('dialog-description').textContent = description;
  $('dialog-confirm').textContent = label;
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

async function mayLeave() {
  return !dirty() || await confirmAction('Discard your changes?', 'Your latest changes have not been saved. Leaving this note will discard them.', 'Discard changes');
}

async function openNote(id) {
  if (state.busy || state.current?.note_id === id || !await mayLeave()) return;
  await run(async () => select(await api(encodeURIComponent(id))));
}

async function newNote() {
  if (state.busy || !await mayLeave()) return;
  select({ note_id: null, title: '', content: '', created_at: null, updated_at: null });
  $('title').focus();
}

async function fetchPage(offset = state.offset) {
  let notes;
  do {
    notes = await api(`?skip=${offset}&limit=${PAGE_SIZE + 1}`);
    if (notes.length || offset === 0) break;
    offset = Math.max(0, offset - PAGE_SIZE);
  } while (true);
  state.offset = offset;
  state.more = notes.length > PAGE_SIZE;
  state.notes = notes.slice(0, PAGE_SIZE);
  renderList();
}

async function loadNotes(offset = state.offset) {
  await run(async () => {
    await fetchPage(offset);
    if (!state.current && state.notes.length) select(await api(encodeURIComponent(state.notes[0].note_id)));
  });
}

async function saveNote() {
  if (!state.current || state.busy) return;
  const title = $('title').value.trim();
  const content = $('editor').value;
  if (!title) { notice('Give your note a title before saving.'); $('title').focus(); return; }
  if (state.notes.some((note) => note.title === title && note.note_id !== state.current.note_id)) {
    notice('A note with this title already exists. Choose a unique title.');
    $('title').focus();
    return;
  }

  await run(async () => {
    const isNew = state.current.note_id === null;
    const changes = isNew ? { title, content } : {};
    if (title !== state.current.title) changes.title = title;
    if (content !== state.current.content) changes.content = content;
    if (!isNew && !Object.keys(changes).length) { $('title').value = title; return; }
    const note = await api(isNew ? '' : encodeURIComponent(state.current.note_id), isNew ? 'POST' : 'PATCH', changes);
    const index = state.notes.findIndex((item) => item.note_id === note.note_id);
    if (index >= 0) state.notes[index] = note;
    select(note);
    $('notice').hidden = true;
    await fetchPage();
  });
}

async function deleteNote() {
  if (state.busy || state.current?.note_id == null) return;
  if (!await confirmAction('Delete this note?', `“${state.current.title}” will be permanently deleted. This cannot be undone.`, 'Delete note')) return;
  await run(async () => {
    await api(encodeURIComponent(state.current.note_id), 'DELETE');
    state.notes = state.notes.filter((note) => note.note_id !== state.current.note_id);
    select(null);
    await fetchPage();
    if (state.notes.length) select(await api(encodeURIComponent(state.notes[0].note_id)));
  });
}

$('new-note').addEventListener('click', newNote);
$('empty-new').addEventListener('click', newNote);
$('save').addEventListener('click', saveNote);
$('delete-note').addEventListener('click', deleteNote);
$('title').addEventListener('input', updateControls);
$('editor').addEventListener('input', renderContent);
$('refresh').addEventListener('click', () => loadNotes());
$('previous-page').addEventListener('click', () => loadNotes(Math.max(0, state.offset - PAGE_SIZE)));
$('next-page').addEventListener('click', () => {
  if (state.more) loadNotes(state.offset + PAGE_SIZE);
});
$('dismiss-notice').addEventListener('click', () => { $('notice').hidden = true; });

document.querySelectorAll('[data-view]').forEach((button) => {
  if (button.tagName !== 'BUTTON') return;
  button.addEventListener('click', () => {
    document.querySelector('.workspace').dataset.view = button.dataset.view;
    document.querySelectorAll('button[data-view]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
  });
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (!$('confirm-dialog').open) saveNote();
  }
});

$('editor').addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    $('editor').setRangeText('  ', $('editor').selectionStart, $('editor').selectionEnd, 'end');
    renderContent();
  }
});

window.addEventListener('beforeunload', (event) => {
  if (dirty()) { event.preventDefault(); event.returnValue = ''; }
});

initializeMarkdown().then(renderContent).catch((error) => notice(error.message));
select(null);
loadNotes(0);
