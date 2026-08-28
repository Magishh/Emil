import React from 'react';
import { Feather, Crown, Shield, Swords, Sparkles } from 'lucide-react';
import { InventoryItem, RuleStrictness, DifficultyLevel } from '../../types';
import { generateCharacterAvatarSvg } from '../../utils/svgArt';

interface WizardStep4ReviewProps {
  worldTheme: string;
  campaignTitle: string;
  storyPremise: string;
  openingLocation: string;
  questObjective: string;
  characterName: string;
  gender: string;
  race: string;
  className: string;
  background: string;
  alignment: string;
  hp: number;
  ac: number;
  speed: number;
  portraitUrl: string;
  selectedItems: InventoryItem[];
  ruleStrictness: RuleStrictness;
  difficulty: DifficultyLevel;
}

export function WizardStep4Review({
  worldTheme,
  campaignTitle,
  storyPremise,
  openingLocation,
  questObjective,
  characterName,
  gender,
  race,
  className,
  background,
  alignment,
  hp,
  ac,
  speed,
  portraitUrl,
  selectedItems,
  ruleStrictness,
  difficulty,
}: WizardStep4ReviewProps) {
  return (
    <div className="space-y-5 font-serif">
      <div className="border-b border-[#1e2d4a] pb-2">
        <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
          <Feather className="w-5 h-5 text-amber-400" />
          <span>Campaign Embarkation Briefing</span>
        </h2>
        <p className="text-xs text-slate-400">
          Review your world premise, forged hero, and attuned loadout before the Dungeon Master begins.
        </p>
      </div>

      {/* Epic Review Parchment in Dark Mode */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0f182a] border border-[#1e2d4a] shadow-inner space-y-4">
        {/* 1. World & Premise */}
        <div className="border-b border-[#1e2d4a] pb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
              Quest Setting & Objective
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-[#131e33] px-2 py-0.5 rounded border border-[#273752]">
              {worldTheme}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100">{campaignTitle}</h3>
          <p className="text-xs text-slate-300 leading-relaxed italic bg-[#090f1a] p-2.5 rounded-xl border border-[#1e2d4a]">
            "{storyPremise}"
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="text-slate-300">
              <strong className="text-amber-300">Starting Location:</strong> {openingLocation}
            </div>
            <div className="text-slate-300">
              <strong className="text-amber-300">Primary Objective:</strong> {questObjective}
            </div>
          </div>
        </div>

        {/* 2. Hero Dossier */}
        <div className="flex flex-wrap sm:flex-nowrap gap-4 items-center border-b border-[#1e2d4a] pb-3">
          <img
            src={
              portraitUrl ||
              generateCharacterAvatarSvg({
                name: characterName,
                className,
                race,
              })
            }
            alt={characterName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400/80 shadow-sm bg-[#090f1a]"
          />
          <div>
            <h4 className="font-bold text-sm text-slate-100">
              {characterName}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({gender} • {race} {className})
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Background: <strong className="text-slate-100">{background}</strong> • Alignment:{' '}
              <strong className="text-slate-100">{alignment}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              HP: {hp} • AC: {ac} • Speed: {speed}ft
            </p>
          </div>
        </div>

        {/* 3. Attuned Equipment */}
        <div className="border-b border-[#1e2d4a] pb-3">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
            Equipped Story Gear & Relics ({selectedItems.length} items)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map((item) => (
              <span
                key={item.id}
                className="px-2.5 py-1 rounded-lg bg-[#090f1a] border border-[#273752] text-[11px] text-slate-200"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>

        {/* 4. Campaign Parameters */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>
            Ruleset: <strong className="capitalize text-amber-300">{ruleStrictness}</strong>
          </span>
          <span>
            Difficulty: <strong className="capitalize text-amber-300">{difficulty}</strong>
          </span>
          <span>
            Solo 5e Engine: <strong className="text-emerald-400">Active & Ready</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
