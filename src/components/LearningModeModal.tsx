import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  HelpCircle,
  RotateCw,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { DIFF_CONFIG } from '../data/diglosaCatalog';
import {
  CATEGORIES,
  pickDistractors,
  VOCAB_BY_ID,
  VOCAB_CATALOG,
} from '../data/vocabCatalog';
import {
  DifficultyMode,
  LearningSessionContext,
  VocabEntry,
} from '../types/game';

interface LearningModeModalProps {
  session: LearningSessionContext | null;
  difficulty: DifficultyMode;
  qtimerEnabled: boolean;
  onRecordWord: (vocabId: string, ok: boolean, noLevel?: boolean) => void;
  onComplete: (
    ctx: LearningSessionContext,
    pct: number,
    xpEarned: number,
    cekCepatPassed?: boolean,
  ) => void;
  onClose: () => void;
}

interface McqRound {
  entry: VocabEntry;
  prompt: string;
  choices: string[];
  correctIdx: number;
}

function buildMcqRound(entry: VocabEntry, forceListen = false): McqRound {
  const distractors = pickDistractors(entry, 3);
  const askMeaning = forceListen ? true : Math.random() < 0.5;
  const raw = askMeaning
    ? [entry.meaningId, ...distractors.map((d) => d.meaningId)]
    : [entry.word, ...distractors.map((d) => d.word)];
  const indexed = raw.map((t, i) => ({ t, ok: i === 0 })).sort(() => Math.random() - 0.5);
  return {
    entry,
    prompt: forceListen
      ? 'Dengarkan pelafalan lalu pilih artinya:'
      : askMeaning
      ? `Apa arti kata "${entry.word}"?`
      : `Bahasa Inggris dari "${entry.meaningId}"?`,
    choices: indexed.map((x) => x.t),
    correctIdx: indexed.findIndex((x) => x.ok),
  };
}

