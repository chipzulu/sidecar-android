import {sceneFragmentFromHtml, serializeScene, htmlForPlainTextPaste} from './shared/html-format.js';

const dialog = document.getElementById('writing-page');
const prose = document.getElementById('writing-prose');
const status = document.getElementById('draft-status');
let current = null;
let composing = false;
let dirty = false;
let lastBlock = 0;

function draftKey(book, scene) {
  return 'sidecar-draft:' + JSON.stringify([book.repository.toLowerCase(), book.branch, scene.path]);
}

export function readDraft(book, scene) {
  return JSON.parse(localStorage.getItem(draftKey(book, scene)));
}

function save() {
  if (!current || !dirty || composing) return;
  try {
    const html = serializeScene(prose);
    localStorage.setItem(current.key, JSON.stringify({html, base: current.base}));
    current.scene.html = html;
    dirty = false;
    status.textContent = 'Draft saved on this tablet';
  } catch {
    status.textContent = 'Could not save on this tablet. Copy your text before leaving.';
  }
}

export function writeScene(book, scene, blockIndex, finished) {
  const previous = readDraft(book, scene);
  current = {key: draftKey(book, scene), scene, base: previous?.base || scene.sha, finished};
  dirty = composing = false;
  prose.replaceChildren(sceneFragmentFromHtml(scene.html));
  document.getElementById('draft-title').textContent = scene.name;
  status.textContent = previous?.base && previous.base !== scene.sha
    ? 'Local draft · the downloaded scene has changed'
    : previous ? 'Draft saved on this tablet' : 'Local draft';
  dialog.showModal();
  prose.focus({preventScroll: true});
  lastBlock = Math.min(blockIndex, prose.children.length - 1);
  const block = prose.children[lastBlock];
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(true);
  const selection = getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  block.scrollIntoView({block:'nearest'});
}

document.addEventListener('selectionchange', () => {
  if (!current) return;
  let node = getSelection()?.focusNode;
  while (node && node.parentNode !== prose) node = node.parentNode;
  if (node) lastBlock = Array.prototype.indexOf.call(prose.children, node);
});
prose.addEventListener('compositionstart', () => { composing = true; });
prose.addEventListener('compositionend', () => { composing = false; dirty = true; save(); });
prose.addEventListener('input', () => { dirty = true; save(); });
prose.addEventListener('paste', event => {
  event.preventDefault();
  document.execCommand('insertHTML', false, htmlForPlainTextPaste(event.clipboardData.getData('text/plain')));
});
function done() {
  prose.blur();
  if (composing) { status.textContent = 'Finish the current word to return to reading'; return; }
  save();
  if (dirty) return;
  const {finished} = current;
  current = null;
  dialog.close();
  finished(lastBlock);
}
document.getElementById('finish-draft').onclick = done;
dialog.oncancel = event => { event.preventDefault(); done(); };
