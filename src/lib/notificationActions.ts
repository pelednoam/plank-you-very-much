'use server';

import { dbGetAllSubscriptions } from './notificationSubscriptionStorage';
// import webpush from 'web-push'; // Import commented out as dependency not installed
type PushSubscription = any; // Placeholder type
type SendResult = any; // Placeholder type

// Placeholder: VAPID keys should be loaded securely from environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Placeholder: Set VAPID details (only if keys are present)
// if (vapidPublicKey && vapidPrivateKey) {
//     webpush.setVapidDetails(
//         'mailto:your-email@example.com', // Replace with your contact email
//         vapidPublicKey,
//         vapidPrivateKey
//     );
// }

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

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.error('[Notifications Trigger] VAPID keys not configured. Cannot send notifications.');
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

        // 2. Get all subscriptions (Inefficient - better to fetch by user IDs in a real DB)
        const allSubscriptions = await dbGetAllSubscriptions();
        if (allSubscriptions.length === 0) {
            console.log('[Notifications Trigger] No subscriptions found to send reminders to.');
            return { success: true, sent: 0, failed: 0, errors: [] };
        }

        // 3. Map subscriptions by userId for easier lookup
        const subsByUser = allSubscriptions.reduce((acc, storedSub) => {
            if (!acc[storedSub.userId]) {
                acc[storedSub.userId] = [];
            }
            acc[storedSub.userId].push(storedSub.subscription);
            return acc;
        }, {} as Record<string, PushSubscription[]>);

        // 4. Prepare and send notifications
        const sendPromises: Promise<SendResult>[] = [];
        const sentEndpoints = new Set<string>(); // Avoid sending multiple times to the same endpoint if user has >1 workout

        for (const workout of workoutsToRemind) {
            const userSubscriptions = subsByUser[workout.userId];
            if (userSubscriptions && userSubscriptions.length > 0) {
                const payload = JSON.stringify({
                    title: 'Workout Reminder',
                    body: `${workout.workoutType} session starting soon!`,
                    // icon: '/icon-192x192.png', // Optional icon
                    // data: { url: '/planner' } // Optional data for click action
                });

                for (const subscription of userSubscriptions) {
                    if (sentEndpoints.has(subscription.endpoint)) continue; // Skip if already sending to this endpoint
                    
                    console.log(`[Notifications Trigger] Preparing to send reminder to user ${workout.userId}, endpoint: ${subscription.endpoint}`);
                    sentEndpoints.add(subscription.endpoint);

                    // ** Actual send logic using web-push (commented out) **
                    // const sendPromise = webpush.sendNotification(subscription, payload)
                    //     .then(result => {
                    //         console.log(`[Notifications Trigger] Sent reminder successfully to ${subscription.endpoint.substring(0, 30)}...`, result.statusCode);
                    //         sentCount++;
                    //         return { endpoint: subscription.endpoint, success: true, result };
                    //     })
                    //     .catch(error => {
                    //         console.error(`[Notifications Trigger] Failed to send reminder to ${subscription.endpoint.substring(0, 30)}...`, error.statusCode, error.body);
                    //         failCount++;
                    //         errors.push({ endpoint: subscription.endpoint, error: { statusCode: error.statusCode, message: error.body } });
                    //         // Handle specific errors (e.g., 410 Gone - subscription expired/invalid)
                    //         if (error.statusCode === 410 || error.statusCode === 404) {
                    //             console.log(`[Notifications Trigger] Subscription ${subscription.endpoint.substring(0, 30)} seems invalid (Gone/Not Found). Deleting.`);
                    //              dbDeleteSubscription(subscription.endpoint); // Attempt to delete invalid subscription
                    //         }
                    //         return { endpoint: subscription.endpoint, success: false, error };
                    //     });
                    // sendPromises.push(sendPromise);
                    
                    // Placeholder promise for testing structure without web-push
                     const placeholderPromise = new Promise<any>((resolve) => {
                         console.log(`[Notifications Trigger] --- SIMULATING SEND TO ${subscription.endpoint.substring(0, 30)}... ---`);
                         sentCount++; // Simulate success
                         resolve({ endpoint: subscription.endpoint, success: true });
                     });
                     sendPromises.push(placeholderPromise);
                }
            }
        }

        // 5. Wait for all send attempts to complete
        await Promise.allSettled(sendPromises);

        console.log(`[Notifications Trigger] Finished sending reminders. Sent: ${sentCount}, Failed: ${failCount}`);
        return { success: failCount === 0, sent: sentCount, failed: failCount, errors };

    } catch (error) {
        console.error('[Notifications Trigger] Unexpected error during reminder process:', error);
        errors.push({ error: 'trigger_process_failed', message: error instanceof Error ? error.message : String(error) });
        return { success: false, sent: sentCount, failed: failCount, errors };
    }
} 