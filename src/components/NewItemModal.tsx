import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { ItemSprite } from './Sprite';
import { soundEngine } from '../utils/audio';
import {
  Sparkles,
  Shield,
  Sword,
  FlaskConical,
  Scroll,
  Coins,
  Backpack,
  X,
  Check,
  Zap,
  HelpCircle,
  Flame,
  Maximize2,
  Minimize2,
  Weight,
} from 'lucide-react';

interface NewItemModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onTake: (item: InventoryItem) => void;
  onLeave: (item: InventoryItem) => void;
  onEquip?: (item: InventoryItem) => void;
  onUse?: (item: InventoryItem) => void;
  onClose: () => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  item,
  onTake,
  onLeave,
  onEquip,
  onUse,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !item) return null;

  const isWeapon = item.type === 'weapon';
  const isArmor = item.type === 'armor';
  const isPotion = item.type === 'potion';
  const isScroll = item.type === 'scroll';
  const isEquippable = isWeapon || isArmor;
  const isConsumable = isPotion || isScroll;

  const handleTake = () => {
    soundEngine.playDiceRoll();
    onTake(item);
  };

  const handleLeave = () => {
    soundEngine.playSwordStrike();
    onLeave(item);
  };

  const handleEquip = () => {
    if (onEquip) {
      soundEngine.playSwordStrike();
      onEquip(item);
    } else {
      handleTake();
    }
  };

  const handleUse = () => {
    if (onUse) {
      soundEngine.playHeal();
      onUse(item);
    } else {
      handleTake();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#fdfaf1] border-2 border-[#b8ae8f] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-[#2c1810]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-item-title"
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-[#2c1810] via-[#b8ae8f] to-[#2c1810]" />

        {/* Close Button */}
        <button
          onClick={handleLeave}
          title="Leave item behind / Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-[#8c7e6a] hover:text-[#2c1810] hover:bg-[#e2dcc5]/50 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 text-center border-b border-[#e2dcc5] bg-[#f5f0e3]/40">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2c1810] text-[#fdfaf1] text-[11px] font-serif font-bold tracking-wider uppercase mb-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#b8ae8f] animate-pulse" />
            <span>New Item Discovered!</span>
          </div>
          <h2
            id="new-item-title"
            className="text-xl font-serif font-bold text-[#2c1810] tracking-wide"
          >
            {item.name}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-[#e2dcc5]/60 text-[#4a3227] text-[10px] font-mono font-bold uppercase tracking-wider">
              {item.type}
            </span>
            {item.rarity && (
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-serif font-bold uppercase">
                {item.rarity}
              </span>
            )}
            {item.valueGold && (
              <span className="flex items-center gap-1 text-[11px] text-[#8c7e6a] font-mono font-semibold">
                <Coins className="w-3 h-3 text-[#b8ae8f]" />
                {item.valueGold} GP
              </span>
            )}
          </div>
        </div>

        {/* Modal Body / Item Showcase */}
        <div className="p-6 space-y-4">
          {/* Zoomable Artwork & Primary Stats */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3.5 bg-white border border-[#e2dcc5] rounded-xl shadow-inner">
            {/* Clickable Large Item Art */}
            <div
              onClick={() => setIsZoomed(!isZoomed)}
              className={`relative shrink-0 rounded-xl overflow-hidden border-2 border-[#b8ae8f] bg-[#2c1810] flex items-center justify-center shadow-md cursor-pointer group transition-all duration-300 ${
                isZoomed ? 'w-full h-48 sm:h-56' : 'w-24 h-24 sm:w-28 sm:h-28'
              }`}
              title="Click to enlarge image"
            >
              <ItemSprite item={item} className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {isZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </div>
              <div className="absolute top-1 left-1 p-0.5 rounded bg-black/60 text-[#b8ae8f]">
                {isWeapon ? (
                  <Sword className="w-2.5 h-2.5 text-[#c94c4c]" />
                ) : isArmor ? (
                  <Shield className="w-2.5 h-2.5 text-[#b8ae8f]" />
                ) : isPotion ? (
                  <FlaskConical className="w-2.5 h-2.5 text-[#2e5a44]" />
                ) : isScroll ? (
                  <Scroll className="w-2.5 h-2.5 text-[#8c7e6a]" />
                ) : (
                  <Sparkles className="w-2.5 h-2.5 text-[#b8ae8f]" />
                )}
              </div>
            </div>

            {/* Quick Stat Tags */}
            <div className="flex-1 w-full min-w-0 space-y-1.5 text-xs font-serif">
              {item.damage && (
                <div className="flex items-center justify-between text-[#2c1810] bg-[#fdfaf1] px-2 py-1 rounded-lg border border-[#e2dcc5]">
                  <span className="text-[10px] uppercase font-bold text-[#8c7e6a]">Damage:</span>
                  <span className="font-mono font-bold text-[#8b2b2b]">{item.damage}</span>
                </div>
              )}

              {item.acBonus !== undefined && item.acBonus > 0 && (
                <div className="flex items-center justify-between text-[#2c1810] bg-[#fdfaf1] px-2 py-1 rounded-lg border border-[#e2dcc5]">
                  <span className="text-[10px] uppercase font-bold text-[#8c7e6a]">AC Bonus:</span>
                  <span className="font-mono font-bold text-[#2e5a44]">+{item.acBonus} AC</span>
                </div>
              )}

              {item.bonus && (
                <div className="flex items-center justify-between text-[#2c1810] bg-[#fdfaf1] px-2 py-1 rounded-lg border border-[#e2dcc5]">
                  <span className="text-[10px] uppercase font-bold text-[#8c7e6a]">Enchantment:</span>
                  <span className="font-mono font-bold text-[#4a3227]">{item.bonus}</span>
                </div>
              )}

              {item.quantity && item.quantity > 1 && (
                <div className="flex items-center justify-between text-[#2c1810] bg-[#fdfaf1] px-2 py-1 rounded-lg border border-[#e2dcc5]">
                  <span className="text-[10px] uppercase font-bold text-[#8c7e6a]">Quantity:</span>
                  <span className="font-mono font-bold text-[#2c1810]">{item.quantity}x</span>
                </div>
              )}

              {item.weight && (
                <div className="flex items-center justify-between text-[#2c1810] bg-[#fdfaf1] px-2 py-1 rounded-lg border border-[#e2dcc5]">
                  <span className="text-[10px] uppercase font-bold text-[#8c7e6a]">Weight:</span>
                  <span className="font-mono font-bold text-[#4a3227]">{item.weight} lbs</span>
                </div>
              )}
            </div>
          </div>

          {/* Description Lore */}
          <div className="p-3 bg-[#f5f0e3] border border-[#e2dcc5] rounded-xl text-xs text-[#4a3227] font-serif leading-relaxed italic">
            "{item.description || 'An adventurer relic discovered on the journey.'}"
          </div>

          {/* Decision Prompt */}
          <div className="text-center text-[11px] font-sans font-medium text-[#8c7e6a]">
            What will your hero do with this treasure?
          </div>
        </div>

        {/* Action Controls / Decision Tab Buttons */}
        <div className="p-4 bg-[#f5f0e3] border-t border-[#e2dcc5] grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* 1. Take It (Backpack) */}
          <button
            type="button"
            onClick={handleTake}
            className="px-3 py-2.5 bg-[#2c1810] hover:bg-[#4a3227] text-[#fdfaf1] rounded-xl font-serif font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Backpack className="w-3.5 h-3.5 text-[#b8ae8f]" />
            <span>Take It</span>
          </button>

          {/* 2. Contextual Primary Action: Equip Now (for Weapons/Armor) or Use Now (for Potions/Scrolls) */}
          {isEquippable && (
            <button
              type="button"
              onClick={handleEquip}
              className="px-3 py-2.5 bg-[#2e5a44] hover:bg-[#234534] text-[#fdfaf1] rounded-xl font-serif font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {isWeapon ? <Sword className="w-3.5 h-3.5 text-[#b8ae8f]" /> : <Shield className="w-3.5 h-3.5 text-[#b8ae8f]" />}
              <span>Equip Now</span>
            </button>
          )}

          {isConsumable && (
            <button
              type="button"
              onClick={handleUse}
              className="px-3 py-2.5 bg-[#8b2b2b] hover:bg-[#6e2222] text-[#fdfaf1] rounded-xl font-serif font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {isPotion ? <FlaskConical className="w-3.5 h-3.5 text-[#fdfaf1]" /> : <Zap className="w-3.5 h-3.5 text-[#fdfaf1]" />}
              <span>{isPotion ? 'Drink Now' : 'Use Now'}</span>
            </button>
          )}

          {/* 3. Leave It (Discard / Ignore) */}
          <button
            type="button"
            onClick={handleLeave}
            className={`px-3 py-2.5 bg-white hover:bg-[#e2dcc5] text-[#8c7e6a] hover:text-[#2c1810] border border-[#b8ae8f] rounded-xl font-serif font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              !isEquippable && !isConsumable ? 'col-span-1' : ''
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Leave It</span>
          </button>
        </div>
      </div>
    </div>
  );
};
