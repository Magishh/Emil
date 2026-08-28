// Perchance AI Image Generator Utilities & AI Studio (Gemini) Prompt Expander

export interface PerchanceImageOptions {
  aspectRatio?: '1:1' | '16:9' | '3:4' | '9:16' | '4:3';
  stylePreset?: string;
  negativePrompt?: string;
  characterName?: string;
  className?: string;
  race?: string;
  seed?: number;
  expandWithGemini?: boolean;
}

export interface PerchanceImageResult {
  imageUrl: string;
  source: string;
  modelUsed?: string;
  detailedPrompt?: string;
  originalInput?: string;
  wasExpanded?: boolean;
  expansionSource?: string;
  perchanceApiUrl?: string;
  seed?: number;
  isGenerated: boolean;
}

export interface ExpandedPromptResult {
  userInput: string;
  expandedPrompt: string;
  negativePrompt?: string;
  styleKeywords?: string[];
  previewTitle?: string;
  source?: string;
}

/**
 * Uses Gemini (AI Studio) to expand a short user request (e.g., "a retro robot")
 * into a rich, detailed visual prompt for the Perchance AI image generator API.
 */
export async function expandPromptWithGemini(
  userInput: string,
  options: {
    stylePreset?: string;
    aspectRatio?: string;
  } = {}
): Promise<ExpandedPromptResult> {
  const cleanInput = userInput.trim();
  if (!cleanInput) {
    return {
      userInput: '',
      expandedPrompt: '',
    };
  }

  try {
    const res = await fetch('/api/perchance/expand-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: cleanInput,
        stylePreset: options.stylePreset || 'cinematic-fantasy',
        aspectRatio: options.aspectRatio || '1:1',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.expandedPrompt) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Gemini prompt expansion API error, using procedural fallback:', err);
  }

  // Fallback procedural expansion
  const styleText =
    options.stylePreset === 'retro-synthwave'
      ? '1980s synthwave retro style, neon magenta and cyan lighting, scanlines, chrome reflections'
      : options.stylePreset === 'dark-gothic'
      ? 'Dark gothic oil painting, moody chiaroscuro lighting, weathered texture, grimdark atmosphere'
      : 'Masterpiece high fantasy concept art, dramatic rim lighting, cinematic volumetric atmosphere, intricate details, 8k resolution';

  return {
    userInput: cleanInput,
    expandedPrompt: `${cleanInput}, ${styleText}, hyper-detailed, sharp focus, octane render`,
    negativePrompt: 'blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark',
    styleKeywords: ['detailed', 'cinematic', 'atmospheric'],
    previewTitle: cleanInput,
    source: 'Local Expander',
  };
}

/**
 * Computes a unique, deterministic integer seed based on an item's unique characteristics.
 * Ensures the exact same item consistently generates the exact same fixed Perchance image.
 */
export function getItemDeterministicSeed(item: { name?: string; type?: string; rarity?: string; description?: string; id?: string }): number {
  const identifier = `${(item.name || 'item').toLowerCase().trim()}_${item.type || 'misc'}_${item.rarity || 'common'}`;
  let hash = 5381;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) + hash) + identifier.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 89999999 + 10000000;
}

/**
 * Builds an evocative, hyper-detailed prompt specifically engineered for the Perchance AI image generator
 * to render high-fantasy inventory items, weapons, magical relics, armor, scrolls, and potions.
 */
