import React from 'react';
import {
  Crown,
  Sparkles,
  Wand2,
  Dice5,
  Feather,
  Swords,
  Hammer,
  Loader2,
  Image as ImageIcon,
  Check,
  Zap,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  Character,
  InventoryItem,
  StoryHeroConcept,
  CustomRace,
  CustomClass,
} from '../../types';
import { STARTING_CLASSES, STARTING_RACES } from '../../utils/diceUtils';
import { generateCharacterAvatarSvg } from '../../utils/svgArt';
import { ItemSprite } from '../Sprite';
import { soundEngine } from '../../utils/audio';

interface WizardStep3HeroRelicsProps {
  worldTheme: string;
  bespokeHeroes: StoryHeroConcept[];
  selectedHeroConceptId: string | null;
  onApplyHeroConcept: (hero: StoryHeroConcept) => void;
  isGeneratingBespokeHeroes: boolean;
  onGenerateStoryHeroes: () => void;
  onRandomizeName: () => void;

  // Identity State
  characterName: string;
  setCharacterName: (name: string) => void;
  gender: string;
  setGender: (g: string) => void;
  race: string;
  setRace: (r: string) => void;
  recommendedRaces: string[];
  customRaces: CustomRace[];
  selectedClassIndex: number;
  selectedCustomClassId: string | null;
  onSelectClassIndex: (idx: number) => void;
  onSelectCustomClass: (cls: CustomClass) => void;
  customClasses: CustomClass[];
  background: string;
  setBackground: (bg: string) => void;
  alignment: string;
  setAlignment: (a: string) => void;
  storyMotivation: string;
  setStoryMotivation: (m: string) => void;
  customTrait: string;
  setCustomTrait: (t: string) => void;

  // Item & Relic Forge State
  selectedItems: InventoryItem[];
  customItems: InventoryItem[];
  onToggleItem: (item: InventoryItem) => void;
  onPreviewItem: (item: InventoryItem) => void;
  onDeleteCustomItem: (itemId: string) => void;
  customItemPrompt: string;
  setCustomItemPrompt: (p: string) => void;
  customItemType: 'weapon' | 'armor' | 'potion' | 'misc';
  setCustomItemType: (t: 'weapon' | 'armor' | 'potion' | 'misc') => void;
  isForgingItem: boolean;
  onForgeCustomItem: () => void;

  // Portrait Studio State
  portraitUrl: string;
  setPortraitUrl: (url: string) => void;
  portraitPrompt: string;
  setPortraitPrompt: (p: string) => void;
  isGeneratingPortrait: boolean;
  onGeneratePortrait: () => void;
  isExpandingPrompt: boolean;
  onExpandPortraitPrompt: () => void;
  portraitModelUsed: string | null;
  stylePreset: 'cinematic-fantasy' | 'dark-gothic' | 'heroic-anime' | 'vintage-dnd' | 'oil-masterpiece';
  setStylePreset: (s: any) => void;
}

