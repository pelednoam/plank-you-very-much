'use server';

import { dbGetAllSubscriptions, dbDeleteSubscription } from './notificationSubscriptionStorage';
import webpush, { type PushSubscription, type RequestOptions } from 'web-push';
import { getCurrentUserId } from './auth'; // Use real auth
import { kv } from '@vercel/kv';

// Placeholder: VAPID keys should be loaded securely from environment variables
// Remove module-scoped variables
// const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Set VAPID details - this might still run at module load, check if needed
// We can potentially move this setup inside the function as well if necessary,
// but let's try reading keys inside first.
// Ensure webpush mock is available here.
/* // --- REMOVE Module-level VAPID setup --- 
if (typeof webpush?.setVapidDetails === 'function') {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const secret = process.env.VAPID_PRIVATE_KEY;
    if (key && secret) {
        try {
            webpush.setVapidDetails(
                'mailto:admin@plankyou.app', 
                key,
                secret
            );
            console.log("[WebPush] VAPID details set attempt during module load.");
        } catch (error) {
             console.error("[WebPush] Failed to set VAPID details during module load:", error);
        }
    } else {
        console.warn("[WebPush] VAPID keys not configured at module load time.");
    }
} else {
     console.warn("[WebPush] webpush or setVapidDetails mock not ready at module load.");
}
*/ // --- END REMOVAL --- 

// Placeholder: Function to get upcoming workouts FOR A SPECIFIC USER
// This needs to query a data source (e.g., Vercel KV, database) where plans are stored server-side.
interface PlannedWorkoutForUser {
    // userId: string; // Implicitly known
    workoutId: string; // Unique ID for the workout instance
    workoutType: string;
    plannedAt: string; // ISO DateTime string
    // reminderTime?: string; // ISO DateTime string (e.g., 30 mins before)
}

// Replace with actual query to your database/data source for planned workouts for a specific user
async function getUpcomingWorkoutsForUser(userId: string, fromDate: Date, toDate: Date): Promise<PlannedWorkoutForUser[]> {
    console.log(`[Notifications Action] Fetching workouts for user ${userId} between ${fromDate.toISOString()} and ${toDate.toISOString()} (PLACEHOLDER - NO ACTUAL FETCH)`);
    
    // --- SIMULATE FETCHING AND FILTERING --- 
    // In a real implementation, you'd query your DB/KV store here using userId and the date range.
    // For testing, let's return a mock workout if the userId matches the one we expect in tests.
    // This mock should only trigger if the trigger time aligns.
    const MOCK_USER_PLANS: Record<string, PlannedWorkoutForUser[]> = {
        // Example: User 'test-user-123' has a CORE workout planned soon
        'test-user-123': [
            { workoutId: 'workout-abc', workoutType: 'CORE', plannedAt: new Date(Date.now() + 15 * 60000).toISOString() },
            { workoutId: 'workout-def', workoutType: 'SWIM', plannedAt: new Date(Date.now() + 2 * 60 * 60000).toISOString() }, // Too far out
        ],
        'other-user-456': [
            { workoutId: 'workout-ghi', workoutType: 'CLIMB', plannedAt: new Date(Date.now() + 25 * 60000).toISOString() },
        ]
    };
    
    const userWorkouts = MOCK_USER_PLANS[userId] || [];
    
    // Filter the simulated workouts based on the provided date range
    return userWorkouts.filter(workout => {
        const plannedTime = new Date(workout.plannedAt);
        return plannedTime >= fromDate && plannedTime <= toDate;
    });
    // --- END SIMULATION ---
}

