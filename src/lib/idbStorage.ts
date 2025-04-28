import { openDB, DBSchema, IDBPDatabase } from 'idb';
// Import the specific type for persist middleware storage
import { PersistStorage, StorageValue } from 'zustand/middleware';

// Define the schema for our IndexedDB database
interface PlankYouDB extends DBSchema {
  'zustand-storage': {
    key: string; // Store name (e.g., 'user-profile-storage')
    // Store the structured value expected by persist middleware
    value: StorageValue<any>;
  };
  // Potentially add other object stores later if needed for more complex queries
  // e.g., 'workouts', 'metrics', etc.
}

const DB_NAME = 'PlankYouDB';
const DB_VERSION = 1;
const STORE_NAME = 'zustand-storage';

let dbPromise: Promise<IDBPDatabase<PlankYouDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PlankYouDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlankYouDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        // Add other stores or indexes here if needed in future versions
      },
    });
  }
  return dbPromise;
}

// Custom Zustand storage adapter using idb, typed for persist middleware
export function createIdbStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name: string): Promise<StorageValue<S> | null> => {
      console.log(`${name} - getting item from idb`);
      const db = await getDb();
      const value = await db.get(STORE_NAME, name);
      // Returns the value as stored, which should be StorageValue<S> or undefined
      return value !== undefined ? value : null;
    },
    setItem: async (name: string, value: StorageValue<S>): Promise<void> => {
      console.log(`${name} - setting item in idb`, value);
      const db = await getDb();
      // Store the entire StorageValue object (which includes state and version)
      await db.put(STORE_NAME, value, name);
    },
    removeItem: async (name: string): Promise<void> => {
      console.log(`${name} - removing item from idb`);
      const db = await getDb();
      await db.delete(STORE_NAME, name);
    },
  };
}

// We might not need a generic export anymore if each store creates its own instance
// export const idbStorage = createIdbStorage(); // Keep if needed globally

// Helper function to clear the specific Zustand storage table
export const clearIdbStorage = async (): Promise<void> => {
  console.log('Clearing Zustand IDB storage');
  const db = await getDb();
  await db.clear(STORE_NAME);
}; 