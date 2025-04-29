'use server';

import { dbGetAllSubscriptions, dbDeleteSubscription } from './notificationSubscriptionStorage';
import webpush from 'web-push';
import type { PushSubscription, SendResult } from 'web-push';

// Placeholder: VAPID keys should be loaded securely from environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Set VAPID details (only run if keys are present and web-push is imported)
if (webpush && vapidPublicKey && vapidPrivateKey) {
    try {
        webpush.setVapidDetails(
            'mailto:admin@plankyou.app', // Replace with a real admin/support email
            vapidPublicKey,
            vapidPrivateKey
        );
        console.log("[WebPush] VAPID details set.");
    } catch (error) {
         console.error("[WebPush] Failed to set VAPID details:", error);
         // Potentially prevent sending if setup fails
    }
} else {
     console.warn("[WebPush] VAPID keys not fully configured in environment variables. Push notifications will not be sent.");
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

    // Replace with actual query to your database/data source for planned workouts
    const MOCK_PLANNED_WORKOUTS: PlannedWorkout[] = [
        { userId: 'USER_123', workoutType: 'CORE', plannedAt: new Date(now.getTime() + 30 * 60000).toISOString() },
        { userId: 'USER_456', workoutType: 'SWIM', plannedAt: new Date(now.getTime() + 15 * 60000).toISOString() },
        { userId: 'USER_123', workoutType: 'CLIMB', plannedAt: new Date(now.getTime() + 60 * 60000).toISOString() }, // Too far away
    ];

    return MOCK_PLANNED_WORKOUTS.filter(workout => {
        const plannedTime = new Date(workout.plannedAt);
        return plannedTime > now && plannedTime <= cutoff;
    });
}

export async function triggerWorkoutReminders(): Promise<{ success: boolean; sent: number; failed: number; errors: any[] }> {
    console.log('[Notifications Trigger] Starting workout reminder process...');

    if (!webpush || !vapidPublicKey || !vapidPrivateKey) {
        console.error('[Notifications Trigger] VAPID keys not configured or web-push not initialized. Cannot send notifications.');
        return { success: false, sent: 0, failed: 0, errors: [{ error: 'VAPID keys not configured' }] };
    }

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
            if (result.status === 'fulfilled') {
                // result.value is the object { success: boolean, error?: object } returned above
                if (result.value.success) { 
                    sentCount++; 
                } else {
                    failCount++; 
                    if(result.value.error) errors.push(result.value.error); // Push captured error details
                }
            } else { 
                failCount++;
                 console.error("[Notifications Trigger] Unexpected promise rejection during send:", result.reason);
                 errors.push({ error: 'send_promise_rejected', reason: result.reason });
            }
        });

        console.log(`[Notifications Trigger] Finished sending reminders. Sent: ${sentCount}, Failed: ${failCount}`);
        // Success = No failures occurred.
        return { success: failCount === 0, sent: sentCount, failed: failCount, errors }; 

    } catch (error) {
        console.error('[Notifications Trigger] Unexpected error during reminder process:', error);
        errors.push({ error: 'trigger_process_failed', message: error instanceof Error ? error.message : String(error) });
        return { success: false, sent: sentCount, failed: failCount, errors };
    }
} 