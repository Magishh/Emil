import { Character, CharacterStats, DieType, LocationInfo, InventoryItem, StatusEffect, StoryHeroConcept, CustomRace, CustomClass } from '../types';
import { getFixedPerchanceItemImageUrl, ensureItemSprite, ensureItemSprites } from './perchanceAi';

export const PRESET_CONDITIONS: Omit<StatusEffect, 'id'>[] = [
  {
    name: 'Poisoned',
    type: 'debuff',
    description: 'A virulent venom or toxic miasma courses through your veins.',
    mechanicalEffect: 'Disadvantage on attack rolls and ability checks.',
    icon: 'Skull',
    color: '#22c55e', // Emerald Green
    durationTurns: 3,
  },
  {
    name: 'Blessed',
    type: 'buff',
    description: 'Divine grace envelops you with shimmering holy radiance.',
    mechanicalEffect: 'Adds +1d4 bonus to all attack rolls and saving throws.',
    icon: 'Sparkles',
    color: '#eab308', // Radiant Gold
    durationTurns: 4,
  },
  {
    name: 'Charmed',
    type: 'debuff',
    description: 'A magical compulsion bends your will toward a charismatic entity.',
    mechanicalEffect: 'Cannot attack the charmer; charmer has advantage on social ability checks against you.',
    icon: 'Heart',
    color: '#d946ef', // Magenta
    durationTurns: 3,
  },
  {
    name: 'Blinded',
    type: 'debuff',
    description: 'Darkness, blinding dust, or magical shadows obscure your vision entirely.',
    mechanicalEffect: 'Auto-fails checks requiring sight; attacks against you have advantage; your attacks have disadvantage.',
    icon: 'EyeOff',
    color: '#64748b', // Slate Gray
    durationTurns: 2,
  },
  {
    name: 'Frightened',
    type: 'debuff',
    description: 'Overwhelming dread grips your heart, shaking your confidence.',
    mechanicalEffect: 'Disadvantage on ability checks and attack rolls while source of fear is in line of sight; cannot willingly move closer.',
    icon: 'Ghost',
    color: '#a855f7', // Purple
    durationTurns: 3,
  },
  {
    name: 'Hasted',
    type: 'buff',
    description: 'Time bends around your swift movements with surging momentum.',
    mechanicalEffect: 'Doubles speed, +2 bonus to AC, advantage on DEX saving throws, and an additional action.',
    icon: 'Zap',
    color: '#38bdf8', // Azure Blue
    durationTurns: 3,
  },
  {
    name: 'Raging',
    type: 'buff',
    description: 'Primal fury empowers your physical might and numbs pain.',
    mechanicalEffect: 'Advantage on STR checks & saves; +2 melee damage bonus; resistance to bludgeoning, piercing, and slashing damage.',
    icon: 'Flame',
    color: '#ef4444', // Fiery Red
    durationTurns: 4,
  },
  {
    name: 'Paralyzed',
    type: 'debuff',
    description: 'Rigid paralysis or electric shock locks your muscles in place.',
    mechanicalEffect: 'Incapacitated; cannot move or speak; auto-fails STR/DEX saves; attacks against you within 5ft are automatic critical hits.',
    icon: 'AlertTriangle',
    color: '#06b6d4', // Cyan
    durationTurns: 2,
  },
  {
    name: 'Stunned',
    type: 'debuff',
    description: 'A concussive blow or psychic shock leaves you reeling and disoriented.',
    mechanicalEffect: 'Incapacitated, cannot move, speaks only falteringly; auto-fails STR and DEX saving throws; attacks against have advantage.',
    icon: 'Activity',
    color: '#f59e0b', // Amber
    durationTurns: 1,
  },
  {
    name: 'Invisible',
    type: 'buff',
    description: 'Refracted light cloaks you in complete visual transparency.',
    mechanicalEffect: 'Heavily obscured for stealth; attacks against you have disadvantage; your attack rolls have advantage.',
    icon: 'ShieldAlert',
    color: '#818cf8', // Indigo / Translucent
    durationTurns: 5,
  },
  {
    name: 'Restrained',
    type: 'debuff',
    description: 'Heavy chains, thorny vines, or giant webs pin you in place.',
    mechanicalEffect: 'Speed is 0; attack rolls against you have advantage; your attacks have disadvantage; disadvantage on DEX saves.',
    icon: 'Lock',
    color: '#ea580c', // Orange
    durationTurns: 2,
  },
  {
    name: 'Inspired',
    type: 'buff',
    description: 'A stirring bardic melody or heroic encouragement fuels your determination.',
    mechanicalEffect: 'Add +1d6 bonus die to any single attack roll, ability check, or saving throw.',
    icon: 'Music',
    color: '#facc15', // Gold
    durationTurns: 5,
  },
  {
    name: 'Shielded',
    type: 'buff',
    description: 'An ethereal barrier of shimmering arcane force wards off incoming blows.',
    mechanicalEffect: '+5 bonus to Armor Class (AC) and immunity to Magic Missile until next turn.',
    icon: 'ShieldCheck',
    color: '#3b82f6', // Royal Blue
    durationTurns: 1,
  },
  {
    name: 'Regenerating',
    type: 'buff',
    description: 'Vigorous magical vitality mends flesh and closes wounds rapidly.',
    mechanicalEffect: 'Regains 1d4 hit points at the start of each turn.',
    icon: 'HeartPulse',
    color: '#10b981', // Emerald Mint
    durationTurns: 3,
  },
  {
    name: 'Bane',
    type: 'debuff',
    description: 'A shadowy hex or sinister curse drags down your fortunes.',
    mechanicalEffect: 'Subtract 1d4 from all attack rolls and saving throws.',
    icon: 'Skull',
    color: '#dc2626', // Crimson Red
    durationTurns: 3,
  },
  {
    name: 'Exhausted',
    type: 'debuff',
    description: 'Extreme physical fatigue or lack of rest strains every muscle.',
    mechanicalEffect: 'Disadvantage on all ability checks and skill checks.',
    icon: 'Hourglass',
    color: '#71717a', // Charcoal
    durationTurns: 6,
  },
];

export function getItemThumbnail(item: Partial<InventoryItem>): string {
  if (item.imageUrl && item.imageUrl.trim().length > 0 && !item.imageUrl.startsWith('data:image/svg+xml;base64,PHN2Zw')) {
    return item.imageUrl;
  }
  return getFixedPerchanceItemImageUrl(item);
}

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function rollDie(dieType: DieType): number {
  const max = {
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20,
    d100: 100,
  }[dieType];

  return Math.floor(Math.random() * max) + 1;
}

export const STARTING_CLASSES = [
  {
    name: 'Fighter',
    hitDie: 'd10',
    primary: 'STR',
    description: 'Master of martial combat, skilled with an arsenal of weapons and heavy armor.',
    defaultStats: { str: 16, dex: 12, con: 15, int: 10, wis: 12, cha: 10 },
    defaultItems: ['Longsword of Valour', 'Chain Mail & Shield', 'Potion of Healing'],
    hp: 22,
    ac: 16,
  },
  {
    name: 'Wizard',
    hitDie: 'd6',
    primary: 'INT',
    description: 'Scholar of the arcane arts, capable of altering reality with devastating spells.',
    defaultStats: { str: 8, dex: 14, con: 13, int: 17, wis: 13, cha: 10 },
    defaultItems: ['Arcane Frost Staff', 'Mage Silk Robe', 'Elixir of Mana & Health'],
    hp: 14,
    ac: 12,
  },
  {
    name: 'Rogue',
    hitDie: 'd8',
    primary: 'DEX',
    description: 'Shadow-stalker specializing in stealth, lockpicking, critical sneak attacks, and traps.',
    defaultStats: { str: 10, dex: 17, con: 14, int: 12, wis: 13, cha: 12 },
    defaultItems: ['Twin Shadow Daggers', 'Studded Leather Armor', 'Thieves Tools & Lockpicks', 'Potion of Healing'],
    hp: 18,
    ac: 15,
  },
  {
    name: 'Paladin',
    hitDie: 'd10',
    primary: 'STR / CHA',
    description: 'Holy warrior bound by a sacred oath, wielding radiant smites and protective auras.',
    defaultStats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 15 },
    defaultItems: ['Radiant Sunblade Longsword', 'Heavy Plate & Tower Shield', 'Healing Draught'],
    hp: 22,
    ac: 18,
  },
  {
    name: 'Cleric',
    hitDie: 'd8',
    primary: 'WIS',
    description: 'Priest of the divine gods, channeling miraculous blessings, radiant fire, and holy healing.',
    defaultStats: { str: 14, dex: 10, con: 14, int: 10, wis: 17, cha: 12 },
    defaultItems: ['Warhammer of the Dawn', 'Scale Mail & Holy Relic Shield', 'Potion of Greater Healing'],
    hp: 20,
    ac: 16,
  },
  {
    name: 'Ranger',
    hitDie: 'd10',
    primary: 'DEX / WIS',
    description: 'Wilderness hunter and archer with keen senses and woodland tracking magic.',
    defaultStats: { str: 12, dex: 16, con: 14, int: 10, wis: 15, cha: 10 },
    defaultItems: ['Yew Longbow & Quiver', 'Elven Scout Leather', 'Potion of Healing', 'Grappling Hook'],
    hp: 20,
    ac: 15,
  },
  {
    name: 'Barbarian',
    hitDie: 'd12',
    primary: 'STR / CON',
    description: 'Primal berserker whose boundless fury turns skin into iron and strikes into earthquakes.',
    defaultStats: { str: 17, dex: 14, con: 16, int: 8, wis: 10, cha: 9 },
    defaultItems: ['Great Berserker Axe', 'Warhide Bracers', 'Potion of Healing'],
    hp: 26,
    ac: 15,
  },
  {
    name: 'Bard',
    hitDie: 'd8',
    primary: 'CHA',
    description: 'Charismatic weaver of song, words, inspiration, and versatile magic tricks.',
    defaultStats: { str: 10, dex: 15, con: 12, int: 12, wis: 12, cha: 17 },
    defaultItems: ['Duelist Rapier', 'Glamoured Leather Tunic', 'Lute of Resonating Harmonics', 'Potion of Healing'],
    hp: 17,
    ac: 14,
  },
  {
    name: 'Warlock',
    hitDie: 'd8',
    primary: 'CHA',
    description: 'Pact-bound sorcerer wielding forbidden eldritch power granted by an otherworldly patron.',
    defaultStats: { str: 10, dex: 14, con: 14, int: 12, wis: 10, cha: 17 },
    defaultItems: ['Eldritch Focus Rod', 'Dark Patron Leather', 'Grimoire of Shadows', 'Potion of Healing'],
    hp: 18,
    ac: 14,
  },
  {
    name: 'Druid',
    hitDie: 'd8',
    primary: 'WIS',
    description: 'Guardian of the wild forces, shapeshifter, and caller of storms and beasts.',
    defaultStats: { str: 10, dex: 14, con: 15, int: 11, wis: 16, cha: 11 },
    defaultItems: ['Ironwood Quarterstaff', 'Hide of the Wild Beast', 'Antidote & Herbal Poultice'],
    hp: 19,
    ac: 14,
  },
];

