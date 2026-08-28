import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Load configuration from the user's config directory first, so an installed
// copy (e.g. /opt/dnd-solo-dm) can be configured without editing files it owns,
// then from the project directory for a plain git clone.
const USER_CONFIG_DIR = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "dnd-solo-dm"
);
dotenv.config({ path: path.join(USER_CONFIG_DIR, ".env") });
dotenv.config();

const app = express();

// Desktop defaults: a port that can be moved when something already holds it,
// and a loopback bind so a personal machine does not publish the app - and the
// API key behind it - to the whole local network. Set HOST=0.0.0.0 to share it.
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_PORT_ATTEMPTS = 20;

app.use(express.json({ limit: "10mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Helper for robust Gemini text generation with multi-model fallback and strict timeouts
async function generateGeminiJsonWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  responseSchema: Record<string, unknown>
): Promise<string | null> {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-3.7-flash",
  ];

  for (const model of modelsToTry) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema as any,
        },
      });

      // Strict per-model timeout (9 seconds) so DM response never hangs indefinitely
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on model ${model}`)), 9000)
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      const text = response?.text;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn(`Model ${model} unavailable (${error.message}), trying next fallback model...`);
      // Continue to next model in cascade
    }
  }

  return null;
}

// Campaign Initialization Endpoint (Starts new adventure based on user rules, difficulty, character & story premise)
app.post("/api/campaign/init", async (req, res) => {
  const { character, ruleStrictness = 'soft', difficulty = 'standard', storyPremise } = req.body || {};

  const ruleDescriptions: Record<string, string> = {
    hard: "Hard Rules (Strict D&D 5e Simulation): Enforce strict 5e mechanics, precise ability checks, tactical consequences, resource tracking, and punishing failure states.",
    soft: "Soft Rules (Standard 5e Adventure): Balance 5e rules with the Rule of Cool, heroic flexibility, and intuitive rulings.",
    none: "No Rules (Narrative / Rules-Lite): Focus on cinematic roleplay, maximum creative freedom, imaginative player agency, and effortless flow with minimal mechanical friction."
  };

  const difficultyDescriptions: Record<string, string> = {
    story: "Storyteller / Easy (Forgiving encounters, lower DCs, generous loot and discovery)",
    standard: "Adventurer / Standard (Balanced 5e challenge, standard DCs 10-15, tactical depth)",
    heroic: "Heroic / Hard (High stakes, tougher DCs 13-18, aggressive monsters, scarce resources)",
    nightmare: "Nightmare / Deadly (Lethal danger, brutal traps, high DCs 15-20, severe consequences)"
  };

  const fallbackTitle = storyPremise
    ? (storyPremise.length > 35 ? storyPremise.slice(0, 35) + '...' : storyPremise)
    : "The Forgotten Spires of Eldoria";

  const proceduralFallback = {
    campaignTitle: fallbackTitle,
    narrative: `You arrive at the threshold of your grand journey. ${storyPremise ? `Guided by your quest ("${storyPremise}"), ` : ''}the wind howls through ancient stone arches, carrying the faint scent of ozone, dried elder-bark, and centuries of undisturbed dust. The surrounding wilderness falls into an unnatural, expectant hush, as if even the crows dare not disturb whatever sleeps beyond the threshold.

Your gear rests securely against your shoulders, yet the weight of your destiny feels heavier than steel. Carved into the monolithic gateposts ahead are worn bas-reliefs depicting forgotten dynasties and celestial alignments that no modern astronomer records. A faint, rhythmic hum reverberates through the flagstones beneath your boots—a subterranean heartbeat pulsing with latent magic.

As the dying rays of the twin moons pierce the canopy, shadows lengthen and twist into silhouettes that seem almost watchful. Ahead, the corridor branches into gloom, with distant torchlight flickering against wet cavern walls and the faint clink of iron chains echoing from somewhere deep below. The stage is set for ${character?.name || 'our brave hero'}.`,
    location: {
      name: "The Threshold of Eldoria",
      region: "The Whispering Wilds",
      atmosphere: "Distant thunder, rustling leaves, ancient stone carved with enigmatic glyphs, humming arcane ley lines.",
      dangerLevel: difficulty === 'nightmare' ? "Extreme" : difficulty === 'heroic' ? "High" : "Medium",
      sceneryPrompt: `Epic fantasy establishing shot of ${storyPremise || 'an ancient dungeon entrance in mystical ruins'}, ominous lighting, glowing ley runes, hyper-detailed digital painting.`
    },
    choices: [
      {
        id: `init-c1`,
        label: "Advance through the main arched gateway with weapon drawn",
        description: "Step directly into the illuminated central corridor, remaining vigilant for ambushes and tripwires.",
        riskLevel: "moderate",
        check: ruleStrictness === 'none' ? undefined : { ability: "WIS", skillName: "Perception", dc: difficulty === 'story' ? 10 : 13, reason: "Detect lurking sentinels or pressure plates." }
      },
      {
        id: `init-c2`,
        label: "Investigate the arcane glyphs etched along the stone pillars",
        description: "Decipher the ancient warnings, historical lore, and magical wards guarding the entrance.",
        riskLevel: "safe",
        check: ruleStrictness === 'none' ? undefined : { ability: "INT", skillName: "Arcana", dc: difficulty === 'story' ? 9 : 12, reason: "Understand the magical resonance and uncover hidden lore." }
      },
      {
        id: `init-c3`,
        label: "Search the perimeter for a stealthy alternative breach",
        description: "Circumnavigate the outer ramparts to find a cracked parapet, shadow gate, or hidden fissure.",
        riskLevel: "moderate",
        check: ruleStrictness === 'none' ? undefined : { ability: "DEX", skillName: "Stealth", dc: difficulty === 'story' ? 10 : 14, reason: "Move without catching the eye of roosting watch-beasts." }
      },
      {
        id: `init-c4`,
        label: "Parley or announce your arrival with commanding presence",
        description: "Demand entry under your heroic banner or challenge whatever lurks within to show itself.",
        riskLevel: "risky",
        check: ruleStrictness === 'none' ? undefined : { ability: "CHA", skillName: "Intimidation", dc: difficulty === 'story' ? 11 : 15, reason: "Establish dominance over guarding wardens." }
      }
    ]
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      const prompt = `You are a master tabletop RPG Dungeon Master starting a brand new solo D&D campaign.
Player Ruleset: ${ruleDescriptions[ruleStrictness] || ruleDescriptions.soft}
Campaign Difficulty: ${difficultyDescriptions[difficulty] || difficultyDescriptions.standard}
Hero: ${character?.name} (${character?.gender ? `${character.gender} ` : ''}${character?.race} ${character?.className}, Level ${character?.level || 1}, Background: ${character?.background || 'Adventurer'})
Equipped Gear/Items: ${(character?.inventory || []).map((i: { name: string }) => i.name).join(', ') || 'Standard adventurer kit'}

Player's Requested Story Premise:
"${storyPremise || 'A mysterious dungeon exploration in search of ancient power and lost artifacts.'}"

NARRATIVE INSTRUCTIONS:
- Generate a longer, deeply intriguing, immersive opening story (3 to 5 rich paragraphs) before presenting the choices.
- Establish compelling intrigue: strange sensory details (sounds, cold drafts, subtle smells, dancing shadows), forgotten lore or ominous omens, secretive artifacts, NPC motives or hidden histories.
- Build tension, mystery, and atmosphere so the world feels vast, dangerous, and brimming with secrets waiting to be unraveled.
- Allow the scene to breathe with vivid worldbuilding before the player must make their first tactical decision.
- Provide a compelling campaign title, the initial location details with a descriptive scenery prompt for image generation, and 4 distinct, tactical opening choices.
${ruleStrictness === 'none' ? 'Note: Since this is No Rules / Narrative mode, do not attach strict DC checks to choices unless purely narrative.' : 'Attach appropriate DC ability checks tailored to the chosen difficulty level.'}
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          campaignTitle: {
            type: Type.STRING,
            description: "An evocative, fitting title for this campaign based on the player's premise."
          },
          narrative: {
            type: Type.STRING,
            description: "The opening narration describing the environment, intrigue, atmosphere, and immediate situation in rich detail. 3-5 vivid paragraphs."
          },
          location: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              region: { type: Type.STRING },
              atmosphere: { type: Type.STRING },
              dangerLevel: { type: Type.STRING, description: "Safe, Low, Medium, High, or Extreme" },
              sceneryPrompt: {
                type: Type.STRING,
                description: "Rich prompt for generating digital concept artwork of this opening scenery."
              }
            },
            required: ["name", "region", "atmosphere", "dangerLevel", "sceneryPrompt"]
          },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                riskLevel: { type: Type.STRING, description: "safe, moderate, risky, or deadly" },
                combatAction: { type: Type.BOOLEAN },
                check: {
                  type: Type.OBJECT,
                  properties: {
                    ability: { type: Type.STRING, description: "STR, DEX, CON, INT, WIS, or CHA" },
                    skillName: { type: Type.STRING },
                    dc: { type: Type.INTEGER },
                    reason: { type: Type.STRING }
                  },
                  required: ["ability", "dc", "reason"]
                }
              },
              required: ["id", "label"]
            },
            description: "Four distinct procedural starting choices."
          }
        },
        required: ["campaignTitle", "narrative", "location", "choices"]
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        prompt,
        "You are an elite fantasy Dungeon Master crafting customized, deeply intriguing, and memorable tabletop RPG adventures.",
        responseSchema
      );

      if (rawJson) {
        const parsedData = JSON.parse(rawJson);
        return res.json(parsedData);
      }
    }
  } catch (err: unknown) {
    console.warn("Init fallback activated due to API demand:", err);
  }

  // Guaranteed safe return
  return res.json(proceduralFallback);
});

