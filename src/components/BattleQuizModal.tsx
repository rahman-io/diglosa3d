import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Footprints,
  Heart,
  Lock,
  Shield,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  BOSSES,
  DIFF_CONFIG,
  generateMiniIeltsQuestion,
  generateQuestionForZone,
  RELICS,
} from '../data/diglosaCatalog';
import {
  BattleContext,
  DifficultyMode,
  QuizQuestion,
  RelicId,
  WordProgress,
} from '../types/game';

interface BattleQuizModalProps {
  battle: BattleContext | null;
  playerHp: number;
  playerMaxHp: number;
  difficulty: DifficultyMode;
  ownedRelics: RelicId[];
  wordProgress: Record<string, WordProgress>;
  onUseHealHeart: () => void;
  onAnswerResult: (
    correct: boolean,
    vocabId: string,
    options?: {
      shieldBlocked?: boolean;
      duelHitStreak?: number;
      duelAmmoGained?: number;
      isAcademyMini?: boolean;
    },
  ) => { ammoAwarded: number } | undefined;
  onBattleEnd: (outcome: 'victory' | 'defeat' | 'fled', battle: BattleContext) => void;
}

export const BattleQuizModal: React.FC<BattleQuizModalProps> = ({
  battle,
  playerHp,
  playerMaxHp,
  difficulty,
  ownedRelics,
  wordProgress,
  onUseHealHeart,
  onAnswerResult,
  onBattleEnd,
}) => {
  const diffCfg = DIFF_CONFIG[difficulty];
  const hasPedang = ownedRelics.includes('pedang');
  const hasPerisai = ownedRelics.includes('perisai');
  const hasPeluit = ownedRelics.includes('peluit');
  const hasSepatu = ownedRelics.includes('sepatu');
  const hasJam = ownedRelics.includes('jam');
  const hasKompas = ownedRelics.includes('kompas');

  const [monsterHp, setMonsterHp] = useState(3);
  const [monsterMaxHp, setMonsterMaxHp] = useState(3);
  const [bossPhase, setBossPhase] = useState(1);
  const [turnPhase, setTurnPhase] = useState<'grab' | 'answer' | 'feedback'>('grab');
  const [grabTimer, setGrabTimer] = useState(diffCfg.grabSec);
  const [grabWindowMax, setGrabWindowMax] = useState(diffCfg.grabSec);
  const [answerTimer, setAnswerTimer] = useState(diffCfg.duelAnswerSec);

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [prevQuestion, setPrevQuestion] = useState<QuizQuestion | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackGood, setFeedbackGood] = useState(true);
  const [localPlayerHp, setLocalPlayerHp] = useState(playerHp);

  // Per-duel relic & mechanic states
  const [shieldUsed, setShieldUsed] = useState(false);
  const [peluitUsed, setPeluitUsed] = useState(false);
  const [jamUsed, setJamUsed] = useState(false);
  const [turnFrozen, setTurnFrozen] = useState(false);
  const [eliminatedChoices, setEliminatedChoices] = useState<number[]>([]);
  const [slimedChoiceIdx, setSlimedChoiceIdx] = useState<number | null>(null);
  const [lockedChoiceIdx, setLockedChoiceIdx] = useState<number | null>(null);
  const [growHealsInPhase, setGrowHealsInPhase] = useState(0);
  const [duelHitStreak, setDuelHitStreak] = useState(0);
  const [duelAmmoGained, setDuelAmmoGained] = useState(0);
  const [bossTaunt, setBossTaunt] = useState<string | null>(null);

  const timeoutRef = useRef<number | null>(null);
  const grabTimerRef = useRef(diffCfg.grabSec);
  const answerTimerRef = useRef(diffCfg.duelAnswerSec);

  const clearPendingTimeout = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const pickNextQuestion = useCallback(
    (
      b: BattleContext,
      nextPhase: number,
      nextTurnCount: number,
      lastQ: QuizQuestion | null,
      isFrozen: boolean,
    ): QuizQuestion => {
      const mechanic = b.isZoneBoss ? BOSSES[b.zoneId].mechanic : 'none';
      if (
        b.isZoneBoss &&
        mechanic === 'rewind' &&
        nextPhase >= 2 &&
        nextTurnCount > 0 &&
        nextTurnCount % 2 === 0 &&
        lastQ &&
        !isFrozen
      ) {
        return {
          ...lastQ,
          id: `${lastQ.id}_rewind_${nextTurnCount}`,
          category: `⏳ Rewind Bos! (${lastQ.category})`,
        };
      }
      if (b.isAcademyShadow) {
        return generateMiniIeltsQuestion(b.academySkill, wordProgress, hasKompas);
      }
      return generateQuestionForZone(
        b.zoneId,
        b.isIeltsBoss,
        b.isMixedChallenge,
        b.wordIds,
        wordProgress,
        hasKompas,
      );
    },
    [wordProgress, hasKompas],
  );

  const setupTurnModifiers = useCallback(
    (b: BattleContext, q: QuizQuestion, phaseNum: number, tCount: number) => {
      const mechanic = b.isZoneBoss ? BOSSES[b.zoneId].mechanic : 'none';

      // Base grab time + Sepatu Angin (+1s) - Close boss mechanic (-1s unless Sepatu counters)
      let gSec = diffCfg.grabSec + (hasSepatu ? 1 : 0);
      if (b.isZoneBoss && mechanic === 'close' && phaseNum >= 2 && !hasSepatu) {
        gSec = Math.max(1.8, gSec - 1);
      }
      grabTimerRef.current = gSec;
      answerTimerRef.current = diffCfg.duelAnswerSec;
      setGrabWindowMax(gSec);
      setGrabTimer(gSec);
      setAnswerTimer(diffCfg.duelAnswerSec);

      const wrongIndices = [0, 1, 2, 3].filter((i) => i !== q.correctIndex);

      // Slime mechanic: Phase 2-3 has 55% chance to obscure 1 wrong option
      if (b.isZoneBoss && mechanic === 'slime' && phaseNum >= 2 && Math.random() < 0.55) {
        setSlimedChoiceIdx(wrongIndices[Math.floor(Math.random() * wrongIndices.length)]);
      } else {
        setSlimedChoiceIdx(null);
      }

      // Close mechanic: Phase 2-3 locks 1 wrong option every 2nd turn
      if (b.isZoneBoss && mechanic === 'close' && phaseNum >= 2 && tCount % 2 === 1) {
        setLockedChoiceIdx(wrongIndices[Math.floor(Math.random() * wrongIndices.length)]);
      } else {
        setLockedChoiceIdx(null);
      }

      setEliminatedChoices([]);
      setSelectedIdx(null);
      setFeedbackMsg(null);
      setTurnFrozen(false);
    },
    [diffCfg.grabSec, diffCfg.duelAnswerSec, hasSepatu],
  );

  // Initialize battle when battle changes
  useEffect(() => {
    clearPendingTimeout();
    if (!battle) return;

    const bossDef = battle.isZoneBoss ? BOSSES[battle.zoneId] : null;
    const startMaxHp = bossDef ? bossDef.hpPerPhase : battle.monsterMaxHp;
    const startHp = bossDef ? bossDef.hpPerPhase : battle.monsterHp;

    setMonsterHp(startHp);
    setMonsterMaxHp(startMaxHp);
    setBossPhase(battle.bossPhase || 1);
    setLocalPlayerHp(playerHp);
    setTurnPhase('grab');
    setTurnCount(0);
    setShieldUsed(false);
    setPeluitUsed(false);
    setJamUsed(false);
    setGrowHealsInPhase(0);
    setDuelHitStreak(0);
    setDuelAmmoGained(0);
    setBossTaunt(bossDef ? bossDef.taunts[0] : null);

    const firstQ = pickNextQuestion(battle, 1, 0, null, false);
    setQuestion(firstQ);
    setPrevQuestion(null);
    setupTurnModifiers(battle, firstQ, 1, 0);

    return () => clearPendingTimeout();
  }, [battle]);

  const scheduleNextTurn = useCallback(
    (
      b: BattleContext,
      nextPhase: number,
      nextTurnCount: number,
      currentQ: QuizQuestion | null,
      delayMs: number,
    ) => {
      clearPendingTimeout();
      timeoutRef.current = window.setTimeout(() => {
        const nextQ = pickNextQuestion(b, nextPhase, nextTurnCount, currentQ, false);
        setPrevQuestion(currentQ);
        setQuestion(nextQ);
        setTurnCount(nextTurnCount);
        setTurnPhase('grab');
        setupTurnModifiers(b, nextQ, nextPhase, nextTurnCount);
      }, delayMs);
    },
    [pickNextQuestion, setupTurnModifiers],
  );

  const handleMonsterAttack = useCallback(
    (b: BattleContext, q: QuizQuestion | null, reasonMsg: string) => {
      if (hasPerisai && !shieldUsed) {
        setShieldUsed(true);
        if (q) {
          onAnswerResult(false, q.vocabId, {
            shieldBlocked: true,
            isAcademyMini: b.isAcademyShadow,
          });
        }
        setTurnPhase('feedback');
        setFeedbackGood(true);
        setFeedbackMsg(`🛡️ Perisai Panci menangkis serangan! (${reasonMsg}) Nyawamu aman!`);
        soundEngine.playPick();
        scheduleNextTurn(b, bossPhase, turnCount + 1, q, 1300);
        return;
      }

      if (q) {
        onAnswerResult(false, q.vocabId, {
          shieldBlocked: false,
          isAcademyMini: b.isAcademyShadow,
        });
      }
      setDuelHitStreak(0);
      const nextHp = Math.max(0, localPlayerHp - 1);
      setLocalPlayerHp(nextHp);
      setTurnPhase('feedback');
      setFeedbackGood(false);
      setFeedbackMsg(`${reasonMsg} (-1 ❤️)`);

      clearPendingTimeout();
      timeoutRef.current = window.setTimeout(() => {
        if (nextHp <= 0) {
          onBattleEnd('defeat', b);
        } else {
          const nextQ = pickNextQuestion(b, bossPhase, turnCount + 1, q, false);
          setPrevQuestion(q);
          setQuestion(nextQ);
          setTurnCount(turnCount + 1);
          setTurnPhase('grab');
          setupTurnModifiers(b, nextQ, bossPhase, turnCount + 1);
        }
      }, 1350);
    },
    [
      hasPerisai,
      shieldUsed,
      onAnswerResult,
      localPlayerHp,
      onBattleEnd,
      bossPhase,
      turnCount,
      pickNextQuestion,
      setupTurnModifiers,
      scheduleNextTurn,
    ],
  );

  // Reflex AMBIL! timer during grab phase
  useEffect(() => {
    if (!battle || turnPhase !== 'grab' || turnFrozen) return;
    let lastMs = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastMs) / 1000;
      lastMs = now;
      const next = Math.max(0, grabTimerRef.current - dt);
      grabTimerRef.current = next;
      setGrabTimer(next);
      if (next <= 0) {
        window.clearInterval(interval);
        // Monster steals turn! Uses monsterGuessAcc from difficulty
        const monsterHits = Math.random() < diffCfg.monsterGuessAcc;
        if (monsterHits) {
          handleMonsterAttack(
            battle,
            question,
            `Terlambat! ${battle.monsterName} merebut giliran & tepat menyerangmu!`,
          );
        } else {
          setTurnPhase('feedback');
          setFeedbackGood(true);
          setFeedbackMsg(
            `${battle.monsterName} merebut giliran, tapi tebakannya meleset! Giliran baru siap!`,
          );
          soundEngine.playFlip();
          scheduleNextTurn(battle, bossPhase, turnCount + 1, question, 1150);
        }
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [
    battle,
    turnPhase,
    turnFrozen,
    diffCfg.monsterGuessAcc,
    handleMonsterAttack,
    question,
    scheduleNextTurn,
    bossPhase,
    turnCount,
  ]);

  // Pendekar mode 12s duel answer timer
  useEffect(() => {
    if (!battle || turnPhase !== 'answer' || diffCfg.duelAnswerSec <= 0 || turnFrozen) return;
    let lastMs = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastMs) / 1000;
      lastMs = now;
      const next = Math.max(0, answerTimerRef.current - dt);
      answerTimerRef.current = next;
      setAnswerTimer(next);
      if (next <= 0) {
        window.clearInterval(interval);
        handleMonsterAttack(
          battle,
          question,
          'Waktu jawab mode Pendekar (12 dtk) habis!',
        );
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [battle, turnPhase, diffCfg.duelAnswerSec, turnFrozen, handleMonsterAttack, question]);

  const handleGrab = useCallback(() => {
    if (!battle || turnPhase !== 'grab') return;
    setTurnPhase('answer');
    soundEngine.playDash();
    if (question) {
      soundEngine.speakEnglish(question.audioWord);
    }
  }, [battle, turnPhase, question]);

  const handleUsePeluit = () => {
    if (!question || peluitUsed || turnPhase !== 'answer') return;
    const candidates = [0, 1, 2, 3].filter(
      (i) => i !== question.correctIndex && !eliminatedChoices.includes(i) && i !== lockedChoiceIdx,
    );
    if (candidates.length === 0) return;
    const victim = candidates[Math.floor(Math.random() * candidates.length)];
    setEliminatedChoices((prev) => [...prev, victim]);
    setPeluitUsed(true);
    soundEngine.playPick();
  };

  const handleUseJam = () => {
    if (jamUsed || turnPhase === 'feedback') return;
    setJamUsed(true);
    setTurnFrozen(true);
    soundEngine.playPick();
  };

  const handlePickChoice = useCallback(
    (idx: number) => {
      if (!battle || !question || turnPhase !== 'answer') return;
      if (eliminatedChoices.includes(idx) || lockedChoiceIdx === idx) return;

      setSelectedIdx(idx);
      const isCorrect = idx === question.correctIndex;
      setTurnPhase('feedback');

      if (isCorrect) {
        const nextStreak = duelHitStreak + 1;
        setDuelHitStreak(nextStreak);

        const res = onAnswerResult(true, question.vocabId, {
          duelHitStreak: nextStreak,
          duelAmmoGained,
          isAcademyMini: battle.isAcademyShadow,
        });
        if (res && res.ammoAwarded > 0) {
          setDuelAmmoGained((g) => g + res.ammoAwarded);
        }

        // Pedang Kata: +1 dmg (2 dmg) in normal duel; in Boss fight every 4 hit streak heals +1 ❤️
        const dmg = !battle.isZoneBoss && hasPedang ? 2 : 1;
        let healNote = '';
        if (battle.isZoneBoss && hasPedang && nextStreak % 4 === 0 && localPlayerHp < playerMaxHp) {
          setLocalPlayerHp((hp) => Math.min(playerMaxHp, hp + 1));
          onUseHealHeart();
          healNote = ' · 🗡️ Pedang Kata pulihkan +1 ❤️!';
        }

        const nextMonsterHp = Math.max(0, monsterHp - dmg);
        setMonsterHp(nextMonsterHp);
        setFeedbackGood(true);
        const ammoNote = res && res.ammoAwarded > 0 ? ` · +${res.ammoAwarded} Peluru` : '';
        setFeedbackMsg(
          `Tepat! "${question.choices[question.correctIndex]}" → ${dmg} Damage!${ammoNote}${healNote}`,
        );

        clearPendingTimeout();
        timeoutRef.current = window.setTimeout(() => {
          if (nextMonsterHp <= 0) {
            // Check 3-Phase Zone Boss transition
            const bossDef = battle.isZoneBoss ? BOSSES[battle.zoneId] : null;
            if (bossDef && bossPhase < bossDef.phases) {
              const nextPhase = bossPhase + 1;
              setBossPhase(nextPhase);
              setMonsterHp(bossDef.hpPerPhase);
              setMonsterMaxHp(bossDef.hpPerPhase);
              setGrowHealsInPhase(0);
              setBossTaunt(bossDef.taunts[nextPhase - 1] || null);
              soundEngine.playBoss();
              const nextQ = pickNextQuestion(battle, nextPhase, turnCount + 1, question, turnFrozen);
              setPrevQuestion(question);
              setQuestion(nextQ);
              setTurnCount(turnCount + 1);
              setTurnPhase('grab');
              setupTurnModifiers(battle, nextQ, nextPhase, turnCount + 1);
            } else {
              onBattleEnd('victory', { ...battle, monsterHp: 0 });
            }
          } else {
            const nextQ = pickNextQuestion(battle, bossPhase, turnCount + 1, question, turnFrozen);
            setPrevQuestion(question);
            setQuestion(nextQ);
            setTurnCount(turnCount + 1);
            setTurnPhase('grab');
            setupTurnModifiers(battle, nextQ, bossPhase, turnCount + 1);
          }
        }, 1050);
      } else {
        // Boss Grow mechanic: Phase 2-3 heals boss +1 HP up to 2x per phase
        const bossDef = battle.isZoneBoss ? BOSSES[battle.zoneId] : null;
        let growNote = '';
        if (bossDef && bossDef.mechanic === 'grow' && bossPhase >= 2 && growHealsInPhase < 2) {
          setMonsterHp((hp) => Math.min(monsterMaxHp, hp + 1));
          setGrowHealsInPhase((c) => c + 1);
          growNote = ' (🌿 Akar Bos tumbuh +1 HP!)';
        }
        handleMonsterAttack(
          battle,
          question,
          `Salah! Jawaban benar: "${question.choices[question.correctIndex]}".${growNote}`,
        );
      }
    },
    [
      battle,
      question,
      turnPhase,
      eliminatedChoices,
      lockedChoiceIdx,
      duelHitStreak,
      onAnswerResult,
      duelAmmoGained,
      hasPedang,
      localPlayerHp,
      playerMaxHp,
      onUseHealHeart,
      monsterHp,
      bossPhase,
      turnCount,
      turnFrozen,
      pickNextQuestion,
      setupTurnModifiers,
      onBattleEnd,
      growHealsInPhase,
      monsterMaxHp,
      handleMonsterAttack,
    ],
  );

  // Keyboard shortcuts: Space to AMBIL, 1-4 to pick choice
  useEffect(() => {
    if (!battle) return;
    const onKey = (e: KeyboardEvent) => {
      if (turnPhase === 'grab' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleGrab();
      } else if (turnPhase === 'answer') {
        if (e.key === '1') handlePickChoice(0);
        else if (e.key === '2') handlePickChoice(1);
        else if (e.key === '3') handlePickChoice(2);
        else if (e.key === '4') handlePickChoice(3);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [battle, turnPhase, handleGrab, handlePickChoice]);

  if (!battle || !question) return null;

  const grabPct = Math.max(0, Math.min(100, (grabTimer / Math.max(0.5, grabWindowMax)) * 100));
  const bossDef = battle.isZoneBoss ? BOSSES[battle.zoneId] : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/75 p-3 sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-4 border-[#78350f] bg-[#fff7e6] text-[#3b2008] shadow-2xl">
        {/* Top VS Header */}
        <div className="flex items-center justify-between border-b-2 border-[#d6b67c] bg-[#f5e3be] px-5 py-3">
          <div>
            <div className="text-sm font-extrabold">Hoot (Pengelana)</div>
            <div className="mt-1 flex items-center gap-1">
              {Array.from({ length: playerMaxHp }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${
                    i < localPlayerHp ? 'fill-rose-500 text-rose-600' : 'fill-slate-300 text-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="rounded-xl bg-[#b91c1c] px-3 py-1 font-mono-nums text-sm font-black tracking-wider text-white shadow">
              VS
            </div>
            {bossDef && (
              <div className="mt-1 font-mono-nums text-[10px] font-black text-purple-900">
                FASE {bossPhase}/{bossDef.phases}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm font-extrabold">{battle.monsterName}</div>
            <div className="mt-1 flex items-center justify-end gap-0.5">
              {Array.from({ length: monsterMaxHp }).map((_, i) => (
                <Shield
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < monsterHp ? 'fill-purple-600 text-purple-800' : 'fill-slate-300 text-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Boss Mechanic & Taunt Banner */}
        {bossDef && (
          <div className="border-b border-[#d6b67c] bg-purple-950 px-5 py-1.5 text-center text-[11px] font-bold text-amber-200">
            {bossTaunt || bossDef.mechanicDesc}
          </div>
        )}

        {/* Visual Arena Strip + Active Relic Buttons */}
        <div className="relative mx-5 mt-3.5 flex h-24 items-center justify-between overflow-hidden rounded-2xl border-2 border-[#b45309]/50 bg-gradient-to-b from-[#fde68a] via-[#fef3c7] to-[#84cc16] px-6">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0f172a] bg-emerald-500 text-xl font-black text-white shadow-md">
              🦉
            </div>
            <span className="mt-1 rounded bg-[#0f172a]/85 px-2 py-0.5 text-[10px] font-bold text-white">
              {question.category}
            </span>
          </div>

          {/* Relic Toolbar inside Duel */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {hasPerisai && (
              <span
                title={RELICS.perisai.desc}
                className={`rounded-full border px-2 py-1 text-[10px] font-black ${
                  shieldUsed
                    ? 'border-slate-400 bg-slate-200 text-slate-500 line-through'
                    : 'border-sky-700 bg-sky-100 text-sky-900'
                }`}
              >
                🛡️ {shieldUsed ? 'Terpakai' : 'Perisai Siap'}
              </span>
            )}
            {hasPeluit && turnPhase === 'answer' && !peluitUsed && (
              <button
                type="button"
                onClick={handleUsePeluit}
                className="inline-flex items-center gap-1 rounded-full border-2 border-[#0f172a] bg-emerald-400 px-2.5 py-1 text-[11px] font-black text-slate-950 shadow hover:bg-emerald-300"
              >
                <span>🎵 Peluit (-1 Opsi)</span>
              </button>
            )}
            {hasJam && turnPhase !== 'feedback' && !jamUsed && (
              <button
                type="button"
                onClick={handleUseJam}
                className="inline-flex items-center gap-1 rounded-full border-2 border-[#0f172a] bg-amber-300 px-2.5 py-1 text-[11px] font-black text-slate-950 shadow hover:bg-amber-200"
              >
                <span>⏳ Bekukan Giliran</span>
              </button>
            )}
            {turnFrozen && (
              <span className="rounded-full bg-cyan-600 px-2.5 py-1 text-[10px] font-black text-white">
                ❄️ Waktu Dibekukan!
              </span>
            )}
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0f172a] text-lg font-black text-white shadow-md ${
                battle.isZoneBoss || battle.isIeltsBoss ? 'bg-purple-700' : 'bg-orange-500'
              }`}
            >
              👾
            </div>
            <span className="mt-1 rounded bg-[#0f172a]/85 px-2 py-0.5 font-mono-nums text-[10px] font-bold text-amber-300">
              HP {monsterHp}/{monsterMaxHp}
            </span>
          </div>
        </div>

        {/* Question Prompt & Audio */}
        <div className="px-6 pt-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              {question.isDifficultyFlagged && (
                <div className="mb-1 inline-flex items-center gap-1 rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-950">
                  <AlertTriangle className="h-3 w-3" />
                  <span>🧭 Kompas Tanya: Kata Sulit (Sering salah)</span>
                </div>
              )}
              <h3 className="text-base font-extrabold text-[#2e1806] sm:text-lg">
                {question.prompt}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => soundEngine.speakEnglish(question.audioWord)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#b45309]/40 bg-[#fef3c7] px-2.5 py-1.5 text-xs font-bold text-[#78350f] transition hover:bg-[#fde68a]"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Dengar</span>
            </button>
          </div>
          {question.hintWord && turnPhase !== 'grab' && (
            <div className="mt-0.5 font-mono-nums text-xs text-[#92400e]">
              Petunjuk: {question.hintWord}
            </div>
          )}

          {/* Reflex / Pendekar Timer Bar */}
          <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full border border-[#78350f] bg-[#e7d3ad]">
            <div
              className={`h-full transition-all duration-75 ${
                turnFrozen
                  ? 'bg-cyan-500'
                  : grabPct > 45
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
              style={{
                width: `${
                  turnPhase === 'grab'
                    ? grabPct
                    : turnPhase === 'answer' && diffCfg.duelAnswerSec > 0
                    ? Math.max(0, (answerTimer / diffCfg.duelAnswerSec) * 100)
                    : 100
                }%`,
              }}
            />
          </div>

          {/* Big AMBIL! Reflex Button */}
          {turnPhase === 'grab' ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleGrab}
                className="w-full rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-[#fb923c] to-[#ea580c] py-3 text-base font-black tracking-wide text-white shadow-[0_5px_0_#78350f] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#78350f] sm:text-lg"
              >
                ✋ AMBIL GILIRAN! (Spasi · {grabTimer.toFixed(1)}d)
              </button>
              <p className="mt-1.5 text-center text-[11px] font-semibold text-[#78350f]">
                Tekan cepat sebelum monster merebut giliran!
                {hasSepatu && ' (👟 Sepatu Angin aktif +1 dtk)'}
              </p>
            </div>
          ) : (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-center text-xs font-extrabold ${
                turnPhase === 'feedback'
                  ? feedbackGood
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-950'
                    : 'border-rose-500 bg-rose-100 text-rose-950'
                  : 'border-[#d6b67c] bg-[#f5e3be]/60 text-[#78350f]'
              }`}
            >
              {feedbackMsg ??
                `Pilih jawaban tepat (1–4)${
                  diffCfg.duelAnswerSec > 0 ? ` · Sisa ${answerTimer.toFixed(0)} dtk` : ''
                }`}
            </div>
          )}

          {/* 4 Answer Choices */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.choices.map((choice, idx) => {
              const isPicked = selectedIdx === idx;
              const isCorrectChoice = idx === question.correctIndex;
              const isEliminated = eliminatedChoices.includes(idx);
              const isLocked = lockedChoiceIdx === idx;
              const isSlimed = slimedChoiceIdx === idx && turnPhase !== 'feedback';

              let cardStyle =
                'border-[#c4a472] bg-white text-[#2e1806] hover:border-[#ea580c] hover:bg-[#fffbeb]';
              if (isEliminated || isLocked) {
                cardStyle =
                  'border-slate-300 bg-slate-200 text-slate-400 line-through cursor-not-allowed opacity-60';
              } else if (turnPhase === 'grab') {
                cardStyle =
                  'border-[#d6c29f] bg-[#f5ebd6] text-[#8c6b43] opacity-70 cursor-not-allowed';
              } else if (turnPhase === 'feedback') {
                if (isCorrectChoice) {
                  cardStyle = 'border-emerald-600 bg-emerald-100 text-emerald-950 font-extrabold';
                } else if (isPicked && !feedbackGood) {
                  cardStyle = 'border-rose-600 bg-rose-100 text-rose-950';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={turnPhase !== 'answer' || isEliminated || isLocked}
                  onClick={() => handlePickChoice(idx)}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition ${cardStyle}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e7d3ad] font-mono-nums text-xs font-extrabold text-[#5c340f]">
                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className="truncate">
                    {isSlimed ? '🟢 ??? (Tertutup Lendir)' : choice}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Bar */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#78350f]">
              {hasPedang && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                  <Sparkles className="h-3 w-3" />
                  <span>{battle.isZoneBoss ? 'Pedang: 4 hit=+1 ❤️' : 'Pedang: 2 Dmg'}</span>
                </span>
              )}
              <span>Streak Duel: x{duelHitStreak}</span>
            </div>
            <button
              type="button"
              onClick={() => onBattleEnd('fled', battle)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#991b1b] bg-[#ef4444] px-3.5 py-1.5 text-xs font-extrabold text-white shadow transition hover:bg-[#dc2626]"
            >
              <Footprints className="h-3.5 w-3.5" />
              <span>Kabur (-1 ❤️)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
