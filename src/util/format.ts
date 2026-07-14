// Compact number formatting for big idle-game values.
// 1 -> "1", 1234 -> "1.23K", 5_700_000 -> "5.70M", etc.

const SUFFIXES = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
];

export function formatTreats(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n < 1000) {
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  }
  const tier = Math.min(
    SUFFIXES.length - 1,
    Math.floor(Math.log10(n) / 3),
  );
  const scaled = n / Math.pow(10, tier * 3);
  return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
