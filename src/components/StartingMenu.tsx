import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Plus,
  Play,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  Sparkles,
  Shield,
  Heart,
  Swords,
  Clock,
  Dices,
  MapPin,
  Flame,
  Scroll,
  X,
  ChevronRight,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { CampaignState } from '../types';
import {
  getSavedCampaigns,
  deleteCampaign,
  duplicateCampaign,
  exportCampaignToJson,
  saveCampaign,
} from '../utils/campaignStorage';
import { soundEngine } from '../utils/audio';
import { generateCharacterAvatarSvg } from '../utils/svgArt';

interface StartingMenuProps {
  isOpen: boolean;
  currentCampaign: CampaignState | null;
  onSelectCampaign: (campaign: CampaignState) => void;
  onCreateNewCampaign: () => void;
  onClose?: () => void;
}

export const StartingMenu: React.FC<StartingMenuProps> = ({
  isOpen,
  currentCampaign,
  onSelectCampaign,
  onCreateNewCampaign,
  onClose,
}) => {
  const [campaigns, setCampaigns] = useState<CampaignState[]>(() => getSavedCampaigns());
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Sync campaigns list whenever menu is opened or campaign is updated
  useEffect(() => {
    if (isOpen) {
      setCampaigns(getSavedCampaigns());
    }
  }, [isOpen, currentCampaign]);

  // Refresh saved list
  const refreshList = () => {
    setCampaigns(getSavedCampaigns());
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (!c) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c.character?.name && c.character.name.toLowerCase().includes(q)) ||
        (c.character?.className && c.character.className.toLowerCase().includes(q)) ||
        (c.character?.race && c.character.race.toLowerCase().includes(q)) ||
        (c.currentLocation?.name && c.currentLocation.name.toLowerCase().includes(q));

      const matchesDiff =
        difficultyFilter === 'all' || c.settings?.difficulty === difficultyFilter;

      return Boolean(matchesSearch && matchesDiff);
    });
  }, [campaigns, searchQuery, difficultyFilter]);

  const handleLaunch = (camp: CampaignState) => {
    soundEngine.playLevelUp();
    onSelectCampaign(camp);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playSwordStrike();
    const updated = deleteCampaign(id);
    setCampaigns(updated);
    setDeletingId(null);

    // The app still holds the deleted campaign in memory and would save it
    // straight back on the next turn, so move off it explicitly.
    if (currentCampaign && currentCampaign.campaignId === id) {
      if (updated.length > 0) {
        onSelectCampaign(updated[0]);
      } else {
        onCreateNewCampaign();
      }
    }
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playDiceRoll();
    const clone = duplicateCampaign(id);
    if (clone) {
      refreshList();
    }
  };

  const handleExport = (camp: CampaignState, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playDiceRoll();
    exportCampaignToJson(camp);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: CampaignState = JSON.parse(text);
        if (!parsed.campaignTitle || !parsed.character) {
          throw new Error('Invalid adventure save file format');
        }

        const importedCampaign: CampaignState = {
          ...parsed,
          campaignId: `camp-imported-${Date.now()}`,
          campaignTitle: `${parsed.campaignTitle} (Imported)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        saveCampaign(importedCampaign);
        refreshList();
        soundEngine.playLevelUp();
        setImportError(null);
      } catch (err: unknown) {
        const error = err as Error;
        setImportError(error.message || 'Failed to read adventure file.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Format relative timestamp
  const formatTime = (ts?: number) => {
    if (!ts) return 'Earlier';
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 dark:bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#fdfaf1] dark:bg-[#0b1220] border-2 border-[#b8ae8f] dark:border-[#1e2d4a] rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#2c1810] dark:text-[#f1f5f9] transition-colors">
        {/* Top Header Banner */}
        <div className="p-5 bg-[#f5f0e3] dark:bg-[#080d18] border-b border-[#e2dcc5] dark:border-[#1a263d] flex items-center justify-between shrink-0 relative overflow-hidden transition-colors">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#2c1810] dark:bg-amber-500/20 text-[#fdfaf1] dark:text-amber-400 border border-[#b8ae8f]/40 dark:border-amber-500/30 flex items-center justify-center shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2c1810] dark:text-amber-300 tracking-wide">
                  Campaign Storage & Quest Chronicle Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e2dcc5] dark:bg-amber-500/10 text-[#4a3227] dark:text-amber-400 border border-[#b8ae8f] dark:border-amber-500/20">
                  {campaigns.length} Saved {campaigns.length === 1 ? 'Quest' : 'Quests'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8c7e6a] dark:text-slate-400 font-serif">
                Select a recorded quest to continue your journey or forge a new destiny
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              title="Resume Current Session"
              className="p-2 rounded-xl text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-white hover:bg-[#e2dcc5]/50 dark:hover:bg-[#131e33] transition-colors cursor-pointer relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 bg-[#faf6ea] dark:bg-[#0d1629] border-b border-[#e2dcc5] dark:border-[#1a263d] flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8c7e6a] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search quest title, hero, class, or realm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#080e1a] border border-[#e2dcc5] dark:border-[#273752] rounded-xl text-xs text-[#2c1810] dark:text-slate-100 placeholder-[#8c7e6a] dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-2.5 py-2 bg-white dark:bg-[#080e1a] border border-[#e2dcc5] dark:border-[#273752] rounded-xl text-xs text-[#2c1810] dark:text-slate-200 font-serif focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="all">All Difficulties</option>
              <option value="story">Story</option>
              <option value="standard">Standard</option>
              <option value="heroic">Heroic</option>
              <option value="nightmare">Nightmare</option>
            </select>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Import JSON Button */}
            <label
              title="Load saved adventure from JSON file"
              className="px-3 py-2 bg-[#f5f0e3] dark:bg-[#131e33] hover:bg-[#e2dcc5] dark:hover:bg-[#1a2944] text-[#2c1810] dark:text-slate-200 border border-[#b8ae8f]/60 dark:border-[#273752] rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#8c7e6a] dark:text-slate-400" />
              <span className="hidden sm:inline">Import Quest</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {/* Forge New Adventure Button */}
            <button
              onClick={() => {
                soundEngine.playLevelUp();
                onCreateNewCampaign();
              }}
              className="px-4 py-2 bg-[#2c1810] dark:bg-amber-600 hover:bg-[#4a3227] dark:hover:bg-amber-700 text-[#fdfaf1] dark:text-white rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#b8ae8f] dark:text-amber-200" />
              <span>Create New Adventure</span>
            </button>
          </div>
        </div>

        {importError && (
          <div className="mx-4 mt-3 p-2.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              {importError}
            </span>
            <button onClick={() => setImportError(null)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Adventures Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Quick Active Campaign Resumption Card (if one is currently active) */}
          {currentCampaign && currentCampaign.character && !searchQuery && difficultyFilter === 'all' && (
            <div className="p-4 bg-[#f5f0e3] dark:bg-gradient-to-r dark:from-[#141f33] dark:to-[#1c2a44] rounded-2xl text-[#2c1810] dark:text-[#f1f5f9] shadow-md border border-[#b8ae8f] dark:border-[#273752] relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    currentCampaign.character?.portraitUrl ||
                    generateCharacterAvatarSvg(
                      currentCampaign.character || {
                        name: 'Current Hero',
                        className: 'Fighter',
                        race: 'Hero',
                      }
                    )
                  }
                  alt={currentCampaign.character?.name || 'Current Hero'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-600 dark:border-amber-400/80 bg-[#090f1a] shadow-inner shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2c1810] dark:bg-amber-500/20 text-[#fdfaf1] dark:text-amber-300 border border-[#4a3227] dark:border-amber-500/30 uppercase tracking-wider">
                      Current Quest
                    </span>
                    <span className="text-[11px] text-[#8c7e6a] dark:text-slate-400 font-mono">
                      Turn {currentCampaign.turnCount || 1} • {formatTime(currentCampaign.updatedAt)}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#2c1810] dark:text-slate-100 mt-0.5">
                    {currentCampaign.campaignTitle || 'Active Adventure'}
                  </h3>
                  <p className="text-xs text-[#4a3227] dark:text-slate-300 line-clamp-1">
                    {currentCampaign.character?.name || 'Hero'} (Lvl {currentCampaign.character?.level || 1} {currentCampaign.character?.race || ''} {currentCampaign.character?.className || 'Fighter'}) • {currentCampaign.currentLocation?.name || 'Unknown Location'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleLaunch(currentCampaign)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#2c1810] dark:bg-amber-600 hover:bg-[#4a3227] dark:hover:bg-amber-700 text-[#fdfaf1] dark:text-white rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Journey</span>
              </button>
            </div>
          )}

          {/* Section Heading */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm font-serif font-bold text-[#2c1810] dark:text-amber-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Recorded Adventures ({filteredCampaigns.length})</span>
            </h2>
            <span className="text-xs text-[#8c7e6a] dark:text-slate-400">
              Click any quest card to jump right into the story
            </span>
          </div>

          {/* Campaign Cards Grid */}
          {filteredCampaigns.length === 0 ? (
            <div className="py-12 text-center bg-[#faf6ea] dark:bg-[#0e1728] border border-[#e2dcc5] dark:border-[#1e2d4a] rounded-2xl p-6">
              <Scroll className="w-10 h-10 text-[#8c7e6a] dark:text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-serif font-bold text-[#2c1810] dark:text-slate-200">No recorded adventures match your search</p>
              <p className="text-xs text-[#8c7e6a] dark:text-slate-400 mt-1 mb-4">
                Clear filters or embark on a brand new custom storyline.
              </p>
              <button
                onClick={onCreateNewCampaign}
                className="px-4 py-2 bg-[#2c1810] dark:bg-amber-600 hover:bg-[#4a3227] dark:hover:bg-amber-700 text-[#fdfaf1] dark:text-white rounded-xl text-xs font-serif font-bold cursor-pointer"
              >
                + Forge New Adventure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCampaigns.map((camp) => {
                const isCurrent = currentCampaign?.campaignId === camp.campaignId;
                const isConfirmingDelete = deletingId === camp.campaignId;
                const char = camp.character || {
                  name: 'Unknown Hero',
                  className: 'Fighter',
                  race: 'Human',
                  level: 1,
                  hp: 20,
                  maxHp: 20,
                  ac: 15,
                  portraitUrl: '',
                  inventory: [],
                };
                const loc = camp.currentLocation || { name: 'Unknown Realm' };

                return (
                  <div
                    key={camp.campaignId}
                    onClick={() => handleLaunch(camp)}
                    className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between group cursor-pointer shadow-xs ${
                      isCurrent
                        ? 'bg-[#faf5e8] dark:bg-[#162238] border-[#2c1810] dark:border-amber-400 ring-2 ring-amber-500/30'
                        : 'bg-white dark:bg-[#0e1728] border-[#e2dcc5] dark:border-[#1e2d4a] hover:border-[#2c1810] dark:hover:border-amber-400/60 hover:shadow-md'
                    }`}
                  >
                    {/* Top: Character & Header Info */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={char.portraitUrl || generateCharacterAvatarSvg(char)}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border border-[#e2dcc5] dark:border-[#273752] bg-[#090f1a] shadow-xs shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-serif font-bold text-[#2c1810] dark:text-slate-100 truncate">
                              {char.name}
                            </h4>
                            <p className="text-[11px] text-[#8c7e6a] dark:text-slate-400 truncate">
                              Lvl {char.level || 1} {char.race || ''} {char.className || 'Hero'}
                            </p>
                          </div>
                        </div>

                        {/* Top Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#f5f0e3] dark:bg-[#131e33] border border-[#e2dcc5] dark:border-[#273752] text-[#4a3227] dark:text-amber-300 capitalize">
                            {camp.settings?.difficulty || 'standard'}
                          </span>
                          <span className="text-[10px] text-[#8c7e6a] dark:text-slate-400 font-mono">
                            {formatTime(camp.updatedAt || camp.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Adventure Title */}
                      <h3 className="text-sm font-serif font-bold text-[#2c1810] dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                        {camp.campaignTitle || 'Untitled Adventure'}
                      </h3>

                      {/* Premise & Location */}
                      <p className="text-xs text-[#4a3227] dark:text-slate-300 line-clamp-2 font-serif italic mb-3">
                        "{camp.currentStory || camp.settings?.storyPremise || 'An epic quest begins...'}"
                      </p>

                      {/* Location & Turn Details */}
                      <div className="space-y-1.5 mb-3 bg-[#faf6ea] dark:bg-[#090f1a] p-2.5 rounded-xl border border-[#e2dcc5] dark:border-[#1e2d4a] text-[11px]">
                        <div className="flex items-center justify-between text-[#4a3227] dark:text-slate-300">
                          <span className="flex items-center gap-1 truncate font-medium">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="truncate">{loc.name}</span>
                          </span>
                          <span className="font-mono text-[#8c7e6a] dark:text-slate-400 shrink-0">
                            Turn {camp.turnCount || 1}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#8c7e6a] dark:text-slate-400 pt-1 border-t border-[#e2dcc5] dark:border-[#1e2d4a]">
                          <span className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-bold">
                              <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                              {char.hp || 20}/{char.maxHp || 20} HP
                            </span>
                            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold">
                              <Shield className="w-3 h-3 text-blue-500" />
                              {char.ac || 14} AC
                            </span>
                          </span>
                          <span>
                            {camp.history?.length || 1} logs • {char.inventory?.length || 0} items
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-2 border-t border-[#e2dcc5] dark:border-[#1e2d4a] flex items-center justify-between gap-1">
                      {/* Secondary Management buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(camp.campaignId, e)}
                          title="Duplicate / Clone Adventure"
                          className="p-1.5 rounded-lg text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-white hover:bg-[#e2dcc5]/50 dark:hover:bg-[#16243d] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleExport(camp, e)}
                          title="Export Adventure JSON"
                          className="p-1.5 rounded-lg text-[#8c7e6a] dark:text-slate-400 hover:text-[#2c1810] dark:hover:text-white hover:bg-[#e2dcc5]/50 dark:hover:bg-[#16243d] transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete confirmation toggle */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded-lg border border-red-300 dark:border-red-700">
                            <span className="text-[10px] text-red-700 dark:text-red-300 font-bold">Delete?</span>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(camp.campaignId, e)}
                              className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white px-1 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(camp.campaignId);
                            }}
                            title="Delete Adventure"
                            className="p-1.5 rounded-lg text-[#8c7e6a] dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Primary Play Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunch(camp);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#2c1810] dark:bg-amber-600 text-[#fdfaf1] dark:text-white hover:bg-[#4a3227] dark:hover:bg-amber-700 text-xs font-serif font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span>Play</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info & quick tip */}
        <div className="p-3 bg-[#f5f0e3] dark:bg-[#080d18] border-t border-[#e2dcc5] dark:border-[#1a263d] text-center text-xs text-[#8c7e6a] dark:text-slate-400 flex items-center justify-between px-5 transition-colors">
          <span>Campaigns are automatically saved in local browser storage on every turn.</span>
          <button
            onClick={() => {
              soundEngine.playLevelUp();
              onCreateNewCampaign();
            }}
            className="text-xs font-serif font-bold text-[#2c1810] dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Launch Wizard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
