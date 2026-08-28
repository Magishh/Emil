import { CampaignState } from '../types';
import { PRESET_HEROES, INITIAL_LOCATION, INITIAL_STORY, INITIAL_CHOICES } from './diceUtils';
import { getFixedPerchanceItemImageUrl } from './perchanceAi';

const STORAGE_LIST_KEY = 'dnd_solo_campaigns_list_v2';
const ACTIVE_ID_KEY = 'dnd_solo_active_campaign_id_v2';
const LEGACY_STORAGE_KEY = 'dnd_solo_campaign_save_v2';

export const STARTER_CAMPAIGNS: CampaignState[] = [
  {
    campaignId: 'starter-kazal-dur',
    campaignTitle: 'The Sunken Crypt of Kazal-Dûr',
    settings: {
      ruleStrictness: 'soft',
      difficulty: 'standard',
      storyPremise: 'Subterranean dungeon crypt with ancient ruins, traps, and forgotten guardians',
    },
    character: PRESET_HEROES[0], // Sir Bryan (Paladin)
    currentLocation: INITIAL_LOCATION,
    currentStory: INITIAL_STORY,
    choices: INITIAL_CHOICES,
    pendingCheck: null,
    pendingActionDescription: null,
    history: [
      {
        id: 'init-1',
        timestamp: Date.now() - 3600000,
        type: 'narrative',
        content: INITIAL_STORY,
        speaker: 'Dungeon Master',
      },
    ],
    turnCount: 1,
    inCombat: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    campaignId: 'starter-mistwood',
    campaignTitle: 'Whispers in the Mistwood',
    settings: {
      ruleStrictness: 'soft',
      difficulty: 'heroic',
      storyPremise: 'Ancient enchanted forest cursed with shifting paths, fey enchantments, and spider dens',
    },
    character: PRESET_HEROES[1], // Elora Moonshadow (Rogue)
    currentLocation: {
      name: 'The Fog-Veiled Clearing',
      region: 'Mistwood Periphery',
      atmosphere: 'Ghostly mist weaving between colossal weeping willows, illuminated by glowing bioluminescent fungi.',
      dangerLevel: 'Medium',
      sceneryPrompt: 'Ghostly mist in a dense fantasy forest, bioluminescent blue mushrooms, ancient twisted tree roots, moonlight beaming through canopy, 16-bit pixel art',
    },
    currentStory:
      'The fog curls around your boots like living fingers. You pause upon a mossy stone altar at the crossroads of the Mistwood. Deep in the thicket, a faint melody of glass bells echoes, accompanied by the rustling of heavy eight-legged chittering in the high boughs above.',
    choices: [
      {
        id: 'c-1',
        label: 'Sneak into the underbrush',
        description: 'Muffle your steps and stalk toward the source of the bells.',
        riskLevel: 'safe',
        check: { ability: 'DEX', skillName: 'Stealth', dc: 12, reason: 'avoid alerting forest creatures' },
      },
      {
        id: 'c-2',
        label: 'Inspect the glowing stone altar',
        description: 'Examine ancient druidic runes etched upon the weathered stone.',
        riskLevel: 'moderate',
        check: { ability: 'INT', skillName: 'Arcana', dc: 13, reason: 'decipher the protective ward' },
      },
      {
        id: 'c-3',
        label: 'Draw your daggers and ready your stance',
        description: 'Prepare to strike if the chittering in the trees draws near.',
        riskLevel: 'risky',
        combatAction: true,
      },
      {
        id: 'c-4',
        label: 'Cast a torchlight flame into the canopy',
        description: 'Illuminate the high branches to flush out hidden lurkers.',
        riskLevel: 'moderate',
      },
    ],
    pendingCheck: null,
    pendingActionDescription: null,
    history: [
      {
        id: 'init-2',
        timestamp: Date.now() - 7200000,
        type: 'narrative',
        content:
          'The fog curls around your boots like living fingers. You pause upon a mossy stone altar at the crossroads of the Mistwood. Deep in the thicket, a faint melody of glass bells echoes, accompanied by the rustling of heavy eight-legged chittering in the high boughs above.',
        speaker: 'Dungeon Master',
      },
    ],
    turnCount: 1,
    inCombat: false,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
  },
  {
    campaignId: 'starter-ironfang',
    campaignTitle: 'The Siege of Ironfang Bastion',
    settings: {
      ruleStrictness: 'hard',
      difficulty: 'nightmare',
      storyPremise: 'Mountaintop fortress under assault by an infernal hobgoblin warband',
    },
    character: PRESET_HEROES[3], // Thorin Ironbreaker (Cleric)
    currentLocation: {
      name: 'The Crumbling North Gatehouse',
      region: 'Ironfang Peaks',
      atmosphere: 'Burning braziers, smoke billowing against snow-capped crags, war drums pounding in the canyon below.',
      dangerLevel: 'High',
      sceneryPrompt: 'Burning stone ramparts on a snowy mountain fortress, fiery arrows in the night sky, dwarven armor, fantasy siege, high resolution pixel art',
    },
    currentStory:
      'Sparks shower down from the splintered iron portcullis. A battering ram strikes the gate with a thunderous boom that vibrates through your warhammer. Below the ramparts, hobgoblin vanguard captains shout commands in harsh goblinoid dialects while ballistas reload.',
    choices: [
      {
        id: 'c-1',
        label: 'Channel divine ward upon the portcullis',
        description: 'Hold aloft your holy symbol to reinforce the gate with radiant barrier.',
        riskLevel: 'moderate',
        check: { ability: 'WIS', skillName: 'Religion', dc: 14, reason: 'invoke sacred resistance' },
      },
      {
        id: 'c-2',
        label: 'Rally the defenders with a thunderous war cry',
        description: 'Inspire the terrified garrison militia to hold the battlements.',
        riskLevel: 'safe',
        check: { ability: 'CHA', skillName: 'Persuasion', dc: 13, reason: 'bolster guard morale' },
      },
      {
        id: 'c-3',
        label: 'Pour boiling oil onto the battering ram',
        description: 'Tip the siege cauldrons over the murder holes directly onto the crew.',
        riskLevel: 'risky',
        check: { ability: 'STR', skillName: 'Athletics', dc: 12, reason: 'heave the heavy cauldron' },
      },
      {
        id: 'c-4',
        label: 'Charge down to engage the lead warlord',
        description: 'Leap through the breach with hammer raised to decapitate their command.',
        riskLevel: 'deadly',
        combatAction: true,
      },
    ],
    pendingCheck: null,
    pendingActionDescription: null,
    history: [
      {
        id: 'init-3',
        timestamp: Date.now() - 10800000,
        type: 'narrative',
        content:
          'Sparks shower down from the splintered iron portcullis. A battering ram strikes the gate with a thunderous boom that vibrates through your warhammer. Below the ramparts, hobgoblin vanguard captains shout commands in harsh goblinoid dialects while ballistas reload.',
        speaker: 'Dungeon Master',
      },
    ],
    turnCount: 1,
    inCombat: false,
    createdAt: Date.now() - 10800000,
    updatedAt: Date.now() - 10800000,
  },
];

