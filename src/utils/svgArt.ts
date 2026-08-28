/**
 * High-aesthetic procedural SVG generator for fantasy scenery, character portraits,
 * and polyhedral dice-styled unique geometric weapons and inventory relics.
 * Delivers instant, crisp vector artwork with rich 3D facets, jewel tones,
 * runic engravings, and integrated polyhedral damage-die emblems.
 */

export function generateScenerySvg(theme: string, locationName: string): string {
  const lower = (theme + ' ' + locationName).toLowerCase();
  
  let primaryHue = 215; // Dark blue/cyan crypt default
  let accentHue = 45; // Golden torchlight
  let bgGradient1 = '#090d16';
  let bgGradient2 = '#162238';
  let glowColor = '#38bdf8';

  if (lower.includes('fire') || lower.includes('volcan') || lower.includes('dragon') || lower.includes('ember')) {
    primaryHue = 15;
    accentHue = 45;
    bgGradient1 = '#1a0808';
    bgGradient2 = '#381212';
    glowColor = '#f97316';
  } else if (lower.includes('forest') || lower.includes('grove') || lower.includes('moss') || lower.includes('wood')) {
    primaryHue = 150;
    accentHue = 80;
    bgGradient1 = '#06130d';
    bgGradient2 = '#102e21';
    glowColor = '#34d399';
  } else if (lower.includes('crypt') || lower.includes('dungeon') || lower.includes('catacomb') || lower.includes('cave')) {
    primaryHue = 260;
    accentHue = 180;
    bgGradient1 = '#0c0a17';
    bgGradient2 = '#1a1836';
    glowColor = '#a855f7';
  } else if (lower.includes('tavern') || lower.includes('inn') || lower.includes('town')) {
    primaryHue = 35;
    accentHue = 50;
    bgGradient1 = '#180f08';
    bgGradient2 = '#362312';
    glowColor = '#fbbf24';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
    <defs>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient1}" />
        <stop offset="100%" stop-color="${bgGradient2}" />
      </linearGradient>
      <radialGradient id="glowPulse" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.35" />
        <stop offset="60%" stop-color="${glowColor}" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="50%" stop-color="#334155" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <filter id="shadowFilter">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    
    <!-- Background Canvas -->
    <rect width="800" height="450" fill="url(#skyGrad)" />
    <rect width="800" height="450" fill="url(#glowPulse)" />
    
    <!-- Distant Arches / Mountain Silhouettes -->
    <path d="M 0 320 Q 200 180, 400 320 T 800 320 L 800 450 L 0 450 Z" fill="#0b1120" opacity="0.8" />
    <path d="M -50 350 Q 180 240, 420 350 T 850 350 L 850 450 L -50 450 Z" fill="#0f172a" opacity="0.9" />
    
    <!-- Gothic Pillars & Architecture -->
    <rect x="80" y="80" width="55" height="370" fill="url(#pillarGrad)" rx="4" />
    <path d="M 60 80 Q 107 40, 155 80 L 155 95 L 60 95 Z" fill="#475569" />
    <path d="M 70 420 L 145 420 L 155 450 L 60 450 Z" fill="#334155" />
    
    <rect x="665" y="80" width="55" height="370" fill="url(#pillarGrad)" rx="4" />
    <path d="M 645 80 Q 692 40, 740 80 L 740 95 L 645 95 Z" fill="#475569" />
    <path d="M 655 420 L 730 420 L 740 450 L 645 450 Z" fill="#334155" />

    <!-- Center Arch Ribs -->
    <path d="M 135 120 Q 400 10, 665 120" stroke="#334155" stroke-width="12" fill="none" opacity="0.6"/>
    <path d="M 135 150 Q 400 60, 665 150" stroke="#1e293b" stroke-width="8" fill="none" opacity="0.5"/>

    <!-- Central Dais / Altar or Portal -->
    <ellipse cx="400" cy="380" rx="190" ry="45" fill="#1e293b" stroke="${glowColor}" stroke-width="2" stroke-dasharray="6,4" opacity="0.8"/>
    <rect x="330" y="310" width="140" height="70" fill="#0f172a" stroke="#475569" stroke-width="2" rx="4" />
    <ellipse cx="400" cy="310" rx="70" ry="18" fill="#334155" stroke="${glowColor}" stroke-width="2"/>
    
    <!-- Glowing Runes / Relic in Center -->
    <circle cx="400" cy="275" r="24" fill="${glowColor}" opacity="0.3" filter="url(#shadowFilter)"/>
    <polygon points="400,255 418,285 382,285" fill="${glowColor}" opacity="0.9"/>
    <polygon points="400,295 418,265 382,265" fill="${glowColor}" opacity="0.6"/>

    <!-- Floating mystical particles -->
    <circle cx="340" cy="220" r="3" fill="${glowColor}" opacity="0.8" />
    <circle cx="460" cy="210" r="4" fill="${glowColor}" opacity="0.7" />
    <circle cx="390" cy="180" r="2.5" fill="#ffffff" opacity="0.9" />
    <circle cx="280" cy="290" r="2" fill="${glowColor}" opacity="0.6" />
    <circle cx="520" cy="270" r="3" fill="${glowColor}" opacity="0.7" />

    <!-- Torches on Pillars -->
    <circle cx="107" cy="200" r="14" fill="#f59e0b" opacity="0.4" />
    <circle cx="107" cy="200" r="6" fill="#fbbf24" />
    <path d="M 107 192 Q 112 182, 107 172 Q 102 182, 107 192 Z" fill="#ef4444" />

    <circle cx="692" cy="200" r="14" fill="#f59e0b" opacity="0.4" />
    <circle cx="692" cy="200" r="6" fill="#fbbf24" />
    <path d="M 692 192 Q 697 182, 692 172 Q 687 182, 692 192 Z" fill="#ef4444" />

    <!-- Foreground Water / Fog Reflection -->
    <rect x="0" y="410" width="800" height="40" fill="#090d16" opacity="0.9" />
    <ellipse cx="400" cy="430" rx="350" ry="12" fill="${glowColor}" opacity="0.15" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateCharacterAvatarSvg(character?: { name?: string; className?: string; race?: string }): string {
  const charClass = character?.className || 'Fighter';
  const charRace = character?.race || 'Human';
  const charName = character?.name || 'Hero';
  const lower = (charClass + ' ' + charRace).toLowerCase();
  
  let accentColor = '#3b82f6';

  if (lower.includes('rogue') || lower.includes('shadow') || lower.includes('assassin')) {
    accentColor = '#10b981'; // Emerald/poison
  } else if (lower.includes('paladin') || lower.includes('cleric') || lower.includes('sun')) {
    accentColor = '#f59e0b'; // Amber sun
  } else if (lower.includes('wizard') || lower.includes('mage') || lower.includes('sorcerer')) {
    accentColor = '#8b5cf6'; // Arcane purple
  } else if (lower.includes('fighter') || lower.includes('barbarian') || lower.includes('warrior')) {
    accentColor = '#ef4444'; // Crimson battle
  } else if (lower.includes('ranger') || lower.includes('druid')) {
    accentColor = '#22c55e'; // Forest green
  }

  const initials = charName.split(' ').map(n => n[0] || '').filter(Boolean).slice(0, 2).join('') || 'H';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#090d16" />
      </linearGradient>
      <radialGradient id="avatarGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="200" height="200" rx="16" fill="url(#bgGrad)" stroke="#334155" stroke-width="3" />
    <circle cx="100" cy="90" r="70" fill="url(#avatarGlow)" />
    
    <!-- Character Silhouette Head & Shoulders -->
    <path d="M 40 185 C 40 140, 70 125, 100 125 C 130 125, 160 140, 160 185 Z" fill="#334155" />
    <circle cx="100" cy="78" r="38" fill="#475569" />
    
    <!-- Hood / Mantle / Helmet details -->
    <path d="M 62 78 C 62 45, 138 45, 138 78 C 138 95, 128 115, 100 115 C 72 115, 62 95, 62 78 Z" fill="#1e293b" stroke="${accentColor}" stroke-width="2" opacity="0.9" />
    
    <!-- Glowing Eyes / Arcane Visage -->
    <ellipse cx="88" cy="80" rx="4" ry="2" fill="${accentColor}" />
    <ellipse cx="112" cy="80" rx="4" ry="2" fill="${accentColor}" />

    <!-- Class Crest Ring -->
    <circle cx="100" cy="100" r="88" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.6"/>
    
    <!-- Monogram Tag -->
    <rect x="70" y="165" width="60" height="22" rx="6" fill="#0f172a" stroke="${accentColor}" stroke-width="1.5"/>
    <text x="100" y="180" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="1.5">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Simple deterministic string hashing helper to ensure 100% stable unique visual parameters
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Polyhedral Dice-Styled Procedural Weapon and Relic Vector Generator
 * Creates unique, deterministic, 3D faceted geometric SVG imagery matching the
 * iconic visual language of the tabletop polyhedral dice (DieVisual.tsx).
 */
export function generateItemThumbnailSvg(item: {
  name?: string;
  type?: string;
  description?: string;
  damage?: string;
  acBonus?: number;
  bonus?: string;
}): string {
  const name = item.name || 'Artifact';
  const type = (item.type || 'misc').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const damageStr = (item.damage || '').toLowerCase();
  const text = `${name} ${desc} ${damageStr}`.toLowerCase();
  const seed = hashSeed(name + desc + type);

  // 1. Determine Damage Die Archetype for Weapon (d4, d6, d8, d10, d12, 2d6, d20)
  let dieType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' = 'd8';
  let dieLabel = 'd8';

  if (damageStr.includes('2d6')) {
    dieType = 'd6';
    dieLabel = '2d6';
  } else if (damageStr.includes('1d12') || text.includes('greataxe') || text.includes('lance') || text.includes('colossal')) {
    dieType = 'd12';
    dieLabel = 'd12';
  } else if (damageStr.includes('1d10') || text.includes('halberd') || text.includes('glaive') || text.includes('pike') || text.includes('heavy crossbow') || text.includes('polearm')) {
    dieType = 'd10';
    dieLabel = 'd10';
  } else if (damageStr.includes('1d4') || text.includes('dagger') || text.includes('dart') || text.includes('sling') || text.includes('whip') || text.includes('claw')) {
    dieType = 'd4';
    dieLabel = 'd4';
  } else if (damageStr.includes('1d6') || text.includes('shortsword') || text.includes('scimitar') || text.includes('handaxe') || text.includes('mace') || text.includes('shortbow') || text.includes('spear')) {
    dieType = 'd6';
    dieLabel = 'd6';
  } else {
    // Default martial weapon is d8 (Longsword, Rapier, Battleaxe, Warhammer, Longbow)
    dieType = 'd8';
    dieLabel = 'd8';
  }

  // 2. Determine Elemental / Thematic Color Palette
  let primaryColor = '#cbd5e1'; // Platinum/Steel
  let facetLight = '#f1f5f9';
  let facetMedium = '#94a3b8';
  let facetDark = '#475569';
  let glowColor = '#38bdf8';   // Azure magic
  let edgeGlow = '#93c5fd';
  let goldTrim = '#d4af37';
  let bgGrad1 = '#121824';
  let bgGrad2 = '#1e293b';

  if (text.includes('fire') || text.includes('flame') || text.includes('pyro') || text.includes('sun') || text.includes('inferno') || text.includes('ember') || text.includes('phoenix') || text.includes('lava')) {
    // Fiery Dragon Crimson & Topaz Gold
    primaryColor = '#f59e0b';
    facetLight = '#fef08a';
    facetMedium = '#ea580c';
    facetDark = '#991b1b';
    glowColor = '#ef4444';
    edgeGlow = '#f97316';
    goldTrim = '#fbbf24';
    bgGrad1 = '#240b0b';
    bgGrad2 = '#3d1212';
  } else if (text.includes('frost') || text.includes('ice') || text.includes('cold') || text.includes('glacier') || text.includes('blizzard') || text.includes('crystal') || text.includes('winter')) {
    // Arctic Glacial Sapphire & Frost Silver
    primaryColor = '#38bdf8';
    facetLight = '#e0f2fe';
    facetMedium = '#0284c7';
    facetDark = '#0369a1';
    glowColor = '#60a5fa';
    edgeGlow = '#bae6fd';
    goldTrim = '#93c5fd';
    bgGrad1 = '#091829';
    bgGrad2 = '#112942';
  } else if (text.includes('shadow') || text.includes('poison') || text.includes('venom') || text.includes('toxic') || text.includes('viper') || text.includes('assassin') || text.includes('acid')) {
    // Emerald Jade & Shadow Miasma
    primaryColor = '#10b981';
    facetLight = '#a7f3d0';
    facetMedium = '#059669';
    facetDark = '#064e3b';
    glowColor = '#34d399';
    edgeGlow = '#6ee7b7';
    goldTrim = '#86efac';
    bgGrad1 = '#06170f';
    bgGrad2 = '#0e291b';
  } else if (text.includes('holy') || text.includes('radiant') || text.includes('celestial') || text.includes('dawn') || text.includes('divine') || text.includes('paladin') || text.includes('smite')) {
    // Radiant Aureate Gold & Sacred Ivory
    primaryColor = '#fbbf24';
    facetLight = '#fef9c3';
    facetMedium = '#d97706';
    facetDark = '#78350f';
    glowColor = '#f59e0b';
    edgeGlow = '#fde047';
    goldTrim = '#fef08a';
    bgGrad1 = '#261b07';
    bgGrad2 = '#3d2b0d';
  } else if (text.includes('arcane') || text.includes('void') || text.includes('astral') || text.includes('cosmic') || text.includes('magic') || text.includes('sorcer') || text.includes('warlock') || text.includes('nether')) {
    // Mystic Amethyst Violet & Astral Indigo
    primaryColor = '#a855f7';
    facetLight = '#f3e8ff';
    facetMedium = '#7e22ce';
    facetDark = '#4c1d95';
    glowColor = '#c084fc';
    edgeGlow = '#e9d5ff';
    goldTrim = '#f0abfc';
    bgGrad1 = '#1c0e2e';
    bgGrad2 = '#2d164a';
  } else if (text.includes('lightning') || text.includes('storm') || text.includes('thunder') || text.includes('tempest') || text.includes('spark') || text.includes('shock')) {
    // Electric Storm Azure & Thunder Gold
    primaryColor = '#06b6d4';
    facetLight = '#cffafe';
    facetMedium = '#0891b2';
    facetDark = '#164e63';
    glowColor = '#22d3ee';
    edgeGlow = '#fef08a';
    goldTrim = '#facc15';
    bgGrad1 = '#081a24';
    bgGrad2 = '#102d3d';
  } else if (text.includes('blood') || text.includes('dread') || text.includes('vampir') || text.includes('crimson') || text.includes('demonic') || text.includes('curse') || text.includes('chaos')) {
    // Dark Ruby Crimson & Obsidian Iron
    primaryColor = '#e11d48';
    facetLight = '#fecdd3';
    facetMedium = '#9f1239';
    facetDark = '#4c0519';
    glowColor = '#f43f5e';
    edgeGlow = '#fb7185';
    goldTrim = '#d4af37';
    bgGrad1 = '#21080d';
    bgGrad2 = '#361118';
  }

  // 3. Mini 3D Polyhedral Die Badge Vector (Rendered in top right corner of token)
  let miniDieSvg = '';
  switch (dieType) {
    case 'd4': // Crimson Tetrahedron
      miniDieSvg = `
        <polygon points="52,7 61,21 43,21" fill="#991b1b" stroke="#fca5a5" stroke-width="0.8" />
        <polygon points="52,7 43,21 52,16" fill="#dc2626" />
        <polygon points="52,7 61,21 52,16" fill="#b91c1c" />
        <text x="52" y="19" fill="#fef08a" font-size="5" font-family="monospace" font-weight="900" text-anchor="middle">d4</text>
      `;
      break;
    case 'd6': // Royal Sapphire Isometric Cube
      miniDieSvg = `
        <polygon points="52,6 61,11 61,20 52,25 43,20 43,11" fill="#1e3a8a" stroke="#bfdbfe" stroke-width="0.8" />
        <polygon points="52,6 61,11 52,15 43,11" fill="#3b82f6" />
        <polygon points="43,11 52,15 52,25 43,20" fill="#1d4ed8" />
        <polygon points="52,15 61,11 61,20 52,25" fill="#1e40af" />
        <text x="52" y="18" fill="#fef08a" font-size="5" font-family="monospace" font-weight="900" text-anchor="middle">${dieLabel === '2d6' ? '2d6' : 'd6'}</text>
      `;
      break;
    case 'd10': // Amethyst Kite Trapezohedron
      miniDieSvg = `
        <polygon points="52,6 60,12 58,22 52,25 46,22 44,12" fill="#581c87" stroke="#e9d5ff" stroke-width="0.8" />
        <polygon points="52,6 60,12 52,15" fill="#a855f7" />
        <polygon points="52,6 44,12 52,15" fill="#9333ea" />
        <polygon points="44,12 46,22 52,15" fill="#7e22ce" />
        <polygon points="60,12 58,22 52,15" fill="#6b21a8" />
        <text x="52" y="18" fill="#fef08a" font-size="5" font-family="monospace" font-weight="900" text-anchor="middle">d10</text>
      `;
      break;
    case 'd12': // Dragon Topaz Dodecahedron
      miniDieSvg = `
        <polygon points="52,6 59,9 62,15 62,20 59,25 52,26 45,25 42,20 42,15 45,9" fill="#78350f" stroke="#fef08a" stroke-width="0.8" />
        <polygon points="52,11 57,15 55,21 49,21 47,15" fill="#fbbf24" stroke="#fef08a" stroke-width="0.5"/>
        <text x="52" y="18" fill="#451a03" font-size="5" font-family="monospace" font-weight="900" text-anchor="middle">d12</text>
      `;
      break;
    case 'd8': // Emerald Diamond Octahedron
    default:
      miniDieSvg = `
        <polygon points="52,6 61,15 52,24 43,15" fill="#064e3b" stroke="#a7f3d0" stroke-width="0.8" />
        <polygon points="52,6 52,15 43,15" fill="#10b981" />
        <polygon points="52,6 61,15 52,15" fill="#059669" />
        <polygon points="43,15 52,15 52,24" fill="#047857" />
        <polygon points="52,15 61,15 52,24" fill="#065f46" />
        <text x="52" y="17" fill="#fef08a" font-size="5" font-family="monospace" font-weight="900" text-anchor="middle">d8</text>
      `;
      break;
  }

  // 4. Procedural Geometric 3D Faceted Weapon / Item Silhouette
  let weaponSvgShape = '';
  const isVariationAlt = seed % 3 === 1;
  const isVariationEx = seed % 3 === 2;

  if (type === 'weapon' || text.includes('sword') || text.includes('blade') || text.includes('axe') || text.includes('bow') || text.includes('dagger') || text.includes('staff') || text.includes('hammer') || text.includes('spear') || text.includes('mace') || text.includes('rapier') || text.includes('scimitar') || text.includes('crossbow') || text.includes('katana') || text.includes('halberd')) {

    if (text.includes('dagger') || text.includes('knife') || text.includes('stiletto') || text.includes('dirk') || text.includes('kunai')) {
      // Sleek 3D Faceted Stiletto / Assassin Dagger
      weaponSvgShape = `
        <!-- Dagger Blade Facets (4-plane 3D faceted geometry) -->
        <polygon points="48,14 36,26 31,31 43,19" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.6"/>
        <polygon points="48,14 43,19 31,31 36,36" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.6"/>
        <polygon points="36,26 31,31 24,38 29,33" fill="${facetDark}"/>
        <polygon points="31,31 36,36 29,43 24,38" fill="${facetMedium}"/>
        
        <!-- Central Spine Fuller / Glowing Runic Channel -->
        <line x1="48" y1="14" x2="28" y2="34" stroke="${goldTrim}" stroke-width="0.9" />
        <polygon points="41,21 38,24 37,21 40,18" fill="${glowColor}" opacity="0.9"/>
        
        <!-- Curved Quillon Crossguard -->
        <path d="M 23 29 Q 29 35, 35 41 L 33 43 Q 27 37, 21 31 Z" fill="${goldTrim}" stroke="#78350f" stroke-width="0.7"/>
        <circle cx="28" cy="36" r="2" fill="${facetLight}" stroke="${goldTrim}" stroke-width="0.5"/>
        
        <!-- Wrapped Grip & Faceted Pommel Gem -->
        <line x1="26" y1="38" x2="16" y2="48" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
        <line x1="24" y1="40" x2="18" y2="46" stroke="${goldTrim}" stroke-width="0.8" stroke-dasharray="1.5,1.5"/>
        <polygon points="16,48 13,51 16,54 19,51" fill="${primaryColor}" stroke="${goldTrim}" stroke-width="0.7"/>
      `;
    } else if (text.includes('greatsword') || text.includes('claymore') || text.includes('colossal') || text.includes('zweihander')) {
      // Massive 3D Faceted Two-Handed Greatsword with Parrying Lugs
      weaponSvgShape = `
        <!-- Colossal 2-Handed Blade Facets -->
        <polygon points="50,11 44,17 26,35 32,29" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="50,11 32,29 26,35 32,41" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="44,17 26,35 20,41 26,47" fill="${facetDark}"/>
        <polygon points="26,35 32,41 26,47 20,41" fill="${facetMedium}"/>

        <!-- Parrying Lugs / Side Flukes -->
        <polygon points="37,24 41,22 39,26" fill="${goldTrim}"/>
        <polygon points="27,34 25,38 29,36" fill="${goldTrim}"/>

        <!-- Diamond Runic Core -->
        <line x1="50" y1="11" x2="23" y2="38" stroke="${primaryColor}" stroke-width="1.2"/>
        <circle cx="36" cy="25" r="2" fill="${glowColor}"/>
        <circle cx="43" cy="18" r="1.5" fill="${facetLight}"/>

        <!-- Heavy Ringed Crossguard -->
        <rect x="18" y="38" width="16" height="4" transform="rotate(45 26 40)" fill="${goldTrim}" stroke="#451a03" stroke-width="0.8" rx="1"/>
        <circle cx="26" cy="40" r="2.5" fill="${facetDark}" stroke="${goldTrim}" stroke-width="0.6"/>

        <!-- Extended 2-Handed Hilt Grip & Weighted Pommel -->
        <line x1="23" y1="43" x2="12" y2="54" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="11" cy="55" r="3.5" fill="${goldTrim}" stroke="#451a03" stroke-width="0.8"/>
        <polygon points="11,53 13,55 11,57 9,55" fill="${primaryColor}"/>
      `;
    } else if (text.includes('rapier') || text.includes('estoc') || text.includes('foil')) {
      // Elegant Needle Rapier with Swept Basket Guard
      weaponSvgShape = `
        <!-- Slender Thrusting Diamond Blade -->
        <polygon points="52,10 50,12 28,34 30,32" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.5"/>
        <polygon points="52,10 30,32 28,34 30,36" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.5"/>
        <line x1="52" y1="10" x2="28" y2="34" stroke="#ffffff" stroke-width="0.8"/>

        <!-- Swept Basket Hilt / Bell Guard Rings -->
        <ellipse cx="28" cy="35" rx="7" ry="5" transform="rotate(45 28 35)" fill="none" stroke="${goldTrim}" stroke-width="1.2"/>
        <path d="M 23 30 Q 32 32, 33 41" fill="none" stroke="${goldTrim}" stroke-width="1"/>
        <circle cx="28" cy="35" r="2" fill="${primaryColor}" stroke="${goldTrim}" stroke-width="0.6"/>

        <!-- Wire Grip & Faceted Sphere Pommel -->
        <line x1="26" y1="37" x2="16" y2="47" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="15" cy="48" r="3" fill="${goldTrim}" stroke="#451a03" stroke-width="0.7"/>
      `;
    } else if (text.includes('scimitar') || text.includes('saber') || text.includes('cutlass') || text.includes('falchion')) {
      // Swept Curved Scimitar / Saber with Knuckle Bow
      weaponSvgShape = `
        <!-- Curved Faceted Scimitar Blade -->
        <path d="M 52 12 Q 44 26, 26 36 L 24 34 Q 40 22, 48 10 Z" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <path d="M 52 12 Q 48 24, 28 38 L 26 36 Q 44 26, 52 12 Z" fill="${facetMedium}"/>
        <path d="M 48 10 Q 36 20, 22 34 L 24 34 Q 40 22, 48 10 Z" fill="${facetDark}"/>

        <!-- Gilded Spine Runes -->
        <circle cx="40" cy="22" r="1.5" fill="${glowColor}"/>
        <circle cx="34" cy="27" r="1.2" fill="${glowColor}"/>

        <!-- Knuckle Guard & Grip -->
        <path d="M 20 31 Q 30 38, 22 46" fill="none" stroke="${goldTrim}" stroke-width="1.3"/>
        <line x1="24" y1="36" x2="16" y2="44" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>
        <polygon points="15,45 12,47 14,50 17,48" fill="${goldTrim}"/>
      `;
    } else if (text.includes('katana') || text.includes('nodachi') || text.includes('wakizashi')) {
      // Refined Katana / Nodachi with Tsuba Guard & Temper Line
      weaponSvgShape = `
        <!-- Chisel-Curved Steel Blade -->
        <path d="M 52 11 Q 42 24, 27 35 L 25 33 Q 39 21, 49 9 Z" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.6"/>
        <path d="M 52 11 Q 44 23, 29 37 L 27 35 Q 42 24, 52 11 Z" fill="${facetMedium}"/>

        <!-- Hamon Temper Wave Line -->
        <path d="M 50 11 Q 44 20, 36 26 Q 30 31, 27 35" fill="none" stroke="${glowColor}" stroke-width="0.8" stroke-dasharray="2,1.5"/>

        <!-- Tsuba Disc Guard -->
        <ellipse cx="27" cy="35" rx="5" ry="3.5" transform="rotate(45 27 35)" fill="${goldTrim}" stroke="#1e293b" stroke-width="0.8"/>

        <!-- Rayskin & Ito Wrapped Tsuka Hilt -->
        <line x1="25" y1="37" x2="14" y2="48" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <line x1="24" y1="38" x2="15" y2="47" stroke="${goldTrim}" stroke-width="1" stroke-dasharray="1.5,1.5"/>
        <circle cx="13" cy="49" r="2" fill="${goldTrim}"/>
      `;
    } else if (text.includes('greataxe') || text.includes('battleaxe') || text.includes('axe') || text.includes('hatchet')) {
      // 3D Faceted Battleaxe / Double Greataxe
      const isDoubleAxe = text.includes('great') || isVariationAlt;
      weaponSvgShape = `
        <!-- Heavy Ash Haft -->
        <line x1="16" y1="48" x2="44" y2="20" stroke="#573824" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="16" y1="48" x2="44" y2="20" stroke="${goldTrim}" stroke-width="0.8" stroke-dasharray="3,3"/>

        <!-- Primary Crescent Axe Blade Facets -->
        <path d="M 38 22 Q 49 14, 51 28 Q 42 32, 35 25 Z" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <path d="M 38 22 Q 44 26, 35 25 Q 40 28, 48 26 Z" fill="${facetDark}"/>
        <polygon points="51,28 47,19 40,23 44,29" fill="${facetMedium}"/>

        ${isDoubleAxe ? `
          <!-- Reverse Secondary Axe Blade -->
          <path d="M 31 15 Q 21 23, 23 37 Q 31 31, 34 22 Z" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.8"/>
          <path d="M 31 15 Q 26 25, 34 22 Q 28 28, 25 34 Z" fill="${facetDark}"/>
        ` : `
          <!-- Rear Armor-Piercing Spike -->
          <polygon points="31,16 23,21 33,24" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>
        `}

        <!-- Iron Collar Boss & Top Crown Spike -->
        <circle cx="36" cy="22" r="3.5" fill="${goldTrim}" stroke="#1e293b" stroke-width="0.8"/>
        <circle cx="36" cy="22" r="1.5" fill="${glowColor}"/>
        <polygon points="44,20 48,16 43,18" fill="${facetLight}"/>
        <circle cx="15" cy="49" r="2.5" fill="${goldTrim}"/>
      `;
    } else if (text.includes('warhammer') || text.includes('maul') || text.includes('hammer') || text.includes('pick')) {
      // 3D Faceted Crushing Warhammer / Maul Head
      weaponSvgShape = `
        <!-- Sturdy Reinforced Shaft -->
        <line x1="16" y1="48" x2="42" y2="22" stroke="#451a03" stroke-width="3.5" stroke-linecap="round"/>

        <!-- Heavy Isometric Hammer Head (Crushing Facets) -->
        <polygon points="35,14 47,26 42,31 30,19" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <polygon points="47,26 53,20 41,8 35,14" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <polygon points="47,26 53,20 48,25 42,31" fill="${facetDark}"/>

        <!-- Reverse Beak Spike -->
        <polygon points="30,19 22,23 32,27" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>

        <!-- Inset Glowing Rune Boss -->
        <circle cx="39" cy="20" r="3" fill="${goldTrim}" stroke="#0f172a" stroke-width="0.8"/>
        <polygon points="39,18 41,21 37,21" fill="${glowColor}"/>
        <circle cx="15" cy="49" r="2.5" fill="${goldTrim}"/>
      `;
    } else if (text.includes('mace') || text.includes('morningstar') || text.includes('flail')) {
      // Spiked Flanged Morningstar / Mace
      weaponSvgShape = `
        <line x1="16" y1="48" x2="38" y2="26" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
        <!-- Central Spiked Core Orb -->
        <circle cx="42" cy="22" r="8" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <circle cx="42" cy="22" r="5" fill="${facetLight}"/>
        <!-- 6 Geometric Spikes -->
        <polygon points="42,12 40,15 44,15" fill="${goldTrim}"/>
        <polygon points="52,22 49,20 49,24" fill="${goldTrim}"/>
        <polygon points="42,32 40,29 44,29" fill="${goldTrim}"/>
        <polygon points="32,22 35,20 35,24" fill="${goldTrim}"/>
        <polygon points="49,15 46,18 48,20" fill="${facetLight}"/>
        <polygon points="35,29 38,26 36,24" fill="${facetLight}"/>
        <!-- Gem Center -->
        <circle cx="42" cy="22" r="2" fill="${glowColor}"/>
      `;
    } else if (text.includes('spear') || text.includes('pike') || text.includes('javelin') || text.includes('trident')) {
      // Faceted Leaf-Bladed Spear / Trident
      weaponSvgShape = `
        <!-- Long Ash Pole -->
        <line x1="14" y1="50" x2="46" y2="18" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Leaf Spearhead Facets -->
        <polygon points="54,10 47,13 37,23 44,20" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="54,10 44,20 37,23 41,27" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="47,13 37,23 33,27 43,17" fill="${facetDark}"/>
        <!-- Reinforcing Gold Ferrule -->
        <rect x="34" y="24" width="6" height="3" transform="rotate(45 37 25)" fill="${goldTrim}" stroke="#1e293b" stroke-width="0.6"/>
        <!-- Floating Energy Node -->
        <circle cx="45" cy="19" r="1.5" fill="${glowColor}"/>
      `;
    } else if (text.includes('halberd') || text.includes('glaive') || text.includes('scythe') || text.includes('polearm')) {
      // Sweeping Halberd / Grim Scythe Blade
      weaponSvgShape = `
        <line x1="14" y1="50" x2="42" y2="22" stroke="#451a03" stroke-width="2.8" stroke-linecap="round"/>
        <!-- Sweeping Curved Crescent Blade -->
        <path d="M 52 10 Q 36 16, 28 32 L 32 34 Q 42 22, 52 10 Z" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <path d="M 52 10 Q 42 22, 32 34 L 30 36 Q 44 20, 52 10 Z" fill="${facetMedium}"/>
        <!-- Top Spearhead Spike -->
        <polygon points="48,16 54,10 44,20" fill="${goldTrim}"/>
        <!-- Rear Hook -->
        <polygon points="36,28 30,24 34,32" fill="${facetDark}"/>
        <circle cx="41" cy="23" r="2" fill="${glowColor}"/>
      `;
    } else if (text.includes('staff') || text.includes('wand') || text.includes('rod') || text.includes('scepter')) {
      // Arcane Staff with Floating Polyhedral Gem & Orbital Rings
      weaponSvgShape = `
        <!-- Twisted Elderwood Stave -->
        <line x1="16" y1="48" x2="38" y2="26" stroke="#573824" stroke-width="3" stroke-linecap="round"/>
        <path d="M 18 46 Q 30 32, 40 24" fill="none" stroke="${goldTrim}" stroke-width="0.8" stroke-dasharray="2,2"/>

        <!-- Golden Claw Mount -->
        <path d="M 34 30 L 40 24 L 46 30" fill="none" stroke="${goldTrim}" stroke-width="1.5"/>
        <circle cx="40" cy="24" r="2.5" fill="${goldTrim}"/>

        <!-- Floating 3D Faceted Octahedron Crystal Head -->
        <polygon points="46,12 53,19 46,26 39,19" fill="${facetDark}" stroke="${edgeGlow}" stroke-width="0.8"/>
        <polygon points="46,12 46,19 39,19" fill="${facetLight}"/>
        <polygon points="46,12 53,19 46,19" fill="${facetMedium}"/>
        <polygon points="39,19 46,19 46,26" fill="${facetMedium}"/>
        <polygon points="46,19 53,19 46,26" fill="${primaryColor}"/>

        <!-- Glowing Astral Ring -->
        <ellipse cx="46" cy="19" rx="10" ry="4" transform="rotate(-30 46 19)" fill="none" stroke="${glowColor}" stroke-width="0.9" opacity="0.85"/>
        <circle cx="46" cy="19" r="2" fill="#ffffff" opacity="0.9"/>
      `;
    } else if (text.includes('crossbow')) {
      // Mechanical Heavy Crossbow & Quarrel Bolt
      weaponSvgShape = `
        <!-- Walnut Wood Stock -->
        <line x1="18" y1="46" x2="44" y2="20" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
        <!-- Steel Cross Bow Prod -->
        <path d="M 28 14 Q 38 24, 48 34" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Tensioned Bowstrings -->
        <line x1="28" y1="14" x2="25" y2="39" stroke="#f1f5f9" stroke-width="0.7" opacity="0.8"/>
        <line x1="48" y1="34" x2="25" y2="39" stroke="#f1f5f9" stroke-width="0.7" opacity="0.8"/>
        <!-- Loaded Faceted Quarrel Bolt -->
        <line x1="24" y1="40" x2="48" y2="16" stroke="#ffffff" stroke-width="1.2"/>
        <polygon points="48,16 43,15 45,21" fill="${glowColor}"/>
        <!-- Front Stirrup -->
        <circle cx="46" cy="18" r="3" fill="none" stroke="${goldTrim}" stroke-width="1"/>
      `;
    } else if (text.includes('bow') || text.includes('longbow') || text.includes('arrow') || text.includes('recurve')) {
      // Recurve Reflex Yew Bow with Fletched Arrow
      weaponSvgShape = `
        <!-- Recurve Reflex Bow Stave -->
        <path d="M 22 14 Q 14 32, 22 50 Q 28 32, 22 14 Z" fill="#854d0e" stroke="${goldTrim}" stroke-width="0.8"/>
        <!-- Horn Nocks -->
        <circle cx="22" cy="14" r="1.5" fill="${goldTrim}"/>
        <circle cx="22" cy="50" r="1.5" fill="${goldTrim}"/>
        <!-- Tensioned String -->
        <line x1="22" y1="14" x2="38" y2="32" stroke="#f8fafc" stroke-width="0.9" opacity="0.9"/>
        <line x1="38" y1="32" x2="22" y2="50" stroke="#f8fafc" stroke-width="0.9" opacity="0.9"/>
        <!-- Nocked Broadhead Arrow -->
        <line x1="18" y1="32" x2="50" y2="32" stroke="#e2e8f0" stroke-width="1.4"/>
        <polygon points="50,32 44,28 44,36" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.6"/>
        <!-- Feather Fletching -->
        <polygon points="18,32 22,28 24,32" fill="${glowColor}"/>
        <polygon points="18,32 22,36 24,32" fill="${glowColor}"/>
      `;
    } else if (text.includes('whip') || text.includes('scourge') || text.includes('flail')) {
      // Coiled Bladed Chain Whip
      weaponSvgShape = `
        <line x1="18" y1="46" x2="24" y2="40" stroke="${goldTrim}" stroke-width="3" stroke-linecap="round"/>
        <path d="M 24 40 Q 38 42, 42 30 Q 46 18, 36 16 Q 26 14, 32 26 Q 36 34, 48 24" fill="none" stroke="${facetLight}" stroke-width="1.8" stroke-dasharray="2,2"/>
        <polygon points="48,24 53,22 50,27" fill="${glowColor}"/>
        <circle cx="17" cy="47" r="2.5" fill="${goldTrim}"/>
      `;
    } else {
      // Default: Symmetrical 3D Faceted Longsword / Sunblade (Iconic D&D Blade)
      weaponSvgShape = `
        <!-- 4-Plane Diamond Blade Cross Section -->
        <polygon points="48,12 43,17 26,34 31,29" fill="${facetLight}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="48,12 31,29 26,34 31,39" fill="${facetMedium}" stroke="${edgeGlow}" stroke-width="0.7"/>
        <polygon points="43,17 26,34 21,39 26,44" fill="${facetDark}"/>
        <polygon points="26,34 31,39 26,44 21,39" fill="${facetMedium}"/>

        <!-- Center Fuller & Glowing Runes -->
        <line x1="48" y1="12" x2="26" y2="34" stroke="${goldTrim}" stroke-width="1"/>
        <polygon points="39,19 36,22 35,19 38,16" fill="${glowColor}"/>
        <circle cx="43" cy="17" r="1.5" fill="#ffffff" opacity="0.9"/>

        <!-- Ornate Cruciform Crossguard with Gem Inset -->
        <rect x="20" y="36" width="14" height="3.5" transform="rotate(45 27 38)" fill="${goldTrim}" stroke="#451a03" stroke-width="0.7" rx="1"/>
        <circle cx="27" cy="38" r="2" fill="${primaryColor}" stroke="${goldTrim}" stroke-width="0.5"/>

        <!-- Wrapped Grip & Faceted Octagonal Pommel -->
        <line x1="24" y1="41" x2="15" y2="50" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
        <line x1="23" y1="42" x2="16" y2="49" stroke="${goldTrim}" stroke-width="0.8" stroke-dasharray="1.5,1.5"/>
        <polygon points="15,50 12,53 15,56 18,53" fill="${goldTrim}" stroke="#451a03" stroke-width="0.7"/>
        <circle cx="15" cy="53" r="1.2" fill="${facetLight}"/>
      `;
    }

  } else if (type === 'armor' || text.includes('shield') || text.includes('plate') || text.includes('mail') || text.includes('robe') || text.includes('cuirass')) {
    if (text.includes('shield')) {
      // 3D Faceted Knight Heraldic Kite Shield
      weaponSvgShape = `
        <!-- Shield Body & Outer Rim -->
        <path d="M 20 18 L 44 18 C 44 36, 38 47, 32 51 C 26 47, 20 36, 20 18 Z" fill="${bgGrad2}" stroke="${goldTrim}" stroke-width="1.8"/>
        <!-- 4 Geometric Facets -->
        <path d="M 22 20 L 32 20 L 32 48 C 28 44, 22 35, 22 20 Z" fill="${facetLight}" opacity="0.85"/>
        <path d="M 32 20 L 42 20 C 42 35, 36 44, 32 48 Z" fill="${facetDark}"/>
        <!-- Heraldic Cross / Crest Emblem -->
        <path d="M 32 22 L 32 44" stroke="${goldTrim}" stroke-width="2.2"/>
        <path d="M 24 28 L 40 28" stroke="${goldTrim}" stroke-width="2.2"/>
        <circle cx="32" cy="28" r="3.5" fill="${glowColor}" stroke="${goldTrim}" stroke-width="0.8"/>
      `;
    } else {
      // 3D Faceted Armor Cuirass & Pauldrons
      weaponSvgShape = `
        <path d="M 21 18 L 43 18 L 48 25 L 42 45 L 22 45 L 16 25 Z" fill="${facetDark}" stroke="${goldTrim}" stroke-width="1.5"/>
        <path d="M 23 20 L 32 20 L 32 43 L 24 43 Z" fill="${facetLight}" opacity="0.8"/>
        <path d="M 32 20 L 41 20 L 40 43 L 32 43 Z" fill="${facetMedium}"/>
        <polygon points="32,23 36,28 32,33 28,28" fill="${glowColor}" stroke="${goldTrim}" stroke-width="0.6"/>
        <rect x="25" y="36" width="14" height="4" fill="${goldTrim}" rx="1"/>
      `;
    }
  } else if (type === 'potion' || text.includes('potion') || text.includes('elixir') || text.includes('flask') || text.includes('draught')) {
    // 3D Faceted Alchemical Potion Flask
    weaponSvgShape = `
      <!-- Cork Stopper & Gold Collar -->
      <rect x="29" y="15" width="6" height="4" fill="#a27b5c" rx="1" stroke="${goldTrim}" stroke-width="0.5"/>
      <rect x="28" y="19" width="8" height="4" fill="${goldTrim}" rx="1"/>
      <!-- Faceted Glass Bottle -->
      <polygon points="28,23 20,38 24,47 40,47 44,38 36,23" fill="#1e293b" stroke="${edgeGlow}" stroke-width="1.4" opacity="0.9"/>
      <!-- Glowing Internal Liquid & Facets -->
      <polygon points="27,33 21,38 24,45 32,45 32,33" fill="${facetLight}" opacity="0.9"/>
      <polygon points="32,33 32,45 40,45 43,38 37,33" fill="${facetDark}" opacity="0.9"/>
      <ellipse cx="32" cy="39" rx="8" ry="4" fill="${glowColor}" opacity="0.6"/>
      <circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="35" cy="42" r="1" fill="#ffffff" opacity="0.7"/>
    `;
  } else if (type === 'scroll' || text.includes('scroll') || text.includes('tome') || text.includes('grimoire')) {
    // Ancient Parchment Scroll with Polyhedral Wax Seal
    weaponSvgShape = `
      <rect x="18" y="20" width="28" height="24" rx="3" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
      <line x1="22" y1="26" x2="42" y2="26" stroke="#78350f" stroke-width="1.2" stroke-dasharray="3,2"/>
      <line x1="22" y1="31" x2="42" y2="31" stroke="#78350f" stroke-width="1.2" stroke-dasharray="4,2"/>
      <line x1="22" y1="36" x2="34" y2="36" stroke="#78350f" stroke-width="1.2" stroke-dasharray="2,2"/>
      <!-- Wax Octahedron Seal -->
      <polygon points="38,34 42,38 38,42 34,38" fill="#b91c1c" stroke="${goldTrim}" stroke-width="0.8"/>
      <circle cx="38" cy="38" r="1.5" fill="#fef08a"/>
    `;
  } else {
    // Ring / Amulet / Relic Gemstone
    weaponSvgShape = `
      <circle cx="32" cy="34" r="13" fill="none" stroke="${goldTrim}" stroke-width="3"/>
      <!-- Multi-Faceted Cut Gemstone -->
      <polygon points="32,15 40,22 32,29 24,22" fill="${facetDark}" stroke="${edgeGlow}" stroke-width="0.8"/>
      <polygon points="32,15 32,22 24,22" fill="${facetLight}"/>
      <polygon points="32,15 40,22 32,22" fill="${facetMedium}"/>
      <polygon points="24,22 32,22 32,29" fill="${facetMedium}"/>
      <polygon points="32,22 40,22 32,29" fill="${primaryColor}"/>
      <circle cx="32" cy="22" r="5" fill="${glowColor}" opacity="0.4"/>
      <circle cx="32" cy="22" r="1.5" fill="#ffffff"/>
    `;
  }

  // 5. Build Complete Master SVG Document with Dice Arena Styling
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <defs>
      <linearGradient id="itemBg_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad1}" />
        <stop offset="100%" stop-color="${bgGrad2}" />
      </linearGradient>
      <radialGradient id="itemGlow_${seed}" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.45" />
        <stop offset="60%" stop-color="${glowColor}" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <filter id="diceDropShadow_${seed}">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
    </defs>

    <!-- Outer Square Token Frame -->
    <rect width="64" height="64" rx="10" fill="#140f0c" stroke="#4a3227" stroke-width="2" />
    <rect x="3" y="3" width="58" height="58" rx="8" fill="url(#itemBg_${seed})" />

    <!-- Ambient Aura & Grid Lines -->
    <rect x="4" y="4" width="56" height="56" fill="url(#itemGlow_${seed})" rx="6"/>
    <rect x="5" y="5" width="54" height="54" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.08" stroke-dasharray="2,2"/>
    <circle cx="32" cy="32" r="18" fill="url(#itemGlow_${seed})" />

    <!-- 3D Geometric Faceted Weapon Art with Drop Shadow -->
    <g filter="url(#diceDropShadow_${seed})">
      ${weaponSvgShape}
    </g>

    <!-- Integrated Mini Polyhedral Damage Die Emblem in Top Right -->
    <g filter="url(#diceDropShadow_${seed})">
      ${miniDieSvg}
    </g>

    <!-- Corner Metal Rivets (Dice Tray Hardware) -->
    <circle cx="6" cy="6" r="1.2" fill="#8c7e6a"/>
    <circle cx="58" cy="6" r="1.2" fill="#8c7e6a"/>
    <circle cx="6" cy="58" r="1.2" fill="#8c7e6a"/>
    <circle cx="58" cy="58" r="1.2" fill="#8c7e6a"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