export function WizardStep3HeroRelics({
  worldTheme,
  bespokeHeroes,
  selectedHeroConceptId,
  onApplyHeroConcept,
  isGeneratingBespokeHeroes,
  onGenerateStoryHeroes,
  onRandomizeName,
  characterName,
  setCharacterName,
  gender,
  setGender,
  race,
  setRace,
  recommendedRaces,
  customRaces,
  selectedClassIndex,
  selectedCustomClassId,
  onSelectClassIndex,
  onSelectCustomClass,
  customClasses,
  background,
  setBackground,
  alignment,
  setAlignment,
  storyMotivation,
  setStoryMotivation,
  customTrait,
  setCustomTrait,
  selectedItems,
  customItems,
  onToggleItem,
  onPreviewItem,
  onDeleteCustomItem,
  customItemPrompt,
  setCustomItemPrompt,
  customItemType,
  setCustomItemType,
  isForgingItem,
  onForgeCustomItem,
  portraitUrl,
  setPortraitUrl,
  portraitPrompt,
  setPortraitPrompt,
  isGeneratingPortrait,
  onGeneratePortrait,
  isExpandingPrompt,
  onExpandPortraitPrompt,
  portraitModelUsed,
  stylePreset,
  setStylePreset,
}: WizardStep3HeroRelicsProps) {
  const currentClass = selectedCustomClassId
    ? customClasses.find((c) => c.id === selectedCustomClassId)
    : STARTING_CLASSES[selectedClassIndex];
  const classNameDisplay = currentClass?.name || 'Adventurer';

  return (
    <div className="space-y-6 font-serif">
      {/* Header with AI Hero Forge Action */}
      <div className="border-b border-[#1e2d4a] pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>Character Forge & Relic Studio</span>
          </h2>
          <p className="text-xs text-slate-400">
            Heroes and relics tailored for: <strong className="text-slate-200">{worldTheme}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerateStoryHeroes}
            disabled={isGeneratingBespokeHeroes}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingBespokeHeroes ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-200" />
                <span>AI Forging Bespoke Heroes...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-amber-200" />
                <span>✨ AI Generate Story Heroes</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRandomizeName}
            className="px-3 py-1.5 rounded-xl border border-[#273752] bg-[#131d2e] text-xs font-bold text-slate-300 hover:bg-[#1c2a42] hover:text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Dice5 className="w-3.5 h-3.5 text-amber-400" />
            <span>Random Name</span>
          </button>
        </div>
      </div>

      {/* 1. Bespoke Story-Native Archetypes Carousel / Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>1. Choose a Story-Tailored Hero Archetype:</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            Equipped with story lore & custom relics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {bespokeHeroes.map((hero) => {
            const isSelected = selectedHeroConceptId === hero.id;
            return (
              <div
                key={hero.id}
                onClick={() => onApplyHeroConcept(hero)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-[#162238] shadow-md ring-2 ring-amber-400/40'
                    : 'border-[#1e2d4a] bg-[#111928] hover:border-[#2f4366] hover:bg-[#141f32]'
                }`}
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-2">
                    <img
                      src={
                        hero.portraitUrl ||
                        generateCharacterAvatarSvg({
                          name: hero.name,
                          className: hero.className || (hero as any).class || 'Adventurer',
                          race: hero.race,
                        })
                      }
                      alt={hero.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#273752] bg-[#090f1a] shrink-0"
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                          {hero.race} • {hero.className || (hero as any).class || 'Adventurer'}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-100 leading-snug truncate">
                        {hero.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 italic truncate">
                        "{hero.title}"
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2 line-clamp-2">
                    {hero.storyMotivation}
                  </p>

                  {hero.customTrait && (
                    <div className="mb-2 px-2 py-1 rounded-lg bg-[#090f1a] border border-[#1e2d4a] text-[10px] text-amber-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{hero.customTrait}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1e2d4a] flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate max-w-[150px]">
                    {hero.items.map((i) => i.name).join(', ')}
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                    {isSelected ? 'Active Hero' : 'Select →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Hero Fine-Tuning & Customization Form */}
      <div className="p-4 rounded-2xl bg-[#0f182a] border border-[#1e2d4a] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1e2d4a] pb-2">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-amber-400" />
            <span>2. Fine-Tune Hero Identity & Background</span>
          </span>
          <span className="text-[10px] text-slate-400">Class & Race synchronized with Step 2</span>
        </div>

        {/* Identity Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Hero Name
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
              placeholder="e.g. Valen Shadowstride"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="Non-Binary">Non-Binary</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Androgynous">Androgynous</option>
              <option value="Agender">Agender</option>
              <option value="Genderfluid">Genderfluid</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Hero Race
              </label>
              {customRaces.some((cr) => cr.name === race) && (
                <span className="text-[9px] font-mono text-amber-300 font-bold">
                  ★ Custom Race
                </span>
              )}
            </div>
            <select
              value={race}
              onChange={(e) => setRace(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              {customRaces.length > 0 && (
                <optgroup label="✨ Custom Forged Races">
                  {customRaces.map((cr) => (
                    <option key={`opt-cr-${cr.id}`} value={cr.name}>
                      ★ {cr.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="🌟 Recommended for Story Premise">
                {recommendedRaces.map((r) => (
                  <option key={`rec-${r}`} value={r}>
                    ⭐ {r}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All Classic & Exotic Races">
                {STARTING_RACES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Background Archetype
            </label>
            <input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
              placeholder="e.g. Outlander & Deep Scout"
            />
          </div>
        </div>

        {/* Story Motivation & Custom Trait */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Quest Motivation in this Dungeon
            </label>
            <input
              type="text"
              value={storyMotivation}
              onChange={(e) => setStoryMotivation(e.target.value)}
              placeholder="Why did this hero enter this dungeon?"
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Custom Story Trait / Specialty
            </label>
            <input
              type="text"
              value={customTrait}
              onChange={(e) => setCustomTrait(e.target.value)}
              placeholder="Unique lore perk (e.g. Night vision, Rune attunement)"
              className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. PROMINENT FORGED RELICS & CUSTOM ITEMS SHELF (ALWAYS VISIBLE & WORKING) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>3. Custom Forged Relics & Generated Items ({customItems.length})</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            Rendered with unique Perchance art & stats
          </span>
        </div>

        {/* Dedicated Shelf for Custom Items */}
        {customItems.length > 0 ? (
          <div className="p-3.5 rounded-2xl bg-[#0e192e] border-2 border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300">
                ✨ Active Forged Relics (Click item to inspect full art & lore):
              </span>
              <span className="text-[10px] text-slate-400">
                Toggle checkmark to equip/carry into dungeon
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {customItems.map((item) => {
                const isEquipped = selectedItems.some((i) => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 shadow-sm group ${
                      isEquipped
                        ? 'border-amber-400 bg-[#162744]'
                        : 'border-[#1e2d4a] bg-[#090f1a] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onPreviewItem(item)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-400/60 bg-[#090f1a] shrink-0 hover:scale-105 transition-transform cursor-pointer"
                      title="Inspect full image and statistics"
                    >
                      <ItemSprite item={item} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-4 h-4 text-amber-300" />
                      </div>
                    </button>

                    <div
                      className="overflow-hidden flex-1 cursor-pointer"
                      onClick={() => onPreviewItem(item)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] uppercase font-mono font-bold px-1 rounded bg-amber-500/20 text-amber-300">
                          {item.type}
                        </span>
                        <div className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300">
                          {item.name}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">
                        {item.damage || item.acBonus ? `+${item.acBonus} AC` : ''} {item.bonus || ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playDiceRoll();
                          onToggleItem(item);
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isEquipped
                            ? 'bg-emerald-500 text-black shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={isEquipped ? 'Equipped in inventory' : 'Click to equip'}
                      >
                        {isEquipped ? '✓ Equipped' : '+ Equip'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomItem(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete custom item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#090f1a] border border-[#1e2d4a] text-center text-xs text-slate-400">
            No custom relics forged yet. Use the forge bar below to craft an attuned artifact with deterministic Perchance AI art!
          </div>
        )}

        {/* Relic Forge Input Bar */}
        <div className="p-3 bg-[#0f182a] border border-[#1e2d4a] rounded-2xl flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <Hammer className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            value={customItemPrompt}
            onChange={(e) => setCustomItemPrompt(e.target.value)}
            placeholder="Forge custom story relic (e.g. Glowing pearl wand, abyssal harpoon, shadow cloak)..."
            className="flex-1 px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customItemPrompt.trim() && !isForgingItem) {
                onForgeCustomItem();
              }
            }}
          />
          <select
            value={customItemType}
            onChange={(e) => setCustomItemType(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
          >
            <option value="weapon">Weapon</option>
            <option value="armor">Armor</option>
            <option value="potion">Potion</option>
            <option value="misc">Relic / Artifact</option>
          </select>
          <button
            type="button"
            onClick={onForgeCustomItem}
            disabled={isForgingItem || !customItemPrompt.trim()}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all active:scale-98 shadow-sm"
          >
            {isForgingItem ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Forging...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Forge Relic</span>
              </>
            )}
          </button>
        </div>

        {/* Standard Starting Equipment List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Standard & Thematic Equipment ({selectedItems.length} selected for quest)</span>
            </label>
            <span className="text-[10px] text-slate-400">Click item thumbnail to inspect stats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-xl border-2 border-amber-400/80 bg-[#162238] flex items-center gap-2 transition-all shadow-2xs group"
              >
                <button
                  type="button"
                  onClick={() => onPreviewItem(item)}
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#273752] bg-[#090f1a] shrink-0 hover:border-amber-400 cursor-pointer"
                  title="Inspect item"
                >
                  <ItemSprite item={item} className="w-full h-full object-cover" />
                </button>
                <div
                  className="overflow-hidden flex-1 cursor-pointer"
                  onClick={() => onPreviewItem(item)}
                >
                  <div className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.damage || item.bonus || item.type}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playDiceRoll();
                    onToggleItem(item);
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-rose-400 p-1 cursor-pointer"
                  title="Toggle equipment"
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Character Portrait Studio (Perchance AI Generator) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>4. Character Portrait Studio (Perchance AI)</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            1:1 High Fantasy Visual Art
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#0f182a] border border-[#1e2d4a] rounded-2xl">
          {/* Left Column: Portrait Preview */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-md bg-[#090f1a]">
              <img
                src={
                  portraitUrl ||
                  generateCharacterAvatarSvg({
                    name: characterName || 'Hero',
                    className: classNameDisplay,
                    race,
                  })
                }
                alt="Hero Portrait"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = generateCharacterAvatarSvg({
                    name: characterName || 'Hero',
                    className: classNameDisplay,
                    race,
                  });
                }}
                className="w-full h-full object-cover"
              />
              {isGeneratingPortrait && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-amber-300 text-xs font-bold p-2 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1" />
                  <span>Generating with Perchance AI...</span>
                </div>
              )}
            </div>
            {portraitModelUsed && (
              <span className="text-[10px] text-emerald-400 font-mono font-bold text-center">
                ✓ {portraitModelUsed}
              </span>
            )}
          </div>

          {/* Right Column: Prompt & Generation Controls */}
          <div className="md:col-span-2 space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Visual Art Style:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'cinematic-fantasy', label: 'Cinematic Fantasy' },
                  { id: 'dark-gothic', label: 'Dark Gothic' },
                  { id: 'vintage-dnd', label: 'Vintage 5e' },
                  { id: 'oil-masterpiece', label: 'Oil Painting' },
                  { id: 'heroic-anime', label: 'Anime Heroic' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStylePreset(st.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                      stylePreset === st.id
                        ? 'bg-amber-500 text-black font-bold shadow-xs'
                        : 'bg-[#111928] text-slate-300 border border-[#1e2d4a] hover:bg-[#162238]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Portrait Prompt:
              </label>
              <textarea
                rows={2}
                value={portraitPrompt}
                onChange={(e) => setPortraitPrompt(e.target.value)}
                placeholder="High fantasy digital portrait of the adventurer..."
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-xs text-slate-100 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onExpandPortraitPrompt}
                disabled={isExpandingPrompt}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-[#131e33] hover:bg-[#1a2944] text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isExpandingPrompt ? 'animate-spin' : ''}`} />
                <span>{isExpandingPrompt ? 'Expanding...' : 'Expand Prompt'}</span>
              </button>

              <button
                type="button"
                onClick={onGeneratePortrait}
                disabled={isGeneratingPortrait}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isGeneratingPortrait ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>{isGeneratingPortrait ? 'Generating Art...' : 'Generate Art (Perchance)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
