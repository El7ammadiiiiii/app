const FAVORITES_KEY = 'crypto-favorites';
const FAVORITES_EVENT = 'crypto-favorites-changed';

export function readFavoriteIds(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set<string>(parsed.map((v) => String(v)));
  } catch {
    return new Set<string>();
  }
}

export function writeFavoriteIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function toggleFavoriteId(id: string): boolean {
  const ids = readFavoriteIds();
  const key = String(id);
  if (ids.has(key)) {
    ids.delete(key);
    writeFavoriteIds(ids);
    return false;
  }
  ids.add(key);
  writeFavoriteIds(ids);
  return true;
}

export function isFavoriteId(id: string): boolean {
  return readFavoriteIds().has(String(id));
}

export function subscribeFavorites(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onChange();
  window.addEventListener('storage', handler);
  window.addEventListener(FAVORITES_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(FAVORITES_EVENT, handler);
  };
}
