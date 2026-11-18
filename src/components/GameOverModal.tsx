import React from 'react';
import { Home, Play, RotateCcw, Trophy } from 'lucide-react';
import { RpgHudSnapshot } from '../types/game';

interface GameOverModalProps {
  hud: RpgHudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  onOpenLeaderboard: () => void;
  cloudSyncNote: string | null;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  onResume,
  onRestart,
  onQuitToTitle,
  onOpenLeaderboard,
  cloudSyncNote,
}) => {
  if (hud.phase !== 'paused' && hud.phase !== 'gameover') return null;

  const isGameOver = hud.phase === 'gameover';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-4 border-[#78350f] bg-[#fff7e6] p-6 text-[#3b2008] shadow-2xl">
        <div className="text-center">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
              isGameOver ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {isGameOver ? 'Nyawa Hoot Habis' : 'Petualangan Dijeda'}
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
            {isGameOver ? 'Catatan Petualangan Hoot' : 'Menu Jeda Diglosa'}
          </h2>
          <p className="mt-1 text-xs font-bold text-[#92400e]">
            Lv. {hud.level} · {hud.rankTitle}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-[#d6b67c] bg-white p-3 text-center">
            <div className="text-[11px] font-bold text-[#92400e]">Total Skor</div>
            <div className="mt-0.5 font-mono-nums text-xl font-extrabold text-[#b45309]">
              {hud.score.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#d6b67c] bg-white p-3 text-center">
            <div className="text-[11px] font-bold text-[#92400e]">Kosakata Dikuasai</div>
            <div className="mt-0.5 font-mono-nums text-xl font-extrabold text-emerald-700">
              {hud.wordsMastered} Kata
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#d6b67c] bg-white p-3 text-center">
            <div className="text-[11px] font-bold text-[#92400e]">Mahkota Raja</div>
            <div className="mt-0.5 font-mono-nums text-lg font-extrabold text-amber-600">
              👑 {hud.crowns}/6
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#d6b67c] bg-white p-3 text-center">
            <div className="text-[11px] font-bold text-[#92400e]">Streak Terbaik</div>
            <div className="mt-0.5 font-mono-nums text-lg font-extrabold text-cyan-700">
              x{hud.maxStreak}
            </div>
          </div>
        </div>

        {cloudSyncNote && (
          <div className="mt-4 rounded-xl border-2 border-emerald-600/30 bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-900">
            {cloudSyncNote}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {!isGameOver && (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow transition hover:bg-emerald-500"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Lanjutkan Petualangan</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#78350f] bg-amber-400 px-4 py-3 text-sm font-extrabold text-[#3b2008] shadow transition hover:bg-amber-300"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{isGameOver ? 'Mulai Petualangan Baru' : 'Ulangi dari Awal'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#d6b67c] bg-white px-4 py-2.5 text-sm font-bold text-[#3b2008] transition hover:bg-[#f5e3be]"
          >
            <Trophy className="h-4 w-4 text-amber-600" />
            <span>Lihat Papan Peringkat Daring</span>
          </button>
          <button
            type="button"
            onClick={onQuitToTitle}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-[#78350f] transition hover:bg-[#f5e3be]"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Kembali ke Layar Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
