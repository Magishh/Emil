import React, { useState, useEffect, useRef } from 'react';
import { DieType, ActiveDiceRoll, SkillCheckRequirement } from '../types';
import { rollDie, formatModifier } from '../utils/diceUtils';
import { soundEngine } from '../utils/audio';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { DieVisual } from './DieVisual';
import {
  Dices,
  Sparkles,
  CheckCircle2,
  XCircle,
  Flame,
  Target,
  History,
  Shield,
  Swords,
  Wand2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
} from 'lucide-react';

interface DiceArenaProps {
  activeRoll: ActiveDiceRoll | null;
  pendingCheck: SkillCheckRequirement | null;
  onExecuteRoll: (roll: ActiveDiceRoll) => void;
  modifier?: number;
  compact?: boolean;
  onClose?: () => void;
}

interface DieInfo {
  type: DieType;
  label: string;
  sides: number;
  description: string;
  themeName: string;
}

export const DiceArena: React.FC<DiceArenaProps> = ({
  activeRoll,
  pendingCheck,
  onExecuteRoll,
  modifier = 0,
  compact = false,
  onClose,
}) => {
  const [selectedDie, setSelectedDie] = useState<DieType>('d20');
  const [isRolling, setIsRolling] = useState(false);
  const [rollMode, setRollMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [displayedNumber, setDisplayedNumber] = useState<number | null>(
    activeRoll ? activeRoll.baseRoll : 20
  );

  // Dual-die tracking for advantage/disadvantage rolls
  const [dualRolls, setDualRolls] = useState<{ roll1: number; roll2: number; keptIndex: 1 | 2 } | null>(null);
  const [dualDisplayed, setDualDisplayed] = useState<{ roll1: number; roll2: number }>({ roll1: 20, roll2: 20 });

  const [showShockwave, setShowShockwave] = useState(false);
  const [currentResult, setCurrentResult] = useState<ActiveDiceRoll | null>(activeRoll);
  const [rollHistory, setRollHistory] = useState<ActiveDiceRoll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRollId = useRef<string | null>(null);

  const availableDice: DieInfo[] = [
    { type: 'd4', label: 'd4', sides: 4, description: 'Crimson Ruby (Dagger / Healing / Cantrips)', themeName: 'Ruby' },
    { type: 'd6', label: 'd6', sides: 6, description: 'Royal Sapphire (Shortswords / Sneak Attack / Fireball)', themeName: 'Sapphire' },
    { type: 'd8', label: 'd8', sides: 8, description: 'Emerald Diamond (Longswords / Cure Wounds / Rapiers)', themeName: 'Emerald' },
    { type: 'd10', label: 'd10', sides: 10, description: 'Mystic Amethyst (Halberds / Eldritch Blast / Heavy Weapons)', themeName: 'Amethyst' },
    { type: 'd12', label: 'd12', sides: 12, description: 'Dragon Topaz (Greataxes / Barbarian Hit Die)', themeName: 'Topaz' },
    { type: 'd20', label: 'd20', sides: 20, description: 'Astral Obsidian & Gold (Core Ability Checks / Attacks / Saves)', themeName: 'Astral Gold' },
    { type: 'd100', label: 'd100', sides: 100, description: 'Cosmic Void (Percentile / Wild Magic / Loot Tables)', themeName: 'Cosmic' },
  ];

  // Trigger roll animation sequence
  const startRollAnimation = (
    dieType: DieType,
    finalRoll1: number,
    finalRoll2: number,
    targetDc?: number,
    purpose = 'Dice Check'
  ) => {
    if (isRolling) return;
    setIsRolling(true);
    setShowShockwave(false);
    soundEngine.playDiceRoll();

    const sides = availableDice.find((d) => d.type === dieType)?.sides || 20;
    const isDual = dieType === 'd20' && (rollMode === 'advantage' || rollMode === 'disadvantage');

    let keptIdx: 1 | 2 = 1;
    let finalBase = finalRoll1;

    if (isDual) {
      if (rollMode === 'advantage') {
        if (finalRoll2 > finalRoll1) {
          finalBase = finalRoll2;
          keptIdx = 2;
        } else {
          finalBase = finalRoll1;
          keptIdx = 1;
        }
      } else if (rollMode === 'disadvantage') {
        if (finalRoll2 < finalRoll1) {
          finalBase = finalRoll2;
          keptIdx = 2;
        } else {
          finalBase = finalRoll1;
          keptIdx = 1;
        }
      }
    }

    let elapsed = 0;
    const intervalTime = 40;
    const totalDuration = 650;

    if (animationRef.current) clearInterval(animationRef.current);

    animationRef.current = setInterval(() => {
      elapsed += intervalTime;
      // Random face during tumbling
      const rand1 = Math.floor(Math.random() * sides) + 1;
      const rand2 = Math.floor(Math.random() * sides) + 1;
      setDisplayedNumber(rand1);
      if (isDual) {
        setDualDisplayed({ roll1: rand1, roll2: rand2 });
      }

      if (elapsed >= totalDuration) {
        if (animationRef.current) clearInterval(animationRef.current);

        setDisplayedNumber(finalBase);
        if (isDual) {
          setDualDisplayed({ roll1: finalRoll1, roll2: finalRoll2 });
          setDualRolls({ roll1: finalRoll1, roll2: finalRoll2, keptIndex: keptIdx });
        } else {
          setDualRolls(null);
        }

        setIsRolling(false);
        setShowShockwave(true);

        const isCrit = dieType === 'd20' && finalBase === 20;
        const isFumble = dieType === 'd20' && finalBase === 1;
        const total = finalBase + modifier;
        const success =
          targetDc !== undefined ? (isCrit ? true : isFumble ? false : total >= targetDc) : undefined;

        if (isCrit) {
          soundEngine.playCriticalSuccess();
          try {
            confetti({
              particleCount: 90,
              spread: 80,
              origin: { y: 0.65, x: 0.5 },
              colors: ['#fbbf24', '#f59e0b', '#34d399', '#38bdf8', '#ffffff'],
            });
          } catch {
            // fallback
          }
        } else if (isFumble) {
          soundEngine.playCriticalFumble();
        }

        const newRoll: ActiveDiceRoll = {
          id: `roll-${Date.now()}`,
          dieType,
          baseRoll: finalBase,
          modifier,
          total,
          dc: targetDc,
          success,
          isCritical: isCrit,
          isFumble,
          purpose: purpose || (pendingCheck ? pendingCheck.reason : 'Manual Roll'),
          timestamp: Date.now(),
        };

        setCurrentResult(newRoll);
        setRollHistory((prev) => [newRoll, ...prev.slice(0, 7)]);
        onExecuteRoll(newRoll);

        setTimeout(() => setShowShockwave(false), 900);
      }
    }, intervalTime);
  };

  // User initiates roll directly
  const handleManualRoll = (dieType: DieType = selectedDie, targetDc?: number, purpose?: string) => {
    const r1 = rollDie(dieType);
    const r2 = rollDie(dieType);
    startRollAnimation(
      dieType,
      r1,
      r2,
      targetDc ?? pendingCheck?.dc,
      purpose || (pendingCheck ? `${pendingCheck.ability} Check` : `${dieType.toUpperCase()} Roll`)
    );
  };

  // Sync with incoming activeRoll from parent (e.g. choice check, stat check, quick roll)
  useEffect(() => {
    if (activeRoll && activeRoll.id !== lastProcessedRollId.current) {
      lastProcessedRollId.current = activeRoll.id;
      setSelectedDie(activeRoll.dieType);
      
      // Run the tumbling animation to reveal this roll smoothly
      const sides = availableDice.find((d) => d.type === activeRoll.dieType)?.sides || 20;
      setIsRolling(true);
      setShowShockwave(false);
      soundEngine.playDiceRoll();

      let elapsed = 0;
      const intervalTime = 40;
      const totalDuration = 600;

      if (animationRef.current) clearInterval(animationRef.current);

      animationRef.current = setInterval(() => {
        elapsed += intervalTime;
        const rand = Math.floor(Math.random() * sides) + 1;
        setDisplayedNumber(rand);

        if (elapsed >= totalDuration) {
          if (animationRef.current) clearInterval(animationRef.current);
          setDisplayedNumber(activeRoll.baseRoll);
          setIsRolling(false);
          setShowShockwave(true);
          setCurrentResult(activeRoll);
          setRollHistory((prev) => {
            if (prev.some((r) => r.id === activeRoll.id)) return prev;
            return [activeRoll, ...prev.slice(0, 7)];
          });

          if (activeRoll.isCritical) {
            soundEngine.playCriticalSuccess();
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.65, x: 0.5 },
              });
            } catch {
              // ignore
            }
          } else if (activeRoll.isFumble) {
            soundEngine.playCriticalFumble();
          }

          setTimeout(() => setShowShockwave(false), 900);
        }
      }, intervalTime);
    }
  }, [activeRoll]);

  // Auto-switch to d20 when a DC check is pending
  useEffect(() => {
    if (pendingCheck) {
      setSelectedDie('d20');
    }
  }, [pendingCheck]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, []);

  const latestResult = currentResult || activeRoll;
  const currentDieMeta = availableDice.find((d) => d.type === selectedDie) || availableDice[5];

  return (
    <div
      id="dice-arena-container"
      className="flex flex-col h-full bg-[#f4f0e6] dark:bg-[#0c121e] border-2 border-[#b8ae8f] dark:border-[#22334e] rounded-2xl overflow-hidden shadow-2xl select-none relative"
    >
      {/* Top Controls Header */}
      <div className="px-3.5 py-2.5 bg-[#fdfaf1]/95 dark:bg-[#111a2c]/95 border-b border-[#b8ae8f]/40 dark:border-[#22334e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#2c1810] dark:bg-[#1e293b] text-amber-400 border border-[#b8ae8f]/50 dark:border-[#334b6e] flex items-center justify-center shadow-xs">
            <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#2c1810] dark:text-[#f8fafc] font-serif uppercase truncate">
            Dice Arena
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Advantage / Disadvantage Toggle Mode */}
          <div className="flex items-center gap-1 bg-[#ede8dc] dark:bg-[#182338] p-0.5 rounded-lg border border-[#b8ae8f] dark:border-[#2b3d5b] text-[10px]">
            <button
              onClick={() => setRollMode('advantage')}
              title="Roll with Advantage (Take higher of 2 d20s)"
              className={`px-1.5 py-0.5 rounded font-bold font-serif transition-all cursor-pointer ${
                rollMode === 'advantage'
                  ? 'bg-[#15803d] text-[#fdfaf1] shadow-xs scale-105'
                  : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-white'
              }`}
            >
              ADV
            </button>
            <button
              onClick={() => setRollMode('normal')}
              title="Normal Roll"
              className={`px-1.5 py-0.5 rounded font-bold font-serif transition-all cursor-pointer ${
                rollMode === 'normal'
                  ? 'bg-[#2c1810] dark:bg-[#334b6e] text-[#fdfaf1] shadow-xs'
                  : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-white'
              }`}
            >
              NORM
            </button>
            <button
              onClick={() => setRollMode('disadvantage')}
              title="Roll with Disadvantage (Take lower of 2 d20s)"
              className={`px-1.5 py-0.5 rounded font-bold font-serif transition-all cursor-pointer ${
                rollMode === 'disadvantage'
                  ? 'bg-[#991b1b] text-[#fdfaf1] shadow-xs scale-105'
                  : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-white'
              }`}
            >
              DIS
            </button>
          </div>

          {/* Close button if rendered in modal */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close Dice Arena"
              className="p-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Polyhedral Dice Selector Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#fdfaf1]/80 dark:bg-[#111a2c]/80 border-b border-[#b8ae8f]/30 dark:border-[#22334e] shrink-0 gap-1.5 overflow-x-auto no-scrollbar">
        {availableDice.map((d) => {
          const isSelected = selectedDie === d.type;
          return (
            <button
              key={d.type}
              onClick={() => {
                setSelectedDie(d.type);
                setDisplayedNumber(d.sides);
              }}
              title={d.description}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#2c1810] dark:bg-amber-500/20 text-[#fdfaf1] dark:text-amber-300 shadow-md border border-[#4a3227] dark:border-amber-400/50 scale-105'
                  : 'bg-white/90 dark:bg-[#182338] text-[#4a3227] dark:text-[#cbd5e1] hover:bg-white dark:hover:bg-[#202f4a] border border-[#d6cfbe] dark:border-[#2a3c58]'
              }`}
            >
              <div className="w-4 h-4 shrink-0">
                <DieVisual
                  dieType={d.type}
                  displayedNumber={d.label.slice(1)}
                  size="sm"
                  className="scale-90"
                />
              </div>
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pending Check Banner Alert */}
      {pendingCheck && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-1.5 bg-gradient-to-r from-red-100 via-amber-50 to-red-50 dark:from-red-950/70 dark:via-amber-950/40 dark:to-red-950/70 border-b border-red-300 dark:border-red-800/60 flex items-center justify-between text-xs shrink-0"
        >
          <div className="flex items-center gap-1.5 text-[#2c1810] dark:text-red-200 truncate font-serif">
            <Target className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0 animate-spin" />
            <span className="truncate font-bold text-red-950 dark:text-red-200">
              DC {pendingCheck.dc} {pendingCheck.ability} ({pendingCheck.skillName || 'Skill Check'})
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-700 dark:bg-red-600 text-white font-mono font-bold uppercase tracking-wider shadow-xs animate-pulse shrink-0">
            Check Required
          </span>
        </motion.div>
      )}

      {/* Main Rolling Stage */}
      <div className="relative flex-1 p-3 bg-gradient-to-b from-[#dfd9c8]/50 via-[#d7d0bd]/40 to-[#c8bfab]/60 dark:from-[#0b101b] dark:via-[#0e1626] dark:to-[#090e18] flex flex-col items-center justify-center overflow-hidden min-h-[140px]">
        {/* Ambient Radial Spotlight */}
        <div className="absolute inset-0 bg-radial from-white/60 via-transparent to-[#8c7e6a]/20 dark:from-amber-500/5 dark:via-transparent dark:to-black/40 pointer-events-none" />

        {/* Dynamic Shockwave Flare */}
        <AnimatePresence>
          {showShockwave && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className={`absolute w-32 h-32 rounded-full border-2 pointer-events-none ${
                latestResult?.isCritical
                  ? 'border-emerald-400 bg-emerald-400/20'
                  : latestResult?.isFumble
                  ? 'border-rose-500 bg-rose-500/20'
                  : 'border-[#b8ae8f] dark:border-amber-400/40 bg-[#b8ae8f]/20 dark:bg-amber-400/10'
              }`}
            />
          )}
        </AnimatePresence>

        {/* Rolling Die Stage */}
        <div
          onClick={() => handleManualRoll(selectedDie, pendingCheck?.dc, pendingCheck?.reason)}
          className="relative cursor-pointer group flex flex-col items-center justify-center"
        >
          {/* Dual Dice for Advantage / Disadvantage */}
          {rollMode !== 'normal' && selectedDie === 'd20' && (dualRolls || isRolling) ? (
            <div className="flex items-center justify-center gap-4 py-1">
              {/* Die 1 */}
              <div
                className={`flex flex-col items-center transition-all ${
                  isRolling ? 'animate-dice-tumble' : ''
                } ${
                  dualRolls && dualRolls.keptIndex === 1
                    ? 'ring-2 ring-emerald-500 rounded-2xl p-1 bg-emerald-500/10'
                    : dualRolls
                    ? 'opacity-40'
                    : ''
                }`}
              >
                <DieVisual
                  dieType="d20"
                  displayedNumber={isRolling ? dualDisplayed.roll1 : dualRolls?.roll1 ?? 20}
                  isRolling={isRolling}
                  isCritical={dualRolls?.roll1 === 20}
                  isFumble={dualRolls?.roll1 === 1}
                  size="md"
                />
                {dualRolls && (
                  <span
                    className={`mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                      dualRolls.keptIndex === 1
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-400 line-through'
                    }`}
                  >
                    {dualRolls.keptIndex === 1 ? 'KEPT' : 'DISCARD'}
                  </span>
                )}
              </div>

              {/* Die 2 */}
              <div
                className={`flex flex-col items-center transition-all ${
                  isRolling ? 'animate-dice-tumble-reverse' : ''
                } ${
                  dualRolls && dualRolls.keptIndex === 2
                    ? 'ring-2 ring-emerald-500 rounded-2xl p-1 bg-emerald-500/10'
                    : dualRolls
                    ? 'opacity-40'
                    : ''
                }`}
              >
                <DieVisual
                  dieType="d20"
                  displayedNumber={isRolling ? dualDisplayed.roll2 : dualRolls?.roll2 ?? 20}
                  isRolling={isRolling}
                  isCritical={dualRolls?.roll2 === 20}
                  isFumble={dualRolls?.roll2 === 1}
                  size="md"
                />
                {dualRolls && (
                  <span
                    className={`mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                      dualRolls.keptIndex === 2
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-400 line-through'
                    }`}
                  >
                    {dualRolls.keptIndex === 2 ? 'KEPT' : 'DISCARD'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Single Die Motion Container */
            <div
              className={`relative select-none group-hover:scale-105 transition-transform ${
                isRolling ? 'animate-dice-tumble' : ''
              }`}
            >
              {/* Critical Aura Glow */}
              {latestResult?.isCritical && !isRolling && (
                <div className="absolute -inset-3 rounded-full bg-radial from-emerald-400/40 via-amber-400/20 to-transparent blur-xs pointer-events-none animate-pulse" />
              )}

              {/* Fumble Aura Glow */}
              {latestResult?.isFumble && !isRolling && (
                <div className="absolute -inset-3 rounded-full bg-radial from-rose-600/40 via-rose-900/20 to-transparent blur-xs pointer-events-none animate-pulse" />
              )}

              <DieVisual
                dieType={selectedDie}
                displayedNumber={displayedNumber}
                isRolling={isRolling}
                isCritical={latestResult?.isCritical && !isRolling}
                isFumble={latestResult?.isFumble && !isRolling}
                size="lg"
              />
            </div>
          )}

          {/* Interactive Tap CTA Prompt */}
          <div className="mt-2 text-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleManualRoll(selectedDie, pendingCheck?.dc, pendingCheck?.reason);
              }}
              disabled={isRolling}
              className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc] tracking-wider uppercase flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#182338] hover:bg-white dark:hover:bg-[#202f4a] border border-[#b8ae8f] dark:border-[#334b6e] shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              {isRolling ? (
                'Tumbling Fate...'
              ) : (
                <>
                  Roll <strong className="text-[#2c1810] dark:text-amber-300 font-mono">{selectedDie.toUpperCase()}</strong>{' '}
                  <span className="text-[10px] text-[#8c7e6a] dark:text-[#94a3b8] font-mono font-normal">
                    ({currentDieMeta.themeName})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clear & Engaging Outcome Result Banner */}
        <AnimatePresence mode="wait">
          {latestResult && !isRolling && (
            <motion.div
              key={latestResult.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className={`mt-2.5 w-full px-3 py-2 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
                latestResult.isCritical
                  ? 'bg-gradient-to-r from-emerald-100 via-emerald-50 to-green-100 dark:from-emerald-950/80 dark:to-emerald-900/60 border-emerald-400 text-emerald-950 dark:text-emerald-200'
                  : latestResult.isFumble
                  ? 'bg-gradient-to-r from-rose-100 via-red-50 to-rose-100 dark:from-rose-950/80 dark:to-rose-900/60 border-rose-400 text-rose-950 dark:text-rose-200'
                  : latestResult.success !== undefined
                  ? latestResult.success
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                    : 'bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/50 dark:to-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200'
                  : 'bg-white/95 dark:bg-[#182338] border-[#b8ae8f] dark:border-[#2b3d5b] text-[#2c1810] dark:text-[#f8fafc]'
              }`}
            >
              {/* Formula & Numbers */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1 font-mono">
                  <span className="font-bold text-[#2c1810] dark:text-[#f8fafc]">
                    Nat {latestResult.baseRoll}
                  </span>
                  {latestResult.modifier !== 0 && (
                    <span className="text-[#8c7e6a] dark:text-[#94a3b8]">
                      {formatModifier(latestResult.modifier)}
                    </span>
                  )}
                  <span>=</span>
                  <strong className="text-sm font-black text-[#2c1810] dark:text-amber-300 underline decoration-[#8c7e6a]/50 underline-offset-2">
                    {latestResult.total}
                  </strong>
                </div>

                {latestResult.dc !== undefined && (
                  <span className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8] font-serif">
                    vs DC {latestResult.dc}
                  </span>
                )}
              </div>

              {/* Status Outcome Badges */}
              <div className="flex items-center gap-1 shrink-0">
                {latestResult.isCritical ? (
                  <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-200/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-wider animate-bounce">
                    <Flame className="w-3.5 h-3.5 fill-emerald-600 text-emerald-700 dark:text-emerald-400" /> CRIT!
                  </span>
                ) : latestResult.isFumble ? (
                  <span className="text-rose-800 dark:text-rose-300 bg-rose-200/80 dark:bg-rose-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-wider">
                    <XCircle className="w-3.5 h-3.5 fill-rose-600 text-white" /> FUMBLE
                  </span>
                ) : latestResult.success !== undefined ? (
                  latestResult.success ? (
                    <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> SUCCESS
                    </span>
                  ) : (
                    <span className="text-rose-800 dark:text-rose-300 bg-rose-200/70 dark:bg-rose-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-wider">
                      <XCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" /> FAILURE
                    </span>
                  )
                ) : (
                  <span className="text-[#8c7e6a] dark:text-[#94a3b8] font-mono text-[10px] uppercase truncate max-w-[100px]">
                    {latestResult.purpose}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Roll Presets & History Toggle */}
      <div className="px-2.5 py-1.5 bg-[#fdfaf1]/90 dark:bg-[#111a2c]/90 border-t border-[#b8ae8f]/40 dark:border-[#22334e] flex items-center justify-between gap-1 shrink-0 text-[11px]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setSelectedDie('d20');
              handleManualRoll('d20', undefined, 'Attack Roll');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-[#182338] hover:bg-[#ede8dc] dark:hover:bg-[#202f4a] border border-[#d6cfbe] dark:border-[#2a3c58] text-[#2c1810] dark:text-[#f8fafc] font-medium font-serif shrink-0 cursor-pointer shadow-2xs"
          >
            <Swords className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>Attack</span>
          </button>

          <button
            onClick={() => {
              setSelectedDie('d20');
              handleManualRoll('d20', undefined, 'Saving Throw');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-[#182338] hover:bg-[#ede8dc] dark:hover:bg-[#202f4a] border border-[#d6cfbe] dark:border-[#2a3c58] text-[#2c1810] dark:text-[#f8fafc] font-medium font-serif shrink-0 cursor-pointer shadow-2xs"
          >
            <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              setSelectedDie('d8');
              handleManualRoll('d8', undefined, 'Damage Roll');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-[#182338] hover:bg-[#ede8dc] dark:hover:bg-[#202f4a] border border-[#d6cfbe] dark:border-[#2a3c58] text-[#2c1810] dark:text-[#f8fafc] font-medium font-serif shrink-0 cursor-pointer shadow-2xs"
          >
            <Wand2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Damage</span>
          </button>
        </div>

        {/* History Accordion Toggle */}
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#ede8dc] dark:bg-[#182338] hover:bg-[#e2dcc5] dark:hover:bg-[#202f4a] text-[#4a3227] dark:text-[#cbd5e1] font-mono text-[10px] shrink-0 border border-[#b8ae8f] dark:border-[#2b3d5b] cursor-pointer"
        >
          <History className="w-3 h-3 text-[#8c7e6a] dark:text-[#94a3b8]" />
          <span>{rollHistory.length}</span>
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Roll History Accordion Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#f5f0e3] dark:bg-[#0f1726] border-t border-[#b8ae8f] dark:border-[#22334e] px-3 py-2 space-y-1.5 max-h-36 overflow-y-auto"
          >
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#8c7e6a] dark:text-[#94a3b8] uppercase">
              <span>Recent Rolls</span>
              <span>Result</span>
            </div>
            {rollHistory.length === 0 ? (
              <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8] italic text-center py-2">
                No rolls recorded yet.
              </p>
            ) : (
              rollHistory.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white/80 dark:bg-[#182338] p-1.5 rounded-lg border border-[#e2dcc5] dark:border-[#2a3c58] text-[11px]"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-4 h-4 shrink-0">
                      <DieVisual dieType={r.dieType} displayedNumber="" size="sm" />
                    </div>
                    <span className="font-serif font-medium text-[#2c1810] dark:text-[#f8fafc] truncate max-w-[120px]">
                      {r.purpose}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono shrink-0">
                    <span className="text-[#8c7e6a] dark:text-[#94a3b8]">
                      Nat {r.baseRoll} {formatModifier(r.modifier)} =
                    </span>
                    <strong
                      className={`font-bold ${
                        r.isCritical
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : r.isFumble
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-[#2c1810] dark:text-[#f8fafc]'
                      }`}
                    >
                      {r.total}
                    </strong>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

