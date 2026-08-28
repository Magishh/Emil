// ============================================================================
// Audio engine: interface sound effects plus a fully synthesised ambience bed.
//
// Everything here is generated with the Web Audio API at runtime - there are no
// audio files to ship, so the soundscape works offline and adds nothing to the
// bundle. Ambience is built from independent layers (wind, rain, fire, ...)
// that are mixed together by a scene preset.
// ============================================================================

export type AmbientLayerType =
  | 'wind'
  | 'rain'
  | 'fire'
  | 'cave'
  | 'forest'
  | 'waves'
  | 'crowd'
  | 'drums'
  | 'mystic'
  | 'night';

export interface AmbientLayerInfo {
  id: AmbientLayerType;
  name: string;
  description: string;
}

export const AMBIENT_LAYERS: AmbientLayerInfo[] = [
  { id: 'wind', name: 'Wind', description: 'Gusting air over open ground and high stone' },
  { id: 'rain', name: 'Rain', description: 'Steady rainfall with scattered heavy drops' },
  { id: 'fire', name: 'Hearth', description: 'Crackling embers and a low burning roar' },
  { id: 'cave', name: 'Caverns', description: 'Subterranean drone with distant dripping water' },
  { id: 'forest', name: 'Forest', description: 'Rustling leaves and scattered birdsong' },
  { id: 'waves', name: 'Shore', description: 'Slow swelling surf on a stony coast' },
  { id: 'crowd', name: 'Tavern', description: 'Muffled conversation, clinking tankards' },
  { id: 'drums', name: 'War Drums', description: 'Distant marching drums and horns' },
  { id: 'mystic', name: 'Arcane', description: 'Shimmering resonance and ethereal pads' },
  { id: 'night', name: 'Nightfall', description: 'Crickets and still evening air' },
];

export interface AmbientLayerState {
  enabled: boolean;
  volume: number;
}

export interface AmbienceScene {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Layer id -> mix level (0..1). Layers left out are silent. */
  layers: Partial<Record<AmbientLayerType, number>>;
}

export const AMBIENCE_SCENES: AmbienceScene[] = [
  {
    id: 'crypt',
    title: 'Sunken Crypt',
    description: 'Dripping stone, deep resonance, air that has not moved in centuries.',
    icon: 'Skull',
    layers: { cave: 0.75, wind: 0.2, mystic: 0.12 },
  },
  {
    id: 'dungeon',
    title: 'Torchlit Dungeon',
    description: 'Guttering torches against damp rock, something moving further in.',
    icon: 'Flame',
    layers: { cave: 0.55, fire: 0.45, drums: 0.1 },
  },
  {
    id: 'forest',
    title: 'Whispering Forest',
    description: 'Wind through the canopy, birds calling across the clearing.',
    icon: 'Trees',
    layers: { forest: 0.7, wind: 0.3, night: 0.12 },
  },
  {
    id: 'tavern',
    title: 'Hearth & Tankard',
    description: 'A warm room, low conversation, a fire burning down.',
    icon: 'Beer',
    layers: { crowd: 0.6, fire: 0.5 },
  },
  {
    id: 'siege',
    title: 'Siege at the Gate',
    description: 'War drums closing in while the ramparts burn.',
    icon: 'Swords',
    layers: { drums: 0.6, fire: 0.35, wind: 0.35, crowd: 0.15 },
  },
  {
    id: 'coast',
    title: 'Storm Coast',
    description: 'Surf breaking on black rock under a heavy sky.',
    icon: 'Waves',
    layers: { waves: 0.7, wind: 0.4, rain: 0.2 },
  },
  {
    id: 'rainstorm',
    title: 'Downpour',
    description: 'Rain hammering the road with nowhere to shelter.',
    icon: 'CloudRain',
    layers: { rain: 0.75, wind: 0.35 },
  },
  {
    id: 'arcane',
    title: 'Arcane Sanctum',
    description: 'Standing waves of magic in a room that hums.',
    icon: 'Sparkles',
    layers: { mystic: 0.7, cave: 0.2, wind: 0.1 },
  },
  {
    id: 'camp',
    title: 'Camp at Nightfall',
    description: 'A small fire, crickets, and the dark pressing in.',
    icon: 'Tent',
    layers: { fire: 0.55, night: 0.5, wind: 0.15 },
  },
  {
    id: 'highroad',
    title: 'The Open Road',
    description: 'Grassland wind and far-off birds, nothing else for miles.',
    icon: 'Compass',
    layers: { wind: 0.55, forest: 0.25, night: 0.1 },
  },
];

