// src/lib/notificationSubscriptionStorage.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { PushSubscription } from 'web-push'; // Use type only

const DB_NAME = 'plankyou-db';
const STORE_NAME = 'pushSubscriptions';
const DB_VERSION = 1; // Increment if schema changes

interface StoredSubscription {
    userId: string; // Keep userId associated with the subscription
    subscription: PushSubscription;
}

// Define the schema for the database
interface PlankYouDB {
    [STORE_NAME]: {
        key: string; // endpoint
        value: StoredSubscription;
        indexes: { 'userId': string }; // Index by userId for potential future use
    };
    // Add other stores here if needed, e.g., 'userProfile', 'metrics'
    // Ensure DB version is updated if other stores are added/modified
}

let dbPromise: Promise<IDBPDatabase<PlankYouDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PlankYouDB>> {
    if (!dbPromise) {
        dbPromise = openDB<PlankYouDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}...`);
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'subscription.endpoint' });
                    // Index by userId for fetching subscriptions for a specific user
                    store.createIndex('userId', 'userId'); 
                     console.log(`Created object store: ${STORE_NAME}`);
                }
                // Handle other potential upgrades here based on oldVersion
            },
            blocked() {
                 console.error('[IDB] Database upgrade blocked. Please close other tabs/windows using the app.');
                 // Potentially alert the user
            },
            blocking() {
                console.warn('[IDB] Database upgrade is blocking other tabs. Closing connection.');
                // db.close(); // Close connection in older tabs
            },
            terminated() {
                 console.error('[IDB] Database connection terminated unexpectedly.');
            },
        });
    }
    return dbPromise;
}

/**
 * Saves or updates a push subscription in IndexedDB.
 * Uses the subscription endpoint as the key.
 * @param userId The application user ID.
 * @param subscription The PushSubscription object.
 */
export async function dbSaveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    if (!subscription || !subscription.endpoint) {
        console.error('[SUBSCRIPTION_STORAGE] Attempted to save invalid subscription.');
        return;
    }
    console.log(`[SUBSCRIPTION_STORAGE] Saving subscription for user ${userId}, endpoint: ${subscription.endpoint}`);
    try {
        const db = await getDb();
        await db.put(STORE_NAME, { userId, subscription });
        console.log(`[SUBSCRIPTION_STORAGE] Subscription saved successfully.`);
    } catch (error) {
        console.error('[SUBSCRIPTION_STORAGE] Error saving subscription:', error);
        throw error; // Re-throw to allow API route to handle it
    }
}

/**
 * Deletes a push subscription from IndexedDB based on its endpoint.
 * @param endpoint The endpoint of the subscription to delete.
 */
export async function dbDeleteSubscription(endpoint: string): Promise<void> {
    if (!endpoint) {
         console.error('[SUBSCRIPTION_STORAGE] Attempted to delete subscription with invalid endpoint.');
        return;
    }
    console.log(`[SUBSCRIPTION_STORAGE] Deleting subscription with endpoint: ${endpoint}`);
    try {
        const db = await getDb();
        await db.delete(STORE_NAME, endpoint);
         console.log(`[SUBSCRIPTION_STORAGE] Subscription deleted successfully (if it existed).`);
    } catch (error) {
        console.error('[SUBSCRIPTION_STORAGE] Error deleting subscription:', error);
         throw error; // Re-throw
    }
}

/**
 * Retrieves all stored push subscriptions from IndexedDB.
 * @returns {Promise<StoredSubscription[]>} A list of all stored subscriptions.
 */
export async function dbGetAllSubscriptions(): Promise<StoredSubscription[]> {
     console.log(`[SUBSCRIPTION_STORAGE] Retrieving all subscriptions.`);
    try {
        const db = await getDb();
        const allSubs = await db.getAll(STORE_NAME);
        console.log(`[SUBSCRIPTION_STORAGE] Found ${allSubs.length} total subscriptions.`);
        return allSubs;
    } catch (error) {
        console.error('[SUBSCRIPTION_STORAGE] Error retrieving all subscriptions:', error);
        return []; // Return empty array on error
    }
}

/**
 * Retrieves subscriptions for a specific user ID from IndexedDB using the 'userId' index.
 * @param userId The application user ID.
 * @returns {Promise<StoredSubscription[]>} A list of subscriptions for the user.
 */
export async function dbGetSubscriptionsByUserId(userId: string): Promise<StoredSubscription[]> {
    console.log(`[SUBSCRIPTION_STORAGE] Retrieving subscriptions for user ${userId}.`);
     if (!userId) return [];
    try {
        const db = await getDb();
        // Use the 'userId' index to efficiently fetch subscriptions for a specific user
        const userSubs = await db.getAllFromIndex(STORE_NAME, 'userId', userId);
         console.log(`[SUBSCRIPTION_STORAGE] Found ${userSubs.length} subscriptions for user ${userId}.`);
        return userSubs;
    } catch (error) {
         console.error(`[SUBSCRIPTION_STORAGE] Error retrieving subscriptions for user ${userId}:`, error);
         return []; // Return empty array on error
    }
} 