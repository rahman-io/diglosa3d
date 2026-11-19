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
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain touch-pan-y bg-[#0f172a]/70 p-2 sm:p-4">
      <div className="my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border-4 border-[#78350f] bg-[#fff7e6] text-[#3b2008] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#d6b67c] bg-[#f5e3be] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#78350f] text-lg font-black text-white shadow"
              style={{ backgroundColor: npc.accentColor }}
            >
              {npc.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold leading-tight">{npc.name}</h2>
                {isLiberated && (
                  <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    ✓ Dibebaskan
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-[#92400e]">
                {npc.zoneName} · {npc.title}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7d3ad] text-[#5c340f] transition hover:bg-[#d6b67c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">
          {/* Two Dashed Story Dialogue Boxes */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2 rounded-2xl border-2 border-dashed border-[#b45309]/55 bg-white px-4 py-3">
              <div>
                <div className="text-sm font-extrabold text-[#1f2937]">{npc.storyLine1En}</div>
                <div className="mt-0.5 text-xs font-medium italic text-[#78350f]">
                  {npc.storyLine1Id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => soundEngine.speakEnglish(npc.storyLine1En)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5e3be] text-[#5c340f] hover:bg-[#e7d3ad]"
                title="Putar audio"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start justify-between gap-2 rounded-2xl border-2 border-dashed border-[#b45309]/55 bg-white px-4 py-3">
              <div>
                <div className="text-sm font-extrabold text-[#1f2937]">{npc.storyLine2En}</div>
                <div className="mt-0.5 text-xs font-medium italic text-[#78350f]">
                  {npc.storyLine2Id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => soundEngine.speakEnglish(npc.storyLine2En)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5e3be] text-[#5c340f] hover:bg-[#e7d3ad]"
                title="Putar audio"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Zone Mastery + 5 Doors Status */}
          <div className="mt-3 rounded-2xl border border-[#d6b67c] bg-[#f5e3be]/55 p-3">
            <div className="text-xs font-extrabold text-[#92400e]">
              {npc.zoneName}: Kata dipelajari{' '}
              <span className="font-mono-nums">
                {learnedCount}/{zoneVocab.length}
              </span>
              . Dikuasai{' '}
              <span className="font-mono-nums">
                {masteredCount}/{zoneVocab.length}
              </span>{' '}
              (butuh 3 jawaban benar bersih per kata).
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {doors.map((d) => {
                const done = clearedDoors.includes(d.index);
                return (
                  <span
                    key={d.id}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : 'border border-[#c4a472] bg-white text-[#78350f]'
                    }`}
                  >
                    <DoorOpen className="h-3 w-3" />
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
            <div className="mt-3 flex items-center justify-between rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-2.5">
              <div className="text-xs font-extrabold text-emerald-900">
                Misi Selesai: {quest.title} (+{quest.rewardXp} XP, +{quest.rewardDiamonds} 💎)
              </div>
              <button
                type="button"
                onClick={() => onAcceptOrClaimQuest(npc.id)}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow hover:bg-emerald-500"
              >
                Klaim Hadiah!
              </button>
            </div>
          )}

          {/* Primary Big Green Button: Enter 3D Zone Dungeon */}
          <div className="mt-3.5 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnterDungeon(zoneId, false);
              }}
              className="w-full rounded-2xl border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] py-3 text-sm font-black text-white shadow-[0_4px_0_#14532d] transition hover:brightness-105 active:translate-y-0.5"
            >
              ⚔️ {npc.enterLabel} (5 Pintu + Monster &amp; Bos)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border-2 border-[#78350f] bg-white py-2.5 text-sm font-extrabold text-[#5c340f] transition hover:bg-[#f5e3be]"
            >
              Abaikan
            </button>
          </div>

          {/* Bottom Action Row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQuestsModal();
              }}
              className="rounded-xl border-2 border-[#78350f] bg-white px-3 py-1.5 text-xs font-extrabold text-[#5c340f] hover:bg-[#f5e3be]"
            >
              Pilih misi lain
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEnterDungeon(zoneId, true);
              }}
              className="rounded-xl border-2 border-[#78350f] bg-white px-3 py-1.5 text-xs font-extrabold text-[#5c340f] hover:bg-[#f5e3be]"
            >
              🌀 Tantangan Campuran (Semua Zona)
            </button>

            <button
              type="button"
              onClick={() => setShowVocab((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-[#78350f] bg-[#f5e3be] px-3 py-1.5 text-xs font-extrabold text-[#5c340f] hover:bg-[#e7d3ad]"
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
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#4c1d95] bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-3.5 py-1.5 text-xs font-extrabold text-white shadow hover:brightness-110"
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
            <div className="mt-3 rounded-2xl border-2 border-[#d6b67c] bg-[#f5e3be]/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#78350f]">
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
                      className="flex items-center justify-between rounded-xl border border-[#d6b67c] bg-white px-3 py-1.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#0f172a]">{v.word}</span>
                          <span className="font-mono-nums text-[11px] text-[#92400e]">
                            {v.phonetic}
                          </span>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {v.cefr}
                          </span>
                          <span className="font-mono-nums text-[10px] font-bold text-emerald-700">
                            {mastery}/3
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#5c340f]">{v.meaningId}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {status === 'mast' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.speakEnglish(v.word);
                            onLearnVocab([v.id]);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5e3be] text-[#5c340f] hover:bg-[#e7d3ad]"
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
      </div>
    </div>
  );
};
