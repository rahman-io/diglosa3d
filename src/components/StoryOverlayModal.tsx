import React from 'react';
import {
  ArrowRight,
  Award,
  Bookmark,
  Crown,
  FastForward,
  Feather,
  Heart,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { StoryDialogState } from '../types/game';

interface StoryOverlayModalProps {
  story: StoryDialogState | null;
  onAdvance: () => void;
  onSkip: () => void;
  onDefeatChoice: (returnToZone: boolean) => void;
}

export const StoryOverlayModal: React.FC<StoryOverlayModalProps> = ({
  story,
  onAdvance,
  onSkip,
  onDefeatChoice,
}) => {
  if (!story) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f172a]/60 p-4 sm:items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border-4 border-[#78350f] bg-[#fff7e6] text-[#3b2008] shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-[#d6b67c] bg-[#f5e3be] px-5 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#78350f] text-white shadow"
              style={{ backgroundColor: story.accentColor }}
            >
              {story.kind === 'area_cleared' ? (
                <Crown className="h-5 w-5" />
              ) : story.kind === 'defeat_exit' ? (
                <Heart className="h-5 w-5" />
              ) : (
                <Feather className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">{story.speakerName}</h3>
              <p className="text-xs font-bold text-[#92400e]">{story.speakerRole}</p>
            </div>
          </div>

          {(story.kind === 'opening' ||
            story.kind === 'dungeon_intro' ||
            story.kind === 'dungeon_rescue') && (
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#78350f] bg-white px-3 py-1.5 text-xs font-extrabold text-[#5c340f] transition hover:bg-[#fde68a]"
            >
              <span>Lewati cerita</span>
              <FastForward className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3 p-5">
          {story.rewardSummary && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-amber-500/70 bg-amber-100/90 px-3.5 py-2 text-xs font-extrabold text-amber-950">
              <Award className="h-4 w-4 shrink-0 text-amber-700" />
              <span>{story.rewardSummary}</span>
            </div>
          )}

          <div className="rounded-2xl border-2 border-dashed border-[#b45309]/55 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-extrabold text-[#1f2937]">{story.textEn}</p>
              <button
                type="button"
                onClick={() => soundEngine.speakEnglish(story.textEn)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5e3be] text-[#5c340f] hover:bg-[#e7d3ad]"
                title="Dengarkan"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold italic text-[#78350f]">{story.textId}</p>
          </div>

          {story.sageQuote && story.sageQuote !== story.textId && (
            <div className="rounded-2xl border border-[#d6b67c] bg-[#f5e3be]/60 px-4 py-2.5 text-xs font-bold text-[#5c340f]">
              {story.sageQuote}
            </div>
          )}

          {story.ribbonQuote && (
            <div className="rounded-2xl border-2 border-rose-500/80 bg-gradient-to-br from-rose-50 to-rose-100/80 p-3.5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-800">
                <Bookmark className="h-4 w-4 fill-rose-600 text-rose-700" />
                <span>Pita Merah dari Lila</span>
                {story.ribbonName && (
                  <span className="ml-auto rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold normal-case tracking-normal text-white">
                    {story.ribbonName}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-extrabold italic leading-relaxed text-rose-950">
                &ldquo;{story.ribbonQuote}&rdquo;
              </p>
            </div>
          )}

          {story.kind === 'defeat_exit' ? (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={() => onDefeatChoice(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] py-3 text-sm font-black text-white shadow-[0_4px_0_#14532d] hover:brightness-105"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Kembali ke sana</span>
              </button>
              <button
                type="button"
                onClick={() => onDefeatChoice(false)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#78350f] bg-white py-3 text-sm font-extrabold text-[#5c340f] hover:bg-[#f5e3be]"
              >
                <Heart className="h-4 w-4 text-rose-500" />
                <span>Istirahat dulu</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdvance}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#451a03] bg-gradient-to-b from-[#fde047] to-[#f59e0b] py-3 text-sm font-black text-[#451a03] shadow-[0_4px_0_#451a03] transition hover:brightness-105"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {story.kind === 'area_cleared'
                  ? 'Hore! Lanjutkan Petualangan'
                  : story.kind === 'dungeon_intro'
                  ? story.step >= 2
                    ? 'Mulai Petualangan Gua!'
                    : 'Lanjut'
                  : story.kind === 'dungeon_rescue'
                  ? story.step >= 2
                    ? 'Hore! Wilayah Bebas!'
                    : 'Lanjut'
                  : story.step >= 3
                  ? 'Mulai Menjelajah Hutan Kata!'
                  : 'Lanjut'}
              </span>
              {((story.kind === 'opening' && story.step < 3) ||
                ((story.kind === 'dungeon_intro' || story.kind === 'dungeon_rescue') &&
                  story.step < 2)) && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
