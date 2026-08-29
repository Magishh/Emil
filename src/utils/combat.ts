// ============================================================================
// Turn-based combat orchestration.
//
// Pure functions: each takes the current character and combat state and returns
// the next ones, so a whole encounter can be simulated and tested without any
// UI. The Dungeon Master narrates the outcome afterwards; the mechanics here
// resolve instantly so combat stays responsive.
// ============================================================================

import { Character, CombatEnemy, CombatLogEntry, CombatState, InventoryItem } from '../types';
import {
  applyDamage,
  applyHealing,
  conditionEffects,
  effectiveAc,
  heroAttackProfile,
  LevelUpResult,
  applyLevelUps,
  resolveAttack,
  resolveCheck,
  resolveEnemyAttack,
  rollDeathSave,
  rollDiceNotation,
  rollDie,
  abilityModifier,
  xpForEnemy,
} from './rules';

export type CombatAction = 'attack' | 'defend' | 'potion' | 'flee';

export interface CombatOutcome {
  outcome: 'won' | 'lost' | 'fled';
  xpAwarded: number;
  levelUp: LevelUpResult | null;
  /** Sent to the Dungeon Master so it can narrate what just happened. */
  summary: string;
}

export interface CombatStepResult {
  character: Character;
  combat: CombatState;
  ended?: CombatOutcome;
}

let logSeq = 0;
function entry(
  side: CombatLogEntry['side'],
  text: string,
  detail?: string,
  extra?: { damage?: number; critical?: boolean }
): CombatLogEntry {
  logSeq += 1;
  return { id: `cl-${Date.now()}-${logSeq}`, side, text, detail, ...extra };
}

/** Fills in stats the Dungeon Master left out so any enemy can be fought. */
export function normaliseEnemy(raw: Partial<CombatEnemy> | undefined): CombatEnemy {
  const maxHp = Math.max(1, Math.round(raw?.maxHp || raw?.hp || 12));
  return {
    name: raw?.name || 'Unknown Assailant',
    maxHp,
    hp: Math.max(0, Math.round(raw?.hp ?? maxHp)),
    ac: Math.max(5, Math.round(raw?.ac || 12)),
    description: raw?.description || '',
    attackBonus: typeof raw?.attackBonus === 'number' ? raw.attackBonus : 4,
    damageNotation: raw?.damageNotation || '1d6+2',
    xpValue: raw?.xpValue,
    portraitPrompt: raw?.portraitPrompt,
  };
}

/** Rolls initiative and opens the encounter. */
export function startCombat(character: Character, rawEnemy: Partial<CombatEnemy>): CombatState {
  const enemy = normaliseEnemy(rawEnemy);
  const heroInit = rollDie(20) + (character.initiativeBonus || abilityModifier(character.stats.dex));
  const enemyInit = rollDie(20) + 1;
  const heroActsFirst = heroInit >= enemyInit;

  return {
    enemy,
    round: 1,
    phase: heroActsFirst ? 'hero' : 'enemy',
    heroActsFirst,
    heroDefending: false,
    log: [
      entry(
        'system',
        `${enemy.name} attacks!`,
        `initiative ${heroInit} vs ${enemyInit} — ${heroActsFirst ? 'you act first' : 'it acts first'}`
      ),
    ],
  };
}

