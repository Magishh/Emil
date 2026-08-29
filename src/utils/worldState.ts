// ============================================================================
// The campaign's persistent world: quests, characters met, faction standing.
//
// The Dungeon Master returns partial updates each turn and is fed the current
// state back on the next request, so it stops re-inventing people and plots.
// Merging is pure and defensive: the model's output is untrusted input, so
// anything malformed is dropped rather than corrupting a long campaign.
// ============================================================================

import { Faction, Npc, NpcAttitude, Quest, QuestObjective, QuestStatus, WorldState } from '../types';

export const EMPTY_WORLD: WorldState = { quests: [], npcs: [], factions: [] };

const ATTITUDES: NpcAttitude[] = ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied'];
const STATUSES: QuestStatus[] = ['active', 'completed', 'failed'];

/** Stable id from a name, so the model can refer to things by name alone. */
export function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

export function ensureWorld(world: WorldState | undefined | null): WorldState {
  return {
    quests: Array.isArray(world?.quests) ? world!.quests : [],
    npcs: Array.isArray(world?.npcs) ? world!.npcs : [],
    factions: Array.isArray(world?.factions) ? world!.factions : [],
  };
}

// --------------------------------------------------------------------------
// Quests
// --------------------------------------------------------------------------

function mergeObjectives(existing: QuestObjective[], incoming: unknown): QuestObjective[] {
  if (!Array.isArray(incoming)) return existing;

  const merged = [...existing];
  incoming.forEach((raw: any) => {
    const text = asString(raw?.text ?? raw);
    if (!text) return;
    const id = asString(raw?.id) || slugify(text);
    const done = Boolean(raw?.done);
    const at = merged.findIndex((o) => o.id === id || o.text.toLowerCase() === text.toLowerCase());
    if (at >= 0) merged[at] = { ...merged[at], text, done: done || merged[at].done };
    else merged.push({ id, text, done });
  });
  return merged;
}

export function mergeQuests(existing: Quest[], updates: unknown, turn: number): Quest[] {
  if (!Array.isArray(updates)) return existing;

  const next = [...existing];
  updates.forEach((raw: any) => {
    const title = asString(raw?.title);
    if (!title) return;

    const id = asString(raw?.id) || slugify(title);
    const at = next.findIndex((q) => q.id === id || q.title.toLowerCase() === title.toLowerCase());
    const status = STATUSES.includes(raw?.status) ? (raw.status as QuestStatus) : undefined;

    if (at >= 0) {
      const current = next[at];
      next[at] = {
        ...current,
        title,
        summary: asString(raw?.summary, current.summary),
        status: status ?? current.status,
        objectives: mergeObjectives(current.objectives, raw?.objectives),
        location: asString(raw?.location, current.location || '') || undefined,
        isMain: raw?.isMain !== undefined ? Boolean(raw.isMain) : current.isMain,
        updatedAtTurn: turn,
      };
    } else {
      next.push({
        id,
        title,
        summary: asString(raw?.summary),
        status: status ?? 'active',
        objectives: mergeObjectives([], raw?.objectives),
        location: asString(raw?.location) || undefined,
        isMain: Boolean(raw?.isMain),
        updatedAtTurn: turn,
      });
    }
  });
  return next;
}

/** Active quests first, then the main quest, then most recently touched. */
export function sortQuests(quests: Quest[]): Quest[] {
  return [...quests].sort((a, b) => {
    if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1;
    if (Boolean(a.isMain) !== Boolean(b.isMain)) return a.isMain ? -1 : 1;
    return (b.updatedAtTurn || 0) - (a.updatedAtTurn || 0);
  });
}

// --------------------------------------------------------------------------
// Characters
// --------------------------------------------------------------------------

export function mergeNpcs(existing: Npc[], updates: unknown, turn: number): Npc[] {
  if (!Array.isArray(updates)) return existing;

  const next = [...existing];
  updates.forEach((raw: any) => {
    const name = asString(raw?.name);
    if (!name) return;

    const id = asString(raw?.id) || slugify(name);
    const at = next.findIndex((n) => n.id === id || n.name.toLowerCase() === name.toLowerCase());
    const attitude = ATTITUDES.includes(raw?.attitude) ? (raw.attitude as NpcAttitude) : undefined;
    const incomingNotes = asStringArray(raw?.notes);

    if (at >= 0) {
      const current = next[at];
      // Notes accumulate into a memory of the relationship, deduplicated and
      // capped so a long campaign does not grow without bound.
      const notes = [...current.notes];
      incomingNotes.forEach((note) => {
        if (!notes.some((n) => n.toLowerCase() === note.toLowerCase())) notes.push(note);
      });

      next[at] = {
        ...current,
        name,
        role: asString(raw?.role, current.role),
        description: asString(raw?.description, current.description),
        attitude: attitude ?? current.attitude,
        location: asString(raw?.location, current.location || '') || undefined,
        faction: asString(raw?.faction, current.faction || '') || undefined,
        notes: notes.slice(-12),
        isAlive: raw?.isAlive !== undefined ? Boolean(raw.isAlive) : current.isAlive,
        lastSeenTurn: turn,
      };
    } else {
      next.push({
        id,
        name,
        role: asString(raw?.role, 'Unknown'),
        description: asString(raw?.description),
        attitude: attitude ?? 'neutral',
        location: asString(raw?.location) || undefined,
        faction: asString(raw?.faction) || undefined,
        notes: incomingNotes.slice(-12),
        isAlive: raw?.isAlive !== undefined ? Boolean(raw.isAlive) : true,
        portraitPrompt: asString(raw?.portraitPrompt) || undefined,
        lastSeenTurn: turn,
      });
    }
  });
  return next;
}

