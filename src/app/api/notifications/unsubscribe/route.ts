import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { kv } from '@vercel/kv'; // Import Vercel KV
import { getCurrentUserId } from '@/lib/auth'; // Use real auth

// Key structure in KV: subscriptions:user:<userId> -> Set<stringified PushSubscription>
const getUserSubscriptionsKey = (userId: string) => `subscriptions:user:${userId}`;

/**
 * Removes a push subscription associated with the current user from Vercel KV.
 * Expects POST request with JSON body: { endpoint: string } // Endpoint uniquely identifies the subscription
 */
export async function POST(request: NextRequest) {
    let userId: string | null = null;
    let internalErrorOccurred = false; // Flag to track errors within the loop
    try {
        userId = await getCurrentUserId();
        if (!userId) {
            console.warn('[API Unsubscribe] Unauthorized access attempt.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const endpointToRemove = body.endpoint;

        if (typeof endpointToRemove !== 'string' || !endpointToRemove) {
            console.warn(`[API Unsubscribe] Invalid or missing endpoint received for user ${userId}:`, endpointToRemove);
            return NextResponse.json({ error: 'Invalid or missing subscription endpoint' }, { status: 400 });
        }

        const userSubsKey = getUserSubscriptionsKey(userId);

        console.log(`[API Unsubscribe] Attempting to remove subscription with endpoint: ${endpointToRemove} for user ${userId}`);

        const currentSubscriptions = await kv.smembers(userSubsKey);

        let removedCount = 0;
        for (const subString of currentSubscriptions) {
            try {
                const sub = JSON.parse(subString);
                if (sub.endpoint === endpointToRemove) {
                    try {
                        const removed = await kv.srem(userSubsKey, subString);
                        if (removed > 0) {
                            console.log(`[API Unsubscribe] Successfully removed subscription ending in ...${endpointToRemove.slice(-6)} for user ${userId}.`);
                            removedCount++;
                            break;
                        }
                    } catch (sremError) {
                        console.error(`[API Unsubscribe] Error during kv.srem for user ${userId}, subscription ${subString}:`, sremError);
                        internalErrorOccurred = true;
                        break;
                    }
                }
            } catch (parseError) {
                console.error(`[API Unsubscribe] Error parsing subscription string for user ${userId}: ${subString}`, parseError);
                // Don't set internalErrorOccurred here
            }
        }

        if (internalErrorOccurred) {
            return NextResponse.json({ error: 'Internal server error removing subscription' }, { status: 500 });
        }

        if (removedCount > 0) {
            return NextResponse.json({ message: 'Subscription removed successfully' }, { status: 200 });
        } else {
            console.log(`[API Unsubscribe] Subscription with endpoint ${endpointToRemove} not found for user ${userId}.`);
            return NextResponse.json({ message: 'Subscription not found or already removed' }, { status: 200 });
        }

    } catch (error) {
        console.error(`[API Unsubscribe] Error processing unsubscription for user ${userId ?? 'UNKNOWN'}:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error removing subscription' }, { status: 500 });
    }
} 