// ============================================================================
// D&D 5e rules engine.
//
// Pure functions only: no React, no network, no randomness beyond the dice
// rolls themselves. Everything the game resolves mechanically - checks,
// attacks, damage, death saves, rests, levelling - goes through here so the
// behaviour is consistent and testable.
// ============================================================================

import { Ability, Character, CharacterStats, InventoryItem, StatusEffect } from '../types';

// --------------------------------------------------------------------------
// Core maths
// --------------------------------------------------------------------------

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** 5e proficiency bonus: +2 at level 1-4, then +1 every four levels. */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

/** Cumulative XP required to reach each level (5e table). */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export const MAX_LEVEL = XP_THRESHOLDS.length;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(MAX_LEVEL, level);
}

export function xpForNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return XP_THRESHOLDS[level];
}

/** Progress toward the next level, 0..1. Returns 1 at max level. */
export function xpProgress(xp: number, level: number): number {
  const next = xpForNextLevel(level);
  if (next === null) return 1;
  const floor = XP_THRESHOLDS[level - 1] ?? 0;
  const span = next - floor;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (xp - floor) / span));
}

export function statKey(ability: Ability): keyof CharacterStats {
  return ability.toLowerCase() as keyof CharacterStats;
}

// --------------------------------------------------------------------------
// Dice
// --------------------------------------------------------------------------

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export interface DiceRollResult {
  total: number;
  rolls: number[];
  modifier: number;
  notation: string;
}

/**
 * Rolls standard dice notation such as "2d6+3", "1d8 - 1" or a bare "4".
 * Unparseable input yields a flat 1 rather than NaN leaking into HP maths.
 */
export function rollDiceNotation(notation: string): DiceRollResult {
  const clean = (notation || '').toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?/);

  if (!match) {
    const flat = Number(clean.replace(/[^\d-]/g, ''));
    const total = Number.isFinite(flat) && flat !== 0 ? Math.abs(flat) : 1;
    return { total, rolls: [total], modifier: 0, notation: notation || '1' };
  }

  const count = Math.max(1, Math.min(20, Number(match[1] || 1)));
  const sides = Math.max(2, Math.min(100, Number(match[2])));
  const modifier = Number(match[3] || 0);

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return { total: Math.max(0, total), rolls, modifier, notation };
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface D20Roll {
  /** Both dice when rolled with advantage or disadvantage. */
  rolls: number[];
  /** The die that counts. */
  natural: number;
  mode: RollMode;
  isCritical: boolean;
  isFumble: boolean;
}

export function rollD20(mode: RollMode = 'normal'): D20Roll {
  const first = rollDie(20);
  if (mode === 'normal') {
    return { rolls: [first], natural: first, mode, isCritical: first === 20, isFumble: first === 1 };
  }
  const second = rollDie(20);
  const natural = mode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
  return {
    rolls: [first, second],
    natural,
    mode,
    isCritical: natural === 20,
    isFumble: natural === 1,
  };
}

// --------------------------------------------------------------------------
// Conditions
// --------------------------------------------------------------------------

export interface ConditionEffects {
  /** Net roll mode for attacks made by the character. */
  attackMode: RollMode;
  /** Net roll mode for ability and skill checks. */
  checkMode: RollMode;
  /** Roll mode for attacks made against the character. */
  incomingAttackMode: RollMode;
  /** Dice added to attacks and saves, e.g. Bless. */
  bonusDice: string[];
  /** Dice subtracted from attacks and saves, e.g. Bane. */
  penaltyDice: string[];
  /** Flat AC adjustment from conditions such as Shield of Faith or Haste. */
  acBonus: number;
  /** Healing applied at the start of each turn. */
  regenPerTurn: string | null;
  /** Cannot act at all. */
  incapacitated: boolean;
  /** Human-readable reasons, shown in the roll breakdown. */
  notes: string[];
}

/** How each supported condition changes the maths. */
const CONDITION_RULES: Record<
  string,
  Partial<Omit<ConditionEffects, 'notes' | 'bonusDice' | 'penaltyDice'>> & {
    bonusDie?: string;
    penaltyDie?: string;
  }
