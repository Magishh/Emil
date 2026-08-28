/**
 * Procedural Web Audio API sound & music synthesizer for D&D dice rolls, combat, and fantasy music.
 * High-fidelity, self-contained without external audio file dependencies.
 */

export interface TrackComposition {
  id?: string;
  title: string;
  genre: string;
  bpm: number;
  scale: number[]; // Frequencies for notes
  bassNotes: number[];
  leadPattern: number[];
  harmonyPattern: number[];
  drumPattern: number[]; // 1: Kick/War drum, 2: Snare/Bodhran, 3: Shaker/Chime, 4: Tambourine/Bell, 0: Rest
  mood: string;
  acousticSpace?: 'tavern' | 'catacomb' | 'cathedral' | 'feywild' | 'openfield';
  instruments: {
    lead: 'lute' | 'flute' | 'violin' | 'brass' | 'harp' | 'organ' | 'celeste' | 'choir' | 'accordion' | 'dulcimer';
    bass: 'drone' | 'lute' | 'brass' | 'synth' | 'organ';
    percussion: 'tavern' | 'wardrum' | 'subtle' | 'none' | 'shaker' | 'combat';
  };
}

export interface SongCreationOptions {
  prompt?: string;
  genre?: string;
  mode?: 'dorian' | 'phrygian' | 'aeolian' | 'lydian' | 'mixolydian' | 'major' | 'pentatonic' | 'hijaz' | 'harmonic_minor';
  bpm?: number;
  leadInstrument?: 'lute' | 'flute' | 'violin' | 'brass' | 'harp' | 'organ' | 'celeste' | 'choir' | 'accordion' | 'dulcimer';
  bassInstrument?: 'drone' | 'lute' | 'brass' | 'synth' | 'organ';
  percussion?: 'tavern' | 'wardrum' | 'subtle' | 'none' | 'shaker' | 'combat';
  acousticSpace?: 'tavern' | 'catacomb' | 'cathedral' | 'feywild' | 'openfield';
  seed?: number | string;
}

export type AmbientLayerType = 'fire' | 'rain' | 'cave' | 'wind' | 'mystic';

export interface AmbientLayerState {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
}

export interface PlaybackState {
  isPlaying: boolean;
  currentComposition: TrackComposition | null;
  currentAudioUrl: string | null;
  volume: number;
  ambientLayers: Record<AmbientLayerType, AmbientLayerState>;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicGainNode: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private currentMusicNodes: { stop: () => void }[] = [];
  private isMusicPlaying = false;
  private musicVolume = 0.65;
  private musicIntervalId: number | null = null;
  private analyser: AnalyserNode | null = null;
  private currentComposition: TrackComposition | null = null;
  private currentAudioUrl: string | null = null;
  private listeners: Set<(state: PlaybackState) => void> = new Set();
  private backgroundAudioElement: HTMLAudioElement | null = null;