export async function triggerWorkoutReminders(withinMinutes: number = 35): Promise<{ success: boolean; sent: number; failed: number; errors: any[] }> {
    console.log('[Notifications Trigger] Starting workout reminder process...');

    // Read VAPID keys and check configuration
    const currentVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const currentVapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    // --- Setup VAPID Details INSIDE the function --- 
    let vapidSetupOk = false;
    if (webpush && typeof webpush.setVapidDetails === 'function' && currentVapidPublicKey && currentVapidPrivateKey) {
         try {
             webpush.setVapidDetails('mailto:admin@plankyou.app', currentVapidPublicKey, currentVapidPrivateKey);
             console.log("[WebPush] VAPID details set inside trigger function.");
             vapidSetupOk = true;
         } catch (setupError) {
             console.error("[WebPush] Failed to set VAPID details inside trigger function:", setupError);
             // Fall through to the check below
         }
    }
    // --- End VAPID Setup ---
    
    if (!webpush || typeof webpush.sendNotification !== 'function' || !vapidSetupOk) { // Check vapidSetupOk flag
        console.error('[Notifications Trigger] WebPush not configured or VAPID keys missing/invalid. Cannot send.');
        return { success: false, sent: 0, failed: 0, errors: [{ error: 'VAPID keys not configured or web-push unavailable' }] };
    }

    let sentCount = 0;
    let failCount = 0;
    const errors: any[] = [];
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + withinMinutes * 60000);

    try {
        // 1. Get all subscriptions
        const allSubscriptions = await dbGetAllSubscriptions();
        if (allSubscriptions.length === 0) {
            console.log('[Notifications Trigger] No subscriptions found to send reminders to.');
            return { success: true, sent: 0, failed: 0, errors: [] };
        }

        // 2. Group subscriptions by userId
        const subsByUser = allSubscriptions.reduce((acc, storedSub) => {
            if (!acc[storedSub.userId]) {
                acc[storedSub.userId] = [];
            }
            // Ensure we don't add duplicate endpoints per user
            if (!acc[storedSub.userId].some(sub => sub.endpoint === storedSub.subscription.endpoint)) {
                 acc[storedSub.userId].push(storedSub.subscription);
            }
            return acc;
        }, {} as Record<string, PushSubscription[]>);

        // 3. Iterate through users with subscriptions
        const sendPromises: Promise<any>[] = [];
        const notifiedWorkoutIds = new Set<string>(); // Prevent duplicate reminders for the same workout if user has multiple devices

        for (const userId in subsByUser) {
            console.log(`[Notifications Trigger] Checking user ${userId} for upcoming workouts...`);
            const userSubscriptions = subsByUser[userId];

            // 4. Fetch upcoming workouts for this specific user (using placeholder)
            const upcomingWorkouts = await getUpcomingWorkoutsForUser(userId, now, cutoffTime);

            if (upcomingWorkouts.length === 0) {
                console.log(`[Notifications Trigger] No workouts needing reminders for user ${userId}.`);
                continue; // Move to the next user
            }

            // 5. Prepare and send notifications for this user's workouts
            for (const workout of upcomingWorkouts) {
                 // Skip if we already sent a notification for this workout (e.g., to another device of the same user)
                 if (notifiedWorkoutIds.has(workout.workoutId)) continue;

                const payload = JSON.stringify({
                    title: 'Workout Reminder',
                    body: `${workout.workoutType} session starting soon!`,
                    tag: `workout-reminder-${workout.workoutId}`, // Use workout ID for coalescing
                    data: { url: '/planner' } // Add URL for click action
                });

                console.log(`[Notifications Trigger] Found upcoming workout ${workout.workoutId} (${workout.workoutType}) for user ${userId}. Sending to ${userSubscriptions.length} device(s).`);

                for (const subscription of userSubscriptions) {
                    if (!subscription || !subscription.endpoint) continue;

                    console.log(`[Notifications Trigger] Preparing to send reminder for ${workout.workoutId} to endpoint: ${subscription.endpoint.substring(0, 30)}...`);

                    // Use actual web-push sendNotification (same logic as before for success/failure/delete)
                    const sendPromise = webpush.sendNotification(subscription, payload)
                        .then(result => {
                            // ... (same success handling as before)
                             console.log(`[Notifications Trigger] Sent reminder successfully to ${subscription.endpoint.substring(0, 30)}... Status: ${result.statusCode}`);
                             return { success: true }; 
                        })
                        .catch(error => {
                            // ... (same error handling and subscription deletion logic as before)
                             console.error(`[Notifications Trigger] Failed to send reminder to ${subscription.endpoint.substring(0, 30)}... Status: ${error.statusCode}, Body: ${error.body}`);
                             const errorDetails = { userId: userId, endpoint: subscription.endpoint, statusCode: error.statusCode, message: error.body }; // Capture error details
                             if (error.statusCode === 410 || error.statusCode === 404) {
                                 console.warn(`[Notifications Trigger] Subscription ${subscription.endpoint.substring(0, 30)} is invalid (${error.statusCode}). Deleting.`);
                                 dbDeleteSubscription(subscription.endpoint).catch(deleteError => {
                                     console.error(`[Notifications Trigger] Failed to delete invalid subscription ${subscription.endpoint.substring(0, 30)}:`, deleteError);
                                 });
                             }
                             return { success: false, error: errorDetails }; 
                        });
                    sendPromises.push(sendPromise);
                }
                 notifiedWorkoutIds.add(workout.workoutId); // Mark workout as notified
            }
        }

        // 6. Wait for all send attempts to complete and tally results (same as before)
        const results = await Promise.allSettled(sendPromises);
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    sentCount++;
                } else {
                    failCount++;
                    if (result.value.error) errors.push(result.value.error);
                }
            } else {
                 console.error("[Notifications Trigger] Unexpected promise rejection wasn't caught earlier:", result.reason);
                 failCount++;
                 errors.push({ error: 'unexpected_promise_rejection', reason: String(result.reason) });
            }
        });

        console.log(`[Notifications Trigger] Reminder process finished. Sent: ${sentCount}, Failed: ${failCount}`);
        if (errors.length > 0) {
            console.warn("[Notifications Trigger] Errors encountered:", errors);
        }
        return { success: true, sent: sentCount, failed: failCount, errors: errors };

    } catch (error) {
        console.error('[Notifications Trigger] Unexpected error during reminder process:', error);
        return { success: false, sent: sentCount, failed: failCount, errors: [{ error: 'unknown_trigger_error', message: String(error) }] };
    }
}

