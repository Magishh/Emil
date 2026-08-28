import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Disc3,
  X,
  Radio,
  Sliders,
  Flame,
  Trees,
  Castle,
  Skull,
  Compass,
  Wand2,
  Download,
  Plus,
  Trash2,
  ListMusic,
  CloudRain,
  Mountain,
  Wind,
  Sparkle,
  Waves,
  ShieldAlert,
  Crown,
  Snowflake,
  Sun
} from 'lucide-react';
import {
  soundEngine,
  FANTASY_COMPOSITIONS,
  createProceduralSong,
  TrackComposition,
  SongCreationOptions,
  AmbientLayerType
} from '../utils/audio';

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignAtmosphere?: string;
}

const PRESET_THEMES = [
  {
    key: 'tavern',
    name: 'Tavern Hearth & Jig',
    icon: Flame,
    genre: 'Celtic Folk',
    lead: 'Plucked Lute',
    prompt: 'Lively acoustic tavern music with medieval lute, warm fiddle, and cheerful bodhran percussion in a bustling fantasy inn',
  },
  {
    key: 'dungeon',
    name: 'Dungeon Catacombs',
    icon: Skull,
    genre: 'Dark Ambient',
    lead: 'Woodland Flute',
    prompt: 'Dark atmospheric ambient music with eerie drone, creeping suspense, and distant dungeon tension',
  },
  {
    key: 'boss',
    name: 'Dragon Boss Battle',
    icon: Castle,
    genre: 'Epic War March',
    lead: 'Battle Horn',
    prompt: 'Epic thunderous orchestral battle theme with aggressive brass, frantic war drums, and heroic crescendo',
  },
  {
    key: 'elven',
    name: 'Mystic Elven Grove',
    icon: Trees,
    genre: 'Ethereal Forest',
    lead: 'Fey Harp',
    prompt: 'Enchanting fantasy melody with gentle wooden flutes, harp arpeggios, shimmering chimes, and starlit canopy',
  },
  {
    key: 'highroad',
    name: 'High Road March',
    icon: Compass,
    genre: 'Heroic Fanfare',
    lead: 'Folk Fiddle',
    prompt: 'Inspiring adventure march with sweeping horns, steady cadence drums, uplifting strings, and open horizon grandeur',
  },
  {
    key: 'gothic',
    name: 'Gothic Vampire Crypt',
    icon: Skull,
    genre: 'Baroque Horror',
    lead: 'Cathedral Organ',
    prompt: 'Majestic cathedral organ, shadows creeping along stone colonnades and crypt tombs',
  },
  {
    key: 'desert',
    name: 'Desert Caravanserai',
    icon: Sun,
    genre: 'Exotic Sands',
    lead: 'Plucked Lute',
    prompt: 'Dune winds, exotic oud scales, shimmering heat haze, and ancient desert oasis sands',
  },
  {
    key: 'ice_spire',
    name: 'Glacial Ice Spire',
    icon: Snowflake,
    genre: 'Winter Fantasy',
    lead: 'Star Celeste',
    prompt: 'Glistening icicles, piercing frozen winds, and delicate crystal bell chimes',
  },
  {
    key: 'arcane_choir',
    name: 'Arcane Sanctum Hymn',
    icon: Sparkle,
    genre: 'Choral Ethereal',
    lead: 'Arcane Choir',
    prompt: 'Vocal chants, glowing arcane leylines, celestial knowledge and ancient wizardry',
  },
  {
    key: 'court_dance',
    name: 'Royal Court Banquet',
    icon: Crown,
    genre: 'Renaissance Strings',
    lead: 'Folk Fiddle',
    prompt: 'Nobility dance, fine silk banners, shimmering chandeliers and royal palace feasts',
  },
  {
    key: 'stealth_heist',
    name: 'Shadow Rogue Stealth',
    icon: ShieldAlert,
    genre: 'Tense Rogue Stealth',
    lead: 'Hammered Dulcimer',
    prompt: 'Tiptoeing across moonlit rooftops, lockpicks turning, guarded patrol footsteps',
  },
  {
    key: 'campfire_skald',
    name: 'Starlight Campfire Skald',
    icon: Flame,
    genre: 'Bardic Ballad',
    lead: 'Tavern Accordion',
    prompt: 'Crackling fire, quiet night sky, memories of lost companions and heroic tales',
  },
];

