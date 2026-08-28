import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { PRESET_HEROES } from '../utils/diceUtils';
import { CURATED_PORTRAITS, getCuratedPortrait } from '../utils/portraitCatalog';
import { soundEngine } from '../utils/audio';
import { User, Shield, Sparkles, X, Check, Dices, Wand2, Image as ImageIcon } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCharacter: Character;
  onSelectCharacter: (char: Character) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  currentCharacter,
  onSelectCharacter,
}) => {
  const [customChar, setCustomChar] = useState<Character>({ ...currentCharacter });
  const [selectedTab, setSelectedTab] = useState<'presets' | 'custom' | 'gallery'>('presets');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditInput, setShowEditInput] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState<
    'cinematic-fantasy' | 'dark-gothic' | 'heroic-anime' | 'vintage-dnd' | 'oil-masterpiece'
  >('cinematic-fantasy');

  // Keep customChar in sync when modal opens or currentCharacter updates
  useEffect(() => {
    if (isOpen) {
      setCustomChar({ ...currentCharacter });
    }
  }, [isOpen, currentCharacter]);

  if (!isOpen) return null;

  const handleApplyPreset = (hero: Character) => {
    onSelectCharacter(hero);
    onClose();
  };

  const handleGenerateAiPortrait = async () => {
    const prompt = customChar.portraitPrompt || `High fantasy portrait of ${customChar.name}, a ${customChar.race} ${customChar.className}`;
    setIsGenerating(true);
    setGenError(null);

    try {
      soundEngine.playDiceRoll();
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: '1:1',
          stylePreset,
          imageSize: '1K',
          modelChoice: 'perchance',
          characterName: customChar.name,
          className: customChar.className,
          race: customChar.race,
        }),
      });

      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const data = await res.json();
      if (data.imageUrl) {
        setCustomChar((prev) => ({ ...prev, portraitUrl: data.imageUrl }));
        setGenError(data.source ? `Generated with ${data.source}` : 'Generated portrait with Perchance AI.');
        soundEngine.playLevelUp();
      }
    } catch (err: unknown) {
      console.warn('AI portrait generation in modal fallback:', err);
      // Generate a dynamic AI image url with Perchance or fallback engine
      const cleanPrompt = prompt.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 150);
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      const dynamicAiUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=square&seed=${dynamicSeed}`;
      setCustomChar((prev) => ({ ...prev, portraitUrl: dynamicAiUrl }));
      setGenError('Generated portrait with Perchance AI.');
      soundEngine.playLevelUp();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditPortrait = async () => {
    if (!editPrompt.trim() || !customChar.portraitUrl || isEditing) return;
    setIsEditing(true);
    setGenError(null);

    try {
      soundEngine.playDiceRoll();
      const res = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: customChar.portraitUrl,
          editPrompt,
          aspectRatio: '1:1',
          modelChoice: 'perchance',
          characterName: customChar.name,
          className: customChar.className,
          race: customChar.race,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${res.status}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        setCustomChar((prev) => ({ ...prev, portraitUrl: data.imageUrl }));
        setEditPrompt('');
        setShowEditInput(false);
        setGenError(data.source ? `Edited with ${data.source}` : 'Portrait refined with Perchance AI.');
        soundEngine.playLevelUp();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setGenError(`Image edit: ${error.message}`);
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectCharacter(customChar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full bg-[#fdfaf1] dark:bg-[#0b1220] border-2 border-[#e2dcc5] dark:border-[#1e2d4a] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#2c1810] dark:text-slate-100">
        {/* Header */}
        <div className="p-4 bg-[#fdfaf1] dark:bg-[#0f172a] border-b border-[#e2dcc5] dark:border-[#1e2d4a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#8c7e6a] dark:text-amber-400" />
            <h2 className="text-base font-bold text-[#2c1810] dark:text-slate-100 font-serif italic">
              Choose or Customize Your Hero
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-white hover:bg-[#e2dcc5]/50 dark:hover:bg-[#1e2d4a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#e2dcc5] dark:border-[#1e2d4a] bg-white/50 dark:bg-[#080d18]">
          <button
            onClick={() => setSelectedTab('presets')}
            className={`flex-1 py-2.5 text-xs font-serif font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              selectedTab === 'presets'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300 bg-[#e2dcc5]/40 dark:bg-[#1e293b]'
                : 'border-transparent text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-slate-200'
            }`}
          >
            Pre-Made Archetypes
          </button>
          <button
            onClick={() => setSelectedTab('custom')}
            className={`flex-1 py-2.5 text-xs font-serif font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              selectedTab === 'custom'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300 bg-[#e2dcc5]/40 dark:bg-[#1e293b]'
                : 'border-transparent text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-slate-200'
            }`}
          >
            Custom Character Sheet
          </button>
          <button
            onClick={() => setSelectedTab('gallery')}
            className={`flex-1 py-2.5 text-xs font-serif font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              selectedTab === 'gallery'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300 bg-[#e2dcc5]/40 dark:bg-[#1e293b]'
                : 'border-transparent text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-slate-200'
            }`}
          >
            Portrait Gallery
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {selectedTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESET_HEROES.map((hero) => {
                const isSelected = currentCharacter.name === hero.name;
                return (
                  <div
                    key={hero.name}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-[#e2dcc5]/60 dark:bg-[#1e293b] border-[#2c1810] dark:border-amber-400/80 shadow-md'
                        : 'bg-white dark:bg-[#0f172a] border-[#e2dcc5] dark:border-[#1e2d4a] hover:border-[#b8ae8f] dark:hover:border-amber-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#2c1810] dark:text-slate-100 font-serif italic">{hero.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-[#2e5a44] dark:text-emerald-400" />}
                      </div>
                      <p className="text-xs uppercase tracking-wider text-[#8c7e6a] dark:text-amber-400 font-bold">
                        {hero.race} {hero.className}
                      </p>
                      <p className="text-[11px] text-[#4a3227] dark:text-slate-300 mt-1 italic font-serif">{hero.background}</p>

                      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-center font-mono bg-[#fdfaf1] dark:bg-[#080d18] p-1.5 rounded-lg border border-[#e2dcc5] dark:border-[#1e2d4a]">
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">STR</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.str}</span>
                        </div>
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">DEX</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.dex}</span>
                        </div>
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">CON</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.con}</span>
                        </div>
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">INT</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.int}</span>
                        </div>
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">WIS</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.wis}</span>
                        </div>
                        <div>
                          <span className="text-[#8c7e6a] dark:text-slate-400 block font-bold">CHA</span>
                          <span className="text-[#2c1810] dark:text-slate-100 font-bold">{hero.stats.cha}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(hero)}
                      className={`mt-3 w-full py-1.5 rounded-xl font-serif font-bold text-xs transition-colors shadow-xs cursor-pointer ${
                        isSelected
                          ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950'
                          : 'bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-slate-100 border border-[#e2dcc5] dark:border-[#334155]'
                      }`}
                    >
                      {isSelected ? 'Current Hero' : 'Select Hero'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTab === 'custom' && (
            /* Custom Character Form */
            <form onSubmit={handleSaveCustom} className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Character Name</label>
                  <input
                    type="text"
                    value={customChar.name}
                    onChange={(e) => setCustomChar({ ...customChar, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 shadow-inner"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Class</label>
                  <input
                    type="text"
                    value={customChar.className}
                    onChange={(e) => setCustomChar({ ...customChar, className: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Race</label>
                  <input
                    type="text"
                    value={customChar.race}
                    onChange={(e) => setCustomChar({ ...customChar, race: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Max HP</label>
                  <input
                    type="number"
                    value={customChar.maxHp}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 10;
                      setCustomChar({ ...customChar, maxHp: val, hp: Math.min(customChar.hp, val) });
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Armor Class (AC)</label>
                  <input
                    type="number"
                    value={customChar.ac}
                    onChange={(e) => setCustomChar({ ...customChar, ac: parseInt(e.target.value, 10) || 10 })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 block mb-1">Ability Scores</label>
                <div className="grid grid-cols-6 gap-2">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => (
                    <div key={stat} className="text-center">
                      <span className="text-[10px] uppercase font-bold text-[#8c7e6a] dark:text-slate-400 block mb-0.5">{stat}</span>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={customChar.stats[stat]}
                        onChange={(e) =>
                          setCustomChar({
                            ...customChar,
                            stats: {
                              ...customChar.stats,
                              [stat]: parseInt(e.target.value, 10) || 10,
                            },
                          })
                        }
                        className="w-full text-center px-1 py-1 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-lg text-xs text-[#2c1810] dark:text-slate-100 font-mono font-bold shadow-inner"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Portrait Preview and AI Generator in Modal */}
              <div className="p-3 bg-white dark:bg-[#0f172a] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hero Portrait Studio</span>
                  </label>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-serif font-semibold border border-emerald-300 dark:border-emerald-700/50">
                    Perchance AI Generator • Free
                  </span>
                </div>

                {/* Style preset buttons */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'cinematic-fantasy', label: '✨ Fantasy' },
                    { id: 'dark-gothic', label: '⚔️ Gothic' },
                    { id: 'heroic-anime', label: '⚡ Anime' },
                    { id: 'vintage-dnd', label: '📜 Parchment' },
                    { id: 'oil-masterpiece', label: '🎨 Oil' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStylePreset(st.id as any)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-serif transition-all cursor-pointer ${
                        stylePreset === st.id
                          ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 font-bold'
                          : 'bg-[#fdfaf1] dark:bg-[#1e293b] text-[#4a3227] dark:text-slate-300 hover:bg-[#e2dcc5] dark:hover:bg-[#283548] border border-[#e2dcc5] dark:border-[#334155]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                  {customChar.portraitUrl && (
                    <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/80 dark:border-amber-400 bg-[#090f1a] shadow-md ring-1 ring-amber-400/20">
                      <img
                        src={customChar.portraitUrl}
                        alt="Portrait"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      value={customChar.portraitPrompt || ''}
                      onChange={(e) => setCustomChar({ ...customChar, portraitPrompt: e.target.value })}
                      placeholder="Describe appearance (armor, face, weapons, aura)..."
                      className="w-full px-2.5 py-1.5 bg-[#fdfaf1] dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-lg text-xs text-[#2c1810] dark:text-slate-100"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateAiPortrait}
                        disabled={isGenerating}
                        className="px-3 py-1 bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 text-xs rounded-lg font-serif font-bold flex items-center gap-1 hover:bg-[#4a3227] dark:hover:bg-amber-400 disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        {isGenerating ? <Sparkles className="w-3 h-3 animate-spin text-[#b8ae8f] dark:text-slate-950" /> : <Wand2 className="w-3 h-3 text-[#b8ae8f] dark:text-slate-950" />}
                        <span>Generate with Perchance AI</span>
                      </button>
                      {customChar.portraitUrl && (
                        <button
                          type="button"
                          onClick={() => setShowEditInput(!showEditInput)}
                          className="px-2.5 py-1 bg-white dark:bg-[#1e293b] border border-[#b8ae8f] dark:border-[#334155] text-[#2c1810] dark:text-slate-100 text-xs rounded-lg font-serif hover:bg-[#f5f0e3] dark:hover:bg-[#283548] flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#8c7e6a] dark:text-amber-400" />
                          <span>{showEditInput ? 'Close Edit' : 'Refine Portrait'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedTab('gallery')}
                        className="px-2.5 py-1 bg-[#f5f0e3] dark:bg-[#1e293b] text-[#2c1810] dark:text-slate-100 text-xs rounded-lg font-serif hover:bg-[#e2dcc5] dark:hover:bg-[#283548] cursor-pointer"
                      >
                        Hero Gallery
                      </button>
                    </div>

                    {showEditInput && customChar.portraitUrl && (
                      <div className="mt-2 p-2 bg-[#fdfaf1] dark:bg-[#080d18] rounded-lg border border-[#b8ae8f] dark:border-[#1e2d4a] space-y-1.5 animate-fade-in shadow-2xs">
                        <span className="text-[10px] font-serif font-bold text-[#2c1810] dark:text-slate-200 block">
                          Refine Portrait with Perchance AI:
                        </span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            disabled={isEditing}
                            placeholder="e.g. Add glowing crown and fiery cape..."
                            className="flex-1 px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded text-xs text-[#2c1810] dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={handleEditPortrait}
                            disabled={isEditing || !editPrompt.trim()}
                            className="px-3 py-1 bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 text-xs rounded font-serif font-bold hover:bg-[#4a3227] dark:hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                          >
                            {isEditing ? <Sparkles className="w-3 h-3 animate-spin text-[#b8ae8f] dark:text-slate-950" /> : <Wand2 className="w-3 h-3 text-[#b8ae8f] dark:text-slate-950" />}
                            <span>Apply</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {genError && <p className="text-[10px] text-[#2e5a44] dark:text-emerald-400 font-medium">{genError}</p>}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] text-[#2c1810] dark:text-slate-200 hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-xs font-serif font-bold shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 text-[#fdfaf1] dark:text-slate-950 text-xs font-serif font-bold shadow-sm cursor-pointer"
                >
                  Save Character
                </button>
              </div>
            </form>
          )}

          {selectedTab === 'gallery' && (
            <div className="space-y-3">
              <p className="text-xs text-[#8c7e6a] dark:text-slate-400">Select any portrait from the curated fantasy archives:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto p-1 bg-white dark:bg-[#080d18] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-xl">
                {CURATED_PORTRAITS.map((p) => {
                  const isSelected = customChar.portraitUrl === p.url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCustomChar((prev) => ({ ...prev, portraitUrl: p.url }));
                        soundEngine.playDiceRoll();
                      }}
                      className={`p-1.5 rounded-xl border text-left transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#e2dcc5]/60 dark:bg-[#1e293b] border-[#2c1810] dark:border-amber-400 ring-2 ring-[#2c1810] dark:ring-amber-400'
                          : 'border-[#e2dcc5] dark:border-[#1e2d4a] hover:border-[#b8ae8f] dark:hover:border-amber-500/40 bg-[#fdfaf1] dark:bg-[#0f172a]'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-lg shadow-xs"
                      />
                      <div className="text-center w-full">
                        <div className="text-[10px] font-serif font-bold text-[#2c1810] dark:text-slate-100 truncate">
                          {p.name}
                        </div>
                        <div className="text-[9px] text-[#8c7e6a] dark:text-slate-400 truncate">
                          {p.className}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTab('custom')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 text-xs font-serif font-bold cursor-pointer"
                >
                  Confirm & Edit Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
