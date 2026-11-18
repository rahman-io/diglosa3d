import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  CalendarCheck,
  Camera,
  Crosshair,
  Crown,
  DoorOpen,
  Gem,
  Heart,
  HelpCircle,
  Map as MapIcon,
  MessageCircle,
  Pause,
  ScrollText,
  Settings,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ACADEMY_NPCS,
  NPC_CATALOG,
  WEAPON_ORDER,
  WEAPONS,
  ZONE_DOORS,
} from '../data/diglosaCatalog';
import { CameraMode, RpgHudSnapshot } from '../types/game';
import { RadarMinimap, StarterWeaponPixelIcon } from './RadarMinimap';

const CAMERA_SHORT_LABELS: Record<CameraMode, string> = {
  third_back: '3D Blk',
  first_person: 'FPS',
  third_front: 'Depan',
  orbit: 'Orbit',
};

interface RpgHudProps {
  hud: RpgHudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSelectHotbar: (slot: number) => void;
  onPause: () => void;
  onOpenBag: () => void;
  onOpenKamus: () => void;
  onOpenQuests: () => void;
  onOpenMap: () => void;
  onOpenGuide: () => void;
  onOpenOptions: () => void;
  onOpenLeaderboard: () => void;
  onPrimaryAction: () => void;
  onFireWeapon: () => void;
  onJump: () => void;
  onOpenCrafting: () => void;
  onVirtualMove: (vx: number, vz: number) => void;
  onExitDungeon: () => void;
}

