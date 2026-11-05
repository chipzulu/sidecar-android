// Paired single equals signs are manuscript markup. Double equals and an
// unmatched final marker stay literal. Pairing never crosses a scene boundary.
export function markerPairs(text, start = 0, end = text.length) {
  const positions = [];
  for (let i = start; i < end; i++) {
    if (text[i] === '=' && text[i - 1] !== '=' && text[i + 1] !== '=') positions.push(i);
  }
  const pairs = [];
  for (let i = 0; i + 1 < positions.length; i += 2) {
    if (text.slice(positions[i] + 1, positions[i + 1]).trim()) pairs.push([positions[i], positions[i + 1]]);
  }
  return pairs;
}

export function firstItalicConversion(root, start = 0, end = Infinity) {
  const text = root.textContent || '';
  const pairs = markerPairs(text).filter(([left, right]) => left >= start && right < end);
  const firstMarker = pairs[0]?.[0] ?? Infinity;
  const allPairs = markerPairs(text);
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest('em, i, [style*="font-style: italic"], [style*="font-style:italic"]')) {
      for (let i = Math.max(start, offset); i < Math.min(end, offset + node.length); i++) {
        if (/\S/.test(text[i]) && !allPairs.some(([left, right]) => i >= left && i <= right)) {
          return i < firstMarker ? 'encode' : 'decode';
        }
      }
    }
    offset += node.length;
  }
  return Number.isFinite(firstMarker) ? 'decode' : null;
}

export function convertItalicMarkers(root, mode, start = 0, end = Infinity) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4);
  const nodes = [];
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    nodes.push({ node, offset, italic: Boolean(node.parentElement.closest('em, i, [style*="font-style: italic"], [style*="font-style:italic"]')) });
    offset += node.data.length;
  }
  const text = nodes.map(item => item.node.data).join('');
  end = Math.min(end, text.length);
  const italic = Array(text.length).fill(false);
  const remove = new Set();
  const before = new Map();
  for (const item of nodes) for (let i = item.offset; i < item.offset + item.node.length; i++) italic[i] = item.italic;
  const pairs = markerPairs(text).filter(([left, right]) => left >= start && right < end);
  if (mode === 'decode' && !pairs.length) return root;
  if (mode === 'decode') {
    for (const [left, right] of pairs) {
      remove.add(left); remove.add(right);
      for (let i = left + 1; i < right; i++) italic[i] = true;
    }
  } else {
    const marked = new Set();
    for (const [left, right] of markerPairs(text)) for (let i = left; i <= right; i++) marked.add(i);
    if (!italic.some((value, i) => value && i >= start && i < end && !marked.has(i) && /\S/.test(text[i]))) return root;
    let inItalic = false;
    for (let i = start; i <= end; i++) {
      const encode = i < end && italic[i] && !marked.has(i);
      if (encode !== inItalic) before.set(i, '=');
      inItalic = encode;
      if (i < end && !marked.has(i)) italic[i] = false;
    }
  }
  // Rebuild only italic wrappers. Paragraphs, bold, indentation and quote
  // metadata stay in place, including outside a partial selection.
  for (const em of [...root.querySelectorAll('em, i, [style*="font-style: italic"], [style*="font-style:italic"]')]) em.replaceWith(...em.childNodes);
  for (const item of nodes) {
    const fragment = doc.createDocumentFragment();
    let buffer = '', state = null;
    const flush = () => {
      if (!buffer) return;
      const target = state ? doc.createElement('em') : fragment;
      target.append(doc.createTextNode(buffer));
      if (state) fragment.append(target);
      buffer = '';
    };
    for (let local = 0; local < item.node.length; local++) {
      const i = item.offset + local;
      if (before.has(i)) { flush(); fragment.append(doc.createTextNode(before.get(i))); }
      if (remove.has(i)) continue;
      if (state !== italic[i]) { flush(); state = italic[i]; }
      buffer += text[i];
    }
    flush();
    if (item === nodes.at(-1) && before.has(text.length)) fragment.append(doc.createTextNode('='));
    item.node.replaceWith(fragment);
  }
  return root;
}
