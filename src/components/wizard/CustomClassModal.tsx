import React, { useState } from 'react';
import { Sparkles, Wand2, Plus, X, Shield, Swords, Zap, Check } from 'lucide-react';
import { CustomClass } from '../../types';
import { soundEngine } from '../../utils/audio';

interface CustomClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveClass: (customClass: CustomClass) => void;
  worldTheme: string;
  storyPremise: string;
}

export function CustomClassModal({
  isOpen,
  onClose,
  onSaveClass,
  worldTheme,
  storyPremise,
}: CustomClassModalProps) {
  const [name, setName] = useState('');
  const [hitDie, setHitDie] = useState<6 | 8 | 10 | 12>(8);
  const [primaryAbility, setPrimaryAbility] = useState('STR / DEX');
  const [description, setDescription] = useState('');
  const [baseHp, setBaseHp] = useState(18);
  const [baseAc, setBaseAc] = useState(14);
  const [specialAbility, setSpecialAbility] = useState('');
  const [startingEquipment, setStartingEquipment] = useState('Custom Weapon, Attuned Armor, Adventuring Pack');
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
          mode: 'class',
          prompt: `${name || 'Mystic combat archetype'} for ${worldTheme}`,
          worldTheme,
          premise: storyPremise,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.customClass) {
          setName(data.customClass.name || name);
          setHitDie(data.customClass.hitDie || 8);
          setPrimaryAbility(data.customClass.primaryAbility || primaryAbility);
          setDescription(data.customClass.description || description);
          setBaseHp(data.customClass.baseHp || 18);
          setBaseAc(data.customClass.baseAc || 14);
          setSpecialAbility(data.customClass.specialAbility || '');
          if (Array.isArray(data.customClass.startingEquipment)) {
            setStartingEquipment(data.customClass.startingEquipment.join(', '));
          }
          soundEngine.playLevelUp();
        }
      }
    } catch (err) {
      console.warn('AI Class draft error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClass: CustomClass = {
      id: `custom-class-${Date.now()}`,
      name: name.trim(),
      hitDie: Number(hitDie) as 6 | 8 | 10 | 12,
      primaryAbility: primaryAbility.trim() || 'STR / DEX',
      description: description.trim() || `A dedicated discipline forged in the perils of ${worldTheme}.`,
      baseHp: Number(baseHp) || 18,
      baseAc: Number(baseAc) || 14,
      specialAbility: specialAbility.trim() || 'Mastery combat trait',
      startingEquipment: startingEquipment
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    onSaveClass(newClass);
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
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">Forge Custom Class</h3>
              <p className="text-[11px] text-slate-400 font-sans">Design your combat discipline, hit die, and signature power</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-200 block mb-1">Class Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blood Mage, Rune Knight, Shadowblade"
                className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 block mb-1">Hit Die</label>
              <select
                value={hitDie}
                onChange={(e) => setHitDie(Number(e.target.value) as any)}
                className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
              >
                <option value={6}>d6 (Mage / Sorcerer style)</option>
                <option value={8}>d8 (Rogue / Bard / Cleric style)</option>
                <option value={10}>d10 (Fighter / Paladin / Ranger style)</option>
                <option value={12}>d12 (Barbarian / Juggernaut style)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Class Role & Lore</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Combat philosophy, training, and role in party..."
              className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="font-bold text-slate-200 block mb-1">Primary Ability</label>
              <input
                type="text"
                value={primaryAbility}
                onChange={(e) => setPrimaryAbility(e.target.value)}
                placeholder="STR / DEX"
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 block mb-1">Starting HP</label>
              <input
                type="number"
                value={baseHp}
                onChange={(e) => setBaseHp(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-200 block mb-1">Base AC</label>
              <input
                type="number"
                value={baseAc}
                onChange={(e) => setBaseAc(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Signature Class Power / Ability</label>
            <input
              type="text"
              value={specialAbility}
              onChange={(e) => setSpecialAbility(e.target.value)}
              placeholder="e.g. Siphon Soul: Drain 1d6 HP on kill and add to temp HP"
              className="w-full px-3 py-2 bg-[#090f1a] border border-[#273752] rounded-xl text-slate-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Starting Equipment (Comma separated)</label>
            <input
              type="text"
              value={startingEquipment}
              onChange={(e) => setStartingEquipment(e.target.value)}
              placeholder="e.g. Runebound Greatsword, Chain Mail, Spell Focus"
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
              <span>Save & Select Class</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
