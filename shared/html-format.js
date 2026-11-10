import { keepMarker } from './keep-together.js';
import { normalizeBlockIndent } from "./manuscript-format.js";

const DANGEROUS_ELEMENTS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "LINK",
  "META",
  "BASE",
  "IMG",
  "SVG",
  "MATH",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
  "TEMPLATE"
]);

const PARAGRAPH_ELEMENTS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6"]);
const INLINE_ELEMENTS = new Set(["EM", "I", "STRONG", "B", "BR"]);
const CLIPBOARD_BLOCK_ELEMENTS = new Set([
  ...PARAGRAPH_ELEMENTS,
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "FOOTER",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "PRE",
  "SECTION",
  "TABLE",
  "TR",
  "UL"
]);

function cleanInline(source, targetDocument, keepAnnotations) {
  if (source.nodeType === Node.TEXT_NODE) {
    return targetDocument.createTextNode(source.nodeValue || "");
  }

  if (source.nodeType !== Node.ELEMENT_NODE || DANGEROUS_ELEMENTS.has(source.tagName)) {
    return null;
  }

  if (source.tagName === "BR") return targetDocument.createElement("br");

  const styledItalic = source.tagName === "SPAN" && /italic/i.test(source.style?.fontStyle || "");
  const annotation = keepAnnotations && source.tagName === 'MARK' && /^[a-f0-9-]{36}$/.test(source.dataset.annotation || '');
  const fragmentOrElement = annotation ? targetDocument.createElement('mark') : INLINE_ELEMENTS.has(source.tagName) || styledItalic
    ? targetDocument.createElement(styledItalic || source.tagName === "I" ? "em" : source.tagName === "B" ? "strong" : source.tagName.toLowerCase())
    : targetDocument.createDocumentFragment();

  if (annotation) fragmentOrElement.dataset.annotation = source.dataset.annotation;
  for (const child of source.childNodes) {
    const cleanChild = cleanInline(child, targetDocument, keepAnnotations);
    if (cleanChild) fragmentOrElement.append(cleanChild);
  }
  return fragmentOrElement;
}

function paragraphFrom(source, targetDocument, keepAnnotations) {
  const paragraph = targetDocument.createElement("p");
  const indent = normalizeBlockIndent(source.getAttribute?.("data-indent"));
  if (indent) paragraph.dataset.indent = String(indent);
  const quoteGroup = source.getAttribute?.("data-quote-group");
  if (/^[1-9]\d*$/.test(quoteGroup || "")) paragraph.dataset.quoteGroup = quoteGroup;
  for (const child of source.childNodes) {
    const cleanChild = cleanInline(child, targetDocument, keepAnnotations);
    if (cleanChild) paragraph.append(cleanChild);
  }
  if (!paragraph.textContent && !paragraph.querySelector("br")) {
    paragraph.append(targetDocument.createElement("br"));
  }
  return paragraph;
}

function blockquoteFrom(source, targetDocument, keepAnnotations) {
  const quote = targetDocument.createElement("blockquote");
  let hasParagraph = false;

  for (const child of source.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && PARAGRAPH_ELEMENTS.has(child.tagName)) {
      quote.append(paragraphFrom(child, targetDocument, keepAnnotations));
      hasParagraph = true;
    }
  }

  if (!hasParagraph) quote.append(paragraphFrom(source, targetDocument, keepAnnotations));
  return quote;
}

function appendRootNode(source, destination, targetDocument, keepAnnotations) {
  if (source.nodeType === Node.TEXT_NODE) {
    if (!source.nodeValue?.trim()) return;
    const paragraph = targetDocument.createElement("p");
    paragraph.append(targetDocument.createTextNode(source.nodeValue));
    destination.append(paragraph);
    return;
  }

  if (source.nodeType !== Node.ELEMENT_NODE || DANGEROUS_ELEMENTS.has(source.tagName)) return;
  if (source.hasAttribute("data-sidecar-chrome")) return;

  if (PARAGRAPH_ELEMENTS.has(source.tagName)) {
    destination.append(paragraphFrom(source, targetDocument, keepAnnotations));
    return;
  }

  if (source.tagName === "BLOCKQUOTE") {
    destination.append(blockquoteFrom(source, targetDocument, keepAnnotations));
    return;
  }

  if (source.tagName === "HR") {
    destination.append(targetDocument.createElement("hr"));
    return;
  }

  if (INLINE_ELEMENTS.has(source.tagName)) {
    const paragraph = targetDocument.createElement("p");
    const cleanChild = cleanInline(source, targetDocument, keepAnnotations);
    if (cleanChild) paragraph.append(cleanChild);
    destination.append(paragraph);
    return;
  }

  for (const child of source.childNodes) appendRootNode(child, destination, targetDocument, keepAnnotations);
}

export function sceneFragmentFromHtml(html, targetDocument = document, keepAnnotations = false) {
  const parsed = new DOMParser().parseFromString(html || "", "text/html");
  const fragment = targetDocument.createDocumentFragment();
  for (const child of parsed.body.childNodes) appendRootNode(child, fragment, targetDocument, keepAnnotations);
  if (!fragment.childNodes.length) {
    const paragraph = targetDocument.createElement("p");
    paragraph.append(targetDocument.createElement("br"));
    fragment.append(paragraph);
  }
  return fragment;
}

export function serializeScene(editor) {
  const holder = document.createElement("div");
  holder.append(sceneFragmentFromHtml(editor.innerHTML, document));
  return `${[...holder.children].map((element) => element.outerHTML).join("\n")}\n`;
}

