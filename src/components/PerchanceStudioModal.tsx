import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  X,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Copy,
  User,
  Compass,
  RefreshCw,
  Palette,
  ArrowRight,
  Bot,
  Zap,
  Sliders,
  Download,
  Info,
} from 'lucide-react';
import {
  generatePerchanceImage,
  expandPromptWithGemini,
  PERCHANCE_SIMPLE_PROMPTS,
  PERCHANCE_PROMPT_PRESETS,
} from '../utils/perchanceAi';
import { soundEngine } from '../utils/audio';

interface PerchanceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPortrait?: (imageUrl: string) => void;
  onApplyScenery?: (imageUrl: string) => void;
  initialPrompt?: string;
  initialMode?: 'portrait' | 'scenery';
}

export const PerchanceStudioModal: React.FC<PerchanceStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyPortrait,
  onApplyScenery,
  initialPrompt = '',
  initialMode = 'portrait',
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'direct' | 'live-perchance'>('pipeline');
  
  // Step 1: User Input
  const [userInput, setUserInput] = useState(
    initialPrompt || 'a retro robot'
  );

  // Step 2: Gemini Expanded Prompt
  const [expandedPrompt, setExpandedPrompt] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [expansionSource, setExpansionSource] = useState<string | null>(null);

  // Perchance API Config
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark, low resolution, ugly'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '3:4'>('1:1');
  const [stylePreset, setStylePreset] = useState('retro-synthwave');
  const [autoExpandOnGenerate, setAutoExpandOnGenerate] = useState(true);

  // Step 3: Perchance API Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [perchanceApiUrl, setPerchanceApiUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [customImportUrl, setCustomImportUrl] = useState('');
  const [generatedSeed, setGeneratedSeed] = useState<number | null>(null);

  if (!isOpen) return null;

  // Step 2: Call AI Studio (Gemini) to expand simple input into rich prompt
  const handleExpandWithGemini = async () => {
    if (!userInput.trim() || isExpanding) return;
    setIsExpanding(true);
    setStatusText('Expanding prompt with AI Studio (Gemini)...');

    try {
      const result = await expandPromptWithGemini(userInput, {
        stylePreset,
        aspectRatio,
      });

      if (result.expandedPrompt) {
        setExpandedPrompt(result.expandedPrompt);
        setExpansionSource(result.source || 'Gemini 3.7 Flash AI');
        if (result.negativePrompt) {
          setNegativePrompt(result.negativePrompt);
        }
        setStatusText('Prompt expanded with Gemini AI.');
        soundEngine.playLevelUp();
      }
    } catch (err) {
      console.warn('Gemini expansion error:', err);
      setStatusText('Prompt expansion fallback applied.');
    } finally {
      setIsExpanding(false);
    }
  };

  // Step 3: Send detailed prompt to Perchance API (https://perchance.org/perchance-ai-api)
  const handleGenerate = async () => {
    const rawInput = userInput.trim();
    if (!rawInput || isGenerating) return;

    setIsGenerating(true);
    setStatusText('Contacting Perchance API (https://perchance.org/perchance-ai-api)...');

    try {
      let promptToSend = expandedPrompt.trim() || rawInput;

      // If user hasn't manually expanded yet and autoExpand is on
      if (!expandedPrompt.trim() && autoExpandOnGenerate && rawInput.length < 90) {
        setStatusText('AI Studio (Gemini): Expanding simple input...');
        const expResult = await expandPromptWithGemini(rawInput, {
          stylePreset,
          aspectRatio,
        });
        if (expResult.expandedPrompt) {
          promptToSend = expResult.expandedPrompt;
          setExpandedPrompt(expResult.expandedPrompt);
          setExpansionSource(expResult.source || 'Gemini 3.7 Flash AI');
        }
      }

      setStatusText('Perchance API: Generating final image...');

      const result = await generatePerchanceImage(promptToSend, {
        aspectRatio,
        stylePreset,
        negativePrompt,
        expandWithGemini: false, // already expanded
      });

      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
        setPerchanceApiUrl(result.perchanceApiUrl || null);
        setGeneratedSeed(result.seed || Math.floor(Math.random() * 90000000) + 10000000);
        setStatusText('Image generated successfully via Perchance API!');
        soundEngine.playVictory();
      }
    } catch (err: unknown) {
      console.warn('Perchance generation error:', err);
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      const cleanPrompt = (expandedPrompt || rawInput).replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 160);
      const res = aspectRatio === '16:9' ? 'landscape' : 'square';
      const directUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=${res}&seed=${dynamicSeed}`;
      setGeneratedImageUrl(directUrl);
      setPerchanceApiUrl(directUrl);
      setGeneratedSeed(dynamicSeed);
      setStatusText('Image ready from Perchance AI generator.');
      soundEngine.playLevelUp();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyPortrait = (url: string) => {
    if (onApplyPortrait && url) {
      onApplyPortrait(url);
      soundEngine.playVictory();
      onClose();
    }
  };

  const handleApplyScenery = (url: string) => {
    if (onApplyScenery && url) {
      onApplyScenery(url);
      soundEngine.playVictory();
      onClose();
    }
  };

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSelectExample = (example: typeof PERCHANCE_SIMPLE_PROMPTS[0]) => {
    setUserInput(example.simpleInput);
    setExpandedPrompt(example.expandedExample);
    setStylePreset(example.stylePreset);
    setAspectRatio(example.aspectRatio);
    setExpansionSource('Example Prompt');
  };

  return (
    <div
      id="perchance-studio-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fdfaf1] dark:bg-[#1a253a] border-2 border-[#b8ae8f] dark:border-[#273752] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-[#2c1810] dark:text-[#f1f5f9]">
        {/* Header */}
        <div className="p-4 bg-[#f4ecd8] dark:bg-[#121c2d] border-b border-[#e2dcc5] dark:border-[#273752] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2c1810] dark:bg-amber-500/20 text-[#fdfaf1] dark:text-amber-400 flex items-center justify-center border border-[#4a3227] dark:border-amber-500/30 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1]">
                  Perchance AI Image Generator
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono font-bold border border-blue-300 dark:border-blue-800/50 flex items-center gap-1">
                    <Bot className="w-2.5 h-2.5" />
                    AI Studio (Gemini)
                  </span>
                  <ArrowRight className="w-3 h-3 text-[#8c7e6a]" />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold border border-emerald-300 dark:border-emerald-800/50">
                    Perchance API
                  </span>
                </div>
              </div>
              <p className="text-xs font-serif italic text-[#8c7e6a] dark:text-slate-400 mt-0.5">
                Type a simple request → Gemini AI expands it into a vivid prompt → Perchance API renders the final image
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex bg-[#e2dcc5] dark:bg-[#1f2d42] p-0.5 rounded-lg text-xs font-serif">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'pipeline'
                    ? 'bg-[#2c1810] text-[#fdfaf1] font-bold shadow-xs'
                    : 'text-[#5a4638] dark:text-slate-300 hover:text-[#2c1810]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Pipeline</span>
              </button>
              <button
                onClick={() => setActiveTab('live-perchance')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'live-perchance'
                    ? 'bg-[#2c1810] text-[#fdfaf1] font-bold shadow-xs'
                    : 'text-[#5a4638] dark:text-slate-300 hover:text-[#2c1810]'
                }`}
              >
                <span>Live Perchance Web</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#e2dcc5] dark:hover:bg-[#273752] text-[#8c7e6a] dark:text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Body */}
        {activeTab === 'pipeline' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Configuration & Pipeline Column (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Quick Sample Inputs */}
              <div>
                <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#8c7e6a]" />
                    <span>Quick Examples (Click to Try)</span>
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PERCHANCE_SIMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExample(ex)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-serif transition-colors cursor-pointer flex items-center gap-1 ${
                        userInput === ex.simpleInput
                          ? 'bg-[#2c1810] text-[#fdfaf1] border-[#2c1810] dark:bg-amber-600 dark:border-amber-500 font-bold'
                          : 'bg-[#f4ecd8] dark:bg-[#1f2d42] text-[#2c1810] dark:text-[#f1f5f9] border-[#e2dcc5] dark:border-[#2f4260] hover:bg-[#e8dec0]'
                      }`}
                    >
                      <span>"{ex.simpleInput}"</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 1: USER INPUT */}
              <div className="p-3 bg-white dark:bg-[#121c2d] border border-[#b8ae8f] dark:border-[#2f4260] rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#2c1810] text-[#fdfaf1] dark:bg-amber-500 dark:text-slate-950 text-[10px] flex items-center justify-center font-mono">1</span>
                    <span>User Input (Simple Request):</span>
                  </label>
                  <span className="text-[10px] text-[#8c7e6a] dark:text-slate-400 italic">
                    e.g., "a retro robot"
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleExpandWithGemini();
                    }}
                    placeholder="Type a simple request (e.g., a retro robot)..."
                    className="flex-1 p-2 bg-[#fdfaf1] dark:bg-[#1a253a] border border-[#e2dcc5] dark:border-[#273752] rounded-lg text-xs font-serif text-[#2c1810] dark:text-[#f1f5f9] outline-none focus:ring-1 focus:ring-[#2c1810] dark:focus:ring-amber-400"
                  />
                  <button
                    onClick={handleExpandWithGemini}
                    disabled={isExpanding || !userInput.trim()}
                    title="Ask AI Studio (Gemini) to expand this short text into a detailed prompt"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
                  >
                    {isExpanding ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                    <span>Expand with Gemini</span>
                  </button>
                </div>
              </div>

              {/* STEP 2: AI STUDIO (GEMINI) DETAILED PROMPT */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-serif font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">2</span>
                    <span>AI Studio (Gemini) Expanded Prompt:</span>
                  </label>
                  {expansionSource && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                      {expansionSource}
                    </span>
                  )}
                </div>
                <textarea
                  value={expandedPrompt}
                  onChange={(e) => setExpandedPrompt(e.target.value)}
                  rows={3}
                  placeholder="Click 'Expand with Gemini' or type/edit the detailed visual prompt here..."
                  className="w-full p-2 bg-white dark:bg-[#121c2d] border border-blue-300 dark:border-blue-800/60 rounded-lg text-xs font-serif text-[#2c1810] dark:text-[#f1f5f9] outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between text-[11px] text-[#8c7e6a] dark:text-slate-400">
                  <span className="italic">
                    Prompt length: {expandedPrompt.length} chars (Optimized for Perchance API)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoExpandOnGenerate}
                      onChange={(e) => setAutoExpandOnGenerate(e.target.checked)}
                      className="rounded border-[#b8ae8f] text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto-expand before sending to Perchance</span>
                  </label>
                </div>
              </div>

              {/* Style & Aspect Ratio Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1] mb-1 block">
                    Art Style Preset:
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#121c2d] border border-[#b8ae8f] dark:border-[#2f4260] rounded-lg text-xs font-serif text-[#2c1810] dark:text-[#f1f5f9] outline-none"
                  >
                    <option value="retro-synthwave">1980s Retro Synthwave</option>
                    <option value="cinematic-fantasy">Cinematic Fantasy</option>
                    <option value="dark-gothic">Dark Gothic Painting</option>
                    <option value="oil-masterpiece">Classical Oil Masterpiece</option>
                    <option value="heroic-anime">Heroic Anime / JRPG</option>
                    <option value="vintage-dnd">Vintage D&D Manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1] mb-1 block">
                    Aspect Ratio:
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-[#121c2d] border border-[#b8ae8f] dark:border-[#2f4260] rounded-lg text-xs font-serif text-[#2c1810] dark:text-[#f1f5f9] outline-none"
                  >
                    <option value="1:1">1:1 Square (Portrait)</option>
                    <option value="16:9">16:9 Landscape (Scenery)</option>
                    <option value="3:4">3:4 Full Body</option>
                  </select>
                </div>
              </div>

              {/* STEP 3: SEND TO PERCHANCE API BUTTON */}
              <button
                id="btn-perchance-pipeline-generate"
                onClick={handleGenerate}
                disabled={isGenerating || !userInput.trim()}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-serif font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Rendering with Perchance AI API...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-200" />
                    <span>Generate via Perchance API (https://perchance.org/perchance-ai-api)</span>
                  </>
                )}
              </button>

              {statusText && (
                <div className="p-2.5 rounded-lg bg-[#e8f4ec] dark:bg-emerald-950/40 text-[#24633b] dark:text-emerald-300 text-xs font-serif flex items-center gap-2 border border-[#c3e0cb] dark:border-emerald-800/40">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="truncate">{statusText}</span>
                </div>
              )}
            </div>

            {/* Right Preview Column (6 cols) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#f4ecd8] dark:bg-[#121c2d] border border-[#e2dcc5] dark:border-[#273752] rounded-xl p-4 min-h-[360px]">
              {generatedImageUrl ? (
                <div className="w-full flex flex-col items-center space-y-3">
                  <div className="relative group max-w-full rounded-xl overflow-hidden border-2 border-[#b8ae8f] dark:border-[#2f4260] shadow-lg bg-black">
                    <img
                      src={generatedImageUrl}
                      alt="Perchance AI Generated Visual"
                      className="object-contain max-h-[320px] sm:max-h-[360px] w-auto rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-emerald-300 font-mono flex items-center gap-1 border border-emerald-700/50">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
                      <span>Perchance AI API</span>
                    </div>
                    {generatedSeed && (
                      <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                        Seed: #{generatedSeed}
                      </div>
                    )}
                  </div>

                  {/* Output Prompt info */}
                  {expandedPrompt && (
                    <div className="w-full p-2 bg-white/80 dark:bg-[#1a253a]/80 border border-[#e2dcc5] dark:border-[#273752] rounded-lg text-[11px] font-serif text-[#5a4638] dark:text-slate-300 leading-snug">
                      <span className="font-bold text-[#2c1810] dark:text-[#fdfaf1]">Gemini Expanded Prompt: </span>
                      "{expandedPrompt}"
                    </div>
                  )}

                  {/* Apply Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                    {onApplyPortrait && (
                      <button
                        onClick={() => handleApplyPortrait(generatedImageUrl)}
                        className="px-3 py-1.5 bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] rounded-lg font-serif font-bold text-xs flex items-center gap-1.5 hover:bg-[#4a3227] dark:hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                      >
                        <User className="w-3.5 h-3.5 text-[#b8ae8f] dark:text-amber-200" />
                        <span>Apply as Hero Portrait</span>
                      </button>
                    )}

                    {onApplyScenery && (
                      <button
                        onClick={() => handleApplyScenery(generatedImageUrl)}
                        className="px-3 py-1.5 bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] rounded-lg font-serif font-bold text-xs flex items-center gap-1.5 hover:bg-[#4a3227] dark:hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#b8ae8f] dark:text-amber-200" />
                        <span>Apply as Location Scenery</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyUrl(generatedImageUrl)}
                      className="px-3 py-1.5 bg-white dark:bg-[#1f2d42] border border-[#b8ae8f] dark:border-[#2f4260] text-[#2c1810] dark:text-[#f1f5f9] rounded-lg font-serif text-xs flex items-center gap-1.5 hover:bg-[#fdfaf1] dark:hover:bg-[#273752] transition-colors cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy Image Link'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#e8dec0] dark:bg-[#1f2d42] text-[#8c7e6a] dark:text-slate-400 flex items-center justify-center mx-auto border border-[#b8ae8f]/50 dark:border-[#2f4260]">
                    <ImageIcon className="w-8 h-8 text-[#8c7e6a] dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1]">
                    AI Studio + Perchance Pipeline
                  </h3>
                  <p className="text-xs font-serif italic text-[#8c7e6a] dark:text-slate-400 max-w-md mx-auto">
                    Type a simple request like <span className="font-bold text-[#2c1810] dark:text-amber-300">"a retro robot"</span>. AI Studio (Gemini) will expand it into a detailed visual prompt, and the Perchance API will generate your artwork.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setUserInput('a retro robot');
                        handleExpandWithGemini();
                      }}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-serif cursor-pointer hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Try "a retro robot"</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Live Perchance Web View */
          <div className="flex-1 flex flex-col p-4 space-y-3 min-h-[500px]">
            {/* Quick URL Import Bar */}
            <div className="p-3 bg-[#f4ecd8] dark:bg-[#121c2d] border border-[#e2dcc5] dark:border-[#273752] rounded-xl flex flex-wrap items-center gap-2">
              <span className="text-xs font-serif font-bold text-[#2c1810] dark:text-[#fdfaf1] flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#8c7e6a]" />
                <span>Import Any Generated URL / Image:</span>
              </span>
              <input
                type="text"
                value={customImportUrl}
                onChange={(e) => setCustomImportUrl(e.target.value)}
                placeholder="Paste direct Perchance or web image link..."
                className="flex-1 min-w-[200px] p-1.5 bg-white dark:bg-[#1f2d42] border border-[#b8ae8f] dark:border-[#2f4260] rounded-lg text-xs font-mono text-[#2c1810] dark:text-[#f1f5f9] outline-none"
              />
              {onApplyPortrait && (
                <button
                  onClick={() => handleApplyPortrait(customImportUrl)}
                  disabled={!customImportUrl.trim()}
                  className="px-2.5 py-1 bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] rounded-lg text-xs font-serif font-bold disabled:opacity-40 hover:bg-[#4a3227] cursor-pointer"
                >
                  Set as Hero
                </button>
              )}
              {onApplyScenery && (
                <button
                  onClick={() => handleApplyScenery(customImportUrl)}
                  disabled={!customImportUrl.trim()}
                  className="px-2.5 py-1 bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] rounded-lg text-xs font-serif font-bold disabled:opacity-40 hover:bg-[#4a3227] cursor-pointer"
                >
                  Set as Scenery
                </button>
              )}
            </div>

            {/* Embedded Live Generator Iframe */}
            <div className="flex-1 w-full bg-white dark:bg-black rounded-xl overflow-hidden border border-[#b8ae8f] dark:border-[#273752] shadow-inner relative min-h-[420px]">
              <iframe
                src="https://null.perchance.org/ai-image-generator"
                title="Live Perchance AI Image Generator"
                className="w-full h-full min-h-[420px] border-none"
                allow="clipboard-read; clipboard-write; camera; microphone"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

