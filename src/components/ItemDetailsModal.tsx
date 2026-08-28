import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { getItemThumbnail } from '../utils/diceUtils';
import { generatePerchanceImage, expandPromptWithGemini, buildPerchanceItemPrompt, getFixedPerchanceItemImageUrl } from '../utils/perchanceAi';
import { soundEngine } from '../utils/audio';
import {
  X,
  Shield,
  Sword,
  FlaskConical,
  Scroll,
  Coins,
  Weight,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Trash2,
  Check,
  Zap,
  Info,
  Wand2,
} from 'lucide-react';

interface ItemDetailsModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onEquipToggle?: (item: InventoryItem) => void;
  onUse?: (item: InventoryItem) => void;
  onDrop?: (item: InventoryItem) => void;
  onUpdateItemImage?: (itemId: string, newImageUrl: string) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  item,
  onClose,
  onEquipToggle,
  onUse,
  onDrop,
  onUpdateItemImage,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !item) return null;

  const itemThumb = (!imgError && item.imageUrl && !item.imageUrl.startsWith('data:image/svg+xml;base64,PHN2Zw')) 
    ? item.imageUrl 
    : getFixedPerchanceItemImageUrl(item);
  const isWeapon = item.type === 'weapon';
  const isArmor = item.type === 'armor';
  const isPotion = item.type === 'potion';
  const isScroll = item.type === 'scroll';
  const isQuest = item.type === 'quest';
  const isMisc = item.type === 'misc';

  // Rarity color mapping
  const rarityColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
    common: { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-500/40', label: 'Common' },
    uncommon: { bg: 'bg-emerald-700/30', text: 'text-emerald-300', border: 'border-emerald-500/40', label: 'Uncommon' },
    rare: { bg: 'bg-blue-700/30', text: 'text-blue-300', border: 'border-blue-500/40', label: 'Rare' },
    'very rare': { bg: 'bg-purple-700/30', text: 'text-purple-300', border: 'border-purple-500/40', label: 'Very Rare' },
    legendary: { bg: 'bg-amber-600/30', text: 'text-amber-300', border: 'border-amber-400/60', label: 'Legendary' },
    artifact: { bg: 'bg-rose-700/30', text: 'text-rose-300', border: 'border-rose-400/60', label: 'Artifact' },
  };

  const currentRarityKey = (item.rarity || 'common').toLowerCase();
  const rarityInfo = rarityColors[currentRarityKey] || rarityColors.common;

  // Default AI Prompt for this item
  const defaultItemAiPrompt = buildPerchanceItemPrompt(item);

  const handleGenerateAiArt = async () => {
    const promptToUse = aiPrompt.trim() || defaultItemAiPrompt;
    setIsGeneratingAi(true);
    soundEngine.playDiceRoll();

    try {
      // 1. Expand with Gemini
      const expanded = await expandPromptWithGemini(promptToUse, {
        stylePreset: 'cinematic-fantasy',
        aspectRatio: '1:1',
      });

      // 2. Generate with Perchance AI
      const promptForPerchance = expanded.expandedPrompt || promptToUse;
      const result = await generatePerchanceImage(promptForPerchance, {
        aspectRatio: '1:1',
      });

      if (result.imageUrl && onUpdateItemImage) {
        setImgError(false);
        onUpdateItemImage(item.id, result.imageUrl);
        soundEngine.playHeal();
      }
    } catch (err) {
      console.error('Error generating item artwork:', err);
    } finally {
      setIsGeneratingAi(false);
      setShowAiStudio(false);
    }
  };

  return (
    <div
      id="item-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#0b1220] border-2 border-amber-400/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-details-title"
      >
        {/* Top Metallic Trim */}
        <div className="h-1.5 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close Item Inspector"
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#162238] border border-[#273752] text-slate-300 hover:text-white hover:bg-[#20304c] transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Bar */}
        <div className="px-5 pt-4 pb-3 border-b border-[#1e2d4a] bg-[#0f172a] flex items-center justify-between gap-3 shrink-0 pr-12">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-serif font-bold uppercase tracking-wider border ${rarityInfo.bg} ${rarityInfo.text} ${rarityInfo.border}`}
            >
              {rarityInfo.label}
            </span>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
              {item.type}
            </span>
          </div>

          {item.equipped && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
              <Check className="w-3 h-3 text-amber-400" />
              Equipped
            </span>
          )}
        </div>

        {/* Main Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Big Item Picture Showcase */}
          <div className="flex flex-col items-center">
            <div
              className={`relative rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-[#070b14] group transition-all duration-300 ${
                isZoomed ? 'w-full h-80 sm:h-96' : 'w-48 h-48 sm:w-56 sm:h-56'
              }`}
            >
              <img
                src={itemThumb}
                alt={item.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />

              {/* Top Zoom Toggle button */}
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? 'Compact View' : 'Enlarge Item Picture'}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/75 text-amber-300 hover:text-white hover:bg-black/90 transition-colors cursor-pointer"
              >
                {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Quantity indicator badge */}
              {item.quantity > 1 && (
                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold">
                  Qty: x{item.quantity}
                </div>
              )}

              {/* AI Generating Loading Overlay */}
              {isGeneratingAi && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-amber-300 text-xs font-bold p-3 text-center">
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mb-2" />
                  <span>Forging Perchance AI Art...</span>
                </div>
              )}
            </div>

            {/* Quick AI Generator Toggle for this item */}
            {onUpdateItemImage && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowAiStudio(!showAiStudio)}
                  className="text-[11px] font-serif font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162238] border border-[#273752] hover:border-amber-400/40 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showAiStudio ? 'Hide AI Art Studio' : 'Generate Custom AI Art'}</span>
                </button>
              </div>
            )}

            {/* AI Art Studio Collapsible Bar */}
            {showAiStudio && (
              <div className="w-full mt-3 p-3 bg-[#080d18] border border-amber-400/40 rounded-xl space-y-2 animate-fade-in">
                <label className="text-[11px] font-serif font-bold text-amber-300 block">
                  Perchance AI Item Art Prompt
                </label>
                <textarea
                  value={aiPrompt || defaultItemAiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  className="w-full p-2 text-xs bg-[#0b1220] border border-[#273752] rounded-lg text-slate-200 focus:outline-hidden focus:border-amber-400"
                  placeholder="Describe how this item looks..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleGenerateAiArt}
                    disabled={isGeneratingAi}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-xs font-serif font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>Generate Artwork</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Item Name & Primary Lore */}
          <div className="text-center space-y-1">
            <h2 id="item-details-title" className="text-xl sm:text-2xl font-serif font-bold text-amber-300">
              {item.name}
            </h2>
            <p className="text-xs text-slate-300 font-serif italic max-w-md mx-auto leading-relaxed">
              {item.description || 'A mysterious item of unknown provenance.'}
            </p>
          </div>

          {/* Key Properties / Stat Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Damage or AC */}
            {item.damage && (
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
                <Sword className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-mono">Damage</span>
                  <span className="text-xs font-bold text-slate-100 truncate block">{item.damage}</span>
                </div>
              </div>
            )}

            {typeof item.acBonus === 'number' && item.acBonus > 0 && (
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-mono">AC Bonus</span>
                  <span className="text-xs font-bold text-slate-100 truncate block">+{item.acBonus} AC</span>
                </div>
              </div>
            )}

            {item.bonus && (
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-mono">Property</span>
                  <span className="text-xs font-bold text-slate-100 truncate block">{item.bonus}</span>
                </div>
              </div>
            )}

            {/* Gold Value */}
            <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-mono">Value</span>
                <span className="text-xs font-bold text-amber-300 truncate block">
                  {item.valueGold ?? 10} GP
                </span>
              </div>
            </div>

            {/* Weight */}
            <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
              <Weight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-mono">Weight</span>
                <span className="text-xs font-bold text-slate-200 truncate block">
                  {item.weight ?? (isWeapon ? 3 : isArmor ? 20 : isPotion ? 0.5 : 1)} lbs
                </span>
              </div>
            </div>

            {/* Quantity */}
            <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-mono">Quantity</span>
                <span className="text-xs font-bold text-slate-200 truncate block">
                  {item.quantity} in pack
                </span>
              </div>
            </div>
          </div>

          {/* Special Mechanics & Usage Lore */}
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e2d4a] space-y-1.5 text-xs text-slate-300">
            <h4 className="font-serif font-bold text-amber-300 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Item Lore & Mechanics</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-300 font-serif">
              {isWeapon
                ? 'Equipping this weapon enhances martial rolls. When wielding in combat, your attack modifier and weapon damage dice are automatically resolved by the DM.'
                : isArmor
                ? 'Donning this armor adjusts your total Armor Class (AC), deflecting incoming enemy blows and reducing direct physical damage.'
                : isPotion
                ? 'Consuming this draught restores vitality or grants potent tactical advantages. Potions can be ingested during or outside combat.'
                : isScroll
                ? 'Inscribed with ancient spell runes. Channeling its power unleashes magical forces directly onto the battlefield.'
                : isQuest
                ? 'A critical relic tied to your active quest narrative. Keep this close to unlock secret ancient chambers and progress the storyline.'
                : 'A versatile adventuring supply item. Useful for survival, overcoming environmental obstacles, or bartering with merchants.'}
            </p>
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 border-t border-[#1e2d4a] bg-[#0f172a] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onDrop && (
              <button
                onClick={() => {
                  soundEngine.playSwordStrike();
                  onDrop(item);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-[#1e2d4a] hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-[#273752] hover:border-rose-500/40 text-xs font-serif font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Discard this item from inventory"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Drop</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action Button based on Type */}
            {isPotion ? (
              <button
                onClick={() => {
                  if (onUse) {
                    onUse(item);
                    onClose();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Drink Potion</span>
              </button>
            ) : isScroll ? (
              <button
                onClick={() => {
                  if (onUse) {
                    onUse(item);
                    onClose();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Scroll className="w-4 h-4" />
                <span>Read Scroll</span>
              </button>
            ) : (isWeapon || isArmor) && onEquipToggle ? (
              <button
                onClick={() => {
                  onEquipToggle(item);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors cursor-pointer ${
                  item.equipped
                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {item.equipped ? <Shield className="w-4 h-4" /> : <Sword className="w-4 h-4" />}
                <span>{item.equipped ? 'Unequip Item' : 'Equip Item'}</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1e2d4a] hover:bg-[#283b5f] text-slate-200 text-xs font-serif font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
