import React, { useState, useEffect } from 'react';
import {
  Character,
  CampaignState,
  CampaignSettings,
  StoryChoice,
  ActiveDiceRoll,
  Ability,
  StoryLogEntry,
  InventoryItem,
  StatusEffect,
  LocationInfo,
} from './types';
import {
  PRESET_HEROES,
  INITIAL_LOCATION,
  INITIAL_STORY,
  INITIAL_CHOICES,
  getAbilityModifier,
} from './utils/diceUtils';
import { soundEngine } from './utils/audio';
import { SceneryView } from './components/SceneryView';
import { StoryLogView } from './components/StoryLogView';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceArena } from './components/DiceArena';
import { ActionBar } from './components/ActionBar';
import { CharacterModal } from './components/CharacterModal';
import { CampaignSetupWizard } from './components/CampaignSetupWizard';
import { MusicPlayer } from './components/MusicPlayer';
import { NewItemModal } from './components/NewItemModal';
import { StartingMenu } from './components/StartingMenu';
import { PerchanceStudioModal } from './components/PerchanceStudioModal';
import { generatePerchanceImage, getFixedPerchanceItemImageUrl } from './utils/perchanceAi';
import {
  getSavedCampaigns,
  saveCampaign,
  getActiveCampaignId,
  setActiveCampaignId,
} from './utils/campaignStorage';
import { NarratorModal } from './components/NarratorModal';
import { narratorEngine } from './utils/narrator';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Shield,
  Dices,
  Swords,
  Scroll,
  Settings2,
  Compass,
  Music,
  BookOpen,
  Sun,
  Moon,
  Play,
  Pause,
  Disc3,
  Mic,
} from 'lucide-react';