> = {
  poisoned: { attackMode: 'disadvantage', checkMode: 'disadvantage' },
  blessed: { bonusDie: '1d4' },
  bane: { penaltyDie: '1d4' },
  inspired: { bonusDie: '1d6' },
  frightened: { attackMode: 'disadvantage', checkMode: 'disadvantage' },
  blinded: { attackMode: 'disadvantage', incomingAttackMode: 'advantage' },
  restrained: { attackMode: 'disadvantage', incomingAttackMode: 'advantage' },
  invisible: { attackMode: 'advantage', incomingAttackMode: 'disadvantage' },
  hasted: { acBonus: 2 },
  shielded: { acBonus: 5 },
  raging: { checkMode: 'advantage' },
  exhausted: { checkMode: 'disadvantage' },
  regenerating: { regenPerTurn: '1d4' },
  paralyzed: { incapacitated: true, incomingAttackMode: 'advantage' },
  stunned: { incapacitated: true, incomingAttackMode: 'advantage' },
};

/** Advantage and disadvantage cancel out rather than stacking (5e rule). */
export function combineModes(a: RollMode, b: RollMode): RollMode {
  if (a === b) return a;
  if (a === 'normal') return b;
  if (b === 'normal') return a;
  return 'normal'; // one of each
}

export function conditionEffects(effects: StatusEffect[] | undefined): ConditionEffects {
  const result: ConditionEffects = {
    attackMode: 'normal',
    checkMode: 'normal',
    incomingAttackMode: 'normal',
    bonusDice: [],
    penaltyDice: [],
    acBonus: 0,
    regenPerTurn: null,
    incapacitated: false,
    notes: [],
  };

  (effects || []).forEach((effect) => {
    const rule = CONDITION_RULES[(effect.name || '').toLowerCase().trim()];
    if (!rule) return;

    if (rule.attackMode) {
      result.attackMode = combineModes(result.attackMode, rule.attackMode);
      result.notes.push(`${effect.name}: ${rule.attackMode} on attacks`);
    }
    if (rule.checkMode) {
      result.checkMode = combineModes(result.checkMode, rule.checkMode);
      result.notes.push(`${effect.name}: ${rule.checkMode} on checks`);
    }
    if (rule.incomingAttackMode) {
      result.incomingAttackMode = combineModes(result.incomingAttackMode, rule.incomingAttackMode);
    }
    if (rule.bonusDie) {
      result.bonusDice.push(rule.bonusDie);
      result.notes.push(`${effect.name}: +${rule.bonusDie}`);
    }
    if (rule.penaltyDie) {
      result.penaltyDice.push(rule.penaltyDie);
      result.notes.push(`${effect.name}: -${rule.penaltyDie}`);
    }
    if (rule.acBonus) {
      result.acBonus += rule.acBonus;
      result.notes.push(`${effect.name}: +${rule.acBonus} AC`);
    }
    if (rule.regenPerTurn) result.regenPerTurn = rule.regenPerTurn;
    if (rule.incapacitated) {
      result.incapacitated = true;
      result.notes.push(`${effect.name}: incapacitated`);
    }
  });

  return result;
}

/** Armour Class including any condition bonuses. */
export function effectiveAc(character: Character): number {
  return character.ac + conditionEffects(character.statusEffects).acBonus;
}

// --------------------------------------------------------------------------
// Checks and attacks
// --------------------------------------------------------------------------

export interface ResolvedRoll {
  natural: number;
  rolls: number[];
  mode: RollMode;
  abilityMod: number;
  proficiency: number;
  bonusDiceTotal: number;
  penaltyDiceTotal: number;
  total: number;
  dc?: number;
  success?: boolean;
  isCritical: boolean;
  isFumble: boolean;
  /** Why the roll came out the way it did, for the UI breakdown. */
  breakdown: string[];
}

function sumDice(notations: string[]): { total: number; parts: string[] } {
  let total = 0;
  const parts: string[] = [];
  notations.forEach((n) => {
    const roll = rollDiceNotation(n);
    total += roll.total;
    parts.push(`${n}=${roll.total}`);
  });
  return { total, parts };
}

export interface CheckOptions {
  character: Character;
  ability: Ability;
  dc?: number;
  /** Adds the proficiency bonus, for trained skills and weapon attacks. */
  proficient?: boolean;
  /** Extra roll mode requested by the player, combined with conditions. */
  requestedMode?: RollMode;
  /** Use attack-roll condition effects instead of check effects. */
  asAttack?: boolean;
}

