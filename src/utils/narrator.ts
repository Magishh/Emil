import { GeminiVoiceName, NarratorSettings, NarratorVoiceOption } from '../types';

export const GEMINI_NARRATOR_VOICES: NarratorVoiceOption[] = [
  {
    id: 'Fenrir',
    name: 'Fenrir',
    title: 'The Dungeon Master',
    gender: 'Deep Masculine',
    tone: 'Commanding, gravelly, cinematic',
    description: 'Deep, resonant fantasy DM delivery. Perfect for high-stakes dungeon crawls, combat encounters, and epic quests.',
    samplePhrase: 'Roll for initiative, brave travelers. Shadows stir in the catacombs ahead, and steel must answer.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    title: 'The Cryptkeeper',
    gender: 'Gravelly Masculine',
    tone: 'Ominous, raspy, suspenseful',
    description: 'Dark and eerie cadence. Superb for necromantic tombs, ancient curses, gothic horror, and shadowy perils.',
    samplePhrase: 'The iron gates creak open with the sound of weeping. Beware what hungers in the dark.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    title: 'The Grand Chronicler',
    gender: 'Noble Masculine',
    tone: 'Articulate, wise, balanced',
    description: 'Warm, clear, and scholarly storytelling. Ideal for exploring ancient ruins, historical lore, and grand kingdoms.',
    samplePhrase: 'Legend tells of an era when celestial spires pierced the skies and ancient kings commanded the arcane.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    title: 'The Fey Seer',
    gender: 'Mystical Feminine',
    tone: 'Ethereal, calm, enchanting',
    description: 'Soft, melodic, and serene. Excellent for mystical groves, fey crossings, elven temples, and mysterious visions.',
    samplePhrase: 'Listen closely to the whispering willows. The ancient spirits offer their blessings to those pure of heart.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    title: 'The Tavern Bard',
    gender: 'Lively / Animated',
    tone: 'Expressive, spirited, dramatic',
    description: 'High energy and theatrical flair. Fantastic for bustling taverns, roguish banter, market squares, and comedic turns.',
    samplePhrase: 'Gather round, travelers! Have I got a wild tale of dragons, gold, and heroic luck for you tonight!',
  },
];

export const DEFAULT_NARRATOR_SETTINGS: NarratorSettings = {
  engine: 'gemini',
  geminiVoice: 'Fenrir',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoNarrateNewTurns: false,
  dramaticPauses: true,
};

export interface NarratorPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentText: string;
  duration: number;
  currentTime: number;
  progress: number; // 0 to 1
  engine: 'gemini' | 'browser';
  voiceName: string;
  rate: number;
  error: string | null;
}

