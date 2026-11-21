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
import { RpgAvatarFrame, RpgBoardPanel, RpgNameplate, RpgPillButton } from './RpgUiKit';

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

  const canSkip =
    story.kind === 'opening' ||
    story.kind === 'dungeon_intro' ||
    story.kind === 'dungeon_rescue';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain touch-pan-y bg-[#060b16]/70 px-2 pb-2 pt-5 sm:items-center sm:p-4">
      <div className="my-auto max-h-[93dvh] w-full max-w-xl overflow-y-auto overscroll-contain touch-pan-y pt-5 sm:pt-6">
        <RpgBoardPanel>
          {/* Overhanging Lost-Legends Style Avatar + Parchment Nameplate Header */}
          <div className="-mt-9 mb-3 flex flex-wrap items-center justify-between gap-2 sm:-mt-10">
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <RpgAvatarFrame accentColor={story.accentColor}>
                {story.kind === 'area_cleared' ? (
                  <Crown className="h-5 w-5" />
                ) : story.kind === 'defeat_exit' ? (
                  <Heart className="h-5 w-5" />
                ) : (
                  <Feather className="h-5 w-5" />
                )}
              </RpgAvatarFrame>

              <RpgNameplate className="min-w-0">
                <div className="min-w-0 leading-tight">
                  <h3 className="truncate text-sm font-black tracking-tight text-[#3b1b06] sm:text-base">
                    {story.speakerName}
                  </h3>
                  <p className="truncate text-[10px] font-extrabold text-[#78350f] sm:text-[11px]">
                    {story.speakerRole}
                  </p>
                </div>
              </RpgNameplate>
            </div>

            {canSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/45 bg-slate-900/95 px-3 py-1.5 text-xs font-extrabold text-amber-200 shadow-md transition hover:bg-slate-800"
              >
                <span>Lewati cerita</span>
                <FastForward className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Story Content Body */}
          <div className="space-y-2.5 sm:space-y-3">
            {story.rewardSummary && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/15 px-3.5 py-2 text-xs font-extrabold text-amber-200">
                <Award className="h-4 w-4 shrink-0 text-amber-300" />
                <span>{story.rewardSummary}</span>
              </div>
            )}

            <div className="rounded-2xl border border-amber-300/25 bg-slate-950/50 px-3.5 py-3 shadow-inner sm:px-4 sm:py-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <p className="text-sm font-extrabold leading-relaxed text-white sm:text-[15px]">
                  {story.textEn}
                </p>
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(story.textEn)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-400/20 text-amber-200 transition hover:bg-amber-400/35"
                  title="Dengarkan"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold italic leading-relaxed text-amber-200/90">
                {story.textId}
              </p>
            </div>

            {story.sageQuote && story.sageQuote !== story.textId && (
              <div className="rounded-xl border border-amber-300/20 bg-slate-900/60 px-3.5 py-2.5 text-xs font-bold leading-relaxed text-amber-100/90">
                {story.sageQuote}
              </div>
            )}

            {story.ribbonQuote && (
              <div className="rounded-2xl border border-rose-400/45 bg-rose-950/45 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-200">
                  <Bookmark className="h-4 w-4 fill-rose-400 text-rose-300" />
                  <span>Pita Merah dari Lila</span>
                  {story.ribbonName && (
                    <span className="ml-auto rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold normal-case tracking-normal text-white">
                      {story.ribbonName}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-extrabold italic leading-relaxed text-rose-50">
                  &ldquo;{story.ribbonQuote}&rdquo;
                </p>
              </div>
            )}

            {/* RPG Pill Action Footer */}
            {story.kind === 'defeat_exit' ? (
              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:gap-3">
                <RpgPillButton
                  variant="green"
                  onClick={() => onDefeatChoice(true)}
                  className="w-full sm:flex-1"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Kembali ke sana</span>
                </RpgPillButton>
                <RpgPillButton
                  variant="cream"
                  onClick={() => onDefeatChoice(false)}
                  className="w-full sm:flex-1"
                >
                  <Heart className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Istirahat dulu</span>
                </RpgPillButton>
              </div>
            ) : (
              <div className="pt-1">
                <RpgPillButton variant="gold" onClick={onAdvance} className="w-full">
                  <Sparkles className="h-4 w-4 shrink-0" />
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
                      story.step < 2)) && <ArrowRight className="h-4 w-4 shrink-0" />}
                </RpgPillButton>
              </div>
            )}
          </div>
        </RpgBoardPanel>
      </div>
    </div>
  );
};
