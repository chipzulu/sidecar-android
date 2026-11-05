// Normalize clock punctuation only; ordinary subtitle punctuation is untouched.
export function normalizeClockName(value, { filesystem = false } = {}) {
  return String(value || "").replace(/(\d)[:：]\s*(?=\d)/g, `$1${filesystem ? "：" : ":"}`);
}
