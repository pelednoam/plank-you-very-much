import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { kv } from '@vercel/kv'; // Import Vercel KV
import type { PushSubscription } from 'web-push'; // Use type only
import { getCurrentUserId } from '@/lib/auth'; // Import placeholder auth function

// TODO: Replace placeholder logic with actual database storage (e.g., Vercel KV, Supabase, MongoDB)
// TODO: Implement proper validation for subscription object and userId
// TODO: Implement robust error handling
// TODO: Implement authentication to validate userId

// Key structure in KV: subscriptions:user:<userId> -> Set<stringified PushSubscription>
const getUserSubscriptionsKey = (userId: string) => `subscriptions:user:${userId}`;

// Basic validation for subscription object keys
function isValidSubscription(sub: any): sub is PushSubscription {
    return sub && typeof sub.endpoint === 'string' && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
}

/**
 * Stores a push subscription associated with the current user.
 * Expects POST request with JSON body: { subscription: PushSubscription }
 */
export async function POST(request: NextRequest) {
    let userId: string | null = null;
    try {
        // --- Authentication --- 
        // TODO: Replace with actual authentication
        userId = await getCurrentUserId(); 
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // --- End Authentication ---

        const body = await request.json();
        const subscription = body.subscription;

        // --- Validation ---
        if (!isValidSubscription(subscription)) {
             console.warn(`[API Subscribe] Invalid subscription object received for user ${userId}:`, subscription);
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }
        // --- End Validation ---

        const userSubsKey = getUserSubscriptionsKey(userId);
        const subscriptionString = JSON.stringify(subscription);

        console.log(`[API Subscribe] Adding subscription for user ${userId}, endpoint: ${subscription.endpoint}`);

        // Add the stringified subscription to the user's set in KV
        const added = await kv.sadd(userSubsKey, subscriptionString);

        if (added > 0) {
             console.log(`[API Subscribe] Successfully added subscription for user ${userId}.`);
        } else {
             console.log(`[API Subscribe] Subscription already existed for user ${userId}.`);
        }

        // Optional: Set an expiration for the key if desired, though subscriptions can be long-lived
        // await kv.expire(userSubsKey, 60 * 60 * 24 * 90); // 90 days? Needs consideration

        return NextResponse.json({ message: 'Subscription saved successfully' }, { status: 201 });

    } catch (error) {
        console.error(`[API Subscribe] Error processing subscription for user ${userId ?? 'UNKNOWN'}:`, error);
         if (error instanceof SyntaxError) {
             return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
         }
         // Handle potential KV errors specifically? E.g., check error.message
         if (error instanceof Error && error.message.includes('KV error')) { // Example check
            return NextResponse.json({ error: 'Storage error saving subscription' }, { status: 503 }); // Service Unavailable
         }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 