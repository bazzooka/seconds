import React from 'react';
import type { TimerMode } from '../types/workout';
import { MODE_ICONS, MODE_NAMES } from '../types/workout';

export interface TimerConfigData {
  label: string;
  mode: TimerMode;
  workSec: number;
  restSec: number;
  emomSec: number;
  totalTours: number | undefined;
  restBetweenExercises: number;
  restBetweenBlocks: number;
  fortimeDuration: number;
}

interface Props {
  section: TimerConfigData;
  onSave: (updated: TimerConfigData) => void;
  onClose: () => void;
}

const MODES: TimerMode[] = ['amrap', 'fortime', 'emom', 'tabata'];

export const TimerConfigModal: React.FC<Props> = ({ section, onSave, onClose }) => {
  const set = (f: keyof TimerConfigData, v: unknown) => onSave({ ...section, [f]: v });
  const setMany = (patch: Partial<TimerConfigData>) => onSave({ ...section, ...patch });
  const renderLimitSelector = (label: string, durationDefault: number, tourLabel: string) => (
    <>
      <label className="fl">{label}</label>
      <div className="msel">
        <button className={`mo-opt${section.fortimeDuration <= 0 ? ' sel' : ''}`} onClick={() => set('fortimeDuration', 0)}>
          <span className="mon">Tours</span>
        </button>
        <button className={`mo-opt${section.fortimeDuration > 0 ? ' sel' : ''}`} onClick={() => setMany({ fortimeDuration: durationDefault, totalTours: undefined })}>
          <span className="mon">Durée</span>
        </button>
      </div>
      {section.fortimeDuration > 0 ? (
        <div className="irow" style={{ marginBottom: 12 }}>
          <input type="number" min={10} max={7200} value={section.fortimeDuration} onChange={e => setMany({ fortimeDuration: Math.max(10, +e.target.value || 10), totalTours: undefined })} />
          <label>secondes au total</label>
        </div>
      ) : (
        <div className="irow" style={{ marginBottom: 12 }}>
          <input type="number" min={1} value={section.totalTours || ''} onChange={e => set('totalTours', e.target.value ? Math.max(1, +e.target.value) : undefined)} />
          <label>{section.totalTours ? tourLabel : 'illimité'}</label>
        </div>
      )}
    </>
  );

  return (
    <div className="mo" onClick={onClose}>
      <div className="ms" onClick={e => e.stopPropagation()}>
        <h2 className="mtt">{'⏱'} Configurer le timer</h2>

        <label className="fl">Nom de la section</label>
        <input type="text" placeholder="Ex: Échauffement, Bloc 1..." value={section.label} onChange={e => set('label', e.target.value)} style={{ marginBottom: 16 }} />

        <label className="fl">Mode</label>
        <div className="msel">
          {MODES.map(mode => (
            <button key={mode} className={`mo-opt${section.mode === mode ? ' sel' : ''}`} onClick={() => set('mode', mode)}>
              <span className="moi">{MODE_ICONS[mode]}</span>
              <span className="mon">{MODE_NAMES[mode]}</span>
            </button>
          ))}
        </div>

        {section.mode === 'tabata' && (
          <>
            <label className="fl">Durée effort / repos</label>
            <div className="irow" style={{ marginBottom: 12 }}>
              <input type="number" min={5} max={300} value={section.workSec} onChange={e => set('workSec', Math.max(5, +e.target.value || 5))} />
              <label>sec effort</label><span style={{ color: '#888' }}>/</span>
              <input type="number" min={3} max={120} value={section.restSec} onChange={e => set('restSec', Math.max(3, +e.target.value || 3))} />
              <label>sec repos</label>
            </div>
            {renderLimitSelector('Limite TABATA', 480, 'cycle(s)')}
          </>
        )}

        {section.mode === 'amrap' && renderLimitSelector('Limite AMRAP', 300, 'tour(s)')}

        {section.mode === 'emom' && (
          <>
            <label className="fl">Intervalle EMOM</label>
            <div className="irow" style={{ marginBottom: 12 }}>
              <input type="number" min={5} max={3600} value={section.emomSec} onChange={e => set('emomSec', Math.max(5, +e.target.value || 5))} />
              <label>secondes</label>
            </div>
          </>
        )}

        {section.mode === 'fortime' && (
          <>
            <label className="fl">{section.totalTours ? 'Nombre de tours' : 'Tours (laisser vide = illimité)'}</label>
            <div className="irow" style={{ marginBottom: 12 }}>
              <input type="number" min={1} placeholder={'∞'} value={section.totalTours || ''} onChange={e => set('totalTours', e.target.value ? +e.target.value : undefined)} />
              <label>{section.totalTours ? 'tour(s)' : 'illimité'}</label>
            </div>
          </>
        )}

        {section.mode === 'fortime' && (
          <>
            <label className="fl">Durée du timer FOR TIME</label>
            <div className="irow" style={{ marginBottom: 12 }}>
              <input type="number" min={1} placeholder="Illimité" value={section.fortimeDuration > 0 ? section.fortimeDuration : ''} onChange={e => set('fortimeDuration', Math.max(1, +e.target.value || 0))} style={{ width: 70 }} />
              <label>secondes</label>
            </div>
          </>
        )}

        <div className="card" style={{ background: 'var(--bg-i)', border: '1px solid #333' }}>
          <p className="fl" style={{ marginBottom: 8 }}>Récupération</p>
          <div className="irow" style={{ marginBottom: 8 }}>
            <input type="number" min={0} max={300} value={section.restBetweenExercises} onChange={e => set('restBetweenExercises', Math.max(0, +e.target.value || 0))} style={{ width: 70 }} />
            <label>sec entre exercices</label>
          </div>
          <div className="irow">
            <input type="number" min={0} max={600} value={section.restBetweenBlocks} onChange={e => set('restBetweenBlocks', Math.max(0, +e.target.value || 0))} style={{ width: 70 }} />
            <label>{section.totalTours && section.totalTours > 1 ? 'sec entre tours' : 'sec après le bloc'}</label>
          </div>
        </div>

        <button className="btn bp" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
};
