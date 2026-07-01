import React, { useState } from 'react';
import type { Section, TimerMode, Workout } from '../types/workout';
import { MODE_ICONS, MODE_NAMES } from '../types/workout';
import { newSection, presetWorkoutSections } from '../types/workout';
import { saveWorkout, loadWorkouts } from '../lib/storage';
import { SectionRow, type SectionView } from './SectionRow';
import { TimerConfigModal, type TimerConfigData } from './TimerConfigModal';
import { ExerciseEditorModal, type SectionForExercises } from './ExerciseEditorModal';

interface Props {
  workoutId: string;
  onSave: (workout: Workout) => void;
  onCancel: () => void;
}

type EditorView = 'main' | 'timer' | 'exercises';

export const WorkoutEditor: React.FC<Props> = ({ workoutId, onSave, onCancel }) => {
  // Initialize with default, load from storage in useEffect
  const [workout, setWorkout] = useState<Workout>({
    id: workoutId,
    name: 'Entraînement',
    sections: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    totalDurationSec: null,
  });

  // Persist initial load
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const list = await loadWorkouts();
        const found = list.find(w => w.id === workoutId);
        if (found && found.sections.length > 0) setWorkout(found);
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [view, setView] = useState<EditorView>('main');
  const [editIdx, setEditIdx] = useState(-1);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // ─── Section CRUD ─────────────────────────────────
  const updateName = (name: string) => setWorkout(p => ({ ...p, name }));

  const addSec = (mode: TimerMode) => {
    setWorkout(p => ({ ...p, sections: [...p.sections, newSection(mode)] }));
  };

  const addPresetSection = (section: Section) => {
    setWorkout(p => ({ ...p, sections: [...p.sections, { ...section, id: crypto.randomUUID(), exercises: section.exercises.map(e => ({ ...e, id: crypto.randomUUID() })) }] }));
  };

  const updSec = (i: number, s: Section) => {
    setWorkout(p => {
      const s2 = [...p.sections];
      s2[i] = s;
      return { ...p, sections: s2 };
    });
  };

  const delSec = (i: number) => {
    setWorkout(p => ({ ...p, sections: p.sections.filter((_, j) => j !== i) }));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    updSec(i, workout.sections[i - 1]);
    updSec(i - 1, workout.sections[i]);
  };

  const moveDown = (i: number) => {
    if (i >= workout.sections.length - 1) return;
    updSec(i, workout.sections[i + 1]);
    updSec(i + 1, workout.sections[i]);
  };

  // ─── Save ──────────────────────────────────────────
  const handleSave = async () => {
    const withReps = workout.sections.map(s => ({
      ...s,
      totalRepsPerTour: s.exercises.reduce((a, e) => a + (e.reps || 0), 0),
    }));
    await saveWorkout({ ...workout, sections: withReps });
    onSave({ ...workout, sections: withReps });
  };

  // ─── Modal open/close helpers ──────────────────────
  const openTimer = (i: number) => { setEditIdx(i); setView('timer'); };
  const closeTimer = () => setView('main');
  const saveTimerConfig = (s: TimerConfigData): Section => ({
    ...workout.sections[editIdx],
    label: s.label, mode: s.mode, workSec: s.workSec, restSec: s.restSec,
    emomSec: s.emomSec, totalTours: s.totalTours, restBetweenExercises: s.restBetweenExercises,
    restBetweenBlocks: s.restBetweenBlocks, fortimeDuration: s.fortimeDuration,
  });

  const openExercises = (i: number) => { setEditIdx(i); setView('exercises'); };
  const closeExercises = () => setView('main');
  const saveExercisesConfig = (s: SectionForExercises): Section => ({
    ...workout.sections[editIdx],
    label: s.label, exercises: s.exercises, mode: workout.sections[editIdx].mode,
    workSec: workout.sections[editIdx].workSec, restSec: workout.sections[editIdx].restSec,
    emomSec: workout.sections[editIdx].emomSec, totalTours: workout.sections[editIdx].totalTours,
    restBetweenExercises: workout.sections[editIdx].restBetweenExercises,
    restBetweenBlocks: workout.sections[editIdx].restBetweenBlocks,
    fortimeDuration: workout.sections[editIdx].fortimeDuration,
  });

  const toggleExpand = (id: string) => setExpandedMap(p => ({ ...p, [id]: !p[id] }));

  // ─── Unique modes for header badges ────────────────
  const uniqueModes = [...new Set(workout.sections.map(s => s.mode))];

  return (
    <>
      <div className="phdr">
        <button className="btn bg" onClick={onCancel}>{'←'} Retour</button>
        <h1>{workout.name || 'Entraînement'}</h1>
        <button className="btn bp" onClick={handleSave}>{'✓'}</button>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <input
          type="text"
          placeholder="Nom de l'entraînement"
          value={workout.name}
          onChange={e => updateName(e.target.value)}
          style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}
        />

        {uniqueModes.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {uniqueModes.map(m => (
              <span key={m} className={`smb mt-${m === 'amrap' ? 'a' : m === 'fortime' ? 'f' : m === 'emom' ? 'e' : 't'}`} style={{ fontSize: '.625rem' }}>
                {MODE_ICONS[m]} {m.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {workout.sections.map((s, i) => (
          <SectionRow
            key={s.id}
            section={{ ...s, _expanded: !!expandedMap[s.id] } as SectionView}
            index={i}
            onExpand={() => toggleExpand(s.id)}
            onTimer={() => openTimer(i)}
            onExercises={() => openExercises(i)}
            onDelete={() => delSec(i)}
          />
        ))}

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '.875rem', color: '#888', marginBottom: 12 }}>Ajouter une section</p>
          <div className="preset-grid">
            {presetWorkoutSections().map(section => (
              <button key={section.label} className="btn preset-btn" onClick={() => addPresetSection(section)}>
                {section.label}
              </button>
            ))}
          </div>
          <div className="msel">
            {(['amrap', 'fortime', 'emom', 'tabata'] as TimerMode[]).map(mode => (
              <button key={mode} className="mo-opt" onClick={() => addSec(mode)}>
                <span className="moi">{MODE_ICONS[mode]}</span>
                <span className="mon">{MODE_NAMES[mode]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'timer' && editIdx >= 0 && (
        <TimerConfigModal section={workout.sections[editIdx] as unknown as TimerConfigData} onSave={(s) => updSec(editIdx, saveTimerConfig(s))} onClose={closeTimer} />
      )}
      {view === 'exercises' && editIdx >= 0 && (
        <ExerciseEditorModal section={workout.sections[editIdx] as unknown as SectionForExercises} onSave={(s) => updSec(editIdx, saveExercisesConfig(s))} onClose={closeExercises} />
      )}
    </>
  );
};