export const RpgHud: React.FC<RpgHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onToggleCamera,
  onSelectHotbar,
  onPause,
  onOpenBag,
  onOpenKamus,
  onOpenQuests,
  onOpenMap,
  onOpenGuide,
  onOpenOptions,
  onOpenLeaderboard,
  onPrimaryAction,
  onFireWeapon,
  onJump,
  onOpenCrafting,
  onVirtualMove,
  onExitDungeon,
}) => {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [stickKnob, setStickKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [floatingOrigin, setFloatingOrigin] = useState<{ x: number; y: number } | null>(null);
  const stickOriginRef = useRef<{ x: number; y: number } | null>(null);
  const stickPointerId = useRef<number | null>(null);
  const onVirtualMoveRef = useRef(onVirtualMove);
  onVirtualMoveRef.current = onVirtualMove;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    setIsCoarsePointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    mq.addEventListener?.('change', handler);
    const checkWidth = () => setIsSmallViewport(window.innerWidth < 640);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => {
      mq.removeEventListener?.('change', handler);
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  const showTouchControls =
    hud.phase === 'playing' &&
    (hud.settings.touchControls === 'on' ||
      (hud.settings.touchControls === 'auto' && isCoarsePointer));

  useEffect(() => {
    if (!showTouchControls) {
      stickPointerId.current = null;
      stickOriginRef.current = null;
      setFloatingOrigin(null);
      setStickKnob({ x: 0, y: 0 });
      onVirtualMoveRef.current(0, 0);
    }
  }, [showTouchControls]);

  const xpPct = Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const activeQuestCount = hud.quests.filter((q) => q.accepted && !q.claimed).length;

  const nearbyOverworldNpc =
    hud.worldMode === 'overworld' && hud.nearbyNpcId
      ? NPC_CATALOG.find((n) => n.id === hud.nearbyNpcId)
      : null;
  const nearbyAcademyNpc =
    hud.worldMode === 'academy' && hud.nearbyNpcId
      ? ACADEMY_NPCS.find((n) => n.id === hud.nearbyNpcId)
      : null;
  const nearbyDoor =
    hud.worldMode === 'dungeon' && hud.nearbyDoorIndex !== null && hud.dungeonState
      ? ZONE_DOORS[hud.dungeonState.zoneId]?.[hud.nearbyDoorIndex]
      : null;

  const activeWeaponDef = WEAPONS[hud.activeWeapon];
  const activeAmmo = hud.weaponAmmo[hud.activeWeapon] || 0;

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const origin = stickOriginRef.current;
    if (!origin) return;
    const maxR = 42;
    let dx = clientX - origin.x;
    let dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setStickKnob({ x: dx, y: dy });
    onVirtualMoveRef.current(dx / maxR, dy / maxR);
  };

  const resetFloatingJoystick = () => {
    stickPointerId.current = null;
    stickOriginRef.current = null;
    setFloatingOrigin(null);
    setStickKnob({ x: 0, y: 0 });
    onVirtualMoveRef.current(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* World-Space Zone Nameplates, Doors, Pickups, Monsters & Speech Bubbles */}
      {hud.projectedLabels.map((lbl) => (
        <div
          key={lbl.id}
          style={{ transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)` }}
          className={`absolute left-0 top-0 whitespace-nowrap font-bold shadow-md ${
            lbl.kind === 'speech'
              ? 'rounded-2xl border-2 border-[#78350f] bg-white px-3 py-1 text-xs font-extrabold text-[#78350f]'
              : lbl.kind === 'portal'
              ? 'rounded-xl border-2 border-[#c084fc] bg-[#4c1d95]/95 px-3 py-1 text-xs font-extrabold text-white'
              : lbl.kind === 'door'
              ? 'rounded-xl border-2 border-[#fde047] bg-[#78350f]/95 px-2.5 py-1 text-[11px] font-extrabold text-[#fef3c7]'
              : lbl.kind === 'pickup'
              ? 'rounded-xl border-2 border-cyan-300 bg-[#0e7490]/95 px-2.5 py-0.5 text-[11px] font-extrabold text-white'
              : lbl.kind === 'monster'
              ? 'rounded-xl border-2 border-rose-500 bg-[#450a0a]/90 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-200'
              : 'rounded-xl border border-[#451a03] bg-[#5c340f]/90 px-3 py-1 text-xs font-extrabold text-[#fef3c7]'
          }`}
        >
          <div>{lbl.title}</div>
          {lbl.subtext && (
            <div className="text-[9px] font-semibold text-amber-200">{lbl.subtext}</div>
          )}
        </div>
      ))}

      {/* Active 3D Zone Dungeon Liberation Banner (Top-Center) */}
      {hud.worldMode === 'dungeon' && hud.dungeonState && (
        <div className="pointer-events-auto fixed left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-[#78350f] bg-[#5c340f]/95 px-4 py-2 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-200">
              <span>{hud.dungeonState.zoneName}</span>
              {hud.dungeonState.isMixedChallenge && (
                <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] text-white">
                  Campuran
                </span>
              )}
              {hud.dungeonState.liberated && (
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                  ✓ Area Bebas!
                </span>
              )}
            </div>
            <div className="font-mono-nums text-[11px] font-bold text-white">
              Pintu {hud.dungeonState.doorsCleared.length}/5 · Monster Kata{' '}
              {hud.dungeonState.monstersRemaining}/{hud.dungeonState.monstersTotal}
              {hud.caveBlocksMined > 0 ? ` · ⛏️ ${hud.caveBlocksMined}` : ''}
              {hud.dungeonState.bossSpawned && !hud.dungeonState.bossDefeated
                ? ' · 👑 BOS + BATU RUNTUH!'
                : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={onExitDungeon}
            className="rounded-xl border border-cyan-300/60 bg-cyan-600 px-3 py-1.5 text-xs font-extrabold text-white shadow transition hover:bg-cyan-500"
          >
            Keluar
          </button>
        </div>
      )}

      {/* Istana IELTS Banner */}
      {hud.worldMode === 'academy' && (
        <div className="pointer-events-auto fixed left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-[#c084fc] bg-[#4c1d95]/95 px-4 py-2 text-white shadow-xl">
          <div>
            <div className="text-xs font-extrabold text-amber-200">
              🏰 Istana IELTS 3D · 4 Penguji &amp; Raja
            </div>
            <div className="font-mono-nums text-[11px] font-bold">
              L {hud.ieltsScores.listening}% · R {hud.ieltsScores.reading}% · W{' '}
              {hud.ieltsScores.writing}% · S {hud.ieltsScores.speaking}%
            </div>
          </div>
          <button
            type="button"
            onClick={onExitDungeon}
            className="rounded-xl border border-cyan-300/60 bg-cyan-600 px-3 py-1.5 text-xs font-extrabold text-white shadow hover:bg-cyan-500"
          >
            Keluar
          </button>
        </div>
      )}

      {/* Top Row: Left Hero Badge + Right Menu Rail */}
      <div className="relative z-20 flex items-start justify-between p-3 sm:p-4">
        <div className="pointer-events-auto rounded-2xl border-2 border-[#78350f] bg-[#5c340f]/92 p-2.5 text-white shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-300 bg-emerald-600 text-lg font-black text-white">
              🦉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#92400e] px-2 py-0.5 text-xs font-extrabold text-amber-200">
                  {hud.rankTitle}
                </span>
                <span className="font-mono-nums text-xs font-bold text-amber-300">
                  Lv. {String(hud.level).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-36 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2.5 border-t border-white/15 pt-1.5 text-xs font-bold">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: hud.maxHp }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < hud.hp ? 'fill-rose-500 text-rose-400' : 'fill-slate-700 text-slate-600'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 font-mono-nums text-cyan-300">
              <Gem className="h-3.5 w-3.5 fill-cyan-400" />
              <span>{hud.diamonds}</span>
            </div>
            <button
              type="button"
              onClick={onOpenBag}
              title="Kelola Senjata & Peluru"
              className="flex items-center gap-1 rounded-md bg-slate-900/70 px-1.5 py-0.5 font-mono-nums text-[11px] text-amber-300 hover:bg-slate-800"
            >
              <Crosshair className="h-3 w-3" />
              <span>
                {hud.ownedWeapons.length > 0
                  ? `${activeWeaponDef.name.replace('Senjata ', '')} ${activeAmmo}`
                  : 'Belum ada'}
              </span>
            </button>
            <div className="flex items-center gap-1 font-mono-nums text-amber-300">
              <Crown className="h-3.5 w-3.5 fill-amber-400" />
              <span>{hud.crowns}/6</span>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-semibold text-amber-100/90">
            <span>Area: {hud.activeZoneName}</span>
            <span className="inline-flex items-center gap-1 font-mono-nums text-emerald-300">
              <CalendarCheck className="h-3 w-3" />
              <span>
                Harian {hud.dailyCount}/{hud.dailyGoal}
              </span>
            </span>
          </div>
        </div>

        {/* Right-Edge Compact Wooden RPG Menu Rail */}
        <div className="pointer-events-auto flex flex-col gap-1 sm:gap-1.5">
          {[
            { label: 'Tas', icon: Backpack, onClick: onOpenBag, badge: hud.ownedWeapons.length },
            { label: 'Kamus', icon: BookOpen, onClick: onOpenKamus, badge: hud.wordsMastered },
            { label: 'Misi', icon: ScrollText, onClick: onOpenQuests, badge: activeQuestCount },
            { label: 'Peta', icon: MapIcon, onClick: onOpenMap },
            { label: 'Petunjuk', icon: HelpCircle, onClick: onOpenGuide },
            { label: 'Opsi', icon: Settings, onClick: onOpenOptions },
            { label: 'Ranking', icon: Trophy, onClick: onOpenLeaderboard },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                className="relative flex w-14 flex-col items-center rounded-xl border-2 border-[#78350f] bg-[#b45309]/95 py-0.5 text-white shadow-lg transition hover:bg-[#d97706] sm:py-1"
              >
                <Icon className="h-4 w-4 text-amber-200" />
                <span className="mt-0.5 text-[9px] font-extrabold">{btn.label}</span>
                {btn.badge !== undefined && btn.badge > 0 && (
                  <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 font-mono-nums text-[9px] font-extrabold text-white">
                    {btn.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-0.5 flex flex-col gap-1">
            <button
              type="button"
              onClick={onToggleCamera}
              title={`Ganti Sudut Kamera: ${CAMERA_SHORT_LABELS[hud.cameraMode]} (C / F5)`}
              className="flex w-14 flex-col items-center justify-center rounded-xl border-2 border-[#78350f] bg-[#5c340f]/95 py-1 text-cyan-300 shadow-lg hover:bg-[#78350f]"
            >
              <Camera className="h-4 w-4" />
              <span className="mt-0.5 text-[9px] font-extrabold text-cyan-100">
                {CAMERA_SHORT_LABELS[hud.cameraMode]}
              </span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title="Suara"
              className="flex h-8 w-14 items-center justify-center rounded-xl border-2 border-[#78350f] bg-[#5c340f]/90 text-amber-300 shadow-lg hover:bg-[#78350f]"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onPause}
              title="Jeda (Esc)"
              className="flex h-8 w-14 items-center justify-center rounded-xl border-2 border-[#78350f] bg-[#5c340f]/90 text-white shadow-lg hover:bg-[#78350f]"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transient Event Toast */}
      {hud.bannerMessage && (
        <div
          className={`pointer-events-none fixed left-1/2 z-20 -translate-x-1/2 ${
            hud.worldMode === 'overworld' ? 'top-4' : 'top-20'
          }`}
        >
          <div className="rounded-full border-2 border-amber-300 bg-[#5c340f]/95 px-5 py-2 text-xs font-extrabold text-amber-100 shadow-xl">
            {hud.bannerMessage}
          </div>
        </div>
      )}

      {/* GTA-Style Circular Radar Minimap (Custom Pixel/Vector Icons, Zero Emojis) */}
      {hud.phase === 'playing' && hud.radarState && (
        <div className="pointer-events-none fixed left-3 top-[134px] z-20 flex flex-col items-start gap-1.5 sm:bottom-5 sm:left-5 sm:top-auto">
          {hud.worldMode === 'overworld' &&
            !hud.starterWeaponPicked &&
            hud.starterWeaponGuide && (
              <div className="flex max-w-[230px] items-center gap-2 rounded-xl border-2 border-cyan-300/90 bg-[#082f49]/92 px-2.5 py-1.5 text-white shadow-xl sm:max-w-[260px]">
                <StarterWeaponPixelIcon className="h-5 w-5 shrink-0" />
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-black uppercase tracking-wide text-amber-300">
                    Misi Awal: Senjata Pertama ({hud.starterWeaponGuide.distance}m)
                  </div>
                  <div className="text-[9px] font-semibold text-cyan-100">
                    Ikuti ikon biru di radar · jelajahi Gua untuk senjata kuat
                  </div>
                </div>
              </div>
            )}
          <RadarMinimap
            radar={hud.radarState}
            size={isSmallViewport ? 92 : 132}
            onOpenMap={onOpenMap}
          />
        </div>
      )}

      {/* Center Minecraft-style Crosshair in First-Person Mode */}
      {hud.cameraMode === 'first_person' && hud.phase === 'playing' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative h-6 w-6">
            <span className="absolute left-1/2 top-0 h-6 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_2px_#000]" />
            <span className="absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-white shadow-[0_0_2px_#000]" />
          </div>
        </div>
      )}

      {/* Targeted Cave Voxel Block Indicator (Dungeon Cave Mode) */}
      {hud.worldMode === 'dungeon' && hud.targetedBlock && hud.phase === 'playing' && (
        <div className="pointer-events-none fixed bottom-14 left-1/2 z-20 -translate-x-1/2 sm:bottom-20">
          <div
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1 text-[11px] font-extrabold shadow-xl ${
              hud.targetedBlock.kind === 'word_seal'
                ? 'border-purple-400 bg-[#2e1065]/95 text-purple-100'
                : hud.targetedBlock.kind === 'diamond_ore'
                ? 'border-cyan-400 bg-[#083344]/95 text-cyan-100'
                : hud.targetedBlock.kind === 'heart_ore'
                ? 'border-rose-400 bg-[#4c0519]/95 text-rose-100'
                : hud.targetedBlock.kind === 'player_shield'
                ? 'border-sky-400 bg-[#0c4a6e]/95 text-sky-100'
                : 'border-slate-400 bg-[#0f172a]/92 text-slate-100'
            }`}
          >
            <span>{hud.targetedBlock.label}</span>
            <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono-nums text-[10px] text-amber-300">
              {hud.targetedBlock.hp}/{hud.targetedBlock.maxHp}
            </span>
            <span className="hidden text-[10px] font-semibold text-amber-200 sm:inline">
              {hud.targetedBlock.kind === 'word_seal'
                ? '· [E] Kuis Kilat / Slot 9 Gali'
                : hud.targetedBlock.kind === 'player_shield'
                ? '· Bentengmu (Slot 9 Gali untuk ambil lagi)'
                : hud.activeHotbarSlot === 8
                ? '· Spasi / Tap Gali'
                : '· Pilih Slot 9 (⛏️)'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Virtual Joystick Touch Zone (Left Half: spawns right where player presses!) */}
      {showTouchControls && (
        <>
          <div
            onPointerDown={(e) => {
              if (stickPointerId.current !== null) return;
              stickPointerId.current = e.pointerId;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              const origin = { x: e.clientX, y: e.clientY };
              stickOriginRef.current = origin;
              setFloatingOrigin(origin);
              setStickKnob({ x: 0, y: 0 });
              onVirtualMoveRef.current(0, 0);
            }}
            onPointerMove={(e) => {
              if (stickPointerId.current === e.pointerId) {
                updateJoystickFromPointer(e.clientX, e.clientY);
              }
            }}
            onPointerUp={(e) => {
              if (stickPointerId.current === e.pointerId) {
                resetFloatingJoystick();
              }
            }}
            onPointerCancel={(e) => {
              if (stickPointerId.current === e.pointerId) {
                resetFloatingJoystick();
              }
            }}
            className="pointer-events-auto fixed bottom-14 left-0 top-36 z-10 w-[48vw] touch-none sm:bottom-20 sm:top-36 sm:w-[44vw]"
            aria-label="Area Floating Joystick"
          />

          {/* Subtle idle hint ring when finger is lifted */}
          {!floatingOrigin && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed bottom-16 left-4 z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#fde047]/45 bg-[#0f172a]/30 sm:bottom-6 sm:left-5 sm:h-24 sm:w-24"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#451a03]/70 bg-amber-400/60 text-[9px] font-black text-[#451a03]">
                Gerak
              </div>
            </div>
          )}

          {/* Active Floating Joystick Ring spawned right under the player's finger */}
          {floatingOrigin && (
            <div
              aria-hidden="true"
              style={{
                left: floatingOrigin.x,
                top: floatingOrigin.y,
                transform: 'translate(-50%, -50%)',
              }}
              className="pointer-events-none fixed z-20 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#fde047]/80 bg-[#0f172a]/60 shadow-xl sm:h-28 sm:w-28"
            >
              <div
                className="h-10 w-10 rounded-full border-2 border-[#451a03] bg-amber-400 shadow-md sm:h-11 sm:w-11"
                style={{ transform: `translate3d(${stickKnob.x}px, ${stickKnob.y}px, 0)` }}
              />
            </div>
          )}
        </>
      )}

      {/* Bottom-Right Shoot & Context Action Buttons (elevated on mobile above Hotbar) */}
      <div className="pointer-events-auto fixed bottom-16 right-4 z-20 flex items-end gap-2 sm:bottom-6 sm:right-20 sm:gap-2.5">
        {nearbyOverworldNpc && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-16 items-center gap-2 rounded-full border-4 border-[#78350f] bg-gradient-to-b from-[#fde68a] to-[#d97706] px-4 text-xs font-black text-[#3b2008] shadow-2xl transition hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Bicara: {nearbyOverworldNpc.name} (E)</span>
          </button>
        )}

        {nearbyAcademyNpc && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-16 items-center gap-2 rounded-full border-4 border-[#4c1d95] bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 text-xs font-black text-white shadow-2xl transition hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{nearbyAcademyNpc.name} (E)</span>
          </button>
        )}

        {nearbyDoor && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-16 items-center gap-2 rounded-full border-4 border-[#78350f] bg-gradient-to-b from-[#4ade80] to-[#16a34a] px-4 text-xs font-black text-white shadow-2xl transition hover:scale-105"
          >
            <DoorOpen className="h-5 w-5" />
            <span>Buka {nearbyDoor.name} (E)</span>
          </button>
        )}

        {hud.nearPortal && hud.worldMode === 'overworld' && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-16 items-center gap-2 rounded-full border-4 border-[#4c1d95] bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-5 text-xs font-black text-white shadow-2xl transition hover:scale-105"
          >
            <Swords className="h-5 w-5" />
            <span>Istana IELTS (E)</span>
          </button>
        )}

        {hud.nearDungeonExit && hud.worldMode !== 'overworld' && (
          <button
            type="button"
            onClick={onExitDungeon}
            className="flex h-14 items-center gap-2 rounded-full border-4 border-[#0e7490] bg-gradient-to-r from-[#0284c7] to-[#06b6d4] px-5 text-xs font-black text-white shadow-2xl transition hover:scale-105"
          >
            <span>🚪 Keluar (E)</span>
          </button>
        )}

        {hud.worldMode === 'dungeon' &&
          hud.nearCraftingTable &&
          !nearbyDoor &&
          !hud.nearDungeonExit && (
            <button
              type="button"
              onClick={onOpenCrafting}
              className="flex h-14 items-center gap-2 rounded-full border-4 border-[#78350f] bg-gradient-to-b from-[#fde68a] to-[#d97706] px-4 text-xs font-black text-[#3b2008] shadow-2xl transition hover:scale-105 sm:h-16"
            >
              <span>⚒️ Meja Craft (E)</span>
            </button>
          )}

        {hud.worldMode === 'dungeon' &&
          hud.targetedBlock?.kind === 'word_seal' &&
          !nearbyDoor &&
          !hud.nearDungeonExit &&
          !hud.nearCraftingTable && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="flex h-14 items-center gap-2 rounded-full border-4 border-purple-300 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 text-xs font-black text-white shadow-2xl transition hover:scale-105 sm:h-16"
            >
              <span>🔮 Pecah Segel (E)</span>
            </button>
          )}

        {hud.phase === 'playing' && (
          <button
            type="button"
            onClick={onJump}
            title="Lompat (J / Shift)"
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-4 border-[#064e3b] bg-gradient-to-b from-[#34d399] to-[#059669] text-white shadow-2xl transition hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          >
            <span className="text-sm font-black leading-none sm:text-base">⬆️</span>
            <span className="text-[8px] font-black sm:text-[9px]">Lompat</span>
          </button>
        )}

        {(hud.ownedWeapons.length > 0 || hud.activeHotbarSlot >= 8) && hud.phase === 'playing' && (
          <button
            type="button"
            onClick={onFireWeapon}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4 border-[#0f172a] bg-gradient-to-b from-[#38bdf8] to-[#0284c7] text-white shadow-2xl transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
          >
            <Crosshair className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[9px] font-black">
              {hud.activeHotbarSlot === 8
                ? 'Gali'
                : hud.activeHotbarSlot === 9
                ? 'Obor'
                : hud.activeHotbarSlot === 10
                ? 'Pasang'
                : hud.activeHotbarSlot === 11
                ? 'TNT'
                : 'Tembak'}
            </span>
          </button>
        )}
      </div>

      {/* Minecraft-Style 12-Slot Hotbar (Bottom-Center: 8 Weapons + 9 Pickaxe + 0 Torch + B Shield Block + T TNT) */}
      {hud.phase === 'playing' && (
        <div className="pointer-events-auto fixed bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border-2 border-[#475569] bg-[#0f172a]/88 p-1 shadow-2xl sm:bottom-7 sm:gap-1">
          {WEAPON_ORDER.map((wId, idx) => {
            const w = WEAPONS[wId];
            const owned = hud.ownedWeapons.includes(wId);
            const ammo = hud.weaponAmmo[wId] || 0;
            const isSelected = hud.activeHotbarSlot === idx;
            return (
              <button
                key={wId}
                type="button"
                onClick={() => onSelectHotbar(idx)}
                title={`${idx + 1}. ${w.name}${owned ? ` (${ammo} peluru · Kekuatan ${w.shieldDamage})` : ` — ${w.originLabel}`}`}
                className={`relative flex h-8 w-[26px] flex-col items-center justify-center rounded border transition sm:h-11 sm:w-10 ${
                  isSelected
                    ? 'border-2 border-white bg-slate-700/95 ring-2 ring-amber-400'
                    : 'border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/80'
                }`}
              >
                <span className="absolute left-0.5 top-0 font-mono-nums text-[7px] font-bold text-slate-300 sm:left-1 sm:top-0.5 sm:text-[8px]">
                  {idx + 1}
                </span>
                <span
                  className={`h-3 w-3 rounded-sm border border-black/40 shadow-inner sm:h-4 sm:w-4 ${
                    owned ? 'opacity-100' : 'opacity-30 grayscale'
                  }`}
                  style={{ backgroundColor: w.color }}
                />
                {owned ? (
                  <span className="absolute bottom-0 right-0.5 font-mono-nums text-[8px] font-black text-amber-200 drop-shadow sm:bottom-0.5 sm:right-1 sm:text-[9px]">
                    {ammo}
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 text-[7px] opacity-75 sm:bottom-0.5 sm:right-0.5 sm:text-[8px]">
                    🔒
                  </span>
                )}
              </button>
            );
          })}

          {/* Slot 9 (Key 9): Voxel Pickaxe (Tier 1/2/3) */}
          <button
            type="button"
            onClick={() => onSelectHotbar(8)}
            title={`9. Beliung Voxel Tier ${hud.pickaxeTier} (${hud.pickaxeTier}× kecepatan gali)`}
            className={`relative flex h-8 w-[26px] flex-col items-center justify-center rounded border transition sm:h-11 sm:w-10 ${
              hud.activeHotbarSlot === 8
                ? 'border-2 border-white bg-slate-700/95 ring-2 ring-amber-400'
                : 'border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/80'
            }`}
          >
            <span className="absolute left-0.5 top-0 font-mono-nums text-[7px] font-bold text-slate-300 sm:left-1 sm:top-0.5 sm:text-[8px]">
              9
            </span>
            <span className="text-xs sm:text-base">⛏️</span>
            {hud.pickaxeTier > 1 && (
              <span
                className={`absolute bottom-0 right-0.5 font-mono-nums text-[7px] font-black drop-shadow sm:bottom-0.5 sm:right-1 sm:text-[9px] ${
                  hud.pickaxeTier === 3 ? 'text-cyan-300' : 'text-slate-200'
                }`}
              >
                T{hud.pickaxeTier}
              </span>
            )}
          </button>

          {/* Slot 0 (Key 0): Voxel Torch */}
          <button
            type="button"
            onClick={() => onSelectHotbar(9)}
            title={`0. Obor Voxel (Penerang & penenang monster gua${hud.worldMode === 'dungeon' ? ` · ${hud.caveTorchesLeft} tersisa` : ''})`}
            className={`relative flex h-8 w-[26px] flex-col items-center justify-center rounded border transition sm:h-11 sm:w-10 ${
              hud.activeHotbarSlot === 9
                ? 'border-2 border-white bg-slate-700/95 ring-2 ring-amber-400'
                : 'border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/80'
            }`}
          >
            <span className="absolute left-0.5 top-0 font-mono-nums text-[7px] font-bold text-slate-300 sm:left-1 sm:top-0.5 sm:text-[8px]">
              0
            </span>
            <span className="text-xs sm:text-base">🔦</span>
            {hud.worldMode === 'dungeon' && (
              <span className="absolute bottom-0 right-0.5 font-mono-nums text-[8px] font-black text-amber-200 drop-shadow sm:bottom-0.5 sm:right-1 sm:text-[9px]">
                {hud.caveTorchesLeft}
              </span>
            )}
          </button>

          {/* Slot B (Key B): Placeable Protective Block */}
          <button
            type="button"
            onClick={() => onSelectHotbar(10)}
            title={`B. Blok Pelindung (${hud.caveShieldBlocksLeft} siap dipasang — tahan peluru, ledakan Creeper & jembatan jurang)`}
            className={`relative flex h-8 w-[26px] flex-col items-center justify-center rounded border transition sm:h-11 sm:w-10 ${
              hud.activeHotbarSlot === 10
                ? 'border-2 border-white bg-slate-700/95 ring-2 ring-cyan-400'
                : 'border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/80'
            }`}
          >
            <span className="absolute left-0.5 top-0 font-mono-nums text-[7px] font-bold text-cyan-300 sm:left-1 sm:top-0.5 sm:text-[8px]">
              B
            </span>
            <span className="text-xs sm:text-base">🧱</span>
            {hud.worldMode === 'dungeon' && (
              <span className="absolute bottom-0 right-0.5 font-mono-nums text-[8px] font-black text-cyan-200 drop-shadow sm:bottom-0.5 sm:right-1 sm:text-[9px]">
                {hud.caveShieldBlocksLeft}
              </span>
            )}
          </button>

          {/* Slot T (Key T): Mining TNT */}
          <button
            type="button"
            onClick={() => onSelectHotbar(11)}
            title={`T. TNT Tambang (${hud.caveTntLeft} tersisa — ledakkan banyak batu & perisai monster)`}
            className={`relative flex h-8 w-[26px] flex-col items-center justify-center rounded border transition sm:h-11 sm:w-10 ${
              hud.activeHotbarSlot === 11
                ? 'border-2 border-white bg-slate-700/95 ring-2 ring-rose-400'
                : 'border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/80'
            }`}
          >
            <span className="absolute left-0.5 top-0 font-mono-nums text-[7px] font-bold text-rose-300 sm:left-1 sm:top-0.5 sm:text-[8px]">
              T
            </span>
            <span className="text-xs sm:text-base">🧨</span>
            {hud.worldMode === 'dungeon' && (
              <span className="absolute bottom-0 right-0.5 font-mono-nums text-[8px] font-black text-rose-200 drop-shadow sm:bottom-0.5 sm:right-1 sm:text-[9px]">
                {hud.caveTntLeft}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Bottom-Center Keyboard Guide (Desktop) */}
      <div className="pointer-events-none fixed bottom-1 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f172a]/75 px-3.5 py-0.5 text-[10px] font-medium text-slate-200 sm:block">
        WASD Gerak · J / Shift Lompat · 1–8 Senjata · 9 Beliung · 0 Obor · B Blok · T TNT · Spasi Aksi · E Interaksi · C Kamera · H Petunjuk
      </div>
    </div>
  );
};
