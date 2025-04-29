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

// Placeholder: Function to get upcoming workouts (replace with actual data source)
interface PlannedWorkout {
    userId: string;
    workoutType: string;
    plannedAt: string; // ISO DateTime string
    reminderTime?: string; // ISO DateTime string (e.g., 30 mins before)
}

async function getWorkoutsNeedingReminders(withinMinutes: number = 35): Promise<PlannedWorkout[]> {
    console.log('[Notifications Trigger] Fetching workouts needing reminders (PLACEHOLDER DATA).');
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinMinutes * 60000);
    
    // --- Attempt to get current user ID for testing --- 
    let currentUserId = 'MOCK_USER_FOR_REMINDER'; // Default mock ID
    try {
        const userId = await getCurrentUserId(); // Use the actual auth function
        if (userId) {
            currentUserId = userId;
            console.log(`[Notifications Trigger] Using current user ID for mock reminder: ${currentUserId}`);
        } else {
             console.log(`[Notifications Trigger] No current user found, using default mock ID.`);
        }
    } catch (authError) {
        console.error("[Notifications Trigger] Error getting current user ID:", authError);
    }
    // --- End attempt ---

    // Replace with actual query to your database/data source for planned workouts
    const MOCK_PLANNED_WORKOUTS: PlannedWorkout[] = [
        // Add a workout for the current/mock user starting in 15 minutes
        { userId: currentUserId, workoutType: 'TEST_REMINDER_CORE', plannedAt: new Date(now.getTime() + 15 * 60000).toISOString() },
        // Keep other mock workouts for different users
        { userId: 'OTHER_USER_456', workoutType: 'SWIM', plannedAt: new Date(now.getTime() + 20 * 60000).toISOString() },
        { userId: 'USER_789', workoutType: 'CLIMB', plannedAt: new Date(now.getTime() + 60 * 60000).toISOString() }, // Too far away
    ];

    return MOCK_PLANNED_WORKOUTS.filter(workout => {
        const plannedTime = new Date(workout.plannedAt);
        // Reminder if planned between now and cutoff time
        return plannedTime > now && plannedTime <= cutoff;
    });
}