export const STARTING_RACES = [
  'Human',
  'High Elf',
  'Wood Elf',
  'Drow / Dark Elf',
  'Sea Elf / Triton',
  'Mountain Dwarf',
  'Halfling',
  'Dragonborn',
  'Tiefling',
  'Half-Orc',
  'Gnome',
  'Aasimar',
  'Tabaxi',
  'Goliath',
  'Genasi (Elemental)',
  'Warforged / Automaton',
  'Shadar-kai (Shadow Elf)',
  'Kenku / Ravenfolk',
  'Lizardfolk',
];

export const DEFAULT_CUSTOM_RACES: CustomRace[] = [
  {
    id: 'race-astral-revenant',
    name: 'Astral Revenant',
    lore: 'Soul-forged wanderers bound between the mortal coil and the starry astral sea, immune to planar decay.',
    traits: '+2 INT, +1 WIS • Ethereal Phase Step (Advantage vs Paralyze)',
    statBonuses: { int: 2, wis: 1 },
    speed: 30,
    senses: 'Astral Sight 60ft',
    specialAbility: 'Phase Step: Can blink 15ft across hazardous floor triggers once per rest.',
    isCustom: true,
  },
  {
    id: 'race-chrono-gnome',
    name: 'Chrono-Gnome',
    lore: 'Tinkers who have unlocked the latent temporal frequencies of clockwork chronomancy.',
    traits: '+2 INT, +1 DEX • Chrono Leap (Reroll a fumble d20 once per day)',
    statBonuses: { int: 2, dex: 1 },
    speed: 25,
    senses: 'Temporal Awareness',
    specialAbility: 'Time Glitch: Add +1d4 to any saving throw before outcome is revealed.',
    isCustom: true,
  },
  {
    id: 'race-deep-abyssal-triton',
    name: 'Abyssal Triton',
    lore: 'Adapted to the crushing darkness and eldritch trenches of subterranean ocean depths.',
    traits: '+2 CON, +1 STR • Bioluminescent Glow, Cold & Pressure Resistance',
    statBonuses: { con: 2, str: 1 },
    speed: 30,
    senses: 'Bioluminescent Vision 90ft',
    specialAbility: 'Deep Resilience: Resistance to cold damage and suffocation hazards.',
    isCustom: true,
  },
];

export const DEFAULT_CUSTOM_CLASSES: CustomClass[] = [
  {
    id: 'class-blood-mage',
    name: 'Blood Mage',
    hitDie: 'd8',
    primary: 'CON / INT',
    description: 'Weaves dark crimson hemomancy, sacrificing vitality to amplify spell attacks and siphon enemy life.',
    defaultStats: { str: 8, dex: 14, con: 16, int: 16, wis: 10, cha: 12 },
    defaultItems: ['Sanguine Focus Dagger', 'Crimson Runed Vestments', 'Elixir of Vital Essence'],
    hp: 18,
    ac: 13,
    specialAbility: 'Life Tap: Sacrifice 2 HP to deal +1d6 necrotic bonus damage on a spell hit.',
    isCustom: true,
  },
  {
    id: 'class-rune-knight',
    name: 'Rune Knight',
    hitDie: 'd10',
    primary: 'STR / INT',
    description: 'Martial juggernaut channeling ancient primordial giants runes etched directly into blade and plate armor.',
    defaultStats: { str: 17, dex: 10, con: 15, int: 13, wis: 12, cha: 8 },
    defaultItems: ['Runic Greatsword', 'Inscribed Iron Plate', 'Potion of Giant Might'],
    hp: 22,
    ac: 17,
    specialAbility: 'Giant Might: Enlarge size to gain advantage on Strength checks and +1d6 melee damage.',
    isCustom: true,
  },
  {
    id: 'class-shadowblade-corsair',
    name: 'Shadowblade Corsair',
    hitDie: 'd8',
    primary: 'DEX / CHA',
    description: 'A swashbuckling skirmisher wielding dual shadow-forged cutlasses and smoke-screen trickery.',
    defaultStats: { str: 10, dex: 17, con: 14, int: 10, wis: 12, cha: 15 },
    defaultItems: ['Twin Obsidian Cutlasses', 'Corsair Silk Leathers', 'Smoke Bomb Flask'],
    hp: 18,
    ac: 15,
    specialAbility: 'Shadow Veil: Release a cloud of darkness to disengage without provoking opportunity attacks.',
    isCustom: true,
  },
];

// LocalStorage helpers for custom races and classes
const CUSTOM_RACES_STORAGE_KEY = 'dnd_ai_custom_races';
const CUSTOM_CLASSES_STORAGE_KEY = 'dnd_ai_custom_classes';