// Ensure VAPID keys are set in environment variables
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error("VAPID keys are not configured in environment variables.");
  // Optionally throw an error during startup if critical
  // throw new Error("VAPID keys must be configured");
}

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your contact email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const getUserSubscriptionsKey = (userId: string) => `subscriptions:user:${userId}`;

// --- Fetch User Subscriptions --- 
async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
  const userSubsKey = getUserSubscriptionsKey(userId);
  try {
    const subscriptionStrings = await kv.smembers(userSubsKey);
    const subscriptions: PushSubscription[] = [];
    for (const subString of subscriptionStrings) {
      try {
        const sub = JSON.parse(subString) as PushSubscription;
        // Basic validation again before adding
        if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
            subscriptions.push(sub);
        } else {
             console.warn(`[Push Service] Found invalid subscription string in KV for user ${userId}:`, subString);
             // Optionally remove invalid data here: await kv.srem(userSubsKey, subString);
        }
      } catch (parseError) {
        console.error(`[Push Service] Error parsing subscription for user ${userId} from KV: ${subString}`, parseError);
         // Optionally remove invalid data here: await kv.srem(userSubsKey, subString);
      }
    }
    console.log(`[Push Service] Found ${subscriptions.length} valid subscriptions for user ${userId}.`);
    return subscriptions;
  } catch (error) {
    console.error(`[Push Service] Error fetching subscriptions for user ${userId} from KV:`, error);
    return [];
  }
}

// --- Remove Subscription (Helper) --- 
async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const userSubsKey = getUserSubscriptionsKey(userId);
   console.log(`[Push Service] Attempting to remove subscription with endpoint ${endpoint} for user ${userId} due to push failure.`);
   try {
       const currentSubscriptions = await kv.smembers(userSubsKey);
       for (const subString of currentSubscriptions) {
           try {
               const sub = JSON.parse(subString);
               if (sub.endpoint === endpoint) {
                   await kv.srem(userSubsKey, subString);
                   console.log(`[Push Service] Removed stale subscription for user ${userId}, endpoint: ${endpoint}`);
                   break; // Assume endpoint is unique
               }
           } catch { /* Ignore parse errors during cleanup */ }
       }
   } catch (error) {
        console.error(`[Push Service] Error removing stale subscription for user ${userId}, endpoint: ${endpoint}:`, error);
   }
}

// --- Send Notification Action --- 

/**
 * Sends a push notification to all registered devices for the CURRENTLY logged-in user.
 * Assumes VAPID details are set.
 * @param payload - The notification payload (string or object).
 * @param options - Optional web-push options (e.g., TTL).
 */
export async function sendNotificationToCurrentUser(payload: string | object, options?: RequestOptions): Promise<void> {
   const userId = await getCurrentUserId();
   if (!userId) {
     console.warn("[Push Service] Cannot send notification: User not authenticated.");
     return;
   }

   const subscriptions = await getUserSubscriptions(userId);
   if (subscriptions.length === 0) {
     console.log(`[Push Service] No subscriptions found for user ${userId}. Notification not sent.`);
     return;
   }

   console.log(`[Push Service] Sending notification to ${subscriptions.length} subscriptions for user ${userId}. Payload:`, payload);

   const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

   const sendPromises = subscriptions.map(subscription => 
     webpush.sendNotification(subscription, payloadString, options)
       .then(response => {
         console.log(`[Push Service] Successfully sent notification to endpoint: ...${subscription.endpoint.slice(-6)}. Status: ${response.statusCode}`);
       })
       .catch(error => {
         console.error(`[Push Service] Error sending notification to endpoint: ...${subscription.endpoint.slice(-6)}. Status: ${error.statusCode}. Body: ${error.body}`, error);
         // Handle specific errors
         if (error.statusCode === 404 || error.statusCode === 410) {
           // Subscription is invalid or expired, remove it
           removeSubscription(userId, subscription.endpoint);
         } else {
           // Log other errors, might indicate VAPID key issues, network problems, etc.
           console.error("[Push Service] Unhandled push error:", error);
         }
       })
   );

   // Wait for all pushes to attempt sending
   await Promise.allSettled(sendPromises);
   console.log(`[Push Service] Finished attempting to send notifications to user ${userId}.`);
}

// Example Usage (e.g., from a server action triggered by a reminder): 
// async function sendWorkoutReminder() {
//   const payload = {
//     title: "Workout Reminder",
//     body: "Time for your scheduled core session!",
//     icon: "/logo.png", // Optional icon
//     // data: { url: '/planner' } // Optional data to open a specific page on click
//   };
//   await sendNotificationToCurrentUser(payload);
// } 