export const LearningModeModal: React.FC<LearningModeModalProps> = ({
  session,
  difficulty,
  qtimerEnabled,
  onRecordWord,
  onComplete,
  onClose,
}) => {
  const words = useMemo<VocabEntry[]>(() => {
    if (!session) return [];
    const list = session.wordIds.map((id) => VOCAB_BY_ID[id]).filter(Boolean);
    return list.length > 0 ? list : VOCAB_CATALOG.slice(0, 10);
  }, [session]);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rightCount, setRightCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [peeked, setPeeked] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Cek Cepat (3-question check after Cards in Door 0!)
  const [cekCepatPool, setCekCepatPool] = useState<McqRound[] | null>(null);
  const [cekIdx, setCekIdx] = useState(0);
  const [cekRight, setCekRight] = useState(0);

  // Quiz / Listen round
  const [mcq, setMcq] = useState<McqRound | null>(null);

  // Type mode
  const [typed, setTyped] = useState('');
  const [typeTries, setTypeTries] = useState(0);
  const [typeHints, setTypeHints] = useState(0);

  // Match mode
  const [matchLeft, setMatchLeft] = useState<VocabEntry[]>([]);
  const [matchRight, setMatchRight] = useState<VocabEntry[]>([]);
  const [selLeftId, setSelLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchMoves, setMatchMoves] = useState(0);

  // Timer (qstrip / board)
  const diffCfg = DIFF_CONFIG[difficulty];
  const activeMaxSec = session
    ? session.mode === 'match'
      ? diffCfg.matchSec
      : session.mode === 'type'
      ? Math.round(diffCfg.qSec * 1.5)
      : diffCfg.qSec
    : 12;
  const [timeLeft, setTimeLeft] = useState(activeMaxSec);
  const timeLeftRef = useRef(activeMaxSec);
  const resetTimeLeft = (val: number) => {
    timeLeftRef.current = val;
    setTimeLeft(val);
  };

  // Result phase
  const [resultData, setResultData] = useState<{
    pct: number;
    stars: 1 | 2 | 3;
    cekCepatPassed?: boolean;
  } | null>(null);

  // Reset on session change
  useEffect(() => {
    if (!session || words.length === 0) return;
    setIdx(0);
    setFlipped(false);
    setRightCount(0);
    setTotalAttempted(0);
    setCombo(0);
    setXpEarned(0);
    setPeeked(false);
    setFeedback(null);
    setCekCepatPool(null);
    setCekIdx(0);
    setCekRight(0);
    setResultData(null);
    setTyped('');
    setTypeTries(0);
    setTypeHints(0);
    resetTimeLeft(activeMaxSec);

    if (session.mode === 'quiz' || session.mode === 'listen') {
      const round = buildMcqRound(words[0], session.mode === 'listen');
      setMcq(round);
      if (session.mode === 'listen') {
        window.setTimeout(() => soundEngine.speakEnglish(words[0].word, 0.85), 350);
      }
    } else if (session.mode === 'match') {
      const sub = words.slice(0, 8);
      setMatchLeft([...sub].sort(() => Math.random() - 0.5));
      setMatchRight([...sub].sort(() => Math.random() - 0.5));
      setSelLeftId(null);
      setMatchedIds([]);
      setMatchMoves(0);
    }
  }, [session, words, activeMaxSec]);

  // Countdown timer for qstrip / match board
  useEffect(() => {
    if (!session || resultData || !qtimerEnabled) return;
    if (session.mode === 'cards' && !cekCepatPool) return;
    if (feedback) return;

    let lastMs = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastMs) / 1000;
      lastMs = now;
      const next = Math.max(0, timeLeftRef.current - dt);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next <= 0) {
        window.clearInterval(timer);
        handleTimeout();
      }
    }, 100);
    return () => window.clearInterval(timer);
  });

  const finishSession = (finalRight: number, finalTotal: number, cekPassed?: boolean) => {
    if (!session) return;
    const pct = finalTotal > 0 ? Math.round((finalRight / finalTotal) * 100) : 100;
    const stars: 1 | 2 | 3 = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    if (stars === 3) soundEngine.playFanfare();
    else if (stars === 2) soundEngine.playWin();
    else soundEngine.playLose();
    setResultData({ pct, stars, cekCepatPassed: cekPassed });
  };

  const advanceQuestion = (nextIdx: number, nextRight: number, nextTotal: number) => {
    if (!session) return;
    if (nextIdx >= words.length) {
      finishSession(nextRight, nextTotal);
      return;
    }
    setIdx(nextIdx);
    setFlipped(false);
    setPeeked(false);
    setFeedback(null);
    setTyped('');
    setTypeTries(0);
    setTypeHints(0);
    resetTimeLeft(activeMaxSec);

    if (session.mode === 'quiz' || session.mode === 'listen') {
      const round = buildMcqRound(words[nextIdx], session.mode === 'listen');
      setMcq(round);
      if (session.mode === 'listen') {
        window.setTimeout(() => soundEngine.speakEnglish(words[nextIdx].word, 0.85), 350);
      }
    }
  };

  const handleTimeout = () => {
    if (!session || resultData) return;
    if (session.mode === 'match') {
      const subCount = matchLeft.length;
      finishSession(matchedIds.length, Math.max(subCount, matchMoves));
      return;
    }
    if (cekCepatPool) {
      handleCekCepatPick(-1);
      return;
    }
    const cur = words[idx];
    if (cur) onRecordWord(cur.id, false, false);
    soundEngine.playNo();
    setCombo(0);
    setFeedback({ ok: false, msg: `Waktu habis! Jawaban: "${cur?.word}" (${cur?.meaningId})` });
    const nextTotal = totalAttempted + 1;
    setTotalAttempted(nextTotal);
    window.setTimeout(() => advanceQuestion(idx + 1, rightCount, nextTotal), 1150);
  };

  const handleCardMark = (knewIt: boolean) => {
    if (!session) return;
    const cur = words[idx];
    if (!cur) return;
    onRecordWord(cur.id, knewIt, false);
    if (knewIt) {
      soundEngine.playOk();
      setXpEarned((x) => x + 5);
    } else {
      soundEngine.playFlip();
    }
    const nextRight = rightCount + (knewIt ? 1 : 0);
    const nextTotal = totalAttempted + 1;
    setRightCount(nextRight);
    setTotalAttempted(nextTotal);

    if (idx + 1 >= words.length) {
      // Door 0 triggers 3-question Cek Cepat!
      if (session.doorIndex === 0) {
        const sample = [...words].sort(() => Math.random() - 0.5).slice(0, 3);
        setCekCepatPool(sample.map((w) => buildMcqRound(w, false)));
        setCekIdx(0);
        setCekRight(0);
        resetTimeLeft(diffCfg.qSec);
      } else {
        finishSession(nextRight, nextTotal);
      }
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  };

  const handleCekCepatPick = (choiceIdx: number) => {
    if (!cekCepatPool || feedback) return;
    const round = cekCepatPool[cekIdx];
    const ok = choiceIdx === round.correctIdx;
    onRecordWord(round.entry.id, ok, false);
    if (ok) soundEngine.playOk();
    else soundEngine.playNo();

    const nextCekRight = cekRight + (ok ? 1 : 0);
    setCekRight(nextCekRight);
    setFeedback({
      ok,
      msg: ok ? 'Benar!' : `Kurang tepat! Jawaban: "${round.choices[round.correctIdx]}"`,
    });

    window.setTimeout(() => {
      setFeedback(null);
      if (cekIdx + 1 >= cekCepatPool.length) {
        finishSession(nextCekRight, cekCepatPool.length, nextCekRight >= 2);
      } else {
        setCekIdx(cekIdx + 1);
        resetTimeLeft(diffCfg.qSec);
      }
    }, 900);
  };

  const handleMcqPick = (choiceIdx: number) => {
    if (!session || !mcq || feedback) return;
    const ok = choiceIdx === mcq.correctIdx;
    const noLevel = session.mode === 'listen' && peeked;
    onRecordWord(mcq.entry.id, ok, noLevel);

    let nextCombo = combo;
    let nextRight = rightCount;
    const nextTotal = totalAttempted + 1;
    if (ok) {
      nextCombo += 1;
      nextRight += 1;
      const base = session.mode === 'listen' ? 12 : 10;
      const rawGain = base + Math.min(nextCombo - 1, 5) * 2;
      const gain = noLevel ? Math.ceil(rawGain / 2) : rawGain;
      setXpEarned((x) => x + gain);
      soundEngine.playOk();
      setFeedback({
        ok: true,
        msg: noLevel ? `Benar (+${gain} XP · Intip aktif)` : `Tepat! +${gain} XP`,
      });
    } else {
      nextCombo = 0;
      soundEngine.playNo();
      setFeedback({
        ok: false,
        msg: `Salah! Jawaban benar: "${mcq.choices[mcq.correctIdx]}"`,
      });
    }
    setCombo(nextCombo);
    setRightCount(nextRight);
    setTotalAttempted(nextTotal);
    window.setTimeout(() => advanceQuestion(idx + 1, nextRight, nextTotal), 1000);
  };

  const handleSubmitType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || feedback) return;
    const cur = words[idx];
    if (!cur) return;
    const cleanInput = typed.trim().toLowerCase();
    const cleanTarget = cur.word.trim().toLowerCase();
    if (cleanInput === cleanTarget) {
      const gain = Math.max(5, 15 - 3 * typeHints);
      onRecordWord(cur.id, true, false);
      setXpEarned((x) => x + gain);
      const nextRight = rightCount + 1;
      const nextTotal = totalAttempted + 1;
      setRightCount(nextRight);
      setTotalAttempted(nextTotal);
      soundEngine.playOk();
      setFeedback({ ok: true, msg: `Ejaan Sempurna! "${cur.word}" (+${gain} XP)` });
      window.setTimeout(() => advanceQuestion(idx + 1, nextRight, nextTotal), 1000);
    } else {
      const nextTries = typeTries + 1;
      setTypeTries(nextTries);
      soundEngine.playNo();
      if (nextTries >= 2) {
        onRecordWord(cur.id, false, false);
        const nextTotal = totalAttempted + 1;
        setTotalAttempted(nextTotal);
        setFeedback({ ok: false, msg: `Jawaban benar: "${cur.word}"` });
        window.setTimeout(() => advanceQuestion(idx + 1, rightCount, nextTotal), 1200);
      } else {
        setFeedback({ ok: false, msg: 'Masih kurang tepat, coba 1 kali lagi!' });
        window.setTimeout(() => setFeedback(null), 800);
      }
    }
  };

  const handlePickRightMatch = (rightEntry: VocabEntry) => {
    if (!selLeftId || matchedIds.includes(rightEntry.id)) return;
    const nextMoves = matchMoves + 1;
    setMatchMoves(nextMoves);
    if (selLeftId === rightEntry.id) {
      onRecordWord(rightEntry.id, true, false);
      setXpEarned((x) => x + 8);
      soundEngine.playOk();
      const nextMatched = [...matchedIds, rightEntry.id];
      setMatchedIds(nextMatched);
      setSelLeftId(null);
      if (nextMatched.length >= matchLeft.length) {
        finishSession(matchLeft.length, Math.max(matchLeft.length, nextMoves));
      }
    } else {
      onRecordWord(selLeftId, false, false);
      soundEngine.playNo();
      setSelLeftId(null);
    }
  };

  if (!session) return null;

  const currentWord = words[idx];
  const cat = currentWord ? CATEGORIES.find((c) => c.id === currentWord.catId) : null;
  const timerRatio = Math.max(0, Math.min(1, timeLeft / Math.max(1, activeMaxSec)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain touch-pan-y bg-[#0f172a]/75 p-2 sm:p-4">
      <div className="my-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border-4 border-[#78350f] bg-[#fff7e6] text-[#3b2008] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#d6b67c] bg-[#f5e3be] px-5 py-3">
          <div>
            <h2 className="text-base font-extrabold">{session.title}</h2>
            <p className="text-xs font-bold text-[#92400e]">
              {session.mode === 'match'
                ? `Pasangan: ${matchedIds.length}/${matchLeft.length} · Langkah: ${matchMoves}`
                : cekCepatPool
                ? `Cek Cepat Kartu: ${cekIdx + 1}/${cekCepatPool.length}`
                : `Kata ${Math.min(idx + 1, words.length)}/${words.length} · +${xpEarned} XP`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7d3ad] text-[#5c340f] hover:bg-[#d6b67c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* qstrip Visual Timer Bar (Hoot on left, Monster approaching from right!) */}
        {qtimerEnabled && !resultData && (session.mode !== 'cards' || Boolean(cekCepatPool)) && (
          <div className="mx-5 mt-3">
            <div className="relative h-6 overflow-hidden rounded-full border-2 border-[#78350f] bg-[#e7d3ad]">
              <div
                className={`h-full transition-all duration-100 ${
                  timerRatio > 0.35 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${timerRatio * 100}%` }}
              />
              <span className="absolute left-2 top-0.5 text-sm">🦉</span>
              <span
                className="absolute top-0.5 text-sm transition-all duration-100"
                style={{ left: `${Math.max(12, timerRatio * 92)}%` }}
              >
                👾
              </span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5">
          {resultData ? (
            <div className="space-y-4 text-center">
              {resultData.stars === 3 && (
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  ★ Konfeti Kemenangan Sempurna! ★
                </div>
              )}
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-10 w-10 ${
                      s <= resultData.stars
                        ? 'fill-amber-400 text-amber-600'
                        : 'fill-slate-200 text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <h3 className="text-2xl font-black">Skor: {resultData.pct}%</h3>
              <p className="text-sm font-bold text-[#78350f]">
                {resultData.pct >= session.minPct
                  ? `Hebat! Syarat minimal (${session.minPct}%) terpenuhi! ${resultData.pct >= 70 ? '(+20 XP Bonus Sesi!)' : ''}`
                  : `Butuh minimal ${session.minPct}% untuk menuntaskan pintu ini. Yuk coba lagi!`}
              </p>
              {resultData.cekCepatPassed !== undefined && (
                <div className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-900">
                  {resultData.cekCepatPassed
                    ? 'Cek Cepat Lulus (≥2/3)! Bonus +1 ❤️ ditemukan di luar pintu!'
                    : 'Pintu Kartu tetap terbuka! Jawab ≥2/3 Cek Cepat lain kali untuk hadiah ❤️.'}
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  onComplete(
                    session,
                    resultData.pct,
                    xpEarned,
                    resultData.cekCepatPassed,
                  )
                }
                className="w-full rounded-2xl border-2 border-[#14532d] bg-gradient-to-b from-[#4ade80] to-[#16a34a] py-3 text-sm font-black text-white shadow-[0_4px_0_#14532d] hover:brightness-105"
              >
                Selesai &amp; Lanjutkan
              </button>
            </div>
          ) : cekCepatPool ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-extrabold text-amber-900">
                Cek Cepat 3 Soal! Jawab benar ≥ 2/3 untuk menjatuhkan Hati (+1 ❤️)!
              </div>
              <h3 className="text-lg font-extrabold">{cekCepatPool[cekIdx].prompt}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cekCepatPool[cekIdx].choices.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => handleCekCepatPick(i)}
                    className="rounded-xl border-2 border-[#c4a472] bg-white px-4 py-3 text-left text-sm font-bold hover:border-amber-500 hover:bg-amber-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-center text-xs font-extrabold ${
                    feedback.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {feedback.msg}
                </div>
              )}
            </div>
          ) : session.mode === 'cards' && currentWord ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFlip();
                  setFlipped((f) => !f);
                }}
                className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-2xl border-4 border-[#b45309] bg-white p-6 text-center shadow-lg transition hover:bg-[#fffbeb]"
              >
                <span className="rounded-full bg-[#f5e3be] px-3 py-0.5 text-xs font-extrabold text-[#78350f]">
                  {cat?.icon} {cat?.name}
                </span>
                {!flipped ? (
                  <>
                    <div className="mt-3 text-3xl font-black text-[#0f172a]">{currentWord.word}</div>
                    <div className="mt-1 font-mono-nums text-xs text-[#92400e]">
                      {currentWord.phonetic}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#78350f]">
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Klik kartu untuk balik &amp; lihat arti</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-2xl font-black text-emerald-700">
                      {currentWord.meaningId}
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#5c340f]">{currentWord.word}</div>
                    <p className="mt-2 text-xs italic text-[#78350f]">{currentWord.exampleId}</p>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(currentWord.word)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#78350f] bg-[#f5e3be] px-3.5 py-2.5 text-xs font-extrabold text-[#5c340f]"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>Dengar</span>
                </button>
                <div className="flex flex-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCardMark(false)}
                    className="flex-1 rounded-xl border-2 border-[#78350f] bg-white py-2.5 text-xs font-extrabold text-[#5c340f] hover:bg-[#f5e3be]"
                  >
                    Ulangi Nanti
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCardMark(true)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#14532d] bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Sudah Hafal (+5 XP)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (session.mode === 'quiz' || session.mode === 'listen') && mcq ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold">{mcq.prompt}</h3>
                <button
                  type="button"
                  onClick={() => soundEngine.speakEnglish(mcq.entry.word, 0.85)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#b45309]/50 bg-[#fef3c7] px-3 py-1.5 text-xs font-extrabold text-[#78350f]"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>Putar</span>
                </button>
              </div>

              {session.mode === 'listen' && (
                <div className="flex items-center justify-between rounded-xl border border-[#d6b67c] bg-white px-3 py-2 text-xs">
                  {peeked ? (
                    <span className="font-extrabold text-amber-800">
                      Kata: &ldquo;{mcq.entry.word}&rdquo; (XP separuh, penguasaan tidak naik)
                    </span>
                  ) : (
                    <span className="font-semibold text-[#78350f]">
                      Dengar pelafalan atau intip kata jika ragu.
                    </span>
                  )}
                  {!peeked && (
                    <button
                      type="button"
                      onClick={() => setPeeked(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 font-extrabold text-amber-900 hover:bg-amber-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Intip arti</span>
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {mcq.choices.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => handleMcqPick(i)}
                    className="flex items-center gap-2 rounded-xl border-2 border-[#c4a472] bg-white px-3.5 py-3 text-left text-sm font-bold hover:border-amber-500 hover:bg-amber-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-[#e7d3ad] font-mono-nums text-xs font-black">
                      {i + 1}
                    </span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-center text-xs font-extrabold ${
                    feedback.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {feedback.msg}
                </div>
              )}
            </div>
          ) : session.mode === 'type' && currentWord ? (
            <form onSubmit={handleSubmitType} className="space-y-4">
              <div className="rounded-2xl border-2 border-[#d6b67c] bg-white p-4 text-center">
                <div className="text-xs font-bold uppercase text-[#92400e]">Eja dalam Bahasa Inggris:</div>
                <div className="mt-1 text-2xl font-black">{currentWord.meaningId}</div>
                <div className="mt-2 font-mono-nums text-sm tracking-widest text-amber-700">
                  {currentWord.word
                    .split('')
                    .map((ch, i) => (ch === ' ' ? '  ' : i < typeHints ? ch : '_'))
                    .join(' ')}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Ketik kata Inggris..."
                  className="flex-1 rounded-xl border-2 border-[#78350f] bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setTypeHints((h) => Math.min(currentWord.word.length - 1, h + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-[#78350f] bg-[#f5e3be] px-3 py-2 text-xs font-extrabold text-[#5c340f]"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Petunjuk</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-500"
              >
                Periksa Ejaan (Sisa {2 - typeTries}x)
              </button>

              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-center text-xs font-extrabold ${
                    feedback.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {feedback.msg}
                </div>
              )}
            </form>
          ) : session.mode === 'match' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                {matchLeft.map((item) => {
                  const done = matchedIds.includes(item.id);
                  const sel = selLeftId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={done}
                      onClick={() => {
                        setSelLeftId(item.id);
                        soundEngine.speakEnglish(item.word);
                      }}
                      className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-xs font-extrabold transition ${
                        done
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-800 opacity-55'
                          : sel
                          ? 'border-amber-600 bg-amber-100 text-amber-950'
                          : 'border-[#c4a472] bg-white hover:bg-amber-50'
                      }`}
                    >
                      {item.word}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {matchRight.map((item) => {
                  const done = matchedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={done || !selLeftId}
                      onClick={() => handlePickRightMatch(item)}
                      className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-xs font-bold transition ${
                        done
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-800 opacity-55'
                          : 'border-[#c4a472] bg-white hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {item.meaningId}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
