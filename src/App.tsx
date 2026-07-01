import { useState, useEffect } from 'react'
import type { Workout, Section } from './types/workout'
import { presetWorkout, unlockAudio } from './types/workout'
import { loadWorkouts, saveWorkout, deleteWorkout, newSection } from './lib/storage'
import { WorkoutList } from './components/WorkoutList'
import { WorkoutEditor } from './components/WorkoutEditor'
import { ActiveWorkoutView } from './components/ActiveWorkoutView'
import { WorkoutSummary } from './components/WorkoutSummary'

type View = 'list' | 'editor' | 'active' | 'summary'

const DEFAULT_WORKOUT_SEEDED_KEY = 'seconds_default_workout_seeded'

function freshSections(sections: Section[]): Section[] {
  return sections.map(s => ({ ...newSection(), id: s.id, label: s.label, mode: s.mode, workSec: s.workSec, restSec: s.restSec, emomSec: s.emomSec, totalTours: s.totalTours, restBetweenExercises: s.restBetweenExercises, restBetweenBlocks: s.restBetweenBlocks, fortimeDuration: s.fortimeDuration, totalRepsPerTour: 0, toursCompleted: 0, exercises: s.exercises.map(e => ({ ...e })) }))
}

function App() {
  const [view, setView] = useState<View>('list')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [activeSections, setActiveSections] = useState<Section[] | null>(null)
  const [summaryW, setSummaryW] = useState<Workout | null>(null)

  useEffect(() => {
    if (view === 'list' || view === 'editor') {
      loadWorkouts()
        .then(async w => {
          if (w.length === 0 && localStorage.getItem(DEFAULT_WORKOUT_SEEDED_KEY) !== '1') {
            const defaultWorkout = presetWorkout()
            await saveWorkout(defaultWorkout)
            localStorage.setItem(DEFAULT_WORKOUT_SEEDED_KEY, '1')
            setWorkouts([defaultWorkout])
            return
          }
          setWorkouts(w)
        })
        .catch(e => console.error(e))
    }
  }, [view])

  const handleCreate = async () => {
    const w: Workout = presetWorkout()
    await saveWorkout(w)
    setEditId(w.id)
    setView('editor')
  }

  const handleEdit = (id: string) => { setEditId(id); setView('editor') }

  const handleSave = () => { setEditId(null); setView('list') }

  const handleDelete = async (id: string) => { await deleteWorkout(id); setWorkouts(await loadWorkouts()) }

  const handleStart = (w: Workout) => {
    void unlockAudio()
    setActiveSections(freshSections(w.sections))
    setView('active')
  }

  const handleComplete = (completed: Workout) => {
    saveWorkout(completed).then(() => { setSummaryW(completed); setActiveSections(null); setView('summary'); loadWorkouts().then(x => setWorkouts(x)) }).catch(console.error)
  }

  const handleResume = () => {
    if (!summaryW) return
    setActiveSections(freshSections(summaryW.sections))
    setSummaryW(null)
    setView('active')
  }

  return (
    <div className="app">
      {view === 'list' && (
        <WorkoutList workouts={workouts} onCreate={handleCreate} onEdit={handleEdit} onStart={handleStart} onDelete={handleDelete} />
      )}
      {view === 'editor' && editId && (
        <WorkoutEditor workoutId={editId} onSave={handleSave} onCancel={() => setView('list')} />
      )}
      {view === 'active' && activeSections && (
        <ActiveWorkoutView sections={activeSections} onComplete={handleComplete} onAbort={() => { setActiveSections(null); setView('list') }} />
      )}
      {view === 'summary' && summaryW && (
        <WorkoutSummary workout={summaryW} onDone={() => setView('list')} onResume={handleResume} />
      )}
    </div>
  )
}

export default App