export function resolveCheck(options: CheckOptions): ResolvedRoll {
  const { character, ability, dc, proficient = false, requestedMode = 'normal', asAttack = false } = options;

  const conditions = conditionEffects(character.statusEffects);
  const conditionMode = asAttack ? conditions.attackMode : conditions.checkMode;
  const mode = combineModes(requestedMode, conditionMode);

  const d20 = rollD20(mode);
  const abilityMod = abilityModifier(character.stats[statKey(ability)]);
  const proficiency = proficient ? proficiencyBonus(character.level) : 0;

  const bonus = sumDice(conditions.bonusDice);
  const penalty = sumDice(conditions.penaltyDice);

  const total = d20.natural + abilityMod + proficiency + bonus.total - penalty.total;

  const breakdown: string[] = [
    `d20${mode !== 'normal' ? ` (${mode}: ${d20.rolls.join(', ')})` : ''} = ${d20.natural}`,
    `${ability} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
  ];
  if (proficiency) breakdown.push(`proficiency +${proficiency}`);
  bonus.parts.forEach((p) => breakdown.push(`+${p}`));
  penalty.parts.forEach((p) => breakdown.push(`-${p}`));

  // A natural 20 always succeeds and a natural 1 always fails on attacks and
  // checks made against a DC.
  let success: boolean | undefined;
  if (dc !== undefined) {
    success = d20.isCritical ? true : d20.isFumble ? false : total >= dc;
  }

  return {
    natural: d20.natural,
    rolls: d20.rolls,
    mode,
    abilityMod,
    proficiency,
    bonusDiceTotal: bonus.total,
    penaltyDiceTotal: penalty.total,
    total,
    dc,
    success,
    isCritical: d20.isCritical,
    isFumble: d20.isFumble,
    breakdown,
  };
}

export interface AttackOutcome {
  roll: ResolvedRoll;
  hit: boolean;
  damage: number;
  damageRolls: number[];
  /** Critical hits roll the damage dice twice. */
  critical: boolean;
  targetAc: number;
}

/** Resolves one attack against an Armour Class. */
export function resolveAttack(options: {
  character: Character;
  ability: Ability;
  targetAc: number;
  damageNotation: string;
  requestedMode?: RollMode;
  /** Attacks against an incapacitated or unseen target. */
  targetGrantsAdvantage?: boolean;
}): AttackOutcome {
  const mode = combineModes(
    options.requestedMode || 'normal',
    options.targetGrantsAdvantage ? 'advantage' : 'normal'
  );

  const roll = resolveCheck({
    character: options.character,
    ability: options.ability,
    dc: options.targetAc,
    proficient: true,
    requestedMode: mode,
    asAttack: true,
  });

  const hit = roll.success === true;
  if (!hit) {
    return { roll, hit: false, damage: 0, damageRolls: [], critical: false, targetAc: options.targetAc };
  }

  const base = rollDiceNotation(options.damageNotation);
  let damage = base.total;
  let damageRolls = [...base.rolls];

  if (roll.isCritical) {
    // 5e critical: roll the damage dice again, modifiers are not doubled.
    const extra = rollDiceNotation(options.damageNotation.replace(/[+-]\d+/, ''));
    damage += extra.total;
    damageRolls = damageRolls.concat(extra.rolls);
  }

  // Raging characters hit harder in melee.
  const conditions = conditionEffects(options.character.statusEffects);
  if (conditions.notes.some((n) => n.toLowerCase().startsWith('raging'))) damage += 2;

  return {
    roll,
    hit: true,
    damage: Math.max(1, damage),
    damageRolls,
    critical: roll.isCritical,
    targetAc: options.targetAc,
  };
}

/** The enemy's swing back at the hero. */
export function resolveEnemyAttack(options: {
  attackBonus: number;
  damageNotation: string;
  target: Character;
}): { natural: number; total: number; hit: boolean; damage: number; critical: boolean; targetAc: number } {
  const conditions = conditionEffects(options.target.statusEffects);
  const d20 = rollD20(conditions.incomingAttackMode);
  const targetAc = effectiveAc(options.target);
  const total = d20.natural + options.attackBonus;
  const hit = d20.isCritical ? true : d20.isFumble ? false : total >= targetAc;

  if (!hit) return { natural: d20.natural, total, hit: false, damage: 0, critical: false, targetAc };

  const base = rollDiceNotation(options.damageNotation);
  let damage = base.total;
  if (d20.isCritical) damage += rollDiceNotation(options.damageNotation.replace(/[+-]\d+/, '')).total;

  return { natural: d20.natural, total, hit: true, damage: Math.max(1, damage), critical: d20.isCritical, targetAc };
}

// --------------------------------------------------------------------------
// Damage, healing and death
// --------------------------------------------------------------------------

/** Applies damage, spending temporary hit points first. */
export function applyDamage(character: Character, amount: number): Character {
  const damage = Math.max(0, Math.round(amount));
  const temp = character.tempHp || 0;
  const absorbed = Math.min(temp, damage);
  const remaining = damage - absorbed;

  return {
    ...character,
    tempHp: temp - absorbed,
    hp: Math.max(0, character.hp - remaining),
    // Taking damage while dying is a failed death save; leaving the deathSaves
    // record intact here lets the caller decide, so just reset on downing.
    deathSaves:
      character.hp - remaining <= 0 && character.hp > 0
        ? { successes: 0, failures: 0 }
        : character.deathSaves,
  };
}

export function applyHealing(character: Character, amount: number): Character {
  const healed = Math.max(0, Math.round(amount));
  if (healed <= 0) return character;
  return {
    ...character,
    hp: Math.min(character.maxHp, character.hp + healed),
    // Any healing brings you back from dying.
    deathSaves: character.hp <= 0 ? { successes: 0, failures: 0 } : character.deathSaves,
  };
}

export interface DeathSaveResult {
  natural: number;
  outcome: 'success' | 'failure' | 'critical-success' | 'critical-failure';
  successes: number;
  failures: number;
  stabilised: boolean;
  dead: boolean;
  /** A natural 20 restores one hit point and ends the dying state. */
  revivedAt1Hp: boolean;
}

export function rollDeathSave(character: Character): DeathSaveResult {
  const current = character.deathSaves || { successes: 0, failures: 0 };
  const natural = rollDie(20);

  let successes = current.successes;
  let failures = current.failures;
  let outcome: DeathSaveResult['outcome'] = 'success';
  let revivedAt1Hp = false;

  if (natural === 20) {
    outcome = 'critical-success';
    revivedAt1Hp = true;
    successes = 0;
    failures = 0;
  } else if (natural === 1) {
    outcome = 'critical-failure';
    failures += 2;
  } else if (natural >= 10) {
    outcome = 'success';
    successes += 1;
  } else {
    outcome = 'failure';
    failures += 1;
  }

  return {
    natural,
    outcome,
    successes: Math.min(3, successes),
    failures: Math.min(3, failures),
    stabilised: successes >= 3,
    dead: failures >= 3,
    revivedAt1Hp,
  };
}

// --------------------------------------------------------------------------
// Rests
// --------------------------------------------------------------------------

export function hitDieForClass(className: string): number {
  const name = (className || '').toLowerCase();
  if (name.includes('barbarian')) return 12;
  if (name.includes('fighter') || name.includes('paladin') || name.includes('ranger')) return 10;
  if (name.includes('wizard') || name.includes('sorcerer')) return 6;
  return 8;
}

export function defaultHitDice(character: Character) {
  return (
    character.hitDice || {
      die: hitDieForClass(character.className),
      total: Math.max(1, character.level),
      remaining: Math.max(1, character.level),
    }
  );
}

export interface RestResult {
  character: Character;
  healed: number;
  diceSpent: number;
  message: string;
}

/** Short rest: spend one hit die to recover hit points. */
export function shortRest(character: Character, diceToSpend = 1): RestResult {
  const dice = defaultHitDice(character);
  const spend = Math.max(0, Math.min(diceToSpend, dice.remaining));

  if (spend === 0) {
    return { character, healed: 0, diceSpent: 0, message: 'No hit dice remaining — a long rest is needed.' };
  }

  const conMod = abilityModifier(character.stats.con);
  let healed = 0;
  for (let i = 0; i < spend; i++) {
    healed += Math.max(1, rollDie(dice.die) + conMod);
  }

  const rested = applyHealing(character, healed);
  return {
    character: {
      ...rested,
      hitDice: { ...dice, remaining: dice.remaining - spend },
    },
    healed: Math.min(healed, character.maxHp - character.hp),
    diceSpent: spend,
    message: `Short rest: spent ${spend} hit die${spend === 1 ? '' : 'ce'} and recovered ${healed} HP.`,
  };
}

/** Long rest: full hit points, half your hit dice back, conditions cleared. */
export function longRest(character: Character): RestResult {
  const dice = defaultHitDice(character);
  const regained = Math.max(1, Math.floor(dice.total / 2));
  const healed = character.maxHp - character.hp;

  return {
    character: {
      ...character,
      hp: character.maxHp,
      tempHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDice: { ...dice, remaining: Math.min(dice.total, dice.remaining + regained) },
      // Timed conditions lapse over a night's rest; indefinite ones persist.
      statusEffects: (character.statusEffects || []).filter((e) => e.durationTurns === undefined),
      spellSlots: (character.spellSlots || []).map((slot) => ({ ...slot, current: slot.max })),
    },
    healed,
    diceSpent: 0,
    message: `Long rest: fully healed${healed > 0 ? ` (+${healed} HP)` : ''}, ${regained} hit dice recovered.`,
  };
}

// --------------------------------------------------------------------------
// Progression
// --------------------------------------------------------------------------

export interface LevelUpResult {
  character: Character;
  levelsGained: number;
  hpGained: number;
  newProficiency: number;
  abilityScoreImprovement: boolean;
}

/**
 * Applies any levels the character's XP has earned. Hit points increase by the
 * average of the class hit die plus the Constitution modifier, and levels 4, 8,
 * 12, 16 and 19 flag an ability score improvement.
 */
export function applyLevelUps(character: Character): LevelUpResult | null {
  const xp = character.xp || 0;
  const target = levelForXp(xp);
  if (target <= character.level) return null;

  const die = hitDieForClass(character.className);
  const conMod = abilityModifier(character.stats.con);
  const levelsGained = target - character.level;

  let hpGained = 0;
  let abilityScoreImprovement = false;
  for (let level = character.level + 1; level <= target; level++) {
    hpGained += Math.max(1, Math.floor(die / 2) + 1 + conMod);
    if ([4, 8, 12, 16, 19].includes(level)) abilityScoreImprovement = true;
  }

  const dice = defaultHitDice(character);
  const newMaxHp = character.maxHp + hpGained;

  return {
    character: {
      ...character,
      level: target,
      maxHp: newMaxHp,
      hp: Math.min(newMaxHp, character.hp + hpGained), // levelling heals by the gain
      hitDice: { ...dice, total: target, remaining: Math.min(target, dice.remaining + levelsGained) },
    },
    levelsGained,
    hpGained,
    newProficiency: proficiencyBonus(target),
    abilityScoreImprovement,
  };
}

/** XP awarded for defeating a foe, scaled by how dangerous it was. */
export function xpForEnemy(enemy: { maxHp?: number; ac?: number; xpValue?: number }): number {
  if (enemy.xpValue && enemy.xpValue > 0) return Math.round(enemy.xpValue);
  const hp = Math.max(1, enemy.maxHp || 10);
  const ac = Math.max(8, enemy.ac || 12);
  return Math.max(25, Math.round(hp * 4 + (ac - 10) * 15));
}


// --------------------------------------------------------------------------
// Weapons
// --------------------------------------------------------------------------

export interface AttackProfile {
  weaponName: string;
  /** Ability used for the attack: finesse and ranged weapons use Dexterity. */
  ability: Ability;
  damageNotation: string;
  item?: InventoryItem;
}

const FINESSE_OR_RANGED = [
  'dagger', 'bow', 'crossbow', 'rapier', 'shortsword', 'scimitar', 'dart',
  'sling', 'stiletto', 'knife', 'whip', 'arrow', 'quiver',
];

/** Extracts dice notation from prose like "1d8 + 3 Slashing (+1d4 Fire)". */
export function extractDamageNotation(text?: string): string | null {
  if (!text) return null;
  const match = text.toLowerCase().replace(/\s+/g, '').match(/(\d*d\d+(?:[+-]\d+)?)/);
  return match ? match[1] : null;
}

/**
 * The attack the hero makes by default: their equipped weapon, else the best
 * weapon carried, else an unarmed strike.
 */
export function heroAttackProfile(character: Character): AttackProfile {
  const weapons = (character.inventory || []).filter((i) => i.type === 'weapon');
  const chosen = weapons.find((w) => w.equipped) || weapons[0];

  if (!chosen) {
    return { weaponName: 'Unarmed strike', ability: 'STR', damageNotation: '1d4' };
  }

  const haystack = `${chosen.name} ${chosen.description || ''}`.toLowerCase();
  const usesDex = FINESSE_OR_RANGED.some((w) => haystack.includes(w));
  const strMod = abilityModifier(character.stats.str);
  const dexMod = abilityModifier(character.stats.dex);

  // A finesse weapon uses whichever of Strength or Dexterity is better.
  const ability: Ability = usesDex && dexMod >= strMod ? 'DEX' : 'STR';
  const abilityMod = ability === 'DEX' ? dexMod : strMod;

  const parsed = extractDamageNotation(chosen.damage);
  const base = parsed || '1d6';
  // If the item's damage string carries no modifier, add the ability modifier.
  const notation = /[+-]\d+$/.test(base)
    ? base
    : `${base}${abilityMod >= 0 ? '+' : ''}${abilityMod}`;

  return { weaponName: chosen.name, ability, damageNotation: notation, item: chosen };
}
