import React from 'react';
import type { Exercise, TimerMode } from '../types/workout';

export interface SectionForExercises {
  label: string;
  mode: TimerMode;
  exercises: Exercise[];
}

interface Props {
  section: SectionForExercises;
  onSave: (updated: SectionForExercises) => void;
  onClose: () => void;
}

export const ExerciseEditorModal: React.FC<Props> = ({ section, onSave, onClose }) => {
  const addExercise = () => onSave({ ...section, exercises: [...section.exercises, { id: crypto.randomUUID(), name: '', reps: 0, durationSec: 0 }] });

  const removeExercise = (id: string) =>
    onSave({ ...section, exercises: section.exercises.filter(e => e.id !== id) });

  const updateField = (id: string, field: keyof Exercise, value: unknown) => {
    const exercises = section.exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex);
    onSave({ ...section, exercises });
  };

  return (
    <div className="mo" onClick={onClose}>
      <div className="ms" onClick={e => e.stopPropagation()}>
        <h2 className="mtt">{'🏋️'} Exercices</h2>
        <p style={{ fontSize: '.813rem', color: '#888', marginBottom: 16 }}>Exercices de cette section</p>

        {section.exercises.map((ex, i) => (
          <div key={ex.id} className="ei" style={{ borderBottom: '1px solid #333' }}>
            <span style={{ color: '#888', fontSize: '.75rem' }}>{i + 1}.</span>
            <input type="text" placeholder="Nom" value={ex.name} onChange={e => updateField(ex.id, 'name', e.target.value)} style={{ flex: 1 }} />
            <div className="irow ex-fields">
              <input type="number" min={0} placeholder="0" value={ex.reps || ''} onChange={e => updateField(ex.id, 'reps', +e.target.value || 0)} style={{ width: 54 }} />
              <label style={{ fontSize: '.75rem' }}>rep.</label>
              <input type="number" min={0} placeholder="0" value={ex.durationSec || ''} onChange={e => updateField(ex.id, 'durationSec', +e.target.value || 0)} style={{ width: 54 }} />
              <label style={{ fontSize: '.75rem' }}>sec</label>
            </div>
            <button className="btn bs" style={{ color: '#ff6b6b' }} onClick={() => removeExercise(ex.id)}>{'✕'}</button>
          </div>
        ))}

        <button className="btn bs bp" style={{ width: '100%', marginTop: 8, marginBottom: 16 }} onClick={addExercise}>+ Ajouter</button>
        <button className="btn bp" style={{ width: '100%' }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
};
