import React, { useEffect, useRef, useState } from 'react';
import type { Exercise, Section, Workout } from '../types/workout';
import { MODE_ICONS, MODE_NAMES, fmtUp, playBeep, unlockAudio } from '../types/workout';
import { useCountdown, useEMOM, useTabata, useSessionTimer, useRestTimer } from '../hooks/useTimer';

interface Props {
  sections: Section[];
  onComplete: (workout: Workout) => void;
  onAbort: () => void;
}

export const ActiveWorkoutView: React.FC<Props> = ({ sections, onComplete, onAbort }) => {
  // Core navigation state
  const [curIdx, setCurIdx] = useState(0);
  const [curTour, setCurTour] = useState(1);
  const [toursDone, setToursDone] = useState<Record<number, number>>({});
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [exerciseRemaining, setExerciseRemaining] = useState(0);
  const [restKind, setRestKind] = useState<'exercise' | 'tour' | 'block'>('block');
  const [sectionElapsed, setSectionElapsed] = useState(0);
  const [tabataCyclesDone, setTabataCyclesDone] = useState(0);
  const completedTimedExerciseRef = useRef('');
  const completedSectionDurationRef = useRef('');
  const previousExerciseRemainingRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAwakeVideoRef = useRef<HTMLVideoElement | null>(null);
  const keepAwakeTimerRef = useRef<number | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);

  const sec = sections[curIdx];
  const currentExercise = sec?.exercises[currentExIdx];
  const elapsed = useSessionTimer(running);

  const startKeepAwakeFallback = async () => {
    try {
      if (keepAwakeVideoRef.current) {
        await keepAwakeVideoRef.current.play();
        setWakeLockActive(true);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.captureStream) return;

      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.style.position = 'fixed';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.left = '-10px';
      video.style.bottom = '0';
      document.body.appendChild(video);

      let frame = 0;
      keepAwakeTimerRef.current = window.setInterval(() => {
        ctx.fillStyle = frame++ % 2 === 0 ? '#000' : '#111';
        ctx.fillRect(0, 0, 2, 2);
      }, 1000);

      video.srcObject = canvas.captureStream(1);
      keepAwakeVideoRef.current = video;
      await video.play();
      setWakeLockActive(true);
    } catch {
      setWakeLockActive(false);
    }
  };

  const stopKeepAwakeFallback = () => {
    if (keepAwakeTimerRef.current != null) {
      window.clearInterval(keepAwakeTimerRef.current);
      keepAwakeTimerRef.current = null;
    }
    keepAwakeVideoRef.current?.pause();
    keepAwakeVideoRef.current?.remove();
    keepAwakeVideoRef.current = null;
  };

  const requestKeepAwake = async () => {
    try {
      if (!('wakeLock' in navigator)) {
        setWakeLockSupported(false);
        await startKeepAwakeFallback();
        return;
      }
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener('release', () => setWakeLockActive(false));
    } catch {
      setWakeLockActive(false);
    }
  };

  useEffect(() => {
    void unlockAudio();
    void requestKeepAwake();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && running) void requestKeepAwake();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
      stopKeepAwakeFallback();
    };
  }, []);

  useEffect(() => {
    if (running) void requestKeepAwake();
    else {
      void wakeLockRef.current?.release();
      stopKeepAwakeFallback();
    }
  }, [running]);

  // ─── Timer per mode ─────────────────────────────
  const tabata = useTabata({
    workSec: sec?.workSec || 30,
    restSec: sec?.restSec || 10,
    running,
    onPhaseDone: (phase) => {
      if (sec?.mode !== 'tabata') return;
      playBeep(phase === 'work' ? 1040 : 880, 180);
      if (phase === 'rest') completeTabataCycle({ finishWhenLimitReached: true });
    },
  });
  const emom = useEMOM(sec?.emomSec || 60);

  // ─── FOR TIME countdown timer ─────────────────────
  const { secs: forTimeRemaining } = useCountdown(sec && sec.mode === 'fortime' ? (sec.fortimeDuration || 0) : 0);

  // ─── Rest timer between blocks/exercises ────────
  // Determine rest duration based on current context
  const [showRest, setShowRest] = useState(false);
  const [restSecs, setRestSecs] = useState(60);

  useEffect(() => {
    setExerciseRemaining(currentExercise?.durationSec || 0);
    completedTimedExerciseRef.current = '';
    previousExerciseRemainingRef.current = 0;
  }, [curIdx, curTour, currentExIdx, currentExercise?.durationSec]);

  useEffect(() => {
    setSectionElapsed(0);
    setTabataCyclesDone(0);
    completedSectionDurationRef.current = '';
  }, [curIdx]);

  useEffect(() => {
    if (!running || showRest || !currentExercise?.durationSec) return;
    const iv = setInterval(() => setExerciseRemaining(p => p <= 1 ? 0 : p - 1), 1000);
    return () => clearInterval(iv);
  }, [running, showRest, currentExercise?.durationSec, curIdx, curTour, currentExIdx]);

  useEffect(() => {
    if (!running || showRest || !sec) return;
    if (sec.mode === 'tabata' && tabata.phase === 'idle') return;
    if (sec.mode !== 'tabata' && !(sec.mode === 'amrap' && sec.fortimeDuration > 0)) return;
    const iv = setInterval(() => setSectionElapsed(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [running, showRest, sec?.mode, sec?.fortimeDuration, tabata.phase]);

  const handleRestDone = () => {
    playBeep(880, 150);
    setShowRest(false);
    if (curIdx < sections.length - 1) {
      if (restKind === 'exercise') {
        setCurrentExIdx(i => i + 1);
      } else if (restKind === 'tour') {
        setCurTour(i => i + 1);
        setCurrentExIdx(0);
      } else {
        setCurIdx(i => i + 1);
        setCurTour(1);
        setCurrentExIdx(0);
        tabata.pause();
      }
    } else {
      finishWorkout();
    }
  };

  const restTimer = useRestTimer({ secs: showRest ? restSecs : null, onDone: handleRestDone });

  useEffect(() => {
    if (sec?.mode === 'tabata' && running && !showRest && tabata.phase === 'idle') {
      tabata.start();
    }
  }, [sec?.mode, running, showRest, tabata.phase, tabata.start]);

  useEffect(() => {
    if (!sec || sec.mode !== 'amrap' || sec.fortimeDuration <= 0 || sectionElapsed < sec.fortimeDuration) return;
    const doneKey = `${curIdx}:${sec.id}`;
    if (completedSectionDurationRef.current === doneKey) return;
    completedSectionDurationRef.current = doneKey;
    playBeep(1040, 180);
    advanceSection();
  }, [sec?.mode, sec?.fortimeDuration, sec?.id, sectionElapsed, curIdx]);

  // ─── Exercise navigation ──────────────────────────
  function nextExercise(options: { skipExerciseRest?: boolean } = {}) {
    if (!sec) return;
    if (sec.mode === 'tabata') {
      if (currentExIdx < sec.exercises.length - 1) {
        advanceTabataExercise();
      } else {
        completeTabataCycle({ finishWhenLimitReached: true });
      }
      return;
    }
    if (currentExIdx < sec.exercises.length - 1) {
      if (!options.skipExerciseRest && sec.restBetweenExercises > 0) {
        setRestSecs(sec.restBetweenExercises);
        setRestKind('exercise');
        setShowRest(true);
        return;
      }
      setCurrentExIdx(i => i + 1);
    } else {
      nextTour();
    }
  }

  function advanceTabataExercise() {
    if (!sec) return;
    setCurrentExIdx(i => i < sec.exercises.length - 1 ? i + 1 : 0);
    tabata.skipToWork();
  }

  function completeTabataCycle(options: { finishWhenLimitReached: boolean }) {
    if (!sec) return;
    const nextCycleCount = tabataCyclesDone + 1;
    const durationReached = sec.fortimeDuration > 0 && sectionElapsed >= sec.fortimeDuration;
    const tourLimitReached = sec.fortimeDuration <= 0 && !!sec.totalTours && (
      options.finishWhenLimitReached ? nextCycleCount >= sec.totalTours : tabataCyclesDone >= sec.totalTours
    );

    setTabataCyclesDone(nextCycleCount);
    setToursDone(p => ({ ...p, [curIdx]: nextCycleCount }));

    if (durationReached || tourLimitReached) {
      advanceSection();
      return;
    }

    setCurTour(nextCycleCount + 1);
    advanceTabataExercise();
  }

  const nextTour = () => {
    setToursDone(p => ({ ...p, [curIdx]: (p[curIdx] || 0) + 1 }));
    const n = curTour + 1;
    if (sec && sec.totalTours && n > sec.totalTours) advanceSection();
    else {
      if (sec && sec.restBetweenBlocks > 0 && (sec.mode === 'fortime' || sec.mode === 'amrap' || sec.mode === 'emom')) {
        setRestSecs(sec.restBetweenBlocks);
        setRestKind('tour');
        setShowRest(true);
      } else {
        setCurTour(n);
        setCurrentExIdx(0);
      }
    }
  };

  const advanceSection = () => {
    // Start rest between blocks if configured
    if (sec && curIdx < sections.length - 1 && sec.restBetweenBlocks > 0) {
      setRestSecs(sec.restBetweenBlocks);
      setRestKind('block');
      setShowRest(true);
    } else {
      handleRestDone();
    }
  };

  useEffect(() => {
    if (sec?.mode === 'tabata' || !running || showRest || !currentExercise?.durationSec || exerciseRemaining !== 0) return;
    if (previousExerciseRemainingRef.current <= 0) return;

    const doneKey = `${curIdx}:${curTour}:${currentExIdx}`;
    if (completedTimedExerciseRef.current === doneKey) return;

    completedTimedExerciseRef.current = doneKey;
    previousExerciseRemainingRef.current = 0;
    playBeep(1040, 180);
    nextExercise({ skipExerciseRest: true });
  }, [sec?.mode, running, showRest, currentExercise?.durationSec, exerciseRemaining, curIdx, curTour, currentExIdx]);

  useEffect(() => {
    previousExerciseRemainingRef.current = exerciseRemaining;
  }, [exerciseRemaining]);

  const finishWorkout = () => {
    const completed: Workout = {
      id: crypto.randomUUID(),
      name: 'Entraînement',
      sections: sections.map((s, i) => ({ ...s, toursCompleted: (toursDone[i] || 0) + 1 })),
      totalDurationSec: elapsed,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    onComplete(completed);
  };

  // ─── Timer display content per mode ───────────────
  let timerContent: React.ReactNode = null;
  if (sec) {
    switch (sec.mode) {
      case 'amrap':
        timerContent = (
          <div style={{ textAlign: 'center' }}>
            <div className="tval w">{sec.fortimeDuration > 0 ? fmtUp(Math.max(0, sec.fortimeDuration - sectionElapsed)) : (toursDone[curIdx] || 0)}</div>
            <div className="tsmt">
              {sec.fortimeDuration > 0
                ? `${fmtUp(Math.min(sectionElapsed, sec.fortimeDuration))} / ${fmtUp(sec.fortimeDuration)}`
                : `tour${(toursDone[curIdx] || 0) !== 1 ? 's' : ''} compl${((toursDone[curIdx] || 0) !== 1 ? 't' : '')}e`}
            </div>
          </div>
        );
        break;

      case 'fortime':
        if (sec.fortimeDuration > 0 && forTimeRemaining > 0) {
          timerContent = <><div className="tval w">{forTimeRemaining}</div><div className="tsmt">FOR TIME — Il reste</div></>;
        } else if (sec.fortimeDuration > 0 && forTimeRemaining <= 0) {
          timerContent = <><div className="tval r" style={{ fontSize: '2rem' }}>{Math.floor(elapsed / 60)}min {elapsed % 60}s</div><div className="tsmt">Temps écoulé</div></>;
        } else {
          timerContent = <><div className="tval w">{fmtUp(elapsed)}</div><div className="tsmt">FOR TIME — Temps total</div></>;
        }
        break;

      case 'tabata':
        if (tabata.phase === 'idle') {
          timerContent = <div className="tval w" style={{ fontSize: '2rem' }}>{'▶'} Démarrer</div>;
        } else {
          const cls = tabata.phase === 'work' ? 'w' : 'r';
          timerContent = (
            <>
              <div className={'tval ' + cls}>{tabata.timeLeft}</div>
              <div className={'tpl ' + cls}>{tabata.phase === 'work' ? 'EFFORT' : 'REPOS'}</div>
              <div className="tsmt" style={{ marginTop: 8 }}>
                {sec.fortimeDuration > 0
                  ? `${fmtUp(Math.min(sectionElapsed, sec.fortimeDuration))} / ${fmtUp(sec.fortimeDuration)}`
                  : `Cycle ${tabataCyclesDone + 1}${sec.totalTours ? `/${sec.totalTours}` : ''}`}
              </div>
            </>
          );
        }
        break;

      case 'emom':
        timerContent = <><div className="tval w">{emom.remaining}</div><div className="tpl w">EMOM</div></>;
        break;
    }
  }

  // ─── Tour dots ────────────────────────────────────
  const showTourDots = sec && sec.totalTours && sec.mode !== 'tabata' && (sec.mode === 'amrap' || sec.mode === 'emom' || sec.mode === 'fortime');

  // ─── Exercise progress dots ───────────────────────
  const showExerciseProgress = !!sec;

  const exerciseTarget = (ex: Exercise) => {
    const parts = [];
    if (ex.reps > 0) parts.push(`${ex.reps} rep.`);
    if (ex.durationSec > 0) parts.push(`${ex.durationSec} sec`);
    return parts.length ? parts.join(' / ') : 'Libre';
  };

  const exerciseDots = () => {
    if (!sec || sec.exercises.length <= 1) return null;
    return (
      <div className="ela">
        {sec.exercises.map((ex, i) => {
          const isDone = i < currentExIdx;
          const isCurrent = i === currentExIdx;
          return (
            <div key={ex.id} className="eai">
              <div className={'eac' + (isDone ? ' dn' : isCurrent ? ' cr' : '')}>
                {isDone ? '✓' : isCurrent ? '•' : ''}
              </div>
              <span className="ean" style={{ color: isDone ? '#888' : isCurrent ? '#e8e8e8' : '#555' }}>
                {ex.name || 'Exercice sans nom'}
              </span>
              <span className="ear">{exerciseTarget(ex)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Rest timer overlay ───────────────────────────
  const restOverlay = () => {
    if (!restTimer.active) return null;
    const isBlockRest = restKind === 'block';
    return (
      <div className="tdisp">
        <div className="tpl r" style={{ fontSize: '1rem' }}>
          {isBlockRest ? 'Repos entre blocs' : restKind === 'tour' ? 'Récupération entre tours' : 'Récupération inter-exercice'}
        </div>
        <div className="tval r">{restTimer.remaining}</div>
        <div className="tsmt">{restSecs}s</div>
      </div>
    );
  };

  const currentExercisePanel = sec && currentExercise && !restTimer.active && (
    <div className="current-ex">
      <div className="ce-meta">
        {sec.label || 'Section'} · {sec.mode === 'tabata'
          ? sec.fortimeDuration > 0 ? `Durée ${fmtUp(sec.fortimeDuration)}` : `Cycle ${tabataCyclesDone + 1}${sec.totalTours ? `/${sec.totalTours}` : ''}`
          : `Tour ${curTour}${sec.totalTours ? `/${sec.totalTours}` : ''}`}
      </div>
      <div className="ce-name">{currentExercise.name || 'Exercice sans nom'}</div>
      <div className="ce-target">{exerciseTarget(currentExercise)}</div>
      {currentExercise.durationSec > 0 && (
        <div className="ce-time">{fmtUp(exerciseRemaining)}</div>
      )}
    </div>
  );

  return (
    <div className="tv" onPointerDown={() => { void unlockAudio(); void requestKeepAwake(); }}>
      {/* Section progress */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 20px' }}>
        {sections.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= curIdx ? '#4ecdc4' : '#333' }} />
        ))}
      </div>

      {/* Rest overlay or timer */}
      {restTimer.active ? restOverlay() : (
        <div className="tdisp">
          {sec && (
            <>
              <div className="tpl w"><span style={{ fontSize: '.75rem' }}>{MODE_ICONS[sec.mode]} {MODE_NAMES[sec.mode]}</span></div>
              <div className="tsmt" style={{ marginBottom: 8 }}>{sec.label || 'Sans titre'}</div>
              {timerContent}
              {showTourDots && (
                <>
                  <div className="tsmt" style={{ marginTop: 8 }}>Tour {curTour}/{sec.totalTours}</div>
                  <div className="ttp">
                    {sec.totalTours != null && sec.totalTours > 0 ? (
                      Array.from({ length: sec.totalTours }, (_, i) => (
                        <div key={i + 1} className={'td ' + (i + 1 < curTour ? 'c' : i + 1 === curTour ? 'x' : '')} />
                      ))
                    ) : null}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {currentExercisePanel}

      {/* Exercise progress */}
      {showExerciseProgress && exerciseDots()}

      {/* Controls */}
      <div className="tctrls">
        <button className="btn btr" onClick={onAbort}>{'✕'}</button>
        <button className="btn btp" style={{ background: running ? '#ffa94d' : '#4ecdc4', color: '#0f0f0f' }} onClick={() => setRunning(p => !p)}>
          {running ? '❚❚' : '▶'}
        </button>
        {sec && sec.mode === 'tabata' && (
          <button className="btn bts" onClick={tabata.phase === 'idle' ? tabata.start : tabata.phase === 'work' ? tabata.skipToRest : tabata.skipToWork} title="Passer">{'⏭'}</button>
        )}
        {restTimer.active && (
          <button className="btn bts" style={{ background: '#4ecdc433', color: '#4ecdc4' }} onClick={restTimer.skip} title="Passer le repos">{'⏭'}</button>
        )}
        {showExerciseProgress && !restTimer.active && (
          <button className="btn next-btn" onClick={() => nextExercise()} title="Exercice suivant">
            {currentExIdx < (sec?.exercises.length || 0) - 1 ? 'Suivant' : 'Tour suivant'}
          </button>
        )}
      </div>

      {/* Session time */}
      <div style={{ textAlign: 'center', paddingBottom: 8, fontFamily: 'var(--m)', fontSize: '.875rem', color: '#888' }}>
        Session: {fmtUp(elapsed)}
        <div style={{ marginTop: 4, fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: wakeLockActive ? '#69db7c' : '#ffa94d' }}>
          {wakeLockSupported
            ? wakeLockActive ? 'Écran maintenu actif' : 'Touchez l’écran si la veille reste active'
            : wakeLockActive ? 'Anti-veille mobile actif' : 'Anti-veille limité sur ce navigateur'}
        </div>
      </div>
    </div>
  );
};
