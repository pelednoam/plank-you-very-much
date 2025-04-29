'use server';

import { type FitbitTokenData, FitbitDaily } from '@/types';
import { cookies } from 'next/headers'; // Needed for reading/writing cookies in Server Actions
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import dayjs from "dayjs";

// --- KV Key Function ---
const getFitbitTokenKey = (userId: string): string => `fitbit-token:user:${userId}`;

/**
 * Refreshes the Fitbit access token using the stored refresh token (from HTTP-only cookie).
 * Updates the stored tokens on success.
 * @returns {Promise<{ success: boolean; error?: string; newAccessToken?: string; newExpiresAt?: number }>} Result of the refresh attempt, includes new token info on success.
 */
export async function refreshFitbitToken(): Promise<{
    success: boolean;
    error?: string;
    access_token?: string;
    expires_at?: number;
}> {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('fitbit_refresh_token')?.value;

    if (!refreshToken) {
        console.error(`[Fitbit Action] Refresh failed: No refresh token cookie found.`);
        return { success: false, error: 'no_refresh_token_found' };
    }

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Fitbit Action] Refresh error: Missing Fitbit environment variables (Client ID or Secret).');
        return { success: false, error: 'config_missing' };
    }

    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    try {
        console.log(`[Fitbit Action] Sending refresh request to Fitbit API...`);
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            cache: 'no-store',
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorType = responseData?.errors?.[0]?.errorType || 'refresh_api_error';
            console.error(`[Fitbit Action] Fitbit token refresh HTTP error:`, response.status, responseData);
            if (errorType === 'invalid_grant' || errorType === 'invalid_token') {
                console.warn(`[Fitbit Action] Refresh token invalid/expired. Deleting stored token cookie.`);
                try { 
                    const store = await cookies();
                    store.delete('fitbit_refresh_token'); 
                } catch (e) { console.error("Failed to delete cookie", e); }
            }
            return { success: false, error: errorType };
        }

        // --- Refresh Successful ---
        const { access_token, refresh_token: new_refresh_token, expires_in } = responseData;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const newExpiresAt = nowInSeconds + expires_in - 300; // Recalculate expiry with buffer

        try {
            const store = await cookies();
            store.set('fitbit_refresh_token', new_refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // Reset maxAge
            });
        } catch (e) {
            console.error("Failed to set cookie", e);
            return { success: false, error: 'cookie_set_failed' };
        }

        console.log(`[Fitbit Action] Token refresh successful, updated tokens stored.`);
        return { success: true, access_token: access_token, expires_at: newExpiresAt };

    } catch (error) {
        console.error(`[Fitbit Action] Network/unexpected error during token refresh:`, error);
        return { success: false, error: 'unknown_refresh_error' };
    }
}

/**
 * Fetches data from a specified Fitbit API endpoint for the current user.
 * Handles automatic token refresh if the access token appears expired.
 * Requires client to pass current access token details.
 *
 * @param endpoint The Fitbit API endpoint path (e.g., '/1/user/-/profile.json').
 * @param currentAccessToken The current access token stored client-side.
 * @param currentExpiresAt The expiry timestamp (seconds since epoch) of the current access token.
 * @returns {Promise<{ success: boolean; data?: any; error?: string; newAccessToken?: string; newExpiresAt?: number }>} 
 *          Result includes fetched data and potentially new token info if a refresh occurred.
 */
