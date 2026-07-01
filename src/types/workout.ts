export type TimerMode = "amrap" | "fortime" | "emom" | "tabata";

export const MODE_ICONS: Record<TimerMode, string> = {
  amrap: "🔄",
  fortime: "⏱️",
  emom: "📐",
  tabata: "🔥",
};

export const MODE_NAMES: Record<TimerMode, string> = {
  amrap: "AMRAP",
  fortime: "FOR TIME",
  emom: "EMOM",
  tabata: "TABATA",
};

export interface Exercise {
  id: string;
  name: string;
  reps: number;
  durationSec: number;
}

export interface Section {
  id: string;
  label: string;
  mode: TimerMode;
  workSec: number;
  restSec: number;
  emomSec: number;
  totalTours: number | undefined;
  toursCompleted: number;
  restBetweenExercises: number;
  restBetweenBlocks: number;
  fortimeDuration: number;
  totalRepsPerTour: number;
  exercises: Exercise[];
}

export interface Workout {
  id: string;
  name: string;
  sections: Section[];
  createdAt: string;
  completedAt: string | null;
  totalDurationSec: number | null;
}

export function newExercise(): Exercise {
  return { id: uid(), name: "", reps: 0, durationSec: 0 };
}

export function exercise(name: string, reps = 0, durationSec = 0): Exercise {
  return { id: uid(), name, reps, durationSec };
}

export function newSection(mode: TimerMode = "amrap"): Section {
  const modeDefaults: Record<TimerMode, Partial<Section>> = {
    amrap: {},
    fortime: {},
    emom: { emomSec: 60 },
    tabata: { workSec: 30, restSec: 10 },
  };
  return {
    id: uid(),
    label: "",
    mode,
    workSec: mode === "tabata" ? 30 : 0,
    restSec: mode === "tabata" ? 10 : 0,
    emomSec: mode === "emom" ? 60 : 60,
    totalTours: undefined,
    toursCompleted: 0,
    restBetweenExercises: 0,
    restBetweenBlocks: 60,
    fortimeDuration: 0,
    totalRepsPerTour: 0,
    exercises: [{ ...newExercise(), name: "" }],
    ...modeDefaults[mode],
  };
}

export function newWorkout(): Workout {
  return {
    id: uid(),
    name: "Entraînement",
    sections: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    totalDurationSec: null,
  };
}

export function presetWorkoutSections(): Section[] {
  return [
    {
      ...newSection("fortime"),
      label: "Échauffement",
      totalTours: 2,
      restBetweenBlocks: 0,
      exercises: [
        exercise("Course sur place", 0, 30),
        exercise("Jumping Jacks", 20),
        exercise("Squats", 20),
        exercise("Pompes", 10),
        exercise("Montées de genoux", 20),
        exercise("Gainage", 0, 30),
      ],
    },
    {
      ...newSection("fortime"),
      label: "Bloc 1",
      totalTours: 4,
      restBetweenBlocks: 60,
      exercises: [
        exercise("Burpees", 15),
        exercise("Squats", 20),
        exercise("Pompes", 15),
        exercise("Montées de genoux", 0, 30),
        exercise("Gainage", 0, 30),
      ],
    },
    {
      ...newSection("tabata"),
      label: "TABATA 1",
      totalTours: undefined,
      fortimeDuration: 480,
      workSec: 30,
      restSec: 10,
      restBetweenBlocks: 0,
      exercises: [
        exercise("Burpees"),
        exercise("Montées de genoux"),
        exercise("Burpees"),
        exercise("Montées de genoux"),
      ],
    },
    {
      ...newSection("fortime"),
      label: "Bloc 2",
      totalTours: 4,
      restBetweenBlocks: 60,
      exercises: [
        exercise("Fentes (10 par jambe)", 20),
        exercise("Squats sautés", 20),
        exercise("Grimpeur", 0, 30),
        exercise("Crunchs", 20),
        exercise("Gainage", 0, 45),
      ],
    },
    {
      ...newSection("tabata"),
      label: "TABATA 2",
      totalTours: undefined,
      fortimeDuration: 480,
      workSec: 30,
      restSec: 10,
      restBetweenBlocks: 0,
      exercises: [
        exercise("Jumping Jacks"),
        exercise("Squats sautés"),
        exercise("Jumping Jacks"),
        exercise("Squats sautés"),
      ],
    },
    {
      ...newSection("amrap"),
      label: "Finisher",
      fortimeDuration: 300,
      restBetweenBlocks: 0,
      exercises: [
        exercise("Burpees", 10),
        exercise("Pompes", 15),
        exercise("Squats", 20),
        exercise("Montées de genoux", 0, 30),
      ],
    },
  ];
}

export function presetWorkout(): Workout {
  return {
    id: uid(),
    name: "Programme Momo",
    sections: presetWorkoutSections(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    totalDurationSec: null,
  };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    "· " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

export function fmt(sec: number | null | undefined): string {
  if (!sec) return "–";
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export function fmtUp(sec: number): string {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  return (
    (h > 0 ? `${h}:` : "") +
    m.toString().padStart(2, "0") +
    ":" +
    s.toString().padStart(2, "0")
  );
}

export function uid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AudioCtor();
  }
  return audioCtx;
}

export async function unlockAudio(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    /* no audio */
  }
}

export function playBeep(freq = 880, dur = 150): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const length = Math.max(dur / 1000, 0.72);
    const master = ctx.createGain();
    const partials = [
      { ratio: 1, gain: 0.42, decay: length },
      { ratio: 2.01, gain: 0.2, decay: length * 0.62 },
      { ratio: 2.96, gain: 0.13, decay: length * 0.42 },
      { ratio: 4.14, gain: 0.08, decay: length * 0.28 },
    ];

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.95, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + length);
    master.connect(ctx.destination);

    partials.forEach(({ ratio, gain, decay }) => {
      const osc = ctx.createOscillator();
      const partialGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * ratio, now);
      partialGain.gain.setValueAtTime(gain, now);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(partialGain);
      partialGain.connect(master);
      osc.start(now);
      osc.stop(now + length + 0.05);
    });

    if ("vibrate" in navigator) navigator.vibrate(120);
  } catch {
    /* no audio */
  }
}