export function sanitizeCampaignState(raw: any): CampaignState {
  const fallbackHero = PRESET_HEROES[0];
  const char = raw?.character || {};
  const charStats = char?.stats || fallbackHero.stats;

  const sanitizedCharacter: typeof fallbackHero = {
    name: char.name || fallbackHero.name || 'Hero of the Realm',
    className: char.className || fallbackHero.className || 'Fighter',
    race: char.race || fallbackHero.race || 'Human',
    gender: char.gender || fallbackHero.gender || 'Unknown',
    level: typeof char.level === 'number' ? char.level : 1,
    hp: typeof char.hp === 'number' ? char.hp : (fallbackHero.hp || 20),
    maxHp: typeof char.maxHp === 'number' ? char.maxHp : (fallbackHero.maxHp || 20),
    tempHp: typeof char.tempHp === 'number' ? char.tempHp : 0,
    ac: typeof char.ac === 'number' ? char.ac : (fallbackHero.ac || 15),
    initiativeBonus: typeof char.initiativeBonus === 'number' ? char.initiativeBonus : (fallbackHero.initiativeBonus || 0),
    speed: typeof char.speed === 'number' ? char.speed : (fallbackHero.speed || 30),
    gold: typeof char.gold === 'number' ? char.gold : (fallbackHero.gold || 50),
    background: char.background || fallbackHero.background || 'Adventurer',
    alignment: char.alignment || fallbackHero.alignment || 'Neutral Good',
    portraitUrl: char.portraitUrl || fallbackHero.portraitUrl || '',
    portraitPrompt: char.portraitPrompt || fallbackHero.portraitPrompt || '',
    xp: typeof char.xp === 'number' ? char.xp : 0,
    stats: {
      str: typeof charStats.str === 'number' ? charStats.str : 14,
      dex: typeof charStats.dex === 'number' ? charStats.dex : 12,
      con: typeof charStats.con === 'number' ? charStats.con : 14,
      int: typeof charStats.int === 'number' ? charStats.int : 10,
      wis: typeof charStats.wis === 'number' ? charStats.wis : 12,
      cha: typeof charStats.cha === 'number' ? charStats.cha : 10,
    },
    inventory: (Array.isArray(char.inventory) ? char.inventory : (fallbackHero.inventory || [])).map((item: any) => ({
      ...item,
      imageUrl: (item.imageUrl && typeof item.imageUrl === 'string' && !item.imageUrl.startsWith('data:image/svg+xml;base64,PHN2Zw'))
        ? item.imageUrl
        : getFixedPerchanceItemImageUrl(item),
    })),
    statusEffects: Array.isArray(char.statusEffects) ? char.statusEffects : (fallbackHero.statusEffects || []),
    spellSlots: char.spellSlots || fallbackHero.spellSlots,
  };

  const loc = raw?.currentLocation || {};
  const sanitizedLocation = {
    name: loc.name || INITIAL_LOCATION.name,
    region: loc.region || INITIAL_LOCATION.region,
    atmosphere: loc.atmosphere || INITIAL_LOCATION.atmosphere,
    dangerLevel: loc.dangerLevel || INITIAL_LOCATION.dangerLevel,
    imageUrl: loc.imageUrl || loc.sceneryImageUrl || '',
    sceneryImageUrl: loc.sceneryImageUrl || loc.imageUrl || '',
    sceneryPrompt: loc.sceneryPrompt || INITIAL_LOCATION.sceneryPrompt,
  };

  const sanitizedSettings = {
    ruleStrictness: raw?.settings?.ruleStrictness || 'soft',
    difficulty: raw?.settings?.difficulty || 'standard',
    storyPremise: raw?.settings?.storyPremise || 'Subterranean dungeon quest',
  };

  return {
    campaignId: raw?.campaignId || `camp-${Date.now()}`,
    campaignTitle: raw?.campaignTitle || 'A Grand Adventure',
    settings: sanitizedSettings,
    character: sanitizedCharacter,
    currentLocation: sanitizedLocation,
    currentStory: raw?.currentStory || INITIAL_STORY,
    choices: Array.isArray(raw?.choices) && raw.choices.length > 0 ? raw.choices : INITIAL_CHOICES,
    pendingCheck: raw?.pendingCheck || null,
    pendingActionDescription: raw?.pendingActionDescription || null,
    history: Array.isArray(raw?.history) && raw.history.length > 0 ? raw.history : [
      {
        id: `init-${Date.now()}`,
        timestamp: Date.now(),
        type: 'narrative',
        content: raw?.currentStory || INITIAL_STORY,
        speaker: 'Dungeon Master',
      },
    ],
    turnCount: typeof raw?.turnCount === 'number' ? raw.turnCount : 1,
    inCombat: Boolean(raw?.inCombat),
    combatEnemy: raw?.combatEnemy || undefined,
    createdAt: typeof raw?.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw?.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

/**
 * Load all campaigns from localStorage, migrating legacy saves if necessary.
 */
export function getSavedCampaigns(): CampaignState[] {
  if (typeof window === 'undefined') return STARTER_CAMPAIGNS.map(sanitizeCampaignState);

  try {
    const raw = localStorage.getItem(STORAGE_LIST_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(sanitizeCampaignState);
      }
    }

    // Check legacy single-campaign save
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (legacy && (legacy.campaignId || legacy.character)) {
          const sanitizedLegacy = sanitizeCampaignState(legacy);
          const listWithLegacy = [
            sanitizedLegacy,
            ...STARTER_CAMPAIGNS.filter((c) => c.campaignId !== sanitizedLegacy.campaignId).map(sanitizeCampaignState),
          ];
          localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(listWithLegacy));
          return listWithLegacy;
        }
      } catch {
        // ignore legacy parse error
      }
    }

    // Default to starter campaigns
    const sanitizedStarters = STARTER_CAMPAIGNS.map(sanitizeCampaignState);
    localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(sanitizedStarters));
    return sanitizedStarters;
  } catch (err) {
    console.warn('Error reading campaigns list from localStorage:', err);
    return STARTER_CAMPAIGNS.map(sanitizeCampaignState);
  }
}

