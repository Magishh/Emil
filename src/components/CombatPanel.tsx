import React, { useEffect, useRef } from 'react';
import { Character, CombatState, InventoryItem } from '../types';
import {
  conditionEffects,
  effectiveAc,
  heroAttackProfile,
  proficiencyBonus,
} from '../utils/rules';
import {
  Swords,
  Shield,
  FlaskConical,
  Footprints,
  Skull,
  Heart,
  Sparkles,
  ChevronsRight,
} from 'lucide-react';

export type CombatAction = 'attack' | 'defend' | 'potion' | 'flee';

interface CombatPanelProps {
  combat: CombatState;
  character: Character;
  onAction: (action: CombatAction, item?: InventoryItem) => void;
  onRollDeathSave: () => void;
  isResolving: boolean;
}

function HealthBar({
  current,
  max,
  tone,
}: {
  current: number;
  max: number;
  tone: 'hero' | 'enemy';
}) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
      <div
        className={`h-full transition-[width] duration-500 ${
          tone === 'hero'
            ? pct < 25
              ? 'bg-rose-500'
              : pct < 50
              ? 'bg-amber-500'
              : 'bg-emerald-500'
            : 'bg-rose-600'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export const CombatPanel: React.FC<CombatPanelProps> = ({
  combat,
  character,
  onAction,
  onRollDeathSave,
  isResolving,
}) => {
  const logRef = useRef<HTMLDivElement>(null);
  const { enemy, round, phase, log } = combat;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log.length]);

  const conditions = conditionEffects(character.statusEffects);
  const profile = heroAttackProfile(character);
  const isDying = character.hp <= 0 && !character.isDead;
  const deathSaves = character.deathSaves || { successes: 0, failures: 0 };
  const potions = (character.inventory || []).filter((i) => i.type === 'potion' && i.quantity > 0);
  const canAct = phase === 'hero' && !isResolving && !isDying && !conditions.incapacitated;

  const attackBonus =
    (profile.ability === 'DEX'
      ? Math.floor((character.stats.dex - 10) / 2)
      : Math.floor((character.stats.str - 10) / 2)) + proficiencyBonus(character.level);

  return (
    <div className="rounded-2xl border-2 border-rose-800/60 bg-gradient-to-b from-[#1a0d12] to-[#0d0a10] overflow-hidden shadow-xl">
      {/* Banner */}
      <div className="px-3.5 py-2 bg-rose-950/70 border-b border-rose-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="text-xs font-serif font-bold text-rose-100 uppercase tracking-wider truncate">
            Combat — Round {round}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-rose-200 border border-rose-700/60 shrink-0">
          {phase === 'hero' ? 'Your turn' : phase === 'enemy' ? 'Enemy turn' : phase}
        </span>
      </div>

      {/* Combatants */}
      <div className="p-3 space-y-2.5">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-serif font-bold text-rose-200 truncate">{enemy.name}</span>
            <span className="text-[11px] font-mono text-rose-300 shrink-0">
              {Math.max(0, enemy.hp)}/{enemy.maxHp} HP · AC {enemy.ac}
            </span>
          </div>
          <HealthBar current={enemy.hp} max={enemy.maxHp} tone="enemy" />
          {enemy.description && (
            <p className="text-[11px] text-slate-400 italic leading-snug line-clamp-1">
              {enemy.description}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-serif font-bold text-emerald-200 truncate">
              {character.name}
            </span>
            <span className="text-[11px] font-mono text-emerald-300 shrink-0">
              {Math.max(0, character.hp)}/{character.maxHp} HP · AC {effectiveAc(character)}
            </span>
          </div>
          <HealthBar current={character.hp} max={character.maxHp} tone="hero" />
        </div>
       </div>

        {conditions.notes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conditions.notes.map((note, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Combat log */}
        <div
          ref={logRef}
          className="max-h-20 overflow-y-auto space-y-1 rounded-xl bg-black/40 border border-white/10 p-2"
        >
          {log.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">Roll for the first blow…</p>
          ) : (
            log.map((entry) => (
              <div key={entry.id} className="text-[11px] leading-snug">
                <span
                  className={
                    entry.side === 'hero'
                      ? 'text-emerald-300'
                      : entry.side === 'enemy'
                      ? 'text-rose-300'
                      : 'text-slate-400'
                  }
                >
                  {entry.critical && '💥 '}
                  {entry.text}
                </span>
                {entry.detail && (
                  <span className="text-slate-500 font-mono ml-1">({entry.detail})</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Dying: death saving throws */}
        {isDying ? (
          <div className="space-y-2 rounded-xl border border-rose-700/60 bg-rose-950/40 p-3">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-300" />
              <span className="text-xs font-serif font-bold text-rose-100">
                You are dying — roll death saving throws
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-emerald-300">
                Successes {'●'.repeat(deathSaves.successes)}
                {'○'.repeat(Math.max(0, 3 - deathSaves.successes))}
              </span>
              <span className="text-rose-300">
                Failures {'●'.repeat(deathSaves.failures)}
                {'○'.repeat(Math.max(0, 3 - deathSaves.failures))}
              </span>
            </div>
            <button
              type="button"
              onClick={onRollDeathSave}
              disabled={isResolving}
              className="w-full px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-serif font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Roll Death Save (d20)
            </button>
          </div>
        ) : (
          /* Action bar */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onAction('attack')}
              disabled={!canAct}
              title={`${profile.weaponName}: +${attackBonus} to hit, ${profile.damageNotation} damage`}
              className="px-2.5 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 border border-rose-600 text-white text-xs font-serif font-bold flex flex-col items-start gap-0.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Attack
              </span>
              <span className="text-[10px] font-mono font-normal text-rose-200 truncate max-w-full">
                {profile.weaponName} +{attackBonus}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onAction('defend')}
              disabled={!canAct}
              title="Take a defensive stance: +2 AC until your next turn"
              className="px-2.5 py-2 rounded-xl bg-[#1b2740] hover:bg-[#223050] border border-[#33456b] text-slate-100 text-xs font-serif font-bold flex flex-col items-start gap-0.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Defend
              </span>
              <span className="text-[10px] font-mono font-normal text-slate-400">+2 AC</span>
            </button>

            <button
              type="button"
              onClick={() => onAction('potion', potions[0])}
              disabled={!canAct || potions.length === 0}
              title={potions[0] ? `Drink ${potions[0].name}` : 'No potions'}
              className="px-2.5 py-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 text-xs font-serif font-bold flex flex-col items-start gap-0.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                Drink
              </span>
              <span className="text-[10px] font-mono font-normal text-emerald-300 truncate max-w-full">
                {potions[0] ? potions[0].name : 'none carried'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onAction('flee')}
              disabled={!canAct}
              title="Attempt to disengage (DEX check)"
              className="px-2.5 py-2 rounded-xl bg-[#241b12] hover:bg-[#2f2318] border border-[#4a3a25] text-amber-100 text-xs font-serif font-bold flex flex-col items-start gap-0.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5" />
                Flee
              </span>
              <span className="text-[10px] font-mono font-normal text-amber-300/80">DEX check</span>
            </button>
          </div>
        )}

        {conditions.incapacitated && !isDying && (
          <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            You are incapacitated and lose your turn.
          </p>
        )}

        {isResolving && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ChevronsRight className="w-3.5 h-3.5 animate-pulse shrink-0" />
            Resolving…
          </p>
        )}

        {phase === 'won' && (
          <p className="text-xs text-emerald-300 font-serif font-bold flex items-center gap-1.5">
            <Heart className="w-4 h-4" /> {enemy.name} is defeated!
          </p>
        )}
      </div>
    </div>
  );
};