// Campaign Next Turn AI DM Endpoint
app.post("/api/campaign/next", async (req, res) => {
  const { character, action, rollDetails, history, currentLocation, inCombat, combatEnemy, settings } = req.body || {};
  const ruleStrictness = settings?.ruleStrictness || 'soft';
  const difficulty = settings?.difficulty || 'standard';
  const storyPremise = settings?.storyPremise || '';

  const isSuccess = rollDetails ? (rollDetails.isCritical || (rollDetails.dc ? rollDetails.total >= rollDetails.dc : rollDetails.total >= 10)) : true;
  
  const fallbackNarrative = `You take decisive action: "${action}". ${
    rollDetails
      ? `With a roll of ${rollDetails.total} (Natural ${rollDetails.roll} + ${rollDetails.modifier}) against DC ${rollDetails.dc || 12}: ${
          rollDetails.isCritical ? 'A spectacular triumph!' : isSuccess ? 'Success under pressure!' : 'A treacherous struggle!'
        }.`
      : ''
  }

The reverberations of your choice ripple outward through the shadowy expanse. Dust cascades from cracked vaulted arches above, catching the pale glint of arcane phosphorescence. In the wake of your movement, the surrounding chamber reacts—a stone gargoyle's hollow eye sockets seem to follow your gait, while a sudden cold draft extinguishes nearby torch sconces, leaving only eerie crimson embers glowering in the dark.

From somewhere beyond the heavy iron-banded doors, a low rhythmic chant rises and abruptly ceases, replaced by the faint scrape of metal over cobblestone. An old riddle or warning is hastily carved into the threshold beside you in dried ink: "Beware the third bell; the warden does not sleep."

Your pulse quickens as the environment shifts around you. The path ahead is fraught with escalating mystery, and every shadow now conceals potential peril or revelation. You take a breath, steady your resolve, and weigh your immediate next course.`;

  const proceduralFallback = {
    narrative: fallbackNarrative,
    characterUpdates: {
      hpChange: isSuccess ? 0 : (difficulty === 'nightmare' ? -6 : difficulty === 'heroic' ? -4 : -2),
      goldChange: isSuccess ? 15 : 0,
      newItem: isSuccess ? {
        id: `item-${Date.now()}`,
        name: "Ancient Silver Sigil",
        type: "misc",
        description: "A tarnished coin bearing an enigmatic seal that radiates faint abjuration aura.",
        quantity: 1,
        valueGold: 20
      } : undefined,
    },
    location: {
      name: currentLocation?.name || "Sunken Crypt of Kazal-Dûr",
      region: currentLocation?.region || "The Shadowed Crags",
      atmosphere: "Rippling water, flickering torch reflections, tense silence, scent of incense.",
      dangerLevel: difficulty === 'nightmare' ? "Extreme" : "Medium",
      sceneryPrompt: `A dark gothic fantasy dungeon chamber, ${currentLocation?.name || 'underground ruins'}, torchlight, stone coffins, ancient runes, dramatic lighting.`
    },
    choices: [
      {
        id: `c-${Date.now()}-1`,
        label: "Press forward deeper into the sanctum",
        description: "Follow the submerged flagstones toward the central vaulted archway, weapon drawn.",
        riskLevel: "moderate",
        check: ruleStrictness === 'none' ? undefined : { ability: "DEX", skillName: "Acrobatics", dc: 12, reason: "Navigate the slick, submerged stones silently." }
      },
      {
        id: `c-${Date.now()}-2`,
        label: "Inspect the chained obsidian sarcophagus",
        description: "Search for hidden locks, traps, or runic inscriptions before prying it open.",
        riskLevel: "risky",
        check: ruleStrictness === 'none' ? undefined : { ability: "INT", skillName: "Investigation", dc: 13, reason: "Decipher the puzzle mechanism locking the chest." }
      },
      {
        id: `c-${Date.now()}-3`,
        label: "Drink a potion and prepare a defensive stance",
        description: "Recover stamina, scan the rafters, and keep vigilant watch for further ambushes.",
        riskLevel: "safe",
      },
      {
        id: `c-${Date.now()}-4`,
        label: "Cast a flare / create light to illuminate the dark corners",
        description: "Reveal hidden passages, blood trails, or lurking stalkers in the ceiling rafters.",
        riskLevel: "moderate",
        check: ruleStrictness === 'none' ? undefined : { ability: "WIS", skillName: "Perception", dc: 11, reason: "Spot lurking ambushes before they strike." }
      }
    ],
    pendingCheck: null,
    inCombat: false
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      const recentHistoryText = (history || [])
        .slice(-6)
        .map((h: { speaker?: string; content: string }) => `${h.speaker || 'Log'}: ${h.content}`)
        .join("\n\n");

  const activeEffectsList = (character?.statusEffects || [])
    .map((e: { name: string; type: string; mechanicalEffect?: string }) => `${e.name} (${e.type}: ${e.mechanicalEffect || ''})`)
    .join(', ');

  const prompt = `You are a world-class, evocative, immersive Dungeon Master leading a solo 5th Edition D&D campaign.
Campaign Story Theme/Premise: "${storyPremise || 'Fantasy adventure'}"
Rule Strictness: ${ruleStrictness.toUpperCase()} (Hard = strict 5e simulation, Soft = balanced 5e adventure, None = narrative/rules-lite)
Difficulty Level: ${difficulty.toUpperCase()} (Story = lenient, Standard = balanced, Heroic = challenging, Nightmare = lethal)

The hero is: ${character?.name || 'The Adventurer'} (${character?.gender ? `${character.gender} ` : ''}${character?.race || 'Hero'} ${character?.className || 'Warrior'}, Level ${character?.level || 1}, HP: ${character?.hp}/${character?.maxHp}, AC: ${character?.ac}, Stats: STR ${character?.stats?.str}, DEX ${character?.stats?.dex}, CON ${character?.stats?.con}, INT ${character?.stats?.int}, WIS ${character?.stats?.wis}, CHA ${character?.stats?.cha}).
Active Status Effects/Conditions: ${activeEffectsList || 'None'}.
Current Location: ${currentLocation?.name || 'Ancient Ruins'} (${currentLocation?.atmosphere || 'Dark and mysterious'}).

Recent Campaign Context:
${recentHistoryText || 'The hero just embarked on their quest.'}

The player took this action:
"${action}"

${rollDetails ? `DICE ROLL RESULT: The player rolled a ${rollDetails.dieType || 'd20'}: Natural ${rollDetails.roll} + modifier ${rollDetails.modifier} = Total ${rollDetails.total}. (Target DC was ${rollDetails.dc || 'unspecified'}. Critical hit: ${rollDetails.isCritical}, Critical fumble: ${rollDetails.isFumble}).` : 'No dice roll was performed yet for this turn; if this action naturally warrants a skill check or saving throw, evaluate the outcome or request one.'}

CRITICAL STORYTELLING INSTRUCTIONS:
1. EXPAND THE NARRATIVE LENGTH AND DEPTH: Write 3 to 5 richly developed, captivating paragraphs before concluding with the new choice crossroad.
2. MAKE THE STORY INTRIGUING: Deepen the mystery. Include layered tension, sensory discoveries (cold drafts, strange symbols, distant whispers, clockwork ticks, eerie glows), unexpected clues, lore fragments, NPC secrets or motives, and rising stakes.
3. VISCERAL OUTCOMES: Describe the tangible consequences of the player's action or roll in gripping, cinematic detail. Factor in any active status effects (e.g. Poisoned, Blessed, Charmed, Hasted).
4. PACING: Let the narrative breathe and build suspense naturally before reaching the moment where a crucial new decision is needed.
5. CHOICES: Generate 4 creative, tactical, distinctly different player choices for the next step. If loot was found, specify newItem or goldChange. If the player took damage, specify hpChange (negative number for damage scaled to difficulty, positive for healing). If a condition was applied or removed (e.g. spider venom causing Poisoned, or receiving a holy Blessing), specify addedStatusEffects or removedStatusEffectIds.
6. SCENE CONTINUITY & LOCATION PERSISTENCE:
- The hero is currently in: "${currentLocation?.name || 'Current Scene'}" (${currentLocation?.region || 'Current Region'}).
- If the player's action takes place within the SAME environment, room, or building (e.g., browsing library shelves, speaking to a patron at the tavern bar, examining a chest, combat in the hallway), KEEP the location name, region, and atmosphere identical to "${currentLocation?.name || 'Current Scene'}", and set "isMajorSceneChange" to false.
- ONLY change the location and set "isMajorSceneChange" to true when a BIG, DISTINCT SCENE CHANGE occurs (such as exiting the library and walking into the tavern, leaving the catacombs for the mountain pass, or journeying to an entirely new district or dungeon level).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          narrative: {
            type: Type.STRING,
            description: "A rich, captivating, multi-paragraph story narration (3-5 paragraphs) weaving suspense, visceral consequences, environmental discovery, and mystery before reaching the next critical decision point."
          },
          isMajorSceneChange: {
            type: Type.BOOLEAN,
            description: "Set to TRUE ONLY when a major transition to a distinctly new environment occurs (e.g. leaving the library to go to the bar, entering a new dungeon or district). Set to FALSE when remaining in the same room or area."
          },
          characterUpdates: {
            type: Type.OBJECT,
            properties: {
              hpChange: {
                type: Type.INTEGER,
                description: "Damage taken (negative, e.g. -4) or healing received (positive, e.g. +6), or 0."
              },
              goldChange: {
                type: Type.INTEGER,
                description: "Gold coins gained or spent."
              },
              newItem: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, description: "weapon, armor, potion, scroll, misc, or quest" },
                  description: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  valueGold: { type: Type.INTEGER },
                  damage: { type: Type.STRING },
                  bonus: { type: Type.STRING },
                  acBonus: { type: Type.INTEGER }
                },
                description: "Optional item acquired."
              },
              addedStatusEffects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING, description: "e.g. Poisoned, Blessed, Charmed, Blinded, Hasted, Raging" },
                    type: { type: Type.STRING, description: "buff, debuff, or neutral" },
                    description: { type: Type.STRING },
                    mechanicalEffect: { type: Type.STRING },
                    durationTurns: { type: Type.INTEGER },
                    color: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  },
                  required: ["name", "type", "description"]
                },
                description: "Optional new status effects or conditions inflicted or bestowed on the character."
              },
              removedStatusEffectIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Optional IDs or names of status effects removed or cured this turn."
              }
            }
          },
          location: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              region: { type: Type.STRING },
              atmosphere: { type: Type.STRING },
              dangerLevel: { type: Type.STRING, description: "Safe, Low, Medium, High, Extreme" },
              sceneryPrompt: {
                type: Type.STRING,
                description: "A vivid prompt for generating the new or updated scenery visual (e.g. dark fantasy digital painting of...)"
              }
            },
            required: ["name", "region", "atmosphere", "dangerLevel", "sceneryPrompt"]
          },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING, description: "Short, punchy action title (e.g. Strike the goblin leader)" },
                description: { type: Type.STRING, description: "Tactical explanation of the action." },
                riskLevel: { type: Type.STRING, description: "safe, moderate, risky, or deadly" },
                combatAction: { type: Type.BOOLEAN },
                check: {
                  type: Type.OBJECT,
                  properties: {
                    ability: { type: Type.STRING, description: "STR, DEX, CON, INT, WIS, or CHA" },
                    skillName: { type: Type.STRING, description: "e.g. Athletics, Stealth, Arcana, Intimidation" },
                    dc: { type: Type.INTEGER, description: "Difficulty Class (e.g. 10 to 18)" },
                    reason: { type: Type.STRING }
                  },
                  required: ["ability", "dc", "reason"]
                }
              },
              required: ["id", "label"]
            },
            description: "Four distinct procedural choice buttons."
          },
          inCombat: {
            type: Type.BOOLEAN
          },
          combatEnemy: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              hp: { type: Type.INTEGER },
              maxHp: { type: Type.INTEGER },
              ac: { type: Type.INTEGER },
              description: { type: Type.STRING }
            }
          }
        },
        required: ["narrative", "location", "choices"]
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        prompt,
        "You are an expert tabletop RPG Dungeon Master. Deliver rich, highly intriguing multi-paragraph storytelling, reactive D&D 5e mechanics, deep suspense, and structured tactical choice options.",
        responseSchema
      );

      if (rawJson) {
        const parsedData = JSON.parse(rawJson);
        return res.json(parsedData);
      }
    }
  } catch (err: unknown) {
    console.warn("Turn progression fallback activated due to API demand:", err);
  }

  // Guaranteed safe return
  return res.json(proceduralFallback);
});

// Perchance AI Image Generator API Integration
async function fetchPerchanceAiImage(
  rawPrompt: string,
  options: {
    aspectRatio?: string;
    stylePreset?: string;
    negativePrompt?: string;
    seed?: number;
  } = {}
): Promise<{ imageUrl: string; source: string } | null> {
  const cleanPrompt = rawPrompt
    .replace(/["'{}\[\]\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);

  const dynamicSeed = options.seed || Math.floor(Math.random() * 90000000) + 10000000;

  // Format shape/resolution for Perchance API
  let resolution = "square";
  if (options.aspectRatio === "16:9" || options.aspectRatio === "4:3") {
    resolution = "landscape";
  } else if (options.aspectRatio === "3:4" || options.aspectRatio === "9:16") {
    resolution = "portrait";
  }

  const defaultNegative =
    options.negativePrompt ||
    "blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark, low resolution, ugly, extra limbs";

  // Perchance API endpoints to try (official https://perchance.org/perchance-ai-api)
  const endpoints = [
    `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}&resolution=${resolution}&negativePrompt=${encodeURIComponent(defaultNegative)}&seed=${dynamicSeed}`,
    `https://perchance.org/perchance-ai-api?prompt=${encodeURIComponent(cleanPrompt)}&resolution=${resolution}&seed=${dynamicSeed}`,
    `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(cleanPrompt)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "image/jpeg,image/png,image/webp,image/*,application/json,*/*",
          Referer: "https://perchance.org/ai-image-generator",
        },
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";

      // If returned direct binary image
      if (contentType.includes("image/")) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 1200) {
          const buffer = Buffer.from(arrayBuffer);
          const mime = contentType.split(";")[0] || "image/jpeg";
          return {
            imageUrl: `data:${mime};base64,${buffer.toString("base64")}`,
            source: "https://perchance.org/perchance-ai-api",
          };
        }
      }

      // If returned JSON or text
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const candidateUrl =
          json.url || json.imageUrl || json.image || json.data?.url || json.output;
        if (candidateUrl && typeof candidateUrl === "string") {
          return {
            imageUrl: candidateUrl,
            source: "https://perchance.org/perchance-ai-api",
          };
        }
      } catch {
        if (
          text.trim().startsWith("http") &&
          (text.includes(".jpg") || text.includes(".png") || text.includes(".webp") || text.includes("image"))
        ) {
          return {
            imageUrl: text.trim(),
            source: "https://perchance.org/perchance-ai-api",
          };
        }
      }
    } catch {
      // Continue to next endpoint or cascade
    }
  }

  return null;
}

// 1. AI Studio (Gemini) Prompt Expander for Perchance: Takes simple user request (e.g. "a retro robot") and expands it into detailed prompt
app.post("/api/perchance/expand-prompt", async (req, res) => {
  const { userInput, stylePreset = "cinematic-fantasy", aspectRatio = "1:1" } = req.body || {};

  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return res.status(400).json({ error: "userInput is required." });
  }

  const cleanInput = userInput.trim();

  const styleGuides: Record<string, string> = {
    "cinematic-fantasy": "High fantasy digital concept art, dramatic cinematic rim lighting, volumetric mist, rich ornate textures, 8k resolution",
    "dark-gothic": "Dark gothic oil painting, moody Rembrandt chiaroscuro lighting, weathered medieval grit, grimdark aesthetic",
    "retro-synthwave": "1980s synthwave retro style, neon magenta and cyan lighting, scanlines, chrome reflections, vibrant nostalgic atmosphere",
    "heroic-anime": "Heroic anime concept art, sharp cel-shaded highlights, vibrant magical aura, dynamic composition, clean linework",
    "vintage-dnd": "Vintage D&D manual illustration, classic parchment texture, crosshatch ink shading, nostalgic fantasy aesthetic",
    "oil-masterpiece": "Classical oil on canvas masterpiece, rich vibrant pigments, expressive impasto brushstrokes, golden hour lighting",
  };

  const styleContext = styleGuides[stylePreset] || styleGuides["cinematic-fantasy"];

  try {
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `You are an expert AI prompt engineer for image generation via the Perchance AI API (https://perchance.org/perchance-ai-api).
Your task is to take a simple, short user input (e.g. "a retro robot", "a fiery dungeon boss", "an elf rogue in rain") and expand it into a detailed, visually descriptive, atmospheric image generation prompt.

GUIDELINES:
1. Capture the core subject clearly with vivid visual descriptors.
2. Incorporate artistic medium, lighting (e.g. rim light, neon glow, candlelight), atmosphere, mood, composition, and fine material textures.
3. Keep the expanded prompt concise, evocative, and punchy (1 to 2 sentences, between 120 and 220 characters max) so it produces optimal results with the Perchance AI image engine.
4. Output strict JSON with:
   - expandedPrompt: string (the enhanced prompt)
   - negativePrompt: string (things to avoid)
   - styleKeywords: array of string
   - previewTitle: string (short title summarizing the concept)`;

      const promptText = `Expand this short user request into a rich, detailed image generation prompt:
User Request: "${cleanInput}"
Style context: ${styleContext}
Aspect ratio target: ${aspectRatio}

Examples:
- User: "a retro robot" -> "A 1980s synthwave-style robot sitting in a neon-lit alleyway, hyper-detailed chrome plating, glowing cyan optics, vibrant colors, cinematic volumetric lighting"
- User: "fire mage" -> "A powerful pyromancer casting blazing crimson flame spirals in a dark obsidian chamber, glowing embers, volumetric lighting, epic digital concept art"
- User: "ancient crypt" -> "A forgotten subterranean stone crypt illuminated by glowing sapphire runes, crumbling gothic arches, eerie mist, dramatic shadows"`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          expandedPrompt: {
            type: Type.STRING,
            description: "The expanded detailed image prompt (120-220 chars)."
          },
          negativePrompt: {
            type: Type.STRING,
            description: "Recommended negative prompt to avoid artifacts."
          },
          styleKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          previewTitle: {
            type: Type.STRING
          }
        },
        required: ["expandedPrompt"]
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        promptText,
        systemInstruction,
        responseSchema
      );

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed.expandedPrompt) {
          return res.json({
            userInput: cleanInput,
            expandedPrompt: parsed.expandedPrompt,
            negativePrompt: parsed.negativePrompt || "blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark",
            styleKeywords: parsed.styleKeywords || [],
            previewTitle: parsed.previewTitle || cleanInput,
            source: "Gemini 3.7 Flash AI",
          });
        }
      }
    }
  } catch (err) {
    console.warn("Gemini prompt expansion fallback:", err);
  }

  // Heuristic expansion fallback if Gemini is offline
  const heuristicExpansion = `${styleContext}, ${cleanInput}, hyper-detailed, dramatic cinematic lighting, volumetric atmosphere, 8k resolution concept art`;
  return res.json({
    userInput: cleanInput,
    expandedPrompt: heuristicExpansion,
    negativePrompt: "blurry, bad anatomy, deformed, distorted, low quality, artifacts, watermark",
    styleKeywords: ["cinematic", "detailed", "atmospheric"],
    previewTitle: cleanInput,
    source: "Procedural Prompt Expansion",
  });
});

// 2. Perchance Full Flow: (Optional Gemini Expansion -> Perchance API image generation)
app.post("/api/perchance/generate", async (req, res) => {
  const {
    userInput,
    prompt,
    expandWithGemini = true,
    aspectRatio = "1:1",
    stylePreset = "cinematic-fantasy",
    negativePrompt,
    seed,
  } = req.body || {};

  const inputToUse = prompt || userInput;
  if (!inputToUse || typeof inputToUse !== "string" || !inputToUse.trim()) {
    return res.status(400).json({ error: "prompt or userInput is required." });
  }

  let finalDetailedPrompt = inputToUse.trim();
  let wasExpanded = false;
  let expansionSource = "Direct Prompt";

  // If user requested Gemini expansion or prompt is short (< 80 chars)
  if (expandWithGemini && inputToUse.length < 80) {
    try {
      const ai = getGeminiClient();
      if (ai) {
        const schema = {
          type: Type.OBJECT,
          properties: {
            expandedPrompt: { type: Type.STRING }
          },
          required: ["expandedPrompt"]
        };
        const rawJson = await generateGeminiJsonWithFallback(
          ai,
          `Expand this short request into a rich, detailed prompt for Perchance AI image generator: "${inputToUse}". Desired style: ${stylePreset}.`,
          "You are an AI image prompt expander for Perchance. Create a vivid, atmospheric prompt (1-2 sentences, 120-220 characters max) with lighting, textures, and mood.",
          schema
        );
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed.expandedPrompt) {
            finalDetailedPrompt = parsed.expandedPrompt;
            wasExpanded = true;
            expansionSource = "Gemini 3.7 Flash AI";
          }
        }
      }
    } catch (err) {
      console.warn("Auto-expansion error, continuing with base prompt:", err);
    }
  }

  // Resolve the seed up front so the seed we report back is the seed actually used.
  const dynamicSeed = seed || Math.floor(Math.random() * 90000000) + 10000000;

  // Now call Perchance AI API with the detailed prompt
  const perchanceResult = await fetchPerchanceAiImage(finalDetailedPrompt, {
    aspectRatio,
    stylePreset,
    negativePrompt,
    seed: dynamicSeed,
  });

  let resolution = "square";
  if (aspectRatio === "16:9" || aspectRatio === "4:3") resolution = "landscape";
  else if (aspectRatio === "3:4" || aspectRatio === "9:16") resolution = "portrait";

  const directPerchanceUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(finalDetailedPrompt)}&resolution=${resolution}&seed=${dynamicSeed}`;

  if (perchanceResult?.imageUrl) {
    return res.json({
      imageUrl: perchanceResult.imageUrl,
      perchanceApiUrl: directPerchanceUrl,
      originalInput: inputToUse,
      detailedPrompt: finalDetailedPrompt,
      wasExpanded,
      expansionSource,
      source: "https://perchance.org/perchance-ai-api",
      seed: dynamicSeed,
      isGenerated: true,
    });
  }

  // Fallback: Free AI or Direct Perchance URL
  const freeImg = await fetchFreeAiImage(finalDetailedPrompt, "flux");
  return res.json({
    imageUrl: freeImg || directPerchanceUrl,
    perchanceApiUrl: directPerchanceUrl,
    originalInput: inputToUse,
    detailedPrompt: finalDetailedPrompt,
    wasExpanded,
    expansionSource,
    source: "https://perchance.org/perchance-ai-api",
    seed: dynamicSeed,
    isGenerated: true,
  });
});

// Free AI Image Generation Helper (Flux / Turbo / Realism with multi-tier retry, dynamic seed, and prompt sanitization)
async function fetchFreeAiImage(rawPrompt: string, model: string = "flux"): Promise<string | null> {
  // Sanitize and trim prompt to prevent HTTP 414 URI Too Long and special char encoding failures
  const cleanPrompt = rawPrompt
    .replace(/["'{}\[\]\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  const modelsToTry = [
    model === "turbo" ? "turbo" : "flux",
    "flux-realism",
    "flux-anime",
    "turbo",
  ];

  for (const m of modelsToTry) {
    try {
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&model=${m}&seed=${dynamicSeed}&nologo=true&enhance=true`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(6500),
        headers: {
          "User-Agent": `DnDQuestStudio/${Date.now()}_${Math.random()}`,
          Accept: "image/jpeg,image/png,image/*,*/*",
        },
      });

      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength < 1200) continue;
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch {
      // Continue to next model/seed in cascade
    }
  }

  // Fallback: return direct dynamic URL with unique seed so browser image loader fetches it directly
  const fallbackSeed = Math.floor(Math.random() * 90000000) + 10000000;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&model=flux&seed=${fallbackSeed}&nologo=true`;
}

// Curated fantasy portraits fallback map (multiple distinct portraits per class)
const CURATED_CLASS_PORTRAITS: Record<string, string[]> = {
  paladin: [
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80"
  ],
  wizard: [
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80"
  ],
  sorcerer: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80"
  ],
  rogue: [
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80"
  ],
  cleric: [
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80"
  ],
  fighter: [
    "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80"
  ],
  barbarian: [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80"
  ],
  ranger: [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"
  ],
  warlock: [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80"
  ],
  bard: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80"
  ],
  druid: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80"
  ],
  monk: [
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"
  ],
};

function getCuratedPortraitByClass(className?: string): string {
  const clean = (className || "fighter").toLowerCase();
  const list = CURATED_CLASS_PORTRAITS[clean] || CURATED_CLASS_PORTRAITS.paladin;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

// Image Generation Endpoint (Supports Perchance AI Image Generator + Gemini 3.1 Flash Image + Multi-model Free AI generator)
app.post("/api/generate-image", async (req, res) => {
  const {
    prompt,
    aspectRatio = "1:1",
    imageSize = "1K",
    stylePreset = "cinematic-fantasy",
    modelChoice: rawModelChoice = "perchance",
    characterName,
    className,
    race,
  } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // Guard against a non-string modelChoice reaching .startsWith()/.includes().
  const modelChoice = String(rawModelChoice ?? "perchance");

  // Style prefixes tailored for fantasy character portraits and scenic visuals
  const styleModifiers: Record<string, string> = {
    "cinematic-fantasy": "Masterpiece high fantasy digital painting, dramatic rim lighting, cinematic lighting, volumetric atmosphere, intricate textures, 8k resolution, award winning character design.",
    "dark-gothic": "Dark gothic oil painting, moody Rembrandt chiaroscuro lighting, weathered medieval texture, grim dark atmosphere, detailed brushwork.",
    "heroic-anime": "Heroic high-detail anime concept art, vibrant magical aura, sharp cel-shaded highlights, dynamic composition, clean linework, studio quality.",
    "vintage-dnd": "Vintage D&D manual etching illustration, classic parchment texture, crosshatch ink shading, nostalgic fantasy aesthetic, hand-drawn detailing.",
    "oil-masterpiece": "Classical oil on canvas masterpiece, rich vibrant pigments, expressive impasto brushstrokes, golden hour lighting, museum quality portrait.",
  };

  const styleText = styleModifiers[stylePreset] || styleModifiers["cinematic-fantasy"];
  const isScenery = prompt.toLowerCase().includes("location") || prompt.toLowerCase().includes("scenery") || aspectRatio === "16:9";
  
  const fullPrompt = isScenery
    ? `${styleText} ${prompt}. Atmospheric landscape concept art, panoramic composition, high fantasy scenery, sharp focus, octane render.`
    : `${styleText} Fantasy character portrait of ${characterName || "Hero"} (${race || "Adventurer"} ${className || ""}): ${prompt}. Centered bust shot, high fidelity, sharp focus.`;

  // 1. Primary: Perchance AI Image Generator (if requested, auto, or default)
  if (modelChoice === "perchance" || modelChoice === "auto" || modelChoice === "free-flux") {
    const perchanceResult = await fetchPerchanceAiImage(fullPrompt, {
      aspectRatio,
      stylePreset,
    });

    if (perchanceResult) {
      return res.json({
        imageUrl: perchanceResult.imageUrl,
        source: perchanceResult.source || "Perchance AI Image Generator",
        modelUsed: "perchance-ai",
        isGenerated: true,
      });
    }

    // If perchance was explicitly requested, return direct Perchance AI API endpoint URL
    if (modelChoice === "perchance") {
      const dynamicSeed = Math.floor(Math.random() * 90000000) + 10000000;
      let resolution = "square";
      if (aspectRatio === "16:9" || aspectRatio === "4:3") resolution = "landscape";
      else if (aspectRatio === "3:4" || aspectRatio === "9:16") resolution = "portrait";
      const directPerchanceUrl = `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(fullPrompt.slice(0, 220))}&resolution=${resolution}&seed=${dynamicSeed}`;
      return res.json({
        imageUrl: directPerchanceUrl,
        source: "Perchance AI Image Generator",
        modelUsed: "perchance-ai",
        isGenerated: true,
      });
    }
  }

  // 2. Try Gemini Image Generation if AI is initialized and explicitly chosen or as tier-2 cascade
  const ai = getGeminiClient();
  if (ai && (modelChoice.startsWith("gemini") || modelChoice === "nano-banana-2" || modelChoice === "auto")) {
    const modelsToTry = [
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
    ];

    for (const modelName of modelsToTry) {
      try {
        const imageConfig: {
          aspectRatio?: "16:9" | "1:1" | "4:3" | "3:4" | "9:16" | "1:4" | "1:8" | "4:1" | "8:1";
          imageSize?: "512px" | "1K" | "2K" | "4K";
        } = {
          aspectRatio: (aspectRatio || "1:1") as "16:9" | "1:1" | "4:3" | "3:4" | "9:16",
        };

        if (modelName === "gemini-3.1-flash-image") {
          imageConfig.imageSize = (imageSize || "1K") as "512px" | "1K" | "2K" | "4K";
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: {
            imageConfig,
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
              return res.json({
                imageUrl,
                source: "Gemini 3.1 Flash Image AI",
                modelUsed: modelName,
                isGenerated: true,
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn(`Gemini image generation attempt failed for ${modelName}:`, geminiErr);
      }
    }
  }

  // 3. Fallback to Perchance AI if not already tried
  if (modelChoice !== "perchance" && modelChoice !== "auto") {
    const perchanceFallback = await fetchPerchanceAiImage(fullPrompt, {
      aspectRatio,
      stylePreset,
    });
    if (perchanceFallback) {
      return res.json({
        imageUrl: perchanceFallback.imageUrl,
        source: "Perchance AI Image Generator",
        modelUsed: "perchance-ai",
        isGenerated: true,
      });
    }
  }

  // 4. Free Flux / Turbo AI Generation with unique dynamic seeds
  const freeModel = modelChoice.includes("turbo") ? "turbo" : "flux";
  const freeImageUrl = await fetchFreeAiImage(fullPrompt, freeModel);
  if (freeImageUrl) {
    return res.json({
      imageUrl: freeImageUrl,
      source: freeModel === "turbo" ? "Free Turbo AI (Instant)" : "Free Flux AI (High Detail)",
      modelUsed: freeModel,
      isGenerated: true,
    });
  }

  // 5. Procedural Artisan SVG fallback
  const charInfo = {
    name: characterName || prompt.slice(0, 15),
    className: className || (prompt.includes("Wizard") ? "Wizard" : prompt.includes("Rogue") ? "Rogue" : "Paladin"),
    race: race || "Hero",
  };

  const fallbackSvg = generateProceduralCharacterSvg(charInfo, prompt);
  return res.json({
    imageUrl: fallbackSvg,
    source: "Procedural Artisan Avatar",
    isGenerated: true,
    note: "Procedural fantasy artisan avatar generated.",
  });
});

// Image Editing Endpoint (Allows refining / modifying existing character portrait via Perchance AI / Nano Banana 2)
app.post("/api/edit-image", async (req, res) => {
  const {
    imageBase64,
    editPrompt,
    aspectRatio = "1:1",
    modelChoice: rawModelChoice = "perchance",
    characterName,
    className,
    race,
  } = req.body || {};

  if (!editPrompt || typeof editPrompt !== "string") {
    return res.status(400).json({ error: "editPrompt is required." });
  }

  // Guard against a non-string modelChoice reaching .startsWith().
  const modelChoice = String(rawModelChoice ?? "perchance");

  // 1. Try Gemini Image-to-Image editing if Gemini client is active
  const ai = getGeminiClient();
  if (ai && imageBase64 && (modelChoice.startsWith("gemini") || modelChoice === "nano-banana-2")) {
    let cleanData = imageBase64;
    let mimeType = "image/png";
    if (imageBase64.includes(";base64,")) {
      const split = imageBase64.split(";base64,");
      mimeType = split[0].replace("data:", "") || "image/png";
      cleanData = split[1];
    }

    // Only forward modelChoice as a model id when it actually names a Gemini
    // model; aliases like "nano-banana-2" are not valid model ids and would
    // burn an attempt on a guaranteed error.
    const modelsToTry = [
      modelChoice.startsWith("gemini") ? modelChoice : "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
    ];

    const uniqueModels = Array.from(new Set(modelsToTry));

    for (const modelName of uniqueModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanData,
                  mimeType,
                },
              },
              {
                text: `Modify and edit this fantasy character portrait according to instructions: ${editPrompt}. Maintain character facial structure and high fantasy art quality.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: (aspectRatio || "1:1") as "16:9" | "1:1" | "4:3" | "3:4" | "9:16",
            },
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
              return res.json({
                imageUrl,
                source: "Nano Banana 2 (Edited)",
                modelUsed: modelName,
                isGenerated: true,
              });
            }
          }
        }
      } catch {
        // Silently continue to Perchance AI fallback
      }
    }
  }

  // 2. Refine Portrait with Perchance AI Image Generator
  const refinedPrompt = `Masterpiece high fantasy digital painting character portrait of ${characterName || "Hero"} (${race || "Adventurer"} ${className || ""}), modified with: ${editPrompt}. Dramatic rim lighting, centered bust shot, ultra detailed concept art.`;
  
  const perchanceEdited = await fetchPerchanceAiImage(refinedPrompt, {
    aspectRatio,
  });

  if (perchanceEdited) {
    return res.json({
      imageUrl: perchanceEdited.imageUrl,
      source: "Perchance AI (Refined)",
      modelUsed: "perchance-ai",
      isGenerated: true,
      note: "Portrait refined using Perchance AI Image Generator.",
    });
  }

  // 3. Fallback to Free Flux AI
  const freeEditedUrl = await fetchFreeAiImage(refinedPrompt, "flux");
  if (freeEditedUrl) {
    return res.json({
      imageUrl: freeEditedUrl,
      source: "Free Flux AI (Refined)",
      modelUsed: "flux",
      isGenerated: true,
      note: "Portrait refined using Free Flux AI Engine."
    });
  }

  // 4. Graceful fallback for editing: update procedural avatar with modified prompt
  const charInfo = {
    name: characterName || "Hero",
    className: className || "Champion",
    race: race || "Hero",
  };
  const updatedSvg = generateProceduralCharacterSvg(charInfo, editPrompt);
  return res.json({
    imageUrl: updatedSvg,
    source: "Free Artisan Avatar (Enhanced)",
    isGenerated: true,
    note: "Portrait modified with procedural enhancements.",
  });
});

// Ultra-Natural AI Dungeon Master Text-to-Speech (TTS) Endpoint
app.post("/api/tts", async (req, res) => {
  const {
    text,
    voice = "Fenrir",
    rate = 1.0,
    pitch = 1.0,
    stylePrompt,
  } = req.body || {};

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Text is required for speech synthesis." });
  }

  const cleanText = text.trim();
  const validVoices = ["Fenrir", "Charon", "Zephyr", "Kore", "Puck"];
  const selectedVoice = validVoices.includes(voice) ? voice : "Fenrir";

  const voiceStyles: Record<string, string> = {
    Fenrir: "Narrate as a master tabletop RPG Dungeon Master in a deep, gravelly, commanding, atmospheric fantasy tone with cinematic pacing and natural pauses.",
    Charon: "Narrate as a dark, ominous, gravelly crypt-keeper with a somber, suspenseful, raspy cadence.",
    Zephyr: "Narrate as an articulate, noble, wise grand chronicler with clear, balanced, epic storytelling delivery.",
    Kore: "Narrate as a mystical, ethereal, calm elven seer with soft, melodic, enchanting resonance.",
    Puck: "Narrate as a lively, animated, dramatic tavern bard with spirited energy and expressive theatrical inflection.",
  };

  const styleDirective = stylePrompt || voiceStyles[selectedVoice] || voiceStyles.Fenrir;
  const prompt = `${styleDirective}\n\nNarrative text:\n${cleanText}`;

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data
      );

      if (audioPart && audioPart.inlineData?.data) {
        return res.json({
          audioBase64: audioPart.inlineData.data,
          mimeType: audioPart.inlineData.mimeType || "audio/pcm;rate=24000",
          voice: selectedVoice,
          rate: Number(rate) || 1.0,
          pitch: Number(pitch) || 1.0,
          source: "gemini-tts",
        });
      }
    } catch (err: any) {
      console.warn("Gemini Flash TTS API call failed:", err?.message || err);
    }
  }

  // Graceful fallback for client when offline or key unavailable
  return res.json({
    audioBase64: null,
    voice: selectedVoice,
    rate: Number(rate) || 1.0,
    pitch: Number(pitch) || 1.0,
    source: "browser-fallback",
    message: "Using natural browser speech synthesis.",
  });
});

// Custom Item Forge Endpoint (Generates balanced D&D 5e stats, descriptions, and retro square image from user prompt)
app.post("/api/generate-custom-item", async (req, res) => {
  const { prompt, type, heroClass, race, gender } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Custom item prompt is required." });
  }

  const cleanPrompt = prompt.trim();
  const itemId = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Default procedural fallback item
  const proceduralFallbackItem = {
    id: itemId,
    name: cleanPrompt.length > 28 ? cleanPrompt.slice(0, 28) : cleanPrompt,
    type: (type || (cleanPrompt.toLowerCase().includes('shield') || cleanPrompt.toLowerCase().includes('armor') ? 'armor' : cleanPrompt.toLowerCase().includes('potion') ? 'potion' : cleanPrompt.toLowerCase().includes('scroll') ? 'scroll' : 'weapon')) as 'weapon' | 'armor' | 'potion' | 'scroll' | 'misc' | 'quest',
    description: `A custom crafted artifact: "${cleanPrompt}". Imbued with personalized enchantments and storied craftsmanship.`,
    quantity: 1,
    damage: cleanPrompt.toLowerCase().includes('sword') || cleanPrompt.toLowerCase().includes('blade') ? '1d8 + 3 Slashing' : cleanPrompt.toLowerCase().includes('bow') ? '1d8 + 3 Piercing' : '1d6 + 2 Magical',
    bonus: '+1 Enchantment Bonus',
    acBonus: cleanPrompt.toLowerCase().includes('shield') ? 2 : cleanPrompt.toLowerCase().includes('armor') ? 4 : undefined,
    valueGold: 75,
    isCustom: true,
    imageUrl: `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(`Masterpiece fantasy concept art: ${cleanPrompt}, a ${type || 'magical relic'}, ornate craftsmanship, studio pedestal lighting, octane render, 8k`)}&resolution=square&seed=${Math.floor(Math.random() * 89999999) + 10000000}`
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `You are a legendary D&D 5e Master Blacksmith and Enchanter.
Given a player's concept for a custom item, generate balanced, evocative 5e mechanics, flavorful lore, and precise gameplay stats.
Ensure the item has:
- name: Evocative fantasy name (under 30 characters)
- type: 'weapon', 'armor', 'potion', 'scroll', 'misc', or 'quest'
- description: Rich, atmospheric 1-2 sentence description detailing appearance and enchantment
- damage: (if weapon, e.g. "1d8 + 2 Slashing (+1d4 Fire)")
- acBonus: (if armor or shield, number e.g. 2 to 5)
- bonus: (e.g. "+1 to attack rolls", "+2 to Stealth", "Advantage on Arcana checks")
- valueGold: (reasonable fair gold price e.g. 40 to 150)
- quantity: 1`;

      const userPrompt = `Forge a custom 5e item based on: "${cleanPrompt}"
Hero Context: ${gender ? `${gender} ` : ''}${race || 'Hero'} ${heroClass || 'Adventurer'}
Preferred Type: ${type || 'auto-detect'}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, description: "weapon, armor, potion, scroll, misc, or quest" },
          description: { type: Type.STRING },
          damage: { type: Type.STRING },
          acBonus: { type: Type.INTEGER },
          bonus: { type: Type.STRING },
          valueGold: { type: Type.INTEGER },
          quantity: { type: Type.INTEGER }
        },
        required: ["name", "type", "description", "valueGold"]
      };

      const rawJson = await generateGeminiJsonWithFallback(ai, userPrompt, systemInstruction, responseSchema);
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const itemName = parsed.name || proceduralFallbackItem.name;
        const itemType = parsed.type || proceduralFallbackItem.type;
        const itemDesc = parsed.description || proceduralFallbackItem.description;
        const seed = Math.floor(Math.random() * 89999999) + 10000000;
        const perchancePrompt = `Masterpiece fantasy concept art: ${itemName}, a rare ${itemType}. ${itemDesc}. High detail, dramatic pedestal lighting, 8k resolution, octane render`;

        const craftedItem = {
          id: itemId,
          name: itemName,
          type: itemType,
          description: itemDesc,
          quantity: parsed.quantity || 1,
          damage: parsed.damage || (itemType === 'weapon' ? '1d8 + 2 Slashing' : undefined),
          acBonus: parsed.acBonus,
          bonus: parsed.bonus || '+1 Custom Story Bonus',
          valueGold: parsed.valueGold || 80,
          isCustom: true,
          imageUrl: `https://perchance.org/perchance-ai-api?v1/image&prompt=${encodeURIComponent(perchancePrompt)}&resolution=square&seed=${seed}`
        };
        return res.json({ item: craftedItem, source: "Gemini Master Forge" });
      }
    }
  } catch (err) {
    console.warn("Custom item generator fallback activated:", err);
  }

  return res.json({ item: proceduralFallbackItem, source: "Artisan Forge Fallback" });
});

