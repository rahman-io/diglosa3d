import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  Camera,
  Crown,
  DoorOpen,
  Gem,
  Hammer,
  Heart,
  HelpCircle,
  KeyRound,
  Lock,
  Map as MapIcon,
  Maximize2,
  Menu,
  MessageCircle,
  Minimize2,
  Pause,
  ScrollText,
  Settings,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ACADEMY_NPCS,
  NPC_CATALOG,
  WEAPON_ORDER,
  WEAPONS,
  ZONE_DOORS,
} from '../data/diglosaCatalog';
import { CameraMode, RpgHudSnapshot } from '../types/game';
import { isFullscreenActive, toggleAppFullscreen } from '../utils/fullscreen';
import { RadarMinimap, StarterWeaponPixelIcon } from './RadarMinimap';

const CAMERA_SHORT_LABELS: Record<CameraMode, string> = {
  third_back: '3D GTA',
  first_person: 'FPS',
  third_front: 'Depan',
  orbit: 'Bebas',
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
  const [touchUsed, setTouchUsed] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hotbarOpen, setHotbarOpen] = useState(false);
  const [isFs, setIsFs] = useState(false);
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
    const onGlobalPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setTouchUsed(true);
    };
    window.addEventListener('pointerdown', onGlobalPointer, { passive: true });
    const checkWidth = () => setIsSmallViewport(window.innerWidth < 640);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    const onFsChange = () => setIsFs(isFullscreenActive());
    onFsChange();
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      mq.removeEventListener?.('change', handler);
      window.removeEventListener('pointerdown', onGlobalPointer);
      window.removeEventListener('resize', checkWidth);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const showTouchControls =
    hud.phase === 'playing' &&
    (hud.settings.touchControls === 'on' ||
      (hud.settings.touchControls === 'auto' && (isCoarsePointer || touchUsed)));

  useEffect(() => {
    if (!showTouchControls) {
      stickPointerId.current = null;
      stickOriginRef.current = null;
      setFloatingOrigin(null);
      setStickKnob({ x: 0, y: 0 });
      onVirtualMoveRef.current(0, 0);
    }
  }, [showTouchControls]);

  useEffect(() => {
    if (hud.phase !== 'playing') {
      setMenuOpen(false);
      setHotbarOpen(false);
    }
  }, [hud.phase]);

  if (hud.phase !== 'playing') {
    return null;
  }

  const hpPct = Math.max(0, Math.min(100, Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100)));
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
  const ownedWeaponIndices = WEAPON_ORDER.map((wId, idx) => ({ wId, idx })).filter(({ wId }) =>
    hud.ownedWeapons.includes(wId),
  );

  const activeItemIconSrc =
    hud.activeHotbarSlot === 8
      ? './assets/ui/icon_pickaxe.png'
      : hud.activeHotbarSlot === 9
      ? './assets/ui/icon_torch.png'
      : hud.activeHotbarSlot === 10
      ? './assets/ui/icon_shield_block.png'
      : hud.activeHotbarSlot === 11
      ? './assets/ui/icon_tnt.png'
      : './assets/ui/icon_slingshot.png';

  const activeSlotBadgeText =
    hud.activeHotbarSlot === 8
      ? `T${hud.pickaxeTier}`
      : hud.activeHotbarSlot === 9
      ? String(hud.caveTorchesLeft)
      : hud.activeHotbarSlot === 10
      ? String(hud.caveShieldBlocksLeft)
      : hud.activeHotbarSlot === 11
      ? String(hud.caveTntLeft)
      : hud.ownedWeapons.length > 0
      ? String(activeAmmo)
      : null;

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const origin = stickOriginRef.current;
    if (!origin) return;
    const maxR = 46;
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

  const drawerItems = [
    { label: 'Tas', icon: Backpack, onClick: onOpenBag, badge: hud.ownedWeapons.length },
    { label: 'Kamus', icon: BookOpen, onClick: onOpenKamus, badge: hud.wordsMastered },
    { label: 'Misi', icon: ScrollText, onClick: onOpenQuests, badge: activeQuestCount },
    { label: 'Peta', icon: MapIcon, onClick: onOpenMap },
    { label: 'Petunjuk', icon: HelpCircle, onClick: onOpenGuide },
    { label: 'Opsi', icon: Settings, onClick: onOpenOptions },
    { label: 'Ranking', icon: Trophy, onClick: onOpenLeaderboard },
    { label: 'Jeda', icon: Pause, onClick: onPause },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Subtle World-Space Nameplates (kept light so world stays clear) */}
      {hud.projectedLabels.map((lbl) => (
        <div
          key={lbl.id}
          style={{ transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)` }}
          className={`absolute left-0 top-0 whitespace-nowrap font-bold shadow-md ${
            lbl.kind === 'speech'
              ? 'rounded-xl border border-[#78350f] bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold text-[#78350f]'
              : lbl.kind === 'portal'
              ? 'rounded-lg border border-purple-300/60 bg-[#2e1065]/80 px-2.5 py-0.5 text-[11px] font-extrabold text-white backdrop-blur-[1px]'
              : lbl.kind === 'door'
              ? 'rounded-lg border border-amber-300/60 bg-slate-950/75 px-2 py-0.5 text-[10px] font-extrabold text-amber-100'
              : lbl.kind === 'pickup'
              ? 'rounded-lg border border-cyan-300/70 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-extrabold text-cyan-100'
              : lbl.kind === 'monster'
              ? 'rounded-lg border border-rose-400/70 bg-rose-950/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-200'
              : 'rounded-lg border border-white/20 bg-slate-950/65 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-100 backdrop-blur-[1px]'
          }`}
        >
          <div>{lbl.title}</div>
          {lbl.subtext && (
            <div className="text-[9px] font-semibold text-amber-200">{lbl.subtext}</div>
          )}
        </div>
      ))}

      {/* TOP-LEFT: Minimalist GTA Circular Minimap Radar (Tap to open Full Map) */}
      {hud.radarState && (
        <div className="pointer-events-none fixed left-2.5 top-2.5 z-20 flex flex-col items-start gap-1 sm:left-4 sm:top-4">
          <RadarMinimap
            radar={hud.radarState}
            size={isSmallViewport ? 88 : 114}
            onOpenMap={onOpenMap}
          />
          {hud.worldMode === 'overworld' && !hud.starterWeaponPicked && hud.starterWeaponGuide && (
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-slate-950/60 px-2.5 py-0.5 text-[10px] font-bold text-cyan-100 backdrop-blur-[2px]">
              <StarterWeaponPixelIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Senjata ({hud.starterWeaponGuide.distance}m)</span>
            </div>
          )}
        </div>
      )}

      {/* TOP-CENTER: Slim Single-Line Context Strip ONLY inside Dungeon or Academy */}
      {hud.worldMode === 'dungeon' && hud.dungeonState && (
        <div className="pointer-events-auto fixed left-1/2 top-2.5 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1 text-white shadow-lg backdrop-blur-sm sm:top-4">
          <span className="max-w-[190px] truncate font-mono-nums text-[11px] font-extrabold text-amber-200 sm:max-w-none">
            {hud.dungeonState.zoneName} · Pintu {hud.dungeonState.doorsCleared.length}/5
            {hud.dungeonState.bossSpawned && !hud.dungeonState.bossDefeated
              ? ' · BOS!'
              : hud.dungeonState.bossDefeated && !hud.dungeonState.prisonKeyCollected
              ? ' · Ambil Kunci'
              : hud.dungeonState.prisonKeyCollected && !hud.dungeonState.prisonUnlocked
              ? ` · Bebaskan ${hud.dungeonState.captiveName}`
              : ''}
          </span>
          <button
            type="button"
            onClick={onExitDungeon}
            className="rounded-full bg-cyan-600/90 px-2.5 py-0.5 text-[10px] font-extrabold text-white hover:bg-cyan-500"
          >
            Keluar
          </button>
        </div>
      )}

      {hud.worldMode === 'academy' && (
        <div className="pointer-events-auto fixed left-1/2 top-2.5 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-purple-300/35 bg-slate-950/65 px-3 py-1 text-white shadow-lg backdrop-blur-sm sm:top-4">
          <span className="font-mono-nums text-[11px] font-extrabold text-purple-200">
            Istana IELTS · L{hud.ieltsScores.listening}% R{hud.ieltsScores.reading}% W
            {hud.ieltsScores.writing}% S{hud.ieltsScores.speaking}%
          </span>
          <button
            type="button"
            onClick={onExitDungeon}
            className="rounded-full bg-cyan-600/90 px-2.5 py-0.5 text-[10px] font-extrabold text-white hover:bg-cyan-500"
          >
            Keluar
          </button>
        </div>
      )}

      {/* TOP-RIGHT: GTA-Style Minimalist HP / Stats + Weapon Square + Utility/Menu Bar */}
      <div className="pointer-events-auto fixed right-2.5 top-2.5 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
        <div className="flex items-center gap-2">
          {/* Sleek GTA Health & Compact Stats Pill */}
          <div className="flex flex-col items-end rounded-xl border border-white/15 bg-slate-950/55 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-[2px]">
            <div className="flex items-center gap-1.5">
              <Heart className="h-3 w-3 fill-rose-500 text-rose-400" />
              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-900/90 ring-1 ring-white/15 sm:w-24">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-200"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <span className="font-mono-nums text-[10px] font-black text-rose-200">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2.5 font-mono-nums text-[10px] font-bold">
              <span className="text-amber-300">Lv.{String(hud.level).padStart(2, '0')}</span>
              <span className="flex items-center gap-0.5 text-cyan-300">
                <Gem className="h-3 w-3 fill-cyan-400" />
                {hud.diamonds}
              </span>
              <span className="flex items-center gap-0.5 text-amber-300">
                <Crown className="h-3 w-3 fill-amber-400" />
                {hud.crowns}/6
              </span>
            </div>
          </div>

          {/* GTA/MOBA Active Weapon & Tool Box (tap to open Tas) */}
          <button
            type="button"
            onClick={onOpenBag}
            title={
              hud.ownedWeapons.length > 0
                ? `${activeWeaponDef.name} (${activeAmmo}) — Buka Tas`
                : 'Buka Tas & Senjata'
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border-2 border-amber-300/50 bg-slate-950/65 p-1 text-white shadow-lg backdrop-blur-[2px] transition hover:border-amber-300"
          >
            <img
              src={activeItemIconSrc}
              alt="Item Aktif"
              className={`h-8 w-8 object-contain drop-shadow ${
                hud.ownedWeapons.length === 0 && hud.activeHotbarSlot < 8 ? 'opacity-45 grayscale' : ''
              }`}
              draggable={false}
            />
            {activeSlotBadgeText !== null && (
              <span className="absolute -bottom-1 right-0.5 rounded bg-slate-950/95 px-1 font-mono-nums text-[9px] font-black text-amber-300 ring-1 ring-amber-400/30">
                {activeSlotBadgeText}
              </span>
            )}
          </button>
        </div>

        {/* Top-Right Utility Row: Camera + Fullscreen + Mute + Menu Drawer */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCamera}
            title={`Ganti Kamera: ${CAMERA_SHORT_LABELS[hud.cameraMode]} (C / F5)`}
            className="flex h-8 items-center gap-1 rounded-full border border-white/20 bg-slate-950/55 px-2.5 text-[10px] font-extrabold text-cyan-200 shadow backdrop-blur-[2px] hover:bg-slate-900/80"
          >
            <Camera className="h-3.5 w-3.5 text-cyan-300" />
            <span>{CAMERA_SHORT_LABELS[hud.cameraMode]}</span>
          </button>

          <button
            type="button"
            data-fullscreen-toggle="true"
            onClick={() => void toggleAppFullscreen()}
            title={isFs ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            aria-label={isFs ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-cyan-200 shadow backdrop-blur-[2px] hover:bg-slate-900/80"
          >
            {isFs ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-amber-200 shadow backdrop-blur-[2px] hover:bg-slate-900/80"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setHotbarOpen(false);
              setMenuOpen((v) => !v);
            }}
            title="Menu (Tas, Kamus, Misi, Peta, Opsi)"
            className="relative flex h-8 items-center gap-1 rounded-full border border-amber-300/45 bg-slate-950/65 px-2.5 text-[10px] font-extrabold text-amber-200 shadow backdrop-blur-[2px] hover:bg-slate-900/85"
          >
            {menuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            <span>Menu</span>
            {activeQuestCount > 0 && !menuOpen && (
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-1 font-mono-nums text-[8px] font-black text-white">
                {activeQuestCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Menu Drawer (Tas, Kamus, Misi, Peta, Opsi, Ranking) */}
        {menuOpen && (
          <div className="mt-1 grid w-52 grid-cols-2 gap-1.5 rounded-2xl border border-white/20 bg-slate-950/85 p-2 shadow-2xl backdrop-blur-md">
            {drawerItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    item.onClick();
                  }}
                  className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left text-[11px] font-bold text-slate-100 transition hover:bg-white/15"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-rose-600 px-1.5 py-0.2 font-mono-nums text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transient Event Toast (single slim pill) */}
      {hud.bannerMessage && (
        <div
          className={`pointer-events-none fixed left-1/2 z-20 -translate-x-1/2 ${
            hud.worldMode === 'overworld' ? 'top-3' : 'top-14'
          }`}
        >
          <div className="max-w-[85vw] truncate rounded-full border border-amber-300/50 bg-slate-950/80 px-4 py-1 text-[11px] font-extrabold text-amber-100 shadow-lg backdrop-blur-sm">
            {hud.bannerMessage}
          </div>
        </div>
      )}

      {/* Center Crosshair in First-Person Mode */}
      {hud.cameraMode === 'first_person' && (
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

      {/* Targeted Cave Voxel Block Pill (only when aiming at a cave block) */}
      {hud.worldMode === 'dungeon' && hud.targetedBlock && (
        <div className="pointer-events-none fixed bottom-16 left-1/2 z-20 -translate-x-1/2 sm:bottom-20">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/75 px-3 py-1 text-[11px] font-extrabold text-slate-100 shadow-lg backdrop-blur-sm">
            <span>{hud.targetedBlock.label}</span>
            <span className="font-mono-nums text-[10px] text-amber-300">
              {hud.targetedBlock.hp}/{hud.targetedBlock.maxHp}
            </span>
          </div>
        </div>
      )}

      {/* Clean GTA-style Left Floating Joystick Zone (invisible when idle, spawns under finger) */}
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
            className="pointer-events-auto fixed bottom-12 left-0 top-28 z-10 w-[44vw] touch-none sm:bottom-16 sm:top-32 sm:w-[40vw]"
            aria-label="Area Floating Joystick GTA"
          />

          {floatingOrigin && (
            <div
              aria-hidden="true"
              style={{
                left: floatingOrigin.x,
                top: floatingOrigin.y,
                transform: 'translate(-50%, -50%)',
              }}
              className="pointer-events-none fixed z-20 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/55 bg-slate-950/40 shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur-[1px] sm:h-28 sm:w-28"
            >
              <div className="pointer-events-none absolute inset-3 rounded-full border border-white/20" />
              <div
                className="h-10 w-10 rounded-full border-2 border-[#451a03]/80 bg-gradient-to-b from-[#fef08a] to-[#f59e0b] shadow-lg sm:h-11 sm:w-11"
                style={{ transform: `translate3d(${stickKnob.x}px, ${stickKnob.y}px, 0)` }}
              />
            </div>
          )}
        </>
      )}

      {/* RIGHT-EDGE VERTICAL PILL STACK (directly above Weapon Switcher medallion) */}
      {hotbarOpen && (
        <div className="pointer-events-auto fixed bottom-[154px] right-3 z-30 flex max-h-[calc(100dvh-13.2rem)] flex-col items-end gap-1.5 overflow-y-auto overscroll-contain touch-pan-y py-1 pr-0.5 sm:bottom-[178px] sm:right-5">
          {ownedWeaponIndices.length > 0 ? (
            ownedWeaponIndices.map(({ wId, idx }) => {
              const w = WEAPONS[wId];
              const ammo = hud.weaponAmmo[wId] || 0;
              const isSelected = hud.activeHotbarSlot === idx;
              return (
                <button
                  key={wId}
                  type="button"
                  onClick={() => {
                    onSelectHotbar(idx);
                    setHotbarOpen(false);
                  }}
                  title={`${idx + 1}. ${w.name} (${ammo})`}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
                    isSelected
                      ? 'border-amber-300 bg-amber-950/90 text-amber-100 ring-1 ring-amber-300'
                      : 'border-white/25 bg-slate-950/85 text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <span>{w.name}</span>
                  <span className="rounded-full bg-white/15 px-1.5 font-mono-nums text-[10px] font-black text-amber-200">
                    {ammo}
                  </span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-slate-900/90 p-0.5"
                    style={{ boxShadow: `0 0 8px ${w.color}66` }}
                  >
                    <img
                      src="./assets/ui/icon_slingshot.png"
                      alt={w.name}
                      className="h-6 w-6 object-contain"
                      draggable={false}
                    />
                  </span>
                </button>
              );
            })
          ) : (
            <button
              type="button"
              onClick={() => setHotbarOpen(false)}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 pl-3 pr-2 text-xs font-bold text-slate-300 shadow-xl backdrop-blur-md"
            >
              <span>Senjata (Belum Ada)</span>
              <img
                src="./assets/ui/icon_slingshot.png"
                alt="Senjata"
                className="h-6 w-6 object-contain opacity-45 grayscale"
                draggable={false}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectHotbar(8);
              setHotbarOpen(false);
            }}
            title={`9. Beliung Tier ${hud.pickaxeTier}`}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
              hud.activeHotbarSlot === 8
                ? 'border-cyan-300 bg-cyan-950/90 text-cyan-100 ring-1 ring-cyan-300'
                : 'border-white/25 bg-slate-950/85 text-slate-100 hover:bg-slate-900'
            }`}
          >
            <span>Beliung</span>
            <span className="rounded-full bg-white/15 px-1.5 font-mono-nums text-[10px] font-black text-cyan-200">
              T{hud.pickaxeTier}
            </span>
            <img
              src="./assets/ui/icon_pickaxe.png"
              alt="Beliung"
              className="h-7 w-7 shrink-0 object-contain drop-shadow"
              draggable={false}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectHotbar(9);
              setHotbarOpen(false);
            }}
            title={`0. Obor (${hud.caveTorchesLeft})`}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
              hud.activeHotbarSlot === 9
                ? 'border-amber-300 bg-amber-950/90 text-amber-100 ring-1 ring-amber-300'
                : 'border-white/25 bg-slate-950/85 text-slate-100 hover:bg-slate-900'
            }`}
          >
            <span>Obor</span>
            <span className="rounded-full bg-white/15 px-1.5 font-mono-nums text-[10px] font-black text-amber-200">
              {hud.caveTorchesLeft}
            </span>
            <img
              src="./assets/ui/icon_torch.png"
              alt="Obor"
              className="h-7 w-7 shrink-0 object-contain drop-shadow"
              draggable={false}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectHotbar(10);
              setHotbarOpen(false);
            }}
            title={`B. Blok Pelindung (${hud.caveShieldBlocksLeft})`}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
              hud.activeHotbarSlot === 10
                ? 'border-cyan-300 bg-cyan-950/90 text-cyan-100 ring-1 ring-cyan-300'
                : 'border-white/25 bg-slate-950/85 text-slate-100 hover:bg-slate-900'
            }`}
          >
            <span>Blok Pelindung</span>
            <span className="rounded-full bg-white/15 px-1.5 font-mono-nums text-[10px] font-black text-cyan-200">
              {hud.caveShieldBlocksLeft}
            </span>
            <img
              src="./assets/ui/icon_shield_block.png"
              alt="Blok Pelindung"
              className="h-7 w-7 shrink-0 object-contain drop-shadow"
              draggable={false}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectHotbar(11);
              setHotbarOpen(false);
            }}
            title={`T. TNT Tambang (${hud.caveTntLeft})`}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border pl-3 pr-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
              hud.activeHotbarSlot === 11
                ? 'border-rose-300 bg-rose-950/90 text-rose-100 ring-1 ring-rose-300'
                : 'border-white/25 bg-slate-950/85 text-slate-100 hover:bg-slate-900'
            }`}
          >
            <span>TNT</span>
            <span className="rounded-full bg-white/15 px-1.5 font-mono-nums text-[10px] font-black text-rose-200">
              {hud.caveTntLeft}
            </span>
            <img
              src="./assets/ui/icon_tnt.png"
              alt="TNT"
              className="h-7 w-7 shrink-0 object-contain drop-shadow"
              draggable={false}
            />
          </button>
        </div>
      )}

      {/* CONTEXTUAL ACTION PILLS (to the left of Mobile Legends Jump button, like Recall/Regen bar) */}
      <div className="pointer-events-auto fixed bottom-[18px] right-[168px] z-20 flex items-center gap-2 sm:bottom-[22px] sm:right-[194px]">
        {nearbyOverworldNpc && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-amber-300/80 bg-slate-950/80 px-3.5 text-xs font-black text-amber-200 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{nearbyOverworldNpc.name}</span>
          </button>
        )}

        {nearbyAcademyNpc && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-purple-300/80 bg-slate-950/80 px-3.5 text-xs font-black text-purple-200 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{nearbyAcademyNpc.name}</span>
          </button>
        )}

        {nearbyDoor && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-emerald-300/80 bg-emerald-950/85 px-3.5 text-xs font-black text-emerald-100 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
          >
            <DoorOpen className="h-4 w-4" />
            <span>Buka {nearbyDoor.name}</span>
          </button>
        )}

        {hud.nearPortal && hud.worldMode === 'overworld' && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-purple-300/85 bg-purple-950/85 px-4 text-xs font-black text-white shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
          >
            <Swords className="h-4 w-4" />
            <span>Istana IELTS</span>
          </button>
        )}

        {hud.nearDungeonExit && hud.worldMode !== 'overworld' && (
          <button
            type="button"
            onClick={onExitDungeon}
            className="flex h-11 items-center gap-1.5 rounded-full border-2 border-cyan-300/80 bg-cyan-950/85 px-4 text-xs font-black text-cyan-100 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
          >
            <DoorOpen className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        )}

        {hud.worldMode === 'dungeon' &&
          hud.nearCraftingTable &&
          !nearbyDoor &&
          !hud.nearDungeonExit && (
            <button
              type="button"
              onClick={onOpenCrafting}
              className="flex h-11 items-center gap-1.5 rounded-full border-2 border-amber-300/80 bg-slate-950/85 px-3.5 text-xs font-black text-amber-200 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
            >
              <Hammer className="h-4 w-4" />
              <span>Craft</span>
            </button>
          )}

        {hud.worldMode === 'dungeon' &&
          hud.nearPrisonKey &&
          !hud.dungeonState?.prisonKeyCollected && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="flex h-11 items-center gap-1.5 rounded-full border-2 border-amber-300 bg-amber-950/90 px-3.5 text-xs font-black text-amber-200 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
            >
              <KeyRound className="h-4 w-4" />
              <span>Ambil Kunci</span>
            </button>
          )}

        {hud.worldMode === 'dungeon' &&
          hud.nearHiddenPrison &&
          hud.dungeonState &&
          !hud.dungeonState.prisonUnlocked && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className={`flex h-11 items-center gap-1.5 rounded-full border-2 px-3.5 text-xs font-black text-white shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12 ${
                hud.dungeonState.prisonKeyCollected
                  ? 'border-emerald-300 bg-emerald-900/90'
                  : 'border-rose-300 bg-rose-950/90'
              }`}
            >
              {hud.dungeonState.prisonKeyCollected ? (
                <KeyRound className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>
                {hud.dungeonState.prisonKeyCollected
                  ? `Bebaskan ${hud.dungeonState.captiveName}`
                  : 'Terkunci'}
              </span>
            </button>
          )}

        {hud.worldMode === 'dungeon' &&
          hud.nearbyDungeonGuardian &&
          !nearbyDoor &&
          !hud.nearDungeonExit &&
          !hud.nearPrisonKey &&
          !hud.nearHiddenPrison && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="flex h-11 items-center gap-1.5 rounded-full border-2 border-amber-300/80 bg-slate-950/85 px-3.5 text-xs font-black text-amber-200 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{hud.dungeonState?.guardianName || 'Penjaga'}</span>
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
              className="flex h-11 items-center gap-1.5 rounded-full border-2 border-purple-300 bg-purple-950/90 px-3.5 text-xs font-black text-purple-100 shadow-xl backdrop-blur-sm transition hover:scale-105 active:scale-95 sm:h-12"
            >
              <Sparkles className="h-4 w-4" />
              <span>Segel</span>
            </button>
          )}
      </div>

      {/* BOTTOM-RIGHT: Mobile Legends Style Radial 3-Medallion Thumb Cluster */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-20 h-[144px] w-[156px] sm:bottom-5 sm:right-5 sm:h-[168px] sm:w-[180px]">
        {/* Button 1 (Arc Top-Right): Weapon & Tool Switcher Medallion */}
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setHotbarOpen((v) => !v);
          }}
          title={hotbarOpen ? 'Tutup Deretan Senjata & Alat' : 'Pilih Senjata & Alat'}
          aria-label={hotbarOpen ? 'Tutup Deretan Senjata & Alat' : 'Pilih Senjata & Alat'}
          className={`pointer-events-auto absolute bottom-[84px] right-[10px] flex h-[56px] w-[56px] items-center justify-center rounded-full transition-transform active:scale-90 sm:bottom-[98px] sm:right-[12px] sm:h-[64px] sm:w-[64px] ${
            hotbarOpen ? 'scale-105 ring-2 ring-amber-300' : 'hover:scale-105'
          }`}
        >
          <img
            src="./assets/ui/btn_weapons.png"
            alt="Senjata & Alat"
            className="pointer-events-none h-full w-full select-none object-contain drop-shadow-[0_5px_14px_rgba(245,158,11,0.5)]"
            draggable={false}
          />
          {hotbarOpen ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-slate-950/95 text-amber-200 shadow">
              <X className="h-3 w-3" />
            </span>
          ) : (
            <span className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/70 bg-slate-950/90 p-0.5 shadow-md sm:h-7 sm:w-7">
              <img
                src={activeItemIconSrc}
                alt="Aktif"
                className="pointer-events-none h-full w-full object-contain"
                draggable={false}
              />
            </span>
          )}
        </button>

        {/* Button 2 (Arc Left): Winged-Boot Jump Medallion */}
        <button
          type="button"
          onClick={onJump}
          title="Lompat (J / Shift)"
          aria-label="Lompat"
          className="pointer-events-auto absolute bottom-[6px] right-[88px] flex h-[58px] w-[58px] items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-90 sm:bottom-[8px] sm:right-[102px] sm:h-[66px] sm:w-[66px]"
        >
          <img
            src="./assets/ui/btn_jump.png"
            alt="Lompat"
            className="pointer-events-none h-full w-full select-none object-contain drop-shadow-[0_5px_14px_rgba(16,185,129,0.5)]"
            draggable={false}
          />
        </button>

        {/* Button 3 (Primary Thumb Anchor): Large Attack / Active Tool Medallion */}
        <button
          type="button"
          onClick={onFireWeapon}
          title="Aksi / Tembak (Spasi)"
          aria-label="Tembak"
          className="pointer-events-auto absolute bottom-0 right-0 flex h-[78px] w-[78px] items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-90 sm:h-[90px] sm:w-[90px]"
        >
          <img
            src="./assets/ui/btn_attack.png"
            alt="Tembak"
            className="pointer-events-none h-full w-full select-none object-contain drop-shadow-[0_6px_18px_rgba(34,211,238,0.55)]"
            draggable={false}
          />
          {hud.activeHotbarSlot >= 8 && (
            <span className="pointer-events-none absolute flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/60 bg-slate-950/75 p-1 shadow-inner backdrop-blur-[1px] sm:h-12 sm:w-12">
              <img
                src={activeItemIconSrc}
                alt="Alat Aktif"
                className="h-full w-full object-contain drop-shadow"
                draggable={false}
              />
            </span>
          )}
          {activeSlotBadgeText !== null && (
            <span className="pointer-events-none absolute -bottom-0.5 rounded-full border border-cyan-300/60 bg-slate-950/90 px-1.5 font-mono-nums text-[10px] font-black leading-tight text-amber-300 shadow">
              {activeSlotBadgeText}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