  // Atmospheric Ambient Soundscapes
  private ambientGainNodes: Map<AmbientLayerType, GainNode> = new Map();
  private ambientIntervals: Map<AmbientLayerType, number[]> = new Map();
  private ambientActiveNodes: Map<AmbientLayerType, { stop: () => void }[]> = new Map();
  private noiseBuffers: Map<string, AudioBuffer> = new Map();
  private ambientStates: Record<AmbientLayerType, AmbientLayerState> = {
    fire: { enabled: false, volume: 0.5 },
    rain: { enabled: false, volume: 0.5 },
    cave: { enabled: false, volume: 0.4 },
    wind: { enabled: false, volume: 0.4 },
    mystic: { enabled: false, volume: 0.45 },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.backgroundAudioElement = new Audio();
      this.backgroundAudioElement.loop = true;
      this.backgroundAudioElement.volume = this.musicVolume;
      this.backgroundAudioElement.onplay = () => {
        this.isMusicPlaying = true;
        this.notifyListeners();
      };
      this.backgroundAudioElement.onpause = () => {
        if (!this.musicIntervalId) {
          this.isMusicPlaying = false;
        }
        this.notifyListeners();
      };
    }
  }

  public getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isMusicPlaying,
      currentComposition: this.currentComposition,
      currentAudioUrl: this.currentAudioUrl,
      volume: this.musicVolume,
      ambientLayers: { ...this.ambientStates },
    };
  }

  public subscribe(fn: (state: PlaybackState) => void): () => void {
    this.listeners.add(fn);
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

  public getCurrentComposition(): TrackComposition | null {
    return this.currentComposition;
  }

  public getCurrentAudioUrl(): string | null {
    return this.currentAudioUrl;
  }

  public isPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Master Dynamics Compressor to prevent clipping & give professional glue
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        
        this.musicGainNode = this.ctx.createGain();
        this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        
        // Chain: Music Gain -> Master Compressor -> Analyser -> Destination
        this.musicGainNode.connect(this.masterCompressor);
        this.masterCompressor.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public toggleSound(enable?: boolean) {
    if (enable !== undefined) {
      this.soundEnabled = enable;
    } else {
      this.soundEnabled = !this.soundEnabled;
    }

    if (!this.soundEnabled) {
      // Mute immediately
      if (this.musicGainNode && this.ctx) {
        try {
          this.musicGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        } catch {
          // Ignore
        }
      }
      if (this.backgroundAudioElement) {
        this.backgroundAudioElement.muted = true;
      }
      this.ambientGainNodes.forEach((node) => {
        if (this.ctx) {
          try {
            node.gain.setValueAtTime(0, this.ctx.currentTime);
          } catch {}
        }
      });
    } else {
      // Unmute and restore volume
      if (this.musicGainNode && this.ctx) {
        try {
          this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        } catch {
          // Ignore
        }
      }
      if (this.backgroundAudioElement) {
        this.backgroundAudioElement.muted = false;
        this.backgroundAudioElement.volume = this.musicVolume;
      }
      this.ambientGainNodes.forEach((node, type) => {
        if (this.ctx) {
          try {
            node.gain.setValueAtTime(this.ambientStates[type].enabled ? this.ambientStates[type].volume * 0.4 : 0, this.ctx.currentTime);
          } catch {}
        }
      });
    }

    this.notifyListeners();
    return this.soundEnabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGainNode && this.ctx) {
      this.musicGainNode.gain.setValueAtTime(this.soundEnabled ? this.musicVolume : 0, this.ctx.currentTime);
    }
    if (this.backgroundAudioElement) {
      this.backgroundAudioElement.volume = this.musicVolume;
    }
    this.notifyListeners();
  }

  // ==========================================
  // AMBIENT SOUNDSCAPES CONTROLLER
  // ==========================================

  public toggleAmbientLayer(type: AmbientLayerType, enabled?: boolean) {
    this.initCtx();
    const currentState = this.ambientStates[type];
    const newState = enabled !== undefined ? enabled : !currentState.enabled;
    this.ambientStates[type].enabled = newState;

    if (newState) {
      this.startAmbientLoop(type);
    } else {
      this.stopAmbientLoop(type);
    }

    this.notifyListeners();
  }

  public setAmbientVolume(type: AmbientLayerType, volume: number) {
    this.ambientStates[type].volume = Math.max(0, Math.min(1, volume));
    const gainNode = this.ambientGainNodes.get(type);
    if (gainNode && this.ctx && this.soundEnabled) {
      gainNode.gain.setValueAtTime(this.ambientStates[type].enabled ? this.ambientStates[type].volume * 0.4 : 0, this.ctx.currentTime);
    }
    this.notifyListeners();
  }

  private getOrCreateAmbientGain(type: AmbientLayerType): GainNode | null {
    if (!this.ctx) return null;
    let gainNode = this.ambientGainNodes.get(type);
    if (!gainNode) {
      gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(this.ambientStates[type].volume * 0.4, this.ctx.currentTime);
      gainNode.connect(this.masterCompressor || this.ctx.destination);
      this.ambientGainNodes.set(type, gainNode);
    }
    return gainNode;
  }

  private getNoiseBuffer(type: 'pink' | 'brown' | 'white'): AudioBuffer | null {
    if (!this.ctx) return null;
    const key = `${type}_${this.ctx.sampleRate}`;
    if (this.noiseBuffers.has(key)) {
      return this.noiseBuffers.get(key)!;
    }

    const sampleRate = this.ctx.sampleRate;
    const duration = 6.0; // 6 seconds loop
    const frameCount = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, frameCount, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      if (type === 'white') {
        for (let i = 0; i < frameCount; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } else if (type === 'pink') {
        // Paul Kellet's refined 1/f Pink Noise Filter
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < frameCount; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === 'brown') {
        // Brownian / Red noise: Leaky integration of white noise
        let lastOut = 0.0;
        for (let i = 0; i < frameCount; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Gain compensation
        }
      }
    }

    this.noiseBuffers.set(key, buffer);
    return buffer;
  }

  private startAmbientLoop(type: AmbientLayerType) {
    if (!this.ctx) return;
    this.stopAmbientLoop(type);

    const gainNode = this.getOrCreateAmbientGain(type);
    if (!gainNode) return;
    gainNode.gain.setValueAtTime(this.soundEnabled ? this.ambientStates[type].volume * 0.45 : 0, this.ctx.currentTime);

    const activeNodes: { stop: () => void }[] = [];
    const intervalIds: number[] = [];

    if (type === 'fire') {
      // 1. Continuous Hearth Warmth Bed (Filtered Pink/Brown Noise)
      const pinkBuffer = this.getNoiseBuffer('pink');
      if (pinkBuffer) {
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = pinkBuffer;
        noiseSrc.loop = true;

        const lpFilter = this.ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(420, this.ctx.currentTime);

        const bpFilter = this.ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
        bpFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

        const bedGain = this.ctx.createGain();
        bedGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

        noiseSrc.connect(lpFilter);
        lpFilter.connect(bpFilter);
        bpFilter.connect(bedGain);
        bedGain.connect(gainNode);
        noiseSrc.start();
        activeNodes.push({ stop: () => { try { noiseSrc.stop(); noiseSrc.disconnect(); } catch {} } });
      }

      // 2. High-Frequency Sizzle Hiss Bed
      const whiteBuffer = this.getNoiseBuffer('white');
      if (whiteBuffer) {
        const sizzleSrc = this.ctx.createBufferSource();
        sizzleSrc.buffer = whiteBuffer;
        sizzleSrc.loop = true;

        const hpFilter = this.ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);

        const sizzleGain = this.ctx.createGain();
        sizzleGain.gain.setValueAtTime(0.025, this.ctx.currentTime);

        sizzleSrc.connect(hpFilter);
        hpFilter.connect(sizzleGain);
        sizzleGain.connect(gainNode);
        sizzleSrc.start();
        activeNodes.push({ stop: () => { try { sizzleSrc.stop(); sizzleSrc.disconnect(); } catch {} } });
      }

      // 3. Dynamic Micro-Crackles & Snaps Generator (50ms loop)
      const crackleInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.fire.enabled) return;
        const now = this.ctx.currentTime;
        const count = 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < count; i++) {
          const t = now + Math.random() * 0.05;
          const osc = this.ctx.createOscillator();
          const popGain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          // Organic snap frequency
          const freq = 1200 + Math.random() * 2800;
          osc.type = Math.random() > 0.4 ? 'triangle' : 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(150, t + 0.012);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(freq * 0.8, t);
          filter.Q.setValueAtTime(3.0, t);

          const popVol = 0.02 + Math.random() * 0.08;
          popGain.gain.setValueAtTime(popVol, t);
          popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

          osc.connect(filter);
          filter.connect(popGain);
          popGain.connect(gainNode);
          osc.start(t);
          osc.stop(t + 0.018);
        }
      }, 55);
      intervalIds.push(crackleInterval);

      // 4. Occasional Deep Wood Log Pops (300-800ms)
      const logPopInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.fire.enabled) return;
        if (Math.random() < 0.55) {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const popGain = this.ctx.createGain();
          const bp = this.ctx.createBiquadFilter();

          osc.type = 'sine';
          const baseF = 250 + Math.random() * 350;
          osc.frequency.setValueAtTime(baseF, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.04);

          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(baseF, now);
          bp.Q.setValueAtTime(6.0, now);

          popGain.gain.setValueAtTime(0.12, now);
          popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

          osc.connect(bp);
          bp.connect(popGain);
          popGain.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.05);
        }
      }, 450);
      intervalIds.push(logPopInterval);

    } else if (type === 'rain') {
      // 1. Continuous Natural Downpour Wash (Pink Noise Through Multi-Stage Filtering)
      const pinkBuffer = this.getNoiseBuffer('pink');
      if (pinkBuffer) {
        const rainSrc = this.ctx.createBufferSource();
        rainSrc.buffer = pinkBuffer;
        rainSrc.loop = true;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(4500, this.ctx.currentTime);

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1400, this.ctx.currentTime);
        bp.Q.setValueAtTime(0.9, this.ctx.currentTime);

        const rainGain = this.ctx.createGain();
        rainGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

        rainSrc.connect(lp);
        lp.connect(bp);
        bp.connect(rainGain);
        rainGain.connect(gainNode);
        rainSrc.start();
        activeNodes.push({ stop: () => { try { rainSrc.stop(); rainSrc.disconnect(); } catch {} } });
      }

      // 2. Continuous Fine Surface Patter (White Noise High-End)
      const whiteBuffer = this.getNoiseBuffer('white');
      if (whiteBuffer) {
        const patterSrc = this.ctx.createBufferSource();
        patterSrc.buffer = whiteBuffer;
        patterSrc.loop = true;

        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(3200, this.ctx.currentTime);

        const patterGain = this.ctx.createGain();
        patterGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

        patterSrc.connect(hp);
        hp.connect(patterGain);
        patterGain.connect(gainNode);
        patterSrc.start();
        activeNodes.push({ stop: () => { try { patterSrc.stop(); patterSrc.disconnect(); } catch {} } });
      }

      // 3. Discrete Raindrop Impact Synthesizer (Patter on stone & leaves)
      const dropInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.rain.enabled) return;
        const now = this.ctx.currentTime;
        const drops = 2 + Math.floor(Math.random() * 4);

        for (let d = 0; d < drops; d++) {
          const t = now + Math.random() * 0.05;
          const osc = this.ctx.createOscillator();
          const dGain = this.ctx.createGain();

          osc.type = 'sine';
          const startF = 1800 + Math.random() * 1400;
          osc.frequency.setValueAtTime(startF, t);
          osc.frequency.exponentialRampToValueAtTime(700, t + 0.014);

          const dropVol = 0.02 + Math.random() * 0.05;
          dGain.gain.setValueAtTime(dropVol, t);
          dGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

          osc.connect(dGain);
          dGain.connect(gainNode);
          osc.start(t);
          osc.stop(t + 0.02);
        }
      }, 50);
      intervalIds.push(dropInterval);

      // 4. Subtle Distant Thunder Rolling (Every 18s)
      const thunderInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.rain.enabled) return;
        if (Math.random() < 0.45) {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const tGain = this.ctx.createGain();
          const lp = this.ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(55, now);
          osc.frequency.linearRampToValueAtTime(38, now + 3.0);

          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(90, now);
          lp.Q.setValueAtTime(2.0, now);

          tGain.gain.setValueAtTime(0.001, now);
          tGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
          tGain.gain.linearRampToValueAtTime(0.04, now + 2.0);
          tGain.gain.linearRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(lp);
          lp.connect(tGain);
          tGain.connect(gainNode);
          osc.start(now);
          osc.stop(now + 4.0);
        }
      }, 16000);
      intervalIds.push(thunderInterval);

    } else if (type === 'cave') {
      // 1. Deep Cavern Resonance Drone (Subterranean pressure & binaural hum)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55.0, this.ctx.currentTime); // A1

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(82.4, this.ctx.currentTime); // E2

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(140, this.ctx.currentTime);

      droneGain.gain.setValueAtTime(0.16, this.ctx.currentTime);

      osc1.connect(lp);
      osc2.connect(lp);
      lp.connect(droneGain);
      droneGain.connect(gainNode);
      osc1.start();
      osc2.start();
      activeNodes.push({
        stop: () => {
          try {
            osc1.stop(); osc2.stop();
            osc1.disconnect(); osc2.disconnect();
          } catch {}
        }
      });

      // 2. Cavern Air Draft (Filtered Brownian Noise)
      const brownBuffer = this.getNoiseBuffer('brown');
      if (brownBuffer) {
        const airSrc = this.ctx.createBufferSource();
        airSrc.buffer = brownBuffer;
        airSrc.loop = true;

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(260, this.ctx.currentTime);
        bp.Q.setValueAtTime(3.5, this.ctx.currentTime);

        const airGain = this.ctx.createGain();
        airGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

        airSrc.connect(bp);
        bp.connect(airGain);
        airGain.connect(gainNode);
        airSrc.start();
        activeNodes.push({ stop: () => { try { airSrc.stop(); airSrc.disconnect(); } catch {} } });
      }

      // 3. Realistic Water Drops with Stone Cavern Echo Reflections (Scheduled every 900ms)
      const dripInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.cave.enabled) return;
        if (Math.random() < 0.65) {
          const now = this.ctx.currentTime;
          const baseFreq = 950 + Math.random() * 900;
          
          // Initial Primary Drop Impact
          const osc = this.ctx.createOscillator();
          const dGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.025);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.07);

          dGain.gain.setValueAtTime(0.14, now);
          dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

          osc.connect(dGain);
          dGain.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.2);

          // Simulated Cavern Tap Delay #1 (+55ms)
          const echo1Osc = this.ctx.createOscillator();
          const echo1Gain = this.ctx.createGain();
          echo1Osc.type = 'sine';
          echo1Osc.frequency.setValueAtTime(baseFreq * 1.1, now + 0.055);
          echo1Osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.12);
          echo1Gain.gain.setValueAtTime(0.05, now + 0.055);
          echo1Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
          echo1Osc.connect(echo1Gain);
          echo1Gain.connect(gainNode);
          echo1Osc.start(now + 0.055);
          echo1Osc.stop(now + 0.24);

          // Simulated Cavern Tap Delay #2 (+130ms)
          const echo2Osc = this.ctx.createOscillator();
          const echo2Gain = this.ctx.createGain();
          echo2Osc.type = 'sine';
          echo2Osc.frequency.setValueAtTime(baseFreq * 0.95, now + 0.13);
          echo2Osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.24);
          echo2Gain.gain.setValueAtTime(0.02, now + 0.13);
          echo2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          echo2Osc.connect(echo2Gain);
          echo2Gain.connect(gainNode);
          echo2Osc.start(now + 0.13);
          echo2Osc.stop(now + 0.38);
        }
      }, 750);
      intervalIds.push(dripInterval);

    } else if (type === 'wind') {
      // 1. Continuous Organic Mountain Wind Swell (Dual Resonant Sweeping Bandpass)
      const brownBuffer = this.getNoiseBuffer('brown') || this.getNoiseBuffer('pink');
      if (brownBuffer) {
        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = brownBuffer;
        windSrc.loop = true;

        const bp1 = this.ctx.createBiquadFilter();
        bp1.type = 'bandpass';
        bp1.frequency.setValueAtTime(320, this.ctx.currentTime);
        bp1.Q.setValueAtTime(4.0, this.ctx.currentTime);

        const bp2 = this.ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.setValueAtTime(580, this.ctx.currentTime);
        bp2.Q.setValueAtTime(5.0, this.ctx.currentTime);

        const windGain = this.ctx.createGain();
        windGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

        windSrc.connect(bp1);
        windSrc.connect(bp2);
        bp1.connect(windGain);
        bp2.connect(windGain);
        windGain.connect(gainNode);
        windSrc.start();
        activeNodes.push({ stop: () => { try { windSrc.stop(); windSrc.disconnect(); } catch {} } });

        // Gust Sweeper LFO Animation
        const gustInterval = window.setInterval(() => {
          if (!this.ctx || !this.ambientStates.wind.enabled) return;
          const now = this.ctx.currentTime;
          const targetF1 = 180 + Math.random() * 450;
          const targetF2 = 400 + Math.random() * 600;
          const targetGain = 0.16 + Math.random() * 0.22;
          const rampTime = 2.0 + Math.random() * 2.5;

          bp1.frequency.linearRampToValueAtTime(targetF1, now + rampTime);
          bp2.frequency.linearRampToValueAtTime(targetF2, now + rampTime);
          windGain.gain.linearRampToValueAtTime(targetGain, now + rampTime);
        }, 2200);
        intervalIds.push(gustInterval);
      }

      // 2. High-Pitched Mountain Ridge Whistle
      const whistleOsc = this.ctx.createOscillator();
      const whistleGain = this.ctx.createGain();
      const whistleFilter = this.ctx.createBiquadFilter();

      whistleOsc.type = 'sine';
      whistleOsc.frequency.setValueAtTime(1150, this.ctx.currentTime);

      whistleFilter.type = 'bandpass';
      whistleFilter.frequency.setValueAtTime(1150, this.ctx.currentTime);
      whistleFilter.Q.setValueAtTime(14.0, this.ctx.currentTime);

      whistleGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      whistleOsc.connect(whistleFilter);
      whistleFilter.connect(whistleGain);
      whistleGain.connect(gainNode);
      whistleOsc.start();
      activeNodes.push({ stop: () => { try { whistleOsc.stop(); whistleOsc.disconnect(); } catch {} } });

      const whistleInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.wind.enabled) return;
        const now = this.ctx.currentTime;
        const freq = 900 + Math.random() * 600;
        const vol = 0.005 + Math.random() * 0.035;
        whistleOsc.frequency.linearRampToValueAtTime(freq, now + 1.8);
        whistleFilter.frequency.linearRampToValueAtTime(freq, now + 1.8);
        whistleGain.gain.linearRampToValueAtTime(vol, now + 1.8);
      }, 2000);
      intervalIds.push(whistleInterval);

    } else if (type === 'mystic') {
      // 1. Ethereal Pad Chord Drone (Rich Lydian Harmonic Multi-Oscillator)
      const chordFreqs = [293.66, 440.00, 554.37, 659.25, 739.99]; // D4, A4, C#5, E5, F#5 (Dmaj7#11)
      const padGains: GainNode[] = [];

      chordFreqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, this.ctx.currentTime);

        pGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        osc.connect(pGain);
        pGain.connect(gainNode);
        osc.start();
        padGains.push(pGain);
        activeNodes.push({ stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } });
      });

      // 2. Starlight Harmonic Crystal Bells (Pentatonic Sparkles)
      const bellFreqs = [1567.98, 2093.00, 2637.02, 3135.96, 4186.01]; // G6, C7, E7, G7, C8
      const chimeInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientStates.mystic.enabled) return;
        if (Math.random() < 0.7) {
          const now = this.ctx.currentTime;
          const freq = bellFreqs[Math.floor(Math.random() * bellFreqs.length)];
          const osc = this.ctx.createOscillator();
          const cGain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          cGain.gain.setValueAtTime(0.06, now);
          cGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          osc.connect(cGain);
          cGain.connect(gainNode);
          osc.start(now);
          osc.stop(now + 1.25);
        }
      }, 350);
      intervalIds.push(chimeInterval);
    }

    this.ambientActiveNodes.set(type, activeNodes);
    this.ambientIntervals.set(type, intervalIds);
  }

  private stopAmbientLoop(type: AmbientLayerType) {
    const intervals = this.ambientIntervals.get(type);
    if (intervals) {
      intervals.forEach((id) => clearInterval(id));
      this.ambientIntervals.delete(type);
    }
    const nodes = this.ambientActiveNodes.get(type);
    if (nodes) {
      nodes.forEach((n) => {
        try { n.stop(); } catch {}
      });
      this.ambientActiveNodes.delete(type);
    }
  }

  // ==========================================
  // GAMEPLAY SOUND FX
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

  // ==========================================
  // PROCEDURAL FANTASY MUSIC SYNTHESIS ENGINE
  // ==========================================

  public stopProceduralMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.backgroundAudioElement) {
      this.backgroundAudioElement.pause();
    }
    this.currentMusicNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        // ignore
      }
    });
    this.currentMusicNodes = [];
    this.isMusicPlaying = false;
    this.notifyListeners();
  }

  public pauseMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.backgroundAudioElement) {
      this.backgroundAudioElement.pause();
    }
    this.currentMusicNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        // ignore
      }
    });
    this.currentMusicNodes = [];
    this.isMusicPlaying = false;
    this.notifyListeners();
  }

  public resumeMusic() {
    if (this.currentAudioUrl && this.backgroundAudioElement) {
      this.backgroundAudioElement.src = this.currentAudioUrl;
      this.backgroundAudioElement.play().catch(() => {});
      this.isMusicPlaying = true;
      this.notifyListeners();
      return;
    }
    if (this.currentComposition) {
      this.playComposition(this.currentComposition);
    }
  }

  public isMusicActive(): boolean {
    return this.isMusicPlaying;
  }

  // --- Instrument Synthesis Generators ---

  private playPluckedLute(freq: number, time: number, duration = 0.6) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(320, time + duration);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playHarpNote(freq: number, time: number, duration = 0.9) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.001, time);

    gain.gain.setValueAtTime(0.26, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playFluteNote(freq: number, time: number, duration = 0.8) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    // Gentle natural vibrato
    lfo.frequency.setValueAtTime(5.4, time);
    lfoGain.gain.setValueAtTime(freq * 0.02, time);
    lfo.connect(osc.frequency);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Breath attack and release
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGainNode);

    lfo.start(time);
    osc.start(time);
    lfo.stop(time + duration);
    osc.stop(time + duration);
    this.currentMusicNodes.push(osc, lfo);
  }

  private playViolinNote(freq: number, time: number, duration = 1.0) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, time);
    filter.Q.setValueAtTime(0.8, time);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc.start(time);
    osc.stop(time + duration);
    this.currentMusicNodes.push(osc);
  }

  private playBrassNote(freq: number, time: number, duration = 0.9) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.linearRampToValueAtTime(2400, time + 0.1);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playOrganNote(freq: number, time: number, duration = 1.1) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 3, time);

    gain.gain.setValueAtTime(0.02, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    osc3.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2, osc3);
  }

  private playCelesteNote(freq: number, time: number, duration = 0.8) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3.01, time); // Bell inharmonic partial

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playChoirNote(freq: number, time: number, duration = 1.2) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const formant1 = this.ctx.createBiquadFilter();
    const formant2 = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(800, time); // "Ah" vowel formant
    formant1.Q.setValueAtTime(3.0, time);

    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1200, time);
    formant2.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(formant1);
    osc2.connect(formant2);
    formant1.connect(gain);
    formant2.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playAccordionNote(freq: number, time: number, duration = 0.7) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.008, time); // Musette detune

    gain.gain.setValueAtTime(0.02, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playDulcimerNote(freq: number, time: number, duration = 0.8) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(250, time);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc.start(time);
    osc.stop(time + duration);
    this.currentMusicNodes.push(osc);
  }

  private playSubDrone(freq: number, time: number, duration = 2.0) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.005, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    this.currentMusicNodes.push(osc1, osc2);
  }

  private playPercussion(type: 'drum' | 'snare' | 'chime' | 'shaker' | 'bell', time: number) {
    if (!this.ctx || !this.musicGainNode) return;

    if (type === 'drum') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      osc.start(time);
      osc.stop(time + 0.22);
      this.currentMusicNodes.push(osc);
    } else if (type === 'snare') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(290, time);
      osc.frequency.exponentialRampToValueAtTime(75, time + 0.08);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      osc.start(time);
      osc.stop(time + 0.12);
      this.currentMusicNodes.push(osc);
    } else if (type === 'chime') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, time);
      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      osc.start(time);
      osc.stop(time + 0.5);
      this.currentMusicNodes.push(osc);
    } else if (type === 'shaker') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, time);
      gain.gain.setValueAtTime(0.07, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      osc.start(time);
      osc.stop(time + 0.06);
      this.currentMusicNodes.push(osc);
    } else if (type === 'bell') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1760, time);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2640, time);
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.musicGainNode);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.65);
      osc2.stop(time + 0.65);
      this.currentMusicNodes.push(osc1, osc2);
    }
  }

  // Play a full procedural composition in continuous loop
  public playComposition(comp: TrackComposition, audioUrl?: string) {
    this.stopProceduralMusic();
    this.initCtx();

    this.currentComposition = comp;
    this.currentAudioUrl = audioUrl || null;
    this.isMusicPlaying = true;
    this.notifyListeners();

    if (audioUrl && this.backgroundAudioElement) {
      this.backgroundAudioElement.src = audioUrl;
      this.backgroundAudioElement.play().catch(() => {});
      return;
    }

    if (!this.ctx || !this.musicGainNode) return;

    const stepDuration = 60 / comp.bpm / 2; // Eighth note duration
    let step = 0;
    const totalSteps = comp.leadPattern.length;

    const scheduleLoop = () => {
      if (!this.ctx || !this.isMusicPlaying) return;
      const now = this.ctx.currentTime;

      for (let i = 0; i < 8; i++) {
        const currentStep = (step + i) % totalSteps;
        const noteTime = now + (i * stepDuration);

        // Lead melody
        const noteIdx = comp.leadPattern[currentStep];
        if (noteIdx >= 0 && noteIdx < comp.scale.length) {
          const freq = comp.scale[noteIdx];
          if (comp.instruments.lead === 'lute') {
            this.playPluckedLute(freq, noteTime, stepDuration * 1.8);
          } else if (comp.instruments.lead === 'harp') {
            this.playHarpNote(freq, noteTime, stepDuration * 1.8);
          } else if (comp.instruments.lead === 'flute') {
            this.playFluteNote(freq, noteTime, stepDuration * 1.5);
          } else if (comp.instruments.lead === 'violin') {
            this.playViolinNote(freq, noteTime, stepDuration * 1.6);
          } else if (comp.instruments.lead === 'brass') {
            this.playBrassNote(freq, noteTime, stepDuration * 1.4);
          } else if (comp.instruments.lead === 'organ') {
            this.playOrganNote(freq, noteTime, stepDuration * 1.5);
          } else if (comp.instruments.lead === 'celeste') {
            this.playCelesteNote(freq, noteTime, stepDuration * 1.2);
          } else if (comp.instruments.lead === 'choir') {
            this.playChoirNote(freq, noteTime, stepDuration * 1.8);
          } else if (comp.instruments.lead === 'accordion') {
            this.playAccordionNote(freq, noteTime, stepDuration * 1.4);
          } else if (comp.instruments.lead === 'dulcimer') {
            this.playDulcimerNote(freq, noteTime, stepDuration * 1.4);
          }
        }

        // Bass accompaniment
        if (currentStep % 4 === 0) {
          const bassIdx = Math.floor(currentStep / 4) % comp.bassNotes.length;
          const bassFreq = comp.bassNotes[bassIdx];
          if (comp.instruments.bass === 'drone') {
            this.playSubDrone(bassFreq, noteTime, stepDuration * 3.8);
          } else if (comp.instruments.bass === 'lute') {
            this.playPluckedLute(bassFreq, noteTime, stepDuration * 2);
          } else if (comp.instruments.bass === 'organ') {
            this.playOrganNote(bassFreq, noteTime, stepDuration * 3);
          } else {
            this.playBrassNote(bassFreq, noteTime, stepDuration * 2.5);
          }
        }

        // Harmony chords
        if (currentStep % 2 === 0 && comp.harmonyPattern.length > 0) {
          const harmIdx = comp.harmonyPattern[currentStep % comp.harmonyPattern.length];
          if (harmIdx >= 0 && harmIdx < comp.scale.length) {
            const freq = comp.scale[harmIdx];
            this.playPluckedLute(freq, noteTime, stepDuration * 1.2);
          }
        }

        // Percussion
        if (comp.instruments.percussion !== 'none' && comp.drumPattern.length > 0) {
          const drumType = comp.drumPattern[currentStep % comp.drumPattern.length];
          if (drumType === 1) this.playPercussion('drum', noteTime);
          else if (drumType === 2) this.playPercussion('snare', noteTime);
          else if (drumType === 3) this.playPercussion('chime', noteTime);
          else if (drumType === 4) this.playPercussion('shaker', noteTime);
          else if (drumType === 5) this.playPercussion('bell', noteTime);
        }
      }

      step = (step + 8) % totalSteps;
    };

    scheduleLoop();
    this.musicIntervalId = window.setInterval(scheduleLoop, stepDuration * 8 * 1000 * 0.9);
  }

  // Synthesize and encode full 44.1kHz Stereo WAV audio data URL from composition
  public generateWavDataUrl(comp: TrackComposition, seconds = 24): string {
    const sampleRate = 44100;
    const numSamples = sampleRate * seconds;
    const leftBuffer = new Float32Array(numSamples);
    const rightBuffer = new Float32Array(numSamples);

    const stepDuration = 60 / comp.bpm / 2;
    const totalSteps = comp.leadPattern.length;

    for (let s = 0; s < totalSteps * 6; s++) {
      const stepIdx = s % totalSteps;
      const startTime = s * stepDuration;
      if (startTime >= seconds) break;

      const startSample = Math.floor(startTime * sampleRate);

      // Lead note (Panned slightly left)
      const noteIdx = comp.leadPattern[stepIdx];
      if (noteIdx >= 0 && noteIdx < comp.scale.length) {
        const freq = comp.scale[noteIdx];
        const noteDurationSamples = Math.floor(stepDuration * 1.6 * sampleRate);
        for (let i = 0; i < noteDurationSamples && startSample + i < numSamples; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * (comp.instruments.lead === 'flute' || comp.instruments.lead === 'choir' ? 2.5 : comp.instruments.lead === 'organ' ? 2 : 4.5));
          let wave = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t);
          if (comp.instruments.lead === 'organ' || comp.instruments.lead === 'brass') {
            wave += 0.25 * Math.sin(6 * Math.PI * freq * t);
          }
          const amp = wave * env * 0.24;
          leftBuffer[startSample + i] += amp * 0.65;
          rightBuffer[startSample + i] += amp * 0.45;
        }
      }

      // Bass note (Centered)
      if (stepIdx % 4 === 0) {
        const bassIdx = Math.floor(stepIdx / 4) % comp.bassNotes.length;
        const bassFreq = comp.bassNotes[bassIdx];
        const bassDur = Math.floor(stepDuration * 3.8 * sampleRate);
        for (let i = 0; i < bassDur && startSample + i < numSamples; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 1.2);
          const wave = Math.sin(2 * Math.PI * bassFreq * t) + 0.45 * Math.sin(2 * Math.PI * (bassFreq * 1.008) * t);
          const amp = wave * env * 0.28;
          leftBuffer[startSample + i] += amp * 0.55;
          rightBuffer[startSample + i] += amp * 0.55;
        }
      }

      // Harmony note (Panned slightly right)
      if (stepIdx % 2 === 0 && comp.harmonyPattern.length > 0) {
        const harmIdx = comp.harmonyPattern[stepIdx % comp.harmonyPattern.length];
        if (harmIdx >= 0 && harmIdx < comp.scale.length) {
          const freq = comp.scale[harmIdx];
          const harmDur = Math.floor(stepDuration * 1.2 * sampleRate);
          for (let i = 0; i < harmDur && startSample + i < numSamples; i++) {
            const t = i / sampleRate;
            const env = Math.exp(-t * 5.0);
            const wave = Math.sin(2 * Math.PI * freq * t);
            const amp = wave * env * 0.16;
            leftBuffer[startSample + i] += amp * 0.35;
            rightBuffer[startSample + i] += amp * 0.65;
          }
        }
      }

      // Drums & Percussion
      if (comp.instruments.percussion !== 'none' && comp.drumPattern.length > 0) {
        const dType = comp.drumPattern[stepIdx % comp.drumPattern.length];
        if (dType === 1) {
          // Bass drum (Center)
          for (let i = 0; i < sampleRate * 0.18 && startSample + i < numSamples; i++) {
            const t = i / sampleRate;
            const f = 130 * Math.exp(-t * 22);
            const env = Math.exp(-t * 14);
            const amp = Math.sin(2 * Math.PI * f * t) * env * 0.38;
            leftBuffer[startSample + i] += amp;
            rightBuffer[startSample + i] += amp;
          }
        } else if (dType === 2) {
          // Snare / wood tap (Panned right)
          for (let i = 0; i < sampleRate * 0.09 && startSample + i < numSamples; i++) {
            const t = i / sampleRate;
            const env = Math.exp(-t * 28);
            const noise = (Math.random() * 2 - 1) * 0.5 + Math.sin(2 * Math.PI * 260 * t) * 0.5;
            const amp = noise * env * 0.25;
            leftBuffer[startSample + i] += amp * 0.4;
            rightBuffer[startSample + i] += amp * 0.7;
          }
        } else if (dType === 3 || dType === 4 || dType === 5) {
          // Chime / shaker (Panned left)
          for (let i = 0; i < sampleRate * 0.25 && startSample + i < numSamples; i++) {
            const t = i / sampleRate;
            const amp = Math.sin(2 * Math.PI * 1480 * t) * Math.exp(-t * 10) * 0.12;
            leftBuffer[startSample + i] += amp * 0.7;
            rightBuffer[startSample + i] += amp * 0.3;
          }
        }
      }
    }

    // Convert stereo Float32Array to 16-bit Stereo PCM WAV Blob
    const wavBytes = encodeStereoWav(leftBuffer, rightBuffer, sampleRate);
    let binary = '';
    const bytes = new Uint8Array(wavBytes);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
}