export interface PlaybackState {
  isPlaying: boolean;
  currentScene: AmbienceScene | null;
  volume: number;
  /** Global mute state, so every control reflects the same value. */
  soundEnabled: boolean;
  ambientLayers: Record<AmbientLayerType, AmbientLayerState>;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Ambience
  private ambienceBus: GainNode | null = null;
  private ambienceVolume = 0.65;
  private isAmbiencePlaying = false;
  private currentScene: AmbienceScene | null = null;
  private layerGains: Map<AmbientLayerType, GainNode> = new Map();
  private layerNodes: Map<AmbientLayerType, (() => void)[]> = new Map();
  private layerCancels: Map<AmbientLayerType, (() => void)[]> = new Map();
  private noiseBuffers: Map<string, AudioBuffer> = new Map();
  private listeners: Set<(state: PlaybackState) => void> = new Set();

  private ambientStates: Record<AmbientLayerType, AmbientLayerState> = AMBIENT_LAYERS.reduce(
    (acc, layer) => {
      acc[layer.id] = { enabled: false, volume: 0.5 };
      return acc;
    },
    {} as Record<AmbientLayerType, AmbientLayerState>
  );

  // ==========================================
  // STATE & SUBSCRIPTIONS
  // ==========================================

  public getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isAmbiencePlaying,
      currentScene: this.currentScene,
      volume: this.ambienceVolume,
      soundEnabled: this.soundEnabled,
      ambientLayers: { ...this.ambientStates },
    };
  }

  public subscribe(fn: (state: PlaybackState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getPlaybackState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notifyListeners() {
    const state = this.getPlaybackState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.warn('Audio listener error:', err);
      }
    });
  }

  public isPlaying(): boolean {
    return this.isAmbiencePlaying;
  }

  public getCurrentScene(): AmbienceScene | null {
    return this.currentScene;
  }

  public getMusicVolume(): number {
    return this.ambienceVolume;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // ==========================================
  // AUDIO GRAPH
  // ==========================================

  public initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;

        // Ambience runs through its own bus so its level is independent of
        // interface sound effects.
        this.ambienceBus = this.ctx.createGain();
        this.ambienceBus.gain.setValueAtTime(
          this.soundEnabled ? this.ambienceVolume : 0,
          this.ctx.currentTime
        );

        this.ambienceBus.connect(this.masterCompressor);
        this.masterCompressor.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleSound(enable?: boolean) {
    this.soundEnabled = enable !== undefined ? enable : !this.soundEnabled;

    if (this.ambienceBus && this.ctx) {
      try {
        this.ambienceBus.gain.setTargetAtTime(
          this.soundEnabled ? this.ambienceVolume : 0,
          this.ctx.currentTime,
          0.05
        );
      } catch {
        // Ignore
      }
    }

    this.notifyListeners();
    return this.soundEnabled;
  }

  public setMusicVolume(val: number) {
    this.ambienceVolume = Math.max(0, Math.min(1, val));
    if (this.ambienceBus && this.ctx) {
      this.ambienceBus.gain.setTargetAtTime(
        this.soundEnabled ? this.ambienceVolume : 0,
        this.ctx.currentTime,
        0.05
      );
    }
    this.notifyListeners();
  }

  // ==========================================
  // NOISE SOURCES
  // ==========================================

  private getNoiseBuffer(type: 'pink' | 'brown' | 'white'): AudioBuffer | null {
    if (!this.ctx) return null;
    const key = `${type}_${this.ctx.sampleRate}`;
    const cached = this.noiseBuffers.get(key);
    if (cached) return cached;

    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * 6);
    const buffer = this.ctx.createBuffer(2, frameCount, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      if (type === 'white') {
        for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
      } else if (type === 'pink') {
        // Paul Kellet's refined 1/f pink noise filter.
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < frameCount; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else {
        // Brownian / red noise via leaky integration.
        let last = 0;
        for (let i = 0; i < frameCount; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        }
      }
    }

    this.noiseBuffers.set(key, buffer);
    return buffer;
  }

  /** A looping, filtered noise source feeding one ambience layer. */
  private noiseVoice(
    layer: AmbientLayerType,
    opts: {
      noise: 'pink' | 'brown' | 'white';
      filter: BiquadFilterType;
      frequency: number;
      q?: number;
      gain: number;
      /** Slow level movement, e.g. wind gusts or wave swells. */
      lfoRate?: number;
      lfoDepth?: number;
      playbackRate?: number;
    }
  ) {
    const ctx = this.ctx;
    const dest = this.layerGains.get(layer);
    const buffer = this.getNoiseBuffer(opts.noise);
    if (!ctx || !dest || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    if (opts.playbackRate) source.playbackRate.value = opts.playbackRate;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter;
    filter.frequency.value = opts.frequency;
    filter.Q.value = opts.q ?? 0.7;

    const gain = ctx.createGain();
    gain.gain.value = opts.gain;

    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (opts.lfoRate && opts.lfoDepth) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = opts.lfoRate;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = opts.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start();

    this.trackNode(layer, () => {
      try { source.stop(); } catch { /* already stopped */ }
      try { lfo?.stop(); } catch { /* already stopped */ }
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      lfoGain?.disconnect();
    });
  }

  /** A sustained tone feeding one ambience layer (drones, pads). */
  private droneVoice(
    layer: AmbientLayerType,
    opts: { frequency: number; type?: OscillatorType; gain: number; detune?: number; lfoRate?: number; lfoDepth?: number }
  ) {
    const ctx = this.ctx;
    const dest = this.layerGains.get(layer);
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.value = opts.frequency;
    if (opts.detune) osc.detune.value = opts.detune;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(opts.gain, ctx.currentTime, 1.5); // fade in

    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (opts.lfoRate && opts.lfoDepth) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = opts.lfoRate;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = opts.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
    }

    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    this.trackNode(layer, () => {
      try { osc.stop(); } catch { /* already stopped */ }
      try { lfo?.stop(); } catch { /* already stopped */ }
      osc.disconnect();
      gain.disconnect();
      lfoGain?.disconnect();
    });
  }

  /** Schedules sparse one-shot events (drips, chirps, drums, clinks). */
  private eventVoice(
    layer: AmbientLayerType,
    minDelayMs: number,
    maxDelayMs: number,
    fire: () => void
  ) {
    // Only ever one timeout is pending per chain, so hold its id rather than
    // accumulating one entry per event for the life of the session.
    let pending: number | null = null;
    const schedule = () => {
      const delay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
      pending = window.setTimeout(() => {
        pending = null;
        if (!this.ambientStates[layer].enabled) return;
        try { fire(); } catch { /* a single missed event is harmless */ }
        schedule();
      }, delay);
    };
    schedule();

    const cancels = this.layerCancels.get(layer) || [];
    cancels.push(() => {
      if (pending !== null) {
        window.clearTimeout(pending);
        pending = null;
      }
    });
    this.layerCancels.set(layer, cancels);
  }

  private trackNode(layer: AmbientLayerType, stop: () => void) {
    const nodes = this.layerNodes.get(layer) || [];
    nodes.push(stop);
    this.layerNodes.set(layer, nodes);
  }

  /** A short pitched blip used by drip, chirp and bell events. */
  private blip(
    layer: AmbientLayerType,
    freq: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = 'sine',
    sweepTo?: number
  ) {
    const ctx = this.ctx;
    const dest = this.layerGains.get(layer);
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** A short filtered noise burst used by crackle and splash events. */
  private noiseBurst(
    layer: AmbientLayerType,
    frequency: number,
    duration: number,
    gainValue: number,
    filterType: BiquadFilterType = 'bandpass'
  ) {
    const ctx = this.ctx;
    const dest = this.layerGains.get(layer);
    const buffer = this.getNoiseBuffer('white');
    if (!ctx || !dest || !buffer) return;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  // ==========================================
  // AMBIENCE LAYERS
  // ==========================================

  private buildLayer(layer: AmbientLayerType) {
    switch (layer) {
      case 'wind':
        this.noiseVoice(layer, { noise: 'pink', filter: 'lowpass', frequency: 620, gain: 0.5, lfoRate: 0.07, lfoDepth: 0.32 });
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 260, gain: 0.35, lfoRate: 0.04, lfoDepth: 0.22 });
        // Occasional stronger gust across the high end.
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 1400, q: 0.8, gain: 0.1, lfoRate: 0.11, lfoDepth: 0.1 });
        break;

      case 'rain':
        this.noiseVoice(layer, { noise: 'white', filter: 'highpass', frequency: 1600, gain: 0.22 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 3200, q: 0.5, gain: 0.16, lfoRate: 0.09, lfoDepth: 0.06 });
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 420, gain: 0.16 });
        // Individual heavy drops striking stone.
        this.eventVoice(layer, 120, 700, () =>
          this.noiseBurst(layer, 1800 + Math.random() * 2600, 0.05, 0.16)
        );
        break;

      case 'fire':
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 340, gain: 0.34, lfoRate: 0.13, lfoDepth: 0.14 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 900, q: 0.6, gain: 0.1 });
        // Crackle and pop.
        this.eventVoice(layer, 90, 620, () =>
          this.noiseBurst(layer, 900 + Math.random() * 2400, 0.03 + Math.random() * 0.05, 0.2 + Math.random() * 0.16)
        );
        break;

      case 'cave':
        this.droneVoice(layer, { frequency: 47, type: 'sine', gain: 0.3, lfoRate: 0.05, lfoDepth: 0.06 });
        this.droneVoice(layer, { frequency: 70.5, type: 'sine', gain: 0.16, detune: 6, lfoRate: 0.037, lfoDepth: 0.05 });
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 180, gain: 0.22, lfoRate: 0.03, lfoDepth: 0.1 });
        // Water dripping into a distant pool.
        this.eventVoice(layer, 1400, 5200, () => {
          const base = 680 + Math.random() * 900;
          this.blip(layer, base, 0.22, 0.22, 'sine', base * 0.45);
        });
        break;

      case 'forest':
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 2100, q: 0.4, gain: 0.14, lfoRate: 0.12, lfoDepth: 0.1 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'lowpass', frequency: 700, gain: 0.2, lfoRate: 0.06, lfoDepth: 0.14 });
        // Birdsong: a short two- or three-note phrase.
        this.eventVoice(layer, 2600, 9000, () => {
          const root = 1900 + Math.random() * 1500;
          const notes = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < notes; i++) {
            window.setTimeout(() => {
              if (!this.ambientStates[layer].enabled) return;
              this.blip(layer, root * (1 + i * 0.12), 0.09, 0.11, 'sine', root * 1.3);
            }, i * 110);
          }
        });
        break;

      case 'waves':
        // Two offset swells give an irregular, non-mechanical surf.
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 480, gain: 0.42, lfoRate: 0.085, lfoDepth: 0.36 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 1500, q: 0.4, gain: 0.14, lfoRate: 0.062, lfoDepth: 0.12 });
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 200, gain: 0.2, lfoRate: 0.041, lfoDepth: 0.16 });
        break;

      case 'crowd':
        // Band-limited noise reads as muffled speech through a wall.
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 520, q: 1.6, gain: 0.3, lfoRate: 0.28, lfoDepth: 0.16 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'bandpass', frequency: 900, q: 2.2, gain: 0.16, lfoRate: 0.42, lfoDepth: 0.12 });
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 260, gain: 0.16 });
        // Tankards and cutlery.
        this.eventVoice(layer, 1800, 6500, () => {
          this.blip(layer, 2400 + Math.random() * 1400, 0.13, 0.1, 'triangle');
        });
        break;

      case 'drums':
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 150, gain: 0.14 });
        // A marching pattern: two beats, then a pause.
        this.eventVoice(layer, 1500, 2600, () => {
          [0, 340, 900].forEach((offset, i) => {
            window.setTimeout(() => {
              if (!this.ambientStates[layer].enabled) return;
              this.blip(layer, i === 2 ? 62 : 78, 0.42, i === 2 ? 0.34 : 0.26, 'sine', 34);
              this.noiseBurst(layer, 180, 0.1, 0.1, 'lowpass');
            }, offset);
          });
        });
        break;

      case 'mystic':
        this.droneVoice(layer, { frequency: 174.6, type: 'sine', gain: 0.1, lfoRate: 0.06, lfoDepth: 0.04 });
        this.droneVoice(layer, { frequency: 261.6, type: 'sine', gain: 0.08, detune: -4, lfoRate: 0.045, lfoDepth: 0.035 });
        this.droneVoice(layer, { frequency: 392.0, type: 'sine', gain: 0.05, detune: 5, lfoRate: 0.033, lfoDepth: 0.03 });
        this.noiseVoice(layer, { noise: 'pink', filter: 'highpass', frequency: 4200, gain: 0.05, lfoRate: 0.08, lfoDepth: 0.04 });
        // Distant struck bells drifting in and out.
        this.eventVoice(layer, 4000, 12000, () => {
          const scale = [523.25, 587.33, 659.25, 783.99, 880.0];
          const freq = scale[Math.floor(Math.random() * scale.length)];
          this.blip(layer, freq, 2.6, 0.075, 'sine');
          this.blip(layer, freq * 2.01, 1.8, 0.03, 'sine');
        });
        break;

      case 'night':
        this.noiseVoice(layer, { noise: 'brown', filter: 'lowpass', frequency: 220, gain: 0.16, lfoRate: 0.035, lfoDepth: 0.08 });
        // Crickets: a fast burst of chirps.
        this.eventVoice(layer, 700, 2600, () => {
          const freq = 4200 + Math.random() * 900;
          const chirps = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < chirps; i++) {
            window.setTimeout(() => {
              if (!this.ambientStates[layer].enabled) return;
              this.blip(layer, freq, 0.022, 0.05, 'square');
            }, i * 62);
          }
        });
        break;
    }
  }

  // ==========================================
  // AMBIENCE CONTROL
  // ==========================================

  private getOrCreateLayerGain(layer: AmbientLayerType): GainNode | null {
    if (!this.ctx || !this.ambienceBus) return null;
    let gain = this.layerGains.get(layer);
    if (!gain) {
      gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.ambienceBus);
      this.layerGains.set(layer, gain);
    }
    return gain;
  }

  private startLayer(layer: AmbientLayerType) {
    this.initCtx();
    if (!this.ctx) return;
    this.stopLayer(layer, true);

    const gain = this.getOrCreateLayerGain(layer);
    if (!gain) return;

    this.ambientStates[layer].enabled = true;
    this.buildLayer(layer);

    // Fade in rather than snapping on.
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setTargetAtTime(this.ambientStates[layer].volume, this.ctx.currentTime, 0.6);
  }

  private stopLayer(layer: AmbientLayerType, immediate = false) {
    this.ambientStates[layer].enabled = false;

    (this.layerCancels.get(layer) || []).forEach((cancel) => cancel());
    this.layerCancels.set(layer, []);

    // Capture this generation's nodes now. Reading the map inside the delayed
    // callback instead would tear down whatever the layer had been restarted
    // with, silencing it while it still reports as enabled.
    const nodes = this.layerNodes.get(layer) || [];
    this.layerNodes.set(layer, []);
    const stopNodes = () => {
      nodes.forEach((stop) => {
        try { stop(); } catch { /* already torn down */ }
      });
    };

    const gain = this.layerGains.get(layer);
    if (gain && this.ctx && !immediate) {
      // Fade out, then release the nodes once silent.
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      window.setTimeout(stopNodes, 900);
    } else {
      if (gain && this.ctx) gain.gain.setValueAtTime(0, this.ctx.currentTime);
      stopNodes();
    }
  }

  /** Turn a single layer on or off, independent of the active scene. */
  public toggleAmbientLayer(type: AmbientLayerType, enabled?: boolean) {
    const next = enabled !== undefined ? enabled : !this.ambientStates[type].enabled;
    if (next) {
      this.startLayer(type);
      this.isAmbiencePlaying = true;
    } else {
      this.stopLayer(type);
      if (!AMBIENT_LAYERS.some((l) => this.ambientStates[l.id].enabled)) {
        this.isAmbiencePlaying = false;
        this.currentScene = null;
      }
    }
    this.notifyListeners();
  }

  public setAmbientVolume(type: AmbientLayerType, volume: number) {
    this.ambientStates[type].volume = Math.max(0, Math.min(1, volume));
    const gain = this.layerGains.get(type);
    if (gain && this.ctx && this.ambientStates[type].enabled) {
      gain.gain.setTargetAtTime(this.ambientStates[type].volume, this.ctx.currentTime, 0.1);
    }
    this.notifyListeners();
  }

  /** Cross-fade the whole soundscape to a named scene. */
  public playScene(scene: AmbienceScene) {
    this.initCtx();
    this.currentScene = scene;

    AMBIENT_LAYERS.forEach(({ id }) => {
      const level = scene.layers[id];
      if (level && level > 0) {
        this.ambientStates[id].volume = level;
        this.startLayer(id);
      } else if (this.ambientStates[id].enabled) {
        this.stopLayer(id);
      }
    });

    this.isAmbiencePlaying = true;
    this.notifyListeners();
  }

  public stopAmbience() {
    AMBIENT_LAYERS.forEach(({ id }) => {
      if (this.ambientStates[id].enabled) this.stopLayer(id);
    });
    this.isAmbiencePlaying = false;
    // Stop ends the soundscape, so drop the scene; pauseMusic keeps it so the
    // same mix can be resumed.
    this.currentScene = null;
    this.notifyListeners();
  }

  /** Pause keeps the scene so it can be resumed with the same mix. */
  public pauseMusic() {
    AMBIENT_LAYERS.forEach(({ id }) => {
      if (this.ambientStates[id].enabled) this.stopLayer(id);
    });
    this.isAmbiencePlaying = false;
    this.notifyListeners();
  }

  public resumeMusic() {
    if (this.currentScene) {
      this.playScene(this.currentScene);
    }
  }

  public isMusicActive(): boolean {
    return this.isAmbiencePlaying;
  }

  // ==========================================
  // INTERFACE SOUND EFFECTS
  // ==========================================


  // Realistic tumbling dice rattle and clatter
  public playDiceRoll() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const clatterCount = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < clatterCount; i++) {
      const timeOffset = (i * 0.045) + Math.random() * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(450 + Math.random() * 650, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(120, now + timeOffset + 0.04);

      gain.gain.setValueAtTime(0.28 * (1 - i / clatterCount), now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.04);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.05);
    }

    setTimeout(() => {
      if (!this.ctx || !this.soundEnabled) return;
      const thudTime = this.ctx.currentTime;
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();

      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(200, thudTime);
      thudOsc.frequency.exponentialRampToValueAtTime(45, thudTime + 0.08);

      thudGain.gain.setValueAtTime(0.35, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.08);

      thudOsc.connect(thudGain);
      thudGain.connect(this.masterCompressor || this.ctx.destination);

      thudOsc.start(thudTime);
      thudOsc.stop(thudTime + 0.09);
    }, 450);
  }

  // Natural 20 critical triumph chime
  public playCriticalSuccess() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.24, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.7);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx!.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.75);
    });
  }

  // Natural 1 critical failure blunder sound
  public playCriticalFumble() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [220, 207.65, 196, 174.61]; // descending dissonance
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx!.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  }

  // Combat strike / sword slash
  public playSwordStrike() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Heal / potion drinking sound
  public playHeal() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.32);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  // Level up / magical power-up chime
  public playLevelUp() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A4, C#5, E5, A5, C#6, E6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.24, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  }

  // Grand adventure embark / victory fanfare
  public playVictory() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.25, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx!.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.85);
    });
  }
}

export const soundEngine = new SoundEngine();
