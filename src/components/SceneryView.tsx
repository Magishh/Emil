import React, { useState, useEffect } from 'react';
import { LocationInfo } from '../types';
import { SceneryImage } from './Sprite';
import { Sparkles, RefreshCw, Maximize2, ShieldAlert, Compass, Eye } from 'lucide-react';

interface SceneryViewProps {
  location: LocationInfo;
  turnCount: number;
  onRegenerateImage?: () => void;
  isGeneratingImage?: boolean;
  onOpenPerchanceStudio?: () => void;
}

export const SceneryView: React.FC<SceneryViewProps> = ({
  location,
  turnCount,
  onRegenerateImage,
  isGeneratingImage = false,
  onOpenPerchanceStudio,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const dangerColors: Record<string, string> = {
    Safe: 'bg-[#2e5a44] text-[#fdfaf1] border-[#2e5a44]',
    Low: 'bg-[#4a5d6e] text-[#fdfaf1] border-[#4a5d6e]',
    Medium: 'bg-[#8c7e6a] text-[#fdfaf1] border-[#6b5e4c]',
    High: 'bg-[#b35e38] text-[#fdfaf1] border-[#8c4322]',
    Extreme: 'bg-[#8b2b2b] text-[#fdfaf1] border-[#5e1919] animate-pulse',
  };

  return (
    <div
      id="scenery-container"
      className="relative flex flex-col h-full bg-[#d9d4c7] dark:bg-[#111827] border-4 border-white dark:border-[#1f2d42] rounded-2xl overflow-hidden shadow-sm transition-all duration-300"
    >
      {/* Location Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/90 dark:bg-[#151f32]/90 border-b border-[#e2dcc5] dark:border-[#1f2d42] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-[#8c7e6a] dark:text-[#8092a8] shrink-0" />
          <div className="truncate">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#8c7e6a] dark:text-[#8092a8] block leading-none">
              Current Location
            </span>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide text-[#2c1810] dark:text-[#f8fafc] font-serif italic truncate mt-0.5">
              {location.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Danger Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${
              dangerColors[location.dangerLevel] || dangerColors.Medium
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            {location.dangerLevel} Danger
          </span>

          {/* Action buttons */}
          {onOpenPerchanceStudio && (
            <button
              id="btn-open-perchance-scenery"
              onClick={onOpenPerchanceStudio}
              title="Open Perchance AI Image Studio"
              className="p-1.5 rounded-lg bg-[#fdfaf1] dark:bg-[#1a253a] hover:bg-white dark:hover:bg-[#22334f] text-[#2c1810] dark:text-[#f1f5f9] border border-[#e2dcc5] dark:border-[#273752] transition-colors shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-serif font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#b8ae8f] dark:text-amber-400" />
              <span className="hidden sm:inline">Perchance AI</span>
            </button>
          )}

          {onRegenerateImage && (
            <button
              id="btn-regenerate-scenery"
              onClick={onRegenerateImage}
              disabled={isGeneratingImage}
              title="Generate new visual with Perchance AI"
              className="p-1.5 rounded-lg bg-[#fdfaf1] dark:bg-[#1a253a] hover:bg-white dark:hover:bg-[#22334f] text-[#2c1810] dark:text-[#f1f5f9] border border-[#e2dcc5] dark:border-[#273752] transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingImage ? 'animate-spin text-[#8c7e6a] dark:text-amber-400' : ''}`} />
            </button>
          )}

          <button
            id="btn-expand-scenery"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Expand scenery view"
            className="p-1.5 rounded-lg bg-[#fdfaf1] dark:bg-[#1a253a] hover:bg-white dark:hover:bg-[#22334f] text-[#2c1810] dark:text-[#f1f5f9] border border-[#e2dcc5] dark:border-[#273752] transition-colors shadow-xs cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Scenery Visual Canvas */}
      <div className="relative flex-1 min-h-[160px] md:min-h-[200px] bg-[#2c1810] overflow-hidden group">
        <SceneryImage location={location} className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/90 via-transparent to-black/30 pointer-events-none" />

        {/* Atmosphere Overlay Description */}
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[#2c1810] via-[#2c1810]/70 to-transparent pointer-events-none">
          <div className="flex items-start gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#b8ae8f] mt-0.5 shrink-0" />
            <p className="text-xs text-[#fdfaf1]/95 italic line-clamp-2 leading-relaxed font-serif">
              "{location.atmosphere}"
            </p>
          </div>
        </div>

        {/* AI Generation Indicator / Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2c1810]/80 backdrop-blur-md border border-[#b8ae8f]/30 text-[10px] text-[#fdfaf1] font-mono">
          <Sparkles className="w-2.5 h-2.5 text-[#b8ae8f]" />
          <span>{location.sceneryImageUrl ? 'Perchance AI Vision' : 'Procedural Scenery'}</span>
        </div>

        {/* Loading overlay when generating */}
        {isGeneratingImage && (
          <div className="absolute inset-0 bg-[#2c1810]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#b8ae8f]/30 border-t-[#b8ae8f] rounded-full animate-spin" />
              <Sparkles className="w-4 h-4 text-[#b8ae8f] absolute animate-pulse" />
            </div>
            <p className="text-xs font-serif italic text-[#fdfaf1]">Painting scenery with Perchance AI...</p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div
          id="scenery-modal"
          className="fixed inset-0 z-50 bg-[#2c1810]/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-[#fdfaf1] border-4 border-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#fdfaf1] border-b border-[#e2dcc5] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#2c1810] font-serif italic">{location.name}</h3>
                <p className="text-xs text-[#8c7e6a]">{location.region} • {location.atmosphere}</p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 bg-[#2c1810] hover:bg-[#4a3227] text-[#fdfaf1] rounded-xl text-xs font-serif font-bold shadow-sm"
              >
                Close (ESC)
              </button>
            </div>
            <div className="relative h-[65vh] bg-[#2c1810] flex items-center justify-center">
              <SceneryImage location={location} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
