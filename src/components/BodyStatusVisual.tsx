import React, { useState } from 'react';
import { Character, StatusEffect } from '../types';
import { soundEngine } from '../utils/audio';
import {
  Heart,
  Shield,
  Zap,
  Activity,
  Plus,
  Minus,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Flame,
  Skull,
  Crosshair,
} from 'lucide-react';

interface BodyStatusVisualProps {
  character: Character;
  onAdjustHp?: (amount: number) => void;
  statusEffects?: StatusEffect[];
  className?: string;
  compact?: boolean;
}

export type BodyRegionId = 'head' | 'torso' | 'arms' | 'legs' | 'all';

export const BodyStatusVisual: React.FC<BodyStatusVisualProps> = ({
  character,
  onAdjustHp,
  statusEffects = [],
  className = '',
  compact = false,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegionId>('all');
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegionId | null>(null);

  const hp = Math.max(0, character.hp);
  const maxHp = Math.max(1, character.maxHp);
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const damageTaken = maxHp - hp;
  const damageRatio = Math.min(1, Math.max(0, damageTaken / maxHp)); // 0 (pristine) to 1 (dead)

  // Status effects categorization
  const hasPoison = statusEffects.some(
    (e) => e.name.toLowerCase().includes('poison') || e.description.toLowerCase().includes('poison')
  );
  const hasBleed = statusEffects.some(
    (e) => e.name.toLowerCase().includes('bleed') || e.description.toLowerCase().includes('bleed')
  );
  const hasBurn = statusEffects.some(
    (e) => e.name.toLowerCase().includes('burn') || e.name.toLowerCase().includes('fire')
  );
  const hasStun = statusEffects.some(
    (e) => e.name.toLowerCase().includes('stun') || e.name.toLowerCase().includes('paralyz') || e.name.toLowerCase().includes('blind')
  );

  // Helper to compute facet colors based on base light-gray and damage ratio
  // Base light gray palette: #f1f5f9 (highlight), #e2e8f0 (light), #cbd5e1 (mid), #94a3b8 (shade), stroke #64748b
  // Damage crimson palette: #ef4444 (highlight), #dc2626 (light), #b91c1c (mid), #7f1d1d (deep shade), stroke #fca5a5
  const getFacetColor = (
    baseColor: string,
    damageColor: string,
    regionRatio: number,
    isSpecialAfflicted = false,
    afflictionColor = '#10b981'
  ) => {
    if (isSpecialAfflicted) {
      return afflictionColor;
    }
    // If pristine (no damage)
    if (regionRatio <= 0.02) return baseColor;
    if (regionRatio >= 0.85) return damageColor;

    // Linear interpolation approximation for key thresholds
    if (regionRatio > 0.6) return damageColor;
    if (regionRatio > 0.3) {
      // Transitional bruised tone
      return '#be5d5d';
    }
    return '#d19e9e';
  };

  // Region specific damage ratios
  // Damage distributes progressively: Torso & limbs take early hits, head takes damage at higher ratios
  const torsoDamageRatio = Math.min(1, damageRatio * 1.3);
  const armsDamageRatio = Math.min(1, damageRatio * 1.15);
  const legsDamageRatio = Math.min(1, damageRatio * 1.1);
  const headDamageRatio = Math.min(1, Math.max(0, (damageRatio - 0.25) * 1.33));

  const isHeadDamaged = headDamageRatio > 0.05;
  const isTorsoDamaged = torsoDamageRatio > 0.05;
  const isArmsDamaged = armsDamageRatio > 0.05;
  const isLegsDamaged = legsDamageRatio > 0.05;

  // Stroke colors based on damage
  const baseStroke = '#64748b';
  const damagedStroke = '#fca5a5';
  const selectedStroke = '#f59e0b'; // Amber highlight for active selection

  const getRegionStroke = (region: BodyRegionId, ratio: number) => {
    if (selectedRegion === region || hoveredRegion === region) return selectedStroke;
    return ratio > 0.15 ? damagedStroke : baseStroke;
  };

  const getStrokeWidth = (region: BodyRegionId) => {
    if (selectedRegion === region || hoveredRegion === region) return '2';
    return '1.2';
  };

  // Human-readable status label for the current overall damage state
  const getVitalsHeadline = () => {
    if (hp <= 0) return { label: 'Unconscious / Incapacitated', color: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-500' };
    if (hpPercent < 25) return { label: 'Critically Wounded (Severe Trauma)', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-500/80' };
    if (hpPercent < 50) return { label: 'Bloodied & Heavily Battered', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-500/60' };
    if (hpPercent < 80) return { label: 'Lightly Injured (Superficial Bruises)', color: 'text-amber-200', bg: 'bg-amber-950/30 border-amber-500/30' };
    return { label: 'Pristine Health (Full Armor Integrity)', color: 'text-emerald-300', bg: 'bg-emerald-950/30 border-emerald-500/30' };
  };

  const vitals = getVitalsHeadline();

  return (
    <div
      id="body-status-visual-container"
      className={`rounded-2xl bg-[#0f172a] border border-[#1e2d4a] overflow-hidden text-slate-100 flex flex-col ${className}`}
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2 bg-[#162238] border-b border-[#1e2d4a] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider">
            Anatomical Status Mannequin
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-slate-200">
            {hp} / {maxHp} HP ({Math.round(hpPercent)}%)
          </span>
        </div>
      </div>

      {/* Main Body Stage & Interactive Panel */}
      <div className="p-3.5 flex flex-col sm:flex-row items-center gap-4">
        {/* SVG Faceted Geometric Die-Body Model */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="relative w-36 h-56 sm:w-40 sm:h-60 p-2 rounded-xl bg-gradient-to-b from-[#090f1a] to-[#0d1527] border border-[#273752] shadow-inner flex items-center justify-center">
            {/* Subtle background coordinate grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none rounded-xl" />

            <svg
              viewBox="0 0 200 320"
              className="w-full h-full drop-shadow-xl overflow-visible select-none cursor-pointer"
            >
              {/* ========================================================================= */}
              {/* 1. HEAD & HELM (Faceted polyhedral geometry) */}
              {/* ========================================================================= */}
              <g
                id="body-part-head"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'head' ? 'all' : 'head');
                }}
                onMouseEnter={() => setHoveredRegion('head')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-105 origin-[100px_50px]"
              >
                {/* Crown Left */}
                <polygon
                  points="100,16 80,30 100,44"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', headDamageRatio, hasStun, '#38bdf8')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Crown Right */}
                <polygon
                  points="100,16 120,30 100,44"
                  fill={getFacetColor('#f1f5f9', '#ef4444', headDamageRatio, hasStun, '#7dd3fc')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Left Temple */}
                <polygon
                  points="80,30 74,52 100,44"
                  fill={getFacetColor('#94a3b8', '#991b1b', headDamageRatio, hasStun, '#0284c7')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Right Temple */}
                <polygon
                  points="120,30 126,52 100,44"
                  fill={getFacetColor('#e2e8f0', '#dc2626', headDamageRatio, hasStun, '#38bdf8')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Left Cheek / Visor */}
                <polygon
                  points="74,52 86,72 100,44"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', headDamageRatio, hasStun, '#0369a1')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Right Cheek / Visor */}
                <polygon
                  points="126,52 114,72 100,44"
                  fill={getFacetColor('#e2e8f0', '#dc2626', headDamageRatio, hasStun, '#38bdf8')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Chin Triangle */}
                <polygon
                  points="86,72 114,72 100,80"
                  fill={getFacetColor('#64748b', '#7f1d1d', headDamageRatio, hasStun, '#075985')}
                  stroke={getRegionStroke('head', headDamageRatio)}
                  strokeWidth={getStrokeWidth('head')}
                  strokeLinejoin="round"
                />
                {/* Crown Node Pip */}
                <circle
                  cx="100"
                  cy="44"
                  r={isHeadDamaged ? '3' : '2'}
                  fill={isHeadDamaged ? '#fca5a5' : '#fef08a'}
                />
              </g>

              {/* ========================================================================= */}
              {/* 2. NECK (Trapezoid) */}
              {/* ========================================================================= */}
              <polygon
                points="90,80 110,80 112,92 88,92"
                fill={getFacetColor('#94a3b8', '#991b1b', torsoDamageRatio)}
                stroke={getRegionStroke('torso', torsoDamageRatio)}
                strokeWidth={getStrokeWidth('torso')}
                strokeLinejoin="round"
              />

              {/* ========================================================================= */}
              {/* 3. TORSO & CORE (Faceted D20 / Breastplate Architecture) */}
              {/* ========================================================================= */}
              <g
                id="body-part-torso"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'torso' ? 'all' : 'torso');
                }}
                onMouseEnter={() => setHoveredRegion('torso')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-102 origin-[100px_140px]"
              >
                {/* Clavicle / Sternum Center Top */}
                <polygon
                  points="100,94 88,92 68,98"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', torsoDamageRatio, hasPoison, '#059669')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />
                <polygon
                  points="100,94 112,92 132,98"
                  fill={getFacetColor('#f1f5f9', '#ef4444', torsoDamageRatio, hasPoison, '#10b981')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />

                {/* Left Pectoral Plate */}
                <polygon
                  points="100,94 68,98 64,126 100,128"
                  fill={getFacetColor('#cbd5e1', '#dc2626', torsoDamageRatio, hasPoison, '#047857')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />
                {/* Right Pectoral Plate */}
                <polygon
                  points="100,94 132,98 136,126 100,128"
                  fill={getFacetColor('#e2e8f0', '#ef4444', torsoDamageRatio, hasPoison, '#10b981')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />

                {/* Left Ribcage Plate */}
                <polygon
                  points="100,128 64,126 70,154 100,156"
                  fill={getFacetColor('#94a3b8', '#991b1b', torsoDamageRatio, hasBurn, '#ea580c')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />
                {/* Right Ribcage Plate */}
                <polygon
                  points="100,128 136,126 130,154 100,156"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', torsoDamageRatio, hasBurn, '#f97316')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />

                {/* Midriff / Solar Plexus Core */}
                <polygon
                  points="100,156 70,154 74,178 100,180"
                  fill={getFacetColor('#94a3b8', '#7f1d1d', torsoDamageRatio, hasBleed, '#be123c')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />
                <polygon
                  points="100,156 130,154 126,178 100,180"
                  fill={getFacetColor('#cbd5e1', '#991b1b', torsoDamageRatio, hasBleed, '#e11d48')}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />

                {/* Pelvis / Hips Diamond */}
                <polygon
                  points="100,180 74,178 68,204 100,212"
                  fill={getFacetColor('#64748b', '#7f1d1d', torsoDamageRatio)}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />
                <polygon
                  points="100,180 126,178 132,204 100,212"
                  fill={getFacetColor('#94a3b8', '#991b1b', torsoDamageRatio)}
                  stroke={getRegionStroke('torso', torsoDamageRatio)}
                  strokeWidth={getStrokeWidth('torso')}
                  strokeLinejoin="round"
                />

                {/* Solar Plexus Center Pip */}
                <circle
                  cx="100"
                  cy="128"
                  r={isTorsoDamaged ? '3' : '2'}
                  fill={isTorsoDamaged ? '#fca5a5' : '#fef08a'}
                />
                <circle
                  cx="100"
                  cy="180"
                  r={isTorsoDamaged ? '2.5' : '1.8'}
                  fill={isTorsoDamaged ? '#fca5a5' : '#fef08a'}
                />
              </g>

              {/* ========================================================================= */}
              {/* 4. LEFT ARM & GAUNTLET (Viewer's Left) */}
              {/* ========================================================================= */}
              <g
                id="body-part-left-arm"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'arms' ? 'all' : 'arms');
                }}
                onMouseEnter={() => setHoveredRegion('arms')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-105 origin-[55px_130px]"
              >
                {/* Pauldron */}
                <polygon
                  points="68,98 50,102 46,122 64,126"
                  fill={getFacetColor('#cbd5e1', '#dc2626', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Upper Arm Bicep */}
                <polygon
                  points="46,122 64,126 60,158 42,154"
                  fill={getFacetColor('#94a3b8', '#991b1b', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Forearm Gauntlet */}
                <polygon
                  points="42,154 60,158 56,194 36,188"
                  fill={getFacetColor('#cbd5e1', '#dc2626', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Hand */}
                <polygon
                  points="36,188 56,194 50,210 32,204"
                  fill={getFacetColor('#64748b', '#7f1d1d', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Elbow Pip */}
                <circle cx="51" cy="156" r="2" fill={isArmsDamaged ? '#fca5a5' : '#fef08a'} />
              </g>

              {/* ========================================================================= */}
              {/* 5. RIGHT ARM & GAUNTLET (Viewer's Right) */}
              {/* ========================================================================= */}
              <g
                id="body-part-right-arm"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'arms' ? 'all' : 'arms');
                }}
                onMouseEnter={() => setHoveredRegion('arms')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-105 origin-[145px_130px]"
              >
                {/* Pauldron */}
                <polygon
                  points="132,98 150,102 154,122 136,126"
                  fill={getFacetColor('#e2e8f0', '#ef4444', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Upper Arm Bicep */}
                <polygon
                  points="136,126 154,122 158,154 140,158"
                  fill={getFacetColor('#cbd5e1', '#dc2626', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Forearm Gauntlet */}
                <polygon
                  points="140,158 158,154 164,188 144,194"
                  fill={getFacetColor('#f1f5f9', '#ef4444', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Hand */}
                <polygon
                  points="144,194 164,188 168,204 150,210"
                  fill={getFacetColor('#94a3b8', '#991b1b', armsDamageRatio)}
                  stroke={getRegionStroke('arms', armsDamageRatio)}
                  strokeWidth={getStrokeWidth('arms')}
                  strokeLinejoin="round"
                />
                {/* Elbow Pip */}
                <circle cx="149" cy="156" r="2" fill={isArmsDamaged ? '#fca5a5' : '#fef08a'} />
              </g>

              {/* ========================================================================= */}
              {/* 6. LEFT LEG & BOOT (Viewer's Left) */}
              {/* ========================================================================= */}
              <g
                id="body-part-left-leg"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'legs' ? 'all' : 'legs');
                }}
                onMouseEnter={() => setHoveredRegion('legs')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-103 origin-[80px_250px]"
              >
                {/* Upper Thigh Greave */}
                <polygon
                  points="68,204 100,212 96,254 62,248"
                  fill={getFacetColor('#94a3b8', '#991b1b', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Knee Diamond */}
                <polygon
                  points="62,248 96,254 94,268 60,264"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Shin Greave */}
                <polygon
                  points="60,264 94,268 92,304 56,300"
                  fill={getFacetColor('#94a3b8', '#7f1d1d', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Boot / Sabaton */}
                <polygon
                  points="56,300 92,304 90,316 46,316"
                  fill={getFacetColor('#64748b', '#7f1d1d', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Knee Pip */}
                <circle cx="78" cy="256" r="2" fill={isLegsDamaged ? '#fca5a5' : '#fef08a'} />
              </g>

              {/* ========================================================================= */}
              {/* 7. RIGHT LEG & BOOT (Viewer's Right) */}
              {/* ========================================================================= */}
              <g
                id="body-part-right-leg"
                onClick={() => {
                  soundEngine.playDiceRoll();
                  setSelectedRegion(selectedRegion === 'legs' ? 'all' : 'legs');
                }}
                onMouseEnter={() => setHoveredRegion('legs')}
                onMouseLeave={() => setHoveredRegion(null)}
                className="transition-transform duration-150 hover:scale-103 origin-[120px_250px]"
              >
                {/* Upper Thigh Greave */}
                <polygon
                  points="100,212 132,204 138,248 104,254"
                  fill={getFacetColor('#cbd5e1', '#b91c1c', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Knee Diamond */}
                <polygon
                  points="104,254 138,248 140,264 106,268"
                  fill={getFacetColor('#e2e8f0', '#dc2626', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Shin Greave */}
                <polygon
                  points="106,268 140,264 144,300 108,304"
                  fill={getFacetColor('#cbd5e1', '#991b1b', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Boot / Sabaton */}
                <polygon
                  points="108,304 144,300 154,316 110,316"
                  fill={getFacetColor('#94a3b8', '#7f1d1d', legsDamageRatio)}
                  stroke={getRegionStroke('legs', legsDamageRatio)}
                  strokeWidth={getStrokeWidth('legs')}
                  strokeLinejoin="round"
                />
                {/* Knee Pip */}
                <circle cx="122" cy="256" r="2" fill={isLegsDamaged ? '#fca5a5' : '#fef08a'} />
              </g>
            </svg>
          </div>

          <span className="text-[10px] text-slate-400 font-serif mt-1 italic">
            Click any body region to inspect
          </span>
        </div>

        {/* Anatomical Details & Region Diagnostics */}
        <div className="flex-1 w-full space-y-2.5">
          {/* Vitals Headline Banner */}
          <div className={`p-2.5 rounded-xl border ${vitals.bg} space-y-1`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-serif font-bold ${vitals.color} flex items-center gap-1.5`}>
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{vitals.label}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-300">
                {damageTaken > 0 ? `-${damageTaken} HP Damage` : 'No Damage'}
              </span>
            </div>

            {/* Health Bar with Damage Fill */}
            <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-300 rounded-full"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Regional Condition Status Card */}
          <div className="p-3 rounded-xl bg-[#090f1a] border border-[#273752] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-300 uppercase">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {selectedRegion === 'all'
                    ? 'Full Anatomical Diagnosis'
                    : selectedRegion === 'head'
                    ? 'Cranial / Head Diagnosis'
                    : selectedRegion === 'torso'
                    ? 'Torso / Vitall Organ Matrix'
                    : selectedRegion === 'arms'
                    ? 'Upper Limbs & Gauntlets'
                    : 'Lower Limbs & Mobility'}
                </span>
              </div>
              {selectedRegion !== 'all' && (
                <button
                  onClick={() => setSelectedRegion('all')}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>

            {/* Region specific descriptions */}
            <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
              {selectedRegion === 'head' ? (
                isHeadDamaged ? (
                  <span className="text-rose-300">
                    ⚠️ Head sustained blunt impacts. Senses tested; concentration and mental checks may be strained.
                  </span>
                ) : (
                  'Head and sensory organs intact. Helm deflecting glancing blows.'
                )
              ) : selectedRegion === 'torso' ? (
                isTorsoDamaged ? (
                  <span className="text-rose-300">
                    ⚠️ Torso absorbing brunt of physical blows. Armor plates cracked and stained crimson from battle damage.
                  </span>
                ) : (
                  'Torso plates and vital organs fully protected by armor.'
                )
              ) : selectedRegion === 'arms' ? (
                isArmsDamaged ? (
                  <span className="text-rose-300">
                    ⚠️ Forearms and shoulder pauldrons nicked and bruised from parrying weapon strikes.
                  </span>
                ) : (
                  'Arms and weapon-wielding gauntlets in peak striking condition.'
                )
              ) : selectedRegion === 'legs' ? (
                isLegsDamaged ? (
                  <span className="text-rose-300">
                    ⚠️ Greaves and knees took heavy jarring hits. Movement and dodge maneuvers slowed.
                  </span>
                ) : (
                  'Legs and boots sturdy. Full combat mobility and balance available.'
                )
              ) : (
                <span>
                  Faceted dice-mannequin mirrors current combat wear. Facets shift from <strong>light-gray</strong> steel to <strong>crimson-red</strong> as physical damage mounts.
                </span>
              )}
            </p>

            {/* Active Afflictions Badges */}
            {(hasPoison || hasBleed || hasBurn || hasStun) && (
              <div className="pt-1.5 border-t border-white/10 flex flex-wrap gap-1.5">
                {hasPoison && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold flex items-center gap-1">
                    <Skull className="w-3 h-3 text-emerald-400" />
                    Venom in Bloodstream
                  </span>
                )}
                {hasBleed && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/50 text-[10px] font-bold flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" />
                    Bleeding Wounds
                  </span>
                )}
                {hasBurn && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Blistering Burns
                  </span>
                )}
                {hasStun && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-500/50 text-[10px] font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    Stunned / Disoriented
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Interactive HP Adjustment Toggles */}
          {onAdjustHp && (
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold mr-1">
                  Take DMG:
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustHp(-1)}
                  className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  title="Take 1 Damage"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustHp(-5)}
                  className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/60 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  title="Take 5 Damage"
                >
                  -5
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold mr-1">
                  Heal:
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustHp(1)}
                  className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  title="Heal 1 HP"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustHp(5)}
                  className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/60 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  title="Heal 5 HP"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustHp(maxHp)}
                  className="px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-200 border border-blue-500/40 text-[10px] font-serif font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Full Rest / Max Heal"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Full</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
