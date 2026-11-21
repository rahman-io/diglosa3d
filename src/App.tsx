import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { RotateCw, Smartphone } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { AimModeModal } from './components/AimModeModal';
import { BattleQuizModal } from './components/BattleQuizModal';
import { CaveCraftingModal } from './components/CaveCraftingModal';
import { CaveSealModal } from './components/CaveSealModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameOverModal } from './components/GameOverModal';
import { AcademySkillMode, IeltsAcademyModal } from './components/IeltsAcademyModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LearningModeModal } from './components/LearningModeModal';
import { NpcDialogueModal } from './components/NpcDialogueModal';
import { RpgHud } from './components/RpgHud';
import { RpgSideModals, SideModalTab } from './components/RpgSideModals';
import { StoryOverlayModal } from './components/StoryOverlayModal';
import { TitleScreen } from './components/TitleScreen';
import { auth, googleProvider } from './firebase';
import {
  fetchPublicLeaderboard,
  loadUserProgress,
  subscribeLeaderboard,
  syncRunToCloud,
} from './services/leaderboardService';
import { RpgWorldEngine } from './three/RpgWorldEngine';
import {
  getAlwaysFullscreenPref,
  getLandscapeOnlyPref,
  initDisplayPreferences,
  isFullscreenActive,
  isTouchViewport,
  lockLandscapeOrientation,
  requestAppFullscreen,
  setAlwaysFullscreenPref,
  setLandscapeOnlyPref,
} from './utils/fullscreen';
import {
  AimMode,
  BattleContext,
  CaveSealContext,
  LeaderboardRecord,
  LearningSessionContext,
  RpgHudSnapshot,
  UserProfileRecord,
} from './types/game';

const INITIAL_HUD: RpgHudSnapshot = {
  phase: 'title',
  worldMode: 'overworld',
  cameraMode: 'third_back',
  activeHotbarSlot: 0,
  level: 1,
  xp: 0,
  xpToNext: 150,
  hp: 5,
  maxHp: 5,
  diamonds: 1,
  score: 0,
  streak: 0,
  maxStreak: 0,
  dailyCount: 0,
  dailyGoal: 20,
  activeWeapon: 'ketapel',
  ownedWeapons: [],
  weaponAmmo: {
    ketapel: 0,
    kerikil: 0,
    emas: 0,
    saus: 0,
    biji: 0,
    kertas: 0,
    jarum: 0,
    kristal: 0,
  },
  starterWeaponPicked: false,
  starterWeaponGuide: null,
  radarState: null,
  ownedRelics: [],
  crowns: 0,
  ribbons: [],
  monstersDefeated: 0,
  wordsMastered: 0,
  wordsSeen: 0,
  learnedVocabIds: [],
  wordProgress: {},
  wordMastery: {},
  activeZoneId: 'desa_sapaan',
  activeZoneName: 'Hutan Kata',
  rankTitle: 'Telur Pemula',
  nearbyNpcId: null,
  nearbyMonsterId: null,
  nearbyDoorIndex: null,
  nearbyDungeonGuardian: false,
  nearPrisonKey: false,
  nearHiddenPrison: false,
  nearPortal: false,
  nearDungeonExit: false,
  portalUnlocked: true,
  dungeonState: null,
  liberatedZones: [],
  areaDoorsCleared: {
    desa_sapaan: [],
    pasar_rasa: [],
    hutan_satwa: [],
    gerbang_kota: [],
    menara_waktu: [],
    gua_portal: [],
  },
  ieltsScores: {
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
    full: 0,
  },
  quests: [],
  projectedLabels: [],
  bannerMessage: null,
  storyDialog: null,
  settings: {
    difficulty: 'petualang',
    aimMode: 'manual',
    storyLocked: false,
    qtimer: true,
    fxLevel: 'full',
    touchControls: 'auto',
    dpadMode: 'joystick',
  },
  hasSavedGame: false,
  caveTorchesLeft: 16,
  caveShieldBlocksLeft: 4,
  caveTntLeft: 1,
  pickaxeTier: 1,
  nearCraftingTable: false,
  caveBlocksMined: 0,
  targetedBlock: null,
  isAiming: false,
  hitMarkerKind: 'none',
  crosshairOnEnemy: false,
  crosshairSpread: 0,
  pointerLocked: false,
};

