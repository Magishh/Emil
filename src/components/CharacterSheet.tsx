import React, { useState, useEffect } from 'react';
import { Character, Ability, InventoryItem, StatusEffect, StatusEffectType } from '../types';
import { getAbilityModifier, formatModifier, getItemThumbnail, PRESET_CONDITIONS } from '../utils/diceUtils';
import { generateCharacterAvatarSvg } from '../utils/svgArt';
import { soundEngine } from '../utils/audio';
import { ItemSprite, PortraitSprite } from './Sprite';
import { ItemDetailsModal } from './ItemDetailsModal';
import { BodyStatusVisual } from './BodyStatusVisual';
import {
  Heart,
  Shield,
  Zap,
  Coins,
  Backpack,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  Wand2,
  Sword,
  FlaskConical,
  Edit3,
  Dices,
  Eye,
  EyeOff,
  Skull,
  Ghost,
  Flame,
  AlertTriangle,
  Activity,
  Lock,
  Music,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  Hourglass,
  X,
  Info,
  Check,
  Search,
  Crosshair,
  Maximize2,
} from 'lucide-react';

interface CharacterSheetProps {
  character: Character;
  onUpdateCharacter: (updater: (prev: Character) => Character) => void;
  onTriggerStatRoll: (ability: Ability, label: string) => void;
  onGeneratePortrait?: () => void;
  isGeneratingPortrait?: boolean;
  onOpenCharacterModal?: () => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  character,
  onUpdateCharacter,
  onTriggerStatRoll,
  onGeneratePortrait,
  isGeneratingPortrait = false,
  onOpenCharacterModal,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory' | 'conditions'>('stats');
  const [imgError, setImgError] = useState(false);
  const [isPortraitPreviewOpen, setIsPortraitPreviewOpen] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<InventoryItem | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<StatusEffect | null>(null);
  const [isAddConditionOpen, setIsAddConditionOpen] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'buff' | 'debuff'>('all');

  // Reset imgError whenever the character portrait changes
  useEffect(() => {
    setImgError(false);
  }, [character.portraitUrl, character.name]);

  // Inventory search and category filter state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'equipped' | 'weapon' | 'armor' | 'potion' | 'misc'>('all');

  // Custom condition form state
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<StatusEffectType>('debuff');
  const [customDesc, setCustomDesc] = useState('');
  const [customMech, setCustomMech] = useState('');
  const [customDuration, setCustomDuration] = useState<number>(3);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const fallbackAvatar = generateCharacterAvatarSvg(character);
  const portraitSrc = (!imgError && character.portraitUrl) ? character.portraitUrl : fallbackAvatar;

  const statusEffects = character.statusEffects || [];

  // Helper to render condition icon
  const renderConditionIcon = (iconName?: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'Skull':
        return <Skull className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'EyeOff':
        return <EyeOff className={className} />;
      case 'Ghost':
        return <Ghost className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'AlertTriangle':
        return <AlertTriangle className={className} />;
      case 'Activity':
        return <Activity className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'Lock':
        return <Lock className={className} />;
      case 'Music':
        return <Music className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'HeartPulse':
        return <HeartPulse className={className} />;
      case 'Hourglass':
        return <Hourglass className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  // HP Math (guard against a zero maxHp, which would render a NaN width)
  const safeMaxHp = Math.max(1, character.maxHp || 0);
  const hpPercent = Math.max(0, Math.min(100, (character.hp / safeMaxHp) * 100));

  const handleAdjustHp = (amount: number) => {
    // Sound belongs outside the updater: React may invoke it more than once.
    if (amount > 0) {
      soundEngine.playHeal();
    } else {
      soundEngine.playSwordStrike();
    }
    onUpdateCharacter((prev) => ({
      ...prev,
      hp: Math.max(0, Math.min(prev.maxHp, prev.hp + amount)),
    }));
  };

  const handleAddPresetCondition = (preset: typeof PRESET_CONDITIONS[0]) => {
    const newEffect: StatusEffect = {
      id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: preset.name,
      type: preset.type,
      description: preset.description,
      mechanicalEffect: preset.mechanicalEffect,
      durationTurns: preset.durationTurns,
      icon: preset.icon,
      color: preset.color,
      source: 'Condition / Spell Effect',
    };

    onUpdateCharacter((prev) => {
      const existing = prev.statusEffects || [];
      // Replace if same name already exists, otherwise append
      const filtered = existing.filter((e) => e.name.toLowerCase() !== preset.name.toLowerCase());
      return {
        ...prev,
        statusEffects: [...filtered, newEffect],
      };
    });

    if (preset.type === 'buff') {
      soundEngine.playVictory();
    } else {
      soundEngine.playSwordStrike();
    }

    setIsAddConditionOpen(false);
  };

  const handleCreateCustomCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEffect: StatusEffect = {
      id: `custom-effect-${Date.now()}`,
      name: customName.trim(),
      type: customType,
      description: customDesc.trim() || 'Custom active condition.',
      mechanicalEffect: customMech.trim() || undefined,
      durationTurns: customDuration > 0 ? customDuration : undefined,
      icon: customType === 'buff' ? 'Sparkles' : 'Skull',
      color: customType === 'buff' ? '#38bdf8' : '#ef4444',
      source: 'Custom Status',
    };

    onUpdateCharacter((prev) => ({
      ...prev,
      statusEffects: [...(prev.statusEffects || []), newEffect],
    }));

    soundEngine.playVictory();
    setCustomName('');
    setCustomDesc('');
    setCustomMech('');
    setIsCustomMode(false);
    setIsAddConditionOpen(false);
  };

