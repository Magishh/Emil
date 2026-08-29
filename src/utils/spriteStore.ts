// ============================================================================
// Automatic artwork generation for items and hero portraits.
//
// A Perchance generator address is a web page, not an image endpoint, so using
// one directly as an <img src> never renders - which is why artwork previously
// only appeared after pressing "Generate Artwork". That button posts to our own
// server, which fetches the image and returns actual bytes.
//
// This store does that automatically: the first time a sprite is needed it is
// requested from the server, cached in IndexedDB (images are far too large for
// localStorage, which also holds the campaign saves), and every component
// showing that item re-renders when it arrives.
// ============================================================================

import { getFixedPerchanceItemImageUrl, buildPerchanceItemPrompt } from './perchanceAi';
import { generateItemThumbnailSvg, generateCharacterAvatarSvg } from './svgArt';

const DB_NAME = 'dnd_sprite_cache';
const DB_VERSION = 1;
const STORE = 'sprites';

/** Concurrent generations. Kept low so a full inventory does not stampede. */
const MAX_CONCURRENT = 2;

export type SpriteKind = 'item' | 'portrait';

export interface SpriteSubject {
  name?: string;
  type?: string;
  rarity?: string;
  description?: string;
  damage?: string;
  bonus?: string;
  acBonus?: number;
  /** Portraits only. */
  className?: string;
  race?: string;
  portraitPrompt?: string;
}

/**
 * A Perchance generator address is a placeholder, not usable artwork. Treat it
 * - and the flat procedural SVGs - as "still needs generating".
 */
export function isPlaceholderArtwork(url?: string): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  if (url.startsWith('data:image/svg+xml')) return true;
  if (url.includes('perchance.org/perchance-ai-api')) return true;
  return false;
}

/** Stable identity for a subject, so the same item always reuses its artwork. */
export function spriteKey(kind: SpriteKind, subject: SpriteSubject): string {
  if (kind === 'portrait') {
    return [
      'portrait',
      (subject.name || 'hero').toLowerCase().trim(),
      (subject.race || '').toLowerCase().trim(),
      (subject.className || '').toLowerCase().trim(),
    ].join('|');
  }
  return [
    'item',
    (subject.name || 'item').toLowerCase().trim(),
    (subject.type || 'misc').toLowerCase().trim(),
    (subject.rarity || 'common').toLowerCase().trim(),
  ].join('|');
}

// --------------------------------------------------------------------------
// IndexedDB persistence
// --------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function dbGetAll(): Promise<Record<string, string>> {
  const db = await openDb();
  if (!db) return {};
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        const out: Record<string, string> = {};
        (keysReq.result || []).forEach((k, i) => {
          const v = (valsReq.result || [])[i];
          if (typeof k === 'string' && typeof v === 'string') out[k] = v;
        });
        resolve(out);
      };
      tx.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

async function dbPut(key: string, value: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
  } catch {
    // Quota or private-mode failures are non-fatal: the in-memory cache still
    // serves this session.
  }
}

async function dbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
  } catch {
    // Ignore
  }
}

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------

class SpriteStore {
  private memory = new Map<string, string>();
  private inFlight = new Set<string>();
  private failed = new Set<string>();
  private queue: { key: string; kind: SpriteKind; subject: SpriteSubject }[] = [];
  private active = 0;
  private listeners = new Set<() => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  /** Load previously generated artwork so it appears instantly on reload. */
  public hydrate(): Promise<void> {
    if (this.hydrated) return Promise.resolve();
    if (this.hydrating) return this.hydrating;
    this.hydrating = dbGetAll().then((entries) => {
      Object.entries(entries).forEach(([k, v]) => this.memory.set(k, v));
      this.hydrated = true;
      this.notify();
    });
    return this.hydrating;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // A failing subscriber must not stall the queue.
      }
    });
  }

  public get(key: string): string | undefined {
    return this.memory.get(key);
  }

  public hasFailed(key: string): boolean {
    return this.failed.has(key);
  }

  /**
   * Called when artwork we handed out turns out not to load. Drops it so the
   * caller falls back to the procedural art, without re-queueing forever.
   */
  public markBroken(key: string) {
    this.memory.delete(key);
    this.failed.add(key);
    void dbDelete(key);
    this.notify();
  }

  /** Queue generation for a subject unless it is cached, running or failed. */
  public request(kind: SpriteKind, subject: SpriteSubject) {
    // Wait for the cache to load before deciding, otherwise a request made on
    // first paint races hydration and regenerates artwork we already had.
    if (!this.hydrated) {
      void this.hydrate().then(() => this.enqueue(kind, subject));
      return;
    }
    this.enqueue(kind, subject);
  }

  private enqueue(kind: SpriteKind, subject: SpriteSubject) {
    const key = spriteKey(kind, subject);
    if (this.memory.has(key) || this.inFlight.has(key) || this.failed.has(key)) return;
    if (this.queue.some((q) => q.key === key)) return;

    this.queue.push({ key, kind, subject });
    this.pump();
  }

  private pump() {
    while (this.active < MAX_CONCURRENT && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.active++;
      this.inFlight.add(job.key);
      void this.generate(job.key, job.kind, job.subject).finally(() => {
        this.active--;
        this.inFlight.delete(job.key);
        this.pump();
      });
    }
  }

  private async generate(key: string, kind: SpriteKind, subject: SpriteSubject) {
    const prompt =
      kind === 'portrait'
        ? subject.portraitPrompt ||
          `Masterpiece high fantasy character portrait of ${subject.name || 'a hero'}, ` +
            `a ${subject.race || 'human'} ${subject.className || 'adventurer'}, ` +
            `dramatic rim lighting, centered bust shot, detailed concept art`
        : buildPerchanceItemPrompt(subject);

    try {
      const res = await fetch('/api/perchance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          expandWithGemini: false,
          aspectRatio: '1:1',
          stylePreset: 'cinematic-fantasy',
          // Sprites are shown small; keeping them small keeps the cache light.
          width: kind === 'portrait' ? 384 : 256,
          height: kind === 'portrait' ? 384 : 256,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!res.ok) throw new Error(`sprite endpoint returned ${res.status}`);
      const data = await res.json();
      const url: string | undefined = data.imageUrl;

      // Only real image bytes are usable. A generator address handed back as a
      // last-resort fallback would never render, so treat that as a failure.
      if (!url || !url.startsWith('data:image/')) {
        throw new Error('no image data returned');
      }

      this.memory.set(key, url);
      void dbPut(key, url);
      this.notify();
    } catch {
      // Give up on this subject for the session; the procedural art stands in.
      this.failed.add(key);
      this.notify();
    }
  }
}

export const spriteStore = new SpriteStore();

/** Procedural stand-in shown until generated artwork arrives. */
export function placeholderArtwork(kind: SpriteKind, subject: SpriteSubject): string {
  return kind === 'portrait'
    ? generateCharacterAvatarSvg({
        name: subject.name,
        className: subject.className,
        race: subject.race,
      })
    : generateItemThumbnailSvg({
        name: subject.name,
        type: subject.type,
        description: subject.description,
        damage: subject.damage,
      });
}

/** The Perchance generator address for this subject, for display/debugging. */
export function perchanceSourceUrl(subject: SpriteSubject): string {
  return getFixedPerchanceItemImageUrl(subject);
}