export function getStoredCustomRaces(): CustomRace[] {
  try {
    const raw = localStorage.getItem(CUSTOM_RACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An empty stored array is a real state (the player deleted every race),
      // not missing data - reseeding the defaults here would resurrect them.
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading custom races from localStorage:', e);
  }
  return DEFAULT_CUSTOM_RACES;
}

export function saveCustomRace(race: CustomRace): CustomRace[] {
  try {
    const existing = getStoredCustomRaces();
    const updated = [race, ...existing.filter((r) => r.id !== race.id && r.name.toLowerCase() !== race.name.toLowerCase())];
    localStorage.setItem(CUSTOM_RACES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error saving custom race:', e);
    return [race, ...DEFAULT_CUSTOM_RACES];
  }
}

export function deleteCustomRace(id: string): CustomRace[] {
  try {
    const existing = getStoredCustomRaces();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(CUSTOM_RACES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error deleting custom race:', e);
    return DEFAULT_CUSTOM_RACES.filter((r) => r.id !== id);
  }
}

export function getStoredCustomClasses(): CustomClass[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CLASSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An empty stored array is a real state (the player deleted every class),
      // not missing data - reseeding the defaults here would resurrect them.
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading custom classes from localStorage:', e);
  }
  return DEFAULT_CUSTOM_CLASSES;
}

export function saveCustomClass(cls: CustomClass): CustomClass[] {
  try {
    const existing = getStoredCustomClasses();
    const updated = [cls, ...existing.filter((c) => c.id !== cls.id && c.name.toLowerCase() !== cls.name.toLowerCase())];
    localStorage.setItem(CUSTOM_CLASSES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error saving custom class:', e);
    return [cls, ...DEFAULT_CUSTOM_CLASSES];
  }
}

export function deleteCustomClass(id: string): CustomClass[] {
  try {
    const existing = getStoredCustomClasses();
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(CUSTOM_CLASSES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error deleting custom class:', e);
    return DEFAULT_CUSTOM_CLASSES.filter((c) => c.id !== id);
  }
}

export interface StoryRealmPreset {
  id: string;
  title: string;
  theme: string;
  premise: string;
  recommendedRaces: string[];
  recommendedClasses: string[];
  thematicBackgrounds: string[];
  environmentLore: string;
  dangerRating: string;
  thematicItems: InventoryItem[];
  bespokeHeroes: StoryHeroConcept[];
}

const RAW_STORY_REALM_PRESETS: StoryRealmPreset[] = [
  {
    id: 'sunken-crypt',
    title: 'Sunken Necropolis of Kazal-Dûr',
    theme: 'Submerged Dungeons & Ocean Ruins',
    premise: 'Explore the flooded subterranean halls of an ancient dwarven necropolis submerged beneath tidal abyssal trenches in search of a lost celestial sunstone before necrotic deep-sea leviathans awaken.',
    recommendedRaces: ['Sea Elf / Triton', 'Genasi (Elemental)', 'Mountain Dwarf', 'Lizardfolk', 'Human'],
    recommendedClasses: ['Ranger', 'Fighter', 'Druid', 'Cleric', 'Wizard'],
    thematicBackgrounds: ['Marine Scout & Deep Salvager', 'Sunken Archaeologist', 'Tidal Hermit'],
    environmentLore: 'Bioluminescent abyssal caverns with water-pressure hazards and submerged ruin vaults.',
    dangerRating: 'High • Suffocation & Aquatic Wraiths',
    thematicItems: [
      {
        id: 'story-item-1',
        name: 'Vial of Deep Water Breathing',
        type: 'potion',
        description: 'Enables underwater respiration and clear vision in murky depths for 1 hour.',
        quantity: 2,
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Vial of Deep Water Breathing', type: 'potion', description: 'aqua glowing potion' }),
      },
      {
        id: 'story-item-2',
        name: 'Abyssal Harpoon of the Depths',
        type: 'weapon',
        description: 'Weighted barbed trident that suffers no underwater attack penalty. 1d8+3 Piercing.',
        quantity: 1,
        damage: '1d8 + 3 Piercing',
        bonus: '+5 to hit (Aquatic Advantage)',
        valueGold: 75,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Abyssal Harpoon', type: 'weapon', description: 'trident harpoon spear' }),
      },
      {
        id: 'story-item-3',
        name: 'Bioluminescent Glow-Coral Wand',
        type: 'quest',
        description: 'Illuminates a 40ft radius with comforting green radiance that repels deep sea predators.',
        quantity: 1,
        bonus: '+2 Perception vs Hidden Secrets',
        valueGold: 80,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Glow-Coral Wand', type: 'quest', description: 'glowing sea coral staff' }),
      },
      {
        id: 'story-item-4',
        name: 'Grappling Anchor & Silk Line',
        type: 'misc',
        description: '60ft weighted anchor line for scaling slippery underwater ledges and mooring rafts.',
        quantity: 1,
        valueGold: 35,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Grappling Anchor', type: 'misc', description: 'anchor rope' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-sunken-1',
        name: 'Nereus Coral-Vein',
        title: 'Abyssal Trench Stalker',
        race: 'Sea Elf / Triton',
        gender: 'Male',
        className: 'Ranger',
        background: 'Marine Scout & Deep Salvager',
        alignment: 'Neutral Good',
        storyMotivation: 'His home clan sent him to secure the celestial sunstone before necrotic ocean blight poisons the undersea shelf.',
        customTrait: 'Gills & Trench Eyes: Immune to dark underwater blindness and ocean pressure.',
        stats: { str: 13, dex: 16, con: 14, int: 10, wis: 15, cha: 8 },
        hp: 12,
        ac: 15,
        portraitPrompt: 'Cinematic digital art of an athletic male Sea Elf ranger in iridescent deep-sea scales wielding a barbed bone harpoon in glowing turquoise underwater ruins.',
        portraitUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'sh-1-item-1',
            name: 'Abyssal Harpoon of the Depths',
            type: 'weapon',
            description: 'Weighted barbed trident that suffers no underwater attack penalty. 1d8+3 Piercing.',
            quantity: 1,
            damage: '1d8 + 3 Piercing',
            bonus: '+5 to hit',
            valueGold: 75,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Abyssal Harpoon', type: 'weapon', description: 'trident harpoon spear' }),
          },
          {
            id: 'sh-1-item-2',
            name: 'Vial of Deep Water Breathing',
            type: 'potion',
            description: 'Enables underwater respiration and clear vision in murky depths for 1 hour.',
            quantity: 2,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Water Breathing', type: 'potion', description: 'aqua potion' }),
          },
          {
            id: 'sh-1-item-3',
            name: 'Bioluminescent Glow-Coral Wand',
            type: 'quest',
            description: 'Illuminates a 40ft radius with green radiance that repels aquatic shadows.',
            quantity: 1,
            valueGold: 80,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Glow Coral', type: 'quest', description: 'glowing coral' }),
          },
        ],
      },
      {
        id: 'hero-sunken-2',
        name: 'Vaelin Tide-Caller',
        title: 'Sunken Vault Hydromancer',
        race: 'Genasi (Elemental)',
        gender: 'Non-Binary',
        className: 'Druid',
        background: 'Sunken Archaeologist',
        alignment: 'Chaotic Good',
        storyMotivation: 'Seeks to decode the flooded celestial runes of Kazal-Dûr and commune with the slumbering primordial water spirits.',
        customTrait: 'Tidal Ward: Can shape small currents to deflect incoming aquatic missiles.',
        stats: { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 10 },
        hp: 10,
        ac: 14,
        portraitPrompt: 'Masterpiece concept art of a Water Genasi druid with flowing azure hair and bioluminescent skin symbols examining glowing underwater tablets.',
        portraitUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'sh-2-item-1',
            name: 'Sunken Coral Staff',
            type: 'weapon',
            description: 'Carved petrified coral staff channeling frost and tidal bursts. 1d6+2 Bludgeoning.',
            quantity: 1,
            damage: '1d6 + 2 Bludgeoning',
            bonus: '+4 to hit',
            valueGold: 65,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Coral Staff', type: 'weapon', description: 'coral staff' }),
          },
          {
            id: 'sh-2-item-2',
            name: 'Pressure-Forged Shell Cuirass',
            type: 'armor',
            description: 'Reinforced nautilus carapace armor designed for deep diving.',
            quantity: 1,
            acBonus: 2,
            valueGold: 70,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Shell Armor', type: 'armor', description: 'shell armor' }),
          },
        ],
      },
      {
        id: 'hero-sunken-3',
        name: 'Thorgar Iron-Anchor',
        title: 'Dwarven Heavy Dredger',
        race: 'Mountain Dwarf',
        gender: 'Male',
        className: 'Fighter',
        background: 'Marine Scout & Deep Salvager',
        alignment: 'Lawful Good',
        storyMotivation: 'His ancestors built Kazal-Dûr before the deluge; he has sworn to reclaim the lost clan throne and avenge the drowned dead.',
        customTrait: 'Deep Diver Ballast: Steadfast footing against whirlpool currents and blast waves.',
        stats: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
        hp: 13,
        ac: 16,
        portraitPrompt: 'Grim mountain dwarf warrior in heavy bronze diving plate with runic seals and a massive anchor-cleaver greataxe underwater.',
        portraitUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'sh-3-item-1',
            name: 'Forged Dredging Greataxe',
            type: 'weapon',
            description: 'Heavy bronze-alloy battleaxe weighted for cutting through underwater wreckage. 1d12+3 Slashing.',
            quantity: 1,
            damage: '1d12 + 3 Slashing',
            bonus: '+5 to hit',
            valueGold: 80,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Dredging Greataxe', type: 'weapon', description: 'greataxe bronze' }),
          },
          {
            id: 'sh-3-item-2',
            name: 'Vial of Deep Water Breathing',
            type: 'potion',
            description: 'Enables underwater respiration for 1 hour.',
            quantity: 2,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Water Breathing', type: 'potion', description: 'aqua potion' }),
          },
        ],
      },
    ],
  },
  {
    id: 'gothic-castle',
    title: 'Gothic Castle of the Blood Sovereign',
    theme: 'Dark Gothic Horror & Undead Curse',
    premise: 'Infiltrate Castle Ravencrest atop jagged mist-shrouded crags to break the vampiric curse of an immortal blood sovereign holding the surrounding barony under eternal eclipse.',
    recommendedRaces: ['Shadar-kai (Shadow Elf)', 'Tiefling', 'Human', 'Aasimar', 'High Elf'],
    recommendedClasses: ['Paladin', 'Cleric', 'Rogue', 'Warlock', 'Fighter'],
    thematicBackgrounds: ['Inquisitor of the Dawn', 'Haunted One', 'Occult Scholar'],
    environmentLore: 'Gloomy gothic masonry, candlelit catacombs, stained-glass crypts, and gargoyle perches.',
    dangerRating: 'Deadly • Vampiric Thralls & Necrotic Hexes',
    thematicItems: [
      {
        id: 'story-item-5',
        name: 'Consecrated Holy Water Draught',
        type: 'potion',
        description: 'Sprinkle or consume to cleanse minor necrotic curses and deal 2d8 radiant damage to undead.',
        quantity: 2,
        valueGold: 65,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Consecrated Holy Water', type: 'potion', description: 'holy silver glowing flask' }),
      },
      {
        id: 'story-item-6',
        name: 'Silvered Stake & Assassin Stiletto',
        type: 'weapon',
        description: 'Alchemically coated silver blade designed to bypass undead resistances. 1d6+3 Piercing.',
        quantity: 1,
        damage: '1d6 + 3 Piercing (Silvered)',
        bonus: '+5 to hit (+1d4 vs Vampires)',
        valueGold: 70,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Silvered Stiletto', type: 'weapon', description: 'silver dagger stake' }),
      },
      {
        id: 'story-item-7',
        name: 'Mirror of True Seeing',
        type: 'quest',
        description: 'Polished obsidian mirror that reveals illusion disguises and vampire reflections.',
        quantity: 1,
        bonus: 'Reveals Incorporeal & Disguised Fiends',
        valueGold: 90,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Mirror of True Seeing', type: 'quest', description: 'antique mirror relic' }),
      },
      {
        id: 'story-item-8',
        name: 'Garlic & Wolfsbane Warding Charm',
        type: 'misc',
        description: 'Herbal talisman granting +2 to Saving Throws against vampiric charms and blood drains.',
        quantity: 1,
        valueGold: 40,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Warding Charm', type: 'misc', description: 'herbal talisman amulet' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-gothic-1',
        name: 'Valeria Sun-Brand',
        title: 'Dawn Inquisitor & Vampire Hunter',
        race: 'Aasimar',
        gender: 'Female',
        className: 'Paladin',
        background: 'Inquisitor of the Dawn',
        alignment: 'Lawful Good',
        storyMotivation: 'Sworn to end the 100-year blood tribute demanded by the vampire lord of Ravencrest.',
        customTrait: 'Radiant Smite Brand: Strikes pulse with blinding solar light against bloodthirsty fiends.',
        stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 15 },
        hp: 12,
        ac: 17,
        portraitPrompt: 'Heroic female Aasimar paladin in silver and gold gothic armor with a burning solar longsword in a foggy gothic vampire cathedral.',
        portraitUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'gh-1-item-1',
            name: 'Silvered Stake & Assassin Stiletto',
            type: 'weapon',
            description: 'Alchemically coated silver blade. 1d6+3 Piercing (+1d4 vs Vampires).',
            quantity: 1,
            damage: '1d6 + 3 Piercing (Silvered)',
            bonus: '+5 to hit',
            valueGold: 70,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Silvered Stiletto', type: 'weapon', description: 'silver dagger stake' }),
          },
          {
            id: 'gh-1-item-2',
            name: 'Consecrated Holy Water Draught',
            type: 'potion',
            description: 'Deals 2d8 radiant damage to undead or cures necrotic poison.',
            quantity: 2,
            valueGold: 65,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Holy Water', type: 'potion', description: 'holy potion' }),
          },
          {
            id: 'gh-1-item-3',
            name: 'Garlic & Wolfsbane Warding Charm',
            type: 'misc',
            description: 'Grants +2 on saves vs blood charms.',
            quantity: 1,
            valueGold: 40,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Warding Charm', type: 'misc', description: 'amulet' }),
          },
        ],
      },
      {
        id: 'hero-gothic-2',
        name: 'Corvus Night-Stalker',
        title: 'Grave-Walker Exorcist',
        race: 'Shadar-kai (Shadow Elf)',
        gender: 'Male',
        className: 'Rogue',
        background: 'Haunted One',
        alignment: 'Chaotic Good',
        storyMotivation: 'Escaped the vampire dungeon as a child; now returns through the secret crypt ventilation passages for retribution.',
        customTrait: 'Shadow Step: Can melt into midnight shadows to bypass garlic-wired traps.',
        stats: { str: 10, dex: 16, con: 14, int: 13, wis: 14, cha: 8 },
        hp: 10,
        ac: 15,
        portraitPrompt: 'Dark hooded male Shadar-kai rogue with ash-pale skin and silver daggers standing on gargoyle roof of a dark gothic castle.',
        portraitUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'gh-2-item-1',
            name: 'Silvered Stake & Assassin Stiletto',
            type: 'weapon',
            description: '1d6+3 Piercing silvered weapon.',
            quantity: 1,
            damage: '1d6 + 3 Piercing (Silvered)',
            bonus: '+5 to hit',
            valueGold: 70,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Silvered Stiletto', type: 'weapon', description: 'silver dagger' }),
          },
          {
            id: 'gh-2-item-2',
            name: 'Mirror of True Seeing',
            type: 'quest',
            description: 'Reveals vampire disguises and invisible shades.',
            quantity: 1,
            valueGold: 90,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'True Seeing Mirror', type: 'quest', description: 'mirror' }),
          },
        ],
      },
      {
        id: 'hero-gothic-3',
        name: 'Morrigan Hex-Weaver',
        title: 'Blood-Pact Scholar',
        race: 'Tiefling',
        gender: 'Female',
        className: 'Warlock',
        background: 'Occult Scholar',
        alignment: 'Neutral Good',
        storyMotivation: 'Holds a grim grimoire that can bind the blood sovereign in soul-chains if she reaches the central coffin chamber.',
        customTrait: 'Occult Ward: High resistance to dark illusions and vampiric mind control.',
        stats: { str: 8, dex: 14, con: 14, int: 13, wis: 10, cha: 16 },
        hp: 10,
        ac: 13,
        portraitPrompt: 'Enchanting female tiefling warlock with crimson skin, curved horns, and dark velvet coat channeling purple arcane hexes in candlelit crypt.',
        portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'gh-3-item-1',
            name: 'Pactbound Bloodstone Wand',
            type: 'weapon',
            description: 'Channels Eldritch blasts with +1 spell DC.',
            quantity: 1,
            bonus: '+5 to hit spell attack',
            valueGold: 75,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Bloodstone Wand', type: 'weapon', description: 'crimson wand' }),
          },
          {
            id: 'gh-3-item-2',
            name: 'Consecrated Holy Water Draught',
            type: 'potion',
            description: 'Radiant flask vs undead.',
            quantity: 2,
            valueGold: 65,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Holy Water', type: 'potion', description: 'holy potion' }),
          },
        ],
      },
    ],
  },
  {
    id: 'frozen-peaks',
    title: 'Frostfell Peaks & The Dragon Spire',
    theme: 'Glacial Tundra & Ancient Wyrm Lair',
    premise: 'Scale the sheer ice walls of Mount Skydagger into the howling blizzard to recover the ancient Frostfire Heart from the abandoned frozen lair of an ancient white dragon.',
    recommendedRaces: ['Goliath', 'Mountain Dwarf', 'Dragonborn', 'Human', 'Wood Elf'],
    recommendedClasses: ['Barbarian', 'Ranger', 'Fighter', 'Druid', 'Sorcerer'],
    thematicBackgrounds: ['Mountain Guide & Tundra Hunter', 'Clan Exile', 'Glacier Cartographer'],
    environmentLore: 'Sub-zero blizzards, treacherous crevasses, ancient frozen fossils, and glacial caverns.',
    dangerRating: 'High • Extreme Frost & Ice Drakes',
    thematicItems: [
      {
        id: 'story-item-9',
        name: 'Thermal Mammoth Furs',
        type: 'armor',
        description: 'Thick insulated enchanted furs granting total resistance to environmental freezing.',
        quantity: 1,
        acBonus: 3,
        bonus: 'Cold Climate Immunity',
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Thermal Mammoth Furs', type: 'armor', description: 'heavy fur armor' }),
      },
      {
        id: 'story-item-10',
        name: 'Spiked Ice-Mining Pick & Pitons',
        type: 'weapon',
        description: 'Hardened titanium ice pick used for both climbing frozen sheets and crushing armor. 1d8+3 Piercing.',
        quantity: 1,
        damage: '1d8 + 3 Piercing',
        bonus: '+5 to hit (Advantage on Climb checks)',
        valueGold: 55,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Ice Mining Pick', type: 'weapon', description: 'ice pick axe' }),
      },
      {
        id: 'story-item-11',
        name: 'Flask of Dragonfire Spirit Elixir',
        type: 'potion',
        description: 'Fiery brew that warms the core, immediately curing hypothermia and granting +10 Temp HP.',
        quantity: 2,
        valueGold: 55,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Dragonfire Spirit', type: 'potion', description: 'flaming orange potion flask' }),
      },
      {
        id: 'story-item-12',
        name: 'Amulet of the Frost-Ward',
        type: 'quest',
        description: 'Ancient runic amulet glowing with pale blue warmth that resists cold spells.',
        quantity: 1,
        valueGold: 85,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Frost Ward Amulet', type: 'quest', description: 'blue crystal amulet' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-frost-1',
        name: 'Krag Stone-Breaker',
        title: 'Glacier Mammoth Cleaver',
        race: 'Goliath',
        gender: 'Male',
        className: 'Barbarian',
        background: 'Mountain Guide & Tundra Hunter',
        alignment: 'Chaotic Good',
        storyMotivation: 'Must retrieve the Frostfire Heart to thaw the perpetual winter burying his mountain tribe.',
        customTrait: 'Mountain Born: Unfazed by high altitudes and icy winds; ignores difficult snowy terrain.',
        stats: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 8 },
        hp: 15,
        ac: 15,
        portraitPrompt: 'Mighty male Goliath barbarian clad in mammoth pelt armor with glacial frost in his beard holding a spiked ice greataxe on a snowy peak.',
        portraitUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'fh-1-item-1',
            name: 'Spiked Ice-Mining Pick & Pitons',
            type: 'weapon',
            description: '1d8+3 Piercing weapon with climbing advantage.',
            quantity: 1,
            damage: '1d8 + 3 Piercing',
            bonus: '+5 to hit',
            valueGold: 55,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Ice Pick', type: 'weapon', description: 'ice pick' }),
          },
          {
            id: 'fh-1-item-2',
            name: 'Thermal Mammoth Furs',
            type: 'armor',
            description: 'Thick insulated enchanted furs granting cold immunity.',
            quantity: 1,
            acBonus: 3,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Mammoth Furs', type: 'armor', description: 'fur armor' }),
          },
          {
            id: 'fh-1-item-3',
            name: 'Flask of Dragonfire Spirit Elixir',
            type: 'potion',
            description: 'Warms core and gives +10 temp HP.',
            quantity: 2,
            valueGold: 55,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Dragonfire Spirit', type: 'potion', description: 'potion' }),
          },
        ],
      },
      {
        id: 'hero-frost-2',
        name: 'Ignis Ember-Scale',
        title: 'Pyromancer Wyrm-Seeker',
        race: 'Dragonborn',
        gender: 'Female',
        className: 'Sorcerer',
        background: 'Clan Exile',
        alignment: 'Neutral Good',
        storyMotivation: 'Her red dragon lineage compels her to reclaim the ancient Frostfire hoard and master both elemental extremes.',
        customTrait: 'Draconic Flame: Natural inner furnace granting +2 to Fire spell attack rolls in freezing environments.',
        stats: { str: 12, dex: 13, con: 14, int: 10, wis: 10, cha: 16 },
        hp: 10,
        ac: 13,
        portraitPrompt: 'Noble female red Dragonborn sorceress channeling radiant orange flames from her claws amidst a howling glacial blizzard.',
        portraitUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'fh-2-item-1',
            name: 'Amulet of the Frost-Ward',
            type: 'quest',
            description: 'Runic amulet resisting freezing winds.',
            quantity: 1,
            valueGold: 85,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Frost Ward Amulet', type: 'quest', description: 'amulet' }),
          },
          {
            id: 'fh-2-item-2',
            name: 'Flask of Dragonfire Spirit Elixir',
            type: 'potion',
            description: 'Fiery restorative draught.',
            quantity: 2,
            valueGold: 55,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Dragonfire Spirit', type: 'potion', description: 'potion' }),
          },
        ],
      },
    ],
  },
  {
    id: 'desert-tomb',
    title: 'Desert Tomb of the Dragon Pharaoh',
    theme: 'Ancient Sands & Pharaoh Crypts',
    premise: 'Uncover the lost golden ziggurat beneath the shifting dunes of the Calim wastes, avoiding ancient hieroglyphic poison traps and awakening guardian mummies and sand elementals.',
    recommendedRaces: ['Dragonborn', 'Genasi (Elemental)', 'Tabaxi', 'Half-Orc', 'Human'],
    recommendedClasses: ['Rogue', 'Fighter', 'Wizard', 'Sorcerer', 'Monk'],
    thematicBackgrounds: ['Tomb Raider & Relic Hunter', 'Caravan Scout', 'Desert Mystic'],
    environmentLore: 'Scorching sun dunes by day, freezing sands by night, and trap-riddled sandstone vaults.',
    dangerRating: 'High • Toxic Traps & Sand Golems',
    thematicItems: [
      {
        id: 'story-item-13',
        name: 'Scimitar of the Sun Dunes',
        type: 'weapon',
        description: 'Curved golden blade infused with solar flames. 1d6+3 Slashing + 1d4 Fire.',
        quantity: 1,
        damage: '1d6 + 3 Slashing + 1d4 Fire',
        bonus: '+5 to hit',
        valueGold: 80,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Sun Dune Scimitar', type: 'weapon', description: 'golden scimitar sword' }),
      },
      {
        id: 'story-item-14',
        name: 'Scarab of Trap Dissolution',
        type: 'misc',
        description: 'Brass talisman that pulses warm vibrations when standing within 10 feet of hidden traps.',
        quantity: 1,
        bonus: '+3 to Passive Perception & Investigation',
        valueGold: 70,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Trap Scarab', type: 'misc', description: 'golden scarab amulet' }),
      },
      {
        id: 'story-item-15',
        name: 'Ever-Replenishing Waterskin',
        type: 'quest',
        description: 'Enchanted waterskin that never runs dry, preventing dehydration in harsh wastelands.',
        quantity: 1,
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Ever-Full Waterskin', type: 'quest', description: 'leather flask waterskin' }),
      },
      {
        id: 'story-item-16',
        name: 'Linen Veil of Dust Shielding',
        type: 'armor',
        description: 'Woven protective cowl granting immunity to sandstorm blindness and poison gas.',
        quantity: 1,
        acBonus: 1,
        valueGold: 45,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Dust Shielding Veil', type: 'armor', description: 'desert scarf veil' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-desert-1',
        name: 'Rashad Dune-Walker',
        title: 'Calim Tomb Delver & Relic Raider',
        race: 'Tabaxi',
        gender: 'Male',
        className: 'Rogue',
        background: 'Tomb Raider & Relic Hunter',
        alignment: 'Chaotic Good',
        storyMotivation: 'Has mapped the ancient stars to locate the Pharaoh\'s burial vault and plunder its forbidden star-charts.',
        customTrait: 'Feline Agility: Double movement bursts to leap over collapsing floor trap triggers.',
        stats: { str: 10, dex: 17, con: 13, int: 14, wis: 12, cha: 10 },
        hp: 9,
        ac: 15,
        portraitPrompt: 'Sleek male Tabaxi rogue in sand-colored desert leathers and golden hieroglyphic bracers twirling a sun scimitar inside a golden ziggurat.',
        portraitUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'dh-1-item-1',
            name: 'Scimitar of the Sun Dunes',
            type: 'weapon',
            description: '1d6+3 Slashing + 1d4 Fire damage.',
            quantity: 1,
            damage: '1d6 + 3 Slashing + 1d4 Fire',
            bonus: '+5 to hit',
            valueGold: 80,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Sun Scimitar', type: 'weapon', description: 'scimitar' }),
          },
          {
            id: 'dh-1-item-2',
            name: 'Scarab of Trap Dissolution',
            type: 'misc',
            description: 'Pulses near hidden poison darts and pressure plates.',
            quantity: 1,
            valueGold: 70,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Scarab', type: 'misc', description: 'scarab' }),
          },
          {
            id: 'dh-1-item-3',
            name: 'Ever-Replenishing Waterskin',
            type: 'quest',
            description: 'Endless fresh water.',
            quantity: 1,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Waterskin', type: 'quest', description: 'waterskin' }),
          },
        ],
      },
      {
        id: 'hero-desert-2',
        name: 'Zephyr Oasis-Guard',
        title: 'Sun-Dune Dervish',
        race: 'Genasi (Elemental)',
        gender: 'Female',
        className: 'Monk',
        background: 'Caravan Scout',
        alignment: 'Lawful Neutral',
        storyMotivation: 'Protector of the Calim oasis trade routes sent to pacify the awakened sand guardians.',
        customTrait: 'Sandstep: Disappears in gusts of sand when dodging enemy strikes.',
        stats: { str: 10, dex: 16, con: 14, int: 10, wis: 16, cha: 8 },
        hp: 11,
        ac: 16,
        portraitPrompt: 'Athletic female Fire Genasi monk with burning amber eyes and desert robes executing a whirlwind kick amidst swirling sands.',
        portraitUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'dh-2-item-1',
            name: 'Linen Veil of Dust Shielding',
            type: 'armor',
            description: 'Woven protective cowl granting immunity to sandstorm blindness.',
            quantity: 1,
            acBonus: 1,
            valueGold: 45,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Veil', type: 'armor', description: 'veil' }),
          },
          {
            id: 'dh-2-item-2',
            name: 'Ever-Replenishing Waterskin',
            type: 'quest',
            description: 'Never-ending water supply.',
            quantity: 1,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Waterskin', type: 'quest', description: 'waterskin' }),
          },
        ],
      },
    ],
  },
  {
    id: 'feywild-realm',
    title: 'The Feywild Thorn Realm & Mirror Glade',
    theme: 'Whimsical Arcane & Illusory Forests',
    premise: 'Investigate an enchanted border woodland where an otherworldly archfey has entangled reality in thorny brambles, trapped wanderers in timeless slumber, and placed mirror doppelgangers in power.',
    recommendedRaces: ['High Elf', 'Wood Elf', 'Gnome', 'Halfling', 'Aasimar', 'Tabaxi'],
    recommendedClasses: ['Druid', 'Bard', 'Ranger', 'Warlock', 'Sorcerer'],
    thematicBackgrounds: ['Fey-Lost Wanderer', 'Court Herbalist', 'Planar Envoy'],
    environmentLore: 'Luminescent toadstool groves, whispering willows, twilight glades, and trickster fairy circles.',
    dangerRating: 'Moderate • Mind Charms & Polymorph Traps',
    thematicItems: [
      {
        id: 'story-item-17',
        name: 'Ironwood Thistle Shield',
        type: 'armor',
        description: 'Living wooden buckler that sprouts protective brambles when struck in melee.',
        quantity: 1,
        acBonus: 3,
        bonus: 'Reflects 1d4 piercing to melee attackers',
        valueGold: 65,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Ironwood Thistle Shield', type: 'armor', description: 'wooden shield vines' }),
      },
      {
        id: 'story-item-18',
        name: 'Silver Compass of Lost Paths',
        type: 'quest',
        description: 'Always points toward truth, bypassing fairy illusions, mirages, and maze disorientations.',
        quantity: 1,
        bonus: 'Advantage on Insight & Navigation',
        valueGold: 75,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Fey Compass', type: 'quest', description: 'silver compass relic' }),
      },
      {
        id: 'story-item-19',
        name: 'Draught of Lucid Clarity',
        type: 'potion',
        description: 'Instantly breaks charm, sleep, and confusion conditions on consumer.',
        quantity: 2,
        valueGold: 50,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Lucid Clarity Draught', type: 'potion', description: 'sparkling green elixir' }),
      },
      {
        id: 'story-item-20',
        name: 'Pouch of Shimmering Faerie Dust',
        type: 'misc',
        description: 'Throws a 15ft cloud of sparkling dust revealing invisible foes and outlining targets.',
        quantity: 2,
        valueGold: 45,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Faerie Dust Pouch', type: 'misc', description: 'glowing pouch dust' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-fey-1',
        name: 'Sylas Meadow-Whisper',
        title: 'Thorn Glade Warden',
        race: 'Wood Elf',
        gender: 'Non-Binary',
        className: 'Druid',
        background: 'Fey-Lost Wanderer',
        alignment: 'Chaotic Good',
        storyMotivation: 'Bound by oath to rescue the trapped souls wandering inside the archfey\'s endless twilight maze.',
        customTrait: 'Bramble Walker: Ignores enchanted briars and can hear whispers from ancient tree roots.',
        stats: { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 10 },
        hp: 10,
        ac: 15,
        portraitPrompt: 'Enchanting non-binary Wood Elf druid crowned with glowing wildflowers and moss holding a living thornwood staff in a bioluminescent twilight fairy forest.',
        portraitUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'fy-1-item-1',
            name: 'Ironwood Thistle Shield',
            type: 'armor',
            description: 'Living shield that counters melee strikes with thorns.',
            quantity: 1,
            acBonus: 3,
            valueGold: 65,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Thistle Shield', type: 'armor', description: 'wooden shield' }),
          },
          {
            id: 'fy-1-item-2',
            name: 'Silver Compass of Lost Paths',
            type: 'quest',
            description: 'Bypasses illusions and faerie mazes.',
            quantity: 1,
            valueGold: 75,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Fey Compass', type: 'quest', description: 'compass' }),
          },
          {
            id: 'fy-1-item-3',
            name: 'Draught of Lucid Clarity',
            type: 'potion',
            description: 'Breaks charm and sleep enchantments.',
            quantity: 2,
            valueGold: 50,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Lucid Draught', type: 'potion', description: 'potion' }),
          },
        ],
      },
      {
        id: 'hero-fey-2',
        name: 'Aria Silver-String',
        title: 'Court Troubadour & Mirror Trickster',
        race: 'Gnome',
        gender: 'Female',
        className: 'Bard',
        background: 'Planar Envoy',
        alignment: 'Chaotic Good',
        storyMotivation: 'Challenged the Archfey to a duel of musical wits to free the slumbering townsfolk.',
        customTrait: 'Fey Counter-Chime: Can play chords that shatter auditory hallucinations and faerie slumber.',
        stats: { str: 8, dex: 15, con: 13, int: 14, wis: 10, cha: 16 },
        hp: 9,
        ac: 14,
        portraitPrompt: 'Cheerful female Gnome bard with lilac hair strumming a glowing crystal lute surrounded by dancing fairy motes.',
        portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'fy-2-item-1',
            name: 'Pouch of Shimmering Faerie Dust',
            type: 'misc',
            description: 'Reveals hidden creatures in 15ft radius.',
            quantity: 2,
            valueGold: 45,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Faerie Dust', type: 'misc', description: 'pouch' }),
          },
          {
            id: 'fy-2-item-2',
            name: 'Draught of Lucid Clarity',
            type: 'potion',
            description: 'Breaks sleep and confusion spells.',
            quantity: 2,
            valueGold: 50,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Lucid Draught', type: 'potion', description: 'potion' }),
          },
        ],
      },
    ],
  },
  {
    id: 'arcanepunk-heist',
    title: 'Arcanepunk Sky-Guild Heist',
    theme: 'Steampunk, Airships & Arcane Espionage',
    premise: 'Infiltrate the high-altitude cloud fortress of the corrupt Iron Mage Guild during a thunderous masquerade ball to bypass clockwork sentries and steal the overclocked Astral Reactor Core.',
    recommendedRaces: ['Warforged / Automaton', 'Gnome', 'Kenku / Ravenfolk', 'Tiefling', 'Human', 'Halfling'],
    recommendedClasses: ['Rogue', 'Wizard', 'Bard', 'Fighter', 'Monk'],
    thematicBackgrounds: ['Master Infiltrator', 'Guild Artificer', 'Sky Pirate & Aeronaut'],
    environmentLore: 'Brass pipe conduits, mana-steam turbines, dizzying cloud catwalks, and lightning dynamos.',
    dangerRating: 'Deadly • Clockwork Automata & Arcane Alarms',
    thematicItems: [
      {
        id: 'story-item-21',
        name: 'Pneumatic Grappling Wire Launcher',
        type: 'misc',
        description: 'Wrist-mounted gas launcher with 50ft high-tensile steel cable for rapid vertical ascents.',
        quantity: 1,
        valueGold: 70,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Grappling Wire Launcher', type: 'misc', description: 'wrist grappling wire' }),
      },
      {
        id: 'story-item-22',
        name: 'Overcharged Arcane Bypass Key',
        type: 'misc',
        description: 'Magnetic tuning fork that disarms clockwork locks and jams magitech alarms.',
        quantity: 1,
        bonus: '+5 on Thieves Tools & Magitech checks',
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Bypass Key', type: 'misc', description: 'brass tuning key' }),
      },
      {
        id: 'story-item-23',
        name: 'Smoke Pellet & Flash Canister',
        type: 'potion',
        description: 'Creates a 20ft radius cloud of blinding white smoke for emergency tactical escapes.',
        quantity: 2,
        valueGold: 40,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Smoke Canister', type: 'potion', description: 'smoke grenade flask' }),
      },
      {
        id: 'story-item-24',
        name: 'Aeronaut Goggles of Thermal Sight',
        type: 'armor',
        description: 'Brass tinted goggles revealing mana conduits, invisible sensors, and hidden traps.',
        quantity: 1,
        acBonus: 1,
        bonus: 'Darkvision 60ft & Trap Detection',
        valueGold: 85,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Aeronaut Goggles', type: 'armor', description: 'brass goggles leather' }),
      },
    ],
    bespokeHeroes: [
      {
        id: 'hero-steam-1',
        name: 'Cog-07 "Cipher"',
        title: 'Rogue Automaton Infiltrator',
        race: 'Warforged / Automaton',
        gender: 'Non-Binary',
        className: 'Rogue',
        background: 'Master Infiltrator',
        alignment: 'Chaotic Good',
        storyMotivation: 'Designed by the Iron Guild as an assassin unit; now seeks to steal the Astral Core to liberate fellow clockwork constructs.',
        customTrait: 'Silent Piston Dampeners: Makes zero sound when sprinting across brass catwalks.',
        stats: { str: 12, dex: 17, con: 14, int: 14, wis: 10, cha: 8 },
        hp: 10,
        ac: 16,
        portraitPrompt: 'Intricate brass and obsidian Warforged rogue automaton with glowing blue optic sensors wearing dark aeronaut leather cloak on airship deck.',
        portraitUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'sh-steam-1-1',
            name: 'Pneumatic Grappling Wire Launcher',
            type: 'misc',
            description: 'Wrist-mounted 50ft rapid ascent launcher.',
            quantity: 1,
            valueGold: 70,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Grappling Wire', type: 'misc', description: 'launcher' }),
          },
          {
            id: 'sh-steam-1-2',
            name: 'Overcharged Arcane Bypass Key',
            type: 'misc',
            description: '+5 on lockpicking and clockwork disarm.',
            quantity: 1,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Bypass Key', type: 'misc', description: 'key' }),
          },
          {
            id: 'sh-steam-1-3',
            name: 'Aeronaut Goggles of Thermal Sight',
            type: 'armor',
            description: 'Reveals mana tripwires and invisible guards.',
            quantity: 1,
            acBonus: 1,
            valueGold: 85,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Aeronaut Goggles', type: 'armor', description: 'goggles' }),
          },
        ],
      },
      {
        id: 'hero-steam-2',
        name: 'Gideon Gear-Spark',
        title: 'Sky-Gale Artificer & Demolitionist',
        race: 'Gnome',
        gender: 'Male',
        className: 'Wizard',
        background: 'Guild Artificer',
        alignment: 'Neutral Good',
        storyMotivation: 'Built the containment field for the Astral Reactor; knows the exact frequency to safely extract it before overload.',
        customTrait: 'Overcharge Conduit: Can temporarily boost magical device ranges by 50%.',
        stats: { str: 8, dex: 14, con: 14, int: 17, wis: 12, cha: 10 },
        hp: 8,
        ac: 13,
        portraitPrompt: 'Clever male Gnome artificer wizard with brass goggles, tool belt, and sparks radiating from his knuckles aboard a steam-powered flying ship.',
        portraitUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        items: [
          {
            id: 'sh-steam-2-1',
            name: 'Smoke Pellet & Flash Canister',
            type: 'potion',
            description: 'Creates emergency blinding cloud.',
            quantity: 2,
            valueGold: 40,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Smoke Pellet', type: 'potion', description: 'smoke flask' }),
          },
          {
            id: 'sh-steam-2-2',
            name: 'Overcharged Arcane Bypass Key',
            type: 'misc',
            description: 'Jams magitech sirens.',
            quantity: 1,
            valueGold: 60,
            imageUrl: getFixedPerchanceItemImageUrl({ name: 'Bypass Key', type: 'misc', description: 'key' }),
          },
        ],
      },
    ],
  },
];