// 16-bit Stereo WAV PCM encoder
function encodeStereoWav(left: Float32Array, right: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 2;
  const numSamples = left.length;
  const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const soundEngine = new SoundEngine();

// ==========================================
// PRESET FANTASY COMPOSITIONS (12 Distinct Soundtracks)
// ==========================================
export const FANTASY_COMPOSITIONS: Record<string, TrackComposition> = {
  tavern: {
    id: 'tavern',
    title: "Tavern Hearth & Bard's Jig",
    genre: 'Celtic Fantasy Folk',
    bpm: 116,
    scale: [293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25],
    bassNotes: [146.83, 174.61, 196.00, 220.00],
    leadPattern: [
      0, 2, 4, 3, 2, 0, 4, 7,
      6, 4, 2, 4, 3, 2, 0, -1,
      4, 6, 7, 6, 4, 2, 4, 3,
      2, 0, 2, 4, 0, -1, 0, 0
    ],
    harmonyPattern: [2, 4, 3, 4, 2, 4, 0, 2],
    drumPattern: [1, 3, 2, 3, 1, 3, 2, 3],
    mood: 'Warm, spirited, lively inn ambiance with lute and bodhran',
    acousticSpace: 'tavern',
    instruments: { lead: 'lute', bass: 'lute', percussion: 'tavern' }
  },

  dungeon: {
    id: 'dungeon',
    title: 'Dungeon Catacombs & Dark Depths',
    genre: 'Dark Ambient Dungeon Crawler',
    bpm: 72,
    scale: [146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66],
    bassNotes: [73.42, 77.78, 87.31, 110.00],
    leadPattern: [
      0, -1, 1, -1, 0, -1, 4, -1,
      3, -1, 1, -1, 0, 1, 0, -1,
      5, -1, 4, -1, 1, -1, 0, -1,
      -1, 1, 0, -1, 4, -1, 0, -1
    ],
    harmonyPattern: [0, -1, 1, -1, 4, -1, 0, -1],
    drumPattern: [1, 0, 0, 3, 0, 0, 2, 0],
    mood: 'Eerie echoes, creeping darkness, distant chains and tension',
    acousticSpace: 'catacomb',
    instruments: { lead: 'flute', bass: 'drone', percussion: 'subtle' }
  },

  boss: {
    id: 'boss',
    title: 'Dragon Boss Battle & War March',
    genre: 'Epic Orchestral War Theme',
    bpm: 132,
    scale: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 293.66, 311.13, 392.00],
    bassNotes: [65.41, 77.78, 87.31, 98.00],
    leadPattern: [
      7, 7, 9, 7, 6, 7, 4, 7,
      3, 4, 6, 4, 3, 2, 0, 7,
      10, 9, 7, 6, 7, 9, 10, 9,
      7, 6, 4, 3, 2, 0, 7, 7
    ],
    harmonyPattern: [0, 2, 4, 2, 0, 4, 6, 4],
    drumPattern: [1, 2, 1, 2, 1, 1, 2, 2],
    mood: 'High-stakes battle, thundering war drums, and soaring brass',
    acousticSpace: 'openfield',
    instruments: { lead: 'brass', bass: 'brass', percussion: 'wardrum' }
  },

  elven: {
    id: 'elven',
    title: 'Mystic Elven Grove & Feywild',
    genre: 'Ethereal Fantasy Ambient',
    bpm: 88,
    scale: [329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00],
    bassNotes: [164.81, 196.00, 220.00, 246.94],
    leadPattern: [
      0, 1, 2, 3, 5, 4, 3, 2,
      1, 2, 4, 5, 7, 5, 4, 3,
      2, 3, 5, 4, 2, 1, 0, 1,
      2, 4, 3, 2, 1, 0, -1, 0
    ],
    harmonyPattern: [0, 2, 4, 3, 1, 3, 5, 4],
    drumPattern: [0, 3, 0, 3, 0, 3, 1, 3],
    mood: 'Tranquil whispering trees, mystical glowing runes, starlit canopy',
    acousticSpace: 'feywild',
    instruments: { lead: 'harp', bass: 'drone', percussion: 'subtle' }
  },

  highroad: {
    id: 'highroad',
    title: "High Road March & Hero's Fanfare",
    genre: 'Heroic Adventure March',
    bpm: 110,
    scale: [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 587.33],
    bassNotes: [98.00, 123.47, 130.81, 146.83],
    leadPattern: [
      0, 2, 4, 7, 7, 8, 7, 4,
      5, 7, 8, 9, 10, 9, 7, 4,
      7, 8, 9, 7, 5, 4, 2, 4,
      5, 4, 2, 0, 4, 7, 0, -1
    ],
    harmonyPattern: [0, 4, 7, 4, 2, 5, 7, 5],
    drumPattern: [1, 2, 1, 2, 1, 3, 2, 3],
    mood: 'Open horizon, waving banners, inspiring journey into the unknown',
    acousticSpace: 'openfield',
    instruments: { lead: 'violin', bass: 'brass', percussion: 'wardrum' }
  },

  gothic: {
    id: 'gothic',
    title: 'Gothic Vampire Crypt & Pipe Organ',
    genre: 'Baroque Gothic Horror',
    bpm: 78,
    scale: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 246.94, 261.63, 293.66],
    bassNotes: [65.41, 77.78, 87.31, 98.00],
    leadPattern: [
      7, -1, 6, -1, 7, 6, 4, 2,
      0, -1, 2, 4, 6, 7, 6, -1,
      4, 2, 0, 2, 4, 6, 7, 8,
      7, 6, 4, 2, 0, -1, 0, -1
    ],
    harmonyPattern: [0, 2, 4, 6, 7, 6, 4, 2],
    drumPattern: [1, 0, 2, 0, 1, 0, 2, 0],
    mood: 'Majestic cathedral organ, shadows creeping along stone colonnades',
    acousticSpace: 'cathedral',
    instruments: { lead: 'organ', bass: 'organ', percussion: 'subtle' }
  },

  desert: {
    id: 'desert',
    title: 'Desert Caravanserai & Sun Temple',
    genre: 'Exotic Hijaz Sands',
    bpm: 104,
    scale: [220.00, 233.08, 277.18, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16],
    bassNotes: [110.00, 146.83, 164.81, 220.00],
    leadPattern: [
      0, 1, 2, 3, 2, 1, 0, 1,
      2, 3, 4, 5, 4, 3, 2, 1,
      0, 2, 1, 0, 3, 2, 1, 0,
      1, 2, 3, 2, 1, 0, -1, 0
    ],
    harmonyPattern: [0, 2, 3, 2, 0, 1, 2, 1],
    drumPattern: [1, 4, 2, 4, 1, 4, 2, 4],
    mood: 'Dune winds, exotic oud scales, shimmering heat haze, and ancient sands',
    acousticSpace: 'openfield',
    instruments: { lead: 'lute', bass: 'lute', percussion: 'shaker' }
  },

  ice_spire: {
    id: 'ice_spire',
    title: 'Frozen Glacial Caverns & Ice Spire',
    genre: 'Crystalline Winter Fantasy',
    bpm: 82,
    scale: [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51],
    bassNotes: [130.81, 164.81, 196.00, 261.63],
    leadPattern: [
      0, 2, 4, 5, 4, 2, 0, -1,
      3, 5, 7, 5, 3, 1, 0, -1,
      4, 2, 0, 2, 4, 5, 7, 6,
      5, 4, 2, 1, 0, -1, 0, 0
    ],
    harmonyPattern: [0, 4, 5, 4, 2, 4, 0, 2],
    drumPattern: [0, 3, 0, 3, 1, 3, 0, 3],
    mood: 'Glistening icicles, piercing frozen winds, and delicate crystal chimes',
    acousticSpace: 'catacomb',
    instruments: { lead: 'celeste', bass: 'drone', percussion: 'subtle' }
  },

  arcane_choir: {
    id: 'arcane_choir',
    title: 'Arcane Sanctum & Astral Hymn',
    genre: 'Choral Ethereal Mystery',
    bpm: 68,
    scale: [174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00],
    bassNotes: [87.31, 98.00, 110.00, 130.81],
    leadPattern: [
      0, 1, 2, -1, 3, 2, 1, 0,
      4, 3, 2, 1, 2, 3, 4, -1,
      5, 4, 3, 2, 1, 0, 1, 2,
      3, 2, 1, 0, -1, 0, -1, 0
    ],
    harmonyPattern: [0, 2, 3, 2, 0, 2, 4, 2],
    drumPattern: [1, 0, 0, 3, 0, 0, 3, 0],
    mood: 'Vocal chants, glowing arcane leylines, celestial knowledge and awe',
    acousticSpace: 'cathedral',
    instruments: { lead: 'choir', bass: 'drone', percussion: 'subtle' }
  },

  court_dance: {
    id: 'court_dance',
    title: 'Royal Castle Banquet & Court Dance',
    genre: 'Renaissance Court Strings',
    bpm: 122,
    scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
    bassNotes: [130.81, 164.81, 174.61, 196.00],
    leadPattern: [
      0, 2, 4, 5, 4, 2, 0, 2,
      4, 7, 6, 5, 4, 2, 0, -1,
      7, 6, 5, 4, 5, 6, 7, 5,
      4, 2, 0, 2, 4, 0, -1, 0
    ],
    harmonyPattern: [2, 4, 5, 4, 2, 0, 4, 2],
    drumPattern: [1, 3, 2, 3, 1, 3, 2, 3],
    mood: 'Nobility dance, fine silk banners, shimmering chandeliers and banquet feasts',
    acousticSpace: 'tavern',
    instruments: { lead: 'violin', bass: 'lute', percussion: 'tavern' }
  },

  stealth_heist: {
    id: 'stealth_heist',
    title: 'Shadow Rogue Stealth & Midnight Heist',
    genre: 'Tense Rogue Stealth',
    bpm: 96,
    scale: [146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66],
    bassNotes: [73.42, 87.31, 110.00, 130.81],
    leadPattern: [
      0, -1, 2, -1, 3, 2, 0, -1,
      -1, 1, 0, -1, 4, 3, 2, 0,
      2, 3, 5, 4, 3, 2, 0, -1,
      -1, 0, 2, 0, -1, 0, -1, 0
    ],
    harmonyPattern: [0, -1, 2, -1, 3, -1, 0, -1],
    drumPattern: [1, 0, 3, 0, 2, 0, 3, 4],
    mood: 'Tiptoeing across moonlit rooftops, lockpicks turning, guarded patrol footsteps',
    acousticSpace: 'catacomb',
    instruments: { lead: 'dulcimer', bass: 'drone', percussion: 'subtle' }
  },

  campfire_skald: {
    id: 'campfire_skald',
    title: 'Starlight Campfire & Wandering Skald',
    genre: 'Acoustic Bard Ballad',
    bpm: 86,
    scale: [220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30, 440.00],
    bassNotes: [110.00, 146.83, 164.81, 220.00],
    leadPattern: [
      0, 2, 4, 3, 2, 0, 1, 2,
      4, 5, 7, 5, 4, 2, 0, -1,
      2, 4, 5, 4, 2, 0, 2, 4,
      3, 2, 0, 1, 0, -1, 0, 0
    ],
    harmonyPattern: [0, 2, 4, 2, 0, 2, 4, 2],
    drumPattern: [0, 3, 0, 3, 0, 3, 0, 3],
    mood: 'Crackling fire, quiet night sky, memories of lost companions and heroic tales',
    acousticSpace: 'openfield',
    instruments: { lead: 'accordion', bass: 'lute', percussion: 'subtle' }
  }
};