export function buildPerchanceItemPrompt(item: {
  name?: string;
  type?: string;
  rarity?: string;
  description?: string;
  damage?: string;
  bonus?: string;
  acBonus?: number;
}): string {
  const name = item.name || 'Mystical Relic';
  const type = (item.type || 'misc').toLowerCase();
  const rarity = item.rarity || 'magical';
  const desc = item.description || '';
  const text = `${name} ${desc} ${item.damage || ''}`.toLowerCase();

  let context = '';
  if (type === 'weapon' || text.includes('sword') || text.includes('blade') || text.includes('dagger') || text.includes('axe') || text.includes('bow') || text.includes('staff') || text.includes('hammer') || text.includes('spear')) {
    if (text.includes('dagger') || text.includes('stiletto') || text.includes('knife')) {
      context = `ornate fantasy assassin dagger, razor-sharp engraved blade, gilded crossguard, isolated on dark obsidian pedestal`;
    } else if (text.includes('axe') || text.includes('greataxe') || text.includes('cleaver')) {
      context = `brutal fantasy battleaxe, heavy double-edged bearded steel blade with glowing etched runes, dark pedestal`;
    } else if (text.includes('bow') || text.includes('quiver') || text.includes('arrow')) {
      context = `elven recurve bow with intricate carved wood and golden leaf filigree, glowing string, dark studio pedestal`;
    } else if (text.includes('staff') || text.includes('wand') || text.includes('rod')) {
      context = `mystical wizard staff topped with floating glowing arcane crystal, swirling magical aura, studio pedestal`;
    } else if (text.includes('rapier') || text.includes('scimitar')) {
      context = `mastercrafted fantasy rapier sword, curved engraved blade, intricate basket hilt, dark obsidian pedestal`;
    } else {
      context = `mastercrafted legendary fantasy longsword, razor-sharp glowing steel blade, inscribed runes, dark obsidian pedestal`;
    }
  } else if (type === 'armor' || text.includes('shield') || text.includes('plate') || text.includes('mail') || text.includes('leather') || text.includes('robe') || text.includes('goggles') || text.includes('veil')) {
    if (text.includes('shield')) {
      context = `ornate heraldic fantasy shield, reinforced steel and gold trim with mystical emblem, isolated on dark pedestal`;
    } else if (text.includes('robe') || text.includes('silk')) {
      context = `arcane enchanted mage robes with glowing woven glyphs and silver embroidery, dark pedestal`;
    } else {
      context = `mastercrafted fantasy armor gear, polished plates, gold filigree engravings, dark obsidian pedestal`;
    }
  } else if (type === 'potion' || text.includes('potion') || text.includes('elixir') || text.includes('draught') || text.includes('flask') || text.includes('vial')) {
    context = `enchanted alchemy potion flask, glowing luminous magical liquid, crystal glass vial with bronze filigree, floating bubbles, dark pedestal`;
  } else if (type === 'scroll' || text.includes('scroll') || text.includes('parchment') || text.includes('tome') || text.includes('grimoire')) {
    context = `ancient rolled spell scroll parchment, glowing arcane runes, gold wax seal, magical light particles, dark stone pedestal`;
  } else if (type === 'quest' || text.includes('relic') || text.includes('sunstone') || text.includes('talisman') || text.includes('compass') || text.includes('scarab') || text.includes('amulet') || text.includes('key')) {
    context = `sacred legendary quest artifact, glowing eldritch aura, ancient divine talisman, intricate gold inlays, dark pedestal`;
  } else {
    context = `intricate fantasy adventurer gear, magical talisman, detailed craftsmanship, atmospheric lighting, dark pedestal`;
  }

  const prompt = `Masterpiece fantasy concept art: ${name}, a ${rarity} item. ${desc ? `${desc}. ` : ''}${context}, sharp focus, octane render, 8k resolution, volumetric rim lighting.`;
  return prompt.replace(/["'{}\[\]\\\/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

/**
 * Generates a unique, permanent, and fixed Perchance AI image URL for any inventory item.
 */
export function getFixedPerchanceItemImageUrl(item: {
  name?: string;
  type?: string;
  rarity?: string;
  description?: string;
  damage?: string;
  bonus?: string;
  acBonus?: number;
  id?: string;
}): string {
  const prompt = buildPerchanceItemPrompt(item);
  const seed = getItemDeterministicSeed(item);
  const negative = 'blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark, low resolution, human face, person';
  return `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(prompt)}&resolution=square&negativePrompt=${encodeURIComponent(negative)}&seed=${seed}`;
}

/**
 * True when an image URL is absent or is one of the flat procedural SVG
 * placeholders, meaning the item still needs generated artwork.
 */
export function needsGeneratedSprite(imageUrl?: string): boolean {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) return true;
  return imageUrl.startsWith('data:image/svg+xml;base64,PHN2Zw');
}

/**
 * Guarantees an item carries generated Perchance artwork. Existing artwork is
 * kept, so hand-tuned prompts in the catalogues survive; anything missing gets
 * a deterministic sprite derived from the item's own fields, which means the
 * same item always resolves to the same image.
 */
export function ensureItemSprite<T extends { name?: string; type?: string; imageUrl?: string }>(
  item: T
): T {
  if (!item) return item;
  if (!needsGeneratedSprite(item.imageUrl)) return item;
  return { ...item, imageUrl: getFixedPerchanceItemImageUrl(item) };
}

export function ensureItemSprites<T extends { name?: string; type?: string; imageUrl?: string }>(
  items: T[] | undefined
): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(ensureItemSprite);
}

/**
 * Generate an image using Perchance AI Image Generator
 * Sends the detailed prompt to https://perchance.org/perchance-ai-api
 */
export async function generatePerchanceImage(
  promptOrUserInput: string,
  options: PerchanceImageOptions = {}
): Promise<PerchanceImageResult> {
  const dynamicSeed = options.seed || Math.floor(Math.random() * 90000000) + 10000000;
  
  // 1. Try server-side Perchance endpoint
  try {
    const res = await fetch('/api/perchance/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: promptOrUserInput,
        prompt: promptOrUserInput,
        expandWithGemini: options.expandWithGemini ?? true,
        aspectRatio: options.aspectRatio || '1:1',
        stylePreset: options.stylePreset || 'cinematic-fantasy',
        negativePrompt: options.negativePrompt,
        seed: dynamicSeed,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          source: data.source || 'https://perchance.org/perchance-ai-api',
          modelUsed: 'perchance-ai',
          detailedPrompt: data.detailedPrompt || promptOrUserInput,
          originalInput: data.originalInput || promptOrUserInput,
          wasExpanded: data.wasExpanded,
          expansionSource: data.expansionSource,
          perchanceApiUrl: data.perchanceApiUrl,
          seed: data.seed || dynamicSeed,
          isGenerated: true,
        };
      }
    }
  } catch (err) {
    console.warn('Server Perchance API route error, attempting direct fallback:', err);
  }

  // 2. Client-side browser direct Perchance URL / Fallback
  const cleanPrompt = promptOrUserInput.replace(/["'{}\[\]\\\/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  let shape = 'square';
  if (options.aspectRatio === '16:9' || options.aspectRatio === '4:3') {
    shape = 'landscape';
  } else if (options.aspectRatio === '3:4' || options.aspectRatio === '9:16') {
    shape = 'portrait';
  }

  const defaultNegative = options.negativePrompt || 'blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark';
  const directPerchanceUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=${shape}&negativePrompt=${encodeURIComponent(defaultNegative)}&seed=${dynamicSeed}`;

  return {
    imageUrl: directPerchanceUrl,
    source: 'https://perchance.org/perchance-ai-api',
    modelUsed: 'perchance-ai',
    detailedPrompt: cleanPrompt,
    originalInput: promptOrUserInput,
    perchanceApiUrl: directPerchanceUrl,
    seed: dynamicSeed,
    isGenerated: true,
  };
}

/**
 * Example simple requests tailored for Gemini expansion & Perchance generation
 */
export const PERCHANCE_SIMPLE_PROMPTS = [
  {
    id: 'retro-robot',
    title: 'A Retro Robot',
    simpleInput: 'a retro robot',
    expandedExample: 'A 1980s synthwave-style robot sitting in a neon-lit alleyway, hyper-detailed chrome plating, glowing cyan optics, vibrant nostalgic colors',
    stylePreset: 'retro-synthwave',
    aspectRatio: '1:1' as const,
  },
  {
    id: 'hero-paladin',
    title: 'Holy Paladin Hero',
    simpleInput: 'a holy paladin in sunlit golden armor',
    expandedExample: 'Masterpiece fantasy portrait of a radiant solar paladin wearing ornate gold filigree plate armor, holding a luminous dawnblade, volumetric sunbeams',
    stylePreset: 'cinematic-fantasy',
    aspectRatio: '1:1' as const,
  },
  {
    id: 'shadow-dungeon',
    title: 'Sunken Crypt Scenery',
    simpleInput: 'an ancient sunken crypt with glowing runes',
    expandedExample: 'Atmospheric subterranean crypt with submerged flagstones, glowing cyan arcane runes on stone pillars, flickering torchlight, mist, 16:9 panoramic concept art',
    stylePreset: 'dark-gothic',
    aspectRatio: '16:9' as const,
  },
  {
    id: 'cyber-dragon',
    title: 'Arcane Cyber Dragon',
    simpleInput: 'a cyber dragon with glowing obsidian scales',
    expandedExample: 'Epic dark fantasy cyber dragon with jagged obsidian scales, electric purple ley-line conduits, breathing plasma fire, dramatic cinematic composition',
    stylePreset: 'cinematic-fantasy',
    aspectRatio: '1:1' as const,
  },
  {
    id: 'cozy-tavern',
    title: 'Warm Tavern Scenery',
    simpleInput: 'a cozy fantasy tavern with a roaring fireplace',
    expandedExample: 'Cozy medieval tavern hearth with wooden tankards, warm golden candlelight, rustic stone walls, bard lutes hanging, welcoming fantasy atmosphere',
    stylePreset: 'oil-masterpiece',
    aspectRatio: '16:9' as const,
  },
];

/**
 * Standard preset prompts for backwards compatibility
 */
export const PERCHANCE_PROMPT_PRESETS = [
  {
    id: 'hero-portrait',
    title: 'Hero Portrait',
    prompt: 'Masterpiece fantasy digital painting of an armored hero, detailed face, dramatic rim lighting, sharp focus, 8k bust shot',
    aspectRatio: '1:1' as const,
  },
  {
    id: 'dungeon-scenery',
    title: 'Dungeon Scenery',
    prompt: 'Ancient sunken stone crypt glowing with mystical teal runes, crumbling arches, torchlight reflections, atmospheric fog, panoramic 16:9',
    aspectRatio: '16:9' as const,
  },
  {
    id: 'boss-monster',
    title: 'Boss Monster',
    prompt: 'Terrifying shadow dragon with glowing obsidian scales, crackling arcane breath, dark fantasy oil painting, epic composition',
    aspectRatio: '1:1' as const,
  },
  {
    id: 'magic-item',
    title: 'Artifact / Relic',
    prompt: 'Legendary glowing celestial broadsword embedded with luminous starfire gems, volumetric light beams, intricate gold filigree',
    aspectRatio: '1:1' as const,
  },
];