/**
 * Returns bespoke hero concepts for any given story premise text
 */
function pickStoryHeroConcepts(storyPremise: string): StoryHeroConcept[] {
  const clean = storyPremise.toLowerCase();
  for (const preset of STORY_REALM_PRESETS) {
    if (clean.includes(preset.title.toLowerCase()) || clean.includes(preset.id)) {
      return preset.bespokeHeroes;
    }
  }

  if (clean.includes('water') || clean.includes('ocean') || clean.includes('sea') || clean.includes('sunken') || clean.includes('abyss') || clean.includes('drown')) {
    return STORY_REALM_PRESETS[0].bespokeHeroes;
  }
  if (clean.includes('vampire') || clean.includes('gothic') || clean.includes('castle') || clean.includes('blood') || clean.includes('undead') || clean.includes('crypt')) {
    return STORY_REALM_PRESETS[1].bespokeHeroes;
  }
  if (clean.includes('ice') || clean.includes('snow') || clean.includes('frost') || clean.includes('frozen') || clean.includes('mountain') || clean.includes('blizzard')) {
    return STORY_REALM_PRESETS[2].bespokeHeroes;
  }
  if (clean.includes('desert') || clean.includes('sand') || clean.includes('pyramid') || clean.includes('mummy') || clean.includes('tomb') || clean.includes('pharaoh')) {
    return STORY_REALM_PRESETS[3].bespokeHeroes;
  }
  if (clean.includes('fey') || clean.includes('forest') || clean.includes('tree') || clean.includes('fairy') || clean.includes('glade') || clean.includes('nature') || clean.includes('thorn')) {
    return STORY_REALM_PRESETS[4].bespokeHeroes;
  }
  if (clean.includes('sky') || clean.includes('steam') || clean.includes('clockwork') || clean.includes('heist') || clean.includes('airship') || clean.includes('guild') || clean.includes('tech')) {
    return STORY_REALM_PRESETS[5].bespokeHeroes;
  }

  // Fallback dynamic hero concepts for custom premises
  return [
    {
      id: 'custom-hero-1',
      name: 'Alden the Resolute',
      title: 'Questbound Pathfinder',
      race: 'Human',
      gender: 'Male',
      className: 'Fighter',
      background: 'Hardened Veteran & Scout',
      alignment: 'Neutral Good',
      storyMotivation: `Vowed to conquer the perils of this realm: ${storyPremise.slice(0, 45)}...`,
      customTrait: 'Indomitable Grit: Gains +2 on saves against environmental fear and paralysis.',
      stats: { str: 16, dex: 13, con: 15, int: 10, wis: 12, cha: 8 },
      hp: 12,
      ac: 16,
      portraitPrompt: `Heroic digital concept portrait of a determined human warrior equipped with rugged exploration armor matching: ${storyPremise.slice(0, 40)}`,
      portraitUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      items: getThematicItemsForPremise(storyPremise),
    },
    {
      id: 'custom-hero-2',
      name: 'Elowen Star-Weft',
      title: 'Seeker of Forgotten Mysteries',
      race: 'High Elf',
      gender: 'Female',
      className: 'Wizard',
      background: 'Ancient Historian',
      alignment: 'Chaotic Good',
      storyMotivation: `Seeks the lost arcane secrets hidden at the core of this quest.`,
      customTrait: 'Keen Analytical Mind: Advantage on Investigation checks regarding ancient relics.',
      stats: { str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 12 },
      hp: 8,
      ac: 12,
      portraitPrompt: `Atmospheric fantasy portrait of an intellectual female High Elf scholar wizard channeling luminous spells matching: ${storyPremise.slice(0, 40)}`,
      portraitUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      items: getThematicItemsForPremise(storyPremise),
    },
    {
      id: 'custom-hero-3',
      name: 'Kaela Shadow-Veil',
      title: 'Shadow Skirmisher & Infiltrator',
      race: 'Tiefling',
      gender: 'Non-Binary',
      className: 'Rogue',
      background: 'Guild Smuggler',
      alignment: 'Chaotic Good',
      storyMotivation: `Navigating the shadowed perimeters to exploit the vulnerabilities of this realm.`,
      customTrait: 'Ghostly Step: Advantage on Stealth checks in dim or hazardous terrain.',
      stats: { str: 10, dex: 16, con: 14, int: 13, wis: 10, cha: 14 },
      hp: 10,
      ac: 15,
      portraitPrompt: `Moody fantasy portrait of a cunning non-binary Tiefling rogue in dark tactical traveling gear matching: ${storyPremise.slice(0, 40)}`,
      portraitUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
      items: getThematicItemsForPremise(storyPremise),
    },
  ];
}