// Mode note intervals (semitones above root)
const MODE_SEMITONES: Record<string, number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19],
  major: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19],
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],
  hijaz: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 19, 20]
};

// Root notes in Hz
const ROOT_NOTES = [
  { note: 'D3', freq: 146.83 },
  { note: 'E3', freq: 164.81 },
  { note: 'F3', freq: 174.61 },
  { note: 'G3', freq: 196.00 },
  { note: 'A3', freq: 220.00 },
  { note: 'B3', freq: 246.94 },
  { note: 'C4', freq: 261.63 },
  { note: 'D4', freq: 293.66 }
];

function semitoneToFreq(rootFreq: number, semitones: number): number {
  return rootFreq * Math.pow(2, semitones / 12);
}

// Pseudo-random seedable generator
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Procedural Song Generator: Creates unique musical compositions dynamically from prompt or options!
 */
export function createProceduralSong(options: SongCreationOptions = {}): TrackComposition {
  const p = (options.prompt || '').toLowerCase();
  
  // Calculate numerical seed from text prompt or timestamp
  let seedNum = typeof options.seed === 'number' ? options.seed : 0;
  if (!seedNum) {
    if (options.prompt) {
      for (let i = 0; i < options.prompt.length; i++) {
        seedNum = (seedNum * 31 + options.prompt.charCodeAt(i)) & 0xffffffff;
      }
    } else {
      seedNum = Math.floor(Math.random() * 1000000);
    }
  }
  const rng = createRng(Math.abs(seedNum) + 100);

  // Auto-detect or select musical mode
  let mode: SongCreationOptions['mode'] = options.mode;
  if (!mode) {
    if (p.includes('dungeon') || p.includes('crypt') || p.includes('undead') || p.includes('dark') || p.includes('necromancer') || p.includes('shadow')) {
      mode = rng() > 0.5 ? 'phrygian' : 'harmonic_minor';
    } else if (p.includes('battle') || p.includes('boss') || p.includes('war') || p.includes('dragon') || p.includes('combat')) {
      mode = rng() > 0.5 ? 'harmonic_minor' : 'aeolian';
    } else if (p.includes('desert') || p.includes('pyramid') || p.includes('sand') || p.includes('oasis') || p.includes('caravan')) {
      mode = 'hijaz';
    } else if (p.includes('elf') || p.includes('fey') || p.includes('forest') || p.includes('celestial') || p.includes('magic')) {
      mode = rng() > 0.5 ? 'pentatonic' : 'lydian';
    } else if (p.includes('tavern') || p.includes('inn') || p.includes('jig') || p.includes('bard') || p.includes('sea') || p.includes('pirate')) {
      mode = 'dorian';
    } else if (p.includes('cathedral') || p.includes('temple') || p.includes('holy') || p.includes('paladin') || p.includes('hymn')) {
      mode = 'major';
    } else {
      const modeKeys: NonNullable<SongCreationOptions['mode']>[] = ['dorian', 'aeolian', 'lydian', 'pentatonic', 'mixolydian', 'harmonic_minor'];
      mode = modeKeys[Math.floor(rng() * modeKeys.length)];
    }
  }

  // Pick root note
  const rootObj = ROOT_NOTES[Math.floor(rng() * ROOT_NOTES.length)];
  const semitones = MODE_SEMITONES[mode] || MODE_SEMITONES.dorian;
  const scale = semitones.map((st) => Math.round(semitoneToFreq(rootObj.freq, st) * 100) / 100);

  // Bass roots: Root, 4th, 5th, 6th/7th below
  const bassNotes = [
    Math.round(rootObj.freq * 0.5 * 100) / 100,
    Math.round(semitoneToFreq(rootObj.freq * 0.5, semitones[2] || 3) * 100) / 100,
    Math.round(semitoneToFreq(rootObj.freq * 0.5, semitones[3] || 5) * 100) / 100,
    Math.round(semitoneToFreq(rootObj.freq * 0.5, semitones[4] || 7) * 100) / 100,
  ];

  // Lead Instrument Selection
  let leadInstrument = options.leadInstrument;
  if (!leadInstrument) {
    if (p.includes('lute') || p.includes('guitar') || p.includes('tavern')) leadInstrument = 'lute';
    else if (p.includes('flute') || p.includes('wind') || p.includes('forest')) leadInstrument = 'flute';
    else if (p.includes('violin') || p.includes('fiddle') || p.includes('string')) leadInstrument = 'violin';
    else if (p.includes('brass') || p.includes('horn') || p.includes('battle') || p.includes('march')) leadInstrument = 'brass';
    else if (p.includes('harp') || p.includes('angel') || p.includes('fey') || p.includes('dream')) leadInstrument = 'harp';
    else if (p.includes('organ') || p.includes('church') || p.includes('cathedral') || p.includes('gothic')) leadInstrument = 'organ';
    else if (p.includes('bell') || p.includes('chime') || p.includes('celeste') || p.includes('crystal')) leadInstrument = 'celeste';
    else if (p.includes('choir') || p.includes('vocal') || p.includes('hymn') || p.includes('chant')) leadInstrument = 'choir';
    else if (p.includes('accordion') || p.includes('squeeze') || p.includes('folk')) leadInstrument = 'accordion';
    else if (p.includes('dulcimer') || p.includes('stealth') || p.includes('rogue')) leadInstrument = 'dulcimer';
    else {
      const insts: SongCreationOptions['leadInstrument'][] = ['lute', 'flute', 'violin', 'harp', 'brass', 'organ', 'celeste', 'choir', 'accordion', 'dulcimer'];
      leadInstrument = insts[Math.floor(rng() * insts.length)] || 'lute';
    }
  }

  // Bass Instrument Selection
  let bassInstrument = options.bassInstrument;
  if (!bassInstrument) {
    if (leadInstrument === 'organ') bassInstrument = 'organ';
    else if (leadInstrument === 'brass') bassInstrument = 'brass';
    else if (leadInstrument === 'flute' || leadInstrument === 'harp' || leadInstrument === 'choir') bassInstrument = 'drone';
    else if (leadInstrument === 'lute' || leadInstrument === 'accordion') bassInstrument = 'lute';
    else bassInstrument = 'drone';
  }

  // Percussion Selection
  let percussion = options.percussion;
  if (!percussion) {
    if (p.includes('battle') || p.includes('boss') || p.includes('war')) percussion = 'wardrum';
    else if (p.includes('tavern') || p.includes('inn') || p.includes('jig')) percussion = 'tavern';
    else if (p.includes('quiet') || p.includes('ambient') || p.includes('stealth')) percussion = 'subtle';
    else if (p.includes('peace') || p.includes('sleep') || p.includes('meditation')) percussion = 'none';
    else {
      const percs: SongCreationOptions['percussion'][] = ['tavern', 'wardrum', 'subtle', 'shaker'];
      percussion = percs[Math.floor(rng() * percs.length)] || 'tavern';
    }
  }

  // BPM calculation
  let bpm = options.bpm;
  if (!bpm) {
    if (percussion === 'wardrum') bpm = Math.floor(124 + rng() * 20);
    else if (percussion === 'tavern') bpm = Math.floor(110 + rng() * 16);
    else if (mode === 'phrygian' || mode === 'harmonic_minor') bpm = Math.floor(70 + rng() * 16);
    else if (leadInstrument === 'harp' || leadInstrument === 'flute' || leadInstrument === 'choir') bpm = Math.floor(74 + rng() * 16);
    else bpm = Math.floor(94 + rng() * 22);
  }

  // 32-step Melodic Contour Generation
  const patternLen = 32;
  const leadPattern: number[] = [];
  const harmonyPattern: number[] = [];
  let currentNote = Math.floor(rng() * 3);

  for (let i = 0; i < patternLen; i++) {
    const isRest = rng() < (percussion === 'wardrum' ? 0.08 : 0.18);
    if (isRest && i % 4 !== 0) {
      leadPattern.push(-1);
    } else {
      // Step movement or arpeggio skip
      const stepType = rng();
      if (stepType < 0.45) {
        // Stepwise motion (+1 / -1)
        currentNote += rng() > 0.5 ? 1 : -1;
      } else if (stepType < 0.75) {
        // 3rd or 4th leap
        currentNote += rng() > 0.5 ? 2 : -2;
      } else if (stepType < 0.9) {
        // Arpeggio octave jump
        currentNote = (currentNote + 4) % scale.length;
      } else {
        // Return to tonic
        currentNote = 0;
      }

      // Constrain within scale boundaries
      if (currentNote < 0) currentNote = 0;
      if (currentNote >= scale.length) currentNote = scale.length - 1;

      leadPattern.push(currentNote);
    }

    // Harmony (thirds or fifths above)
    const harmNote = (leadPattern[i] >= 0) ? (leadPattern[i] + 2) % scale.length : -1;
    harmonyPattern.push(harmNote);
  }

  // Drum Pattern
  let drumPattern: number[] = [];
  if (percussion === 'wardrum') {
    drumPattern = [1, 2, 1, 2, 1, 1, 2, 2, 1, 2, 1, 2, 1, 3, 2, 3];
  } else if (percussion === 'tavern') {
    drumPattern = [1, 3, 2, 3, 1, 3, 2, 3, 1, 3, 2, 3, 1, 2, 2, 3];
  } else if (percussion === 'shaker') {
    drumPattern = [4, 4, 4, 4, 4, 4, 4, 4];
  } else if (percussion === 'subtle') {
    drumPattern = [1, 0, 3, 0, 2, 0, 3, 0];
  } else {
    drumPattern = [];
  }

  // Title and Genre generation
  const adjectives = ['Enchanted', 'Shadow', 'Whispering', 'Ancient', 'Golden', 'Fey', 'Starlit', 'Obsidian', 'Iron', 'Crimson', 'Mystic', 'Wandering'];
  const nouns = ['Ballad', 'Symphony', 'Nocturne', 'Anthem', 'Echoes', 'Canticle', 'March', 'Reverie', 'Chant', 'Prelude', 'Fable', 'Ode'];
  const places = ['of the Moonlit Vale', 'of the High Spire', 'of Kazal-Dûr', 'of the Deep Caverns', 'of the Sacred Grove', 'of the Wandering Skald', 'of the Fallen Citadel'];

  const randAdj = adjectives[Math.floor(rng() * adjectives.length)];
  const randNoun = nouns[Math.floor(rng() * nouns.length)];
  const randPlace = places[Math.floor(rng() * places.length)];

  let title = options.prompt
    ? `${options.prompt.charAt(0).toUpperCase() + options.prompt.slice(1, 28)}`
    : `${randAdj} ${randNoun} ${randPlace}`;
  
  if (title.length > 38) title = title.slice(0, 38);

  const genre = options.genre || `${mode.charAt(0).toUpperCase() + mode.slice(1)} Fantasy (${leadInstrument.toUpperCase()})`;

  return {
    id: `comp-${Date.now()}-${Math.floor(rng() * 1000)}`,
    title,
    genre,
    bpm,
    scale,
    bassNotes,
    leadPattern,
    harmonyPattern,
    drumPattern,
    mood: options.prompt || `${mode} melody featuring ${leadInstrument} and ${percussion} rhythm`,
    acousticSpace: options.acousticSpace || 'tavern',
    instruments: {
      lead: leadInstrument,
      bass: bassInstrument,
      percussion,
    }
  };
}

/**
 * Generate a dynamic track composition based on arbitrary prompt text
 */
export function buildDynamicCompositionFromPrompt(prompt: string): TrackComposition {
  return createProceduralSong({ prompt });
}