export default function App() {
  // Theme state (Dark mode vs Light mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Sync dark class on document element
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (err) {
      console.warn('Theme switch error:', err);
    }
  }, [isDarkMode]);

  // Campaign State initialized from multi-campaign storage
  const [campaign, setCampaign] = useState<CampaignState>(() => {
    try {
      const all = getSavedCampaigns();
      const activeId = getActiveCampaignId();
      if (activeId) {
        const found = all.find((c) => c.campaignId === activeId);
        if (found) return found;
      }
      if (all.length > 0) {
        return all[0];
      }
    } catch {
      // fallback to initial
    }

    return {
      campaignId: 'camp-1',
      campaignTitle: 'The Sunken Crypt of Kazal-Dûr',
      settings: {
        ruleStrictness: 'soft',
        difficulty: 'standard',
        storyPremise: 'Subterranean dungeon crypt with ancient ruins and guardians',
      },
      character: PRESET_HEROES[0],
      currentLocation: INITIAL_LOCATION,
      currentStory: INITIAL_STORY,
      choices: INITIAL_CHOICES,
      pendingCheck: null,
      pendingActionDescription: null,
      history: [
        {
          id: 'init-1',
          timestamp: Date.now(),
          type: 'narrative',
          content: INITIAL_STORY,
          speaker: 'Dungeon Master',
        },
      ],
      turnCount: 1,
      inCombat: false,
    };
  });

  const [hasSavedCampaign, setHasSavedCampaign] = useState(true);

  // Starting Menu & Setup Wizard state (Starting Menu open by default as the Adventure Hub)
  const [isStartingMenuOpen, setIsStartingMenuOpen] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isInitializingCampaign, setIsInitializingCampaign] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingScenery, setIsGeneratingScenery] = useState(false);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [activeRoll, setActiveRoll] = useState<ActiveDiceRoll | null>(null);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [musicState, setMusicState] = useState(() => soundEngine.getPlaybackState());
  const [isNarratorModalOpen, setIsNarratorModalOpen] = useState(false);
  const [narratorPlayback, setNarratorPlayback] = useState(() => narratorEngine.getState());
  const [isDiceArenaOpen, setIsDiceArenaOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Subscribe to background music engine
  useEffect(() => {
    const unsub = soundEngine.subscribe((state) => {
      setMusicState({ ...state });
    });
    return () => unsub();
  }, []);

  // Subscribe to Narrator speech engine
  useEffect(() => {
    const unsub = narratorEngine.subscribe((state) => {
      setNarratorPlayback({ ...state });
    });
    return () => unsub();
  }, []);

  // Perchance AI Studio Modal state
  const [isPerchanceStudioOpen, setIsPerchanceStudioOpen] = useState(false);
  const [perchanceStudioPrompt, setPerchanceStudioPrompt] = useState('a retro robot');
  const [perchanceStudioMode, setPerchanceStudioMode] = useState<'portrait' | 'scenery'>('portrait');

  // New Item Loot / Discovery Pop-up state
  const [discoveredItem, setDiscoveredItem] = useState<InventoryItem | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);

  // Mobile viewport tab switcher ('story' | 'character' | 'dice')
  // The mobile dice control opens the Dice Arena modal rather than swapping the
  // pane, so only these two tabs exist.
  const [mobileActiveTab, setMobileActiveTab] = useState<'story' | 'character'>('story');

  // Save campaign state changes to local storage
  useEffect(() => {
    try {
      saveCampaign(campaign);
      setActiveCampaignId(campaign.campaignId);
      setHasSavedCampaign(true);
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  }, [campaign]);

  // Select campaign from Starting Menu
  const handleSelectCampaignFromMenu = (selected: CampaignState) => {
    setCampaign(selected);
    setActiveCampaignId(selected.campaignId);
    setActiveRoll(null);
    setIsStartingMenuOpen(false);
    soundEngine.playLevelUp();
  };

  // Open Create New Adventure from Starting Menu
  const handleCreateNewCampaignFromMenu = () => {
    setIsStartingMenuOpen(false);
    setIsWizardOpen(true);
  };

  // Start / Embark on a new custom campaign from the setup wizard
  const handleStartCampaign = async (settings: CampaignSettings, character: Character) => {
    setIsInitializingCampaign(true);

    try {
      const res = await fetch('/api/campaign/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character,
          ruleStrictness: settings.ruleStrictness,
          difficulty: settings.difficulty,
          storyPremise: settings.storyPremise,
        }),
      });

      if (!res.ok) {
        throw new Error(`Init returned ${res.status}`);
      }

      const data = await res.json();

      const newCampaignState: CampaignState = {
        campaignId: `camp-${Date.now()}`,
        campaignTitle: data.campaignTitle || 'A Grand Adventure',
        settings,
        character,
        currentLocation: data.location || INITIAL_LOCATION,
        currentStory: data.narrative || INITIAL_STORY,
        choices: data.choices || INITIAL_CHOICES,
        pendingCheck: null,
        pendingActionDescription: null,
        history: [
          {
            id: `init-${Date.now()}`,
            timestamp: Date.now(),
            type: 'narrative',
            content: data.narrative || INITIAL_STORY,
            speaker: 'Dungeon Master',
          },
        ],
        turnCount: 1,
        inCombat: false,
      };

      setCampaign(newCampaignState);
      setActiveRoll(null);
      setIsWizardOpen(false);
      soundEngine.playVictory();

      // Trigger automatic Perchance landscape image generation & auto-equip for the new campaign starting location
      if (newCampaignState.currentLocation) {
        generateAndEquipPerchanceScenery(newCampaignState.currentLocation);
      }
    } catch (err) {
      console.error('Failed to init campaign via API, applying local setup:', err);
      // Fallback local init
      const fallbackState: CampaignState = {
        campaignId: `camp-${Date.now()}`,
        campaignTitle: settings.storyPremise.slice(0, 30) + '...',
        settings,
        character,
        currentLocation: INITIAL_LOCATION,
        currentStory: `You step forth on your quest: "${settings.storyPremise}". The shadows part as your hero prepares for the journey ahead!`,
        choices: INITIAL_CHOICES,
        pendingCheck: null,
        pendingActionDescription: null,
        history: [
          {
            id: `init-${Date.now()}`,
            timestamp: Date.now(),
            type: 'narrative',
            content: `You step forth on your quest: "${settings.storyPremise}". The shadows part as your hero prepares for the journey ahead!`,
            speaker: 'Dungeon Master',
          },
        ],
        turnCount: 1,
        inCombat: false,
      };
      setCampaign(fallbackState);
      setIsWizardOpen(false);
      generateAndEquipPerchanceScenery(fallbackState.currentLocation);
    } finally {
      setIsInitializingCampaign(false);
    }
  };

  // Generate a location picture with Perchance landscape format whenever scenery changes and auto-equip it
  const generateAndEquipPerchanceScenery = async (locInfo: LocationInfo) => {
    setIsGeneratingScenery(true);
    try {
      const promptInput = `${locInfo.name}, ${locInfo.atmosphere || 'dramatic fantasy scenery'}, ${locInfo.sceneryPrompt || ''}`.trim();
      const result = await generatePerchanceImage(promptInput, {
        aspectRatio: '16:9',
        stylePreset: 'cinematic-fantasy',
        expandWithGemini: true,
      });

      if (result.imageUrl) {
        setCampaign((prev) => {
          // Auto-equip the generated landscape image to the current location
          return {
            ...prev,
            currentLocation: {
              ...prev.currentLocation,
              sceneryImageUrl: result.imageUrl,
            },
          };
        });
      }
    } catch (err) {
      console.warn('Perchance auto-scenery generation error:', err);
    } finally {
      setIsGeneratingScenery(false);
    }
  };

  // Execute Action via Backend API
  const processTurn = async (actionText: string, roll?: ActiveDiceRoll) => {
    setIsLoading(true);

    try {
      const payload = {
        character: campaign.character,
        action: actionText,
        rollDetails: roll
          ? {
              dieType: roll.dieType,
              roll: roll.baseRoll,
              modifier: roll.modifier,
              total: roll.total,
              dc: roll.dc,
              isCritical: roll.isCritical,
              isFumble: roll.isFumble,
            }
          : undefined,
        history: campaign.history,
        currentLocation: campaign.currentLocation,
        inCombat: campaign.inCombat,
        combatEnemy: campaign.combatEnemy,
        settings: campaign.settings,
      };

      const res = await fetch('/api/campaign/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // Applies this turn's DM updates on top of whatever the character looks
      // like right now. It runs inside the setCampaign updater below so that
      // any change made while the request was in flight (an item taken, an HP
      // tweak, a new portrait) is not overwritten by a stale snapshot.
      const applyCharacterUpdates = (base: Character): Character => {
        const updatedChar: Character = { ...base };

        // 1. Decrement duration on active status effects
        let currentEffects = (updatedChar.statusEffects || [])
          .map((eff) => {
            if (eff.durationTurns !== undefined) {
              return { ...eff, durationTurns: eff.durationTurns - 1 };
            }
            return eff;
          })
          .filter((eff) => eff.durationTurns === undefined || eff.durationTurns > 0);

        if (data.characterUpdates) {
          if (data.characterUpdates.hpChange) {
            updatedChar.hp = Math.max(
              0,
              Math.min(updatedChar.maxHp, updatedChar.hp + data.characterUpdates.hpChange)
            );
          }
          if (data.characterUpdates.goldChange) {
            updatedChar.gold = Math.max(0, updatedChar.gold + data.characterUpdates.goldChange);
          }

          // Apply new status effects from DM
          if (data.characterUpdates.addedStatusEffects && Array.isArray(data.characterUpdates.addedStatusEffects)) {
            for (const newEff of data.characterUpdates.addedStatusEffects) {
              const effItem: StatusEffect = {
                id: newEff.id || `eff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: newEff.name,
                type: newEff.type || 'debuff',
                description: newEff.description || 'Condition applied.',
                mechanicalEffect: newEff.mechanicalEffect,
                durationTurns: newEff.durationTurns,
                icon: newEff.icon || (newEff.type === 'buff' ? 'Sparkles' : 'Skull'),
                color: newEff.color || (newEff.type === 'buff' ? '#10b981' : '#ef4444'),
                source: 'DM Narrative Encounter',
              };
              currentEffects = [
                ...currentEffects.filter((e) => e.name.toLowerCase() !== effItem.name.toLowerCase()),
                effItem,
              ];
            }
          }

          // Remove cured or expired status effects from DM
          if (data.characterUpdates.removedStatusEffectIds && Array.isArray(data.characterUpdates.removedStatusEffectIds)) {
            const removeList = data.characterUpdates.removedStatusEffectIds.map((s: string) => String(s).toLowerCase());
            currentEffects = currentEffects.filter(
              (e) => !removeList.includes(e.id.toLowerCase()) && !removeList.includes(e.name.toLowerCase())
            );
          }
        }

        updatedChar.statusEffects = currentEffects;
        return updatedChar;
      };

      // Sound and modal side effects belong outside the state updater, which
      // React may invoke more than once.
      if (data.characterUpdates) {
        if (data.characterUpdates.hpChange < 0) {
          soundEngine.playSwordStrike();
        } else if (data.characterUpdates.hpChange > 0) {
          soundEngine.playHeal();
        }

        if (data.characterUpdates.newItem) {
          const rawItem = data.characterUpdates.newItem;
          const craftedItem: InventoryItem = {
            id: rawItem.id || `item-${Date.now()}`,
            name: rawItem.name,
            type: rawItem.type || 'misc',
            description: rawItem.description || 'Acquired in the dungeon.',
            quantity: rawItem.quantity || 1,
            valueGold: rawItem.valueGold || 15,
            damage: rawItem.damage,
            bonus: rawItem.bonus,
            acBonus: rawItem.acBonus,
            imageUrl: (rawItem.imageUrl && !rawItem.imageUrl.startsWith('data:image/svg+xml;base64,PHN2Zw')) 
              ? rawItem.imageUrl 
              : getFixedPerchanceItemImageUrl(rawItem),
          };

          // Hold item for the interactive discovery pop-up modal
          setDiscoveredItem(craftedItem);
          setIsNewItemModalOpen(true);
          soundEngine.playVictory();
        }
      }

      // Append new turn to history
      const newHistoryEntry: StoryLogEntry = {
        id: `turn-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: data.narrative,
        speaker: 'Dungeon Master',
        rollDetails: roll
          ? {
              roll: roll.baseRoll,
              modifier: roll.modifier,
              total: roll.total,
              dc: roll.dc,
              success: roll.success,
              isCritical: roll.isCritical,
              isFumble: roll.isFumble,
              label: roll.purpose || 'Action Check',
            }
          : undefined,
      };

      const prevLocation = campaign.currentLocation;
      const prevLocationName = prevLocation?.name;
      const incomingLocation = data.location;

      // Determine if a genuine major scene change occurred (e.g. from library to bar, dungeon to forest):
      // 1. Explicitly flagged by DM in isMajorSceneChange, or
      // 2. Location name changed to a completely new distinct area name
      const isMajorSceneChange = Boolean(
        data.isMajorSceneChange === true ||
        (incomingLocation?.name &&
          prevLocationName &&
          incomingLocation.name.trim().toLowerCase() !== prevLocationName.trim().toLowerCase())
      );

      // Preserve the current scenery image unless an actual major scene transition occurred
      const finalLocation: LocationInfo = incomingLocation
        ? {
            ...incomingLocation,
            sceneryImageUrl: isMajorSceneChange
              ? incomingLocation.sceneryImageUrl
              : (prevLocation?.sceneryImageUrl || incomingLocation.sceneryImageUrl),
            sceneryPrompt: isMajorSceneChange
              ? (incomingLocation.sceneryPrompt || prevLocation?.sceneryPrompt || '')
              : (prevLocation?.sceneryPrompt || incomingLocation.sceneryPrompt || ''),
          }
        : prevLocation;

      setCampaign((prev) => ({
        ...prev,
        character: applyCharacterUpdates(prev.character),
        currentStory: data.narrative,
        currentLocation: finalLocation,
        choices: data.choices || prev.choices,
        pendingCheck: data.pendingCheck || null,
        pendingActionDescription: null,
        history: [...prev.history, newHistoryEntry],
        turnCount: prev.turnCount + 1,
        inCombat: Boolean(data.inCombat),
        combatEnemy: data.combatEnemy || undefined,
      }));

      // Automatically generate a new scenery picture ONLY when a big scene change happens or if no initial scenery exists
      if (finalLocation && (isMajorSceneChange || !finalLocation.sceneryImageUrl)) {
        generateAndEquipPerchanceScenery(finalLocation);
      }
    } catch (err) {
      console.error('Failed to progress story via API, applying narrative fallback:', err);
      const isSuccess = roll ? roll.success : true;
      const fallbackStory = `You act decisively: "${actionText}". ${
        roll
          ? `With a roll of ${roll.total} (Natural ${roll.baseRoll} + ${roll.modifier}) against DC ${roll.dc || 12}: ${
              roll.isCritical ? 'A legendary critical success!' : isSuccess ? 'You succeed under pressure!' : 'A narrow struggle!'
            }.`
          : ''
      } The stone corridors reverberate as arcane dust swirls into the torchlight. You steady your stance, taking note of fresh runes glowing along the walls as new paths open before you.`;

      const fallbackChoices: StoryChoice[] = [
        {
          id: `fb-${Date.now()}-1`,
          label: 'Advance deeper into the chamber',
          description: 'Follow the glowing ley runes along the flagstones with weapon at the ready.',
          riskLevel: 'moderate',
          check: campaign.settings.ruleStrictness === 'none' ? undefined : { ability: 'WIS', skillName: 'Perception', dc: 12, reason: 'Scan for concealed floor pressure plates.' },
        },
        {
          id: `fb-${Date.now()}-2`,
          label: 'Search the perimeter for hidden secrets or loot',
          description: 'Inspect the cracked stone urns, ancient inscriptions, and wall sconces.',
          riskLevel: 'safe',
          check: campaign.settings.ruleStrictness === 'none' ? undefined : { ability: 'INT', skillName: 'Investigation', dc: 12, reason: 'Decipher the riddle inscribed on the pillar.' },
        },
        {
          id: `fb-${Date.now()}-3`,
          label: 'Take a short breather and brace defenses',
          description: 'Catch your breath, check your gear straps, and prepare a defensive stance.',
          riskLevel: 'safe',
        },
        {
          id: `fb-${Date.now()}-4`,
          label: 'Cast a magical flare or call out into the darkness',
          description: 'Illuminate the shadowy rafters or challenge whatever lurks beyond to reveal itself.',
          riskLevel: 'risky',
          check: campaign.settings.ruleStrictness === 'none' ? undefined : { ability: 'CHA', skillName: 'Intimidation', dc: 13, reason: 'Command authority over lurking beasts.' },
        },
      ];

      const fallbackEntry: StoryLogEntry = {
        id: `turn-fb-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: fallbackStory,
        speaker: 'Dungeon Master',
        rollDetails: roll
          ? {
              roll: roll.baseRoll,
              modifier: roll.modifier,
              total: roll.total,
              dc: roll.dc,
              success: roll.success,
              isCritical: roll.isCritical,
              isFumble: roll.isFumble,
              label: roll.purpose || 'Action Check',
            }
          : undefined,
      };

      setCampaign((prev) => ({
        ...prev,
        currentStory: fallbackStory,
        choices: fallbackChoices,
        history: [...prev.history, fallbackEntry],
        turnCount: prev.turnCount + 1,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Choice button clicked
  const handleSelectChoice = (choice: StoryChoice) => {
    if (choice.check) {
      // If choice has a required check, set pending check and roll d20
      const ability = choice.check.ability;
      const mod = getAbilityModifier(
        campaign.character.stats[ability.toLowerCase() as keyof typeof campaign.character.stats]
      );
      setCampaign((prev) => ({
        ...prev,
        pendingCheck: choice.check!,
        pendingActionDescription: choice.label,
      }));

      const rollBase = Math.floor(Math.random() * 20) + 1;
      const isCrit = rollBase === 20;
      const isFumble = rollBase === 1;
      const total = rollBase + mod;
      const success = isCrit ? true : isFumble ? false : total >= choice.check.dc;

      // Trigger automatic roll or prompt in dice arena
      const activeDieRoll: ActiveDiceRoll = {
        id: `roll-${Date.now()}`,
        dieType: 'd20',
        baseRoll: rollBase,
        modifier: mod,
        total,
        dc: choice.check.dc,
        purpose: `${choice.check.skillName || choice.check.ability} Check: ${choice.label}`,
        timestamp: Date.now(),
        isCritical: isCrit,
        isFumble,
        success,
      };

      setActiveRoll(activeDieRoll);
      setIsDiceArenaOpen(true);
      soundEngine.playDiceRoll();
      processTurn(choice.label, activeDieRoll);
    } else {
      processTurn(choice.label);
    }
  };

  // Custom player action submitted
  const handleCustomAction = (text: string) => {
    processTurn(text);
  };

  // Trigger stat roll directly from character sheet
  const handleTriggerStatRoll = (ability: Ability, label: string) => {
    const mod = getAbilityModifier(
      campaign.character.stats[ability.toLowerCase() as keyof typeof campaign.character.stats]
    );
    const rollBase = Math.floor(Math.random() * 20) + 1;
    const total = rollBase + mod;
    const isCrit = rollBase === 20;
    const isFumble = rollBase === 1;

    const newRoll: ActiveDiceRoll = {
      id: `roll-${Date.now()}`,
      dieType: 'd20',
      baseRoll: rollBase,
      modifier: mod,
      total,
      isCritical: isCrit,
      isFumble,
      purpose: label,
      timestamp: Date.now(),
    };

    setActiveRoll(newRoll);
    setIsDiceArenaOpen(true);
    soundEngine.playDiceRoll();

    // Add roll log entry to history
    const logEntry: StoryLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'check_result',
      content: `Hero rolled ${label}: Natural ${rollBase} + ${mod} = ${total}`,
      rollDetails: {
        roll: rollBase,
        modifier: mod,
        total,
        isCritical: isCrit,
        isFumble,
        label,
      },
    };

    setCampaign((prev) => ({
      ...prev,
      history: [...prev.history, logEntry],
    }));
  };

  // Quick Roll D20 button
  const handleQuickRoll = () => {
    handleTriggerStatRoll('DEX', 'Quick Reflex Check');
    setIsDiceArenaOpen(true);
  };

  // Regenerate Scenery with Perchance AI Image generator (Landscape format)
  const handleRegenerateScenery = async () => {
    if (isGeneratingScenery) return;
    await generateAndEquipPerchanceScenery(campaign.currentLocation);
  };

  // Regenerate Character Portrait with Perchance AI Image model
  const handleGeneratePortrait = async () => {
    if (isGeneratingPortrait) return;
    setIsGeneratingPortrait(true);

    try {
      const prompt =
        campaign.character.portraitPrompt ||
        `Masterpiece high fantasy digital painting character portrait of ${campaign.character.name}, a Level ${campaign.character.level} ${campaign.character.race} ${campaign.character.className}, dramatic rim lighting, detailed concept art.`;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: '1:1',
          modelChoice: 'perchance',
          characterName: campaign.character.name,
          className: campaign.character.className,
          race: campaign.character.race,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setCampaign((prev) => ({
            ...prev,
            character: {
              ...prev.character,
              portraitUrl: data.imageUrl,
            },
          }));
          soundEngine.playLevelUp();
        }
      } else {
        throw new Error('Portrait request failed');
      }
    } catch (err) {
      console.warn('Portrait generation error:', err);
      // Generate dynamic fresh AI portrait URL with Perchance API
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      const cleanPrompt = `${campaign.character.race} ${campaign.character.className} fantasy portrait ${campaign.character.name}`;
      const dynamicAiUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=square&seed=${dynamicSeed}`;
      setCampaign((prev) => ({
        ...prev,
        character: {
          ...prev.character,
          portraitUrl: dynamicAiUrl,
        },
      }));
      soundEngine.playLevelUp();
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Discovered Item Handlers (Take, Leave, Equip, Use)
  const handleTakeDiscoveredItem = (item: InventoryItem) => {
    setCampaign((prev) => {
      const existingIdx = prev.character.inventory.findIndex(
        (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.type === item.type
      );
      let updatedInv: InventoryItem[];
      if (existingIdx >= 0 && item.type !== 'weapon' && item.type !== 'armor') {
        updatedInv = [...prev.character.inventory];
        updatedInv[existingIdx] = {
          ...updatedInv[existingIdx],
          quantity: (updatedInv[existingIdx].quantity || 1) + (item.quantity || 1),
        };
      } else {
        updatedInv = [...prev.character.inventory, { ...item, equipped: false }];
      }

      const logEntry: StoryLogEntry = {
        id: `log-item-take-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: `📦 [Item Acquired] You placed the ${item.name} into your backpack.`,
        speaker: 'Dungeon Master',
      };

      return {
        ...prev,
        character: {
          ...prev.character,
          inventory: updatedInv,
        },
        history: [...prev.history, logEntry],
      };
    });

    setIsNewItemModalOpen(false);
    setDiscoveredItem(null);
  };

  const handleLeaveDiscoveredItem = (item: InventoryItem) => {
    setCampaign((prev) => {
      const logEntry: StoryLogEntry = {
        id: `log-item-leave-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: `✋ [Item Left Behind] You chose not to take the ${item.name}, leaving it where it rested.`,
        speaker: 'Dungeon Master',
      };

      return {
        ...prev,
        history: [...prev.history, logEntry],
      };
    });

    setIsNewItemModalOpen(false);
    setDiscoveredItem(null);
  };

  const handleEquipDiscoveredItem = (item: InventoryItem) => {
    setCampaign((prev) => {
      let updatedChar = { ...prev.character };

      // Calculate armor AC adjustment if armor
      if (item.type === 'armor' && item.acBonus) {
        const prevArmors = updatedChar.inventory.filter((i) => i.type === 'armor' && i.equipped);
        const prevAcSum = prevArmors.reduce((sum, a) => sum + (a.acBonus || 0), 0);
        updatedChar.ac = Math.max(10, updatedChar.ac - prevAcSum + item.acBonus);
      }

      const itemWithEquip: InventoryItem = { ...item, equipped: true };
      const updatedInv = [
        ...updatedChar.inventory.map((i) => {
          if (item.type === 'armor' && i.type === 'armor') {
            return { ...i, equipped: false };
          }
          return i;
        }),
        itemWithEquip,
      ];

      updatedChar.inventory = updatedInv;

      const logEntry: StoryLogEntry = {
        id: `log-item-equip-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: `⚔️ [Equipped] You immediately donned / wielded the ${item.name}${
          item.damage ? ` (${item.damage})` : ''
        }${item.acBonus ? ` (+${item.acBonus} AC, total AC: ${updatedChar.ac})` : ''}!`,
        speaker: 'Dungeon Master',
      };

      return {
        ...prev,
        character: updatedChar,
        history: [...prev.history, logEntry],
      };
    });

    setIsNewItemModalOpen(false);
    setDiscoveredItem(null);
  };

  const handleUseDiscoveredItem = (item: InventoryItem) => {
    setCampaign((prev) => {
      let updatedChar = { ...prev.character };
      let effectNarrative = '';

      if (item.type === 'potion') {
        // 2d4+4 (6 to 12), matching the healing potion text.
        const healAmount =
          Math.floor(Math.random() * 4) + 1 + Math.floor(Math.random() * 4) + 1 + 4;
        const oldHp = updatedChar.hp;
        updatedChar.hp = Math.min(updatedChar.maxHp, updatedChar.hp + healAmount);
        const healed = updatedChar.hp - oldHp;
        effectNarrative = `🧪 [Consumed] You drank the ${item.name} immediately, restoring ${healed} HP (HP: ${updatedChar.hp}/${updatedChar.maxHp})!`;
      } else if (item.type === 'scroll') {
        effectNarrative = `📜 [Invoked] You read the mystical incantations on the ${item.name}, channeling its power!`;
      } else {
        effectNarrative = `✨ [Used] You activated the ${item.name}!`;
      }

      const logEntry: StoryLogEntry = {
        id: `log-item-use-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: effectNarrative,
        speaker: 'Dungeon Master',
      };

      return {
        ...prev,
        character: updatedChar,
        history: [...prev.history, logEntry],
      };
    });

    setIsNewItemModalOpen(false);
    setDiscoveredItem(null);
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const next = soundEngine.toggleSound();
    setSoundEnabled(next);
    if (!next) {
      narratorEngine.stop();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fdfaf1] dark:bg-[#090d16] text-[#2c1810] dark:text-[#f8fafc] font-sans overflow-hidden select-none selection:bg-[#e2dcc5] dark:selection:bg-[#1e293b] transition-colors duration-200">
      {/* Top Application Navigation Bar */}
      <header className="h-12 bg-[#fdfaf1]/95 dark:bg-[#0f172a]/95 border-b border-[#e2dcc5] dark:border-[#1e293b] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 shadow-xs backdrop-blur-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 border border-[#4a3227] dark:border-amber-400 flex items-center justify-center shadow-sm">
              <Dices className="w-4 h-4 text-[#b8ae8f] dark:text-slate-950" />
            </div>
            <h1 className="font-bold text-sm sm:text-base tracking-wide font-serif text-[#2c1810] dark:text-[#f8fafc] italic">
              D&D Solo Campaign DM
            </h1>
          </div>
          <span className="hidden md:inline text-xs text-[#b8ae8f] dark:text-[#475569] font-mono">|</span>
          <span className="hidden md:inline text-xs text-[#8c7e6a] dark:text-[#94a3b8] font-serif font-medium truncate max-w-xs">
            {campaign.campaignTitle}
          </span>
          
          {/* Rules & Difficulty Badges */}
          <div className="hidden lg:flex items-center gap-1.5 ml-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f5f0e3] dark:bg-[#1e293b] border border-[#e2dcc5] dark:border-[#334155] text-[#4a3227] dark:text-amber-300 capitalize">
              {campaign.settings?.ruleStrictness || 'soft'} rules
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e2dcc5]/60 dark:bg-[#1e293b] border border-[#b8ae8f] dark:border-[#334155] text-[#2c1810] dark:text-[#cbd5e1] capitalize">
              {campaign.settings?.difficulty || 'standard'}
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Dice Arena Modal Trigger Button */}
          <button
            onClick={() => setIsDiceArenaOpen(true)}
            title="Open Dice Arena (Roll d20, d12, d10, d8, d6, d4, d100)"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border border-[#e2dcc5] dark:border-[#334155] transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer relative"
          >
            <Dices className="w-3.5 h-3.5 text-[#8c7e6a] dark:text-amber-400" />
            <span className="hidden sm:inline">Dice Arena</span>
            {campaign.pendingCheck && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* Adventures Hub / Campaign Storage Button */}
          <button
            onClick={() => setIsStartingMenuOpen(true)}
            title="Campaign Storage & Quest Chronicle Hub: Switch or Create Adventures"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#f5f0e3] dark:bg-[#1e293b] hover:bg-[#eae3ce] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border border-[#b8ae8f] dark:border-[#334155] transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#4a3227] dark:text-amber-400" />
            <span className="hidden sm:inline">Quests</span>
          </button>

          {/* Campaign Music Studio Button */}
          <button
            onClick={() => setIsMusicPlayerOpen(true)}
            title={
              musicState.isPlaying
                ? `Playing: ${musicState.currentComposition?.title || 'Fantasy Soundtrack'} (Click to open studio)`
                : "Campaign Music Studio"
            }
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer ${
              musicState.isPlaying
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400/50'
                : 'bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border-[#e2dcc5] dark:border-[#334155]'
            }`}
          >
            {musicState.isPlaying ? (
              <Disc3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
            ) : (
              <Music className="w-3.5 h-3.5 text-[#8c7e6a] dark:text-[#94a3b8]" />
            )}
            <span className="hidden md:inline">
              {musicState.isPlaying ? 'Music Playing' : 'Music'}
            </span>
          </button>

          {/* AI Dungeon Master Narrator Studio Button */}
          <button
            id="btn-open-narrator-studio-header"
            onClick={() => setIsNarratorModalOpen(true)}
            title={
              narratorPlayback.isPlaying
                ? `Narrating: ${narratorPlayback.voiceName} (${narratorPlayback.rate}x) - Click to customize`
                : "Dungeon Master Narrator Studio: Change AI Voice & Speech Speed"
            }
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer ${
              narratorPlayback.isPlaying
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border-[#e2dcc5] dark:border-[#334155]'
            }`}
          >
            <Mic className={`w-3.5 h-3.5 ${narratorPlayback.isPlaying ? 'text-slate-950' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">
              {narratorPlayback.isPlaying ? `Narrating (${narratorPlayback.rate}x)` : 'Narrator'}
            </span>
          </button>

          {/* Perchance AI Image Studio Button */}
          <button
            id="btn-open-perchance-studio-header"
            onClick={() => {
              setPerchanceStudioPrompt('a retro robot');
              setPerchanceStudioMode('portrait');
              setIsPerchanceStudioOpen(true);
            }}
            title="Perchance AI Image Studio (Gemini Prompt Expansion + Perchance API)"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Perchance AI</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
            className="p-1.5 rounded-lg bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border border-[#e2dcc5] dark:border-[#334155] transition-colors shadow-xs cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#4a3227] dark:text-amber-400" /> : <VolumeX className="w-4 h-4 text-[#8c7e6a] dark:text-[#64748b]" />}
          </button>

          {/* Theme Mode Switch (Light / Dark) */}
          <button
            id="btn-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded-lg bg-white dark:bg-[#1e293b] hover:bg-[#f5f0e3] dark:hover:bg-[#283548] text-[#2c1810] dark:text-[#f8fafc] border border-[#e2dcc5] dark:border-[#334155] transition-colors shadow-xs cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#4a3227]" />
            )}
          </button>

          {/* New Campaign / Campaign Wizard Button */}
          <button
            onClick={() => setIsWizardOpen(true)}
            title="Create Custom Campaign / Change Rules & Story"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#2c1810] dark:bg-amber-500 hover:bg-[#4a3227] dark:hover:bg-amber-400 text-[#fdfaf1] dark:text-slate-950 transition-all flex items-center gap-1.5 text-xs font-serif font-bold shadow-xs cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#b8ae8f] dark:text-slate-950" />
            <span className="hidden sm:inline">New Quest</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher (Visible on small screens / mobile aspect ratios) */}
      <div className="lg:hidden flex items-center justify-around bg-[#fdfaf1] dark:bg-[#0f172a] border-b border-[#e2dcc5] dark:border-[#1e293b] px-2 py-1.5 shrink-0 z-20 shadow-2xs transition-colors">
        <button
          onClick={() => setMobileActiveTab('story')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
            mobileActiveTab === 'story'
              ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 shadow-xs'
              : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#f5f0e3] dark:hover:bg-[#1e293b] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Chronicle</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('character')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
            mobileActiveTab === 'character'
              ? 'bg-[#2c1810] dark:bg-amber-500 text-[#fdfaf1] dark:text-slate-950 shadow-xs'
              : 'text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#f5f0e3] dark:hover:bg-[#1e293b] hover:text-[#2c1810] dark:hover:text-[#f8fafc]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Hero ({campaign.character.hp}/{campaign.character.maxHp})</span>
        </button>

        <button
          onClick={() => setIsDiceArenaOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer text-[#8c7e6a] dark:text-[#94a3b8] hover:bg-[#f5f0e3] dark:hover:bg-[#1e293b] hover:text-[#2c1810] dark:hover:text-[#f8fafc]"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Dice Arena</span>
          {campaign.pendingCheck && (
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>

      {/* Mobile Active View Container (< lg screens) */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2.5">
        {mobileActiveTab === 'story' && (
          <div className="flex-1 min-h-[460px]">
            <StoryLogView
              currentStory={campaign.currentStory}
              history={campaign.history}
              isLoading={isLoading}
              inCombat={campaign.inCombat}
              location={campaign.currentLocation}
              turnCount={campaign.turnCount}
              onRegenerateScenery={handleRegenerateScenery}
              isGeneratingScenery={isGeneratingScenery}
              onOpenPerchanceStudio={() => {
                setPerchanceStudioPrompt(campaign.currentLocation.name);
                setPerchanceStudioMode('scenery');
                setIsPerchanceStudioOpen(true);
              }}
              onOpenNarratorStudio={() => setIsNarratorModalOpen(true)}
            />
          </div>
        )}

        {mobileActiveTab === 'character' && (
          <div className="flex-1 min-h-[460px]">
            <CharacterSheet
              character={campaign.character}
              onUpdateCharacter={(updater) =>
                setCampaign((prev) => ({ ...prev, character: updater(prev.character) }))
              }
              onTriggerStatRoll={handleTriggerStatRoll}
              onGeneratePortrait={handleGeneratePortrait}
              isGeneratingPortrait={isGeneratingPortrait}
              onOpenCharacterModal={() => setIsCharacterModalOpen(true)}
            />
          </div>
        )}

      </div>

      {/* Desktop Layout: Left Column (7 Cols) = Unified Scenery & Story View, Right Column (5 Cols) = Full-Height Character Sheet */}
      <main className="hidden lg:grid flex-1 grid-cols-12 gap-3.5 p-3.5 min-h-0 overflow-hidden">
        {/* LEFT COLUMN (7 Cols): Unified Scenery & Chronicle Text in One Tab */}
        <div className="col-span-7 flex flex-col min-h-0 h-full overflow-hidden">
          <StoryLogView
            currentStory={campaign.currentStory}
            history={campaign.history}
            isLoading={isLoading}
            inCombat={campaign.inCombat}
            location={campaign.currentLocation}
            turnCount={campaign.turnCount}
            onRegenerateScenery={handleRegenerateScenery}
            isGeneratingScenery={isGeneratingScenery}
            onOpenPerchanceStudio={() => {
              setPerchanceStudioPrompt(campaign.currentLocation.name);
              setPerchanceStudioMode('scenery');
              setIsPerchanceStudioOpen(true);
            }}
            onOpenNarratorStudio={() => setIsNarratorModalOpen(true)}
          />
        </div>

        {/* RIGHT COLUMN (5 Cols): Dedicated Full-Height Character Sheet */}
        <div className="col-span-5 flex flex-col min-h-0 h-full overflow-hidden">
          <CharacterSheet
            character={campaign.character}
            onUpdateCharacter={(updater) =>
              setCampaign((prev) => ({ ...prev, character: updater(prev.character) }))
            }
            onTriggerStatRoll={handleTriggerStatRoll}
            onGeneratePortrait={handleGeneratePortrait}
            isGeneratingPortrait={isGeneratingPortrait}
            onOpenCharacterModal={() => setIsCharacterModalOpen(true)}
          />
        </div>
      </main>

      {/* BOTTOM ACTION BAR: 4 Procedural Choice Buttons + Custom Player Text Input */}
      <footer className="shrink-0">
        <ActionBar
          choices={campaign.choices}
          onSelectChoice={handleSelectChoice}
          onCustomAction={handleCustomAction}
          onQuickRoll={handleQuickRoll}
          isLoading={isLoading}
        />
      </footer>

      {/* Dice Arena Modal / Floating Pop-up */}
      {isDiceArenaOpen && (
        <div
          id="dice-arena-modal"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDiceArenaOpen(false);
          }}
        >
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-[#fdfaf1] dark:bg-[#0f172a] rounded-2xl shadow-2xl border-2 border-[#b8ae8f] dark:border-[#334155] overflow-hidden">
            <DiceArena
              activeRoll={activeRoll}
              pendingCheck={campaign.pendingCheck}
              onClose={() => setIsDiceArenaOpen(false)}
              onExecuteRoll={(roll) => {
                setActiveRoll(roll);
                if (campaign.pendingActionDescription) {
                  processTurn(campaign.pendingActionDescription, roll);
                }
              }}
              modifier={
                campaign.pendingCheck
                  ? getAbilityModifier(
                      campaign.character.stats[
                        campaign.pendingCheck.ability.toLowerCase() as keyof typeof campaign.character.stats
                      ]
                    )
                  : 0
              }
            />
          </div>
        </div>
      )}

      {/* Hero Selection & Customization Modal */}
      <CharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        currentCharacter={campaign.character}
        onSelectCharacter={(newHero) =>
          setCampaign((prev) => ({ ...prev, character: newHero }))
        }
      />

      {/* Lyria Campaign Music Studio */}
      <MusicPlayer
        isOpen={isMusicPlayerOpen}
        onClose={() => setIsMusicPlayerOpen(false)}
        campaignAtmosphere={
          campaign.currentLocation?.atmosphere ||
          campaign.currentStory ||
          campaign.campaignTitle
        }
      />

      {/* New Item Discovered Interactive Pop-up Tab */}
      <NewItemModal
        isOpen={isNewItemModalOpen}
        item={discoveredItem}
        onTake={handleTakeDiscoveredItem}
        onLeave={handleLeaveDiscoveredItem}
        onEquip={handleEquipDiscoveredItem}
        onUse={handleUseDiscoveredItem}
        onClose={() => {
          setIsNewItemModalOpen(false);
          setDiscoveredItem(null);
        }}
      />

      {/* Full Campaign Setup Onboarding Wizard */}
      {isWizardOpen && (
        <CampaignSetupWizard
          onStartCampaign={handleStartCampaign}
          isInitializing={isInitializingCampaign}
          onCancel={() => setIsWizardOpen(false)}
          canCancel={hasSavedCampaign}
        />
      )}

      {/* Starting Menu / Adventures Quest Hub */}
      <StartingMenu
        isOpen={isStartingMenuOpen}
        currentCampaign={campaign}
        onSelectCampaign={handleSelectCampaignFromMenu}
        onCreateNewCampaign={handleCreateNewCampaignFromMenu}
        onClose={() => setIsStartingMenuOpen(false)}
      />

      {/* Background Music Floating Mini-Player (Visible when music is active & modal closed) */}
      {musicState.currentComposition && !isMusicPlayerOpen && (
        <div
          id="floating-music-dock"
          className="fixed bottom-3 right-3 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#2c1810]/95 dark:bg-[#0f172a]/95 text-[#fdfaf1] dark:text-[#f8fafc] border border-[#b8ae8f]/50 dark:border-[#334155] shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 duration-200 max-w-[280px] sm:max-w-xs"
        >
          <button
            type="button"
            onClick={() => {
              if (musicState.isPlaying) {
                soundEngine.pauseMusic();
              } else {
                soundEngine.resumeMusic();
              }
            }}
            title={musicState.isPlaying ? 'Pause Background Music' : 'Resume Background Music'}
            className="w-7 h-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            {musicState.isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          <div
            onClick={() => setIsMusicPlayerOpen(true)}
            className="flex-1 min-w-0 cursor-pointer group"
            title="Click to open full Music Studio"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-serif font-bold truncate group-hover:text-amber-400 transition-colors">
                {musicState.currentComposition.title}
              </span>
            </div>
            <p className="text-[9px] text-[#b8ae8f] dark:text-[#94a3b8] truncate flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${musicState.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
              {musicState.isPlaying ? 'Playing • Click for Studio' : 'Paused'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMusicPlayerOpen(true)}
            title="Open Music Studio"
            className="p-1 rounded-lg hover:bg-white/10 text-[#b8ae8f] dark:text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
          >
            <Disc3 className={`w-4 h-4 ${musicState.isPlaying ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Background Narrator Floating Mini-Player (Visible when narration is active & modal closed) */}
      {narratorPlayback.isPlaying && !isNarratorModalOpen && (
        <div
          id="floating-narrator-dock"
          className="fixed bottom-16 right-3 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-950/95 text-amber-100 border border-amber-500/50 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 duration-200 max-w-[280px] sm:max-w-xs"
        >
          <button
            type="button"
            onClick={() => {
              if (narratorPlayback.isPaused) {
                narratorEngine.resume();
              } else {
                narratorEngine.pause();
              }
            }}
            title={narratorPlayback.isPaused ? 'Resume Narration' : 'Pause Narration'}
            className="w-7 h-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs font-bold"
          >
            {narratorPlayback.isPaused ? (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>

          <div
            onClick={() => setIsNarratorModalOpen(true)}
            className="flex-1 min-w-0 cursor-pointer group"
            title="Click to open Voice & Speed Studio"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-serif font-bold truncate group-hover:text-amber-300 transition-colors">
                DM Voice: {narratorPlayback.voiceName}
              </span>
            </div>
            <p className="text-[9px] text-amber-300/80 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>{narratorPlayback.rate}x speed • Click to Tune</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => narratorEngine.stop()}
            title="Stop Narration"
            className="p-1 rounded-lg hover:bg-white/10 text-amber-300 hover:text-red-300 transition-colors cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Narrator / TTS Voice & Speed Tuning Modal */}
      <NarratorModal
        isOpen={isNarratorModalOpen}
        onClose={() => setIsNarratorModalOpen(false)}
        currentStoryText={campaign.currentStory}
      />

      {/* Perchance AI Image Studio Modal */}
      <PerchanceStudioModal
        isOpen={isPerchanceStudioOpen}
        onClose={() => setIsPerchanceStudioOpen(false)}
        initialPrompt={perchanceStudioPrompt}
        initialMode={perchanceStudioMode}
        onApplyPortrait={(imageUrl) => {
          setCampaign((prev) => ({
            ...prev,
            character: {
              ...prev.character,
              portraitUrl: imageUrl,
            },
          }));
        }}
        onApplyScenery={(imageUrl) => {
          setCampaign((prev) => ({
            ...prev,
            currentLocation: {
              ...prev.currentLocation,
              sceneryImageUrl: imageUrl,
            },
          }));
        }}
      />
    </div>
  );
}

