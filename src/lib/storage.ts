import type { Workout } from '../types/workout';

const DB_NAME = 'seconds_db';
const STORE_NAME = 'workouts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadWorkouts(): Promise<Workout[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as Workout[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWorkout(w: Workout): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(w);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function duplicateWorkout(id: string): Promise<Workout | null> {
  const all = await loadWorkouts();
  const original = all.find(w => w.id === id);
  if (!original) return null;
  const copy: Workout = { ...JSON.parse(JSON.stringify(original)), id, name: `${original.name} (copie)`, createdAt: new Date().toISOString(), completedAt: null, totalDurationSec: null };
  await saveWorkout(copy);
  return copy;
}


// Re-export from types for convenience
export { newSection } from '../types/workout'
