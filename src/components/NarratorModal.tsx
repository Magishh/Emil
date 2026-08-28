import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  Gauge,
  Sliders,
  Check,
  RotateCcw,
  Bot,
  Laptop,
  Radio,
  Zap,
  Flame,
  Moon,
  Scroll,
  Trees,
  Theater,
  HelpCircle,
  X,
} from 'lucide-react';
import {
  narratorEngine,
  GEMINI_NARRATOR_VOICES,
  NarratorPlaybackState,
  DEFAULT_NARRATOR_SETTINGS,
} from '../utils/narrator';
import { GeminiVoiceName, NarratorSettings } from '../types';

interface NarratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStoryText?: string;
}

const SPEED_PRESETS = [
  { value: 0.75, label: '0.75x', name: 'Dramatic & Slow', desc: 'Moody, brooding cadence' },
  { value: 0.9, label: '0.9x', name: 'Atmospheric DM', desc: 'Ideal for tense exploration' },
  { value: 1.0, label: '1.0x', name: 'Standard', desc: 'Balanced natural narration' },
  { value: 1.15, label: '1.15x', name: 'Brisk', desc: 'Energetic storytelling' },
  { value: 1.3, label: '1.3x', name: 'Fast', desc: 'Quick recap pace' },
  { value: 1.5, label: '1.5x', name: 'Speedrun', desc: 'Rapid dialogue skimming' },
];

const VOICE_ICONS: Record<GeminiVoiceName, React.ReactNode> = {
  Fenrir: <Flame className="w-5 h-5 text-amber-500" />,
  Charon: <Moon className="w-5 h-5 text-purple-400" />,
  Zephyr: <Scroll className="w-5 h-5 text-blue-400" />,
  Kore: <Trees className="w-5 h-5 text-emerald-400" />,
  Puck: <Theater className="w-5 h-5 text-rose-400" />,
};

