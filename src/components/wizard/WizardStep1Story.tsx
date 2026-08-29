import React from 'react';
import { Sparkles, Wand2, BookOpen, ChevronRight, Eraser } from 'lucide-react';
import { STORY_REALM_PRESETS } from '../../utils/diceUtils';
import { soundEngine } from '../../utils/audio';

export const PROMPT_INSPIRATION_SPARKS = [
  {
    label: '⚡ Sunken Leviathan Vault',
    prompt: 'An expedition into submerged abyssal ruins where siren cultists guard a sleeping leviathan and an ancient celestial sunstone.',
    tone: 'Sunken Abyssal Ruins',
    focus: 'Ancient Relic Hunt',
    pacing: 'Tactical & Deadly',
  },
  {
    label: '💀 Chronomancer Lich Spire',
    prompt: 'An infiltration into a shattered obsidian clocktower where a rogue chronomancer lich resets time whenever intruders breach the sanctum.',
    tone: 'Dark Gothic Horror',
    focus: 'Boss Hunt & Nemesis Slaying',
    pacing: 'Tactical & Deadly',
  },
  {
    label: '🌋 Dragon Caldera Citadel',
    prompt: 'A covert heist into an active volcano caldera fortress ruled by an ancient red wyrm and magma elementals to steal the Fire-Heart.',
    tone: 'Epic High Fantasy',
    focus: 'Infiltration & Heist',
    pacing: 'Heroic & Cinematic',
  },
  {
    label: '🪞 Cursed Mirror Citadel',
    prompt: 'A haunted gothic palace where eldritch mirrors swallow reflections and spawn shadow doppelgängers that stalk the party.',
    tone: 'Eldritch Mystery',
    focus: 'Curse Breaking & Mystery',
    pacing: 'Atmospheric & Story-Driven',
  },
  {
    label: '🌲 Feywild Shadow Labyrinth',
    prompt: 'A moonlit trek through an enchanted ancient forest where trickster fey warp reality, illusionary paths shift, and dark fae bargains loom.',
    tone: 'Mythic Ancient Legends',
    focus: 'Perilous Escape & Survival',
    pacing: 'Atmospheric & Story-Driven',
  },
  {
    label: '🌌 Astral Void Necropolis',
    prompt: 'A salvage mission aboard a drifting celestial titan corpse in the astral ether void, teeming with cosmic horrors and lost planar knowledge.',
    tone: 'Eldritch Mystery',
    focus: 'Ancient Relic Hunt',
    pacing: 'Tactical & Deadly',
  },
];

interface WizardStep1StoryProps {
  storyPremise: string;
  setStoryPremise: (premise: string) => void;
  isEnhancingPrompt: boolean;
  onEnhanceAndSynthesize: () => void;
  isSynthesized: boolean;
  campaignTitle: string;
  worldTheme: string;
  environmentLore: string;
  questObjective: string;
  selectedRealmId: string;
  onSelectRealm: (realmId: string) => void;
  onSelectInspirationSpark: (spark: typeof PROMPT_INSPIRATION_SPARKS[0]) => void;
  onAdvanceToStep2: () => void;
}

