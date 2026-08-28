/**
 * Curated high-res fantasy character portrait presets and procedural portrait generators.
 * Ensures the character generator always works smoothly even if API keys or rate limits occur.
 */

export interface PortraitPreset {
  id: string;
  name: string;
  className: string;
  race: string;
  url: string;
  tags: string[];
}

export const CURATED_PORTRAITS: PortraitPreset[] = [
  {
    id: 'p-paladin-1',
    name: 'Sunblade Knight',
    className: 'Paladin',
    race: 'Human',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    tags: ['Holy', 'Armor', 'Male', 'Golden Light']
  },
  {
    id: 'p-paladin-2',
    name: 'Dawn Shield',
    className: 'Paladin',
    race: 'Aasimar',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    tags: ['Radiant', 'Armor', 'Female', 'Wings']
  },
  {
    id: 'p-wizard-1',
    name: 'Arcane Scholar',
    className: 'Wizard',
    race: 'Elf',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    tags: ['Mystic', 'Robe', 'Male', 'Spells']
  },
  {
    id: 'p-wizard-2',
    name: 'Astral Sorceress',
    className: 'Wizard',
    race: 'Human',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tags: ['Cosmic', 'Staff', 'Female', 'Starlight']
  },
  {
    id: 'p-rogue-1',
    name: 'Shadow Assassin',
    className: 'Rogue',
    race: 'Human',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    tags: ['Stealth', 'Daggers', 'Male', 'Hood']
  },
  {
    id: 'p-rogue-2',
    name: 'Nightblade Infiltrator',
    className: 'Rogue',
    race: 'Elf',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    tags: ['Shadow', 'Mask', 'Female', 'Cloak']
  },
  {
    id: 'p-cleric-1',
    name: 'Life Warden',
    className: 'Cleric',
    race: 'Dwarf',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80',
    tags: ['Healer', 'Mace', 'Male', 'Beard']
  },
  {
    id: 'p-cleric-2',
    name: 'Sanctuary Priestess',
    className: 'Cleric',
    race: 'Human',
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80',
    tags: ['Holy', 'Vestments', 'Female', 'Aura']
  },
  {
    id: 'p-fighter-1',
    name: 'Vanguard Champion',
    className: 'Fighter',
    race: 'Human',
    url: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80',
    tags: ['Steel', 'Greatsword', 'Male', 'Plate']
  },
  {
    id: 'p-fighter-2',
    name: 'Battle Commander',
    className: 'Fighter',
    race: 'Orc',
    url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80',
    tags: ['Fierce', 'Armor', 'Female', 'Shield']
  },
  {
    id: 'p-barbarian-1',
    name: 'Berserker Juggernaut',
    className: 'Barbarian',
    race: 'Goliath',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    tags: ['Rage', 'Warhammer', 'Male', 'Tattoos']
  },
  {
    id: 'p-ranger-1',
    name: 'Wilderness Scout',
    className: 'Ranger',
    race: 'Elf',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tags: ['Longbow', 'Forest', 'Male', 'Cloak']
  },
  {
    id: 'p-ranger-2',
    name: 'Falcon Huntress',
    className: 'Ranger',
    race: 'Half-Elf',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
    tags: ['Archery', 'Wilderness', 'Female', 'Leather']
  },
  {
    id: 'p-warlock-1',
    name: 'Eldritch Pactbearer',
    className: 'Warlock',
    race: 'Tiefling',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    tags: ['Horns', 'Eldritch', 'Male', 'Tome']
  },
  {
    id: 'p-bard-1',
    name: 'Virtuoso Skald',
    className: 'Bard',
    race: 'Half-Elf',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    tags: ['Lute', 'Charisma', 'Male', 'Silk']
  },
  {
    id: 'p-druid-1',
    name: 'Oak Warden',
    className: 'Druid',
    race: 'Firbolg',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tags: ['Flora', 'Staff', 'Male', 'Leaves']
  }
];

export function getCuratedPortrait(className: string, race?: string): string {
  const match = CURATED_PORTRAITS.find(
    p => p.className.toLowerCase() === className.toLowerCase() && (!race || p.race.toLowerCase() === race.toLowerCase())
  );
  if (match) return match.url;
  
  const classMatch = CURATED_PORTRAITS.find(
    p => p.className.toLowerCase() === className.toLowerCase()
  );
  if (classMatch) return classMatch.url;

  return CURATED_PORTRAITS[0].url;
}
