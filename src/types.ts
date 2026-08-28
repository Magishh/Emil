export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type RuleStrictness = 'hard' | 'soft' | 'none';

export type DifficultyLevel = 'story' | 'standard' | 'heroic' | 'nightmare';

export interface CampaignSettings {
  ruleStrictness: RuleStrictness;
  difficulty: DifficultyLevel;
  storyPremise: string;
}

export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type StatusEffectType = 'buff' | 'debuff' | 'neutral';

export interface StatusEffect {
  id: string;
  name: string;
  type: StatusEffectType;
  description: string;
  mechanicalEffect?: string;
  durationTurns?: number; // e.g. 3 turns remaining (undefined = indefinite / until cured)
  icon?: string;
  color?: string;
  source?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'misc' | 'quest';
  description: string;
  quantity: number;
  weight?: number;
  equipped?: boolean;
  bonus?: string;
  valueGold?: number;
  damage?: string;
  acBonus?: number;
  imageUrl?: string;
  isCustom?: boolean;
  rarity?: string;
}

export interface CustomRace {
  id: string;
  name: string;
  lore: string;
  traits?: string;
  racialTraits?: string;
  statBonuses?: Partial<CharacterStats>;
  speed?: number;
  senses?: string;
  specialAbility?: string;
  isCustom?: boolean;
}

export interface CustomClass {
  id: string;
  name: string;
  hitDie: 'd6' | 'd8' | 'd10' | 'd12' | number;
  primary?: string;
  primaryAbility?: string;
  description: string;
  defaultStats?: CharacterStats;
  defaultItems?: string[];
  startingEquipment?: string[];
  hp?: number;
  baseHp?: number;
  ac?: number;
  baseAc?: number;
  specialAbility?: string;
  icon?: string;
  isCustom?: boolean;
}

export interface Character {
  name: string;
  race: string;
  gender?: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  initiativeBonus: number;
  speed: number;
  gold: number;
  stats: CharacterStats;
  inventory: InventoryItem[];
  portraitUrl: string;
  portraitPrompt?: string;
  xp?: number;
  background: string;
  alignment: string;
  spellSlots?: { current: number; max: number; level: number }[];
  statusEffects?: StatusEffect[];
}

export interface SkillCheckRequirement {
  ability: Ability;
  skillName?: string;
  dc: number;
  reason: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  description?: string;
  check?: SkillCheckRequirement;
  combatAction?: boolean;
  itemRequirement?: string;
  riskLevel?: 'safe' | 'moderate' | 'risky' | 'deadly';
}

export interface StoryLogEntry {
  id: string;
  timestamp: number;
  type: 'narrative' | 'dm_dialogue' | 'player_action' | 'check_result' | 'combat' | 'loot' | 'system';
  content: string;
  speaker?: string;
  rollDetails?: {
    roll: number;
    modifier: number;
    total: number;
    dc?: number;
    success?: boolean;
    isCritical?: boolean;
    isFumble?: boolean;
    label: string;
  };
}

export interface LocationInfo {
  name: string;
  region: string;
  atmosphere: string;
  dangerLevel: 'Safe' | 'Low' | 'Medium' | 'High' | 'Extreme';
  sceneryPrompt: string;
  sceneryImageUrl?: string;
}

export interface CampaignState {
  campaignId: string;
  campaignTitle: string;
  settings: CampaignSettings;
  character: Character;
  currentLocation: LocationInfo;
  currentStory: string;
  choices: StoryChoice[];
  pendingCheck: SkillCheckRequirement | null;
  pendingActionDescription: string | null;
  history: StoryLogEntry[];
  turnCount: number;
  inCombat: boolean;
  combatEnemy?: {
    name: string;
    hp: number;
    maxHp: number;
    ac: number;
    description: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface ActiveDiceRoll {
  id: string;
  dieType: DieType;
  baseRoll: number;
  modifier: number;
  total: number;
  dc?: number;
  success?: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
  purpose: string;
  timestamp: number;
  diceCount?: number;
}

export interface StoryHeroConcept {
  id: string;
  name: string;
  title: string;
  race: string;
  gender: string;
  className: string;
  class?: string;
  background: string;
  alignment: string;
  storyMotivation: string;
  stats: CharacterStats;
  hp: number;
  ac: number;
  items: InventoryItem[];
  portraitPrompt: string;
  portraitUrl?: string;
  customTrait?: string;
}

export type GeminiVoiceName = 'Fenrir' | 'Charon' | 'Zephyr' | 'Kore' | 'Puck';

export interface NarratorVoiceOption {
  id: GeminiVoiceName;
  name: string;
  title: string;
  gender: string;
  tone: string;
  description: string;
  samplePhrase: string;
}

export interface NarratorSettings {
  engine: 'gemini' | 'browser';
  geminiVoice: GeminiVoiceName;
  browserVoiceURI?: string;
  rate: number; // 0.6 to 2.0 (default 1.0)
  pitch: number; // 0.5 to 1.5 (default 1.0)
  volume: number; // 0.0 to 1.0 (default 1.0)
  autoNarrateNewTurns: boolean;
  dramaticPauses: boolean;
}