function finish(
  character: Character,
  combat: CombatState,
  outcome: 'won' | 'lost' | 'fled'
): CombatStepResult {
  if (outcome === 'won') {
    const xp = xpForEnemy(combat.enemy);
    const withXp: Character = { ...character, xp: (character.xp || 0) + xp };
    const levelUp = applyLevelUps(withXp);

    return {
      character: levelUp ? levelUp.character : withXp,
      combat: {
        ...combat,
        phase: 'won',
        log: [
          ...combat.log,
          entry('system', `${combat.enemy.name} falls. +${xp} XP.`),
          ...(levelUp
            ? [entry('system', `Level up! You are now level ${levelUp.character.level} (+${levelUp.hpGained} max HP).`)]
            : []),
        ],
      },
      ended: {
        outcome,
        xpAwarded: xp,
        levelUp,
        summary:
          `The hero defeated ${combat.enemy.name} after ${combat.round} round(s), earning ${xp} XP` +
          (levelUp ? ` and reaching level ${levelUp.character.level}` : '') +
          `. Hero HP is now ${levelUp ? levelUp.character.hp : withXp.hp}/${
            levelUp ? levelUp.character.maxHp : withXp.maxHp
          }.`,
      },
    };
  }

  if (outcome === 'fled') {
    return {
      character,
      combat: { ...combat, phase: 'fled', log: [...combat.log, entry('system', 'You break away and escape.')] },
      ended: {
        outcome,
        xpAwarded: 0,
        levelUp: null,
        summary: `The hero disengaged from ${combat.enemy.name} and escaped after ${combat.round} round(s).`,
      },
    };
  }

  return {
    character,
    combat: { ...combat, phase: 'lost', log: [...combat.log, entry('system', 'You fall...')] },
    ended: {
      outcome,
      xpAwarded: 0,
      levelUp: null,
      summary: `The hero was struck down by ${combat.enemy.name}.`,
    },
  };
}

/** Ticks condition durations at the end of a full round. */
function tickConditions(character: Character): Character {
  const effects = (character.statusEffects || [])
    .map((e) => (e.durationTurns !== undefined ? { ...e, durationTurns: e.durationTurns - 1 } : e))
    .filter((e) => e.durationTurns === undefined || e.durationTurns > 0);
  return { ...character, statusEffects: effects };
}

/** The hero's action for this round. */
export function heroAction(
  character: Character,
  combat: CombatState,
  action: CombatAction,
  item?: InventoryItem
): CombatStepResult {
  if (combat.phase !== 'hero') return { character, combat };

  const log = [...combat.log];
  let nextCharacter = character;
  let nextEnemy = { ...combat.enemy };
  let defending = false;

  // Regeneration ticks at the start of your turn.
  const conditions = conditionEffects(character.statusEffects);
  if (conditions.regenPerTurn) {
    const healed = rollDiceNotation(conditions.regenPerTurn);
    nextCharacter = applyHealing(nextCharacter, healed.total);
    log.push(entry('hero', `Regeneration knits your wounds (+${healed.total} HP).`));
  }

  if (conditions.incapacitated) {
    log.push(entry('system', 'You are incapacitated and lose your turn.'));
    return {
      character: nextCharacter,
      combat: { ...combat, enemy: nextEnemy, phase: 'enemy', log },
    };
  }

  switch (action) {
    case 'attack': {
      const profile = heroAttackProfile(nextCharacter);
      const result = resolveAttack({
        character: nextCharacter,
        ability: profile.ability,
        targetAc: nextEnemy.ac,
        damageNotation: profile.damageNotation,
      });

      if (result.hit) {
        nextEnemy.hp = Math.max(0, nextEnemy.hp - result.damage);
        log.push(
          entry(
            'hero',
            `${result.critical ? 'Critical hit! ' : ''}Your ${profile.weaponName} strikes for ${result.damage}.`,
            `d20 ${result.roll.natural} + ${result.roll.abilityMod + result.roll.proficiency} = ${result.roll.total} vs AC ${nextEnemy.ac}`,
            { damage: result.damage, critical: result.critical }
          )
        );
      } else {
        log.push(
          entry(
            'hero',
            `Your ${profile.weaponName} ${result.roll.isFumble ? 'goes badly wide' : 'misses'}.`,
            `d20 ${result.roll.natural} + ${result.roll.abilityMod + result.roll.proficiency} = ${result.roll.total} vs AC ${nextEnemy.ac}`
          )
        );
      }
      break;
    }

    case 'defend': {
      defending = true;
      log.push(entry('hero', 'You raise your guard.', '+2 AC until your next turn'));
      break;
    }

    case 'potion': {
      if (!item) {
        log.push(entry('system', 'You have nothing to drink.'));
        break;
      }
      const healed = rollDiceNotation('2d4+2').total;
      nextCharacter = applyHealing(nextCharacter, healed);
      nextCharacter = {
        ...nextCharacter,
        inventory: (nextCharacter.inventory || [])
          .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
      };
      log.push(entry('hero', `You drink the ${item.name} (+${healed} HP).`));
      break;
    }

    case 'flee': {
      const check = resolveCheck({ character: nextCharacter, ability: 'DEX', dc: 12 });
      if (check.success) {
        log.push(entry('hero', 'You disengage and break for the exit.', `DEX ${check.total} vs DC 12`));
        return finish(nextCharacter, { ...combat, enemy: nextEnemy, log }, 'fled');
      }
      log.push(entry('hero', 'You try to slip away but cannot break contact.', `DEX ${check.total} vs DC 12`));
      break;
    }
  }

  if (nextEnemy.hp <= 0) {
    return finish(nextCharacter, { ...combat, enemy: nextEnemy, log }, 'won');
  }

  return {
    character: nextCharacter,
    combat: { ...combat, enemy: nextEnemy, phase: 'enemy', heroDefending: defending, log },
  };
}

