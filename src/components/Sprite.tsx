import React from 'react';
import { InventoryItem } from '../types';
import { useSprite } from '../hooks/useSprite';

/**
 * Artwork for an inventory item. Generation happens automatically the first
 * time the item is shown; until it arrives the procedural art stands in.
 */
export const ItemSprite: React.FC<{
  item: Partial<InventoryItem>;
  className?: string;
  alt?: string;
}> = ({ item, className, alt }) => {
  const { src, onError } = useSprite('item', item, item.imageUrl);
  return (
    <img
      src={src}
      onError={onError}
      alt={alt ?? item.name ?? 'Item'}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
    />
  );
};

/** Artwork for a hero portrait, generated on the same pipeline as items. */
export const PortraitSprite: React.FC<{
  character: { name?: string; race?: string; className?: string; portraitUrl?: string; portraitPrompt?: string };
  className?: string;
  alt?: string;
}> = ({ character, className, alt }) => {
  const { src, onError } = useSprite('portrait', character, character.portraitUrl);
  return (
    <img
      src={src}
      onError={onError}
      alt={alt ?? character.name ?? 'Hero'}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
};

/** Artwork for a location, generated on the same pipeline as items. */
export const SceneryImage: React.FC<{
  location: { name?: string; atmosphere?: string; sceneryPrompt?: string; sceneryImageUrl?: string };
  className?: string;
  alt?: string;
}> = ({ location, className, alt }) => {
  const { src, onError } = useSprite('scenery', location, location.sceneryImageUrl);
  return (
    <img
      src={src}
      onError={onError}
      alt={alt ?? location.name ?? 'Location'}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
};