/**
 * Returns thematic items for any given story premise text
 */
function pickThematicItems(storyPremise: string): InventoryItem[] {
  const clean = storyPremise.toLowerCase();
  for (const preset of STORY_REALM_PRESETS) {
    if (clean.includes(preset.title.toLowerCase()) || clean.includes(preset.id)) {
      return preset.thematicItems;
    }
  }

  if (clean.includes('water') || clean.includes('ocean') || clean.includes('sea') || clean.includes('sunken') || clean.includes('abyss') || clean.includes('drown')) {
    return STORY_REALM_PRESETS[0].thematicItems;
  }
  if (clean.includes('vampire') || clean.includes('gothic') || clean.includes('castle') || clean.includes('blood') || clean.includes('undead') || clean.includes('crypt')) {
    return STORY_REALM_PRESETS[1].thematicItems;
  }
  if (clean.includes('ice') || clean.includes('snow') || clean.includes('frost') || clean.includes('frozen') || clean.includes('mountain') || clean.includes('blizzard')) {
    return STORY_REALM_PRESETS[2].thematicItems;
  }
  if (clean.includes('desert') || clean.includes('sand') || clean.includes('pyramid') || clean.includes('mummy') || clean.includes('tomb') || clean.includes('pharaoh')) {
    return STORY_REALM_PRESETS[3].thematicItems;
  }
  if (clean.includes('fey') || clean.includes('forest') || clean.includes('tree') || clean.includes('fairy') || clean.includes('glade') || clean.includes('nature') || clean.includes('thorn')) {
    return STORY_REALM_PRESETS[4].thematicItems;
  }
  if (clean.includes('sky') || clean.includes('steam') || clean.includes('clockwork') || clean.includes('heist') || clean.includes('airship') || clean.includes('guild') || clean.includes('tech')) {
    return STORY_REALM_PRESETS[5].thematicItems;
  }

  // Default custom campaign starter pack
  return [
    {
      id: `story-custom-1`,
      name: 'Enchanted Story Adventurer Kit',
      type: 'misc',
      description: `Specialized provisions and survival gear attuned to: ${storyPremise.slice(0, 40)}...`,
      quantity: 1,
      valueGold: 50,
      imageUrl: getFixedPerchanceItemImageUrl({ name: 'Adventurer Pack', type: 'misc', description: 'backpack travel gear' }),
    },
    {
      id: `story-custom-2`,
      name: 'Luminescent Warding Talisman',
      type: 'quest',
      description: 'An ancient protective talisman blessed for your perilous quest.',
      quantity: 1,
      bonus: '+1 to all Saving Throws',
      valueGold: 75,
      imageUrl: getFixedPerchanceItemImageUrl({ name: 'Warding Talisman', type: 'quest', description: 'protective talisman amulet' }),
    },
    {
      id: `story-custom-3`,
      name: 'Potion of Vigorous Restoration',
      type: 'potion',
      description: 'Restores 3d4 + 3 Hit Points and dispels minor fatigue.',
      quantity: 2,
      valueGold: 55,
      imageUrl: getFixedPerchanceItemImageUrl({ name: 'Vigorous Restoration', type: 'potion', description: 'red potion flask' }),
    },
  ];
}