  const handleRemoveEffect = (effectId: string) => {
    soundEngine.playHeal();
    onUpdateCharacter((prev) => ({
      ...prev,
      statusEffects: (prev.statusEffects || []).filter((e) => e.id !== effectId),
    }));
    if (selectedEffect?.id === effectId) {
      setSelectedEffect(null);
    }
  };

  const handleAdjustEffectDuration = (effectId: string, delta: number) => {
    onUpdateCharacter((prev) => {
      const updated = (prev.statusEffects || []).map((e) => {
        if (e.id === effectId) {
          const current = e.durationTurns ?? 3;
          const next = Math.max(1, current + delta);
          return { ...e, durationTurns: next };
        }
        return e;
      });
      return { ...prev, statusEffects: updated };
    });
  };

  const handleUseItem = (item: InventoryItem) => {
    if (item.type === 'potion' || item.type === 'scroll') {
      // Consume potion/scroll and heal or trigger magical effect
      soundEngine.playHeal();
      // 2d4+4 (6 to 12), matching the healing potion text.
      const healAmount =
        Math.floor(Math.random() * 4) + 1 + Math.floor(Math.random() * 4) + 1 + 4;
      onUpdateCharacter((prev) => {
        const newHp = Math.min(prev.maxHp, prev.hp + healAmount);
        const newInv = prev.inventory
          .map((i) => {
            if (i.id === item.id) {
              return { ...i, quantity: i.quantity - 1 };
            }
            return i;
          })
          .filter((i) => i.quantity > 0);

        return { ...prev, hp: newHp, inventory: newInv };
      });

      if (inspectedItem && inspectedItem.id === item.id) {
        if (inspectedItem.quantity <= 1) {
          setInspectedItem(null);
        } else {
          setInspectedItem({ ...inspectedItem, quantity: inspectedItem.quantity - 1 });
        }
      }
    } else if (item.type === 'weapon' || item.type === 'armor') {
      // Toggle equip
      soundEngine.playDiceRoll();
      onUpdateCharacter((prev) => {
        const newInv = prev.inventory.map((i) => {
          if (i.id === item.id) {
            return { ...i, equipped: !i.equipped };
          }
          return i;
        });
        return { ...prev, inventory: newInv };
      });

      if (inspectedItem && inspectedItem.id === item.id) {
        setInspectedItem({ ...inspectedItem, equipped: !inspectedItem.equipped });
      }
    }
  };

  const handleDropItem = (item: InventoryItem) => {
    soundEngine.playSwordStrike();
    onUpdateCharacter((prev) => {
      const newInv = prev.inventory
        .map((i) => {
          if (i.id === item.id) {
            return { ...i, quantity: i.quantity - 1 };
          }
          return i;
        })
        .filter((i) => i.quantity > 0);
      return { ...prev, inventory: newInv };
    });

    if (inspectedItem && inspectedItem.id === item.id) {
      if (inspectedItem.quantity <= 1) {
        setInspectedItem(null);
      } else {
        setInspectedItem({ ...inspectedItem, quantity: inspectedItem.quantity - 1 });
      }
    }
  };

  const handleUpdateItemImage = (itemId: string, newImageUrl: string) => {
    onUpdateCharacter((prev) => {
      const newInv = prev.inventory.map((i) => {
        if (i.id === itemId) {
          return { ...i, imageUrl: newImageUrl };
        }
        return i;
      });
      return { ...prev, inventory: newInv };
    });

    if (inspectedItem && inspectedItem.id === itemId) {
      setInspectedItem({ ...inspectedItem, imageUrl: newImageUrl });
    }
  };

  const abilities: { key: Ability; label: string; score: number }[] = [
    { key: 'STR', label: 'Strength', score: character.stats.str },
    { key: 'DEX', label: 'Dexterity', score: character.stats.dex },
    { key: 'CON', label: 'Constitution', score: character.stats.con },
    { key: 'INT', label: 'Intelligence', score: character.stats.int },
    { key: 'WIS', label: 'Wisdom', score: character.stats.wis },
    { key: 'CHA', label: 'Charisma', score: character.stats.cha },
  ];