export async function triggerWorkoutReminders(): Promise<{ success: boolean; sent: number; failed: number; errors: any[] }> {
    console.log('[Notifications Trigger] Starting workout reminder process...');

    // Read VAPID keys from process.env *inside* the function
    const currentVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const currentVapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    // Check for keys *inside* the function
    // Also ensure webpush object/mock itself exists
    if (!webpush || typeof webpush.sendNotification !== 'function' || !currentVapidPublicKey || !currentVapidPrivateKey) {
        console.error('[Notifications Trigger] WebPush not configured or VAPID keys missing. Cannot send.');
        // Optionally re-attempt VAPID setup here if keys are present but setup failed initially
        if (webpush && typeof webpush.setVapidDetails === 'function' && currentVapidPublicKey && currentVapidPrivateKey) {
             try {
                 webpush.setVapidDetails('mailto:admin@plankyou.app', currentVapidPublicKey, currentVapidPrivateKey);
                 console.log("[WebPush] Re-attempted VAPID setup inside function.");
                 // Potentially proceed if setup now succeeds, but safer to return error if initial setup failed
             } catch (setupError) {
                 console.error("[WebPush] Failed to set VAPID details inside function:", setupError);
             }
        }
        return { success: false, sent: 0, failed: 0, errors: [{ error: 'VAPID keys not configured or web-push unavailable' }] };
    }

    // Assume VAPID details were set correctly at module load or re-attempted if needed

    let sentCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    try {
        // 1. Get workouts planned soon
        const workoutsToRemind = await getWorkoutsNeedingReminders();
        if (workoutsToRemind.length === 0) {
            console.log('[Notifications Trigger] No workouts found needing reminders currently.');
            return { success: true, sent: 0, failed: 0, errors: [] };
        }

        // 2. Get all subscriptions
        const allSubscriptions = await dbGetAllSubscriptions();
        if (allSubscriptions.length === 0) {
            console.log('[Notifications Trigger] No subscriptions found to send reminders to.');
            return { success: true, sent: 0, failed: 0, errors: [] };
        }

        // 3. Map subscriptions by userId 
        const subsByUser = allSubscriptions.reduce((acc, storedSub) => {
            if (!acc[storedSub.userId]) {
                acc[storedSub.userId] = [];
            }
            acc[storedSub.userId].push(storedSub.subscription);
            return acc;
        }, {} as Record<string, PushSubscription[]>);

        // 4. Prepare and send notifications
        const sendPromises: Promise<any>[] = []; // Store promises from sendNotification
        const sentEndpoints = new Set<string>(); 

        for (const workout of workoutsToRemind) {
            const userSubscriptions = subsByUser[workout.userId];
            if (userSubscriptions && userSubscriptions.length > 0) {
                const payload = JSON.stringify({
                    title: 'Workout Reminder',
                    body: `${workout.workoutType} session starting soon!`,
                    // Consider adding a tag to allow replacement/coalescing: e.g., tag: `workout-reminder-${workout.userId}`
                    // Consider adding data: { url: '/planner' } for click actions
                });

                for (const subscription of userSubscriptions) {
                    if (!subscription || !subscription.endpoint || sentEndpoints.has(subscription.endpoint)) continue; 
                    
                    console.log(`[Notifications Trigger] Preparing to send reminder to user ${workout.userId}, endpoint: ${subscription.endpoint.substring(0, 30)}...`);
                    sentEndpoints.add(subscription.endpoint);

                    // Use actual web-push sendNotification
                    const sendPromise = webpush.sendNotification(subscription, payload)
                        .then(result => {
                            console.log(`[Notifications Trigger] Sent reminder successfully to ${subscription.endpoint.substring(0, 30)}... Status: ${result.statusCode}`);
                            // Simplify return value for tallying
                            return { success: true }; 
                        })
                        .catch(error => {
                            console.error(`[Notifications Trigger] Failed to send reminder to ${subscription.endpoint.substring(0, 30)}... Status: ${error.statusCode}, Body: ${error.body}`);
                            const errorDetails = { statusCode: error.statusCode, message: error.body }; // Capture error details
                            // Handle specific errors (e.g., 410 Gone / 404 Not Found - subscription expired/invalid)
                            if (error.statusCode === 410 || error.statusCode === 404) {
                                console.warn(`[Notifications Trigger] Subscription ${subscription.endpoint.substring(0, 30)} is invalid (${error.statusCode}). Deleting.`);
                                dbDeleteSubscription(subscription.endpoint).catch(deleteError => {
                                    console.error(`[Notifications Trigger] Failed to delete invalid subscription ${subscription.endpoint.substring(0, 30)}:`, deleteError);
                                });
                            }
                            // Simplify return value, pass error details separately
                            return { success: false, error: errorDetails }; 
                        });
                    sendPromises.push(sendPromise);
                }
            }
        }

        // 5. Wait for all send attempts to complete and tally results
        const results = await Promise.allSettled(sendPromises);
        results.forEach(result => {
            // All promises should fulfill because the .catch inside the loop handles rejections
            // and returns an object like { success: false, error: ... }
            if (result.status === 'fulfilled') {
                // Check the custom success flag returned by our promise handler
                if (result.value.success) { 
                    sentCount++; 
                } else {
                    // This means the .catch block ran and returned { success: false, error: ... }
                    failCount++; 
                    if(result.value.error) errors.push(result.value.error); 
                }
            } else {
                // This block should ideally not be reached if the .catch handler is robust
                // Log unexpected rejections just in case
                 console.error("[Notifications Trigger] Unexpected promise rejection wasn't caught earlier:", result.reason);
                 failCount++; 
                 // Try to extract some info from the reason
                 const reason = result.reason;
                 errors.push({ 
                     error: 'unhandled_send_rejection', 
                     statusCode: reason?.statusCode, 
                     message: reason?.body || reason?.message || String(reason) 
                 });
            }
        });

        console.log(`[Notifications Trigger] Finished sending reminders. Sent: ${sentCount}, Failed: ${failCount}`);
        // --- Final Result ---
        // Determine overall success based on failCount
        const overallSuccess = failCount === 0;

        if (!overallSuccess) {
            console.warn(`[Notifications Trigger] Completed with errors. Failed: ${failCount}`);
            // Return failure, include collected errors array, counts
            return {
                success: false, 
                errors: errors, // Use the existing errors array 
                sent: sentCount,
                failed: failCount,
            };
        } else {
             console.log(`[Notifications Trigger] Completed successfully. Sent: ${sentCount}`);
            // Return success, counts, and empty errors array
            return {
                success: true,
                sent: sentCount,
                failed: failCount,
                errors: [], // Explicitly return empty errors array on success
            };
        }

    } catch (error) {
        console.error('[Notifications Trigger] Unexpected error during reminder process:', error);
        errors.push({ error: 'trigger_process_failed', message: error instanceof Error ? error.message : String(error) });
        return { success: false, sent: sentCount, failed: failCount, errors };
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
 * Sends a push notification to all registered subscriptions for the current user.
 * 
 * @param payload - The data to send in the push notification (can be string or object).
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