/**
 * Save or update a campaign in localStorage.
 */
export function saveCampaign(campaign: CampaignState): void {
  if (typeof window === 'undefined') return;

  try {
    const all = getSavedCampaigns();
    const now = Date.now();
    const updatedCampaign: CampaignState = {
      ...campaign,
      updatedAt: now,
      createdAt: campaign.createdAt || now,
    };

    const idx = all.findIndex((c) => c.campaignId === campaign.campaignId);
    let newList: CampaignState[];

    if (idx >= 0) {
      newList = [...all];
      newList[idx] = updatedCampaign;
    } else {
      newList = [updatedCampaign, ...all];
    }

    localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(newList));
    localStorage.setItem(ACTIVE_ID_KEY, campaign.campaignId);
    // Maintain legacy key for backwards compatibility
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updatedCampaign));
  } catch (err) {
    console.warn('Failed to save campaign:', err);
  }
}

/**
 * Delete a campaign by ID.
 */
export function deleteCampaign(campaignId: string): CampaignState[] {
  if (typeof window === 'undefined') return [];

  try {
    const all = getSavedCampaigns();
    const newList = all.filter((c) => c.campaignId !== campaignId);
    localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(newList));

    // If active was deleted, point to first remaining or null
    const activeId = getActiveCampaignId();
    if (activeId === campaignId) {
      const nextId = newList.length > 0 ? newList[0].campaignId : null;
      if (nextId) {
        localStorage.setItem(ACTIVE_ID_KEY, nextId);
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(newList[0]));
      } else {
        localStorage.removeItem(ACTIVE_ID_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    return newList;
  } catch (err) {
    console.warn('Failed to delete campaign:', err);
    return [];
  }
}

/**
 * Get the currently active campaign ID.
 */
export function getActiveCampaignId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ID_KEY);
}

/**
 * Set the currently active campaign ID.
 */
export function setActiveCampaignId(campaignId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_ID_KEY, campaignId);
  const all = getSavedCampaigns();
  const found = all.find((c) => c.campaignId === campaignId);
  if (found) {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(found));
  }
}

/**
 * Duplicate / Clone a campaign to allow alternate path playthroughs.
 */
export function duplicateCampaign(campaignId: string): CampaignState | null {
  const all = getSavedCampaigns();
  const source = all.find((c) => c.campaignId === campaignId);
  if (!source) return null;

  const clone: CampaignState = {
    ...source,
    campaignId: `camp-clone-${Date.now()}`,
    campaignTitle: `${source.campaignTitle} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveCampaign(clone);
  return clone;
}

/**
 * Export campaign to JSON file download.
 */
export function exportCampaignToJson(campaign: CampaignState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(campaign, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanName = campaign.campaignTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadAnchor.setAttribute('download', `dnd_adventure_${cleanName}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
