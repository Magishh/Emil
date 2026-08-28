import React from 'react';
import { Sparkles, Wand2, Shield, Swords, Plus, Trash2, Dices, Flame, Skull, Heart } from 'lucide-react';
import { CustomRace, CustomClass, RuleStrictness, DifficultyLevel } from '../../types';
import { STARTING_CLASSES, STARTING_RACES } from '../../utils/diceUtils';
import { soundEngine } from '../../utils/audio';

interface WizardStep2RacesClassesProps {
  // Race state
  selectedRace: string;
  onSelectRace: (race: string) => void;
  recommendedRaces: string[];
  customRaces: CustomRace[];
  onOpenCreateRaceModal: () => void;
  onDeleteCustomRace: (id: string) => void;
  onAiInspireRace: () => void;
  isAiGeneratingRace: boolean;

  // Class state
  selectedClassIndex: number;
  selectedCustomClassId: string | null;
  onSelectClassIndex: (index: number) => void;
  onSelectCustomClass: (customClass: CustomClass) => void;
  customClasses: CustomClass[];
  onOpenCreateClassModal: () => void;
  onDeleteCustomClass: (id: string) => void;
  onAiInspireClass: () => void;
  isAiGeneratingClass: boolean;

  // Rules & Difficulty
  ruleStrictness: RuleStrictness;
  onSetRuleStrictness: (rules: RuleStrictness) => void;
  recommendedRuleStrictness: RuleStrictness;
  difficulty: DifficultyLevel;
  onSetDifficulty: (diff: DifficultyLevel) => void;
  recommendedDifficulty: DifficultyLevel;
  worldTheme: string;
}