function DiglosaRpgApp() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RpgWorldEngine | null>(null);
  const prevPhaseRef = useRef<RpgHudSnapshot['phase']>('title');

  const [hud, setHud] = useState<RpgHudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [activeBattle, setActiveBattle] = useState<BattleContext | null>(null);
  const [activeLearning, setActiveLearning] = useState<LearningSessionContext | null>(null);
  const [activeAcademySkill, setActiveAcademySkill] = useState<AcademySkillMode | null>(null);
  const [activeCaveSeal, setActiveCaveSeal] = useState<CaveSealContext | null>(null);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [dialogueNpcId, setDialogueNpcId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideModalTab>(null);
  const [aimModePromptOpen, setAimModePromptOpen] = useState(false);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardRecord[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('voxelia_best_score') || '0') || 0;
    } catch {
      return 0;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [cloudSyncNote, setCloudSyncNote] = useState<string | null>(null);
  const [isPortraitTouch, setIsPortraitTouch] = useState(false);
  const desktopAutoFsTriedRef = useRef(false);

  // Initialize local display preferences (alwaysFullscreen=true, landscapeOnly=true)
  // and automatically engage fullscreen + landscape lock on open & first tap
  useEffect(() => {
    initDisplayPreferences();
    void requestAppFullscreen();

    const checkPortraitLock = () => {
      const portrait =
        isTouchViewport() && getLandscapeOnlyPref() && window.innerHeight > window.innerWidth;
      setIsPortraitTouch(portrait);
    };
    checkPortraitLock();

    const onOrientationChange = () => {
      checkPortraitLock();
      window.setTimeout(() => {
        checkPortraitLock();
        window.dispatchEvent(new Event('resize'));
      }, 150);
    };

    const onFirstOrTouchInteraction = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-fullscreen-toggle="true"]')) return;
      if (!getAlwaysFullscreenPref()) return;

      if (isTouchViewport()) {
        if (!isFullscreenActive()) {
          void requestAppFullscreen();
        } else if (getLandscapeOnlyPref()) {
          void lockLandscapeOrientation();
        }
      } else if (!desktopAutoFsTriedRef.current && !isFullscreenActive()) {
        desktopAutoFsTriedRef.current = true;
        void requestAppFullscreen();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isFullscreenActive() && getLandscapeOnlyPref()) {
        void lockLandscapeOrientation();
      }
    };

    window.addEventListener('resize', checkPortraitLock);
    window.addEventListener('orientationchange', onOrientationChange);
    document.addEventListener('fullscreenchange', checkPortraitLock);
    document.addEventListener('webkitfullscreenchange', checkPortraitLock);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', onFirstOrTouchInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', onFirstOrTouchInteraction, { capture: true });

    return () => {
      window.removeEventListener('resize', checkPortraitLock);
      window.removeEventListener('orientationchange', onOrientationChange);
      document.removeEventListener('fullscreenchange', checkPortraitLock);
      document.removeEventListener('webkitfullscreenchange', checkPortraitLock);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointerdown', onFirstOrTouchInteraction, { capture: true });
      window.removeEventListener('keydown', onFirstOrTouchInteraction, { capture: true });
    };
  }, []);

  // Mount 100% 3D RpgWorldEngine once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new RpgWorldEngine(el, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onStartBattle: (battle) => setActiveBattle(battle),
      onStartLearning: (session) => setActiveLearning(session),
      onOpenNpcDialogue: (npcId) => setDialogueNpcId(npcId),
      onOpenAcademyExam: (skill) => setActiveAcademySkill(skill),
      onOpenCaveSeal: (seal) => setActiveCaveSeal(seal),
      onOpenCrafting: () => setCraftingOpen(true),
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Auth & Online Leaderboard subscription
  useEffect(() => {
    let unsubLeaderboard: (() => void) | null = null;

    fetchPublicLeaderboard()
      .then((rows) => {
        setLeaderboardEntries(rows);
        setLeaderboardLoading(false);
      })
      .catch(() => setLeaderboardLoading(false));

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (unsubLeaderboard) {
        unsubLeaderboard();
        unsubLeaderboard = null;
      }
      if (nextUser) {
        try {
          const profile = await loadUserProgress(nextUser.uid);
          setUserProfile(profile);
          if (profile) {
            setBestLocalScore((prev) => (profile.bestScore > prev ? profile.bestScore : prev));
          }
        } catch {
          // first time player
        }
        unsubLeaderboard = subscribeLeaderboard((rows) => {
          setLeaderboardEntries(rows);
          setLeaderboardLoading(false);
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubLeaderboard) unsubLeaderboard();
    };
  }, []);

  // Keyboard Pause & Map shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Escape') {
        if (aimModePromptOpen) {
          setAimModePromptOpen(false);
          return;
        }
        if (leaderboardOpen) {
          setLeaderboardOpen(false);
          return;
        }
        if (sideTab) {
          setSideTab(null);
          return;
        }
        if (activeLearning) {
          setActiveLearning(null);
          engineRef.current?.setPhase('playing');
          return;
        }
        if (activeCaveSeal) {
          setActiveCaveSeal(null);
          engineRef.current?.setPhase('playing');
          return;
        }
        if (craftingOpen) {
          setCraftingOpen(false);
          engineRef.current?.setPhase('playing');
          return;
        }
        if (activeAcademySkill) {
          setActiveAcademySkill(null);
          engineRef.current?.setPhase('playing');
          return;
        }
        if (dialogueNpcId) {
          setDialogueNpcId(null);
          engineRef.current?.setPhase('playing');
          return;
        }
        const eng = engineRef.current;
        if (!eng) return;
        if (hud.phase === 'playing') eng.setPhase('paused');
        else if (hud.phase === 'paused') eng.setPhase('playing');
      } else if (
        (e.code === 'KeyM' || e.code === 'KeyH') &&
        hud.phase === 'playing' &&
        !activeBattle &&
        !activeLearning &&
        !activeCaveSeal &&
        !craftingOpen &&
        !activeAcademySkill &&
        !dialogueNpcId
      ) {
        const target = e.code === 'KeyM' ? 'map' : 'guide';
        setSideTab((prev) => (prev === target ? null : target));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    aimModePromptOpen,
    hud.phase,
    leaderboardOpen,
    sideTab,
    dialogueNpcId,
    activeBattle,
    activeLearning,
    activeCaveSeal,
    craftingOpen,
    activeAcademySkill,
  ]);

  // Save best score & sync on Game Over
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = hud.phase;

    if (hud.score > bestLocalScore) {
      setBestLocalScore(hud.score);
      try {
        localStorage.setItem('voxelia_best_score', String(hud.score));
      } catch {
        // ignore
      }
    }

    if (prev !== 'gameover' && hud.phase === 'gameover') {
      setActiveBattle(null);
      const questsDone = hud.quests.filter((q) => q.claimed).length;
      if (auth.currentUser && auth.currentUser.emailVerified) {
        setSyncing(true);
        syncRunToCloud({
          score: hud.score,
          cityLevel: hud.level,
          landmarksCount: hud.wordsMastered,
          maxCombo: hud.maxStreak,
          questsCompleted: questsDone,
          districtTitle: hud.rankTitle,
        })
          .then(({ newPersonalBest }) => {
            setCloudSyncNote(
              newPersonalBest
                ? 'Rekor baru berhasil diunggah ke Papan Peringkat Daring!'
                : 'Progres petualangan tersinkronisasi ke Cloud.',
            );
            return loadUserProgress(auth.currentUser!.uid);
          })
          .then((profile) => {
            if (profile) setUserProfile(profile);
          })
          .catch(() => {
            setCloudSyncNote('Gagal mengunggah otomatis. Buka Papan Peringkat untuk coba lagi.');
          })
          .finally(() => setSyncing(false));
      } else {
        setCloudSyncNote(
          'Masuk dengan Google di Papan Peringkat untuk menyimpan skor ke ranking global.',
        );
      }
    }
  }, [
    hud.phase,
    hud.score,
    hud.level,
    hud.wordsMastered,
    hud.maxStreak,
    hud.rankTitle,
    hud.quests,
    bestLocalScore,
  ]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (getAlwaysFullscreenPref()) void requestAppFullscreen();
    setActiveBattle(null);
    setActiveLearning(null);
    setActiveAcademySkill(null);
    setActiveCaveSeal(null);
    setCraftingOpen(false);
    setDialogueNpcId(null);
    setSideTab(null);
    setCloudSyncNote(null);
    engineRef.current?.continueGame();
  }, []);

  const handleStartNew = useCallback(() => {
    if (getAlwaysFullscreenPref()) void requestAppFullscreen();
    setAimModePromptOpen(true);
  }, []);

  const handleConfirmNewAdventure = useCallback((mode: AimMode) => {
    if (getAlwaysFullscreenPref()) void requestAppFullscreen();
    setAimModePromptOpen(false);
    setActiveBattle(null);
    setActiveLearning(null);
    setActiveAcademySkill(null);
    setActiveCaveSeal(null);
    setCraftingOpen(false);
    setDialogueNpcId(null);
    setSideTab(null);
    setCloudSyncNote(null);
    setSyncStatus(null);
    engineRef.current?.startNewGame(mode);
  }, []);

  const handleSignIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setSyncStatus(null);
  }, []);

  const handleManualSync = useCallback(async () => {
    if (!auth.currentUser) return;
    setSyncing(true);
    setSyncStatus(null);
    try {
      const questsDone = hud.quests.filter((q) => q.claimed).length;
      const { newPersonalBest } = await syncRunToCloud({
        score: hud.score,
        cityLevel: hud.level,
        landmarksCount: hud.wordsMastered,
        maxCombo: hud.maxStreak,
        questsCompleted: questsDone,
        districtTitle: hud.rankTitle,
      });
      setSyncStatus(
        newPersonalBest ? 'Rekor baru tersimpan di Papan Peringkat!' : 'Skor berhasil diperbarui.',
      );
      const profile = await loadUserProgress(auth.currentUser.uid);
      if (profile) setUserProfile(profile);
    } finally {
      setSyncing(false);
    }
  }, [hud]);

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden">
      {/* Isolated 100% 3D World Viewport */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          hasSavedGame={hud.hasSavedGame}
          onContinue={handleContinue}
          onStartNew={handleStartNew}
          onQuickLearn={(mode) => {
            if (getAlwaysFullscreenPref()) void requestAppFullscreen();
            engineRef.current?.startQuickLearning(mode);
          }}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenGuide={() => setSideTab('guide')}
          bestLocalScore={bestLocalScore}
          user={user}
          muted={muted}
          onToggleMute={handleToggleMute}
          disableShortcuts={aimModePromptOpen || leaderboardOpen || Boolean(sideTab)}
        />
      )}

      {(hud.phase === 'playing' ||
        hud.phase === 'story' ||
        hud.phase === 'battle' ||
        hud.phase === 'learning' ||
        hud.phase === 'dialogue' ||
        hud.phase === 'academy' ||
        hud.phase === 'paused' ||
        hud.phase === 'gameover') && (
        <RpgHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onToggleCamera={() => engineRef.current?.toggleCameraMode()}
          onSelectHotbar={(slot) => engineRef.current?.selectHotbarSlot(slot)}
          onPause={() =>
            engineRef.current?.setPhase(hud.phase === 'paused' ? 'playing' : 'paused')
          }
          onOpenBag={() => setSideTab('bag')}
          onOpenKamus={() => setSideTab('kamus')}
          onOpenQuests={() => setSideTab('quests')}
          onOpenMap={() => setSideTab('map')}
          onOpenGuide={() => setSideTab('guide')}
          onOpenOptions={() => setSideTab('options')}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onPrimaryAction={() => engineRef.current?.triggerPrimaryAction()}
          onFireWeapon={() => engineRef.current?.fireActiveWeapon(false)}
          onSetFireHeld={(held) => engineRef.current?.setFireHeld(held)}
          onToggleAim={() => engineRef.current?.toggleAimMode()}
          onTogglePointerLock={() => engineRef.current?.togglePointerLock()}
          onJump={() => engineRef.current?.jumpHero()}
          onOpenCrafting={() => engineRef.current?.openCraftingTable()}
          onVirtualMove={(vx, vz) => engineRef.current?.setVirtualMove(vx, vz)}
          onExitDungeon={() => engineRef.current?.exitDungeon()}
        />
      )}

      <StoryOverlayModal
        story={hud.phase === 'story' ? hud.storyDialog : null}
        onAdvance={() => engineRef.current?.advanceStory()}
        onSkip={() => engineRef.current?.skipStory()}
        onDefeatChoice={(returnToZone) => engineRef.current?.resolveDefeatExitChoice(returnToZone)}
      />

      <LearningModeModal
        session={activeLearning}
        difficulty={hud.settings.difficulty}
        qtimerEnabled={hud.settings.qtimer}
        onRecordWord={(vocabId, ok, noLevel) =>
          engineRef.current?.recordWordAttempt(vocabId, ok, noLevel)
        }
        onComplete={(ctx, pct, xpEarned, cekPassed) => {
          setActiveLearning(null);
          engineRef.current?.completeLearningSession(ctx, pct, xpEarned, cekPassed);
        }}
        onClose={() => {
          setActiveLearning(null);
          engineRef.current?.setPhase(hud.phase === 'title' ? 'title' : 'playing');
        }}
      />

      <IeltsAcademyModal
        skill={activeAcademySkill}
        onCompleteSkill={(skill, pct) => engineRef.current?.recordIeltsScore(skill, pct)}
        onClose={() => {
          setActiveAcademySkill(null);
          engineRef.current?.setPhase('playing');
        }}
      />

      <CaveSealModal
        seal={activeCaveSeal}
        onResolve={(blockId, correct, vocabId) => {
          setActiveCaveSeal(null);
          engineRef.current?.resolveWordSeal(blockId, correct, vocabId);
        }}
        onClose={() => {
          setActiveCaveSeal(null);
          engineRef.current?.setPhase('playing');
        }}
      />

      <CaveCraftingModal
        open={craftingOpen}
        hud={hud}
        onCraft={(recipe) => engineRef.current?.craftCaveItem(recipe)}
        onClose={() => {
          setCraftingOpen(false);
          engineRef.current?.setPhase('playing');
        }}
      />

      <BattleQuizModal
        battle={activeBattle}
        playerHp={hud.hp}
        playerMaxHp={hud.maxHp}
        activeWeapon={hud.activeWeapon}
        hasWeapon={hud.ownedWeapons.length > 0}
        difficulty={hud.settings.difficulty}
        ownedRelics={hud.ownedRelics}
        wordProgress={hud.wordProgress}
        onUseHealHeart={() => engineRef.current?.healOneHeart()}
        onAnswerResult={(correct, vocabId, opts) =>
          engineRef.current?.applyBattleAnswer(correct, vocabId, opts)
        }
        onBattleEnd={(outcome, battle) => {
          setActiveBattle(null);
          engineRef.current?.finishBattle(outcome, battle);
        }}
      />

      <NpcDialogueModal
        npcId={dialogueNpcId}
        quests={hud.quests}
        wordProgress={hud.wordProgress}
        liberatedZones={hud.liberatedZones}
        areaDoorsCleared={hud.areaDoorsCleared}
        onClose={() => {
          setDialogueNpcId(null);
          engineRef.current?.setPhase('playing');
        }}
        onAcceptOrClaimQuest={(npcId) => engineRef.current?.acceptQuest(npcId)}
        onLearnVocab={(ids) => engineRef.current?.learnVocabFromNpc(ids)}
        onEnterDungeon={(zoneId, isMixedChallenge) => {
          setDialogueNpcId(null);
          engineRef.current?.enterZoneDungeon(zoneId, isMixedChallenge);
        }}
      />

      <RpgSideModals
        tab={sideTab}
        hud={hud}
        onClose={() => setSideTab(null)}
        onOpenGuide={() => setSideTab('guide')}
        onEquipWeapon={(id) => engineRef.current?.equipWeapon(id)}
        onBuyAmmo={() => engineRef.current?.buyAmmoWithDiamonds()}
        onStartAmmoQuiz={() => engineRef.current?.startAmmoQuiz()}
        onStartQuickLearn={(mode, catId, zoneId) =>
          engineRef.current?.startQuickLearning(mode, catId, zoneId)
        }
        onTeleportZone={(zoneId) => engineRef.current?.teleportToZone(zoneId)}
        onEnterDungeon={(zoneId) => engineRef.current?.enterZoneDungeon(zoneId, false)}
        onEnterIelts={() => engineRef.current?.startIeltsTrial()}
        onUpdateSettings={(partial) => engineRef.current?.updateSettings(partial)}
      />

      <GameOverModal
        hud={hud}
        onResume={() => engineRef.current?.setPhase('playing')}
        onRestart={handleStartNew}
        onQuitToTitle={() => window.location.reload()}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        cloudSyncNote={cloudSyncNote}
      />

      <AimModeModal
        open={aimModePromptOpen}
        initialMode={hud.settings.aimMode}
        onConfirm={handleConfirmNewAdventure}
        onCancel={() => setAimModePromptOpen(false)}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        user={user}
        userProfile={userProfile}
        currentRunScore={hud.score}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onManualSync={handleManualSync}
        syncing={syncing}
        syncStatus={syncStatus}
      />

      {isPortraitTouch && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a]/95 p-6 text-center text-white backdrop-blur-md">
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-amber-300/60 bg-amber-500/15 text-amber-300 shadow-xl">
            <Smartphone className="h-10 w-10 rotate-90" />
            <RotateCw className="absolute -right-2 -top-2 h-6 w-6 animate-spin rounded-full bg-slate-900 p-1 text-cyan-300 [animation-duration:3s]" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-amber-200">
            Wajib Posisi Landscape
          </h2>
          <p className="mt-2 max-w-xs text-xs font-medium leading-relaxed text-slate-300">
            Putar HP ke posisi mendatar (landscape), atau ketuk tombol di bawah untuk mengunci
            layar penuh otomatis dalam mode landscape.
          </p>
          <button
            type="button"
            onClick={() => {
              setAlwaysFullscreenPref(true);
              setLandscapeOnlyPref(true);
              void requestAppFullscreen(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] px-6 py-3 text-sm font-black text-white shadow-[0_4px_0_#14532d] transition active:translate-y-0.5"
          >
            <RotateCw className="h-4 w-4" />
            <span>Aktifkan Landscape &amp; Layar Penuh</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DiglosaRpgApp />
    </ErrorBoundary>
  );
}