export async function fetchFitbitData({
    endpoint,
    currentAccessToken,
    currentExpiresAt
}: {
    endpoint: string;
    currentAccessToken: string | null | undefined;
    currentExpiresAt: number | null | undefined;
}): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    newAccessToken?: string;
    newExpiresAt?: number;
}> {
    // Note: We don't strictly need appUserId here unless logging/auditing requires it,
    // as the tokens themselves authorize the request for a specific Fitbit user.
    console.log(`[Fitbit Action] Preparing to fetch data endpoint: ${endpoint}`);

    if (!currentAccessToken || !currentExpiresAt) {
         console.error(`[Fitbit Action] Fetch failed: Missing current access token or expiry time.`);
         return { success: false, error: 'missing_client_token' };
    }

    let accessTokenToUse = currentAccessToken;
    let newAccessToken: string | undefined = undefined;
    let newExpiresAt: number | undefined = undefined;

    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Check if token is expired or close to expiry
    if (currentExpiresAt <= nowInSeconds) {
        console.log(`[Fitbit Action] Access token expired. Attempting refresh...`);
        const refreshResult = await refreshFitbitToken();
        if (!refreshResult.success || !refreshResult.access_token || !refreshResult.expires_at) {
            console.error(`[Fitbit Action] Token refresh failed during data fetch. Error: ${refreshResult.error}`);
            return { success: false, error: refreshResult.error || 'refresh_failed' };
        }
        // Use the newly refreshed token
        accessTokenToUse = refreshResult.access_token;
        newAccessToken = refreshResult.access_token; // Store to return to client
        newExpiresAt = refreshResult.expires_at; // Store to return to client
        console.log(`[Fitbit Action] Token refresh successful, proceeding with data fetch.`);
    }

    // --- Make the API request --- 
    const fitbitApiUrl = `https://api.fitbit.com${endpoint}`;
    console.log(`[Fitbit Action] Making API request to: ${fitbitApiUrl}`);

    try {
        const response = await fetch(fitbitApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessTokenToUse}`,
                // Fitbit might have rate limits, consider headers like 'Accept-Language', 'Accept-Locale' if needed
            },
             cache: 'no-store', // Typically don't cache API data fetches unless specific use case
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorType = responseData?.errors?.[0]?.errorType || 'fetch_api_error';
            console.error(`[Fitbit Action] Fitbit API fetch error: ${response.status}`, responseData);
            // Special handling for token-related errors that might occur despite expiry check/refresh attempt
            if (response.status === 401) {
                // Could indicate token was revoked externally or another issue
                // Clear the refresh token cookie as it might be invalid
                 try { 
                     const store = await cookies();
                     store.delete('fitbit_refresh_token'); 
                 } catch(e) { console.error("Failed to delete cookie", e); }
                 return { success: false, error: 'unauthorized_token_likely_invalid' };
            }
            return { success: false, error: errorType, data: responseData };
        }

        console.log(`[Fitbit Action] Successfully fetched data from ${endpoint}.`);
        // Return success, the fetched data, and potentially the new token info if refresh occurred
        return { success: true, data: responseData, newAccessToken: newAccessToken, newExpiresAt: newExpiresAt };

    } catch (error) {
        console.error(`[Fitbit Action] Network/unexpected error during Fitbit API fetch from ${endpoint}:`, error);
        return { success: false, error: 'unknown_fetch_error' };
    }
}

/**
 * Revokes the current user's Fitbit refresh token, deletes it from KV, and clears the stored cookie.
 * @returns {Promise<{ success: boolean; error?: string }>} 
 */
export async function revokeFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('fitbit_refresh_token')?.value;

    // Get userId first, handle null return
    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('[Fitbit Action] Revoke failed: User not authenticated.');
        return { success: false, error: 'User not authenticated' }; // Correct error
    }

    const tokenKey = getFitbitTokenKey(userId);

    // If no cookie, just try deleting from KV
    if (!refreshToken) {
        console.warn(`[Fitbit Action] Revoke: No refresh token cookie, attempting KV delete for user ${userId}.`);
        try {
            await kv.del(tokenKey);
            return { success: true }; // Assume success if KV delete doesn't throw
        } catch (kvDelError) {
            console.error(`[Fitbit Action] Failed to delete token from KV for user ${userId} (no cookie):`, kvDelError);
            return { success: false, error: 'kv_delete_error' };
        }
    }

    // --- If refresh token cookie exists --- 
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Fitbit Action] Revoke error: Missing Fitbit environment variables.');
        return { success: false, error: 'config_missing' };
    }

    const revokeUrl = 'https://api.fitbit.com/oauth2/revoke';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ token: refreshToken });

    let responseOk = false;
    let apiFailedNonFatal = false;

    try {
        console.log(`[Fitbit Action] Sending revoke request to Fitbit API for user ${userId}...`);
        const response = await fetch(revokeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            cache: 'no-store',
        });

        responseOk = response.ok;
        if (!responseOk && (response.status === 400 || response.status === 401)) {
            // Treat 400/401 from revoke endpoint as non-fatal for client, token is likely already invalid
            console.warn(`[Fitbit Action] Revoke API returned ${response.status} for user ${userId}. Token likely already invalid.`);
            apiFailedNonFatal = true; 
        } else if (!responseOk) {
            const responseData = await response.json().catch(() => ({})); // Attempt to get error details
            const errorType = responseData?.errors?.[0]?.errorType || 'revoke_api_error';
            console.error(`[Fitbit Action] Fitbit revoke API error for user ${userId}: ${response.status}`, responseData);
            throw new Error(errorType);
        }
        console.log(`[Fitbit Action] Fitbit revoke API call successful or non-fatal failure for user ${userId}.`);

    } catch (error) {
        console.error(`[Fitbit Action] Network/unexpected error during token revoke for user ${userId}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown_revoke_error' };
    }

    // Always attempt to clear the cookie and KV entry regardless of API result (unless network error)
    try {
        cookieStore.delete('fitbit_refresh_token');
        // Only delete from KV if the API call was actually successful (responseOk)
        if (responseOk) {
            await kv.del(tokenKey);
            console.log(`[Fitbit Action] Successfully revoked token and deleted from KV for user ${userId}.`);
        } else {
            console.warn(`[Fitbit Action] Cleared cookie, but did not delete KV token for user ${userId} due to API status (ok: ${responseOk}, nonFatal: ${apiFailedNonFatal}).`);
        }
        return { success: true }; // Report overall success to client even if API had non-fatal error
    } catch (cleanupError) {
        console.error(`[Fitbit Action] Error during token cleanup for user ${userId}:`, cleanupError);
        // Determine which cleanup failed
        if ((cleanupError as Error).message.includes('KV')) { // Heuristic check
            return { success: false, error: 'kv_delete_error' };
        } else {
             return { success: false, error: 'cookie_delete_error' };
        }
    }
}