  const filteredPresetConditions = PRESET_CONDITIONS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(conditionSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(conditionSearch.toLowerCase()) ||
      (p.mechanicalEffect && p.mechanicalEffect.toLowerCase().includes(conditionSearch.toLowerCase()));
    const matchesFilter =
      conditionFilter === 'all' || p.type === conditionFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      id="character-sheet-container"
      className="flex flex-col h-full bg-[#2c1810] text-[#fdfaf1] border border-[#4a3227] rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Header Profile Section with Portrait and Identity */}
      <div className="p-3.5 bg-[#24130d] dark:bg-[#080d18] border-b border-[#4a3227] dark:border-[#1e2d4a] flex items-center gap-3.5 sm:gap-4 shrink-0 transition-colors">
        {/* Character Portrait with AI Regenerate, Zoom & Quick Actions */}
        <div className="relative group shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/80 dark:border-amber-400 bg-[#0f172a] shadow-lg ring-1 ring-amber-400/20">
          <PortraitSprite
            character={character}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />

          {/* Quick Action Overlay on Hover */}
          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity text-white">
            <button
              onClick={() => setIsPortraitPreviewOpen(true)}
              title="Inspect Full Character Portrait"
              className="p-1.5 rounded-lg bg-black/80 hover:bg-amber-600 text-amber-300 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {onGeneratePortrait && (
              <button
                onClick={onGeneratePortrait}
                disabled={isGeneratingPortrait}
                title="Regenerate with Perchance AI"
                className="p-1.5 rounded-lg bg-black/80 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingPortrait ? 'animate-spin' : ''}`} />
              </button>
            )}
            {onOpenCharacterModal && (
              <button
                onClick={onOpenCharacterModal}
                title="Customize Hero & Studio"
                className="p-1.5 rounded-lg bg-black/80 hover:bg-amber-600 text-amber-300 hover:text-white transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Badge at Bottom of Portrait */}
          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs py-0.5 px-1 text-center border-t border-amber-400/30">
            <span className="text-[9px] font-mono font-bold text-amber-300 truncate block">
              Lvl {character.level} • {character.className}
            </span>
          </div>

          {isGeneratingPortrait && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-amber-300 text-[10px] font-bold p-1 text-center">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin mb-1" />
              <span>Forging AI...</span>
            </div>
          )}
        </div>

        {/* Identity & Level */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-base sm:text-lg font-serif italic font-bold text-[#fdfaf1] dark:text-slate-100 truncate">
              {character.name}
            </h2>
            {onOpenCharacterModal && (
              <button
                onClick={onOpenCharacterModal}
                title="Switch Hero / Edit Character"
                className="p-1.5 rounded-lg text-[#b8ae8f] dark:text-slate-400 hover:text-[#fdfaf1] dark:hover:text-amber-300 hover:bg-[#4a3227] dark:hover:bg-[#1e2d4a] transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#3d2417] dark:bg-amber-500/20 text-[#e2dcc5] dark:text-amber-300 border border-[#5a3b2b] dark:border-amber-500/30">
              {character.race} {character.className}
            </span>
            <span className="text-[10px] text-[#b8ae8f] dark:text-slate-400 font-serif italic truncate max-w-[140px]">
              {character.background || 'Adventurer'}
            </span>
          </div>
          <div className="flex items-center gap-3 pt-0.5 text-xs text-[#d9d4c7] dark:text-slate-300 font-mono">
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> AC {character.ac}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> Init {formatModifier(character.initiativeBonus)}
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> {character.gold} gp
            </span>
          </div>
        </div>
      </div>

      {/* Health Bar Quick Tracker */}
      <div className="px-4 py-2.5 bg-[#2c1810] border-b border-[#4a3227] shrink-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px] text-[#b8ae8f]">
            <Heart className="w-3.5 h-3.5 text-[#c94c4c] fill-[#c94c4c]" />
            <span>Health Points</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#fdfaf1]">
              {character.hp} / {character.maxHp}
              {character.tempHp > 0 && <span className="text-[#b8ae8f]"> (+{character.tempHp} temp)</span>}
            </span>
            <div className="flex items-center gap-1 ml-1.5">
              <button
                onClick={() => handleAdjustHp(-1)}
                title="Take 1 Damage"
                className="p-1 rounded bg-[#4a3227] hover:bg-[#8b2b2b] text-[#fdfaf1] border border-white/10 transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleAdjustHp(1)}
                title="Heal 1 HP"
                className="p-1 rounded bg-[#4a3227] hover:bg-[#2e5a44] text-[#fdfaf1] border border-white/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Health Bar Visual */}
        <div className="h-2.5 w-full bg-black/50 rounded-full border border-[#4a3227] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8b2b2b] to-[#c94c4c] shadow-[0_0_10px_rgba(201,76,76,0.4)] transition-all duration-500 rounded-full"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Active Status Effects Banner (Always Visible Quick Bar) */}
      <div className="px-3.5 py-2 bg-[#20100a] border-b border-[#4a3227] shrink-0">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-[#b8ae8f]">
            <Sparkles className="w-3 h-3 text-[#b8ae8f]" />
            <span>Active Conditions</span>
            {statusEffects.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#b8ae8f]/20 text-[#b8ae8f] text-[9px] font-mono font-bold">
                {statusEffects.length}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsAddConditionOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[#b8ae8f] hover:text-[#fdfaf1] text-[10px] font-bold uppercase tracking-wider border border-white/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Condition</span>
          </button>
        </div>

        {statusEffects.length === 0 ? (
          <p className="text-[10px] text-[#b8ae8f]/50 italic font-serif py-0.5">
            Normal (No active conditions or status effects)
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {statusEffects.map((effect) => {
              const isBuff = effect.type === 'buff';
              const isDebuff = effect.type === 'debuff';
              return (
                <button
                  key={effect.id}
                  onClick={() => setSelectedEffect(effect)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer group ${
                    isBuff
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/60'
                      : isDebuff
                      ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:border-rose-400 hover:bg-rose-900/60'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/60'
                  }`}
                  title={`${effect.name}: ${effect.mechanicalEffect || effect.description}`}
                >
                  <span className="shrink-0">{renderConditionIcon(effect.icon, "w-3 h-3")}</span>
                  <span className="tracking-wide font-serif">{effect.name}</span>
                  {effect.durationTurns !== undefined && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 font-mono font-normal opacity-80">
                      {effect.durationTurns}t
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab Selector: Stats vs Inventory vs Conditions */}
      <div className="flex border-b border-[#4a3227] bg-[#24130d] shrink-0">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'stats'
              ? 'border-[#b8ae8f] text-[#fdfaf1] bg-white/5'
              : 'border-transparent text-[#b8ae8f]/60 hover:text-[#fdfaf1]'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-[#b8ae8f]" />
          <span>Abilities</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2 text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'inventory'
              ? 'border-[#b8ae8f] text-[#fdfaf1] bg-white/5'
              : 'border-transparent text-[#b8ae8f]/60 hover:text-[#fdfaf1]'
          }`}
        >
          <Backpack className="w-3.5 h-3.5 text-[#b8ae8f]" />
          <span>Inventory ({character.inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('conditions')}
          className={`flex-1 py-2 text-xs font-serif font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'conditions'
              ? 'border-[#b8ae8f] text-[#fdfaf1] bg-white/5'
              : 'border-transparent text-[#b8ae8f]/60 hover:text-[#fdfaf1]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#b8ae8f]" />
          <span>Status ({statusEffects.length})</span>
        </button>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 p-3 overflow-y-auto">
        {activeTab === 'stats' ? (
          <div className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-widest text-[#b8ae8f] mb-1 flex items-center justify-between">
              <span>Click stat to roll d20:</span>
              <span className="font-mono">MODIFIER</span>
            </p>

            {/* 6 Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {abilities.map(({ key, label, score }) => {
                const mod = getAbilityModifier(score);
                return (
                  <button
                    key={key}
                    onClick={() => onTriggerStatRoll(key, `${label} Check`)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#b8ae8f]/60 flex flex-col items-center justify-center text-center transition-all group shadow-sm cursor-pointer"
                  >
                    <span className="block text-[10px] uppercase font-bold text-[#b8ae8f] tracking-wider">
                      {key}
                    </span>
                    <span className="text-base font-bold text-[#fdfaf1] font-mono my-0.5">
                      {score}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-black/40 text-[#fdfaf1] border border-white/10 font-mono">
                      {formatModifier(mod)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Background & Alignment info */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#d9d4c7] space-y-1 font-serif">
              <div>
                <strong className="text-[#b8ae8f] font-sans text-[10px] uppercase tracking-wider">Background:</strong>{' '}
                <span className="italic">{character.background}</span>
              </div>
              <div>
                <strong className="text-[#b8ae8f] font-sans text-[10px] uppercase tracking-wider">Alignment:</strong>{' '}
                <span>{character.alignment}</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          /* Inventory Tab */
          <div className="space-y-2.5">
            {/* Header with Gold & Count */}
            <div className="flex items-center justify-between text-xs text-[#b8ae8f] pb-0.5 font-serif">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold">Gear & Inventory</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 border border-white/10 text-[#fdfaf1]">
                  {character.inventory.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#fdfaf1] font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{character.gold} GP</span>
              </div>
            </div>

            {/* Inventory Search Bar */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#b8ae8f] absolute left-3 pointer-events-none" />
              <input
                id="inventory-search-input"
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search items, weapons, potions, armor..."
                className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-black/40 border border-white/15 focus:border-[#b8ae8f] rounded-xl text-[#fdfaf1] placeholder-[#b8ae8f]/50 focus:outline-hidden focus:ring-1 focus:ring-[#b8ae8f]/40 transition-colors"
              />
              {inventorySearch && (
                <button
                  id="btn-clear-inventory-search"
                  onClick={() => setInventorySearch('')}
                  title="Clear search"
                  className="absolute right-2.5 p-0.5 rounded text-[#b8ae8f] hover:text-[#fdfaf1] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
              {(
                [
                  { key: 'all', label: 'All', icon: Backpack },
                  { key: 'equipped', label: 'Equipped', icon: ShieldCheck },
                  { key: 'weapon', label: 'Weapons', icon: Sword },
                  { key: 'armor', label: 'Armor', icon: Shield },
                  { key: 'potion', label: 'Potions', icon: FlaskConical },
                  { key: 'misc', label: 'Misc', icon: Sparkles },
                ] as const
              ).map(({ key, label, icon: Icon }) => {
                const isActive = inventoryCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setInventoryCategory(key)}
                    className={`px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#b8ae8f] text-[#2c1810] font-bold shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 text-[#d9d4c7] border border-white/5'
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inventory Items List */}
            {character.inventory.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white/5 border border-white/10">
                <Backpack className="w-8 h-8 text-[#b8ae8f]/30 mx-auto mb-2" />
                <p className="text-xs text-[#fdfaf1] font-semibold mb-0.5">Inventory is Empty</p>
                <p className="text-[11px] text-[#b8ae8f]/60 font-serif italic">
                  Explore ruins, loot chests, or visit merchants to acquire gear.
                </p>
              </div>
            ) : (() => {
              const filteredInventory = character.inventory.filter((item) => {
                // Category check
                if (inventoryCategory === 'equipped' && !item.equipped) return false;
                if (inventoryCategory === 'weapon' && item.type !== 'weapon') return false;
                if (inventoryCategory === 'armor' && item.type !== 'armor') return false;
                if (inventoryCategory === 'potion' && item.type !== 'potion') return false;
                if (
                  inventoryCategory === 'misc' &&
                  (item.type === 'weapon' || item.type === 'armor' || item.type === 'potion')
                )
                  return false;

                // Search query check
                if (!inventorySearch.trim()) return true;
                const q = inventorySearch.toLowerCase().trim();
                const nameMatch = item.name.toLowerCase().includes(q);
                const descMatch = (item.description || '').toLowerCase().includes(q);
                const typeMatch = (item.type || '').toLowerCase().includes(q);
                const dmgMatch = (item.damage || '').toLowerCase().includes(q);
                const rarityMatch = (item.rarity || '').toLowerCase().includes(q);
                return nameMatch || descMatch || typeMatch || dmgMatch || rarityMatch;
              });

              if (filteredInventory.length === 0) {
                return (
                  <div className="p-5 text-center rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <Search className="w-6 h-6 text-[#b8ae8f]/40 mx-auto" />
                    <div>
                      <p className="text-xs text-[#fdfaf1] font-semibold">No items match your search</p>
                      <p className="text-[11px] text-[#b8ae8f]/70 font-serif mt-0.5">
                        {inventorySearch ? `No results found for "${inventorySearch}"` : 'No items found in this category filter.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setInventorySearch('');
                        setInventoryCategory('all');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#fdfaf1] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Clear Search & Filter
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-1.5">
                  {/* Results Count if searching or filtering */}
                  {(inventorySearch || inventoryCategory !== 'all') && (
                    <div className="flex items-center justify-between text-[10px] text-[#b8ae8f] px-1 font-mono">
                      <span>
                        Showing {filteredInventory.length} of {character.inventory.length} items
                      </span>
                      <button
                        onClick={() => {
                          setInventorySearch('');
                          setInventoryCategory('all');
                        }}
                        className="text-[#fdfaf1] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}

                  {filteredInventory.map((item) => {
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          soundEngine.playDiceRoll();
                          setInspectedItem(item);
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer group hover:scale-[1.01] ${
                          item.equipped
                            ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400 hover:shadow-md'
                            : 'bg-white/5 border-white/10 hover:border-[#b8ae8f] hover:bg-white/10'
                        }`}
                        title="Click to view bigger picture, full lore, and item statistics"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-white/15 bg-black/40 group-hover:border-amber-400 transition-colors">
                            <ItemSprite item={item} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                          </div>
                          <div className="truncate flex-1">
                            <div className="text-xs font-semibold text-[#fdfaf1] truncate flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                              <span>{item.name}</span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] text-[#b8ae8f]">x{item.quantity}</span>
                              )}
                              {item.equipped && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                                  Equipped
                                </span>
                              )}
                              {item.rarity && item.rarity !== 'common' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase tracking-wider">
                                  {item.rarity}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#d9d4c7]/70 truncate">
                              {item.damage || (item.acBonus ? `+${item.acBonus} AC` : '') || item.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {item.type === 'potion' ? (
                            <button
                              onClick={() => handleUseItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-[#8b2b2b] hover:bg-[#a63636] text-[#fdfaf1] border border-[#c94c4c] text-[10px] font-serif font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                            >
                              Drink
                            </button>
                          ) : item.type === 'weapon' || item.type === 'armor' ? (
                            <button
                              onClick={() => handleUseItem(item)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-serif font-bold uppercase tracking-wider border shadow-xs cursor-pointer ${
                                item.equipped
                                  ? 'bg-[#b8ae8f] border-[#b8ae8f] text-[#2c1810]'
                                  : 'bg-white/10 border-white/10 text-[#fdfaf1] hover:bg-white/20'
                              }`}
                            >
                              {item.equipped ? 'Unequip' : 'Equip'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* Conditions & Status Tab (Full Details View) */
          <div className="space-y-3">
            {/* Polygonal Dice-Styled Anatomical Body Status */}
            <BodyStatusVisual
              character={character}
              onAdjustHp={handleAdjustHp}
              statusEffects={statusEffects}
            />

            <div className="flex items-center justify-between text-xs text-[#b8ae8f] pt-1 pb-1 font-serif">
              <span className="text-[10px] uppercase tracking-widest font-bold">Active Conditions & Effects</span>
              <button
                onClick={() => setIsAddConditionOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-[#b8ae8f] hover:text-[#fdfaf1] uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Condition</span>
              </button>
            </div>

            {statusEffects.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white/5 border border-white/10">
                <Sparkles className="w-8 h-8 text-[#b8ae8f]/40 mx-auto mb-2" />
                <p className="text-xs text-[#fdfaf1] font-semibold mb-1">Hero is in Prime Condition</p>
                <p className="text-[11px] text-[#b8ae8f]/70 mb-3">
                  No active poisons, curses, magical blessings, or debuffs.
                </p>
                <button
                  onClick={() => setIsAddConditionOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#4a3227] hover:bg-[#5c3e30] text-[#fdfaf1] text-xs font-serif font-bold uppercase tracking-wider border border-[#b8ae8f]/40 cursor-pointer"
                >
                  Apply Condition
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {statusEffects.map((effect) => {
                  const isBuff = effect.type === 'buff';
                  const isDebuff = effect.type === 'debuff';
                  return (
                    <div
                      key={effect.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isBuff
                          ? 'bg-emerald-950/40 border-emerald-500/40'
                          : isDebuff
                          ? 'bg-rose-950/40 border-rose-500/40'
                          : 'bg-amber-950/40 border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isBuff
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isDebuff
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {renderConditionIcon(effect.icon, "w-4 h-4")}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-[#fdfaf1] font-serif">
                                {effect.name}
                              </h3>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  isBuff
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isDebuff
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {effect.type}
                              </span>
                            </div>
                            {effect.source && (
                              <p className="text-[9px] text-[#b8ae8f]/70 uppercase tracking-wider">
                                {effect.source}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveEffect(effect.id)}
                          className="p-1 rounded bg-black/30 hover:bg-rose-900/60 text-white/60 hover:text-rose-200 transition-colors cursor-pointer"
                          title="Cure / Dismiss Condition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Description & Mechanical Rules */}
                      <p className="text-[11px] text-[#d9d4c7] mt-2 font-serif italic">
                        {effect.description}
                      </p>

                      {effect.mechanicalEffect && (
                        <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] text-[#fdfaf1]">
                          <strong className="text-[#b8ae8f] uppercase tracking-wider font-sans block mb-0.5">
                            Mechanical Impact:
                          </strong>
                          <span>{effect.mechanicalEffect}</span>
                        </div>
                      )}

                      {/* Duration Controls */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-[#b8ae8f]">
                          Duration:{' '}
                          <strong className="text-[#fdfaf1] font-mono">
                            {effect.durationTurns !== undefined ? `${effect.durationTurns} turns remaining` : 'Persistent (Until Rest/Cured)'}
                          </strong>
                        </span>

                        {effect.durationTurns !== undefined && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAdjustEffectDuration(effect.id, -1)}
                              className="p-1 rounded bg-black/40 hover:bg-black/60 text-[#fdfaf1] cursor-pointer"
                              title="Decrease 1 turn"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleAdjustEffectDuration(effect.id, 1)}
                              className="p-1 rounded bg-black/40 hover:bg-black/60 text-[#fdfaf1] cursor-pointer"
                              title="Increase 1 turn"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Condition Details Modal / Popover */}
      {selectedEffect && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-sm w-full bg-[#24130d] border border-[#b8ae8f]/60 rounded-2xl p-4 shadow-2xl text-[#fdfaf1]">
            <div className="flex items-start justify-between pb-3 border-b border-[#4a3227]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`p-2 rounded-xl ${
                    selectedEffect.type === 'buff'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : selectedEffect.type === 'debuff'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {renderConditionIcon(selectedEffect.icon, "w-5 h-5")}
                </span>
                <div>
                  <h3 className="text-base font-bold font-serif">{selectedEffect.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      selectedEffect.type === 'buff'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : selectedEffect.type === 'debuff'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {selectedEffect.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEffect(null)}
                className="p-1 rounded-lg text-[#b8ae8f] hover:text-[#fdfaf1] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <p className="text-[#d9d4c7] font-serif italic">{selectedEffect.description}</p>
              {selectedEffect.mechanicalEffect && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[#fdfaf1] text-[11px]">
                  <strong className="text-[#b8ae8f] uppercase tracking-wider block mb-1 text-[10px]">
                    D&D 5e Rules / Effect:
                  </strong>
                  <span>{selectedEffect.mechanicalEffect}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#b8ae8f]">Turns Remaining:</span>
                <span className="font-mono font-bold text-[#fdfaf1]">
                  {selectedEffect.durationTurns !== undefined ? `${selectedEffect.durationTurns} turns` : 'Permanent / Until Rest'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#4a3227] flex items-center justify-between gap-2">
              <button
                onClick={() => handleRemoveEffect(selectedEffect.id)}
                className="flex-1 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 text-xs font-serif font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cure / Remove
              </button>
              <button
                onClick={() => setSelectedEffect(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#fdfaf1] text-xs font-serif font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Condition / Status Effect Modal */}
      {isAddConditionOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-[#24130d] border-2 border-[#b8ae8f]/50 rounded-2xl overflow-hidden shadow-2xl text-[#fdfaf1] flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-3.5 bg-[#1d0e08] border-b border-[#4a3227] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#b8ae8f]" />
                <h3 className="text-sm font-serif font-bold italic text-[#fdfaf1]">
                  {isCustomMode ? 'Create Custom Status Effect' : 'Apply Condition or Status Effect'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddConditionOpen(false);
                  setIsCustomMode(false);
                }}
                className="p-1 rounded-lg text-[#b8ae8f] hover:text-[#fdfaf1] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Mode Selector */}
            <div className="flex border-b border-[#4a3227] bg-[#1a0c07] text-xs font-serif font-bold">
              <button
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-2 text-center uppercase tracking-wider transition-colors ${
                  !isCustomMode
                    ? 'bg-white/10 text-[#fdfaf1] border-b-2 border-[#b8ae8f]'
                    : 'text-[#b8ae8f]/60 hover:text-[#fdfaf1]'
                }`}
              >
                Standard Conditions
              </button>
              <button
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-2 text-center uppercase tracking-wider transition-colors ${
                  isCustomMode
                    ? 'bg-white/10 text-[#fdfaf1] border-b-2 border-[#b8ae8f]'
                    : 'text-[#b8ae8f]/60 hover:text-[#fdfaf1]'
                }`}
              >
                Custom Effect
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto flex-1 space-y-3">
              {!isCustomMode ? (
                <>
                  {/* Search and Category Filter */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#b8ae8f] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search conditions (e.g. Poison, Blessed, Charmed, Haste)..."
                        value={conditionSearch}
                        onChange={(e) => setConditionSearch(e.target.value)}
                        className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-[#fdfaf1] placeholder:text-[#b8ae8f]/40 focus:outline-none focus:border-[#b8ae8f]"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      {(['all', 'buff', 'debuff'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setConditionFilter(filter)}
                          className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors cursor-pointer ${
                            conditionFilter === filter
                              ? 'bg-[#b8ae8f] text-[#2c1810] border-[#b8ae8f]'
                              : 'bg-white/5 text-[#b8ae8f] border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {filter === 'all' ? 'All Conditions' : filter === 'buff' ? 'Buffs / Blessings' : 'Debuffs / Afflictions'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditions List */}
                  <div className="space-y-1.5">
                    {filteredPresetConditions.map((preset) => {
                      const isBuff = preset.type === 'buff';
                      return (
                        <button
                          key={preset.name}
                          onClick={() => handleAddPresetCondition(preset)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between gap-2.5 transition-all group cursor-pointer ${
                            isBuff
                              ? 'bg-emerald-950/20 hover:bg-emerald-950/50 border-emerald-500/20 hover:border-emerald-500/50'
                              : 'bg-rose-950/20 hover:bg-rose-950/50 border-rose-500/20 hover:border-rose-500/50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isBuff ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {renderConditionIcon(preset.icon, "w-3.5 h-3.5")}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-[#fdfaf1] font-serif">{preset.name}</h4>
                                <span
                                  className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ${
                                    isBuff ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {preset.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#d9d4c7]/80 truncate mt-0.5">{preset.description}</p>
                              {preset.mechanicalEffect && (
                                <p className="text-[9px] text-[#b8ae8f] font-mono mt-0.5 truncate">
                                  {preset.mechanicalEffect}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#b8ae8f] border border-white/5">
                            {preset.durationTurns ? `${preset.durationTurns}t` : 'Perm'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Custom Condition Form */
                <form onSubmit={handleCreateCustomCondition} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#b8ae8f] mb-1">
                      Condition Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dragonfire Burn, Heroic Resolve, Sleep"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[#fdfaf1] focus:outline-none focus:border-[#b8ae8f]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#b8ae8f] mb-1">
                      Effect Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomType('buff')}
                        className={`py-1.5 rounded-xl border text-center font-bold font-serif transition-colors cursor-pointer ${
                          customType === 'buff'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-white/5 text-[#b8ae8f] border-white/10'
                        }`}
                      >
                        Buff / Advantage
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomType('debuff')}
                        className={`py-1.5 rounded-xl border text-center font-bold font-serif transition-colors cursor-pointer ${
                          customType === 'debuff'
                            ? 'bg-rose-700 text-white border-rose-400'
                            : 'bg-white/5 text-[#b8ae8f] border-white/10'
                        }`}
                      >
                        Debuff / Penalty
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#b8ae8f] mb-1">
                      Description / Flavour
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Scorching flames cling to armor..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[#fdfaf1] focus:outline-none focus:border-[#b8ae8f]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#b8ae8f] mb-1">
                      Mechanical Effect (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Takes 1d4 fire damage each turn, +2 AC bonus"
                      value={customMech}
                      onChange={(e) => setCustomMech(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[#fdfaf1] focus:outline-none focus:border-[#b8ae8f]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#b8ae8f] mb-1">
                      Duration (Turns)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[#fdfaf1] focus:outline-none focus:border-[#b8ae8f]"
                    />
                    <p className="text-[9px] text-[#b8ae8f]/60 mt-1">Set to 0 for permanent / until rest.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#b8ae8f] hover:bg-[#c9c0a3] text-[#2c1810] font-serif font-bold uppercase tracking-wider transition-colors cursor-pointer mt-2"
                  >
                    Apply Custom Effect
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* High-Resolution Character Portrait Inspector Modal */}
      {isPortraitPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative max-w-md w-full bg-[#0b1220] border-2 border-amber-400/60 rounded-3xl overflow-hidden shadow-2xl p-5 text-slate-100 flex flex-col items-center">
            <button
              onClick={() => setIsPortraitPreviewOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#1e2d4a] text-slate-300 hover:text-white hover:bg-[#283b5f] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif italic font-bold text-xl text-amber-300 mb-1 text-center">
              {character.name}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4 text-center">
              Level {character.level} • {character.race} {character.className} • {character.background || 'Adventurer'}
            </p>
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-[#090f1a] mb-4">
              <img
                src={portraitSrc}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            </div>
            {character.portraitPrompt && (
              <p className="text-xs text-slate-300 bg-[#090f1a] p-3 rounded-xl border border-[#1e2d4a] max-w-md text-center italic leading-relaxed">
                "{character.portraitPrompt}"
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              {onGeneratePortrait && (
                <button
                  onClick={() => {
                    setIsPortraitPreviewOpen(false);
                    onGeneratePortrait();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate with Perchance AI</span>
                </button>
              )}
              {onOpenCharacterModal && (
                <button
                  onClick={() => {
                    setIsPortraitPreviewOpen(false);
                    onOpenCharacterModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Customize Hero</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Details & High-Resolution Artwork Inspector Modal */}
      {inspectedItem && (
        <ItemDetailsModal
          isOpen={!!inspectedItem}
          item={inspectedItem}
          onClose={() => setInspectedItem(null)}
          onEquipToggle={handleUseItem}
          onUse={handleUseItem}
          onDrop={handleDropItem}
          onUpdateItemImage={handleUpdateItemImage}
        />
      )}
    </div>
  );
};
