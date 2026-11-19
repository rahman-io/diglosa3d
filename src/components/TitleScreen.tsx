import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Info,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { soundEngine } from '../audio/soundEngine';
import { getWordOfTheDay } from '../data/vocabCatalog';
import { LearningModeType } from '../types/game';
import { isFullscreenActive, toggleAppFullscreen } from '../utils/fullscreen';

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
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const wotd = getWordOfTheDay();

  useEffect(() => {
    const onFsChange = () => setIsFs(isFullscreenActive());
    onFsChange();
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showQuickMenu || showInfoSheet) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (hasSavedGame) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasSavedGame, onContinue, onStartNew, showQuickMenu, showInfoSheet]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8">
      {/* Top-Right: Ultra-clean Icon-Only Utility Bar */}
      <div className="flex items-start justify-end">
        <div className="pointer-events-auto relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfoSheet((v) => !v)}
            aria-label="Info, Peringkat, Kata Hari Ini & Petunjuk"
            title="Info, Rekor, Peringkat & Petunjuk"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/60 text-amber-200 shadow-lg backdrop-blur-sm transition hover:bg-slate-900/80"
          >
            {showInfoSheet ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {user && !showInfoSheet && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Aktifkan Suara' : 'Matikan Suara'}
            title={muted ? 'Aktifkan Suara' : 'Matikan Suara'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-900/80"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => void toggleAppFullscreen()}
            aria-label={isFs ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            title={isFs ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/60 text-cyan-200 shadow-lg backdrop-blur-sm transition hover:bg-slate-900/80"
          >
            {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Single Unified Info & Menu Popover (holds all extra info cleanly) */}
          {showInfoSheet && (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-white/20 bg-slate-950/90 p-3.5 text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <div className="text-xs font-extrabold text-amber-300">Diglosa 3D RPG</div>
                  <div className="text-[10px] text-slate-300">Petualangan Kata A1 hingga IELTS</div>
                </div>
                {bestLocalScore > 0 && (
                  <div className="rounded-lg bg-amber-500/20 px-2 py-1 text-right">
                    <div className="text-[9px] uppercase text-amber-200">Rekor</div>
                    <div className="font-mono-nums text-xs font-black text-amber-300">
                      {bestLocalScore.toLocaleString('id-ID')}
                    </div>
                  </div>
                )}
              </div>

              {/* Kata Hari Ini inside Info Sheet */}
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    <span>Kata Hari Ini</span>
                  </div>
                  <div className="truncate text-xs">
                    <strong className="font-black text-white">{wotd.word}</strong>
                    <span className="mx-1 text-slate-400">=</span>
                    <span className="font-semibold text-emerald-300">{wotd.meaningId}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(wotd.word)}
                  aria-label="Dengar Kata Hari Ini"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/25 text-amber-200 hover:bg-amber-500/40"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowInfoSheet(false);
                    onOpenLeaderboard();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>Peringkat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInfoSheet(false);
                    onOpenGuide();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Petunjuk</span>
                </button>
              </div>

              <div className="mt-2.5 text-center text-[10px] text-slate-400">
                Gerak: Joystick Kiri / WASD · Kamera: Geser Layar · Aksi: E / Spasi
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Clean Title Logo Only */}
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <svg
          viewBox="0 0 660 105"
          className="w-full max-w-[380px] drop-shadow-[0_8px_20px_rgba(15,23,42,0.55)] sm:max-w-[460px]"
          aria-label="Diglosa 3D"
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
            y="80"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="68"
            letterSpacing="3"
            fill="#451a03"
            transform="translate(0, 5)"
          >
            DIGLOSA 3D
          </text>
          <text
            x="330"
            y="80"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="68"
            letterSpacing="3"
            fill="url(#diglosaTitleGrad)"
            stroke="#451a03"
            strokeWidth="3.5"
          >
            DIGLOSA 3D
          </text>
        </svg>
      </div>

      {/* Bottom Clean Compact Action Buttons */}
      <div className="flex flex-col items-center gap-2.5 pb-1">
        {showQuickMenu && (
          <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5 rounded-2xl border border-white/20 bg-slate-950/80 p-2 shadow-2xl backdrop-blur-md">
            {(
              [
                ['cards', 'Kartu'],
                ['quiz', 'Kuis'],
                ['listen', 'Dengar'],
                ['type', 'Ejaan'],
                ['match', 'Cocok'],
              ] as Array<[LearningModeType, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickLearn(m);
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-amber-100 hover:bg-white/20"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="pointer-events-auto flex items-center justify-center gap-2.5">
          {hasSavedGame && (
            <button
              type="button"
              onClick={onContinue}
              title="Lanjutkan Petualangan"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] px-6 py-3 text-sm font-black text-white shadow-[0_5px_0_#14532d] transition hover:brightness-105 active:translate-y-0.5 sm:px-7 sm:text-base"
            >
              <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              <span>Lanjutkan</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartNew}
            title={hasSavedGame ? 'Petualangan Baru' : 'Mulai Petualangan'}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#451a03] bg-gradient-to-b from-[#fde047] to-[#f59e0b] px-5 py-3 text-sm font-black text-[#451a03] shadow-[0_5px_0_#451a03] transition hover:brightness-105 active:translate-y-0.5 sm:px-6 sm:text-base"
          >
            {hasSavedGame ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-[#451a03] sm:h-5 sm:w-5" />
            )}
            <span>{hasSavedGame ? 'Baru' : 'Main'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickMenu((s) => !s)}
            title="Belajar Cepat"
            aria-label="Belajar Cepat"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 bg-slate-950/65 text-amber-200 shadow-lg backdrop-blur-sm transition hover:bg-slate-900/85 sm:h-12 sm:w-12"
          >
            <BookOpen className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
