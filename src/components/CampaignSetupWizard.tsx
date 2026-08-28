import React, { useState, useEffect } from 'react';
import {
  Character,
  CampaignSettings,
  RuleStrictness,
  DifficultyLevel,
  InventoryItem,
  StoryHeroConcept,
  CustomRace,
  CustomClass,
} from '../types';
import {
  STARTING_CLASSES,
  STARTING_RACES,
  ITEM_CATALOG,
  STORY_REALM_PRESETS,
  getThematicItemsForPremise,
  getRecommendedRacesForPremise,
  getStoryHeroConceptsForPremise,
  getAbilityModifier,
  getStoredCustomRaces,
  saveCustomRace,
  deleteCustomRace,
  getStoredCustomClasses,
  saveCustomClass,
  deleteCustomClass,
} from '../utils/diceUtils';
import { soundEngine } from '../utils/audio';
import { generateCharacterAvatarSvg } from '../utils/svgArt';
import { generatePerchanceImage, expandPromptWithGemini, getFixedPerchanceItemImageUrl } from '../utils/perchanceAi';
import { ItemDetailsModal } from './ItemDetailsModal';
import { WizardStep1Story, PROMPT_INSPIRATION_SPARKS } from './wizard/WizardStep1Story';
import { WizardStep2RacesClasses } from './wizard/WizardStep2RacesClasses';
import { WizardStep3HeroRelics } from './wizard/WizardStep3HeroRelics';
import { WizardStep4Review } from './wizard/WizardStep4Review';
import { CustomRaceModal } from './wizard/CustomRaceModal';
import { CustomClassModal } from './wizard/CustomClassModal';
import {
  Crown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

interface CampaignSetupWizardProps {
  onStartCampaign: (settings: CampaignSettings, character: Character) => Promise<void>;
  isInitializing: boolean;
  onCancel?: () => void;
  canCancel?: boolean;
}

export function CampaignSetupWizard({
  onStartCampaign,
  isInitializing,
  onCancel,
  canCancel = false,
}: CampaignSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ----------------------------------------------------
  // STEP 1: Story Prompt & Narrative Genesis
  // ----------------------------------------------------
  const [storyPremise, setStoryPremise] = useState<string>(STORY_REALM_PRESETS[0].premise);
  const [promptTone, setPromptTone] = useState<string>('Freeform & Story-Native');
  const [promptFocus, setPromptFocus] = useState<string>('Freeform Narrative');
  const [promptPacing, setPromptPacing] = useState<string>('Story-Driven & Flexible');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [isSynthesized, setIsSynthesized] = useState<boolean>(false);

  // Synthesized Campaign Metadata
  const [campaignTitle, setCampaignTitle] = useState<string>('The Sunken Crypt of Kazal-Dûr');
  const [worldTheme, setWorldTheme] = useState<string>(STORY_REALM_PRESETS[0].theme);
  const [environmentLore, setEnvironmentLore] = useState<string>(STORY_REALM_PRESETS[0].environmentLore);
  const [questObjective, setQuestObjective] = useState<string>('Retrieve the Celestial Sunstone from the submerged altar before the trench collapse.');
  const [openingLocation, setOpeningLocation] = useState<string>('The Drowned Antechamber of Kazal-Dûr');
  const [selectedRealmId, setSelectedRealmId] = useState<string>('sunken-crypt');

  // ----------------------------------------------------
  // STEP 2: Races, Classes & Rules
  // ----------------------------------------------------
  const [customRaces, setCustomRaces] = useState<CustomRace[]>(() => getStoredCustomRaces());
  const [customClasses, setCustomClasses] = useState<CustomClass[]>(() => getStoredCustomClasses());
  const [selectedCustomClassId, setSelectedCustomClassId] = useState<string | null>(null);
  const [isCreateRaceModalOpen, setIsCreateRaceModalOpen] = useState(false);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isAiGeneratingRace, setIsAiGeneratingRace] = useState(false);
  const [isAiGeneratingClass, setIsAiGeneratingClass] = useState(false);

  const [ruleStrictness, setRuleStrictness] = useState<RuleStrictness>('soft');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('standard');
  const [recommendedRuleStrictness, setRecommendedRuleStrictness] = useState<RuleStrictness>('soft');
  const [recommendedDifficulty, setRecommendedDifficulty] = useState<DifficultyLevel>('standard');

  // ----------------------------------------------------
  // STEP 3: Character Creation (Tailored to chosen Story)
  // ----------------------------------------------------
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [characterName, setCharacterName] = useState('Nereus Coral-Vein');
  const [gender, setGender] = useState('Non-Binary');
  const [race, setRace] = useState('Sea Elf / Triton');
  const [background, setBackground] = useState('Abyssal Trench Stalker • Deep Marine Scout');
  const [alignment, setAlignment] = useState('Chaotic Good');
  const [stats, setStats] = useState(STARTING_CLASSES[2].defaultStats);
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [previewItem, setPreviewItem] = useState<InventoryItem | null>(null);
  const [storyMotivation, setStoryMotivation] = useState('Seeking the lost Abyssal Crown before the pressure glyphs fail.');
  const [customTrait, setCustomTrait] = useState('Bioluminescent night vision and deep-water agility');
  const [selectedHeroConceptId, setSelectedHeroConceptId] = useState<string | null>('sunken-1');
  const [bespokeHeroes, setBespokeHeroes] = useState<StoryHeroConcept[]>(() =>
    getStoryHeroConceptsForPremise(STORY_REALM_PRESETS[0].premise)
  );
  const [isGeneratingBespokeHeroes, setIsGeneratingBespokeHeroes] = useState(false);

  // Custom Items Creation / Forging
  const [customItems, setCustomItems] = useState<InventoryItem[]>([]);
  const [customItemPrompt, setCustomItemPrompt] = useState('');
  const [customItemType, setCustomItemType] = useState<'weapon' | 'armor' | 'potion' | 'misc'>('weapon');
  const [isForgingItem, setIsForgingItem] = useState(false);

  // AI Portrait generation state (Perchance AI)
  const [portraitPrompt, setPortraitPrompt] = useState(
    'Digital art portrait of Nereus Coral-Vein, an athletic Triton Abyssal Scout in weathered barnacle armor, bioluminescent highlights, holding a barbed harpoon.'
  );
  const [portraitUrl, setPortraitUrl] = useState<string>('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isExpandingPrompt, setIsExpandingPrompt] = useState(false);
  const [portraitModelUsed, setPortraitModelUsed] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState<
    'cinematic-fantasy' | 'dark-gothic' | 'heroic-anime' | 'vintage-dnd' | 'oil-masterpiece'
  >('cinematic-fantasy');

  // Recommended races for the active premise
  const recommendedRaces = getRecommendedRacesForPremise(storyPremise);

  // Initialize with initial realm preset
  useEffect(() => {
    const initialItems = getThematicItemsForPremise(storyPremise);
    setSelectedItems(initialItems.slice(0, 3));
    const concepts = getStoryHeroConceptsForPremise(storyPremise);
    setBespokeHeroes(concepts);
    if (concepts.length > 0) {
      handleApplyHeroConcept(concepts[0]);
    }
  }, []);

  // Apply a selected bespoke hero archetype concept
  const handleApplyHeroConcept = (hero: StoryHeroConcept) => {
    soundEngine.playDiceRoll();
    setSelectedHeroConceptId(hero.id);
    setCharacterName(hero.name);
    setGender(hero.gender || 'Non-Binary');
    setRace(hero.race);
    setBackground(hero.background);
    setAlignment(hero.alignment);
    setStoryMotivation(hero.storyMotivation);
    setCustomTrait(hero.customTrait);
    setSelectedCustomClassId(null);

    const heroClassName = hero.className || (hero as any).class || 'Adventurer';
    const clsIdx = STARTING_CLASSES.findIndex(
      (c) => c.name.toLowerCase() === heroClassName.toLowerCase()
    );
    if (clsIdx !== -1) {
      setSelectedClassIndex(clsIdx);
      setStats(STARTING_CLASSES[clsIdx].defaultStats);
    }

    if (hero.items && hero.items.length > 0) {
      // Retain any custom forged items!
      const mergedItems = [...hero.items];
      customItems.forEach((ci) => {
        if (!mergedItems.some((mi) => mi.id === ci.id)) {
          mergedItems.push(ci);
        }
      });
      setSelectedItems(mergedItems);
    }

    if (hero.portraitUrl) {
      setPortraitUrl(hero.portraitUrl);
      setPortraitModelUsed('Perchance Story Concept Artwork');
    }

    setPortraitPrompt(
      `Masterpiece character portrait of ${hero.name}, ${hero.race} ${heroClassName} with ${hero.customTrait}, ${worldTheme} backdrop, dramatic cinematic lighting, 8k concept art`
    );
  };

  // Select Quick Inspiration Spark
  const handleSelectInspirationSpark = (spark: typeof PROMPT_INSPIRATION_SPARKS[0]) => {
    soundEngine.playDiceRoll();
    setStoryPremise(spark.prompt);
    setPromptTone(spark.tone);
    setPromptFocus(spark.focus);
    setPromptPacing(spark.pacing);
    setSelectedRealmId('custom');
    setIsSynthesized(false);
  };

  // Primary Action: AI Prompt Enhancer & Story-Native Synthesis
  const handleEnhancePromptAndSynthesizeCampaign = async () => {
    if (isEnhancingPrompt) return;
    const promptToUse = storyPremise.trim() || 'A daring quest through dangerous ancient ruins to recover a legendary artifact.';
    if (!storyPremise.trim()) {
      setStoryPremise(promptToUse);
    }

    setIsEnhancingPrompt(true);
    soundEngine.playDiceRoll();

    try {
      const res = await fetch('/api/enhance-story-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPrompt: promptToUse,
          premise: promptToUse,
          tone: promptTone,
          focus: promptFocus,
          pacing: promptPacing,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.enhancedPremise || data.expandedPremise) {
          setStoryPremise(data.enhancedPremise || data.expandedPremise || promptToUse);
          setCampaignTitle(data.campaignTitle || data.title || 'A Legend Unfolds');
          setWorldTheme(data.worldTheme || data.theme || promptTone);
          setEnvironmentLore(data.environmentLore || 'A treacherous landscape fraught with ancient perils.');
          setQuestObjective(data.questObjective || 'Uncover the truth hidden within the deep ruins.');
          setOpeningLocation(data.openingLocation || 'The Gateway Antechamber');

          if (data.recommendedRuleStrictness) {
            setRuleStrictness(data.recommendedRuleStrictness);
            setRecommendedRuleStrictness(data.recommendedRuleStrictness);
          }
          if (data.recommendedDifficulty) {
            setDifficulty(data.recommendedDifficulty);
            setRecommendedDifficulty(data.recommendedDifficulty);
          }

          const heroes = data.bespokeHeroes || data.heroes;
          if (Array.isArray(heroes) && heroes.length > 0) {
            setBespokeHeroes(heroes);
            handleApplyHeroConcept(heroes[0]);
          }

          const items = data.thematicItems || data.items;
          if (Array.isArray(items) && items.length > 0) {
            setSelectedItems(items.slice(0, 4));
          }

          setIsSynthesized(true);
          soundEngine.playVictory();
        }
      }
    } catch (err) {
      console.warn('Synthesis fallback:', err);
      setIsSynthesized(true);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Quick Preset Selection
  const handleSelectRealm = (realmId: string) => {
    soundEngine.playDiceRoll();
    setSelectedRealmId(realmId);
    const preset = STORY_REALM_PRESETS.find((p) => p.id === realmId);
    if (preset) {
      setStoryPremise(preset.premise);
      setWorldTheme(preset.theme);
      setEnvironmentLore(preset.environmentLore);
      setCampaignTitle(preset.title);
      setIsSynthesized(false);
    }
  };

  // AI Story Heroes & Relics Generator
  const handleGenerateStoryHeroesAndRelics = async () => {
    if (isGeneratingBespokeHeroes) return;
    setIsGeneratingBespokeHeroes(true);
    try {
      soundEngine.playDiceRoll();
      const res = await fetch('/api/generate-story-heroes-and-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premise: storyPremise, theme: worldTheme }),
      });
      if (res.ok) {
        const data = await res.json();
        const heroes = data.bespokeHeroes || data.heroes;
        if (Array.isArray(heroes) && heroes.length > 0) {
          setBespokeHeroes(heroes);
          handleApplyHeroConcept(heroes[0]);
          setIsSynthesized(true);
          soundEngine.playVictory();
        }
        const items = data.thematicItems || data.items;
        if (Array.isArray(items) && items.length > 0) {
          setSelectedItems(items.slice(0, 3));
        }
      }
    } catch (err) {
      console.warn('Generate bespoke heroes error:', err);
    } finally {
      setIsGeneratingBespokeHeroes(false);
    }
  };

  // Custom Race Save & Delete
  const handleSaveCustomRace = (newRace: CustomRace) => {
    saveCustomRace(newRace);
    setCustomRaces(getStoredCustomRaces());
    setRace(newRace.name);
    if (newRace.racialTraits) {
      setCustomTrait(`${newRace.racialTraits} • ${newRace.specialAbility || ''}`);
    }
  };

  const handleDeleteCustomRace = (id: string) => {
    soundEngine.playDiceRoll();
    deleteCustomRace(id);
    const updated = getStoredCustomRaces();
    setCustomRaces(updated);
    if (updated.length > 0) {
      setRace(updated[0].name);
    } else {
      setRace('Human');
    }
  };

  // Custom Class Save & Delete
  const handleSaveCustomClass = (newClass: CustomClass) => {
    saveCustomClass(newClass);
    const updated = getStoredCustomClasses();
    setCustomClasses(updated);
    setSelectedCustomClassId(newClass.id);
  };

  const handleDeleteCustomClass = (id: string) => {
    soundEngine.playDiceRoll();
    deleteCustomClass(id);
    setCustomClasses(getStoredCustomClasses());
    setSelectedCustomClassId(null);
  };

  // AI Inspire Race & Class
  const handleAiInspireRace = async () => {
    setIsAiGeneratingRace(true);
    soundEngine.playDiceRoll();
    try {
      const res = await fetch('/api/generate-custom-race-or-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'race',
          worldTheme,
          premise: storyPremise,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.race) {
          handleSaveCustomRace(data.race);
          soundEngine.playLevelUp();
        }
      }
    } catch (err) {
      console.warn('AI Inspire race error:', err);
    } finally {
      setIsAiGeneratingRace(false);
    }
  };

  const handleAiInspireClass = async () => {
    setIsAiGeneratingClass(true);
    soundEngine.playDiceRoll();
    try {
      const res = await fetch('/api/generate-custom-race-or-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'class',
          worldTheme,
          premise: storyPremise,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customClass) {
          handleSaveCustomClass(data.customClass);
          soundEngine.playLevelUp();
        }
      }
    } catch (err) {
      console.warn('AI Inspire class error:', err);
    } finally {
      setIsAiGeneratingClass(false);
    }
  };

  // Class Selection
  const handleSelectStandardClass = (idx: number) => {
    setSelectedCustomClassId(null);
    setSelectedClassIndex(idx);
    const cls = STARTING_CLASSES[idx];
    setStats(cls.defaultStats);
  };

  const handleSelectCustomClass = (cls: CustomClass) => {
    setSelectedCustomClassId(cls.id);
  };

  // Expand Prompt with Gemini before Perchance AI generation
  const handleExpandPortraitPrompt = async () => {
    if (isExpandingPrompt) return;
    const cls = STARTING_CLASSES[selectedClassIndex];
    const basePrompt = portraitPrompt.trim() || `Masterpiece high fantasy portrait of ${characterName || 'Hero'}, ${gender ? `${gender} ` : ''}${race || 'adventurer'} ${cls.name} equipped for ${worldTheme}, dramatic rim lighting, 8k concept art.`;
    setIsExpandingPrompt(true);
    try {
      soundEngine.playDiceRoll();
      const res = await expandPromptWithGemini(basePrompt, {
        stylePreset,
        aspectRatio: '1:1',
      });
      if (res?.expandedPrompt) {
        setPortraitPrompt(res.expandedPrompt);
        soundEngine.playHeal();
      }
    } catch (err) {
      console.warn('Expand portrait prompt error:', err);
    } finally {
      setIsExpandingPrompt(false);
    }
  };

  // Generate Character Portrait with Perchance AI
  const handleGeneratePortrait = async () => {
    if (isGeneratingPortrait) return;
    setIsGeneratingPortrait(true);
    setPortraitModelUsed(null);

    const cls = STARTING_CLASSES[selectedClassIndex];
    const promptToUse = portraitPrompt.trim() || `Masterpiece high fantasy portrait of ${characterName || 'Hero'}, ${gender ? `${gender} ` : ''}${race || 'adventurer'} ${cls.name} with ${customTrait || 'heroic resolve'} equipped for ${worldTheme}, dramatic rim lighting, detailed concept art.`;

    try {
      soundEngine.playDiceRoll();
      const result = await generatePerchanceImage(promptToUse, {
        aspectRatio: '1:1',
        stylePreset,
        expandWithGemini: true,
        characterName: characterName || 'Hero',
        className: cls.name,
        race,
      });

      if (result && result.imageUrl) {
        setPortraitUrl(result.imageUrl);
        setPortraitModelUsed('Perchance AI Image Generator (1:1)');
        soundEngine.playLevelUp();
      }
    } catch (err: unknown) {
      console.warn('Perchance AI portrait error:', err);
      const cleanPrompt = `${race} ${cls.name} ${characterName || 'Hero'} ${worldTheme} high fantasy character portrait centered bust shot`.replace(/[^a-zA-Z0-9 ]/g, ' ').slice(0, 150);
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      const directPerchanceUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=square&seed=${dynamicSeed}`;
      setPortraitUrl(directPerchanceUrl);
      setPortraitModelUsed('Perchance AI Image Generator (1:1)');
      soundEngine.playLevelUp();
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Randomize Character Name
  const handleRandomizeName = () => {
    soundEngine.playDiceRoll();
    const firstNames: Record<string, string[]> = {
      Elf: ['Aeloria', 'Faerand', 'Sylas', 'Vaelin', 'Lyra', 'Theron'],
      Triton: ['Nereus', 'Coralia', 'Maris', 'Talassa', 'Aquilon', 'Kaelen'],
      Dwarf: ['Thorin', 'Baelor', 'Gimrik', 'Helga', 'Durgath', 'Valka'],
      Tiefling: ['Malakor', 'Zephyra', 'Kallista', 'Vesper', 'Dante', 'Nyx'],
      Human: ['Valen', 'Alasdar', 'Briar', 'Corin', 'Kaelen', 'Rowan'],
      Goliath: ['Krag', 'Vondur', 'Thundar', 'Brond', 'Gaelor', 'Skadi'],
      Dragonborn: ['Balerion', 'Drakar', 'Ignis', 'Kalyth', 'Vyrmen', 'Zarkon'],
    };
    const titles = ['Shadowstride', 'Stormcaller', 'Deepseeker', 'Sunforged', 'Nightblade', 'Ironclad', 'Frostweaver', 'Ashenheart'];
    
    const key = Object.keys(firstNames).find(k => race.includes(k)) || 'Human';
    const nameList = firstNames[key] || firstNames['Human'];
    const chosenFirst = nameList[Math.floor(Math.random() * nameList.length)];
    const chosenLast = titles[Math.floor(Math.random() * titles.length)];
    setCharacterName(`${chosenFirst} ${chosenLast}`);
  };

  // Forge Custom Item via AI backend
  const handleForgeCustomItem = async () => {
    if (!customItemPrompt.trim() || isForgingItem) return;
    setIsForgingItem(true);

    try {
      soundEngine.playDiceRoll();
      const currentClass = selectedCustomClassId
        ? customClasses.find((c) => c.id === selectedCustomClassId)
        : STARTING_CLASSES[selectedClassIndex];
      const classNameForPrompt = currentClass?.name || 'Adventurer';

      const res = await fetch('/api/generate-custom-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${customItemPrompt.trim()} (Thematic for ${worldTheme})`,
          type: customItemType,
          heroClass: classNameForPrompt,
          race,
          gender,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          const crafted: InventoryItem = {
            ...data.item,
            imageUrl: data.item.imageUrl || getFixedPerchanceItemImageUrl(data.item),
          };
          setCustomItems((prev) => [crafted, ...prev]);
          setSelectedItems((prev) => [...prev, crafted]);
          setCustomItemPrompt('');
          soundEngine.playLevelUp();
        }
      } else {
        throw new Error('Server error');
      }
    } catch (err: unknown) {
      console.warn('Custom item forge fallback:', err);
      const fallbackItem: InventoryItem = {
        id: `custom-${Date.now()}`,
        name: customItemPrompt.trim().slice(0, 30),
        type: customItemType,
        description: `A custom adventurer relic forged for ${characterName} in ${worldTheme}: ${customItemPrompt.trim()}`,
        quantity: 1,
        damage: customItemType === 'weapon' ? '1d8 + 2 Magical' : undefined,
        acBonus: customItemType === 'armor' ? 3 : undefined,
        bonus: '+1 Story Attunement',
        valueGold: 65,
        imageUrl: getFixedPerchanceItemImageUrl({
          name: customItemPrompt.trim(),
          type: customItemType,
          description: customItemPrompt.trim(),
        }),
      };
      setCustomItems((prev) => [fallbackItem, ...prev]);
      setSelectedItems((prev) => [...prev, fallbackItem]);
      setCustomItemPrompt('');
      soundEngine.playLevelUp();
    } finally {
      setIsForgingItem(false);
    }
  };

  // Toggle Item selection
  const handleToggleItem = (item: InventoryItem) => {
    const exists = selectedItems.find((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleDeleteCustomItem = (itemId: string) => {
    soundEngine.playDiceRoll();
    setCustomItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Final submit
  const handleEmbark = async () => {
    const currentCustomClass = customClasses.find((c) => c.id === selectedCustomClassId);
    const activeClassName = currentCustomClass ? currentCustomClass.name : STARTING_CLASSES[selectedClassIndex].name;
    const activeHp = currentCustomClass ? currentCustomClass.baseHp : STARTING_CLASSES[selectedClassIndex].hp;
    const activeAc = currentCustomClass ? currentCustomClass.baseAc : STARTING_CLASSES[selectedClassIndex].ac;

    const createdCharacter: Character = {
      name: characterName || 'Adventurer',
      gender: gender || 'Non-Binary',
      race: race || 'Human',
      className: activeClassName,
      level: 1,
      hp: activeHp,
      maxHp: activeHp,
      tempHp: 0,
      ac: activeAc,
      initiativeBonus: getAbilityModifier(stats.dex),
      speed: 30,
      gold: 50,
      background: background || 'Wandering Adventurer',
      alignment: alignment || 'Neutral Good',
      portraitUrl: portraitUrl || generateCharacterAvatarSvg({ name: characterName || 'Hero', className: activeClassName, race }),
      portraitPrompt,
      stats,
      inventory: selectedItems.length > 0 ? selectedItems : [ITEM_CATALOG[0], ITEM_CATALOG[10]],
    };

    const campaignSettings: CampaignSettings = {
      ruleStrictness,
      difficulty,
      storyPremise: storyPremise.trim() || 'A classic perilous dungeon crawl seeking ancient treasures and defeating monsters.',
    };

    await onStartCampaign(campaignSettings, createdCharacter);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative max-w-4xl w-full bg-[#0b1220] border-2 border-[#1e2d4a] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] text-[#f1f5f9]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#080d18] border-b border-[#1a263d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold font-serif italic text-amber-300">
                  Campaign Setup & Character Forge
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Solo 5e Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Set your story premise, customize races & classes, and forge attuned relics with Perchance AI art
              </p>
            </div>
          </div>

          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl border border-[#273752] bg-[#131d2e] text-xs font-serif font-bold text-slate-300 hover:text-white hover:bg-[#1c2a42] cursor-pointer"
            >
              Resume Current Quest
            </button>
          )}
        </div>

        {/* Step Progress Tabs */}
        <div className="flex border-b border-[#1a263d] bg-[#0c1527] text-xs font-serif font-bold divide-x divide-[#1a263d] overflow-x-auto">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              step === 1
                ? 'bg-[#182338] text-amber-300 shadow-inner'
                : 'text-slate-400 hover:bg-[#111a2d] hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
              1
            </span>
            <span>1. Story Genesis & Prompt</span>
          </button>

          <button
            onClick={() => setStep(2)}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              step === 2
                ? 'bg-[#182338] text-amber-300 shadow-inner'
                : 'text-slate-400 hover:bg-[#111a2d] hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
              2
            </span>
            <span>2. Races, Classes & Rules</span>
          </button>

          <button
            onClick={() => setStep(3)}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              step === 3
                ? 'bg-[#182338] text-amber-300 shadow-inner'
                : 'text-slate-400 hover:bg-[#111a2d] hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
              3
            </span>
            <span>3. Character Forge & Relics</span>
          </button>

          <button
            onClick={() => setStep(4)}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              step === 4
                ? 'bg-[#182338] text-amber-300 shadow-inner'
                : 'text-slate-400 hover:bg-[#111a2d] hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
              4
            </span>
            <span>4. Embark & Review</span>
          </button>
        </div>

        {/* Wizard Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[62vh] space-y-6">
          {/* STEP 1: STORY GENESIS & PROMPT ENHANCER */}
          {step === 1 && (
            <WizardStep1Story
              storyPremise={storyPremise}
              setStoryPremise={setStoryPremise}
              promptTone={promptTone}
              setPromptTone={setPromptTone}
              promptFocus={promptFocus}
              setPromptFocus={setPromptFocus}
              promptPacing={promptPacing}
              setPromptPacing={setPromptPacing}
              isEnhancingPrompt={isEnhancingPrompt}
              onEnhanceAndSynthesize={handleEnhancePromptAndSynthesizeCampaign}
              isSynthesized={isSynthesized}
              campaignTitle={campaignTitle}
              worldTheme={worldTheme}
              environmentLore={environmentLore}
              questObjective={questObjective}
              selectedRealmId={selectedRealmId}
              onSelectRealm={handleSelectRealm}
              onSelectInspirationSpark={handleSelectInspirationSpark}
              onAdvanceToStep2={() => setStep(2)}
            />
          )}

          {/* STEP 2: RACES, CLASSES & RULES */}
          {step === 2 && (
            <WizardStep2RacesClasses
              selectedRace={race}
              onSelectRace={(r) => {
                setRace(r);
                const matchingCr = customRaces.find((cr) => cr.name === r);
                if (matchingCr?.racialTraits) {
                  setCustomTrait(`${matchingCr.racialTraits} • ${matchingCr.specialAbility || ''}`);
                }
              }}
              recommendedRaces={recommendedRaces}
              customRaces={customRaces}
              onOpenCreateRaceModal={() => setIsCreateRaceModalOpen(true)}
              onDeleteCustomRace={handleDeleteCustomRace}
              onAiInspireRace={handleAiInspireRace}
              isAiGeneratingRace={isAiGeneratingRace}
              selectedClassIndex={selectedClassIndex}
              selectedCustomClassId={selectedCustomClassId}
              onSelectClassIndex={handleSelectStandardClass}
              onSelectCustomClass={handleSelectCustomClass}
              customClasses={customClasses}
              onOpenCreateClassModal={() => setIsCreateClassModalOpen(true)}
              onDeleteCustomClass={handleDeleteCustomClass}
              onAiInspireClass={handleAiInspireClass}
              isAiGeneratingClass={isAiGeneratingClass}
              ruleStrictness={ruleStrictness}
              onSetRuleStrictness={setRuleStrictness}
              recommendedRuleStrictness={recommendedRuleStrictness}
              difficulty={difficulty}
              onSetDifficulty={setDifficulty}
              recommendedDifficulty={recommendedDifficulty}
              worldTheme={worldTheme}
            />
          )}

          {/* STEP 3: CHARACTER FORGE & ATTUNED RELICS */}
          {step === 3 && (
            <WizardStep3HeroRelics
              worldTheme={worldTheme}
              bespokeHeroes={bespokeHeroes}
              selectedHeroConceptId={selectedHeroConceptId}
              onApplyHeroConcept={handleApplyHeroConcept}
              isGeneratingBespokeHeroes={isGeneratingBespokeHeroes}
              onGenerateStoryHeroes={handleGenerateStoryHeroesAndRelics}
              onRandomizeName={handleRandomizeName}
              characterName={characterName}
              setCharacterName={setCharacterName}
              gender={gender}
              setGender={setGender}
              race={race}
              setRace={setRace}
              recommendedRaces={recommendedRaces}
              customRaces={customRaces}
              selectedClassIndex={selectedClassIndex}
              selectedCustomClassId={selectedCustomClassId}
              onSelectClassIndex={handleSelectStandardClass}
              onSelectCustomClass={handleSelectCustomClass}
              customClasses={customClasses}
              background={background}
              setBackground={setBackground}
              alignment={alignment}
              setAlignment={setAlignment}
              storyMotivation={storyMotivation}
              setStoryMotivation={setStoryMotivation}
              customTrait={customTrait}
              setCustomTrait={setCustomTrait}
              selectedItems={selectedItems}
              customItems={customItems}
              onToggleItem={handleToggleItem}
              onPreviewItem={(item) => {
                soundEngine.playDiceRoll();
                setPreviewItem(item);
              }}
              onDeleteCustomItem={handleDeleteCustomItem}
              customItemPrompt={customItemPrompt}
              setCustomItemPrompt={setCustomItemPrompt}
              customItemType={customItemType}
              setCustomItemType={setCustomItemType}
              isForgingItem={isForgingItem}
              onForgeCustomItem={handleForgeCustomItem}
              portraitUrl={portraitUrl}
              setPortraitUrl={setPortraitUrl}
              portraitPrompt={portraitPrompt}
              setPortraitPrompt={setPortraitPrompt}
              isGeneratingPortrait={isGeneratingPortrait}
              onGeneratePortrait={handleGeneratePortrait}
              isExpandingPrompt={isExpandingPrompt}
              onExpandPortraitPrompt={handleExpandPortraitPrompt}
              portraitModelUsed={portraitModelUsed}
              stylePreset={stylePreset}
              setStylePreset={setStylePreset}
            />
          )}

          {/* STEP 4: EMBARKATION BRIEFING & REVIEW */}
          {step === 4 && (
            <WizardStep4Review
              worldTheme={worldTheme}
              campaignTitle={campaignTitle}
              storyPremise={storyPremise}
              openingLocation={openingLocation}
              questObjective={questObjective}
              characterName={characterName}
              gender={gender}
              race={race}
              className={
                selectedCustomClassId
                  ? customClasses.find((c) => c.id === selectedCustomClassId)?.name || 'Custom Class'
                  : STARTING_CLASSES[selectedClassIndex]?.name
              }
              background={background}
              alignment={alignment}
              hp={
                selectedCustomClassId
                  ? customClasses.find((c) => c.id === selectedCustomClassId)?.baseHp || 18
                  : STARTING_CLASSES[selectedClassIndex]?.hp
              }
              ac={
                selectedCustomClassId
                  ? customClasses.find((c) => c.id === selectedCustomClassId)?.baseAc || 14
                  : STARTING_CLASSES[selectedClassIndex]?.ac
              }
              speed={30}
              portraitUrl={portraitUrl}
              selectedItems={selectedItems}
              ruleStrictness={ruleStrictness}
              difficulty={difficulty}
            />
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 sm:p-5 bg-[#080d18] border-t border-[#1a263d] flex items-center justify-between gap-3">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                disabled={isInitializing}
                className="px-4 py-2 rounded-xl bg-[#131d2e] border border-[#273752] text-xs font-serif font-bold text-slate-200 hover:bg-[#1c2a42] flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-serif font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEmbark}
                disabled={isInitializing}
                className="px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs sm:text-sm font-serif font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {isInitializing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Summoning Dungeon Master...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-emerald-200" />
                    <span>Embark on Quest!</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High-Resolution Item Details Modal for Wizard */}
      {previewItem && (
        <ItemDetailsModal
          isOpen={!!previewItem}
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onUpdateItemImage={(itemId, newImg) => {
            setSelectedItems((prev) =>
              prev.map((it) => (it.id === itemId ? { ...it, imageUrl: newImg } : it))
            );
            setCustomItems((prev) =>
              prev.map((it) => (it.id === itemId ? { ...it, imageUrl: newImg } : it))
            );
            if (previewItem && previewItem.id === itemId) {
              setPreviewItem({ ...previewItem, imageUrl: newImg });
            }
          }}
        />
      )}

      {/* Create Custom Race Modal */}
      <CustomRaceModal
        isOpen={isCreateRaceModalOpen}
        onClose={() => setIsCreateRaceModalOpen(false)}
        onSaveRace={handleSaveCustomRace}
        worldTheme={worldTheme}
        storyPremise={storyPremise}
      />

      {/* Create Custom Class Modal */}
      <CustomClassModal
        isOpen={isCreateClassModalOpen}
        onClose={() => setIsCreateClassModalOpen(false)}
        onSaveClass={handleSaveCustomClass}
        worldTheme={worldTheme}
        storyPremise={storyPremise}
      />
    </div>
  );
}
