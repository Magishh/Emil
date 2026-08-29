import { useEffect, useReducer } from 'react';
import {
  spriteStore,
  spriteKey,
  placeholderArtwork,
  isPlaceholderArtwork,
  SpriteKind,
  SpriteSubject,
} from '../utils/spriteStore';

/**
 * Resolves the artwork to show for an item or hero, generating it in the
 * background the first time it is needed.
 *
 * Returns the artwork URL plus an onError handler: if generated art ever fails
 * to load it is dropped from the cache and the procedural stand-in takes over,
 * rather than leaving a broken image.
 */
export function useSprite(
  kind: SpriteKind,
  subject: SpriteSubject | null | undefined,
  existingUrl?: string
): { src: string; onError: () => void; isGenerated: boolean } {
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const unsub = spriteStore.subscribe(bump);
    void spriteStore.hydrate();
    return () => unsub();
  }, []);

  const key = subject ? spriteKey(kind, subject) : '';

  useEffect(() => {
    if (!subject || !key) return;
    // Artwork already attached to the record (a generated data URL, or one the
    // player applied from the studio) wins - nothing to generate.
    if (!isPlaceholderArtwork(existingUrl)) return;
    spriteStore.request(kind, subject);
  }, [kind, key, existingUrl, subject]);

  if (!subject) return { src: '', onError: () => {}, isGenerated: false };

  if (!isPlaceholderArtwork(existingUrl)) {
    return { src: existingUrl as string, onError: () => {}, isGenerated: true };
  }

  const generated = spriteStore.get(key);
  if (generated) {
    return {
      src: generated,
      onError: () => spriteStore.markBroken(key),
      isGenerated: true,
    };
  }

  return {
    src: placeholderArtwork(kind, subject),
    onError: () => {},
    isGenerated: false,
  };
}