export const NarratorModal: React.FC<NarratorModalProps> = ({
  isOpen,
  onClose,
  currentStoryText = '',
}) => {
  const [settings, setSettings] = useState<NarratorSettings>(narratorEngine.getSettings());
  const [playbackState, setPlaybackState] = useState<NarratorPlaybackState>(narratorEngine.getState());
  const [activeTab, setActiveTab] = useState<'ai_voices' | 'browser_voices' | 'tuning'>('ai_voices');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Sync state with NarratorEngine
  useEffect(() => {
    const unsub = narratorEngine.subscribe((state) => {
      setPlaybackState({ ...state });
      if (!state.isPlaying && !state.isLoading) {
        setPreviewingVoice(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch available browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Prioritize English voices or natural sounding ones
      const sorted = [...allVoices].sort((a, b) => {
        const aEn = a.lang.startsWith('en') ? 1 : 0;
        const bEn = b.lang.startsWith('en') ? 1 : 0;
        return bEn - aEn;
      });
      setBrowserVoices(sorted);
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  if (!isOpen) return null;

  // Applies a partial update in one pass. Two back-to-back single-key updates
  // both derive from the same `settings` snapshot, so the second silently
  // discards the first (selecting a voice would drop the engine switch).
  const handleUpdateSettings = (partial: Partial<NarratorSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    narratorEngine.updateSettings(partial);
  };

  const handleUpdateSetting = <K extends keyof NarratorSettings>(key: K, value: NarratorSettings[K]) => {
    handleUpdateSettings({ [key]: value } as Partial<NarratorSettings>);
  };

  const handleSelectGeminiVoice = (voiceId: GeminiVoiceName) => {
    handleUpdateSettings({ engine: 'gemini', geminiVoice: voiceId });
  };

  const handleSelectBrowserVoice = (uri: string) => {
    handleUpdateSettings({ engine: 'browser', browserVoiceURI: uri });
  };

  const handlePreviewVoice = async (voiceId: GeminiVoiceName | string, engine: 'gemini' | 'browser') => {
    setPreviewingVoice(voiceId);
    await narratorEngine.previewVoice(voiceId, engine);
  };

  const handlePlayCurrentStory = () => {
    if (playbackState.isPlaying) {
      narratorEngine.pause();
    } else if (playbackState.isPaused) {
      narratorEngine.resume();
    } else {
      narratorEngine.speak(currentStoryText || 'Welcome, adventurer. The realm awaits your command.');
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="narrator-studio-modal"
        className="relative w-full max-w-3xl bg-[#fdfaf1] dark:bg-[#0f172a] text-[#2c1810] dark:text-[#f8fafc] border-2 border-[#b8ae8f] dark:border-[#334155] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-[#f5f0e3] dark:bg-[#1e293b] border-b border-[#e2dcc5] dark:border-[#334155] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold tracking-wide">
                  Dungeon Master Narrator Studio
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  AI Text-to-Speech
                </span>
              </div>
              <p className="text-xs text-[#8c7e6a] dark:text-[#94a3b8] font-serif">
                Select immersive narrator personalities, tune speech speed, and customize voice delivery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#e2dcc5] dark:hover:bg-[#334155] hover:text-[#2c1810] dark:hover:text-white transition-colors cursor-pointer"
            title="Close Narrator Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-[#faf6ec] dark:bg-[#141e33] border-b border-[#e2dcc5] dark:border-[#27354f] shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai_voices')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
              activeTab === 'ai_voices'
                ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#e2dcc5] dark:hover:bg-[#1e293b]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Studio Voices ({GEMINI_NARRATOR_VOICES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tuning')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
              activeTab === 'tuning'
                ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#e2dcc5] dark:hover:bg-[#1e293b]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Speed & Voice Tuning ({settings.rate}x)</span>
          </button>

          <button
            onClick={() => setActiveTab('browser_voices')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
              activeTab === 'browser_voices'
                ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#e2dcc5] dark:hover:bg-[#1e293b]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Browser System Voices</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: Gemini AI Voices */}
          {activeTab === 'ai_voices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#2c1810] dark:text-[#f8fafc] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Cast of Master Narrator Personas
                  </h3>
                  <p className="text-xs text-[#8c7e6a] dark:text-[#94a3b8]">
                    Generated with high-fidelity conversational AI for realistic, atmospheric tabletop roleplay.
                  </p>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {settings.engine === 'gemini' ? `Active: ${settings.geminiVoice}` : 'Custom Browser Voice'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {GEMINI_NARRATOR_VOICES.map((voice) => {
                  const isSelected = settings.engine === 'gemini' && settings.geminiVoice === voice.id;
                  const isPreviewing = previewingVoice === voice.id && (playbackState.isPlaying || playbackState.isLoading);

                  return (
                    <div
                      key={voice.id}
                      onClick={() => handleSelectGeminiVoice(voice.id)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 dark:border-amber-400 shadow-md ring-2 ring-amber-400/30'
                          : 'bg-white dark:bg-[#1e293b]/70 border-[#e2dcc5] dark:border-[#334155] hover:border-amber-400/60 dark:hover:border-amber-500/60 shadow-xs'
                      }`}
                    >
                      {/* Top Voice Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0">
                            {VOICE_ICONS[voice.id]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-bold text-sm text-[#2c1810] dark:text-white">
                                {voice.name}
                              </h4>
                              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#6b5c4c] dark:text-slate-300">
                                {voice.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 italic font-serif">
                              {voice.tone}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#6b5c4c] dark:text-[#94a3b8] leading-relaxed mb-3">
                        {voice.description}
                      </p>

                      {/* Sample Quote Preview */}
                      <div className="p-2.5 rounded-xl bg-[#f5f0e3] dark:bg-[#0f172a] border border-[#e2dcc5] dark:border-[#334155] mb-3 text-[11px] font-serif italic text-[#8c7e6a] dark:text-[#cbd5e1] line-clamp-2">
                        "{voice.samplePhrase}"
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(voice.id, 'gemini');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPreviewing
                              ? 'bg-amber-500 text-slate-950 shadow-xs animate-pulse'
                              : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#2c1810] dark:text-white'
                          }`}
                        >
                          {isPreviewing ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Playing Sample...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                              <span>Test Voice</span>
                            </>
                          )}
                        </button>

                        <span className="text-[10px] text-[#8c7e6a] dark:text-[#64748b]">
                          {voice.gender}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Tuning & Speed Controls */}
          {activeTab === 'tuning' && (
            <div className="space-y-6">
              {/* Speed / Rate Section */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-500" />
                    <label className="font-serif font-bold text-sm">
                      Speech Pacing & Speed
                    </label>
                  </div>
                  <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    {settings.rate.toFixed(2)}x
                  </span>
                </div>

                <p className="text-xs text-[#8c7e6a] dark:text-[#94a3b8]">
                  Adjust the narrator's pacing. Slower speeds create dark, dramatic suspense; faster speeds allow swift chronicle skimming.
                </p>

                {/* Slider */}
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.05"
                  value={settings.rate}
                  onChange={(e) => handleUpdateSetting('rate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                  {SPEED_PRESETS.map((preset) => {
                    const isActive = Math.abs(settings.rate - preset.value) < 0.04;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleUpdateSetting('rate', preset.value)}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                            : 'bg-[#f5f0e3] dark:bg-[#0f172a] border-[#e2dcc5] dark:border-[#334155] text-[#6b5c4c] dark:text-[#94a3b8] hover:border-amber-400'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold">{preset.label}</div>
                        <div className="text-[9px] truncate opacity-80">{preset.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume & Pitch Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Volume */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-serif font-bold text-xs flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                      Narration Master Volume
                    </label>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => handleUpdateSetting('volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Pitch */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-serif font-bold text-xs flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-500" />
                      Voice Pitch (Tone Depth)
                    </label>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      {settings.pitch.toFixed(2)}x
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={settings.pitch}
                    onChange={(e) => handleUpdateSetting('pitch', parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] shadow-xs space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#8c7e6a] dark:text-[#94a3b8] uppercase tracking-wider">
                  Atmospheric Preferences
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#f5f0e3] dark:bg-[#0f172a] border border-[#e2dcc5] dark:border-[#334155] cursor-pointer group">
                  <div className="space-y-0.5">
                    <span className="text-xs font-serif font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Auto-Narrate New Turns
                    </span>
                    <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8]">
                      Automatically read the Dungeon Master's narrative aloud whenever a turn completes.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoNarrateNewTurns}
                    onChange={(e) => handleUpdateSetting('autoNarrateNewTurns', e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#f5f0e3] dark:bg-[#0f172a] border border-[#e2dcc5] dark:border-[#334155] cursor-pointer group">
                  <div className="space-y-0.5">
                    <span className="text-xs font-serif font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Cinematic Suspense Pauses
                    </span>
                    <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8]">
                      Direct the AI voice to insert natural pauses before dangerous reveals and boss entries.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dramaticPauses}
                    onChange={(e) => handleUpdateSetting('dramaticPauses', e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Reset to Defaults */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...DEFAULT_NARRATOR_SETTINGS });
                    narratorEngine.updateSettings({ ...DEFAULT_NARRATOR_SETTINGS });
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#e2dcc5] dark:hover:bg-[#1e293b] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Default Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: System / Browser Voices */}
          {activeTab === 'browser_voices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-400" />
                    Browser & Device Natural Voices
                  </h3>
                  <p className="text-xs text-[#8c7e6a] dark:text-[#94a3b8]">
                    Utilizes offline high-definition synthesis provided by your operating system.
                  </p>
                </div>
              </div>

              {browserVoices.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-[#1e293b] border border-dashed border-[#e2dcc5] dark:border-[#334155] text-center space-y-2">
                  <VolumeX className="w-8 h-8 text-[#8c7e6a] mx-auto" />
                  <p className="text-xs text-[#8c7e6a] dark:text-[#94a3b8]">
                    No system voices detected or Web Speech API is initializing. You can use the AI Studio Voices above!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {browserVoices.map((voice) => {
                    const isSelected = settings.engine === 'browser' && settings.browserVoiceURI === voice.voiceURI;
                    const isPreviewing = previewingVoice === voice.voiceURI && playbackState.isPlaying;

                    return (
                      <div
                        key={voice.voiceURI || voice.name}
                        onClick={() => handleSelectBrowserVoice(voice.voiceURI || voice.name)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 shadow-xs'
                            : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] hover:border-blue-400/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-xs truncate">
                              {voice.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#6b5c4c] dark:text-slate-300">
                              {voice.lang}
                            </span>
                            {voice.default && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVoice(voice.voiceURI || voice.name, 'browser');
                            }}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isPreviewing
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                            }`}
                            title="Preview Voice"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
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

        {/* Persistent Bottom Audio Player Bar */}
        <div className="p-4 bg-[#f5f0e3] dark:bg-[#141e33] border-t border-[#e2dcc5] dark:border-[#334155] shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={handlePlayCurrentStory}
              disabled={playbackState.isLoading}
              className={`px-4 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                playbackState.isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 text-[#fdfaf1] dark:text-slate-950'
              }`}
            >
              {playbackState.isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Synthesizing Voice...</span>
                </>
              ) : playbackState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Story</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Read Active Chapter Aloud</span>
                </>
              )}
            </button>

            {/* Stop Button */}
            {playbackState.isPlaying && (
              <button
                type="button"
                onClick={() => narratorEngine.stop()}
                className="p-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                title="Stop Narration"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}

            {/* Active Voice Info & Speed indicator */}
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs font-serif font-bold truncate">
                {settings.engine === 'gemini' ? `Voice: ${settings.geminiVoice}` : 'Voice: System Speech'}
              </p>
              <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8] font-mono">
                {playbackState.isPlaying
                  ? `${formatTime(playbackState.currentTime)} / ${formatTime(playbackState.duration)} • ${settings.rate}x`
                  : `Speed: ${settings.rate}x • Vol: ${Math.round(settings.volume * 100)}%`}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {playbackState.isPlaying && (
            <div className="w-full h-1.5 bg-[#e2dcc5] dark:bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, playbackState.progress * 100))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
