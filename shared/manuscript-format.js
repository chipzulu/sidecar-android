export const MAXIMUM_BLOCK_INDENT = 10;

export function normalizeBlockIndent(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(MAXIMUM_BLOCK_INDENT, Math.max(0, parsed));
}

export function changedBlockIndent(value, change) {
  return normalizeBlockIndent(normalizeBlockIndent(value) + change);
}