// Convert raw 24kHz 16-bit PCM base64 string to a universal playable WAV Blob
export function pcmBase64ToWavBlob(base64: string, sampleRate = 24000, numChannels = 1): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // If already contains RIFF header (standard WAV), return directly
  if (len > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return new Blob([bytes], { type: 'audio/wav' });
  }

  // Wrap raw 16-bit mono PCM in a 44-byte standard RIFF/WAVE header
  const dataLength = len;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // 1. "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format subchunk size = 16
  view.setUint16(20, 1, true); // AudioFormat: 1 = uncompressed PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample: 16-bit

  // 3. "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Copy PCM samples
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(bytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

class NarratorEngine {
  private audioElement: HTMLAudioElement | null = null;
  private settings: NarratorSettings = { ...DEFAULT_NARRATOR_SETTINGS };
  private listeners: Set<(state: NarratorPlaybackState) => void> = new Set();
  private audioCache: Map<string, string> = new Map(); // hash -> blobUrl
  private static readonly MAX_CACHED_CLIPS = 12;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private browserSpeechTimer: any = null;

  private state: NarratorPlaybackState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentText: '',
    duration: 0,
    currentTime: 0,
    progress: 0,
    engine: 'gemini',
    voiceName: 'Fenrir',
    rate: 1.0,
    error: null,
  };

  constructor() {
    this.loadSettings();
  }

  public getSettings(): NarratorSettings {
    return { ...this.settings };
  }

  public getState(): NarratorPlaybackState {
    return { ...this.state };
  }

  public updateSettings(partial: Partial<NarratorSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();

    // If currently playing Gemini audio, dynamically adjust playbackRate and volume
    if (this.audioElement) {
      if (partial.rate !== undefined) {
        this.audioElement.playbackRate = partial.rate;
      }
      if (partial.volume !== undefined) {
        this.audioElement.volume = partial.volume;
      }
    }

    this.state.rate = this.settings.rate;
    this.state.engine = this.settings.engine;
    this.state.voiceName = this.resolveVoiceName();
    this.notify();
  }

  // The displayed voice name must follow the selected engine; always reporting
  // the Gemini voice mislabels browser playback.
  private resolveVoiceName(): string {
    return this.settings.engine === 'gemini'
      ? this.settings.geminiVoice
      : (this.settings.browserVoiceURI || 'System Voice');
  }

  public subscribe(fn: (state: NarratorPlaybackState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch (err) {
        console.warn('Narrator listener error:', err);
      }
    });
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('dnd_narrator_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_NARRATOR_SETTINGS, ...parsed };
      }
    } catch {
      // Ignore
    }
    this.state.rate = this.settings.rate;
    this.state.engine = this.settings.engine;
    this.state.voiceName = this.resolveVoiceName();
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('dnd_narrator_settings', JSON.stringify(this.settings));
    } catch {
      // Ignore
    }
  }

  // Main narration dispatcher
  public async speak(text: string, customSettings?: Partial<NarratorSettings>): Promise<void> {
    if (!text || text.trim().length === 0) return;
    const cleanText = text.trim();

    const activeSettings: NarratorSettings = {
      ...this.settings,
      ...customSettings,
    };

    // If already playing the same text, toggle pause/play
    if (this.state.isPlaying && this.state.currentText === cleanText) {
      this.pause();
      return;
    }

    if (this.state.isPaused && this.state.currentText === cleanText) {
      this.resume();
      return;
    }

    // Stop existing audio first
    this.stop();

    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
      isLoading: true,
      currentText: cleanText,
      duration: 0,
      currentTime: 0,
      progress: 0,
      engine: activeSettings.engine,
      voiceName: activeSettings.engine === 'gemini' ? activeSettings.geminiVoice : (activeSettings.browserVoiceURI || 'System Voice'),
      rate: activeSettings.rate,
      error: null,
    };
    this.notify();

    // Route according to engine
    if (activeSettings.engine === 'gemini') {
      try {
        await this.speakWithGemini(cleanText, activeSettings);
      } catch (err: any) {
        console.warn('Gemini TTS failed, smoothly falling back to Web Speech API:', err);
        await this.speakWithBrowser(cleanText, activeSettings);
      }
    } else {
      await this.speakWithBrowser(cleanText, activeSettings);
    }
  }

  // Gemini Flash AI Natural TTS Engine
  private async speakWithGemini(text: string, settings: NarratorSettings): Promise<void> {
    const cacheKey = `${settings.geminiVoice}_${settings.dramaticPauses}_${text}`;
    let blobUrl = this.audioCache.get(cacheKey);

    if (!blobUrl) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.geminiVoice,
          rate: settings.rate,
          pitch: settings.pitch,
        }),
      });

      if (!res.ok) {
        throw new Error(`TTS server returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.audioBase64) {
        // Server fallback requested
        throw new Error('Gemini audio not available from server');
      }

      const wavBlob = pcmBase64ToWavBlob(data.audioBase64, 24000);
      blobUrl = URL.createObjectURL(wavBlob);
      this.audioCache.set(cacheKey, blobUrl);
      this.evictOldestCachedClips();
    }

    // Initialize Audio Element
    if (!this.audioElement) {
      this.audioElement = new Audio();
    }

    const audio = this.audioElement;
    audio.src = blobUrl;
    audio.playbackRate = settings.rate;
    audio.volume = settings.volume;

    audio.onloadedmetadata = () => {
      this.state.duration = audio.duration || 0;
      this.state.isLoading = false;
      this.notify();
    };

    audio.ontimeupdate = () => {
      this.state.currentTime = audio.currentTime;
      this.state.duration = audio.duration || this.state.duration;
      this.state.progress = audio.duration ? audio.currentTime / audio.duration : 0;
      this.notify();
    };

    audio.onended = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.progress = 1;
      this.notify();
    };

    audio.onerror = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.isLoading = false;
      this.state.error = 'Audio playback error';
      this.notify();
    };

    try {
      await audio.play();
      this.state.isLoading = false;
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.engine = 'gemini';
      this.notify();
    } catch (err: any) {
      // User gesture needed or playback failed
      this.state.isLoading = false;
      throw err;
    }
  }

  // Blob URLs stay alive until explicitly revoked, so bound the cache and
  // release the clips that fall out of it.
  private evictOldestCachedClips() {
    while (this.audioCache.size > NarratorEngine.MAX_CACHED_CLIPS) {
      const oldestKey = this.audioCache.keys().next().value;
      if (oldestKey === undefined) break;
      const staleUrl = this.audioCache.get(oldestKey);
      this.audioCache.delete(oldestKey);
      if (staleUrl && staleUrl !== this.audioElement?.src) {
        try {
          URL.revokeObjectURL(staleUrl);
        } catch {
          // Ignore
        }
      }
    }
  }

  // Browser Web Speech API Fallback
  private async speakWithBrowser(text: string, settings: NarratorSettings): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.state.isPlaying = false;
      this.state.isLoading = false;
      this.state.error = 'Speech synthesis not supported on this browser';
      this.notify();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    // Pick chosen browser voice if specified
    if (settings.browserVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.voiceURI === settings.browserVoiceURI || v.name === settings.browserVoiceURI);
      if (match) {
        utterance.voice = match;
      }
    } else {
      // Auto-pick best available natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Daniel') || v.name.includes('Guy') || v.name.includes('Ryan')) &&
          v.lang.startsWith('en')
      );
      if (preferred) utterance.voice = preferred;
    }

    // Record that speech is now running on the browser engine. Without this a
    // Gemini-to-browser fallback leaves state.engine as 'gemini', so pause(),
    // resume() and stop() go on to drive the idle <audio> element while the
    // Web Speech utterance keeps talking.
    this.state.engine = 'browser';
    this.state.voiceName = utterance.voice?.name || settings.browserVoiceURI || 'System Voice';

    // Estimate duration for progress bar
    const estimatedDuration = Math.max(2, (text.split(' ').length / (140 * settings.rate)) * 60);
    this.state.duration = estimatedDuration;
    this.state.isLoading = false;
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.state.progress = 0;
    this.notify();

    const startTime = Date.now();
    clearInterval(this.browserSpeechTimer);
    this.browserSpeechTimer = setInterval(() => {
      if (!this.state.isPlaying || this.state.isPaused) return;
      const elapsed = (Date.now() - startTime) / 1000;
      this.state.currentTime = Math.min(this.state.duration, elapsed);
      this.state.progress = Math.min(0.99, elapsed / this.state.duration);
      this.notify();
    }, 200);

    utterance.onend = () => {
      clearInterval(this.browserSpeechTimer);
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.progress = 1;
      this.notify();
    };

    utterance.onerror = (e) => {
      clearInterval(this.browserSpeechTimer);
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.error = e.error || 'Speech error';
      this.notify();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Pause playback
  public pause() {
    if (this.state.engine === 'gemini' && this.audioElement) {
      this.audioElement.pause();
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.notify();
  }

  // Resume playback
  public resume() {
    if (this.state.engine === 'gemini' && this.audioElement) {
      this.audioElement.play().catch(console.warn);
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.notify();
  }

  // Stop playback completely
  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    clearInterval(this.browserSpeechTimer);

    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.isLoading = false;
    this.state.currentTime = 0;
    this.state.progress = 0;
    this.notify();
  }

  // Set speed/rate dynamically
  public setRate(rate: number) {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.updateSettings({ rate: clamped });
    if (this.audioElement) {
      this.audioElement.playbackRate = clamped;
    }
  }

  // Set volume dynamically
  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.updateSettings({ volume: clamped });
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
  }

  // Preview a voice sample
  public async previewVoice(voice: GeminiVoiceName | string, engine: 'gemini' | 'browser' = 'gemini') {
    const sample =
      GEMINI_NARRATOR_VOICES.find((v) => v.id === voice)?.samplePhrase ||
      'Roll for initiative, brave adventurer. The dungeon awaits your command.';
    
    await this.speak(sample, {
      engine,
      geminiVoice: voice as GeminiVoiceName,
      browserVoiceURI: engine === 'browser' ? voice : undefined,
    });
  }
}

export const narratorEngine = new NarratorEngine();
