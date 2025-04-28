import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'PlankYouDB';
const DB_VERSION = 1;

// Define the structure of your database
interface PlankYouDBSchema extends DBSchema {
  // Define object stores here, e.g.:
  // userProfile: {
  //   key: string; // e.g., 'currentUser'
  //   value: UserProfileType;
  // };
  bodyMetrics: {
    key: string; // ISO date string
    value: import('./types').BodyMetrics;
    indexes: { 'date': string };
  };
  workouts: {
    key: string; // workout id
    value: import('./types').Workout;
    indexes: { 'plannedAt': string, 'type': string };
  };
  meals: {
    key: string; // meal id
    value: import('./types').Meal;
    indexes: { 'timestamp': string };
  };
  // Add other stores as needed (e.g., settings, fitbitData)
}

let dbPromise: Promise<IDBPDatabase<PlankYouDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<PlankYouDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PlankYouDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);

        // Create object stores based on the schema version
        if (oldVersion < 1) {
          // Example: db.createObjectStore('userProfile');
          const metricsStore = db.createObjectStore('bodyMetrics', { keyPath: 'date' });
          metricsStore.createIndex('date', 'date');

          const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
          workoutStore.createIndex('plannedAt', 'plannedAt');
          workoutStore.createIndex('type', 'type');

          const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
          mealStore.createIndex('timestamp', 'timestamp');
        }
        // Add further upgrade steps for future versions here
        // if (oldVersion < 2) { ... }
      },
    });
  }
  return dbPromise;
}

// Example usage functions (add more specific functions as needed)

export async function getAllBodyMetrics(): Promise<import('./types').BodyMetrics[]> {
  const db = await getDb();
  return db.getAll('bodyMetrics');
}

export async function addBodyMetric(metric: import('./types').BodyMetrics): Promise<void> {
  const db = await getDb();
  await db.put('bodyMetrics', metric);
}

export async function getWorkout(id: string): Promise<import('./types').Workout | undefined> {
    const db = await getDb();
    return db.get('workouts', id);
}

export async function saveWorkout(workout: import('./types').Workout): Promise<void> {
    const db = await getDb();
    await db.put('workouts', workout);
}

// Function to get all workouts
export async function getAllWorkouts(): Promise<import('./types').Workout[]> {
  const db = await getDb();
  return db.getAll('workouts');
}

// Function to delete a workout
export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('workouts', id);
}

// Add functions for other stores (meals, userProfile, settings etc.)

console.log('IndexedDB utility initialized.'); 