import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Simple countdown timer ──────────────────────────────
export function useCountdown(initial: number) {
  const [secs, setSecs] = useState(initial);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initial <= 0) return;
    setSecs(initial);
    ref.current = setInterval(() => setSecs(p => p <= 1 ? 0 : p - 1), 1000);
    return () => { if (ref.current) clearInterval(Number(ref.current)); };
  }, [initial]);

  const reset = useCallback((v: number) => setSecs(v), []);
  return { secs, reset };
}

// ─── EMOM interval timer ─────────────────────────────────
export function useEMOM(emomSec: number) {
  const [remaining, setRemaining] = useState(emomSec);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (emomSec <= 0) return;
    setRemaining(emomSec);
    ref.current = setInterval(() => setRemaining(p => p <= 1 ? emomSec : p - 1), 1000);
    return () => { if (ref.current) clearInterval(Number(ref.current)); };
  }, [emomSec]);

  const reset = useCallback((v: number) => setRemaining(v), []);
  return { remaining, reset };
}

// ─── Tabata alternating work/rest ────────────────────────
export type TabataPhase = 'idle' | 'work' | 'rest';

interface UseTabataProps {
  workSec: number;
  restSec: number;
  running?: boolean;
  onPhaseDone?: (phase: Exclude<TabataPhase, 'idle'>) => void;
}

export function useTabata({ workSec, restSec, running = true, onPhaseDone }: UseTabataProps) {
  const [phase, setPhase] = useState<TabataPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPhaseDoneRef = useRef(onPhaseDone);

  useEffect(() => {
    onPhaseDoneRef.current = onPhaseDone;
  }, [onPhaseDone]);

  useEffect(() => () => { clearInterval(Number(ref.current)); }, [])

  useEffect(() => {
    if (phase === 'idle') return;
    const dur = phase === 'work' ? workSec : restSec;
    setTimeLeft(dur);
  }, [phase, workSec, restSec]);

  // Update timer while the workout is running.
  useEffect(() => {
    if (phase === 'idle' || !running) return;
    ref.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(Number(ref.current));
          ref.current = null;
          setPhase(phase === 'work' ? 'rest' : 'work');
          onPhaseDoneRef.current?.(phase);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(Number(ref.current)); };
  }, [phase, running]);

  const start = useCallback(() => setPhase('work'), []);
  const pause = useCallback(() => { if (ref.current !== null) clearInterval(Number(ref.current)); setPhase('idle'); }, []);
  const skipToWork = useCallback(() => { if (ref.current) clearInterval(Number(ref.current)); setPhase('work'); }, []);
  const skipToRest = useCallback(() => { if (ref.current) clearInterval(Number(ref.current)); setPhase('rest'); }, []);

  return { phase, timeLeft, start, pause, skipToWork, skipToRest, isRunning: ref.current !== null };
}

// ─── Session elapsed timer ───────────────────────────────
export function useSessionTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);
  return elapsed;
}

// ─── REST timer between blocks / exercises ──────────────
interface UseRestTimerProps {
  secs: number | null;   // null = disabled
  onDone: () => void;
}

export function useRestTimer({ secs, onDone }: UseRestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRemainingRef = useRef(0);

  useEffect(() => {
    previousRemainingRef.current = 0;
    if (secs == null || secs <= 0) {
      setRemaining(0);
      return;
    }
    setRemaining(secs);
    ref.current = setInterval(() => setRemaining(p => p <= 1 ? 0 : p - 1), 1000);
    return () => { if (ref.current) clearInterval(Number(ref.current)); };
  }, [secs]);

  useEffect(() => {
    if (remaining === 0 && secs != null && secs > 0 && previousRemainingRef.current > 0) {
      previousRemainingRef.current = 0;
      onDone();
      return;
    }
    previousRemainingRef.current = remaining;
  }, [remaining, secs, onDone]);

  const skip = useCallback(() => { if (ref.current) clearInterval(Number(ref.current)); previousRemainingRef.current = 1; setRemaining(0); }, []);
  return { remaining, active: secs != null && secs > 0, skip };
}