/**
 * Returns recommended races matching a given story premise
 */
export function getRecommendedRacesForPremise(storyPremise: string): string[] {
  const clean = storyPremise.toLowerCase();
  for (const preset of STORY_REALM_PRESETS) {
    if (clean.includes(preset.title.toLowerCase()) || clean.includes(preset.id)) {
      return preset.recommendedRaces;
    }
  }

  if (clean.includes('water') || clean.includes('ocean') || clean.includes('sea') || clean.includes('sunken') || clean.includes('abyss')) {
    return STORY_REALM_PRESETS[0].recommendedRaces;
  }
  if (clean.includes('vampire') || clean.includes('gothic') || clean.includes('blood') || clean.includes('undead') || clean.includes('crypt')) {
    return STORY_REALM_PRESETS[1].recommendedRaces;
  }
  if (clean.includes('ice') || clean.includes('snow') || clean.includes('frost') || clean.includes('frozen') || clean.includes('mountain')) {
    return STORY_REALM_PRESETS[2].recommendedRaces;
  }
  if (clean.includes('desert') || clean.includes('sand') || clean.includes('pyramid') || clean.includes('tomb')) {
    return STORY_REALM_PRESETS[3].recommendedRaces;
  }
  if (clean.includes('fey') || clean.includes('forest') || clean.includes('fairy') || clean.includes('glade')) {
    return STORY_REALM_PRESETS[4].recommendedRaces;
  }
  if (clean.includes('sky') || clean.includes('clockwork') || clean.includes('heist') || clean.includes('airship')) {
    return STORY_REALM_PRESETS[5].recommendedRaces;
  }

  return ['Human', 'High Elf', 'Mountain Dwarf', 'Half-Elf', 'Tiefling', 'Dragonborn'];
}