/** The enemy's response. */
export function enemyTurn(character: Character, combat: CombatState): CombatStepResult {
  if (combat.phase !== 'enemy') return { character, combat };

  const log = [...combat.log];
  const enemy = combat.enemy;

  // Defending raises AC for exactly this incoming attack.
  const target: Character = combat.heroDefending
    ? { ...character, ac: character.ac + 2 }
    : character;

  const swing = resolveEnemyAttack({
    attackBonus: enemy.attackBonus ?? 4,
    damageNotation: enemy.damageNotation || '1d6+2',
    target,
  });

  let nextCharacter = character;
  if (swing.hit) {
    nextCharacter = applyDamage(character, swing.damage);
    log.push(
      entry(
        'enemy',
        `${swing.critical ? 'Critical! ' : ''}${enemy.name} hits you for ${swing.damage}.`,
        `d20 ${swing.natural} + ${enemy.attackBonus ?? 4} = ${swing.total} vs AC ${swing.targetAc}`,
        { damage: swing.damage, critical: swing.critical }
      )
    );
  } else {
    log.push(
      entry(
        'enemy',
        `${enemy.name} attacks and misses.`,
        `d20 ${swing.natural} + ${enemy.attackBonus ?? 4} = ${swing.total} vs AC ${swing.targetAc}`
      )
    );
  }

  // A full round has elapsed once both sides have acted.
  nextCharacter = tickConditions(nextCharacter);

  if (nextCharacter.hp <= 0) {
    log.push(entry('system', 'You collapse, bleeding out. Roll death saving throws.'));
    return {
      character: { ...nextCharacter, deathSaves: nextCharacter.deathSaves || { successes: 0, failures: 0 } },
      combat: { ...combat, round: combat.round + 1, phase: 'hero', heroDefending: false, log },
    };
  }

  return {
    character: nextCharacter,
    combat: { ...combat, round: combat.round + 1, phase: 'hero', heroDefending: false, log },
  };
}

/** One death saving throw while at 0 hit points. */
export function deathSaveStep(character: Character, combat: CombatState): CombatStepResult {
  const result = rollDeathSave(character);
  const log = [...combat.log];

  if (result.revivedAt1Hp) {
    log.push(entry('hero', 'A natural 20 — you drag yourself back to consciousness at 1 HP.', 'death save 20'));
    return {
      character: { ...character, hp: 1, deathSaves: { successes: 0, failures: 0 } },
      combat: { ...combat, phase: 'enemy', log },
    };
  }

  log.push(
    entry(
      result.outcome.includes('success') ? 'hero' : 'enemy',
      `Death save ${result.natural}: ${result.outcome.replace('-', ' ')}.`,
      `${result.successes} success / ${result.failures} failure`
    )
  );

  const updated: Character = {
    ...character,
    deathSaves: { successes: result.successes, failures: result.failures },
  };

  if (result.dead) {
    return finish({ ...updated, isDead: true }, { ...combat, log }, 'lost');
  }

  if (result.stabilised) {
    log.push(entry('system', 'You stabilise, unconscious but alive.'));
    return finish({ ...updated, hp: 1, deathSaves: { successes: 0, failures: 0 } }, { ...combat, log }, 'fled');
  }

  // Still dying: the enemy presses its advantage.
  return { character: updated, combat: { ...combat, phase: 'enemy', log } };
}
