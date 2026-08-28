import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Skull,
  Flame,
  Trees,
  Beer,
  Swords,
  Waves,
  CloudRain,
  Tent,
  Compass,
  Wind,
  Moon,
  Bird,
  Drum,
} from 'lucide-react';
import {
  soundEngine,
  AMBIENCE_SCENES,
  AMBIENT_LAYERS,
  AmbienceScene,
  AmbientLayerType,
  PlaybackState,
} from '../utils/audio';

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignAtmosphere?: string;
}

/** Icons are named in the scene/layer data; resolve them here. */
const SCENE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Skull,
  Flame,
  Trees,
  Beer,
  Swords,
  Waves,
  CloudRain,
  Sparkles,
  Tent,
  Compass,
};

const LAYER_ICONS: Record<AmbientLayerType, React.FC<{ className?: string }>> = {
  wind: Wind,
  rain: CloudRain,
  fire: Flame,
  cave: Skull,
  forest: Trees,
  waves: Waves,
  crowd: Beer,
  drums: Drum,
  mystic: Sparkles,
  night: Moon,
};

/**
 * Picks the scene that best matches the current location's atmosphere text, so
 * the studio opens on something relevant to where the party actually is.
 */
function suggestSceneForAtmosphere(atmosphere?: string): AmbienceScene | null {
  if (!atmosphere) return null;
  const text = atmosphere.toLowerCase();
  const rules: { id: string; keywords: string[] }[] = [
    { id: 'crypt', keywords: ['crypt', 'tomb', 'catacomb', 'sunken', 'burial', 'sepulchre'] },
    { id: 'dungeon', keywords: ['dungeon', 'torch', 'ruin', 'vault', 'cellar', 'lair'] },
    { id: 'forest', keywords: ['forest', 'wood', 'grove', 'canopy', 'tree', 'thicket', 'mistwood'] },
    { id: 'tavern', keywords: ['tavern', 'inn', 'hearth', 'alehouse', 'market', 'village'] },
    { id: 'siege', keywords: ['siege', 'battle', 'war', 'fortress', 'rampart', 'gate', 'bastion'] },
    { id: 'coast', keywords: ['coast', 'sea', 'ocean', 'shore', 'harbour', 'harbor', 'tide', 'cliff'] },
    { id: 'rainstorm', keywords: ['rain', 'storm', 'downpour', 'thunder'] },
    { id: 'arcane', keywords: ['arcane', 'rune', 'magic', 'sanctum', 'ley', 'astral', 'spell'] },
    { id: 'camp', keywords: ['camp', 'night', 'fire', 'evening', 'dusk'] },
    { id: 'highroad', keywords: ['road', 'plain', 'field', 'hill', 'moor', 'wild'] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return AMBIENCE_SCENES.find((s) => s.id === rule.id) || null;
    }
  }
  return null;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  isOpen,
  onClose,
  campaignAtmosphere,
}) => {
  const [state, setState] = useState<PlaybackState>(() => soundEngine.getPlaybackState());
  // Mute lives in the engine state so this stays in step with the header's own
  // sound toggle rather than drifting out of sync with it.
  const soundEnabled = state.soundEnabled;

  useEffect(() => {
    const unsub = soundEngine.subscribe((next) => setState({ ...next }));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const suggested = suggestSceneForAtmosphere(campaignAtmosphere);
  const activeSceneId = state.currentScene?.id ?? null;
  const activeLayers = AMBIENT_LAYERS.filter((l) => state.ambientLayers[l.id].enabled);

  const handlePlayScene = (scene: AmbienceScene) => {
    soundEngine.playScene(scene);
  };

  const handleToggleTransport = () => {
    if (state.isPlaying) {
      soundEngine.pauseMusic();
    } else if (state.currentScene) {
      soundEngine.resumeMusic();
    } else {
      soundEngine.playScene(suggested || AMBIENCE_SCENES[0]);
    }
  };

  const handleToggleMute = () => {
    soundEngine.toggleSound();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0b1220] border-2 border-[#1e2d4a] rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#080d18] border-b border-[#1a263d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-serif font-bold italic text-amber-300 truncate">
                Ambience Studio
              </h2>
              <p className="text-[11px] text-slate-400 font-sans truncate">
                {state.currentScene
                  ? `Now playing: ${state.currentScene.title}`
                  : 'Choose a soundscape for your scene'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              title={soundEnabled ? 'Mute all audio' : 'Unmute audio'}
              className="p-2 rounded-xl bg-[#131d2e] border border-[#273752] text-slate-300 hover:text-white hover:bg-[#1c2a42] transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 rounded-xl bg-[#131d2e] border border-[#273752] text-slate-300 hover:text-white hover:bg-[#1c2a42] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Transport bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#0c1426] border-b border-[#1a263d] flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleToggleTransport}
            className="w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            title={state.isPlaying ? 'Pause ambience' : 'Play ambience'}
          >
            {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => soundEngine.stopAmbience()}
            disabled={!state.isPlaying && activeLayers.length === 0}
            className="w-9 h-9 rounded-2xl bg-[#131d2e] border border-[#273752] text-slate-300 hover:text-white hover:bg-[#1c2a42] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0"
            title="Stop ambience"
          >
            <Square className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.volume}
              onChange={(e) => soundEngine.setMusicVolume(Number(e.target.value))}
              className="flex-1 accent-amber-500 cursor-pointer"
              aria-label="Ambience volume"
            />
            <span className="text-[11px] font-mono text-slate-400 w-9 text-right shrink-0">
              {Math.round(state.volume * 100)}%
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            {activeLayers.length} layer{activeLayers.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Scenes */}
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-serif font-bold text-amber-300">Soundscapes</h3>
              {suggested && (
                <span className="text-[11px] text-slate-400 font-sans">
                  Suggested for this scene:{' '}
                  <button
                    type="button"
                    onClick={() => handlePlayScene(suggested)}
                    className="text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
                  >
                    {suggested.title}
                  </button>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AMBIENCE_SCENES.map((scene) => {
                const Icon = SCENE_ICONS[scene.icon] || Sparkles;
                const isActive = activeSceneId === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => handlePlayScene(scene)}
                    aria-pressed={isActive}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isActive
                        ? 'border-amber-400 bg-[#162744] ring-1 ring-amber-400/40 shadow-md'
                        : 'border-[#1e2d4a] bg-[#090f1a] hover:border-amber-500/40 hover:bg-[#0e1729]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-amber-500/25 border-amber-400/50 text-amber-300'
                          : 'bg-[#111c30] border-[#233457] text-slate-400'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-serif font-bold text-slate-100 truncate">
                          {scene.title}
                        </span>
                        {isActive && state.isPlaying && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-snug mt-0.5">
                        {scene.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Layer mixer */}
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-serif font-bold text-amber-300">Layer Mixer</h3>
              <span className="text-[11px] text-slate-500 font-sans">
                Toggle individual sounds and set their level
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AMBIENT_LAYERS.map((layer) => {
                const Icon = LAYER_ICONS[layer.id] || Sparkles;
                const layerState = state.ambientLayers[layer.id];
                return (
                  <div
                    key={layer.id}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      layerState.enabled
                        ? 'border-amber-500/40 bg-[#111d33]'
                        : 'border-[#1e2d4a] bg-[#090f1a]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => soundEngine.toggleAmbientLayer(layer.id)}
                        aria-pressed={layerState.enabled}
                        title={layerState.enabled ? `Mute ${layer.name}` : `Play ${layer.name}`}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          layerState.enabled
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'bg-[#111c30] border-[#233457] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-serif font-bold text-slate-200 truncate">
                          {layer.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans truncate">
                          {layer.description}
                        </div>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={layerState.volume}
                      disabled={!layerState.enabled}
                      onChange={(e) =>
                        soundEngine.setAmbientVolume(layer.id, Number(e.target.value))
                      }
                      className="w-full mt-2 accent-amber-500 cursor-pointer disabled:opacity-30 disabled:cursor-default"
                      aria-label={`${layer.name} level`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#080d18] border-t border-[#1a263d] text-[11px] text-slate-500 font-sans shrink-0 flex items-center gap-2">
          <Bird className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>
            Every sound here is synthesised live in your browser — nothing is downloaded, and it
            works offline.
          </span>
        </div>
      </div>
    </div>
  );
};