const RAW_ITEM_CATALOG: InventoryItem[] = [
  {
    id: 'cat-w1',
    name: 'Radiant Sunblade Longsword',
    type: 'weapon',
    description: 'Forged from solar steel. 1d8+3 slashing +1 radiant bonus.',
    quantity: 1,
    damage: '1d8 + 3 Slashing',
    bonus: '+5 to hit',
    valueGold: 60,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Radiant Sunblade Longsword', type: 'weapon', description: 'solar radiant steel' }),
  },
  {
    id: 'cat-w2',
    name: 'Twin Shadow Daggers',
    type: 'weapon',
    description: 'Quick obsidian blades. 1d4+3 piercing with critical edge.',
    quantity: 1,
    damage: '1d4 + 3 Piercing',
    bonus: '+5 to hit',
    valueGold: 50,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Twin Shadow Daggers', type: 'weapon', description: 'quick obsidian shadow blades' }),
  },
  {
    id: 'cat-w3',
    name: 'Great Berserker Axe',
    type: 'weapon',
    description: 'Heavy two-handed greataxe. 1d12+3 slashing on impact.',
    quantity: 1,
    damage: '1d12 + 3 Slashing',
    bonus: '+5 to hit',
    valueGold: 55,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Great Berserker Axe', type: 'weapon', description: 'heavy two-handed greataxe' }),
  },
  {
    id: 'cat-w4',
    name: 'Arcane Frost Staff',
    type: 'weapon',
    description: 'Crystal topped staff pulsing with chilling arcane focus.',
    quantity: 1,
    damage: '1d6 + 2 Cold',
    bonus: '+5 spell attack',
    valueGold: 50,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Arcane Frost Staff', type: 'weapon', description: 'crystal topped staff chilling arcane focus' }),
  },
  {
    id: 'cat-w5',
    name: 'Yew Longbow & Quiver',
    type: 'weapon',
    description: 'Elven composite bow with 30 broadhead arrows.',
    quantity: 1,
    damage: '1d8 + 3 Piercing',
    bonus: '+5 to hit (Range 150/600)',
    valueGold: 50,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Yew Longbow & Quiver', type: 'weapon', description: 'elven composite bow with arrows' }),
  },
  {
    id: 'cat-w6',
    name: 'Duelist Rapier',
    type: 'weapon',
    description: 'Nimble fencing sword for precise thrusts.',
    quantity: 1,
    damage: '1d8 + 3 Piercing',
    bonus: '+5 to hit',
    valueGold: 45,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Duelist Rapier', type: 'weapon', description: 'nimble fencing sword' }),
  },
  {
    id: 'cat-a1',
    name: 'Heavy Plate & Tower Shield',
    type: 'armor',
    description: 'Impenetrable steel plates offering maximum protection.',
    quantity: 1,
    acBonus: 8,
    valueGold: 80,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Heavy Plate & Tower Shield', type: 'armor', description: 'impenetrable steel plates shield' }),
  },
  {
    id: 'cat-a2',
    name: 'Studded Leather Armor',
    type: 'armor',
    description: 'Flexible leather hardened with brass rivets for silent stealth.',
    quantity: 1,
    acBonus: 3,
    valueGold: 45,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Studded Leather Armor', type: 'armor', description: 'flexible leather brass rivets' }),
  },
  {
    id: 'cat-a3',
    name: 'Mage Silk Robe',
    type: 'armor',
    description: 'Spun with warding glyphs to deflect incoming hostile magic.',
    quantity: 1,
    acBonus: 2,
    valueGold: 40,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Mage Silk Robe', type: 'armor', description: 'spun with warding glyphs' }),
  },
  {
    id: 'cat-a4',
    name: 'Scale Mail & Shield',
    type: 'armor',
    description: 'Overlapping steel scales offering solid mobility and defense.',
    quantity: 1,
    acBonus: 5,
    valueGold: 50,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Scale Mail & Shield', type: 'armor', description: 'overlapping steel scales shield' }),
  },
  {
    id: 'cat-p1',
    name: 'Potion of Greater Healing',
    type: 'potion',
    description: 'Restores 4d4 + 4 Hit Points when consumed as a bonus action.',
    quantity: 2,
    valueGold: 70,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Potion of Greater Healing', type: 'potion', description: 'healing draught red potion' }),
  },
  {
    id: 'cat-p2',
    name: 'Elixir of Mana & Focus',
    type: 'potion',
    description: 'Restores spell vitality and sharpens perception.',
    quantity: 2,
    valueGold: 50,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Elixir of Mana & Focus', type: 'potion', description: 'mana purple elixir' }),
  },
  {
    id: 'cat-p3',
    name: 'Flask of Alchemist Fire',
    type: 'potion',
    description: 'Throws a burst of sticky flames dealing 2d6 ongoing fire damage.',
    quantity: 2,
    valueGold: 40,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Flask of Alchemist Fire', type: 'potion', description: 'alchemist orange fire explosive' }),
  },
  {
    id: 'cat-m1',
    name: 'Thieves Tools & Lockpicks',
    type: 'misc',
    description: 'Finely crafted tension wrenches and skeleton picks for picking locks and disarming traps.',
    quantity: 1,
    valueGold: 30,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Thieves Tools & Lockpicks', type: 'misc', description: 'lockpicks and skeleton keys' }),
  },
  {
    id: 'cat-m2',
    name: 'Ancient Rune Scroll of Fireball',
    type: 'scroll',
    description: 'Single-use arcane parchment unleashing a blazing 8d6 explosion.',
    quantity: 1,
    valueGold: 90,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Ancient Rune Scroll of Fireball', type: 'scroll', description: 'arcane rune parchment fire scroll' }),
  },
  {
    id: 'cat-m3',
    name: 'Glowing Sunstone Relic',
    type: 'quest',
    description: 'Warm enchanted mineral that illuminates dark halls and repels necrotic wraiths.',
    quantity: 1,
    valueGold: 100,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Glowing Sunstone Relic', type: 'quest', description: 'glowing enchanted gem ring relic' }),
  },
  {
    id: 'cat-m4',
    name: 'Silk Rope & Grappling Hook',
    type: 'misc',
    description: '50 feet of lightweight spider-silk rope tested to hold 500 lbs.',
    quantity: 1,
    valueGold: 20,
    imageUrl: getFixedPerchanceItemImageUrl({ name: 'Silk Rope & Grappling Hook', type: 'misc', description: 'grappling hook rope' }),
  },
];