const INSTRUMENT_OPTIONS: { id: SongCreationOptions['leadInstrument']; name: string; desc: string }[] = [
  { id: 'lute', name: 'Plucked Lute', desc: 'Warm medieval strings & bardic strum' },
  { id: 'harp', name: 'Fey Harp', desc: 'Ethereal plucked dual-octave chords' },
  { id: 'flute', name: 'Woodland Flute', desc: 'Breathy vibrato & mystic melody' },
  { id: 'violin', name: 'Folk Fiddle', desc: 'Expressive bowed string lead' },
  { id: 'brass', name: 'Battle Horn', desc: 'Soaring brass fanfare & triumphant calls' },
  { id: 'organ', name: 'Cathedral Organ', desc: 'Grand harmonic gothic pipes' },
  { id: 'celeste', name: 'Star Celeste', desc: 'Pure bell chimes & crystal resonance' },
  { id: 'choir', name: 'Arcane Choir', desc: 'Ethereal mystic vocal vowel formants' },
  { id: 'accordion', name: 'Tavern Accordion', desc: 'Lively squeeze-box reed tremolo' },
  { id: 'dulcimer', name: 'Hammered Dulcimer', desc: 'Fast metallic strike & crystal sustain' },
];

const MODE_OPTIONS: { id: NonNullable<SongCreationOptions['mode']>; name: string; mood: string }[] = [
  { id: 'dorian', name: 'Celtic Dorian', mood: 'Adventurous, folk, hopeful' },
  { id: 'phrygian', name: 'Dark Phrygian', mood: 'Ominous, eerie, tension' },
  { id: 'harmonic_minor', name: 'Harmonic Minor', mood: 'Gothic, dramatic, intense' },
  { id: 'pentatonic', name: 'Fey Pentatonic', mood: 'Tranquil, magical, serene' },
  { id: 'lydian', name: 'Lydian Dream', mood: 'Mystical, floating, wondrous' },
  { id: 'hijaz', name: 'Desert Hijaz', mood: 'Exotic, ancient caravan sands' },
  { id: 'major', name: 'Heroic Major', mood: 'Grand, noble, triumphant' },
];

const PERCUSSION_OPTIONS: { id: SongCreationOptions['percussion']; name: string }[] = [
  { id: 'tavern', name: 'Bodhran & Tap' },
  { id: 'wardrum', name: 'Heavy War Drum' },
  { id: 'subtle', name: 'Subtle Chime & Thud' },
  { id: 'shaker', name: 'Fast Jig Shaker' },
  { id: 'none', name: 'No Drums (Ambient)' },
];

const ACOUSTIC_SPACES: { id: SongCreationOptions['acousticSpace']; name: string; desc: string }[] = [
  { id: 'tavern', name: 'Cozy Tavern Hearth', desc: 'Warm wooden room resonance' },
  { id: 'catacomb', name: 'Deep Cavern & Crypt', desc: 'Dark cavernous delay & echo' },
  { id: 'cathedral', name: 'Grand Cathedral Hall', desc: 'Long liturgical stone reverb' },
  { id: 'feywild', name: 'Mystic Fey Canopy', desc: 'Sparkling high-end shimmer' },
  { id: 'openfield', name: 'Open Horizon Plains', desc: 'Crisp wide stereo adventure' },
];

