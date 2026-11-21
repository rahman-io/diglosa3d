import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Lock,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { NPC_CATALOG, ZONE_DOORS } from '../data/diglosaCatalog';
import { getWordsForZone, getWordStatus } from '../data/vocabCatalog';
import { RpgQuestState, WordProgress, ZoneId } from '../types/game';
import { RpgAvatarFrame, RpgBoardPanel, RpgNameplate, RpgPillButton } from './RpgUiKit';

interface NpcDialogueModalProps {
  npcId: string | null;
  quests: RpgQuestState[];
  wordProgress: Record<string, WordProgress>;
  liberatedZones: ZoneId[];
  areaDoorsCleared: Record<ZoneId, number[]>;
  crowns: number;
  storyLocked: boolean;
  onClose: () => void;
  onAcceptOrClaimQuest: (npcId: string) => void;
  onLearnVocab: (vocabIds: string[]) => void;
  onEnterDungeon: (zoneId: ZoneId, isMixedChallenge?: boolean) => void;
  onEnterIeltsPortal: () => void;
  onOpenQuestsModal: () => void;
}

export const NpcDialogueModal: React.FC<NpcDialogueModalProps> = ({
  npcId,
  quests,
  wordProgress,
  liberatedZones,
  areaDoorsCleared,
  crowns,
  storyLocked,
  onClose,
  onAcceptOrClaimQuest,
  onLearnVocab,
  onEnterDungeon,
  onEnterIeltsPortal,
  onOpenQuestsModal,
}) => {
  const [showVocab, setShowVocab] = useState(false);

  const npc = NPC_CATALOG.find((n) => n.id === npcId) ?? null;
  const zoneId = npc ? (npc.zoneId as ZoneId) : null;
  const zoneVocab = zoneId ? getWordsForZone(zoneId) : [];

  useEffect(() => {
    setShowVocab(false);
    if (npc) {
      soundEngine.speakEnglish(`${npc.storyLine1En} ${npc.storyLine2En}`);
    }
  }, [npc]);

  if (!npc || !zoneId) return null;

  const quest = quests.find((q) => q.npcId === npc.id);
  const readyToClaim = Boolean(
    quest && quest.accepted && !quest.claimed && quest.progress >= quest.target,
  );
  const isLiberated = liberatedZones.includes(zoneId);
  const clearedDoors = areaDoorsCleared[zoneId] || [];
  const doors = ZONE_DOORS[zoneId] || [];

  const learnedCount = zoneVocab.filter((v) => getWordStatus(wordProgress[v.id]) !== 'new').length;
  const masteredCount = zoneVocab.filter((v) => getWordStatus(wordProgress[v.id]) === 'mast').length;
  const allLearned = learnedCount === zoneVocab.length;
  const portalBlocked = storyLocked && crowns < 6;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain touch-pan-y bg-[#060b16]/72 px-2 pb-2 pt-5 sm:items-center sm:p-4">
      <div className="my-auto max-h-[93dvh] w-full max-w-xl overflow-y-auto overscroll-contain touch-pan-y pt-5 sm:pt-6">
        <RpgBoardPanel>
          {/* Overhanging Lost-Legends Avatar + Parchment Nameplate Header */}
          <div className="-mt-9 mb-3 flex items-center justify-between gap-2 sm:-mt-10">
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <RpgAvatarFrame accentColor={npc.accentColor}>
                <span className="text-lg font-black">{npc.name.charAt(0)}</span>
              </RpgAvatarFrame>

              <RpgNameplate className="min-w-0">
                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-sm font-black tracking-tight text-[#3b1b06] sm:text-base">
                      {npc.name}
                    </h2>
                    {isLiberated && (
                      <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black text-white">
                        ✓ Bebas
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] font-extrabold text-[#78350f] sm:text-[11px]">
                    {npc.zoneName} · {npc.title}
                  </p>
                </div>
              </RpgNameplate>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-amber-300/60 bg-slate-900/95 text-amber-100 shadow-lg transition hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {/* Two RPG Story Dialogue Boxes */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2.5 rounded-2xl border border-amber-300/25 bg-slate-950/50 px-3.5 py-2.5 shadow-inner">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold leading-snug text-white">
                    {npc.storyLine1En}
                  </div>
                  <div className="mt-1 text-xs font-medium italic leading-snug text-amber-200/90">
                    {npc.storyLine1Id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(npc.storyLine1En)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-400/20 text-amber-200 transition hover:bg-amber-400/35"
                  title="Putar audio"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start justify-between gap-2.5 rounded-2xl border border-amber-300/25 bg-slate-950/50 px-3.5 py-2.5 shadow-inner">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold leading-snug text-white">
                    {npc.storyLine2En}
                  </div>
                  <div className="mt-1 text-xs font-medium italic leading-snug text-amber-200/90">
                    {npc.storyLine2Id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(npc.storyLine2En)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-400/20 text-amber-200 transition hover:bg-amber-400/35"
                  title="Putar audio"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Zone Mastery + 5 Doors Status */}
            <div className="rounded-2xl border border-amber-300/20 bg-slate-950/40 p-3">
              <div className="text-xs font-extrabold leading-snug text-amber-200">
                {npc.zoneName}: Dipelajari{' '}
                <span className="font-mono-nums text-white">
                  {learnedCount}/{zoneVocab.length}
                </span>{' '}
                · Dikuasai{' '}
                <span className="font-mono-nums text-emerald-300">
                  {masteredCount}/{zoneVocab.length}
                </span>{' '}
                <span className="font-semibold text-amber-100/70">(butuh 3x benar bersih)</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {doors.map((d) => {
                  const done = clearedDoors.includes(d.index);
                  return (
                    <span
                      key={d.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                        done
                          ? 'bg-emerald-600/90 text-white shadow-sm'
                          : 'border border-amber-300/25 bg-slate-900/75 text-amber-100/85'
                      }`}
                    >
                      <DoorOpen className="h-3 w-3 shrink-0" />
                      <span>
                        {d.index + 1}. {d.name}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Quest Claim Banner if ready */}
            {readyToClaim && quest && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-950/60 px-3.5 py-2.5">
                <div className="text-xs font-extrabold text-emerald-100">
                  Misi Selesai: {quest.title} (+{quest.rewardXp} XP, +{quest.rewardDiamonds} 💎)
                </div>
                <button
                  type="button"
                  onClick={() => onAcceptOrClaimQuest(npc.id)}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow transition hover:bg-emerald-400"
                >
                  Klaim Hadiah!
                </button>
              </div>
            )}

            {/* Primary & Neutral 9-Slice RPG Pill Actions */}
            <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-12 sm:gap-2.5">
              <RpgPillButton
                variant="green"
                onClick={() => {
                  onClose();
                  onEnterDungeon(zoneId, false);
                }}
                className="w-full sm:col-span-8"
              >
                <span>⚔️ {npc.enterLabel} (5 Pintu + Bos)</span>
              </RpgPillButton>

              <RpgPillButton variant="cream" onClick={onClose} className="w-full sm:col-span-4">
                <span>Abaikan</span>
              </RpgPillButton>
            </div>

            {/* Bottom Secondary Action Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuestsModal();
                }}
                className="rounded-xl border border-amber-300/35 bg-slate-900/85 px-3 py-1.5 text-xs font-extrabold text-amber-100 transition hover:bg-slate-800"
              >
                Pilih misi lain
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterDungeon(zoneId, true);
                }}
                className="rounded-xl border border-amber-300/35 bg-slate-900/85 px-3 py-1.5 text-xs font-extrabold text-amber-100 transition hover:bg-slate-800"
              >
                🌀 Tantangan Campuran (Semua Zona)
              </button>

              <button
                type="button"
                onClick={() => setShowVocab((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-extrabold text-amber-200 transition hover:bg-amber-500/30"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Kosakata ({zoneVocab.length})</span>
                {showVocab ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {zoneId === 'gua_portal' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnterIeltsPortal();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/60 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-3.5 py-1.5 text-xs font-extrabold text-white shadow transition hover:brightness-110"
                >
                  {portalBlocked && <Lock className="h-3.5 w-3.5" />}
                  <span>
                    🏰 Pergi ke Istana IELTS {portalBlocked ? `(${crowns}/6 Mahkota)` : ''}
                  </span>
                </button>
              )}
            </div>

            {/* Collapsible Zone Vocabulary Study Drawer */}
            {showVocab && (
              <div className="rounded-2xl border border-amber-300/25 bg-slate-950/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200">
                    Daftar Kosakata {npc.zoneName}
                  </span>
                  {!allLearned && (
                    <button
                      type="button"
                      onClick={() => onLearnVocab(zoneVocab.map((v) => v.id))}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Catat Semua (+XP)</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {zoneVocab.map((v) => {
                    const status = getWordStatus(wordProgress[v.id]);
                    const mastery = Math.min(3, wordProgress[v.id]?.b || 0);
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-slate-900/80 px-3 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-white">{v.word}</span>
                            <span className="font-mono-nums text-[11px] text-amber-200/80">
                              {v.phonetic}
                            </span>
                            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                              {v.cefr}
                            </span>
                            <span className="font-mono-nums text-[10px] font-bold text-emerald-300">
                              {mastery}/3
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-300">{v.meaningId}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {status === 'mast' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.speakEnglish(v.word);
                              onLearnVocab([v.id]);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-400/20 text-amber-200 hover:bg-amber-400/35"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </RpgBoardPanel>
      </div>
    </div>
  );
};