export function countWords(text) {
  const trimmed = text.replace(/\u00a0/g, " ").trim();
  return trimmed ? trimmed.split(/[\s\u2013\u2014]+/u).filter(Boolean).length : 0;
}

export function manuscriptTextForWordCount(editor) {
  const copy = editor.cloneNode(true);
  for (const chrome of copy.querySelectorAll("[data-sidecar-chrome], button")) chrome.remove();
  for (const p of copy.querySelectorAll('p,div')) if (!p.querySelector('p,div') && keepMarker(p.textContent)) p.remove();
  // textContent alone joins words across paragraph and soft-break boundaries.
  // Insert separators only at block boundaries, never within inline emphasis.
  for (const block of copy.querySelectorAll("p, div, br, blockquote, li, h1, h2, h3, h4, h5, h6, hr")) {
    block.after(copy.ownerDocument.createTextNode("\n"));
  }
  return copy.textContent || "";
}

export async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function htmlForPlainTextPaste(text) {
  const escaped = text
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>") || "<br>"}</p>`)
    .join("");
}

export function plainTextFromClipboardTree(root) {
  let output = "";

  function addBreak(count) {
    output = output.replace(/[ \t]+$/g, "");
    if (!output) return;
    const existing = output.match(/\n+$/)?.[0].length || 0;
    if (existing < count) output += "\n".repeat(count - existing);
  }

  function visit(node) {
    if (node.nodeType === 3) {
      const value = String(node.nodeValue || "").replace(/\u00a0/g, " ");
      if (/^\s+$/.test(value) && /[\r\n]/.test(value)) return;
      output += value;
      return;
    }
    if (node.nodeType !== 1) return;

    const tagName = String(node.tagName || "").toUpperCase();
    if (DANGEROUS_ELEMENTS.has(tagName)) return;
    if (tagName === "BR") {
      addBreak(1);
      return;
    }
    if (tagName === "HR") {
      addBreak(2);
      output += "* * *";
      addBreak(2);
      return;
    }

    for (const child of node.childNodes || []) visit(child);
    if (CLIPBOARD_BLOCK_ELEMENTS.has(tagName)) addBreak(tagName === "LI" ? 1 : 2);
  }

  for (const child of root?.childNodes || []) visit(child);
  return output
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextFromClipboardHtml(html) {
  if (!html) return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return plainTextFromClipboardTree(parsed.body);
}

function escapeClipboardText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeInlineClipboardHtml(node) {
  if (node.nodeType === 3) return escapeClipboardText(node.nodeValue);
  if (node.nodeType !== 1) return "";

  const tagName = String(node.tagName || "").toUpperCase();
  if (DANGEROUS_ELEMENTS.has(tagName)) return "";
  if (tagName === "BR") return "<br>";

  const contents = [...(node.childNodes || [])].map(safeInlineClipboardHtml).join("");
  if (tagName === "EM" || tagName === "I" || (tagName === "SPAN" && /italic/i.test(node.style?.fontStyle || ""))) return `<em>${contents}</em>`;
  if (tagName === "STRONG" || tagName === "B") return `<strong>${contents}</strong>`;
  return contents;
}

function hasClipboardBlockDescendant(node) {
  for (const child of node.childNodes || []) {
    if (child.nodeType !== 1) continue;
    const tagName = String(child.tagName || "").toUpperCase();
    if (CLIPBOARD_BLOCK_ELEMENTS.has(tagName) || hasClipboardBlockDescendant(child)) return true;
  }
  return false;
}

function clipboardNodeHasContent(node) {
  if (node.nodeType === 3) return Boolean(String(node.nodeValue || "").trim());
  if (node.nodeType !== 1 || DANGEROUS_ELEMENTS.has(String(node.tagName || "").toUpperCase())) return false;
  if (String(node.tagName || "").toUpperCase() === "BR") return true;
  return [...(node.childNodes || [])].some(clipboardNodeHasContent);
}

function safeClipboardBlockHtml(node) {
  if (node.nodeType === 3) {
    return clipboardNodeHasContent(node) ? `<p>${safeInlineClipboardHtml(node)}</p>` : "";
  }
  if (node.nodeType !== 1) return "";

  const tagName = String(node.tagName || "").toUpperCase();
  if (DANGEROUS_ELEMENTS.has(tagName)) return "";
  if (tagName === "HR") return "<hr>";

  if (tagName === "BLOCKQUOTE") {
    const contents = hasClipboardBlockDescendant(node)
      ? [...(node.childNodes || [])].map(safeClipboardBlockHtml).join("")
      : `<p>${safeInlineClipboardHtml(node) || "<br>"}</p>`;
    return `<blockquote>${contents}</blockquote>`;
  }

  if (hasClipboardBlockDescendant(node)) {
    return [...(node.childNodes || [])].map(safeClipboardBlockHtml).join("");
  }
  if (!clipboardNodeHasContent(node)) return "";
  return `<p>${safeInlineClipboardHtml(node) || "<br>"}</p>`;
}

export function safeHtmlFromClipboardTree(root) {
  if (!root) return "";
  if (!hasClipboardBlockDescendant(root)) {
    return clipboardNodeHasContent(root) ? `<p>${safeInlineClipboardHtml(root) || "<br>"}</p>` : "";
  }
  return [...(root.childNodes || [])].map(safeClipboardBlockHtml).join("");
}

export function htmlForRichClipboardPaste(html) {
  if (!html) return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return safeHtmlFromClipboardTree(parsed.body);
}