// AI Custom Race & Class Synthesizer Endpoint
app.post("/api/generate-custom-race-or-class", async (req, res) => {
  const body = req.body || {};
  // Accept both the documented field names and the aliases the client sends
  // ("mode", "worldTheme"/"premise") so a class request is never silently
  // handled as a race request.
  const rawTarget = body.targetType ?? body.mode ?? "race";
  const targetType = String(rawTarget).toLowerCase() === "class" ? "class" : "race";
  const prompt = body.prompt ?? body.concept ?? body.premise ?? "";
  const storyTheme =
    (typeof body.storyTheme === "string" && body.storyTheme.trim()) ? body.storyTheme.trim() :
    (typeof body.worldTheme === "string" && body.worldTheme.trim()) ? body.worldTheme.trim() :
    "Fantasy Adventure";
  const cleanConcept = (typeof prompt === "string" && prompt.trim()) ? prompt.trim() : `A unique and inspiring ${targetType} for a ${storyTheme} adventure.`;

  // The client forms use `racialTraits` / `baseHp` / `baseAc` / `primaryAbility`,
  // while the model schema produces `traits` / `hp` / `ac` / `primary`.
  // Emit both spellings so either consumer reads a populated value.
  const withRaceAliases = (race: any) => ({
    ...race,
    traits: race.traits ?? race.racialTraits,
    racialTraits: race.racialTraits ?? race.traits,
  });
  const withClassAliases = (cls: any) => ({
    ...cls,
    primary: cls.primary ?? cls.primaryAbility,
    primaryAbility: cls.primaryAbility ?? cls.primary,
    hp: cls.hp ?? cls.baseHp,
    baseHp: cls.baseHp ?? cls.hp,
    ac: cls.ac ?? cls.baseAc,
    baseAc: cls.baseAc ?? cls.ac,
    startingEquipment: cls.startingEquipment ?? cls.defaultItems,
    defaultItems: cls.defaultItems ?? cls.startingEquipment,
  });

  try {
    const ai = getGeminiClient();
    if (ai) {
      if (targetType === "race") {
        const systemInstruction = `You are an expert D&D 5e racial trait designer and worldbuilder.
Create a unique, balanced, and evocative custom fantasy race based on the user's concept.
Include name, evocative lore/origins, racial traits, stat bonuses (e.g. { str: 2, con: 1 }), base speed (usually 25 to 35), senses (e.g. "Darkvision 60ft"), and a distinctive special ability.`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            lore: { type: Type.STRING },
            traits: { type: Type.STRING },
            statBonuses: {
              type: Type.OBJECT,
              properties: {
                str: { type: Type.INTEGER },
                dex: { type: Type.INTEGER },
                con: { type: Type.INTEGER },
                int: { type: Type.INTEGER },
                wis: { type: Type.INTEGER },
                cha: { type: Type.INTEGER },
              },
            },
            speed: { type: Type.INTEGER },
            senses: { type: Type.STRING },
            specialAbility: { type: Type.STRING },
          },
          required: ["name", "lore", "traits", "speed", "specialAbility"],
        };

        const rawJson = await generateGeminiJsonWithFallback(
          ai,
          `Design a custom race based on: "${cleanConcept}" for a ${storyTheme} setting.`,
          systemInstruction,
          responseSchema
        );

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return res.json({
            race: withRaceAliases({
              id: `custom-race-${Date.now()}`,
              ...parsed,
              isCustom: true,
            }),
          });
        }
      } else {
        const systemInstruction = `You are an expert D&D 5e class designer and combat balancer.
Create a unique, exciting, and balanced custom class archetype based on the user's concept.
Include name, hitDie ('d6', 'd8', 'd10', or 'd12'), primary abilities (e.g. 'STR / INT'), description/role lore, default starting stats (total around 75), 3 starting items, base HP, base AC, and a signature special combat or spellcasting ability.`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            hitDie: { type: Type.STRING },
            primary: { type: Type.STRING },
            description: { type: Type.STRING },
            defaultStats: {
              type: Type.OBJECT,
              properties: {
                str: { type: Type.INTEGER },
                dex: { type: Type.INTEGER },
                con: { type: Type.INTEGER },
                int: { type: Type.INTEGER },
                wis: { type: Type.INTEGER },
                cha: { type: Type.INTEGER },
              },
              required: ["str", "dex", "con", "int", "wis", "cha"],
            },
            defaultItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            hp: { type: Type.INTEGER },
            ac: { type: Type.INTEGER },
            specialAbility: { type: Type.STRING },
          },
          required: ["name", "hitDie", "primary", "description", "defaultStats", "defaultItems", "hp", "ac", "specialAbility"],
        };

        const rawJson = await generateGeminiJsonWithFallback(
          ai,
          `Design a custom class based on: "${cleanConcept}" for a ${storyTheme} setting.`,
          systemInstruction,
          responseSchema
        );

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return res.json({
            customClass: withClassAliases({
              id: `custom-class-${Date.now()}`,
              ...parsed,
              isCustom: true,
            }),
          });
        }
      }
    }
  } catch (err) {
    console.warn("Custom race/class generator fallback activated:", err);
  }

  // Fallback
  if (targetType === "race") {
    return res.json({
      race: withRaceAliases({
        id: `custom-race-${Date.now()}`,
        name: cleanConcept.slice(0, 24) || "Astral Wanderer",
        lore: `A resilient race forged in the mystical boundaries of ${storyTheme}.`,
        traits: "+2 DEX, +1 WIS • Innate agility and heightened awareness",
        statBonuses: { dex: 2, wis: 1 },
        speed: 30,
        senses: "Darkvision 60ft",
        specialAbility: "Adaptive Reflex: Gain advantage on one dexterity save per encounter.",
        isCustom: true,
      }),
    });
  } else {
    return res.json({
      customClass: withClassAliases({
        id: `custom-class-${Date.now()}`,
        name: cleanConcept.slice(0, 24) || "Arcane Vanguard",
        hitDie: "d10",
        primary: "STR / INT",
        description: `A battle-forged combatant merging tactical melee strikes with arcane power for ${storyTheme}.`,
        defaultStats: { str: 16, dex: 12, con: 14, int: 14, wis: 10, cha: 8 },
        defaultItems: ["Runed Bastard Sword", "Aegis Breastplate", "Potion of Focused Surge"],
        hp: 20,
        ac: 16,
        specialAbility: "Arcane Strike: Infuse weapon with +1d6 force damage.",
        isCustom: true,
      }),
    });
  }
});