export function WizardStep2RacesClasses({
  selectedRace,
  onSelectRace,
  recommendedRaces,
  customRaces,
  onOpenCreateRaceModal,
  onDeleteCustomRace,
  onAiInspireRace,
  isAiGeneratingRace,
  selectedClassIndex,
  selectedCustomClassId,
  onSelectClassIndex,
  onSelectCustomClass,
  customClasses,
  onOpenCreateClassModal,
  onDeleteCustomClass,
  onAiInspireClass,
  isAiGeneratingClass,
  ruleStrictness,
  onSetRuleStrictness,
  recommendedRuleStrictness,
  difficulty,
  onSetDifficulty,
  recommendedDifficulty,
  worldTheme,
}: WizardStep2RacesClassesProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<'races' | 'classes' | 'rules'>('races');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#1e2d4a] pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-amber-300 flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <span>Races, Classes & Campaign Rules</span>
          </h2>
          <p className="text-xs text-slate-400">
            Choose or manually forge custom races and classes for your quest in: <strong className="text-slate-200">{worldTheme}</strong>
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex rounded-xl bg-[#0e1728] border border-[#1e2d4a] p-1 text-xs font-serif font-bold">
          <button
            type="button"
            onClick={() => {
              soundEngine.playDiceRoll();
              setActiveSubTab('races');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'races'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Hero Races ({STARTING_RACES.length + customRaces.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playDiceRoll();
              setActiveSubTab('classes');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'classes'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Hero Classes ({STARTING_CLASSES.length + customClasses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playDiceRoll();
              setActiveSubTab('rules');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'rules'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Rules & Difficulty</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUBTAB 1: RACES & CUSTOM RACE CREATOR */}
      {/* ==================================================== */}
      {activeSubTab === 'races' && (
        <div className="space-y-4 font-serif">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                Selected Race: <strong className="text-white text-sm">{selectedRace}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Choose a classic D&D race, story-recommended race, or craft a new custom race.
              </span>
            </div>

            {/* Action Buttons for Custom Races */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAiInspireRace}
                disabled={isAiGeneratingRace}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-[#14233c] hover:bg-[#1a2e4e] text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGeneratingRace ? 'animate-spin text-amber-200' : 'text-amber-400'}`} />
                <span>{isAiGeneratingRace ? 'Inspiring...' : '✨ AI Inspire Race'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreateRaceModal}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Manually Add New Race</span>
              </button>
            </div>
          </div>

          {/* Custom Races Shelf (if any exist) */}
          {customRaces.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#0e192e] border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Forged Races ({customRaces.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Stored & playable in any quest</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {customRaces.map((cr) => {
                  const isSelected = selectedRace === cr.name;
                  return (
                    <div
                      key={cr.id}
                      onClick={() => {
                        soundEngine.playDiceRoll();
                        onSelectRace(cr.name);
                      }}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-[#162744] shadow-md ring-1 ring-amber-400/40'
                          : 'border-[#1e2d4a] bg-[#090f1a] hover:border-amber-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Custom Race
                          </span>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCustomRace(cr.id);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete custom race"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-100">{cr.name}</h4>
                        <p className="text-[11px] text-slate-300 italic mt-0.5 line-clamp-2">{cr.lore}</p>
                        
                        <div className="mt-2 text-[10px] space-y-0.5">
                          <div className="text-amber-300 font-mono font-semibold">{cr.racialTraits}</div>
                          {cr.specialAbility && (
                            <div className="text-slate-400 truncate">★ {cr.specialAbility}</div>
                          )}
                          <div className="text-slate-400 font-mono">Speed: {cr.speed || 30}ft • {cr.senses || 'Normal vision'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Races */}
          {recommendedRaces.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                ⭐ Recommended for Current Story Setting:
              </label>
              <div className="flex flex-wrap gap-2">
                {recommendedRaces.map((r) => {
                  const isSelected = selectedRace === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        soundEngine.playDiceRoll();
                        onSelectRace(r);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500 text-black font-bold shadow-xs'
                          : 'border-amber-500/30 bg-[#111c30] text-amber-200 hover:bg-[#182742]'
                      }`}
                    >
                      <span>⭐ {r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Classic D&D Races */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Classic & Exotic D&D 5e Races:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {STARTING_RACES.map((r) => {
                const isSelected = selectedRace === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      soundEngine.playDiceRoll();
                      onSelectRace(r);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500 text-black font-bold shadow-xs'
                        : 'border-[#1e2d4a] bg-[#0c1422] text-slate-200 hover:border-[#2f4366] hover:bg-[#121c30]'
                    }`}
                  >
                    <span className="truncate">{r}</span>
                    {isSelected && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 2: CLASSES & CUSTOM CLASS CREATOR */}
      {/* ==================================================== */}
      {activeSubTab === 'classes' && (
        <div className="space-y-4 font-serif">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                Selected Class:{' '}
                <strong className="text-white text-sm">
                  {selectedCustomClassId
                    ? customClasses.find((c) => c.id === selectedCustomClassId)?.name || 'Custom Class'
                    : STARTING_CLASSES[selectedClassIndex]?.name}
                </strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Choose a classic 5e class or forge your own custom class archetype with custom Hit Die and starting gear.
              </span>
            </div>

            {/* Action Buttons for Custom Classes */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAiInspireClass}
                disabled={isAiGeneratingClass}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-[#14233c] hover:bg-[#1a2e4e] text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGeneratingClass ? 'animate-spin text-amber-200' : 'text-amber-400'}`} />
                <span>{isAiGeneratingClass ? 'Inspiring...' : '✨ AI Inspire Class'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreateClassModal}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Manually Add New Class</span>
              </button>
            </div>
          </div>

          {/* Custom Classes Shelf */}
          {customClasses.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#0e192e] border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Forged Classes ({customClasses.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Fully playable archetypes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {customClasses.map((cc) => {
                  const isSelected = selectedCustomClassId === cc.id;
                  return (
                    <div
                      key={cc.id}
                      onClick={() => {
                        soundEngine.playDiceRoll();
                        onSelectCustomClass(cc);
                      }}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-[#162744] shadow-md ring-1 ring-amber-400/40'
                          : 'border-[#1e2d4a] bg-[#090f1a] hover:border-amber-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            d{cc.hitDie} • {cc.primaryAbility}
                          </span>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCustomClass(cc.id);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete custom class"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-xs sm:text-sm text-slate-100">{cc.name}</h4>
                        <p className="text-[11px] text-slate-300 italic mt-0.5 line-clamp-2">{cc.description}</p>
                        
                        <div className="mt-2 text-[10px] space-y-0.5">
                          <div className="text-emerald-400 font-mono font-semibold">
                            HP: {cc.baseHp} • AC: {cc.baseAc}
                          </div>
                          {cc.specialAbility && (
                            <div className="text-amber-300 truncate">★ {cc.specialAbility}</div>
                          )}
                          <div className="text-slate-400 truncate">Gear: {cc.startingEquipment?.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classic D&D 5e Classes */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Classic D&D 5e Classes:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {STARTING_CLASSES.map((cls, idx) => {
                const isSelected = !selectedCustomClassId && selectedClassIndex === idx;
                return (
                  <div
                    key={cls.name}
                    onClick={() => {
                      soundEngine.playDiceRoll();
                      onSelectClassIndex(idx);
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-[#162744] shadow-md ring-1 ring-amber-400/40'
                        : 'border-[#1e2d4a] bg-[#0c1422] hover:border-[#2f4366] hover:bg-[#121c30]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          d{cls.hitDie} • {cls.primary}
                        </span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-100">{cls.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{cls.description}</p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#1e2d4a] flex items-center justify-between text-[10px] font-mono text-slate-300">
                      <span>HP: {cls.hp} • AC: {cls.ac}</span>
                      <span className="text-amber-400 font-sans">⚔️</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 3: RULES & DIFFICULTY */}
      {/* ==================================================== */}
      {activeSubTab === 'rules' && (
        <div className="space-y-5 font-serif">
          {/* Rules Strictness */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-2">
              1. 5e Rules Strictness
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'hard',
                  title: 'Hard Rules',
                  sub: 'Strict 5e Simulation',
                  desc: 'Strict adherence to 5e rules, exact ability DC benchmarks, encumbrance limits, and tactical mechanics.',
                  icon: Shield,
                  color: 'text-red-400 bg-red-500/20',
                },
                {
                  id: 'soft',
                  title: 'Soft Rules',
                  sub: 'Standard 5e Adventure',
                  desc: 'Balanced 5e rulings tempered with the "Rule of Cool", heroic leeway, and flexible actions.',
                  icon: Dices,
                  color: 'text-emerald-400 bg-emerald-500/20',
                },
                {
                  id: 'none',
                  title: 'No Rules',
                  sub: 'Narrative Freeform',
                  desc: 'Cinematic storytelling with minimal mechanical friction and creative narrative freedom.',
                  icon: Sparkles,
                  color: 'text-purple-400 bg-purple-500/20',
                },
              ].map((r) => {
                const isSelected = ruleStrictness === r.id;
                const isRec = recommendedRuleStrictness === r.id;
                const Icon = r.icon;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      soundEngine.playDiceRoll();
                      onSetRuleStrictness(r.id as RuleStrictness);
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-[#162238] shadow-md ring-1 ring-amber-400/40'
                        : 'border-[#1e2d4a] bg-[#111928] hover:border-[#2f4366]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-1.5 rounded-xl ${r.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isRec && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Recommended
                            </span>
                          )}
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-sm text-slate-100">{r.title}</h3>
                      <p className="text-[10px] uppercase font-bold text-amber-400 mt-0.5">{r.sub}</p>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-2">
              2. Combat & DC Challenge Difficulty
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'story', label: 'Storyteller', desc: 'Forgiving • DCs: 8-12', icon: Heart },
                { id: 'standard', label: 'Adventurer', desc: 'Standard 5e • DCs: 10-15', icon: Swords },
                { id: 'heroic', label: 'Heroic', desc: 'High Stakes • DCs: 13-18', icon: Flame },
                { id: 'nightmare', label: 'Nightmare', desc: 'Deadly • DCs: 15-20+', icon: Skull },
              ].map((diff) => {
                const isSelected = difficulty === diff.id;
                const isRec = recommendedDifficulty === diff.id;
                const DiffIcon = diff.icon;
                return (
                  <div
                    key={diff.id}
                    onClick={() => {
                      soundEngine.playDiceRoll();
                      onSetDifficulty(diff.id as DifficultyLevel);
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-[#162238] shadow-sm ring-1 ring-amber-400/40'
                        : 'border-[#1e2d4a] bg-[#111928] hover:border-[#2f4366]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <DiffIcon className="w-4 h-4 text-amber-400" />
                      <div className="flex items-center gap-1">
                        {isRec && (
                          <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Rec
                          </span>
                        )}
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-bold text-xs text-slate-100">{diff.label}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{diff.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
