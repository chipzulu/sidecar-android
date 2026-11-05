const WINDOWS_1252_LABELS = new Set([
  "ansi",
  "cp1252",
  "iso-8859-1",
  "latin1",
  "us-ascii",
  "windows-1252"
]);

function declaredCharset(bytes) {
  const probe = new TextDecoder("windows-1252").decode(bytes.slice(0, 8192));
  const match = probe.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
  return match?.[1]?.toLowerCase() || "";
}

export function decodeHtmlBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.slice(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = bytes.slice(2);
    for (let index = 0; index + 1 < swapped.length; index += 2) {
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }

  const charset = declaredCharset(bytes);
  if (WINDOWS_1252_LABELS.has(charset)) {
    return new TextDecoder("windows-1252").decode(bytes);
  }
  if (charset) {
    try {
      const requireValidUtf8 = /^(?:utf-8|utf8)$/.test(charset);
      return new TextDecoder(charset, { fatal: requireValidUtf8 }).decode(bytes);
    } catch {
      // Unknown declarations fall through to safe automatic detection.
    }
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function readHtmlFile(file) {
  return decodeHtmlBytes(await file.arrayBuffer());
}