// --------------------------------------------------------------------------
// Factions
// --------------------------------------------------------------------------

export const MIN_REPUTATION = -100;
export const MAX_REPUTATION = 100;

export function clampReputation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, Math.round(value)));
}

/** Word for a reputation score, used in the journal and in DM context. */
export function reputationStanding(reputation: number): string {
  if (reputation <= -60) return 'Sworn Enemy';
  if (reputation <= -25) return 'Hostile';
  if (reputation < 25) return 'Neutral';
  if (reputation < 60) return 'Friendly';
  return 'Champion';
}

export function mergeFactions(existing: Faction[], updates: unknown): Faction[] {
  if (!Array.isArray(updates)) return existing;

  const next = [...existing];
  updates.forEach((raw: any) => {
    const name = asString(raw?.name);
    if (!name) return;

    const id = asString(raw?.id) || slugify(name);
    const at = next.findIndex((f) => f.id === id || f.name.toLowerCase() === name.toLowerCase());

    // A delta shifts standing; an absolute value sets it outright.
    const delta = Number(raw?.reputationDelta);
    const absolute = Number(raw?.reputation);

    if (at >= 0) {
      const current = next[at];
      const reputation = Number.isFinite(delta)
        ? clampReputation(current.reputation + delta)
        : Number.isFinite(absolute)
        ? clampReputation(absolute)
        : current.reputation;
      next[at] = {
        ...current,
        name,
        description: asString(raw?.description, current.description),
        reputation,
      };
    } else {
      const reputation = Number.isFinite(absolute)
        ? clampReputation(absolute)
        : Number.isFinite(delta)
        ? clampReputation(delta)
        : 0;
      next.push({ id, name, description: asString(raw?.description), reputation });
    }
  });
  return next;
}

// --------------------------------------------------------------------------
// Applying a turn's updates
// --------------------------------------------------------------------------

export interface WorldUpdatePayload {
  quests?: unknown;
  npcs?: unknown;
  factions?: unknown;
}

export function applyWorldUpdates(
  world: WorldState | undefined,
  updates: WorldUpdatePayload | undefined,
  turn: number
): WorldState {
  const current = ensureWorld(world);
  if (!updates) return current;

  return {
    quests: mergeQuests(current.quests, updates.quests, turn),
    npcs: mergeNpcs(current.npcs, updates.npcs, turn),
    factions: mergeFactions(current.factions, updates.factions),
  };
}

/**
 * A compact digest of the world sent back to the Dungeon Master each turn, so
 * it can honour what has already happened without being handed the whole
 * campaign history.
 */
export function summariseWorldForDm(world: WorldState | undefined): string {
  const { quests, npcs, factions } = ensureWorld(world);
  const lines: string[] = [];

  const activeQuests = quests.filter((q) => q.status === 'active');
  if (activeQuests.length) {
    lines.push('ACTIVE QUESTS:');
    activeQuests.slice(0, 8).forEach((q) => {
      const open = q.objectives.filter((o) => !o.done).map((o) => o.text);
      lines.push(
        `- ${q.title}${q.isMain ? ' (main)' : ''}: ${q.summary}` +
          (open.length ? ` | outstanding: ${open.join('; ')}` : '')
      );
    });
  }

  const known = npcs.filter((n) => n.isAlive !== false);
  if (known.length) {
    lines.push('CHARACTERS ALREADY MET (keep them consistent):');
    known.slice(-12).forEach((n) => {
      lines.push(
        `- ${n.name}, ${n.role}${n.location ? ` (${n.location})` : ''} — ${n.attitude}` +
          (n.notes.length ? ` | ${n.notes.slice(-2).join('; ')}` : '')
      );
    });
  }

  const dead = npcs.filter((n) => n.isAlive === false);
  if (dead.length) {
    lines.push(`DEAD (must not reappear alive): ${dead.map((n) => n.name).join(', ')}`);
  }

  if (factions.length) {
    lines.push('FACTION STANDING:');
    factions.forEach((f) => {
      lines.push(`- ${f.name}: ${f.reputation >= 0 ? '+' : ''}${f.reputation} (${reputationStanding(f.reputation)})`);
    });
  }

  return lines.join('\n');
}
