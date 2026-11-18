import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { soundEngine } from '../audio/soundEngine';
import { getWordOfTheDay } from '../data/vocabCatalog';
import { LearningModeType } from '../types/game';

interface TitleScreenProps {
  hasSavedGame: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onQuickLearn: (mode: LearningModeType) => void;
  onOpenLeaderboard: () => void;
  onOpenGuide: () => void;
  bestLocalScore: number;
  user: User | null;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedGame,
  onContinue,
  onStartNew,
  onQuickLearn,
  onOpenLeaderboard,
  onOpenGuide,
  bestLocalScore,
  user,
  muted,
  onToggleMute,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const wotd = getWordOfTheDay();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showQuickMenu) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (hasSavedGame) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasSavedGame, onContinue, onStartNew, showQuickMenu]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-9">
      {/* Top Bar */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border-2 border-[#78350f] bg-[#5c340f]/92 px-4 py-1.5 text-xs font-bold text-[#fef3c7] shadow-lg">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Diglosa 3D RPG · A1 hingga IELTS</span>
          {bestLocalScore > 0 && (
            <span className="ml-1 border-l border-white/20 pl-2 font-mono-nums text-amber-300">
              Rekor: {bestLocalScore.toLocaleString('id-ID')}
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#78350f] bg-[#5c340f]/92 px-3.5 py-2 text-xs font-bold text-amber-100 shadow-lg transition hover:bg-[#78350f]"
          >
            <HelpCircle className="h-4 w-4 text-amber-300" />
            <span>Petunjuk</span>
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#78350f] bg-[#5c340f]/92 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-[#78350f]"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>Papan Peringkat</span>
            {user && <span className="text-emerald-400">●</span>}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Aktifkan Suara' : 'Matikan Suara'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#78350f] bg-[#5c340f]/92 text-white shadow-lg transition hover:bg-[#78350f]"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Center Hero Logo + Kata Hari Ini */}
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <svg
          viewBox="0 0 660 156"
          className="w-full max-w-[560px] drop-shadow-[0_8px_20px_rgba(46,24,6,0.55)]"
          aria-label="Diglosa: Petualangan Kata 3D"
        >
          <defs>
            <linearGradient id="diglosaTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="55%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
          <text
            x="330"
            y="82"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="64"
            letterSpacing="3"
            fill="#451a03"
            transform="translate(0, 5)"
          >
            DIGLOSA 3D
          </text>
          <text
            x="330"
            y="82"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="64"
            letterSpacing="3"
            fill="url(#diglosaTitleGrad)"
            stroke="#451a03"
            strokeWidth="3.5"
          >
            DIGLOSA 3D
          </text>
          <rect
            x="110"
            y="104"
            width="440"
            height="32"
            rx="16"
            fill="#5c340f"
            stroke="#fde047"
            strokeWidth="2"
          />
          <text
            x="330"
            y="125"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="13"
            letterSpacing="1.5"
            fill="#fef3c7"
          >
            PETUALANGAN KATA HOOT · 6 WILAYAH &amp; ISTANA IELTS
          </text>
        </svg>

        {/* Kata Hari Ini Card */}
        <div className="pointer-events-auto mt-3 inline-flex items-center gap-3 rounded-2xl border-2 border-[#78350f] bg-[#fff7e6]/95 px-4 py-2 text-left text-[#3b2008] shadow-xl">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs">
            <span className="font-extrabold text-[#92400e]">Kata Hari Ini: </span>
            <strong className="text-sm font-black text-[#0f172a]">{wotd.word}</strong>
            <span className="mx-1.5 text-[#92400e]">=</span>
            <span className="font-bold text-emerald-800">{wotd.meaningId}</span>
          </div>
          <button
            type="button"
            onClick={() => soundEngine.speakEnglish(wotd.word)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5e3be] text-[#5c340f] hover:bg-[#e7d3ad]"
            title="Dengar Kata Hari Ini"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">
          {hasSavedGame && (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] px-8 py-3.5 text-base font-black text-white shadow-[0_7px_0_#14532d] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_#14532d]"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>LANJUTKAN PETUALANGAN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#451a03] bg-gradient-to-b from-[#fde047] to-[#f59e0b] px-7 py-3.5 text-sm font-black text-[#451a03] shadow-[0_7px_0_#451a03] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_#451a03] sm:text-base"
          >
            {hasSavedGame ? <RotateCcw className="h-4 w-4" /> : <Play className="h-5 w-5 fill-[#451a03]" />}
            <span>{hasSavedGame ? 'PETUALANGAN BARU' : 'MULAI PETUALANGAN'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickMenu((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#78350f] bg-[#fff7e6] px-5 py-3.5 text-sm font-black text-[#5c340f] shadow-[0_5px_0_#78350f] transition hover:bg-[#f5e3be]"
          >
            <BookOpen className="h-4 w-4" />
            <span>Belajar Cepat</span>
          </button>
        </div>

        {showQuickMenu && (
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2 rounded-2xl border-2 border-[#78350f] bg-[#fff7e6]/95 p-2.5 shadow-xl">
            {(
              [
                ['cards', 'Kartu Kilat'],
                ['quiz', 'Kuis Pilihan'],
                ['listen', 'Telinga Tajam'],
                ['type', 'Jago Ejaan'],
                ['match', 'Pasang Kartu'],
              ] as Array<[LearningModeType, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickLearn(m);
                }}
                className="rounded-xl border border-[#c4a472] bg-white px-3 py-1.5 text-xs font-extrabold text-[#5c340f] hover:bg-amber-100"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-full bg-[#451a03]/90 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-[#fef3c7] shadow sm:text-xs">
          WASD / Ketuk Lantai · Spasi Tembak · E Bicara / Buka Pintu · C Kamera
        </div>
      </div>
    </div>
  );
};
