const STORAGE_KEY = "tickerrank_recent_symbols";
const MAX_ITEMS = 12;

export function recordRecentSymbol(symbol: string): void {
  if (typeof window === "undefined") return;
  const key = symbol.trim().toUpperCase();
  if (!key) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const prev: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(prev)
      ? prev.filter((x): x is string => typeof x === "string")
      : [];
    const next = [key, ...list.filter((s) => s !== key)].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / parse errors */
  }
}

export function readRecentSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}
