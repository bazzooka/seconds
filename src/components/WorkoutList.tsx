import React from 'react';
import type { Workout } from '../types/workout';
import { MODE_ICONS, formatDate, fmt } from '../types/workout';

interface Props {
  workouts: Workout[];
  onCreate: () => void;
  onEdit: (id: string) => void;
  onStart: (workout: Workout) => void;
  onDelete: (id: string) => void;
}

export const WorkoutList: React.FC<Props> = ({ workouts, onCreate, onEdit, onStart, onDelete }) => (
  <>
    <div className="phdr">
      <h1>{'⏱'} Seconds</h1>
      <button className="btn bp" onClick={onCreate}>+ Nouveau</button>
    </div>
    <div style={{ padding: '0 20px 24px' }}>
      {workouts.length === 0 ? (
        <div className="es">
          <div className="eii">{'🏋️'}</div>
          <div className="etxt">Pas encore d'entraînement.<br />Crée ta première session !</div>
        </div>
      ) : (
        workouts.slice().reverse().map(w => (
          <WorkoutCard key={w.id} workout={w} onEdit={() => onEdit(w.id)} onStart={() => onStart(w)} onDelete={() => onDelete(w.id)} />
        ))
      )}
    </div>
  </>
);

interface WorkoutCardProps {
  workout: Workout;
  onEdit: () => void;
  onStart: () => void;
  onDelete: () => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onEdit, onStart, onDelete }) => (
  <div className="wc fade-in" onClick={onEdit}>
    <div className="wch">
      <span className="wcn">{workout.name}</span>
      <div className="wca" onClick={e => e.stopPropagation()}>
        <button className="btn bs bp" style={{ marginRight: 4 }} onClick={onStart}>{'▶'}</button>
        <button className="btn bs bg" onClick={onDelete}>{'🗑️'}</button>
      </div>
    </div>
    <div className="wcm">
      {workout.sections.length} sect. {'·'} {formatDate(workout.createdAt)}
      {workout.completedAt && <span style={{ color: '#69db7c' }}> {'✓'} {fmt(workout.totalDurationSec)}</span>}
    </div>
  </div>
);

