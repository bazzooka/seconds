import React from 'react';
import type { Workout } from '../types/workout';
import { MODE_ICONS, MODE_NAMES, fmt } from '../types/workout';

interface Props {
  workout: Workout;
  onDone: () => void;
  onResume: () => void;
}

export const WorkoutSummary: React.FC<Props> = ({ workout, onDone, onResume }) => (
  <div style={{ padding: '24px 20px', minHeight: '100dvh' }}>
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>{'🎉'}</div>
      <h1 style={{ fontSize: '1.5rem', color: '#4ecdc4' }}>{workout.name}</h1>
      <p style={{ color: '#888', marginTop: 4, fontSize: '.875rem' }}>{fmt(workout.totalDurationSec)} complété</p>
    </div>
    <div className="card">
      {workout.sections.map((s, i) => (
        <div key={s.id} className="ss">
          <div className="sl2">{i + 1}. {s.label || 'Section'}</div>
          <div className="sv2" style={{ color: '#4ecdc4' }}>
            {MODE_ICONS[s.mode]} {MODE_NAMES[s.mode]} — {s.toursCompleted} tour{s.toursCompleted !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button className="btn bp" style={{ flex: 1 }} onClick={onResume}>{'▶'} Recommencer</button>
      <button className="btn bg" style={{ flex: 1 }} onClick={onDone}>{'✓'} Terminé</button>
    </div>
  </div>
);