export const STORY_PREMISE_SUGGESTIONS = [
  {
    title: 'Gothic Castle of the Blood Sovereign',
    premise: 'Infiltrate Castle Ravencrest in the jagged mist-shrouded crags to break the curse of an immortal vampire sovereign holding the realm under eternal eclipse.',
    theme: 'Dark Gothic Horror',
  },
  {
    title: 'Sunken Crypt of Kazal-Dûr',
    premise: 'Explore the flooded subterranean halls of an ancient dwarven necropolis in search of a lost celestial sunstone before necrotic specters break free.',
    theme: 'Dungeon Crawl & Mystery',
  },
  {
    title: 'Desert Tomb of the Dragon Pharaoh',
    premise: 'Uncover the lost golden ziggurat beneath the shifting sands of the Calim wastes, avoiding ancient hieroglyphic traps and awakening guardian mummies.',
    theme: 'Ancient Sands & Treasure',
  },
  {
    title: 'The Feywild Thorn Realm',
    premise: 'Investigate a vanishing border village where an ethereal fairy lord has frozen time and replaced the townsfolk with mirror-realm doppelgangers.',
    theme: 'Whimsical & Arcane Mystery',
  },
  {
    title: 'Arcanepunk Sky-Guild Heist',
    premise: 'Infiltrate the high-altitude floating fortress of the corrupt Iron Mage Guild during a thunderous masquerade ball to steal the Astral Core.',
    theme: 'Steampunk & Magic Heist',
  },
];
const RAW_PRESET_HEROES: Character[] = [
  {
    name: 'Valen Shadowstride',
    race: 'Half-Elf',
    gender: 'Non-Binary',
    className: 'Rogue / Scout',
    level: 2,
    hp: 18,
    maxHp: 18,
    tempHp: 0,
    ac: 15,
    initiativeBonus: 3,
    speed: 30,
    gold: 45,
    background: 'Outlander / Guild Outcast',
    alignment: 'Chaotic Good',
    portraitUrl: '',
    portraitPrompt: 'A cunning non-binary half-elf rogue with raven hair, hooded leather mantle, twin silver daggers, glowing amber eyes in dim dungeon torchlight, fantasy RPG concept art portrait.',
    stats: {
      str: 10,
      dex: 16,
      con: 14,
      int: 12,
      wis: 14,
      cha: 10,
    },
    inventory: [
      {
        id: 'item-1',
        name: 'Elven Dagger of Sparks',
        type: 'weapon',
        description: 'Finely honed dagger humming with faint lightning.',
        quantity: 1,
        equipped: true,
        damage: '1d4 + 3 Piercing (+1 Shock)',
        bonus: '+5 to hit',
        valueGold: 50,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Elven Dagger of Sparks', type: 'weapon', description: 'lightning shock dagger' }),
      },
      {
        id: 'item-2',
        name: 'Reinforced Studded Leather',
        type: 'armor',
        description: 'Supple leather with dark brass studs.',
        quantity: 1,
        equipped: true,
        acBonus: 2,
        valueGold: 45,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Reinforced Studded Leather', type: 'armor', description: 'leather brass studs' }),
      },
      {
        id: 'item-3',
        name: 'Potion of Greater Healing',
        type: 'potion',
        description: 'Restores 4d4 + 4 Hit Points when consumed.',
        quantity: 2,
        valueGold: 80,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Potion of Greater Healing', type: 'potion', description: 'healing red potion' }),
      },
      {
        id: 'item-4',
        name: 'Thieves Tools & Lockpicks',
        type: 'misc',
        description: 'Essential for disarming ancient dungeon traps.',
        quantity: 1,
        valueGold: 25,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Thieves Tools & Lockpicks', type: 'misc', description: 'lockpicks and skeleton keys' }),
      },
      {
        id: 'item-5',
        name: 'Glowing Sunstone',
        type: 'quest',
        description: 'A warm stone that repels shadowy creatures.',
        quantity: 1,
        valueGold: 100,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Glowing Sunstone', type: 'quest', description: 'sunstone gem ring' }),
      },
    ],
  },
  {
    name: 'Kaelen Sunforged',
    race: 'Human',
    gender: 'Male',
    className: 'Paladin of Dawn',
    level: 2,
    hp: 22,
    maxHp: 22,
    tempHp: 0,
    ac: 17,
    initiativeBonus: 0,
    speed: 30,
    gold: 30,
    background: 'Order of the Sun Vanguard',
    alignment: 'Lawful Good',
    portraitUrl: '',
    portraitPrompt: 'A resolute human male paladin in polished sun-crested steel plate armor with a glowing radiant longsword and golden eyes, heroic fantasy portrait.',
    stats: {
      str: 16,
      dex: 10,
      con: 15,
      int: 10,
      wis: 12,
      cha: 14,
    },
    inventory: [
      {
        id: 'item-p1',
        name: 'Radiant Sunblade Longsword',
        type: 'weapon',
        description: 'Glows with the holy light of the dawn.',
        quantity: 1,
        equipped: true,
        damage: '1d8 + 3 Slashing',
        bonus: '+5 to hit',
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Radiant Sunblade Longsword', type: 'weapon', description: 'radiant sun longsword blade' }),
      },
      {
        id: 'item-p2',
        name: 'Chain Mail & Tower Shield',
        type: 'armor',
        description: 'Heavy protective armor bearing an emblazoned sun.',
        quantity: 1,
        equipped: true,
        acBonus: 7,
        valueGold: 75,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Chain Mail & Tower Shield', type: 'armor', description: 'chain mail steel shield' }),
      },
      {
        id: 'item-p3',
        name: 'Healing Draught',
        type: 'potion',
        description: 'Heals 2d4 + 2 HP.',
        quantity: 2,
        valueGold: 40,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Healing Draught', type: 'potion', description: 'healing red potion draught' }),
      },
    ],
  },
  {
    name: 'Elyndra Winterweaver',
    race: 'Moon Elf',
    gender: 'Female',
    className: 'Evoker Wizard',
    level: 2,
    hp: 14,
    maxHp: 14,
    tempHp: 0,
    ac: 12,
    initiativeBonus: 2,
    speed: 30,
    gold: 55,
    background: 'Arcane Scholar of the Astral Spire',
    alignment: 'Neutral Good',
    portraitUrl: '',
    portraitPrompt: 'An elegant moon elf female wizard with silver hair, midnight blue arcane robes, holding an orb of frost and ancient spellbook, ethereal fantasy concept art.',
    stats: {
      str: 8,
      dex: 14,
      con: 13,
      int: 17,
      wis: 13,
      cha: 10,
    },
    inventory: [
      {
        id: 'item-w1',
        name: 'Frostbite Staff',
        type: 'weapon',
        description: 'Channels freezing arcane blasts.',
        quantity: 1,
        equipped: true,
        damage: '1d6 + 2 Cold',
        bonus: '+5 to spell attack',
        valueGold: 50,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Frostbite Staff', type: 'weapon', description: 'frost arcane crystal staff' }),
      },
      {
        id: 'item-w2',
        name: 'Mage Silk Robe',
        type: 'armor',
        description: 'Woven with protective wards.',
        quantity: 1,
        equipped: true,
        acBonus: 2,
        valueGold: 40,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Mage Silk Robe', type: 'armor', description: 'silk arcane robe' }),
      },
      {
        id: 'item-w3',
        name: 'Elixir of Mana & Health',
        type: 'potion',
        description: 'Restores 2d4 + 2 HP and spell focus.',
        quantity: 3,
        valueGold: 60,
        imageUrl: getFixedPerchanceItemImageUrl({ name: 'Elixir of Mana & Health', type: 'potion', description: 'mana purple elixir potion' }),
      },
    ],
  },
];

// Every item shown anywhere in the game is routed through here, so a sprite is
// generated up front rather than lazily at render time. Items that already
// carry artwork keep it; the rest get a deterministic Perchance image.
function withHeroLoadoutSprites(hero: StoryHeroConcept): StoryHeroConcept {
  return { ...hero, items: ensureItemSprites(hero.items) };
}

export const STORY_REALM_PRESETS: StoryRealmPreset[] = RAW_STORY_REALM_PRESETS.map((preset) => ({
  ...preset,
  thematicItems: ensureItemSprites(preset.thematicItems),
  bespokeHeroes: (preset.bespokeHeroes || []).map(withHeroLoadoutSprites),
}));

export const ITEM_CATALOG: InventoryItem[] = ensureItemSprites(RAW_ITEM_CATALOG);

export const PRESET_HEROES: Character[] = RAW_PRESET_HEROES.map((hero) => ({
  ...hero,
  inventory: ensureItemSprites(hero.inventory),
}));

export function getStoryHeroConceptsForPremise(storyPremise: string): StoryHeroConcept[] {
  return pickStoryHeroConcepts(storyPremise).map(withHeroLoadoutSprites);
}

export function getThematicItemsForPremise(storyPremise: string): InventoryItem[] {
  return ensureItemSprites(pickThematicItems(storyPremise));
}

export const INITIAL_LOCATION: LocationInfo = {
  name: 'Sunken Crypt of Kazal-Dûr',
  region: 'The Shadowed Crags',
  atmosphere: 'Cold mist pools across damp flagstones. Faint cerulean runes pulse on the ceiling.',
  dangerLevel: 'Medium',
  sceneryPrompt: 'A vast gothic underground dungeon crypt with ancient stone sarcophagi, glowing blue arcane runes carved into towering mossy arches, swirling mist, and torchlight reflecting on water puddles, dark fantasy digital painting.',
};

export const INITIAL_STORY = `The heavy iron-reinforced stone slab grinds shut behind you with a shuddering echo, sealing out the howling mountain gale. You find yourself standing at the precipice of the Sunken Crypt of Kazal-Dûr.

Before you lies a colossal vaulted hall submerged in knee-deep chilly subterranean waters. Phosphorescent moss clings to the decaying pillars, illuminating centuries-old runic carvings. In the center of the hall, upon a raised obsidian altar, rests an ornate chest draped in spiked iron chains. 

Suddenly, the cold air stirs. Two red spectral eyes ignite within the hollow visor of a skeletal warrior armored in rusted chainmail, slowly drawing an ancient notched broadsword as it descends the stone dais!`;

export const INITIAL_CHOICES = [
  {
    id: 'choice-1',
    label: 'Draw weapon and rush the Skeletal Guardian',
    description: 'Attack first before it fully awakens its battle stances.',
    combatAction: true,
    riskLevel: 'moderate' as const,
    check: {
      ability: 'STR' as const,
      skillName: 'Melee Attack',
      dc: 12,
      reason: 'Overcome the guardian’s ancient parrying guard and strike.',
    },
  },
  {
    id: 'choice-2',
    label: 'Slip into the shadows behind the mossy pillars',
    description: 'Attempt a stealth ambush to strike from the rear.',
    riskLevel: 'safe' as const,
    check: {
      ability: 'DEX' as const,
      skillName: 'Stealth',
      dc: 11,
      reason: 'Muffle your footsteps in the shallow water and disappear in the gloom.',
    },
  },
  {
    id: 'choice-3',
    label: 'Decipher the glowing blue runes on the arches',
    description: 'Check if an arcane command word can banish or pacify the undead.',
    riskLevel: 'moderate' as const,
    check: {
      ability: 'INT' as const,
      skillName: 'Arcana',
      dc: 13,
      reason: 'Read the ancient dwarven warding script before the skeleton reaches you.',
    },
  },
  {
    id: 'choice-4',
    label: 'Channel divine / radiant energy and shout a command',
    description: 'Use holy presence or raw force of will to ward off the construct.',
    riskLevel: 'risky' as const,
    check: {
      ability: 'CHA' as const,
      skillName: 'Intimidation / Turn Undead',
      dc: 14,
      reason: 'Project your aura to shatter the necromantic bind on the guardian.',
    },
  },
];
