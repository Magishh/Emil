import React, { useState, useRef, useEffect } from 'react';
import { StoryLogEntry, LocationInfo } from '../types';
import { SceneryImage } from './Sprite';
import {
  BookOpen,
  Volume2,
  VolumeX,
  History,
  Scroll,
  Dices,
  Swords,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Maximize2,
  ShieldAlert,
  Compass,
  Mic,
  Sliders,
  Play,
  Pause,
  Square,
  Gauge,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { narratorEngine, NarratorPlaybackState, GEMINI_NARRATOR_VOICES } from '../utils/narrator';

interface StoryLogViewProps {
  currentStory: string;
  history: StoryLogEntry[];
  isLoading: boolean;
  inCombat?: boolean;
  location: LocationInfo;
  turnCount: number;
  onRegenerateScenery?: () => void;
  isGeneratingScenery?: boolean;
  onOpenPerchanceStudio?: () => void;
  onOpenNarratorStudio?: () => void;
}

export type TextFadeMode = 'visible' | 'dimmed' | 'hidden';

export const StoryLogView: React.FC<StoryLogViewProps> = ({
  currentStory,
  history,
  isLoading,
  inCombat = false,
  location,
  turnCount: _turnCount,
  onRegenerateScenery,
  isGeneratingScenery = false,
  onOpenPerchanceStudio,
  onOpenNarratorStudio,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [fadeMode, setFadeMode] = useState<TextFadeMode>('visible');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [narratorState, setNarratorState] = useState<NarratorPlaybackState>(narratorEngine.getState());
  const [narratorSettings, setNarratorSettings] = useState(narratorEngine.getSettings());
  const [showQuickVoiceMenu, setShowQuickVoiceMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStoryRef = useRef<string>(currentStory);

  const dangerColors: Record<string, string> = {
    Safe: 'bg-emerald-800/80 text-emerald-100 border-emerald-600',
    Low: 'bg-blue-900/80 text-blue-100 border-blue-700',
    Medium: 'bg-amber-900/80 text-amber-100 border-amber-600',
    High: 'bg-orange-900/80 text-orange-100 border-orange-600',
    Extreme: 'bg-red-950/90 text-red-100 border-red-700 animate-pulse',
  };

  // Subscribe to Narrator playback updates
  useEffect(() => {
    const unsub = narratorEngine.subscribe((state) => {
      setNarratorState({ ...state });
      setNarratorSettings(narratorEngine.getSettings());
    });
    return () => unsub();
  }, []);

  // Auto-narrate new story segments when option is enabled
  useEffect(() => {
    if (currentStory && currentStory !== prevStoryRef.current) {
      prevStoryRef.current = currentStory;
      const settings = narratorEngine.getSettings();
      if (settings.autoNarrateNewTurns && !isLoading) {
        narratorEngine.speak(currentStory);
      }
    }
  }, [currentStory, isLoading]);

  useEffect(() => {
    if (scrollRef.current && fadeMode !== 'hidden') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStory, history, isLoading, fadeMode]);

  // Voice narration toggle using ultra-natural AI Narrator
  const handleToggleSpeech = () => {
    if (narratorState.isPlaying) {
      narratorEngine.pause();
    } else if (narratorState.isPaused) {
      narratorEngine.resume();
    } else {
      narratorEngine.speak(currentStory);
    }
  };

  // Cycle speed preset quickly
  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [0.75, 0.9, 1.0, 1.15, 1.3];
    const current = narratorSettings.rate;
    const nextIdx = (speeds.findIndex((s) => Math.abs(s - current) < 0.05) + 1) % speeds.length;
    narratorEngine.setRate(speeds[nextIdx]);
    soundEngine.playLevelUp();
  };

  // Toggle fade modes
  const handleToggleFade = () => {
    soundEngine.playLevelUp();
    setFadeMode((prev) => {
      if (prev === 'visible') return 'hidden';
      return 'visible';
    });
  };

  const handleCycleFadeMode = () => {
    soundEngine.playLevelUp();
    setFadeMode((prev) => {
      if (prev === 'visible') return 'dimmed';
      if (prev === 'dimmed') return 'hidden';
      return 'visible';
    });
  };

  const textOpacityClass =
    fadeMode === 'visible'
      ? 'opacity-100'
      : fadeMode === 'dimmed'
      ? 'opacity-30 hover:opacity-90'
      : 'opacity-0 pointer-events-none';

  return (
    <div
      id="story-scenery-unified-container"
      className="relative flex flex-col h-full bg-[#0a0f1d] border-2 border-[#b8ae8f] dark:border-[#273752] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group select-text"
    >
      {/* 1. Full Crystal-Clear Scenery Artwork Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <SceneryImage location={location} className="w-full h-full object-cover object-center transition-all duration-700 scale-100 filter brightness-100 contrast-105" />
        {/* Very light subtle edge vignette purely to ensure top bar and bottom buttons have crisp separation */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* 2. Unified Header Bar (Location info + Scenery actions + Narrator + Fade toggle) */}
      <div className="relative z-20 flex items-center justify-between px-3.5 py-2 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 shadow-lg">
        {/* Left: Location identity & danger badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white font-serif italic truncate drop-shadow-md">
                {location.name}
              </h2>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                  dangerColors[location.dangerLevel] || dangerColors.Medium
                }`}
              >
                {location.dangerLevel}
              </span>
            </div>
            {location.atmosphere && (
              <p className="text-[10px] text-amber-200/80 italic truncate font-serif max-w-[160px] sm:max-w-xs md:max-w-md">
                "{location.atmosphere}"
              </p>
            )}
          </div>

          {inCombat && (
            <span className="hidden sm:flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/90 text-white border border-red-400 items-center gap-1 shadow-md animate-pulse uppercase tracking-wider shrink-0">
              <Swords className="w-3 h-3" />
              Combat
            </span>
          )}
        </div>

        {/* Right: Actions (Fade Text Button, Narrator, Perchance Studio, Regenerate, History) */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* FADE TEXT BUTTON */}
          <button
            id="btn-fade-story-text"
            onClick={handleToggleFade}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCycleFadeMode();
            }}
            title={
              fadeMode === 'hidden'
                ? 'Text is Hidden (Click to restore story text, right-click to cycle)'
                : 'Click to fade text out for clear scenery picture (Right-click for 40% dim)'
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-all duration-300 flex items-center gap-1.5 shadow-md cursor-pointer border ${
              fadeMode === 'hidden'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/60 animate-pulse'
                : fadeMode === 'dimmed'
                ? 'bg-blue-600/90 hover:bg-blue-500 text-white border-blue-400'
                : 'bg-black/60 hover:bg-black/80 text-white border-white/20 hover:border-amber-400/60'
            }`}
          >
            {fadeMode === 'hidden' ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-950" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-[11px] font-sans">
              {fadeMode === 'hidden' ? 'Show Text' : 'Fade Text'}
            </span>
          </button>

          {/* AI NARRATOR CONTROLS (Play/Pause + Voice Selector + Speed Preset + Studio Trigger) */}
          <div className="flex items-center bg-black/60 border border-white/20 rounded-lg p-0.5 shadow-sm">
            {/* Play / Pause Primary Narrator Button */}
            <button
              id="btn-toggle-narration"
              onClick={handleToggleSpeech}
              title={
                narratorState.isLoading
                  ? 'Synthesizing voice...'
                  : narratorState.isPlaying
                  ? 'Pause Narration'
                  : 'Read Story Aloud (AI DM Voice)'
              }
              className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 font-serif cursor-pointer ${
                narratorState.isPlaying
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs animate-pulse'
                  : narratorState.isLoading
                  ? 'bg-amber-600/60 text-white'
                  : 'hover:bg-white/10 text-white'
              }`}
            >
              {narratorState.isLoading ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : narratorState.isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Quick Speed Cycle Chip (0.75x -> 0.9x -> 1.0x -> 1.15x -> 1.3x) */}
            <button
              type="button"
              onClick={handleCycleSpeed}
              title={`Speech Speed: ${narratorSettings.rate}x (Click to cycle speed)`}
              className="px-1.5 py-1 text-[10px] font-mono font-bold text-amber-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            >
              {narratorSettings.rate}x
            </button>

            {/* Quick Voice / Studio Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenNarratorStudio) {
                  onOpenNarratorStudio();
                } else {
                  setShowQuickVoiceMenu(!showQuickVoiceMenu);
                }
              }}
              title="Narrator Voice Studio (Change DM Voice & Speed)"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] hidden md:inline font-serif truncate max-w-[60px]">
                {narratorSettings.engine === 'gemini' ? narratorSettings.geminiVoice : 'System'}
              </span>
            </button>
          </div>

          {/* Quick Voice Selection Popover Menu */}
          {showQuickVoiceMenu && (
            <div className="absolute top-11 right-12 z-50 w-56 p-2 rounded-2xl bg-[#0f172a]/95 text-white border border-[#334155] shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1.5">
                <span className="text-xs font-serif font-bold text-amber-400">Select DM Voice</span>
                <button
                  type="button"
                  onClick={() => setShowQuickVoiceMenu(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                {GEMINI_NARRATOR_VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      narratorEngine.updateSettings({ engine: 'gemini', geminiVoice: v.id });
                      setShowQuickVoiceMenu(false);
                      narratorEngine.speak(currentStory);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-serif flex items-center justify-between transition-colors cursor-pointer ${
                      narratorSettings.engine === 'gemini' && narratorSettings.geminiVoice === v.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{v.name}</div>
                      <div className="text-[9px] opacity-75">{v.title}</div>
                    </div>
                    <span className="text-[10px] opacity-80">{v.gender.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {onOpenNarratorStudio && (
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickVoiceMenu(false);
                    onOpenNarratorStudio();
                  }}
                  className="w-full mt-2 pt-1.5 border-t border-white/10 text-[11px] font-serif text-amber-400 hover:text-amber-300 text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Open Full Voice Studio</span>
                </button>
              )}
            </div>
          )}

          {/* Open Perchance Studio */}
          {onOpenPerchanceStudio && (
            <button
              id="btn-open-perchance-scenery"
              onClick={onOpenPerchanceStudio}
              title="Open Perchance AI Image Studio"
              className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/20 hover:border-emerald-400/60 transition-colors shadow-sm cursor-pointer flex items-center gap-1 text-xs font-serif"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] hidden xl:inline">Perchance AI</span>
            </button>
          )}

          {/* Regenerate Scenery with Perchance AI */}
          {onRegenerateScenery && (
            <button
              id="btn-regenerate-scenery"
              onClick={onRegenerateScenery}
              disabled={isGeneratingScenery}
              title="Generate new landscape scenery with Perchance AI"
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/20 hover:border-amber-400 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isGeneratingScenery ? 'animate-spin text-amber-400' : 'text-slate-200'
                }`}
              />
            </button>
          )}

          {/* Fullscreen scenery viewer */}
          <button
            id="btn-expand-scenery"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Full-screen Scenery Artwork"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/20 hover:border-amber-400 transition-colors shadow-sm cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-200" />
          </button>

          {/* History Log Toggle */}
          <button
            id="btn-toggle-history"
            onClick={() => setShowHistory(!showHistory)}
            title="Toggle Prior Chapters & Encounters"
            className={`px-2 py-1 rounded-lg border text-xs transition-colors flex items-center gap-1 font-serif shadow-sm cursor-pointer ${
              showHistory
                ? 'bg-amber-600/90 border-amber-400 text-white'
                : 'bg-black/60 hover:bg-black/80 border-white/20 text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-[11px] hidden sm:inline">Log ({history.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 3. Active Narrator Playback Mini-Banner (When story is being narrated) */}
      {narratorState.isPlaying && (
        <div className="relative z-20 px-4 py-1.5 bg-amber-950/80 backdrop-blur-md border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-100 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="w-1 h-3 bg-amber-400 animate-pulse rounded-full" />
              <span className="w-1 h-4 bg-amber-400 animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150 rounded-full" />
            </div>
            <span className="font-serif font-bold text-amber-300 truncate">
              Narrator ({narratorSettings.engine === 'gemini' ? narratorSettings.geminiVoice : 'System'})
            </span>
            <span className="text-[10px] opacity-75 font-mono">
              {narratorSettings.rate}x speed
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSpeech}
              className="p-1 rounded-md hover:bg-white/10 text-amber-200 hover:text-white cursor-pointer"
              title="Pause narration"
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => narratorEngine.stop()}
              className="p-1 rounded-md hover:bg-red-500/40 text-amber-200 hover:text-red-200 cursor-pointer"
              title="Stop narration"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Narrative Area: FULLY INVISIBLE / TRANSPARENT BACKGROUND FOR CLEAR SCENERY */}
      <div
        ref={scrollRef}
        onClick={() => {
          if (fadeMode === 'hidden') handleToggleFade();
        }}
        className="relative z-10 flex-1 p-5 overflow-y-auto space-y-4 font-serif leading-relaxed text-[15px] bg-transparent backdrop-blur-none"
      >
        <div className={`transition-opacity duration-500 ease-in-out ${textOpacityClass}`}>
          {/* Subtle Decorative Header Line */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-amber-400/30" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300/90 flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Active Chronicle
            </span>
            <div className="h-px flex-1 bg-amber-400/30" />
          </div>

          {/* Current Story Paragraphs */}
          <div className="space-y-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {currentStory.split('\n\n').map((paragraph, index) => (
              <p
                key={index}
                className="text-[#fefbf3] font-medium leading-relaxed tracking-wide text-sm sm:text-base [text-shadow:_0_1px_4px_rgb(0_0_0_/_90%),_0_2px_8px_rgb(0_0_0_/_80%)]"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 text-amber-300 py-3 animate-pulse drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs sm:text-sm font-serif italic">
                The Dungeon Master weaves the tapestry of fate...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Collapsible Historic Chronicle Drawer */}
      {showHistory && (
        <div className="relative z-20 border-t-2 border-white/20 bg-black/85 backdrop-blur-md max-h-56 overflow-y-auto p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scroll className="w-3.5 h-3.5" />
              Campaign Chronicles & Past Chapters ({history.length})
            </span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Close Log
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs italic text-slate-400">No prior turns recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-mono">
                    <span className="font-bold uppercase tracking-wider">
                      {entry.speaker || (entry.type === 'player_action' ? 'Hero' : 'DM')}
                    </span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-100 font-serif leading-relaxed line-clamp-3">
                    {entry.content}
                  </p>
                  {entry.rollDetails && (
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-amber-300">
                      <Dices className="w-3 h-3" />
                      <span>{entry.rollDetails.label}: Total {entry.rollDetails.total} (DC {entry.rollDetails.dc || '—'})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Fullscreen Modal Scenery Viewer */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-2 py-1 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="font-serif font-bold">{location.name}</span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-serif font-bold"
            >
              Exit Fullscreen
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <SceneryImage
              location={location}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border-2 border-amber-500/40"
            />
          </div>
        </div>
      )}
    </div>
  );
};

