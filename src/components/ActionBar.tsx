import React, { useState } from 'react';
import { StoryChoice } from '../types';
import { Send, Dices, Sparkles, Swords, Shield, Eye, Wand2, Compass } from 'lucide-react';

interface ActionBarProps {
  choices: StoryChoice[];
  onSelectChoice: (choice: StoryChoice) => void;
  onCustomAction: (actionText: string) => void;
  onQuickRoll: () => void;
  isLoading: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  choices,
  onSelectChoice,
  onCustomAction,
  onQuickRoll,
  isLoading,
}) => {
  const [customInput, setCustomInput] = useState('');

  const handleSubmitCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customInput.trim() || isLoading) return;
    onCustomAction(customInput.trim());
    setCustomInput('');
  };

  const getRiskBadge = (risk?: string) => {
    switch (risk) {
      case 'safe':
        return 'bg-[#2e5a44] text-[#fdfaf1] border-[#2e5a44]';
      case 'risky':
        return 'bg-[#b35e38] text-[#fdfaf1] border-[#8c4322]';
      case 'deadly':
        return 'bg-[#8b2b2b] text-[#fdfaf1] border-[#5e1919] animate-pulse';
      default:
        return 'bg-[#8c7e6a] text-[#fdfaf1] border-[#6b5e4c]';
    }
  };

  const getOptionIcon = (choice: StoryChoice) => {
    if (choice.combatAction) return <Swords className="w-3.5 h-3.5 text-[#8b2b2b] shrink-0" />;
    if (choice.check?.ability === 'INT' || choice.check?.ability === 'WIS')
      return <Wand2 className="w-3.5 h-3.5 text-[#4a3227] shrink-0" />;
    if (choice.check?.ability === 'DEX')
      return <Eye className="w-3.5 h-3.5 text-[#2e5a44] shrink-0" />;
    if (choice.check?.ability === 'STR' || choice.check?.ability === 'CON')
      return <Shield className="w-3.5 h-3.5 text-[#4a5d6e] shrink-0" />;
    return <Compass className="w-3.5 h-3.5 text-[#8c7e6a] shrink-0" />;
  };

  return (
    <div
      id="action-bar-container"
      className="bg-[#fdfaf1] dark:bg-[#0f172a] border-t border-[#e2dcc5] dark:border-[#1e293b] p-2.5 sm:p-3.5 flex flex-col gap-2 shadow-lg backdrop-blur-md z-20 transition-colors"
    >
      {/* 4 Procedural Choice Option Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
        {choices.slice(0, 4).map((choice, idx) => (
          <button
            key={choice.id || idx}
            onClick={() => onSelectChoice(choice)}
            disabled={isLoading}
            className="group relative p-2 sm:p-3 rounded-xl bg-white dark:bg-[#1e293b] border-b-2 sm:border-b-4 border-[#d9d4c7] dark:border-[#0f172a] border border-[#e2dcc5] dark:border-[#334155] text-left transition-all duration-150 shadow-2xs flex flex-col justify-between disabled:opacity-50 disabled:pointer-events-none hover:bg-[#f5f0e3] dark:hover:bg-[#283548] active:border-b-1 active:translate-y-0.5 cursor-pointer min-h-[50px] sm:min-h-[64px]"
          >
            {/* Top row: Index key & Check badge */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-[#2c1810] dark:bg-amber-400 text-[#fdfaf1] dark:text-black font-mono text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {getOptionIcon(choice)}
              </div>

              {choice.check ? (
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#fdfaf1] dark:bg-[#0f172a] text-[#2c1810] dark:text-amber-300 border border-[#b8ae8f] dark:border-[#475569] shrink-0">
                  {choice.check.ability} DC {choice.check.dc}
                </span>
              ) : choice.riskLevel ? (
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize tracking-wider shrink-0 ${getRiskBadge(
                    choice.riskLevel
                  )}`}
                >
                  {choice.riskLevel}
                </span>
              ) : null}
            </div>

            {/* Choice Label */}
            <div className="text-xs sm:text-sm font-bold text-[#2c1810] dark:text-[#f8fafc] font-serif group-hover:text-[#4a3227] dark:group-hover:text-amber-200 leading-snug line-clamp-2">
              {choice.label}
            </div>

            {/* Tactical explanation if present */}
            {choice.description && (
              <div className="text-[10px] sm:text-[11px] text-[#8c7e6a] dark:text-[#94a3b8] mt-0.5 line-clamp-1 font-sans">
                {choice.description}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Custom Player Text Action Bar */}
      <form onSubmit={handleSubmitCustom} className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            id="player-custom-action-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            disabled={isLoading}
            placeholder="What will your hero do? (e.g., Cast Misty Step, inspect the runes...)"
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] focus:border-[#4a3227] dark:focus:border-amber-400 rounded-full text-[#2c1810] dark:text-[#f8fafc] placeholder-[#8c7e6a] dark:placeholder-[#64748b] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4a3227]/30 dark:focus:ring-amber-400/30 transition-colors shadow-inner truncate"
          />
        </div>

        {/* Quick D20 Roll Button */}
        <button
          type="button"
          onClick={onQuickRoll}
          title="Roll d20 in arena"
          className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border border-[#e2dcc5] dark:border-[#334155] text-xs font-serif font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <Dices className="w-4 h-4 text-[#8c7e6a] dark:text-amber-400" />
          <span className="hidden sm:inline">Roll d20</span>
        </button>

        {/* Send / Take Action Button */}
        <button
          type="submit"
          disabled={!customInput.trim() || isLoading}
          className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 active:bg-[#1a0e0a] disabled:opacity-40 disabled:hover:bg-[#2c1810] dark:disabled:hover:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 text-xs sm:text-sm font-serif font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Sparkles className="w-4 h-4 animate-spin text-[#b8ae8f] dark:text-slate-900" />
          ) : (
            <Send className="w-4 h-4 text-[#b8ae8f] dark:text-slate-900" />
          )}
          <span className="hidden xs:inline">Take Action</span>
        </button>
      </form>
    </div>
  );
};