// --- Full Data Sync Actions ---

// Create an extended interface for the tests
interface FitbitDailyExtended extends FitbitDaily {
    activeMinutes?: number;
    distanceKm?: number;
    floors?: number;
    sleepMinutesTotal?: number;
    sleepLight?: number;
    sleepDeep?: number;
    sleepREM?: number;
    sleepAwake?: number;
    caloriesIn?: number;
    waterMl?: number;
    activities?: any[];
}

export async function syncFitbitDataForDate({
    date,
    userId,
    currentAccessToken,
    currentExpiresAt
}: {
    date: string; // Expecting YYYY-MM-DD
    userId?: string;
    currentAccessToken: string | null | undefined;
    currentExpiresAt: number | null | undefined;
}): Promise<{
    success: boolean;
    data?: {
        date: string;
        steps?: number;
        activeMinutes?: number;
        distanceKm?: number;
        floors?: number;
        restingHeartRate?: number;
        caloriesOut?: number;
        sleepMinutesTotal?: number; 
        sleepLight?: number;
        sleepDeep?: number;
        sleepREM?: number;
        sleepAwake?: number;
        caloriesIn?: number;
        activities?: any[];
    };
    error?: string;
    newAccessToken?: string;
    newExpiresAt?: number;
}> {
    let effectiveUserId = userId;
    let tokenInfo: FitbitTokenData | null = null;

    // --- Determine User ID and Token Source --- 
    if (!currentAccessToken || !currentExpiresAt) {
        // Need to fetch token, so we MUST have a user ID
        if (!effectiveUserId) {
            effectiveUserId = await getCurrentUserId();
            if (!effectiveUserId) {
                console.error("[Fitbit Sync] Cannot fetch token: User not authenticated.");
                return { success: false, error: "User not authenticated" };
            }
        }
        // Fetch token from KV
        const tokenKey = getFitbitTokenKey(effectiveUserId);
        try {
            const storedTokenString = await kv.get<string>(tokenKey);
            if (storedTokenString) {
                tokenInfo = JSON.parse(storedTokenString) as FitbitTokenData;
                currentAccessToken = tokenInfo.accessToken;
                // Fix: Use ?? undefined to match expected type 'string | null | undefined'
                currentExpiresAt = tokenInfo.expiresAt ?? undefined; 
            } else {
                 console.error(`[Fitbit Sync] No Fitbit token found in KV for user ${effectiveUserId}.`);
                 return { success: false, error: "Fitbit token not found or invalid." };
            }
        } catch (error) {
            console.error(`[Fitbit Sync] Error fetching/parsing token from KV for user ${effectiveUserId}:`, error);
            return { success: false, error: "kv_fetch_error" };
        }
    } else {
        // Using token passed directly
        console.log(`[Fitbit Sync] Using token passed directly for user ${effectiveUserId || '(unknown, token provided)'}.`);
    }

    // --- Check Token Validity (again, as KV might have old data) ---
    if (!currentAccessToken || !currentExpiresAt) {
         console.error(`[Fitbit Sync] Failed: Missing access token or expiry after resolving source.`);
         return { success: false, error: 'missing_token_details' };
    }

    // --- Perform Fetch/Refresh Logic (similar to fetchFitbitData) --- 
    let accessTokenToUse = currentAccessToken;
    let newAccessToken: string | undefined = undefined;
    let newExpiresAt: number | undefined = undefined;
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (currentExpiresAt <= nowInSeconds) {
        console.log(`[Fitbit Sync] Access token for date ${date} expired. Attempting refresh...`);
        const refreshResult = await refreshFitbitToken();
        if (!refreshResult.success || !refreshResult.access_token || !refreshResult.expires_at) {
            console.error(`[Fitbit Sync] Token refresh failed for date ${date}. Error: ${refreshResult.error}`);
            // Return specific refresh error
            return { success: false, error: refreshResult.error || 'refresh_failed' }; 
        }
        accessTokenToUse = refreshResult.access_token;
        newAccessToken = refreshResult.access_token;
        newExpiresAt = refreshResult.expires_at;
        console.log(`[Fitbit Sync] Token refresh successful for date ${date}.`);
    }

    // --- Fetch Required Data Points --- 
    const endpoints = [
        `/1/user/-/activities/date/${date}.json`,
        `/1/user/-/sleep/date/${date}.json`,
        `/1/user/-/foods/log/date/${date}.json`,
        // Add other endpoints if needed (e.g., heart rate)
    ];

    // Use a helper to fetch data, similar to fetchFitbitData but without refresh loop
    const fetchDataInternal = async (endpoint: string): Promise<any> => {
        const url = `https://api.fitbit.com${endpoint}`;
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessTokenToUse}` },
                cache: 'no-store',
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 const errorType = errorData?.errors?.[0]?.errorType || 'fetch_api_error';
                 console.error(`[Fitbit Sync] API Error (${response.status}) fetching ${endpoint}:`, errorData);
                 // If 401, maybe token became invalid since refresh check?
                 if (response.status === 401) throw new Error('unauthorized_during_fetch'); 
                 throw new Error(errorType);
            }
            return await response.json();
        } catch (error) {
             console.error(`[Fitbit Sync] Network/fetch error for ${endpoint}:`, error);
             throw error; // Re-throw to be caught by Promise.allSettled
        }
    };

    const results = await Promise.allSettled(endpoints.map(fetchDataInternal));

    // --- Process Results --- 
    const combinedData: Partial<FitbitDailyExtended> = { date }; // Use the extended interface
    let overallSuccess = true;
    const errors: string[] = [];

    // Define mapping from endpoint index to data field
    const fieldMapping: Record<number, { field: keyof FitbitDailyExtended, dataPath?: string[] | ((d: any) => any), required?: boolean }> = {
        0: { field: 'activities', dataPath: ['summary'], required: true }, // Activities summary is required
        1: { field: 'sleepMinutesTotal', dataPath: ['summary', 'totalMinutesAsleep'], required: false },
        2: { field: 'caloriesIn', dataPath: ['summary', 'calories'], required: false },
    };

    results.forEach((result, index) => {
        const mapping = fieldMapping[index];
        if (!mapping) return; // Skip if no mapping defined

        if (result.status === 'fulfilled') {
            const data = result.value;
            // Simplified extraction logic for now, refine later
             if (index === 0 && data?.summary) { // Activities
                combinedData.steps = data.summary.steps;
                combinedData.caloriesOut = data.summary.caloriesOut;
                combinedData.distanceKm = data.summary.distances?.find((d:any) => d.activity === 'total')?.distance;
                combinedData.activeMinutes = (data.summary.fairlyActiveMinutes ?? 0) + (data.summary.veryActiveMinutes ?? 0);
                combinedData.floors = data.summary.floors;
                // Store full activities array too
                combinedData.activities = data.activities; 
             } else if (index === 1 && data?.summary) { // Sleep
                 combinedData.sleepMinutesTotal = data.summary.totalMinutesAsleep;
                 combinedData.sleepLight = data.summary.stages?.light;
                 combinedData.sleepDeep = data.summary.stages?.deep;
                 combinedData.sleepREM = data.summary.stages?.rem;
                 combinedData.sleepAwake = data.summary.stages?.wake;
             } else if (index === 2 && data?.summary) { // Food
                 combinedData.caloriesIn = data.summary.calories;
             }
             // TODO: Add Resting Heart Rate, Water
        } else { // Fulfilled means API call failed
            console.error(`[Fitbit Sync] Fetch failed for endpoint ${endpoints[index]}:`, result.reason);
            const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
            errors.push(`${mapping.field}_fetch_failed: ${errorMsg}`);
            if (mapping.required) {
                 overallSuccess = false;
            }
             // Handle specific errors like unauthorized that mean we should stop
             if (errorMsg.includes('unauthorized')) {
                 overallSuccess = false;
             }
        }
    });

    // Fix: Cast combinedData before returning to match the explicit return type
    const returnData = combinedData as {
        date: string;
        steps?: number;
        activeMinutes?: number;
        distanceKm?: number;
        floors?: number;
        restingHeartRate?: number;
        caloriesOut?: number;
        sleepMinutesTotal?: number; 
        sleepLight?: number;
        sleepDeep?: number;
        sleepREM?: number;
        sleepAwake?: number;
        caloriesIn?: number;
        activities?: any[];
    };

    if (!overallSuccess) {
        console.error(`[Fitbit Sync] Failed for date ${date} due to missing required data or critical error. Errors:`, errors);
        // Return partial data if any was gathered, along with the first critical error
        return { success: false, data: returnData, error: errors[0] || 'sync_failed_required_data', newAccessToken, newExpiresAt };
    }

    console.log(`[Fitbit Sync] Successfully synced data for date ${date}.`, combinedData);
    return { success: true, data: returnData, newAccessToken, newExpiresAt };
}

// Type guards
interface FitbitApiError {
    errors: { errorType: string; message: string; }[];
    success?: false; // Explicitly mark as not successful
}

function isFitbitApiError(data: any): data is FitbitApiError {
    return data && Array.isArray(data.errors) && data.errors.length > 0;
}

interface FitbitTokenError {
    errors: { errorType: string; message: string; field?: string }[];
    success: false; // Explicitly mark as not successful
}

function isFitbitTokenError(data: any): data is FitbitTokenError {
    return data && data.success === false && Array.isArray(data.errors);
}

// Type definitions
type FitbitDataResponse = any; // Replace with actual type if needed

type FitbitActivity = {
    // Add specific fields
};

type FitbitSyncResult = {
    success: boolean;
    data?: FitbitDaily;
    error?: string;
    newAccessToken?: string;
    newExpiresAt?: number;
};

type FetchFitbitResult = {
    success: boolean;
    data?: any;
    error?: string;
    newAccessToken?: string;
    newExpiresAt?: number;
};

export {
    getCurrentUserId,
    refreshFitbitToken,
    fetchFitbitData,
    revokeFitbitToken,
    syncFitbitDataForDate,
};

export type { FitbitDataResponse, FitbitTokenData, FitbitActivity, FitbitDaily, FetchFitbitResult, FitbitSyncResult }; 