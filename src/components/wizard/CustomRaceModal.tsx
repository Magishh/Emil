import React, { useState } from 'react';
import { Sparkles, Wand2, Plus, X, Shield, Swords, Zap, Check } from 'lucide-react';
import { CustomRace } from '../../types';
import { soundEngine } from '../../utils/audio';

interface CustomRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRace: (race: CustomRace) => void;
  worldTheme: string;
  storyPremise: string;
}

export function CustomRaceModal({
  isOpen,
  onClose,
  onSaveRace,
  worldTheme,
  storyPremise,
}: CustomRaceModalProps) {
  const [name, setName] = useState('');
  const [lore, setLore] = useState('');
  const [racialTraits, setRacialTraits] = useState('+2 INT, +1 DEX');
  const [speed, setSpeed] = useState(30);
  const [senses, setSenses] = useState('Darkvision 60ft');
  const [specialAbility, setSpecialAbility] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  if (!isOpen) return null;

  const handleAiDraft = async () => {
    setIsGeneratingAi(true);
    soundEngine.playDiceRoll();
    try {
      const res = await fetch('/api/generate-custom-race-or-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'race',
          prompt: `${name || 'Mystic planar species'} suitable for ${worldTheme}`,
          worldTheme,
          premise: storyPremise,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.race) {
          setName(data.race.name || name);
          setLore(data.race.lore || lore);
          setRacialTraits(data.race.racialTraits || racialTraits);
          setSpeed(data.race.speed || 30);
          setSenses(data.race.senses || 'Darkvision 60ft');
          setSpecialAbility(data.race.specialAbility || '');
          soundEngine.playLevelUp();
        }
      }
    } catch (err) {
      console.warn('AI Race draft error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRace: CustomRace = {
      id: `custom-race-${Date.now()}`,
      name: name.trim(),
      lore: lore.trim() || `An ancient, distinct race hailing from the mysteries of ${worldTheme}.`,
      racialTraits: racialTraits.trim() || '+2 Attribute, +1 Attribute',
      speed: Number(speed) || 30,
      senses: senses.trim() || 'Darkvision 60ft',
      specialAbility: specialAbility.trim() || 'Unique racial heritage trait',
    };

    onSaveRace(newRace);
    soundEngine.playVictory();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="relative max-w-lg w-full bg-[#0b1322] border-2 border-amber-500/40 rounded-3xl shadow-2xl p-5 text-slate-100 font-serif space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1e2d4a] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">Forge Custom Race</h3>
              <p className="text-[11px] text-slate-400 font-sans">Define your own fantasy species with racial traits & bonuses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Inspiration Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101a2d] border border-[#1e2d4a]">
          <span className="text-xs text-slate-300">Need inspiration tailored to {worldTheme}?</span>
          <button
            type="button"
            onClick={handleAiDraft}
            disabled={isGeneratingAi}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAi ? 'Drafting...' : '✨ AI Auto-Fill'}</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-200 block mb-1">Race Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Astral Revenant, Chrono-Gnome, Deep Triton"
              className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Racial Lore & Heritage</label>
            <textarea
              rows={2}
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              placeholder="Origins, culture, and mystical attributes..."
              className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="font-bold text-slate-200 block mb-1">Stat Bonuses</label>
              <input
                type="text"
                value={racialTraits}
                onChange={(e) => setRacialTraits(e.target.value)}
                placeholder="+2 INT, +1 DEX"
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 block mb-1">Speed (ft)</label>
              <input
                type="number"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 block mb-1">Senses</label>
              <input
                type="text"
                value={senses}
                onChange={(e) => setSenses(e.target.value)}
                placeholder="Darkvision 60ft"
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Signature Special Ability</label>
            <input
              type="text"
              value={specialAbility}
              onChange={(e) => setSpecialAbility(e.target.value)}
              placeholder="e.g. Planar Shift: Once per short rest, teleport 15ft as a bonus action"
              className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#1e2d4a] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#131e33] border border-[#273752] text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Select Race</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
