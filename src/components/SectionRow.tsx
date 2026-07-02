import React from 'react';
import type { Exercise, TimerMode } from '../types/workout';
import { MODE_ICONS, fmt } from '../types/workout';

interface Props {
  section: SectionView;
  index: number;
  onExpand: () => void;
  onTimer: () => void;
  onExercises: () => void;
  onDelete: () => void;
}

export interface SectionView {
  label: string;
  mode: TimerMode;
  totalTours: number | undefined;
  workSec: number;
  restSec: number;
  fortimeDuration: number;
  restBetweenBlocks: number;
  restBetweenExercises: number;
  exercises: Exercise[];
  _expanded: boolean;
}

const MODE_CLASSES: Record<TimerMode, string> = {
  amrap: 'a', fortime: 'f', emom: 'e', tabata: 't',
};

export const SectionRow: React.FC<Props> = ({ section, index, onExpand, onTimer, onExercises, onDelete }) => (
  <div className="sc">
    <div className="sch" onClick={onExpand}>
      <span style={{ color: '#888', fontSize: '.75rem' }}>{index + 1}.</span>
      <span className={`smb mt-${MODE_CLASSES[section.mode]}`}>
        {MODE_ICONS[section.mode]} {section.mode.toUpperCase()}
      </span>
      <span className="slt">{section.label || 'Sans titre'}</span>
      {section.fortimeDuration > 0 ? (
        <span style={{ fontSize: '.688rem', color: '#888' }}>
          Durée {fmt(section.fortimeDuration)}
        </span>
      ) : section.totalTours && (
        <span style={{ fontSize: '.688rem', color: '#888' }}>
          {section.totalTours} tours
        </span>
      )}
      {section.restBetweenBlocks > 0 && (
        <span style={{ fontSize: '.688rem', color: '#ffa94d' }}>
          {'⏱'} {fmt(section.restBetweenBlocks)}
        </span>
      )}
    </div>
    {section._expanded && (
      <div className="scb">
        <div className="section-preview">
          {section.mode === 'tabata' && (
            <div className="preview-meta">{section.workSec}s effort / {section.restSec}s repos</div>
          )}
          {section.fortimeDuration > 0 && (
            <div className="preview-meta">Durée du bloc: {fmt(section.fortimeDuration)}</div>
          )}
          {section.restBetweenExercises > 0 && (
            <div className="preview-meta">Repos exercices: {fmt(section.restBetweenExercises)}</div>
          )}
          {section.restBetweenBlocks > 0 && (
            <div className="preview-meta">
              {section.totalTours && section.totalTours > 1 ? 'Repos entre tours' : 'Repos après bloc'}: {fmt(section.restBetweenBlocks)}
            </div>
          )}
          {section.exercises.map(ex => (
            <div key={ex.id} className="preview-ex">
              <span>{ex.name || 'Exercice sans nom'}</span>
              <strong>
                {ex.reps > 0 ? `${ex.reps} rep.` : ''}
                {ex.reps > 0 && ex.durationSec > 0 ? ' / ' : ''}
                {ex.durationSec > 0 ? `${ex.durationSec}s` : ''}
              </strong>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          <button className="btn bs bp" onClick={onTimer}>{'⏱'} Timer</button>
          <button className="btn bs bp" onClick={onExercises}>{'🏋️'} Exercices</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn bs bg" style={{ flex: 1 }} onClick={onExpand}>Réduire</button>
          <button className="btn bs bd" onClick={onDelete}>Supprimer</button>
        </div>
      </div>
    )}
  </div>
);