const AMBIENT_SOUNDSCAPES: { key: AmbientLayerType; name: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
  { key: 'fire', name: 'Campfire Embers', icon: Flame, desc: 'Crackling wood and glowing coals' },
  { key: 'rain', name: 'Stormy Rain', icon: CloudRain, desc: 'Soothing continuous rainfall shower' },
  { key: 'cave', name: 'Cavern Echoes', icon: Waves, desc: 'Subterranean hum & dripping water' },
  { key: 'wind', name: 'Mountain Wind', icon: Wind, desc: 'Whispering mountain forest breeze' },
  { key: 'mystic', name: 'Fey Shimmer', icon: Sparkle, desc: 'Astral dust and crystal chimes' },
];

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  isOpen,
  onClose,
  campaignAtmosphere,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'composer' | 'ambient' | 'ai' | 'library'>('presets');

  // Playback state synced from soundEngine
  const [playbackState, setPlaybackState] = useState(() => soundEngine.getPlaybackState());
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  // Custom Studio Composer Options
  const [composerInstrument, setComposerInstrument] = useState<SongCreationOptions['leadInstrument']>('lute');
  const [composerMode, setComposerMode] = useState<NonNullable<SongCreationOptions['mode']>>('dorian');
  const [composerPercussion, setComposerPercussion] = useState<SongCreationOptions['percussion']>('tavern');
  const [composerSpace, setComposerSpace] = useState<SongCreationOptions['acousticSpace']>('tavern');
  const [composerBpm, setComposerBpm] = useState<number>(112);
  const [composerTitle, setComposerTitle] = useState<string>('');

  // AI Prompt Studio state
  const [aiPrompt, setAiPrompt] = useState(
    campaignAtmosphere
      ? `Atmospheric fantasy soundtrack matching: ${campaignAtmosphere}. Medieval instruments, rich adventure tone.`
      : 'Medieval fantasy tavern lute and violin melody with warm cozy ambiance'
  );
  const [trackType, setTrackType] = useState<'clip' | 'full'>('clip');
  const [isGenerating, setIsGenerating] = useState(false);

  // User's custom created library of compositions
  const [customTracks, setCustomTracks] = useState<TrackComposition[]>(() => {
    try {
      const saved = localStorage.getItem('dnd_created_music_tracks');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Keep state synced with global soundEngine
  useEffect(() => {
    const unsubscribe = soundEngine.subscribe((state) => {
      setPlaybackState({ ...state });
    });
    return () => unsubscribe();
  }, []);

  // Sync volume with sound engine
  useEffect(() => {
    soundEngine.setMusicVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Persist custom created tracks
  useEffect(() => {
    try {
      localStorage.setItem('dnd_created_music_tracks', JSON.stringify(customTracks));
    } catch {
      // ignore
    }
  }, [customTracks]);

  // Handle Preset Instant Load & Play
  const handleSelectPreset = (presetKey: string) => {
    const comp = FANTASY_COMPOSITIONS[presetKey] || FANTASY_COMPOSITIONS.tavern;
    soundEngine.playComposition(comp);
  };

  // Handle Studio Custom Song Composition
  const handleComposeSong = () => {
    soundEngine.playDiceRoll();

    const newTrack = createProceduralSong({
      leadInstrument: composerInstrument,
      mode: composerMode,
      percussion: composerPercussion,
      acousticSpace: composerSpace,
      bpm: composerBpm,
      prompt: composerTitle.trim() || undefined,
    });

    if (composerTitle.trim()) {
      newTrack.title = composerTitle.trim();
    }

    // Play immediately in sound engine
    soundEngine.playComposition(newTrack);

    // Save to user library
    setCustomTracks((prev) => [newTrack, ...prev.filter((t) => t.id !== newTrack.id)]);
    soundEngine.playLevelUp();
  };

  // Handle AI Music Generation (Lyria or Procedural Engine)
  const handleGenerateAiMusic = async () => {
    if (!aiPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    soundEngine.playDiceRoll();

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          trackType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const mimeType = data.mimeType || 'audio/wav';
          const binary = atob(data.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);

          const aiComp: TrackComposition = {
            id: `ai-${Date.now()}`,
            title: data.title || `AI Track: ${aiPrompt.slice(0, 24)}`,
            genre: data.genre || (data.isLyria ? 'Google Lyria AI Music' : 'Fantasy AI Score'),
            bpm: 110,
            scale: [],
            bassNotes: [],
            leadPattern: [],
            harmonyPattern: [],
            drumPattern: [],
            mood: aiPrompt,
            instruments: { lead: 'lute', bass: 'drone', percussion: 'tavern' }
          };

          soundEngine.playComposition(aiComp, url);
          setCustomTracks((prev) => [aiComp, ...prev]);
          soundEngine.playLevelUp();
          return;
        }
      }

      // Procedural fallback if AI service offline
      const dynamicComp = createProceduralSong({ prompt: aiPrompt });
      soundEngine.playComposition(dynamicComp);
      setCustomTracks((prev) => [dynamicComp, ...prev]);
      soundEngine.playLevelUp();
    } catch (err: unknown) {
      console.warn('AI music fallback:', err);
      const dynamicComp = createProceduralSong({ prompt: aiPrompt });
      soundEngine.playComposition(dynamicComp);
      setCustomTracks((prev) => [dynamicComp, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    if (playbackState.isPlaying) {
      soundEngine.pauseMusic();
    } else {
      if (playbackState.currentComposition) {
        soundEngine.resumeMusic();
      } else {
        soundEngine.playComposition(FANTASY_COMPOSITIONS.tavern);
      }
    }
  };

  const handleDownloadWav = (track: TrackComposition) => {
    const wavUrl = soundEngine.generateWavDataUrl(track, 24);
    const a = document.createElement('a');
    a.href = wavUrl;
    a.download = `${track.title.replace(/\s+/g, '_')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteCustomTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomTracks((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isOpen) return null;

  const currentTrackTitle = playbackState.currentComposition?.title || "Tavern Hearth & Bard's Jig";
  const currentTrackGenre = playbackState.currentComposition?.genre || 'Celtic Fantasy Folk';
  const isPlaying = playbackState.isPlaying;

  return (
    <div
      id="music-player-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fdfaf1] dark:bg-[#0f172a] border-2 border-[#b8ae8f] dark:border-[#334155] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="p-4 bg-[#f5f0e3] dark:bg-[#1e293b] border-b border-[#e2dcc5] dark:border-[#334155] flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 flex items-center justify-center shadow-xs">
              <Disc3 className={`w-5 h-5 text-[#b8ae8f] dark:text-slate-950 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  Campaign Music & Atmosphere Studio
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-[#2c1810]/10 dark:bg-amber-500/20 text-[#2c1810] dark:text-amber-300">
                  Continuous Audio
                </span>
              </div>
              <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8]">
                High-fidelity procedural soundtrack generator, ambient layers & Google Lyria AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close modal (Music will keep playing in background)"
            className="p-1.5 rounded-lg text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc] hover:bg-[#e2dcc5]/50 dark:hover:bg-[#334155] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#e2dcc5] dark:border-[#334155] bg-[#faf6ea] dark:bg-[#0b1120] overflow-x-auto text-xs font-serif font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300'
                : 'border-transparent text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Preset Soundtracks ({PRESET_THEMES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('composer')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'composer'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300'
                : 'border-transparent text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Song Composer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ambient')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ambient'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300'
                : 'border-transparent text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Ambient Mixer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300'
                : 'border-transparent text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Music Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-[#2c1810] dark:border-amber-400 text-[#2c1810] dark:text-amber-300'
                : 'border-transparent text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Saved Tracks ({customTracks.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: Preset Soundtracks */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  Choose Soundtrack Preset:
                </label>
                <span className="text-[10px] text-[#8c7e6a] dark:text-[#94a3b8]">
                  Click to play immediately
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_THEMES.map((theme) => {
                  const Icon = theme.icon;
                  const isCurrent =
                    playbackState.currentComposition?.id === theme.key ||
                    playbackState.currentComposition?.title.includes(theme.name);
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => handleSelectPreset(theme.key)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all shadow-2xs cursor-pointer ${
                        isCurrent && isPlaying
                          ? 'bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white border-[#2c1810] dark:border-amber-500 ring-2 ring-amber-400/40'
                          : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] hover:border-[#2c1810] dark:hover:border-amber-500/50 hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc]'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isCurrent && isPlaying
                            ? 'bg-white/20 text-white'
                            : 'bg-[#f5f0e3] dark:bg-[#0f172a] text-[#8c7e6a] dark:text-[#94a3b8]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-serif font-bold truncate">{theme.name}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              isCurrent && isPlaying
                                ? 'bg-white/20 text-white'
                                : 'bg-[#e2dcc5] dark:bg-[#334155] text-[#4a3227] dark:text-[#cbd5e1]'
                            }`}
                          >
                            {theme.genre}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] line-clamp-2 mt-0.5 ${
                            isCurrent && isPlaying
                              ? 'text-white/80'
                              : 'text-[#8c7e6a] dark:text-[#94a3b8]'
                          }`}
                        >
                          {theme.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Song Composer Studio */}
          {activeTab === 'composer' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold font-serif">Original Song Synthesizer:</span> Combine 10 medieval instruments, musical modes, tempo, and acoustic spaces to create your own original campaign theme.
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  Track Title (Optional):
                </label>
                <input
                  type="text"
                  value={composerTitle}
                  onChange={(e) => setComposerTitle(e.target.value)}
                  placeholder="e.g. Song of the Whispering Spire, Midnight Duel..."
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] rounded-xl text-xs text-[#2c1810] dark:text-[#f8fafc] shadow-inner font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Lead Instrument Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  1. Lead Instrument (10 Types):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {INSTRUMENT_OPTIONS.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setComposerInstrument(inst.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        composerInstrument === inst.id
                          ? 'bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white border-[#2c1810] dark:border-amber-500'
                          : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] text-[#2c1810] dark:text-[#f8fafc] hover:bg-[#f5f0e3] dark:hover:bg-[#283548]'
                      }`}
                    >
                      <p className="text-xs font-serif font-bold">{inst.name}</p>
                      <p className="text-[9px] opacity-75 truncate">{inst.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Musical Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  2. Musical Scale & Mood:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {MODE_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setComposerMode(m.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        composerMode === m.id
                          ? 'bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white border-[#2c1810] dark:border-amber-500'
                          : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] text-[#2c1810] dark:text-[#f8fafc] hover:bg-[#f5f0e3] dark:hover:bg-[#283548]'
                      }`}
                    >
                      <p className="text-xs font-serif font-bold">{m.name}</p>
                      <p className="text-[9px] opacity-75 truncate">{m.mood}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Acoustic Space Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  3. Acoustic Reverb Space:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ACOUSTIC_SPACES.map((space) => (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => setComposerSpace(space.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        composerSpace === space.id
                          ? 'bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white border-[#2c1810] dark:border-amber-500'
                          : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] text-[#2c1810] dark:text-[#f8fafc] hover:bg-[#f5f0e3] dark:hover:bg-[#283548]'
                      }`}
                    >
                      <p className="text-xs font-serif font-bold">{space.name}</p>
                      <p className="text-[9px] opacity-75 truncate">{space.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Percussion & Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                    4. Percussion:
                  </label>
                  <select
                    value={composerPercussion}
                    onChange={(e) => setComposerPercussion(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] rounded-xl text-xs text-[#2c1810] dark:text-[#f8fafc] cursor-pointer"
                  >
                    {PERCUSSION_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                      5. Tempo:
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {composerBpm} BPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    step="4"
                    value={composerBpm}
                    onChange={(e) => setComposerBpm(parseInt(e.target.value, 10))}
                    className="w-full accent-[#2c1810] dark:accent-amber-500 h-2 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Compose Button */}
              <button
                type="button"
                onClick={handleComposeSong}
                className="w-full py-3 bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 active:scale-[0.99] text-[#fdfaf1] dark:text-slate-950 font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Music className="w-4 h-4 text-[#b8ae8f] dark:text-slate-950" />
                <span>🎵 Compose & Play New Original Song</span>
              </button>
            </div>
          )}

          {/* TAB 3: Ambient Soundscapes Mixer */}
          {activeTab === 'ambient' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Wind className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold font-serif">Ambient Atmosphere Mixer:</span> Layer real-time natural soundscapes (rain, crackling hearth, deep cave drops, mountain winds) underneath any playing soundtrack.
                </div>
              </div>

              <div className="space-y-2.5">
                {AMBIENT_SOUNDSCAPES.map((amb) => {
                  const Icon = amb.icon;
                  const state = playbackState.ambientLayers[amb.key];
                  const isEnabled = state?.enabled || false;
                  const currentVol = state?.volume ?? 0.5;

                  return (
                    <div
                      key={amb.key}
                      className={`p-3 rounded-xl border transition-all ${
                        isEnabled
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 dark:border-amber-500/40'
                          : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-lg ${
                              isEnabled
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-[#f5f0e3] dark:bg-[#0f172a] text-[#8c7e6a] dark:text-[#94a3b8]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                              {amb.name}
                            </p>
                            <p className="text-[10px] text-[#8c7e6a] dark:text-[#94a3b8]">
                              {amb.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => soundEngine.toggleAmbientLayer(amb.key)}
                          className={`px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
                            isEnabled
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#e2dcc5] dark:bg-[#334155] text-[#2c1810] dark:text-[#f8fafc] hover:bg-[#d5ceb5]'
                          }`}
                        >
                          {isEnabled ? 'ACTIVE' : 'OFF'}
                        </button>
                      </div>

                      {/* Volume Slider */}
                      {isEnabled && (
                        <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                          <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={currentVol}
                            onChange={(e) => soundEngine.setAmbientVolume(amb.key, parseFloat(e.target.value))}
                            className="w-full accent-amber-500 h-1.5 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 w-8 text-right font-bold">
                            {Math.round(currentVol * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AI Prompt Generator */}
          {activeTab === 'ai' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  Describe Your Soundtrack with AI:
                </label>
                <div className="flex bg-[#f5f0e3] dark:bg-[#1e293b] p-0.5 rounded-md text-[10px] border border-[#e2dcc5] dark:border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setTrackType('clip')}
                    className={`px-2 py-0.5 rounded font-serif cursor-pointer ${
                      trackType === 'clip'
                        ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950'
                        : 'text-[#8c7e6a] dark:text-[#94a3b8]'
                    }`}
                  >
                    30s Clip
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackType('full')}
                    className={`px-2 py-0.5 rounded font-serif cursor-pointer ${
                      trackType === 'full'
                        ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950'
                        : 'text-[#8c7e6a] dark:text-[#94a3b8]'
                    }`}
                  >
                    Full Score
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="Describe instruments, tempo, fantasy mood, dragon boss battle tension, enchanted woods..."
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] rounded-xl text-xs text-[#2c1810] dark:text-[#f8fafc] shadow-inner font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <button
                type="button"
                onClick={handleGenerateAiMusic}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full py-3 bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 active:scale-[0.99] text-[#fdfaf1] dark:text-slate-950 font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#b8ae8f] dark:text-slate-950" />
                    <span>Composing AI Soundtrack...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#b8ae8f] dark:text-slate-950" />
                    <span>Generate AI Soundtrack</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 5: Custom Library */}
          {activeTab === 'library' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                  Saved Compositions ({customTracks.length}):
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('composer')}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-serif cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Compose New</span>
                </button>
              </div>

              {customTracks.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#1e293b] rounded-2xl border border-dashed border-[#e2dcc5] dark:border-[#334155] space-y-2">
                  <Music className="w-8 h-8 text-[#8c7e6a] dark:text-[#64748b] mx-auto opacity-50" />
                  <p className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc]">
                    No custom tracks created yet
                  </p>
                  <p className="text-[11px] text-[#8c7e6a] dark:text-[#94a3b8]">
                    Use the Song Composer or AI Generator to create and store custom fantasy songs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {customTracks.map((track) => {
                    const isTrackPlaying =
                      playbackState.currentComposition?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        onClick={() => soundEngine.playComposition(track)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isTrackPlaying
                            ? 'bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white border-[#2c1810] dark:border-amber-500'
                            : 'bg-white dark:bg-[#1e293b] border-[#e2dcc5] dark:border-[#334155] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isTrackPlaying
                                ? 'bg-white text-slate-900'
                                : 'bg-[#f5f0e3] dark:bg-[#0f172a] text-[#2c1810] dark:text-[#f8fafc]'
                            }`}
                          >
                            {isTrackPlaying ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-serif font-bold truncate">{track.title}</p>
                            <p className="text-[10px] opacity-75 truncate">
                              {track.genre} • {track.bpm} BPM
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            title="Download WAV file"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadWav(track);
                            }}
                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete track"
                            onClick={(e) => handleDeleteCustomTrack(track.id, e)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE DECK PLAYER (Always displayed at bottom) */}
          <div className="p-4 bg-white dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] rounded-2xl space-y-3 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Visualizer bars */}
                <div className="flex gap-0.5 items-end h-6 w-7 shrink-0 bg-[#f5f0e3] dark:bg-[#0f172a] p-1 rounded-md">
                  <span
                    className={`w-1 bg-[#2c1810] dark:bg-amber-400 rounded-xs transition-all ${
                      isPlaying ? 'animate-bounce' : 'h-1'
                    }`}
                    style={{ height: isPlaying ? '16px' : '4px', animationDelay: '0ms' }}
                  />
                  <span
                    className={`w-1 bg-[#2c1810] dark:bg-amber-400 rounded-xs transition-all ${
                      isPlaying ? 'animate-bounce' : 'h-2'
                    }`}
                    style={{ height: isPlaying ? '20px' : '6px', animationDelay: '150ms' }}
                  />
                  <span
                    className={`w-1 bg-[#2c1810] dark:bg-amber-400 rounded-xs transition-all ${
                      isPlaying ? 'animate-bounce' : 'h-1'
                    }`}
                    style={{ height: isPlaying ? '14px' : '3px', animationDelay: '300ms' }}
                  />
                  <span
                    className={`w-1 bg-[#2c1810] dark:bg-amber-400 rounded-xs transition-all ${
                      isPlaying ? 'animate-bounce' : 'h-2'
                    }`}
                    style={{ height: isPlaying ? '18px' : '5px', animationDelay: '75ms' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#f8fafc] truncate">
                      {currentTrackTitle}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#f5f0e3] dark:bg-[#0f172a] text-[#4a3227] dark:text-amber-300 rounded font-mono font-medium shrink-0">
                      {currentTrackGenre}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8c7e6a] dark:text-[#94a3b8] truncate">
                    Status: {isPlaying ? 'Playing in background (Continuous Loop)' : 'Paused'}
                  </p>
                </div>
              </div>

              {playbackState.currentComposition && (
                <button
                  type="button"
                  title="Download Current Song as Stereo WAV"
                  onClick={() => handleDownloadWav(playbackState.currentComposition!)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-serif border border-[#e2dcc5] dark:border-[#334155] bg-[#f5f0e3] dark:bg-[#0f172a] text-[#2c1810] dark:text-[#f8fafc] hover:bg-[#e2dcc5] dark:hover:bg-[#334155] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Download WAV</span>
                </button>
              )}
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-10 h-10 rounded-xl bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 flex items-center justify-center shadow-sm hover:bg-[#4a3227] dark:hover:bg-amber-400 transition-all shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newMuted = !isMuted;
                    setIsMuted(newMuted);
                    soundEngine.toggleSound(!newMuted);
                  }}
                  className="text-[#8c7e6a] dark:text-[#94a3b8] hover:text-[#2c1810] dark:hover:text-[#f8fafc] cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-full accent-[#2c1810] dark:accent-amber-500 h-1.5 bg-[#e2dcc5] dark:bg-[#334155] rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono text-[#8c7e6a] dark:text-[#94a3b8] w-7 text-right">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Banner */}
        <div className="p-3 bg-[#f5f0e3] dark:bg-[#1e293b] border-t border-[#e2dcc5] dark:border-[#334155] flex items-center justify-between text-[11px] text-[#8c7e6a] dark:text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
            {isPlaying ? 'Audio active in background' : 'Audio idle'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 rounded-lg font-serif font-bold text-xs hover:bg-[#4a3227] dark:hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Keep Playing & Close
          </button>
        </div>
      </div>
    </div>
  );
};
