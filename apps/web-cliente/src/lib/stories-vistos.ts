const STORAGE_KEY = "delivery.stories.vistos";

function lerVistos(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function marcarVisto(idStory: number) {
  const vistos = lerVistos();
  vistos.add(idStory);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...vistos]));
}

export function estaVisto(idStory: number): boolean {
  return lerVistos().has(idStory);
}