export function WizardStep1Story({
  storyPremise,
  setStoryPremise,
  isEnhancingPrompt,
  onEnhanceAndSynthesize,
  isSynthesized,
  campaignTitle,
  worldTheme,
  environmentLore,
  questObjective,
  selectedRealmId,
  onSelectRealm,
  onSelectInspirationSpark,
  onAdvanceToStep2,
}: WizardStep1StoryProps) {
  const [showPresetsDrawer, setShowPresetsDrawer] = React.useState(false);

  return (
    <div className="space-y-5 font-serif">
      <div className="border-b border-[#1e2d4a] pb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            <span>Story Genesis & Narrative Prompt</span>
          </h2>
          <p className="text-xs text-slate-400">
            Write your custom adventure premise freely. No fixed variables, mandatory formulas, or rigid constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playDiceRoll();
              setShowPresetsDrawer(!showPresetsDrawer);
            }}
            className="px-3 py-1.5 rounded-xl border border-[#273752] bg-[#131d2e] hover:bg-[#1c2a42] text-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>{showPresetsDrawer ? 'Hide Curated Realms' : 'Browse Curated Realms'}</span>
          </button>
        </div>
      </div>

      {/* Curated Realm Presets Drawer */}
      {showPresetsDrawer && (
        <div className="p-4 rounded-2xl bg-[#0e1728] border border-[#1e2d4a] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              Curated Quest Realms:
            </span>
            <span className="text-[10px] text-slate-400">Click a realm to load its premise</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {STORY_REALM_PRESETS.map((realm) => {
              const isSelected = selectedRealmId === realm.id;
              return (
                <div
                  key={realm.id}
                  onClick={() => onSelectRealm(realm.id)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-[#162238] shadow-sm ring-1 ring-amber-400/40'
                      : 'border-[#1e2d4a] bg-[#111928] hover:border-[#2f4366] hover:bg-[#141f32]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {realm.theme.split('&')[0]}
                      </span>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-100">
                      {realm.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {realm.premise}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompt Enhancer Studio Box */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0f182a] border border-[#1e2d4a] shadow-sm space-y-4">
        {/* 1. Quick Inspiration Sparks Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspiration Sparks (Click to load concept):</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Quick Seeds</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_INSPIRATION_SPARKS.map((spark) => (
              <button
                key={spark.label}
                type="button"
                onClick={() => onSelectInspirationSpark(spark)}
                className="px-2.5 py-1 rounded-full text-xs bg-[#131e33] hover:bg-[#1a2944] border border-[#273752] text-slate-200 transition-all flex items-center gap-1 shadow-2xs hover:border-amber-400/50 cursor-pointer"
              >
                <span>{spark.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Story Prompt Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-200">
              Your Adventure Premise & Narrative Concept:
            </label>
            <button
              type="button"
              onClick={() => {
                soundEngine.playDiceRoll();
                setStoryPremise('');
              }}
              className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Eraser className="w-3 h-3" />
              <span>Clear / Blank Canvas</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={storyPremise}
            onChange={(e) => setStoryPremise(e.target.value)}
            placeholder="Type your own story concept here freely (e.g. A rogue and a mage enter a clockwork necropolis where forgotten gears resurrect mechanical undead, seeking the Chrono-Heart)..."
            className="w-full px-4 py-3 bg-[#090f1a] border border-[#273752] rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 leading-relaxed resize-y"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-mono">
              ✨ Freeform input — no rigid prefix variables or mandatory templates
            </span>
            <span>{storyPremise.length} characters</span>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2d4a]">
          <span className="text-[11px] text-slate-400 italic">
            Synthesizes campaign lore, hazards, bespoke heroes, and starting relics.
          </span>

          <button
            type="button"
            onClick={onEnhanceAndSynthesize}
            disabled={isEnhancingPrompt || !storyPremise.trim()}
            className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isEnhancingPrompt ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-200" />
                <span>Synthesizing Campaign Lore...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-amber-200" />
                <span>✨ Enhance Prompt & Synthesize Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Synthesized Campaign Lore Preview Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0e1728] border border-[#1e2d4a] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2d4a] pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
              {isSynthesized ? '✨ Synthesized Setting' : 'Story Setting'}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-100">
              {campaignTitle}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#131e33] border border-[#273752]">
            {worldTheme}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="font-bold text-slate-300 block mb-0.5">Narrative Lore:</span>
            <p className="text-slate-300 leading-relaxed italic bg-[#090f1a] p-2.5 rounded-xl border border-[#1e2d4a]">
              "{storyPremise}"
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-[#090f1a] border border-[#1e2d4a]">
              <span className="font-bold text-amber-300 block">Environment & Hazards:</span>
              <span className="text-slate-300">{environmentLore}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#090f1a] border border-[#1e2d4a]">
              <span className="font-bold text-amber-300 block">Quest Objective:</span>
              <span className="text-slate-300">{questObjective}</span>
            </div>
          </div>

          {/* Derived Campaign Parameters Bar */}
          <div className="pt-2 border-t border-[#1e2d4a] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Ready to configure races, classes, and rules in Step 2.
            </span>

            <button
              type="button"
              onClick={onAdvanceToStep2}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
            >
              <span>Review Races, Classes & Rules →</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
