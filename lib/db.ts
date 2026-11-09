// Banco local do navegador (IndexedDB): mídias, posts e estilos criados pelo usuário.
import type { Media, Post, Style } from "./types";

type Stores = { media: Media; posts: Post; styles: Style };
type Name = keyof Stores;

let dbp: Promise<IDBDatabase> | null = null;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open("postai", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of ["media", "posts", "styles"]) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // pede ao navegador para não apagar os arquivos quando faltar espaço
    navigator.storage?.persist?.().catch(() => {});
  }
  return dbp;
}

function tx<T>(store: Name, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const db = {
  all: <N extends Name>(s: N) => tx<Stores[N][]>(s, "readonly", (o) => o.getAll()),
  get: <N extends Name>(s: N, id: string) => tx<Stores[N] | undefined>(s, "readonly", (o) => o.get(id)),
  put: <N extends Name>(s: N, v: Stores[N]) => tx(s, "readwrite", (o) => o.put(v)).then(() => { notify(); return v; }),
  del: (s: Name, id: string) => tx(s, "readwrite", (o) => o.delete(id)).then(notify),
};

// avisa as telas abertas que algo mudou
const listeners = new Set<() => void>();
function notify() { listeners.forEach((f) => f()); }
export function onChange(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
