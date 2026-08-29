import React, { useState } from 'react';
import { WorldState, Quest, Npc, Faction, NpcAttitude } from '../types';
import { sortQuests, reputationStanding, ensureWorld } from '../utils/worldState';
import {
  X,
  ScrollText,
  Users,
  Flag,
  CheckCircle2,
  Circle,
  XCircle,
  MapPin,
  Star,
} from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldState | undefined;
}

const ATTITUDE_STYLES: Record<NpcAttitude, { label: string; className: string }> = {
  hostile: { label: 'Hostile', className: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
  unfriendly: { label: 'Unfriendly', className: 'bg-orange-500/15 text-orange-300 border-orange-500/40' },
  neutral: { label: 'Neutral', className: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  friendly: { label: 'Friendly', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  allied: { label: 'Allied', className: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
};

function QuestCard({ quest }: { quest: Quest }) {
  const done = quest.objectives.filter((o) => o.done).length;
  const statusStyle =
    quest.status === 'completed'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : quest.status === 'failed'
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
      : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

  return (
    <div
      className={`p-3 rounded-2xl border bg-[#090f1a] space-y-2 ${
        quest.status === 'active' ? 'border-[#26375a]' : 'border-[#1a2438] opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {quest.isMain && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            <h4 className="text-sm font-serif font-bold text-slate-100 truncate">{quest.title}</h4>
          </div>
          {quest.summary && (
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{quest.summary}</p>
          )}
        </div>
        <span
          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${statusStyle}`}
        >
          {quest.status}
        </span>
      </div>

      {quest.objectives.length > 0 && (
        <ul className="space-y-1">
          {quest.objectives.map((objective) => (
            <li key={objective.id} className="flex items-start gap-1.5 text-[11px]">
              {objective.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-px" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-px" />
              )}
              <span className={objective.done ? 'text-slate-500 line-through' : 'text-slate-300'}>
                {objective.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
        {quest.objectives.length > 0 && (
          <span>
            {done}/{quest.objectives.length} objectives
          </span>
        )}
        {quest.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {quest.location}
          </span>
        )}
      </div>
    </div>
  );
}

function NpcCard({ npc }: { npc: Npc }) {
  const attitude = ATTITUDE_STYLES[npc.attitude] || ATTITUDE_STYLES.neutral;
  const dead = npc.isAlive === false;

  return (
    <div
      className={`p-3 rounded-2xl border bg-[#090f1a] space-y-1.5 ${
        dead ? 'border-[#1a2438] opacity-60' : 'border-[#26375a]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-serif font-bold text-slate-100 truncate">
            {npc.name}
            {dead && <span className="text-rose-400 font-normal text-[11px]"> — deceased</span>}
          </h4>
          <p className="text-[11px] text-amber-300/80 truncate">{npc.role}</p>
        </div>
        <span
          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${attitude.className}`}
        >
          {attitude.label}
        </span>
      </div>

      {npc.description && (
        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{npc.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-500">
        {npc.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {npc.location}
          </span>
        )}
        {npc.faction && <span>{npc.faction}</span>}
      </div>

      {npc.notes.length > 0 && (
        <ul className="space-y-0.5 pt-1 border-t border-white/5">
          {npc.notes.slice(-3).map((note, i) => (
            <li key={i} className="text-[11px] text-slate-400 italic leading-snug">
              · {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FactionCard({ faction }: { faction: Faction }) {
  // Map -100..100 onto a bar with the midpoint at neutral.
  const pct = ((faction.reputation + 100) / 200) * 100;
  const positive = faction.reputation >= 0;

  return (
    <div className="p-3 rounded-2xl border border-[#26375a] bg-[#090f1a] space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-serif font-bold text-slate-100 truncate">{faction.name}</h4>
          {faction.description && (
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{faction.description}</p>
          )}
        </div>
        <span
          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
            positive
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
          }`}
        >
          {reputationStanding(faction.reputation)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="relative h-1.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
          {/* Neutral midpoint */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25" />
          <div
            className={`absolute top-0 bottom-0 ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={
              positive
                ? { left: '50%', width: `${pct - 50}%` }
                : { left: `${pct}%`, width: `${50 - pct}%` }
            }
          />
        </div>
        <div className="text-[10px] font-mono text-slate-500 text-right">
          {faction.reputation >= 0 ? '+' : ''}
          {faction.reputation}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 rounded-2xl border border-dashed border-[#26375a] bg-[#090f1a] text-center">
      <p className="text-xs text-slate-500 font-sans">{text}</p>
    </div>
  );
}

export const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, world }) => {
  const [tab, setTab] = useState<'quests' | 'npcs' | 'factions'>('quests');
  if (!isOpen) return null;

  const { quests, npcs, factions } = ensureWorld(world);
  const orderedQuests = sortQuests(quests);
  const activeCount = quests.filter((q) => q.status === 'active').length;

  const tabs = [
    { id: 'quests' as const, label: 'Quests', icon: ScrollText, count: activeCount },
    { id: 'npcs' as const, label: 'Characters', icon: Users, count: npcs.length },
    { id: 'factions' as const, label: 'Factions', icon: Flag, count: factions.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0b1220] border-2 border-[#1e2d4a] rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        <div className="p-4 sm:p-5 bg-[#080d18] border-b border-[#1a263d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-serif font-bold italic text-amber-300 truncate">
                Campaign Journal
              </h2>
              <p className="text-[11px] text-slate-400 font-sans truncate">
                What you are chasing, who you have met, and who owes you
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-2 rounded-xl bg-[#131d2e] border border-[#273752] text-slate-300 hover:text-white hover:bg-[#1c2a42] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-[#1a263d] bg-[#0c1527] text-xs font-serif font-bold divide-x divide-[#1a263d] shrink-0">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-[#182338] text-amber-300 shadow-inner'
                  : 'text-slate-400 hover:bg-[#111a2d] hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="text-[10px] font-mono text-slate-500">{count}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'quests' &&
            (orderedQuests.length === 0 ? (
              <EmptyState text="No quests recorded yet. The Dungeon Master will add them as your story gives you goals." />
            ) : (
              <div className="space-y-2.5">
                {orderedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            ))}

          {tab === 'npcs' &&
            (npcs.length === 0 ? (
              <EmptyState text="Nobody met yet. Characters you encounter are remembered here, and the Dungeon Master keeps them consistent." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[...npcs]
                  .sort((a, b) => (b.lastSeenTurn || 0) - (a.lastSeenTurn || 0))
                  .map((npc) => (
                    <NpcCard key={npc.id} npc={npc} />
                  ))}
              </div>
            ))}

          {tab === 'factions' &&
            (factions.length === 0 ? (
              <EmptyState text="No factions have an opinion of you yet. Your choices will earn you allies and enemies." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[...factions]
                  .sort((a, b) => b.reputation - a.reputation)
                  .map((faction) => (
                    <FactionCard key={faction.id} faction={faction} />
                  ))}
              </div>
            ))}
        </div>

        <div className="px-4 sm:px-5 py-2.5 bg-[#080d18] border-t border-[#1a263d] text-[11px] text-slate-500 font-sans shrink-0">
          The Dungeon Master is given this journal every turn, so it honours what has already happened.
        </div>
      </div>
    </div>
  );
};