// Story Prompt Enhancer & Full Campaign Synthesizer Endpoint Handler
// Enhances raw story prompt/keywords and derives all campaign options (world, hazards, rules, difficulty, heroes, relics)
const handleEnhanceStoryPrompt = async (req: express.Request, res: express.Response) => {
  const { rawPrompt, premise, tone, focus, pacing } = req.body;
  const cleanPrompt = ((rawPrompt || premise) && typeof (rawPrompt || premise) === "string")
    ? (rawPrompt || premise).trim()
    : "A dangerous expedition into forgotten ruins to uncover ancient power.";
  const narrativeTone = (tone && typeof tone === "string") ? tone.trim() : "Epic High Fantasy";
  const narrativeFocus = (focus && typeof focus === "string") ? focus.trim() : "Ancient Relic Hunt";
  const adventurePacing = (pacing && typeof pacing === "string") ? pacing.trim() : "Heroic & Cinematic";

  // Robust procedural fallback without forced fixed template variables
  const proceduralFallback = {
    campaignTitle: cleanPrompt.length < 35 ? cleanPrompt : `The Quest of ${cleanPrompt.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '') || "the Forgotten Vault"}`,
    title: cleanPrompt.length < 35 ? cleanPrompt : `The Quest of ${cleanPrompt.slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '') || "the Forgotten Vault"}`,
    enhancedPremise: cleanPrompt,
    theme: `${narrativeTone} • ${narrativeFocus}`,
    worldTheme: `${narrativeTone} • ${narrativeFocus}`,
    environmentLore: `Mysterious atmosphere echoing with ancient history and perilous environmental hazards.`,
    questObjective: `Pursue the quest objective through uncharted perils.`,
    recommendedRuleStrictness: (narrativeTone.includes("Gothic") || narrativeTone.includes("Grim") || adventurePacing.includes("Tactical")) ? "hard" : "soft",
    recommendedDifficulty: (narrativeTone.includes("Gothic") || narrativeTone.includes("Grim") || narrativeTone.includes("Cosmic")) ? "heroic" : "standard",
    recommendedRaces: ["Human", "Elf", "Dwarf", "Tiefling", "Half-Elf", "Genasi"],
    recommendedClasses: ["Fighter", "Rogue", "Wizard", "Cleric", "Ranger", "Paladin"],
    openingLocation: "The Gateway Threshold",
    heroes: [
      {
        id: "synth-hero-1",
        name: "Valen Shadow-Weave",
        title: "Relic Infiltrator",
        race: "Elf",
        gender: "Non-Binary",
        className: "Rogue",
        background: "Dungeon Delver & Relic Hunter",
        alignment: "Chaotic Good",
        storyMotivation: `Seeking to secure the artifact before ruthless rivals can harness its destructive power.`,
        customTrait: "Keen trap sense and silent step on echoing stone surfaces",
        stats: { str: 10, dex: 16, con: 14, int: 13, wis: 12, cha: 8 },
        hp: 10,
        ac: 14,
        portraitPrompt: "Digital art portrait of Valen Shadow-Weave, an agile Elf Rogue in dark leather armor holding lockpicks and an obsidian dagger, cinematic lighting.",
        items: [
          { id: "synth-item-1", name: "Rune-Carved Dagger", type: "weapon", description: "1d4+3 piercing • glows faint blue near magical traps", damage: "1d4+3 piercing", quantity: 1, valueGold: 25 },
          { id: "synth-item-2", name: "Masterwork Thieves' Tools", type: "misc", description: "+2 to lockpicking and disarming mechanical traps", bonus: "+2 Lockpicking", quantity: 1, valueGold: 30 },
          { id: "synth-item-3", name: "Elixir of Cat's Grace", type: "potion", description: "Grants advantage on Dexterity checks for 10 minutes", quantity: 1, valueGold: 50 },
        ],
      },
      {
        id: "synth-hero-2",
        name: "Thorik Iron-Ward",
        title: "Vanguard Sentinel",
        race: "Dwarf",
        gender: "Male",
        className: "Fighter",
        background: "Veteran Fortress Guardian",
        alignment: "Lawful Good",
        storyMotivation: `Sworn on ancestral honor to cleanse the horrors lurking within the ruins.`,
        customTrait: "Resilience against poison and darkvision in subterranean vaults",
        stats: { str: 16, dex: 10, con: 16, int: 8, wis: 12, cha: 10 },
        hp: 13,
        ac: 16,
        portraitPrompt: "Digital art portrait of Thorik Iron-Ward, a rugged Dwarf Fighter in heavy plate armor with a heavy battleaxe, dramatic lighting.",
        items: [
          { id: "synth-item-4", name: "Forged Dwarven Waraxe", type: "weapon", description: "1d8+3 slashing • heavy steel with ancestral runes", damage: "1d8+3 slashing", quantity: 1, valueGold: 30 },
          { id: "synth-item-5", name: "Reinforced Iron Shield", type: "armor", description: "+2 Armor Class", acBonus: 2, quantity: 1, valueGold: 20 },
          { id: "synth-item-6", name: "Draught of Vitality", type: "potion", description: "Restores 2d4+2 hit points", quantity: 2, valueGold: 50 },
        ],
      },
      {
        id: "synth-hero-3",
        name: "Lyra Star-Gazer",
        title: "Arcane Inquisitor",
        race: "Tiefling",
        gender: "Female",
        className: "Wizard",
        background: "Occult Scholar & Sigil Master",
        alignment: "Neutral Good",
        storyMotivation: `Deciphering the forbidden incantations sealed away by ancient mages.`,
        customTrait: "Arcane insight allowing spontaneous deciphering of unknown runes",
        stats: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
        hp: 8,
        ac: 12,
        portraitPrompt: "Digital art portrait of Lyra Star-Gazer, a Tiefling Wizard with glowing horns holding a spellbook with floating golden runes, dark fantasy concept art.",
        items: [
          { id: "synth-item-7", name: "Focus Staff of Astral Glass", type: "weapon", description: "1d6 bludgeoning • +1 to spell attack rolls", damage: "1d6 bludgeoning", bonus: "+1 Spell Attack", quantity: 1, valueGold: 45 },
          { id: "synth-item-8", name: "Scroll of Burning Hands", type: "scroll", description: "Casts Burning Hands (3d6 fire damage, 15ft cone)", quantity: 1, valueGold: 40 },
          { id: "synth-item-9", name: "Luminescent Focus Stone", type: "misc", description: "Sheds bright light in a 20ft radius on command", quantity: 1, valueGold: 15 },
        ],
      },
    ],
    thematicItems: [
      { id: "synth-relic-1", name: "Warded Delver's Compass", type: "misc", description: "Spins to point toward hidden secret doors and magical conduits", bonus: "Detect Secrets", quantity: 1, valueGold: 60 },
      { id: "synth-relic-2", name: "Glowstone Torch", type: "misc", description: "Emits warm steady light that cannot be snuffed by mundane water or wind", quantity: 1, valueGold: 20 },
      { id: "synth-relic-3", name: "Potion of Superior Healing", type: "potion", description: "Restores 2d4+4 HP and cures minor paralysis", quantity: 1, valueGold: 75 },
      { id: "synth-relic-4", name: "Serrated Silver Blade", type: "weapon", description: "1d6+2 piercing • effective against ethereal and undead creatures", damage: "1d6+2 piercing", quantity: 1, valueGold: 50 },
    ],
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `You are a master D&D 5e Campaign Director, Worldbuilder, and Character Designer.
The player has provided a raw story prompt/concept: "${cleanPrompt}".
Selected Tone: "${narrativeTone}"
Selected Quest Focus: "${narrativeFocus}"
Selected Adventure Pacing: "${adventurePacing}"

Your job is to ENHANCE the story prompt and SYNTHESIZE the entire campaign setting and options from it in one cohesive, gripping response:
1. campaignTitle: A punchy, evocative campaign name (under 40 chars)
2. enhancedPremise: 3-4 vivid, high-stakes narrative sentences setting up the lore, central conflict, imminent danger, and the player's quest goal.
3. theme: Setting theme (e.g. "Gothic Vampire Stronghold", "Submerged Eldritch Vaults", "Clockwork Sky-Spire Heist")
4. environmentLore: 1-2 sensory sentences describing atmospheric hazards, lighting, weather, traps, or arcane phenomena.
5. questObjective: 1 crisp sentence stating the primary goal.
6. recommendedRuleStrictness: "hard" (strict 5e rules & DC benchmarks for survival/tactical tones), "soft" (rule of cool & heroic flexibility), or "none" (narrative freeform).
7. recommendedDifficulty: "story" (easy/forgiving), "standard" (balanced 5e), "heroic" (high stakes), or "nightmare" (deadly tactical).
8. recommendedRaces: Array of 4-6 D&D races that fit this story world exceptionally well.
9. recommendedClasses: Array of 4-6 D&D classes best suited to face these hazards.
10. openingLocation: Name of the starting room/threshold where the hero begins the quest.
11. heroes: Array of 3-4 unique, bespoke Hero Concepts born directly from this story (each with id, name, title, race, gender, className, background, alignment, storyMotivation, customTrait, stats: {str, dex, con, int, wis, cha}, hp, ac, portraitPrompt, items: Array of 3 thematic starting items).
12. thematicItems: Array of 4 unique story relics/tools tailored specifically for surviving this story's hazards.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          campaignTitle: { type: Type.STRING },
          enhancedPremise: { type: Type.STRING },
          theme: { type: Type.STRING },
          environmentLore: { type: Type.STRING },
          questObjective: { type: Type.STRING },
          recommendedRuleStrictness: { type: Type.STRING },
          recommendedDifficulty: { type: Type.STRING },
          recommendedRaces: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedClasses: { type: Type.ARRAY, items: { type: Type.STRING } },
          openingLocation: { type: Type.STRING },
          heroes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                race: { type: Type.STRING },
                gender: { type: Type.STRING },
                className: { type: Type.STRING },
                background: { type: Type.STRING },
                alignment: { type: Type.STRING },
                storyMotivation: { type: Type.STRING },
                customTrait: { type: Type.STRING },
                stats: {
                  type: Type.OBJECT,
                  properties: {
                    str: { type: Type.INTEGER },
                    dex: { type: Type.INTEGER },
                    con: { type: Type.INTEGER },
                    int: { type: Type.INTEGER },
                    wis: { type: Type.INTEGER },
                    cha: { type: Type.INTEGER },
                  },
                  required: ["str", "dex", "con", "int", "wis", "cha"],
                },
                hp: { type: Type.INTEGER },
                ac: { type: Type.INTEGER },
                portraitPrompt: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      description: { type: Type.STRING },
                      damage: { type: Type.STRING },
                      acBonus: { type: Type.INTEGER },
                      bonus: { type: Type.STRING },
                      quantity: { type: Type.INTEGER },
                      valueGold: { type: Type.INTEGER },
                    },
                    required: ["id", "name", "type", "description", "quantity"],
                  },
                },
              },
              required: ["id", "name", "title", "race", "gender", "className", "background", "alignment", "storyMotivation", "stats", "hp", "ac", "portraitPrompt", "items"],
            },
          },
          thematicItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                damage: { type: Type.STRING },
                acBonus: { type: Type.INTEGER },
                bonus: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                valueGold: { type: Type.INTEGER },
              },
              required: ["id", "name", "type", "description", "quantity"],
            },
          },
        },
        required: [
          "campaignTitle",
          "enhancedPremise",
          "theme",
          "environmentLore",
          "questObjective",
          "recommendedRuleStrictness",
          "recommendedDifficulty",
          "recommendedRaces",
          "recommendedClasses",
          "openingLocation",
          "heroes",
          "thematicItems"
        ]
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        `Enhance this prompt and synthesize the campaign setting, rules, heroes, and relics: "${cleanPrompt}" (Tone: ${narrativeTone}, Focus: ${narrativeFocus}, Pacing: ${adventurePacing})`,
        systemInstruction,
        responseSchema
      );

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const heroesList = (Array.isArray(parsed.heroes) ? parsed.heroes : []).map((hero: any) => ({
          ...hero,
          items: (hero.items || []).map((item: any) => ({
            ...item,
            imageUrl: generateProceduralItemSvg(item),
          })),
        }));

        const itemsList = (Array.isArray(parsed.thematicItems) ? parsed.thematicItems : []).map((item: any) => ({
          ...item,
          imageUrl: generateProceduralItemSvg(item),
        }));

        const result = {
          ...parsed,
          title: parsed.campaignTitle || parsed.title,
          campaignTitle: parsed.campaignTitle || parsed.title,
          worldTheme: parsed.theme || parsed.worldTheme || narrativeTone,
          theme: parsed.theme || parsed.worldTheme || narrativeTone,
          bespokeHeroes: heroesList,
          heroes: heroesList,
          thematicItems: itemsList,
          items: itemsList,
        };
        return res.json(result);
      }
    }
  } catch (err) {
    console.warn("Prompt enhancer synthesis fallback activated:", err);
  }

  // Format procedural fallback items
  const fallbackHeroes = proceduralFallback.heroes.map((hero) => ({
    ...hero,
    items: hero.items.map((item) => ({
      ...item,
      imageUrl: generateProceduralItemSvg(item),
    })),
  }));

  const fallbackItems = proceduralFallback.thematicItems.map((item) => ({
    ...item,
    imageUrl: generateProceduralItemSvg(item),
  }));

  const formattedFallback = {
    ...proceduralFallback,
    bespokeHeroes: fallbackHeroes,
    heroes: fallbackHeroes,
    thematicItems: fallbackItems,
    items: fallbackItems,
  };

  return res.json(formattedFallback);
};

// Register routes for story enhancement and synthesis
app.post("/api/enhance-prompt-and-synthesize-campaign", handleEnhanceStoryPrompt);
app.post("/api/enhance-story-prompt", handleEnhanceStoryPrompt);

// Story Premise Expander Endpoint (Enriches player premise into rich world setting lore)
app.post("/api/expand-story-premise", async (req, res) => {
  const { premise } = req.body;
  if (!premise || typeof premise !== "string") {
    return res.status(400).json({ error: "Premise is required" });
  }

  const cleanPremise = premise.trim();
  const fallbackExpansion = {
    title: "The Perilous Quest",
    expandedPremise: `${cleanPremise}. Ancient secrets lie buried in the shadows, where treacherous obstacles and lingering perils test the mettle of any daring adventurer.`,
    theme: "Dark Fantasy Adventure",
    environmentLore: "Atmospheric dungeons, shadowed ruins, and perilous terrain rich with forgotten lore.",
    recommendedRaces: ["Human", "Elf", "Dwarf", "Half-Elf", "Tiefling"],
    recommendedClasses: ["Fighter", "Wizard", "Rogue", "Cleric", "Paladin"],
  };

  try {
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `You are a master tabletop RPG Campaign Architect and Worldbuilder.
Take the user's brief story premise and expand it into an immersive, highly engaging campaign setting pitch for a solo D&D 5e adventure.
Include:
- title: Evocative title for the campaign (under 40 chars)
- expandedPremise: 2-3 sentences of gripping adventure lore, quest objectives, and high-stakes tension
- theme: Style theme (e.g., "Gothic Horror", "Sunken Ocean Ruins", "Arcanepunk Heist", "Feywild Mystery")
- environmentLore: 1 vivid sentence describing the atmosphere and environmental hazards
- recommendedRaces: Array of 3-5 D&D races that fit this setting exceptionally well
- recommendedClasses: Array of 3-5 D&D classes that fit this setting exceptionally well`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          expandedPremise: { type: Type.STRING },
          theme: { type: Type.STRING },
          environmentLore: { type: Type.STRING },
          recommendedRaces: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedClasses: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "expandedPremise", "theme", "environmentLore", "recommendedRaces", "recommendedClasses"]
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        `Expand and elevate this D&D 5e story premise: "${cleanPremise}"`,
        systemInstruction,
        responseSchema
      );

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        return res.json(parsed);
      }
    }
  } catch (err) {
    console.warn("Premise expander fallback activated:", err);
  }

  return res.json(fallbackExpansion);
});

// Story Bespoke Heroes & Items Generator Endpoint
// Generates 3-4 custom, creative, non-generic hero concepts + 4-6 story relics tailored directly to the story premise
app.post("/api/generate-story-heroes-and-items", async (req, res) => {
  const { premise, theme } = req.body || {};
  // Fall back to a generic premise rather than rejecting, so the setup wizard
  // can still populate hero concepts before the player has written a premise.
  const cleanPremise = (premise && typeof premise === "string" && premise.trim())
    ? premise.trim()
    : "A daring dungeon exploration into forgotten ruins.";
  const storyTheme = (theme && typeof theme === "string" ? theme.trim() : "Fantasy Adventure");

  try {
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `You are a master D&D 5e Character & Artifact Creator.
The player has created a specific story premise: "${cleanPremise}" (Theme: "${storyTheme}").
Instead of generic standard heroes, create 4 highly original, deeply thematic D&D 5e Hero Concepts and 4 unique Story Starting Relics designed exclusively for this specific setting and narrative.

Requirements for each of the 4 Hero Concepts:
- id: unique string (e.g. "hero-1")
- name: Evocative fantasy name fitting their race and background
- title: Novel archetype title (e.g. "Abyssal Pearl-Salvager", "Inquisitor of the Crimson Eclipse", "Glacial Wyrm-Tracker", "Clockwork Safecracker")
- race: A fitting classic or exotic D&D race (e.g. Sea Elf, Triton, Goliath, Shadar-kai, Warforged, Tabaxi, Tiefling, Genasi, Wood Elf, Dwarf)
- gender: "Female", "Male", or "Non-Binary"
- className: Primary 5e class ("Fighter", "Rogue", "Wizard", "Cleric", "Ranger", "Paladin", "Druid", "Warlock", "Bard", "Monk", "Barbarian", "Sorcerer")
- background: Bespoke thematic background (e.g. "Deep Trench Cartographer", "Disgraced Court Exorcist", "Avalanche Guide")
- alignment: e.g. "Chaotic Good", "Neutral Good", "Lawful Neutral"
- storyMotivation: 1-2 vivid sentences explaining why this specific hero is venturing into this exact quest/danger
- customTrait: 1 unique special feature, ability, or roleplay trait
- stats: { str, dex, con, int, wis, cha } (Balanced standard array: 15, 14, 13, 12, 10, 8 distributed sensibly for their class)
- hp: starting HP (typically 8-14 for level 1)
- ac: starting AC (typically 12-17)
- portraitPrompt: vivid 1-sentence prompt to generate their portrait
- items: Array of 3-4 thematic starting items (each with id, name, type ['weapon'|'armor'|'potion'|'scroll'|'misc'|'quest'], description, damage/acBonus/bonus, quantity: 1, valueGold)

Requirements for the 4-6 Story Thematic Items:
- id, name, type, description, bonus or damage or acBonus, quantity, valueGold. Make them deeply atmospheric and useful for the specific hazards of this premise!`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          heroes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                race: { type: Type.STRING },
                gender: { type: Type.STRING },
                className: { type: Type.STRING },
                background: { type: Type.STRING },
                alignment: { type: Type.STRING },
                storyMotivation: { type: Type.STRING },
                customTrait: { type: Type.STRING },
                stats: {
                  type: Type.OBJECT,
                  properties: {
                    str: { type: Type.INTEGER },
                    dex: { type: Type.INTEGER },
                    con: { type: Type.INTEGER },
                    int: { type: Type.INTEGER },
                    wis: { type: Type.INTEGER },
                    cha: { type: Type.INTEGER },
                  },
                  required: ["str", "dex", "con", "int", "wis", "cha"],
                },
                hp: { type: Type.INTEGER },
                ac: { type: Type.INTEGER },
                portraitPrompt: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      description: { type: Type.STRING },
                      damage: { type: Type.STRING },
                      acBonus: { type: Type.INTEGER },
                      bonus: { type: Type.STRING },
                      quantity: { type: Type.INTEGER },
                      valueGold: { type: Type.INTEGER },
                    },
                    required: ["id", "name", "type", "description", "quantity"],
                  },
                },
              },
              required: ["id", "name", "title", "race", "gender", "className", "background", "alignment", "storyMotivation", "stats", "hp", "ac", "portraitPrompt", "items"],
            },
          },
          thematicItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                damage: { type: Type.STRING },
                acBonus: { type: Type.INTEGER },
                bonus: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                valueGold: { type: Type.INTEGER },
              },
              required: ["id", "name", "type", "description", "quantity"],
            },
          },
        },
        required: ["heroes", "thematicItems"],
      };

      const rawJson = await generateGeminiJsonWithFallback(
        ai,
        `Generate 4 deeply imaginative, story-native hero archetypes and 4 story relics for this campaign: "${cleanPremise}"`,
        systemInstruction,
        responseSchema
      );

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        // Inject procedural SVGs for items if not present
        if (Array.isArray(parsed.thematicItems)) {
          parsed.thematicItems = parsed.thematicItems.map((item: any) => ({
            ...item,
            imageUrl: generateProceduralItemSvg(item),
          }));
        }
        if (Array.isArray(parsed.heroes)) {
          parsed.heroes = parsed.heroes.map((hero: any) => ({
            ...hero,
            items: (hero.items || []).map((item: any) => ({
              ...item,
              imageUrl: generateProceduralItemSvg(item),
            })),
          }));
        }
        return res.json({
          ...parsed,
          bespokeHeroes: parsed.heroes || [],
          items: parsed.thematicItems || [],
        });
      }
    }
  } catch (err) {
    console.warn("Story heroes generator fallback activated:", err);
  }

  return res.json({
    heroes: [],
    bespokeHeroes: [],
    thematicItems: [],
    items: [],
    fallback: true,
  });
});

// Deterministic hash helper for server-side item generation
function hashSeedServer(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Helper for Perchance AI generated unique item, weapon, and relic artwork
function generateProceduralItemSvg(item: { name?: string; type?: string; description?: string; damage?: string; rarity?: string }): string {
  const name = item.name || 'Mystical Relic';
  const type = (item.type || 'misc').toLowerCase();
  const rarity = item.rarity || 'magical';
  const desc = item.description || '';
  const text = (name + ' ' + desc + ' ' + (item.damage || '')).toLowerCase();

  let context = '';
  if (type === 'weapon' || text.includes('sword') || text.includes('blade') || text.includes('dagger') || text.includes('axe') || text.includes('bow') || text.includes('staff') || text.includes('hammer') || text.includes('spear')) {
    if (text.includes('dagger') || text.includes('stiletto') || text.includes('knife')) {
      context = 'ornate fantasy assassin dagger, razor-sharp engraved blade, gilded crossguard, isolated on dark obsidian pedestal';
    } else if (text.includes('axe') || text.includes('greataxe') || text.includes('cleaver')) {
      context = 'brutal fantasy battleaxe, heavy double-edged bearded steel blade with glowing etched runes, dark pedestal';
    } else if (text.includes('bow') || text.includes('quiver') || text.includes('arrow')) {
      context = 'elven recurve bow with intricate carved wood and golden leaf filigree, glowing string, dark studio pedestal';
    } else if (text.includes('staff') || text.includes('wand') || text.includes('rod')) {
      context = 'mystical wizard staff topped with floating glowing arcane crystal, swirling magical aura, studio pedestal';
    } else if (text.includes('rapier') || text.includes('scimitar')) {
      context = 'mastercrafted fantasy rapier sword, curved engraved blade, intricate basket hilt, dark obsidian pedestal';
    } else {
      context = 'mastercrafted legendary fantasy longsword, razor-sharp glowing steel blade, inscribed runes, dark obsidian pedestal';
    }
  } else if (type === 'armor' || text.includes('shield') || text.includes('plate') || text.includes('mail') || text.includes('leather') || text.includes('robe') || text.includes('goggles') || text.includes('veil')) {
    if (text.includes('shield')) {
      context = 'ornate heraldic fantasy shield, reinforced steel and gold trim with mystical emblem, isolated on dark pedestal';
    } else if (text.includes('robe') || text.includes('silk')) {
      context = 'arcane enchanted mage robes with glowing woven glyphs and silver embroidery, dark pedestal';
    } else {
      context = 'mastercrafted fantasy armor gear, polished plates, gold filigree engravings, dark obsidian pedestal';
    }
  } else if (type === 'potion' || text.includes('potion') || text.includes('elixir') || text.includes('draught') || text.includes('flask') || text.includes('vial')) {
    context = 'enchanted alchemy potion flask, glowing luminous magical liquid, crystal glass vial with bronze filigree, floating bubbles, dark pedestal';
  } else if (type === 'scroll' || text.includes('scroll') || text.includes('parchment') || text.includes('tome') || text.includes('grimoire')) {
    context = 'ancient rolled spell scroll parchment, glowing arcane runes, gold wax seal, magical light particles, dark stone pedestal';
  } else if (type === 'quest' || text.includes('relic') || text.includes('sunstone') || text.includes('talisman') || text.includes('compass') || text.includes('scarab') || text.includes('amulet') || text.includes('key')) {
    context = 'sacred legendary quest artifact, glowing eldritch aura, ancient divine talisman, intricate gold inlays, dark pedestal';
  } else {
    context = 'intricate fantasy adventurer gear, magical talisman, detailed craftsmanship, atmospheric lighting, dark pedestal';
  }

  const prompt = ('Masterpiece fantasy concept art: ' + name + ', a ' + rarity + ' item. ' + (desc ? (desc + '. ') : '') + context + ', sharp focus, octane render, 8k resolution, volumetric rim lighting.').replace(/["'{}\[\]\/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  const seed = hashSeedServer(name + type + desc);
  const negative = 'blurry, low quality, deformed, text, watermark, modern, photographic portrait, human face';
  return 'https://perchance.org/perchance-ai-api?v1/image&prompt=' + encodeURIComponent(prompt) + '&resolution=square&negativePrompt=' + encodeURIComponent(negative) + '&seed=' + seed;
}

// Helper for high aesthetic procedural character SVG avatar
function generateProceduralCharacterSvg(
  character: { name: string; className: string; race: string },
  prompt: string
): string {
  const lower = (character.className + " " + character.race + " " + prompt).toLowerCase();
  
  let primaryHue = 215;
  let accentColor = "#3b82f6";
  let bgGrad1 = "#090d16";
  let bgGrad2 = "#162238";
  let runeSymbol = "✦";

  if (lower.includes("rogue") || lower.includes("shadow") || lower.includes("assassin") || lower.includes("thief")) {
    accentColor = "#10b981";
    bgGrad1 = "#05130b";
    bgGrad2 = "#0d281a";
    runeSymbol = "🗡";
  } else if (lower.includes("paladin") || lower.includes("cleric") || lower.includes("holy") || lower.includes("sun")) {
    accentColor = "#f59e0b";
    bgGrad1 = "#1a1205";
    bgGrad2 = "#38260b";
    runeSymbol = "☼";
  } else if (lower.includes("wizard") || lower.includes("mage") || lower.includes("sorcerer") || lower.includes("arcane")) {
    accentColor = "#8b5cf6";
    bgGrad1 = "#12081f";
    bgGrad2 = "#261340";
    runeSymbol = "✧";
  } else if (lower.includes("fighter") || lower.includes("barbarian") || lower.includes("warrior") || lower.includes("rage")) {
    accentColor = "#ef4444";
    bgGrad1 = "#1a0808";
    bgGrad2 = "#3b1212";
    runeSymbol = "⚔";
  } else if (lower.includes("ranger") || lower.includes("druid") || lower.includes("forest")) {
    accentColor = "#22c55e";
    bgGrad1 = "#06150a";
    bgGrad2 = "#0e2e17";
    runeSymbol = "🏹";
  } else if (lower.includes("warlock") || lower.includes("tiefling") || lower.includes("demon")) {
    accentColor = "#ec4899";
    bgGrad1 = "#1a0512";
    bgGrad2 = "#380e28";
    runeSymbol = "⛧";
  }

  const initials = (character.name || "Hero").split(" ").map(n => n[0]).slice(0, 2).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="charBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad1}" />
        <stop offset="100%" stop-color="${bgGrad2}" />
      </linearGradient>
      <radialGradient id="charGlow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.5" />
        <stop offset="60%" stop-color="${accentColor}" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <filter id="charShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#000000" flood-opacity="0.8"/>
      </filter>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="400" rx="24" fill="url(#charBgGrad)" stroke="#334155" stroke-width="4" />
    <circle cx="200" cy="180" r="150" fill="url(#charGlow)" />
    
    <!-- Ornate Runic Circle -->
    <circle cx="200" cy="200" r="175" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="8,6" opacity="0.5"/>
    <circle cx="200" cy="200" r="165" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>
    
    <!-- Hero Bust Silhouette -->
    <g filter="url(#charShadow)">
      <!-- Shoulders & Cloak -->
      <path d="M 80 370 C 80 280, 140 240, 200 240 C 260 240, 320 280, 320 370 Z" fill="#1e293b" />
      <path d="M 110 370 C 110 295, 150 260, 200 260 C 250 260, 290 295, 290 370 Z" fill="#0f172a" />
      
      <!-- Head / Torso -->
      <ellipse cx="200" cy="155" rx="55" ry="70" fill="#334155" />
      
      <!-- Hood / Helmet Shape -->
      <path d="M 130 155 C 130 90, 270 90, 270 155 C 270 195, 245 235, 200 235 C 155 235, 130 195, 130 155 Z" fill="#1e293b" stroke="${accentColor}" stroke-width="3" />
      
      <!-- Face Shadow & Piercing Arcane Eyes -->
      <ellipse cx="200" cy="170" rx="35" ry="40" fill="#090d16" />
      <circle cx="185" cy="165" r="5" fill="${accentColor}" />
      <circle cx="215" cy="165" r="5" fill="${accentColor}" />
      <circle cx="186" cy="164" r="2" fill="#ffffff" />
      <circle cx="216" cy="164" r="2" fill="#ffffff" />
      
      <!-- Glowing Eye Aura Trail -->
      <path d="M 180 165 Q 165 160, 155 155" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      <path d="M 220 165 Q 235 160, 245 155" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    </g>
    
    <!-- Floating Arcane Sparks -->
    <circle cx="120" cy="110" r="3" fill="${accentColor}" opacity="0.8"/>
    <circle cx="280" cy="100" r="4" fill="${accentColor}" opacity="0.7"/>
    <circle cx="100" cy="220" r="2.5" fill="${accentColor}" opacity="0.9"/>
    <circle cx="300" cy="210" r="3" fill="${accentColor}" opacity="0.8"/>
    
    <!-- Class Symbol Emblem -->
    <circle cx="200" cy="275" r="20" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
    <text x="200" y="282" fill="${accentColor}" font-size="16" text-anchor="middle" font-family="serif">${runeSymbol}</text>
    
    <!-- Nameplate Banner -->
    <rect x="100" y="340" width="200" height="38" rx="10" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
    <text x="200" y="364" fill="#f8fafc" font-size="16" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="2">${(character.name || "HERO").toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Locate the built frontend. The bundled server may be launched from any
// working directory (a desktop launcher, a /usr/bin wrapper), so prefer the
// directory the running script lives in over process.cwd().
function resolveDistPath(): string {
  const scriptDir = process.argv[1]
    ? path.dirname(path.resolve(process.argv[1]))
    : undefined;
  const candidates = [
    process.env.DND_DIST_DIR,
    scriptDir,
    scriptDir ? path.join(scriptDir, "dist") : undefined,
    path.join(process.cwd(), "dist"),
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return candidates[candidates.length - 1];
}

function openInBrowser(url: string) {
  try {
    const child = spawn("xdg-open", [url], { stdio: "ignore", detached: true });
    // A missing xdg-open must not take the server down with it.
    child.on("error", () => {
      console.log("  (could not launch a browser automatically - open the URL above)");
    });
    child.unref();
  } catch {
    // Ignore: the URL is printed above either way.
  }
}

function announce(url: string) {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  console.log("");
  console.log("  D&D Solo Campaign DM is running");
  console.log(`  ${url}`);
  console.log("");
  console.log(
    hasKey
      ? "  AI Dungeon Master: enabled (GEMINI_API_KEY found)"
      : `  AI Dungeon Master: offline - the app runs on its built-in
` +
        `  procedural fallbacks. To enable Gemini, put GEMINI_API_KEY in
` +
        `  ${path.join(USER_CONFIG_DIR, ".env")}`
  );
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
}

// Setup Vite middleware for development or serve static dist for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Imported lazily so a production build never needs Vite (or the rest of
    // the dev toolchain) installed at runtime.
    let createViteServer;
    try {
      ({ createServer: createViteServer } = await import("vite"));
    } catch {
      console.error(
        "Vite is not installed, so the development server cannot start.\n" +
          "Run \"npm install\" for development, or set NODE_ENV=production to " +
          "serve the built app."
      );
      process.exit(1);
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = resolveDistPath();
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error(
        `Could not find the built frontend in ${distPath}.\n` +
          `Run "npm run build" first, or set DND_DIST_DIR to the directory holding index.html.`
      );
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  listenWithFallback(PORT, MAX_PORT_ATTEMPTS);
}

// Try the requested port, then the next few, so launching the app twice (or
// alongside another dev server) reports a usable URL instead of crashing.
function listenWithFallback(port: number, attemptsLeft: number) {
  const server = app.listen(port, HOST, () => {
    const url = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${port}`;
    if (port !== PORT) {
      console.log(`Port ${PORT} was busy, using ${port} instead.`);
    }
    announce(url);
    if (process.env.DND_OPEN_BROWSER === "1") {
      openInBrowser(url);
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      listenWithFallback(port + 1, attemptsLeft - 1);
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.error(
        `Ports ${PORT}-${PORT + MAX_PORT_ATTEMPTS} are all in use. Set PORT to choose another.`
      );
    } else {
      console.error("Server failed to start:", err.message);
    }
    process.exit(1);
  });
}

startServer();
