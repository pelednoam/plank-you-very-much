'use server';

import { type FitbitTokenData, FitbitDaily } from '@/types';
import { cookies } from 'next/headers'; // Needed for reading/writing cookies in Server Actions
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import dayjs from "dayjs";

// --- KV Key Function ---
const getFitbitTokenKey = (userId: string): string => `fitbit-token:user:${userId}`;

/**
 * Get the current user ID from the session.
 * @returns {Promise<string>} The current user's ID or throws if not authenticated.
 */
async function getCurrentUserId(): Promise<string> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            throw new Error("User not authenticated");
        }
        return session.user.id;
    } catch (error) {
        console.error("[FitbitActions] Error getting current user ID:", error);
        throw new Error("Failed to get current user ID");
    }
}

// Removed placeholder db* functions (dbGetUserFitbitTokens, dbSaveUserFitbitTokens, dbDeleteUserFitbitTokens)
// Removed storeFitbitTokens function as the /api/fitbit/callback route handles initial storage.

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

    // We still need the user ID to delete from KV, even if cookie is missing.
    let userId: string;
    try {
        userId = await getCurrentUserId();
    } catch (authError) {
        console.error('[Fitbit Action] Revoke failed: Error getting user ID:', authError);
        return { success: false, error: 'Authentication error' };
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
        if (!responseOk) {
            const status = response.status;
            if (status === 400 || status === 401) {
                 console.warn(`[Fitbit Action] Revoke API returned ${status} for user ${userId}. Proceeding with cleanup.`);
                 apiFailedNonFatal = true;
            } else {
                // Other errors are fatal - don't proceed to KV/cookie delete
                let responseDataText = 'unknown';
                try { responseDataText = await response.text(); } catch { /* ignore */ }
                console.error(`[Fitbit Action] Fitbit token revoke HTTP error ${status} for user ${userId}:`, responseDataText);
                return { success: false, error: 'revoke_api_error' };
            }
        }
    } catch (fetchError) {
        console.error(`[Fitbit Action] Network/unexpected error during token revoke for user ${userId}:`, fetchError);
        return { success: false, error: 'unknown_revoke_error' };
    }

    // Proceed with cleanup only if fetch was OK or failed non-fatally (400/401)
    if (responseOk || apiFailedNonFatal) {
        try {
            console.log(`[Fitbit Action] Deleting token from KV for user ${userId}...`);
            await kv.del(tokenKey);
        } catch (kvDelError) {
            console.error(`[Fitbit Action] Failed to delete token from KV for user ${userId}:`, kvDelError);
            return { success: false, error: 'kv_delete_error' };
        }

        try {
            console.log(`[Fitbit Action] Deleting refresh token cookie...`);
            cookieStore.delete('fitbit_refresh_token');
        } catch (cookieError) {
            console.error("[Fitbit Action] Failed to delete refresh token cookie after successful revoke:", cookieError);
            // Log error but still return success
        }
        
        console.log(`[Fitbit Action] Token revoke and cleanup successful for user ${userId}.`);
        revalidatePath('/settings'); 
        return { success: true };
    } else {
         // Should not happen due to error handling in try block, but as fallback:
         console.error('[Fitbit Action] Reached unexpected state after revoke attempt.');
         return { success: false, error: 'unexpected_revoke_state' };
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
    let effectiveUserId: string;
    if (!userId) {
        try {
            effectiveUserId = await getCurrentUserId();
        } catch (authError) {
            console.error("[Fitbit Sync] Auth error:", authError);
            return { success: false, error: "User not authenticated" };
        }
    } else {
        effectiveUserId = userId;
    }
    console.log(`[Fitbit Sync] Starting sync for user ${effectiveUserId}, date: ${date}`);

    let tokenInfo = { accessToken: currentAccessToken, expiresAt: currentExpiresAt };
    let newAccessToken: string | undefined = undefined;
    let newExpiresAt: number | undefined = undefined;

    // Fetch token from KV if not provided
    if (!tokenInfo.accessToken || !tokenInfo.expiresAt) {
        console.log(`[Fitbit Sync] Token not passed directly, fetching from KV for user ${effectiveUserId}.`);
        const tokenKey = getFitbitTokenKey(effectiveUserId);
        const storedToken = await kv.get<FitbitTokenData>(tokenKey);
        if (!storedToken?.accessToken || !storedToken?.expiresAt) {
            console.warn(`[Fitbit Sync] No valid token in KV for user ${effectiveUserId}. Aborting sync.`);
            return { success: false, error: 'Fitbit token not found or invalid.' };
        }
        tokenInfo = { accessToken: storedToken.accessToken, expiresAt: storedToken.expiresAt };
        console.log(`[Fitbit Sync] Token found in KV. Expires at: ${new Date(tokenInfo.expiresAt * 1000).toISOString()}`);
    } else {
         console.log(`[Fitbit Sync] Using directly passed token. Expires at: ${new Date(tokenInfo.expiresAt * 1000).toISOString()}`);
    }

    // Check for expiry and attempt refresh *before* making multiple API calls
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (tokenInfo.expiresAt && nowInSeconds >= tokenInfo.expiresAt) {
        console.log(`[Fitbit Sync] Token expired/near expiry for user ${effectiveUserId}. Attempting refresh.`);
        const refreshedToken = await refreshFitbitToken();
        if (refreshedToken?.access_token && refreshedToken?.expires_at) {
            console.log(`[Fitbit Sync] Token refresh successful. Using new token for user ${effectiveUserId}.`);
            tokenInfo = { accessToken: refreshedToken.access_token, expiresAt: refreshedToken.expires_at };
            newAccessToken = refreshedToken.access_token;
            newExpiresAt = refreshedToken.expires_at;
        } else {
            console.error(`[Fitbit Sync] Token refresh failed for user ${effectiveUserId}. Aborting sync.`);
            return { success: false, error: 'Fitbit token expired and refresh failed.', newAccessToken, newExpiresAt };
        }
    }

    // Define endpoints to fetch
    const endpoints = {
        summary: `/1/user/-/activities/date/${date}.json`,
        sleep: `/1.2/user/-/sleep/date/${date}.json`,
        heart: `/1/user/-/activities/heart/date/${date}/1d.json`,
        nutrition: `/1/user/-/foods/log/date/${date}.json`,
    };

    const results: {
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
    } = { date };
    
    let overallSuccess = true;
    let errors: string[] = [];
    let finalNewAccessToken = newAccessToken;
    let finalNewExpiresAt = newExpiresAt;

    // Fetch Summary first (provides steps, calories, distance etc.)
    console.log(`[Fitbit Sync] Fetching summary for ${date}...`);
    const summaryResult = await fetchFitbitData({
        endpoint: endpoints.summary,
        currentAccessToken: tokenInfo.accessToken,
        currentExpiresAt: tokenInfo.expiresAt,
    });

    if (summaryResult.success && summaryResult.data?.summary) {
        console.log(`[Fitbit Sync] Summary fetched successfully for ${date}.`);
        const summary = summaryResult.data.summary;
        
        // Map exactly to the properties expected by tests
        results.steps = summary.steps;
        results.caloriesOut = summary.caloriesOut;
        results.distanceKm = summary.distances?.find((d: any) => d.activity === 'total')?.distance;
        results.floors = summary.floors;
        results.restingHeartRate = summary.restingHeartRate;
        
        // Calculate active minutes exactly as expected by tests
        const lightlyActiveMinutes = summary.lightlyActiveMinutes || 0;
        const fairlyActiveMinutes = summary.fairlyActiveMinutes || 0;
        const veryActiveMinutes = summary.veryActiveMinutes || 0;
        results.activeMinutes = lightlyActiveMinutes + fairlyActiveMinutes + veryActiveMinutes;
        
        // Store activities as expected by tests
        results.activities = summaryResult.data.activities || [];
        
        // Update token if it was refreshed during this fetch
        if (summaryResult.newAccessToken && summaryResult.newExpiresAt) {
            console.log("[Fitbit Sync] Token refreshed during summary fetch.");
            tokenInfo = { accessToken: summaryResult.newAccessToken, expiresAt: summaryResult.newExpiresAt };
            finalNewAccessToken = summaryResult.newAccessToken;
            finalNewExpiresAt = summaryResult.newExpiresAt;
        }
    } else {
        console.warn(`[Fitbit Sync] Failed to fetch summary for ${date}: ${summaryResult.error}`);
        errors.push(`Summary: ${summaryResult.error || 'fetch failed'}`);
        overallSuccess = false; // Mark sync as potentially incomplete
        if (summaryResult.error?.includes('unauthorized')) {
            // If unauthorized, stop further fetches for this sync
            console.error(`[Fitbit Sync] Unauthorized error fetching summary for ${date}. Aborting further fetches.`);
            return { success: false, error: 'unauthorized: Fitbit token invalid.', data: results, newAccessToken: finalNewAccessToken, newExpiresAt: finalNewExpiresAt };
        }
    }

    // Fetch Sleep
    console.log(`[Fitbit Sync] Fetching sleep for ${date}...`);
    const sleepResult = await fetchFitbitData({
        endpoint: endpoints.sleep,
        currentAccessToken: tokenInfo.accessToken, // Use potentially refreshed token
        currentExpiresAt: tokenInfo.expiresAt,
    });
    
    if (sleepResult.success && sleepResult.data?.summary) {
        console.log(`[Fitbit Sync] Sleep fetched successfully for ${date}.`);
        
        // Map to the exact property names expected by tests
        results.sleepMinutesTotal = sleepResult.data.summary.totalMinutesAsleep;
        
        const totalMinutesAsleep = sleepResult.data.summary.totalMinutesAsleep || 0;
        const totalTimeInBed = sleepResult.data.summary.totalTimeInBed || 0;
        results.sleepAwake = Math.max(0, totalTimeInBed - totalMinutesAsleep);
        
        // Extract sleep stages data exactly as expected by tests
        if (sleepResult.data.sleep && sleepResult.data.sleep.length > 0) {
            const mainSleep = sleepResult.data.sleep.find((s: any) => s.isMainSleep) || sleepResult.data.sleep[0];
            if (mainSleep.levels?.summary) {
                results.sleepLight = mainSleep.levels.summary.light?.minutes;
                results.sleepDeep = mainSleep.levels.summary.deep?.minutes;
                results.sleepREM = mainSleep.levels.summary.rem?.minutes;
            }
        }
        
        if (sleepResult.newAccessToken && sleepResult.newExpiresAt) {
            console.log("[Fitbit Sync] Token refreshed during sleep fetch.");
            tokenInfo = { accessToken: sleepResult.newAccessToken, expiresAt: sleepResult.newExpiresAt };
            finalNewAccessToken = sleepResult.newAccessToken;
            finalNewExpiresAt = sleepResult.newExpiresAt;
        }
    } else {
        console.warn(`[Fitbit Sync] Failed to fetch sleep for ${date}: ${sleepResult.error}`);
        errors.push(`Sleep: ${sleepResult.error || 'fetch failed'}`);
        overallSuccess = false;
        if (sleepResult.error?.includes('unauthorized')) {
            console.error(`[Fitbit Sync] Unauthorized error fetching sleep for ${date}. Aborting further fetches.`);
            return { success: false, error: 'unauthorized: Fitbit token invalid.', data: results, newAccessToken: finalNewAccessToken, newExpiresAt: finalNewExpiresAt };
        }
    }
    
    // Fetch Nutrition (Calories In)
    console.log(`[Fitbit Sync] Fetching nutrition for ${date}...`);
    const nutritionResult = await fetchFitbitData({
        endpoint: endpoints.nutrition,
        currentAccessToken: tokenInfo.accessToken, // Use potentially refreshed token
        currentExpiresAt: tokenInfo.expiresAt,
    });
    
    if (nutritionResult.success && nutritionResult.data?.summary) {
        console.log(`[Fitbit Sync] Nutrition fetched successfully for ${date}.`);
        
        // Map to exactly what tests expect
        results.caloriesIn = nutritionResult.data.summary.calories;
        
        if (nutritionResult.newAccessToken && nutritionResult.newExpiresAt) {
            console.log("[Fitbit Sync] Token refreshed during nutrition fetch.");
            tokenInfo = { accessToken: nutritionResult.newAccessToken, expiresAt: nutritionResult.newExpiresAt };
            finalNewAccessToken = nutritionResult.newAccessToken;
            finalNewExpiresAt = nutritionResult.newExpiresAt;
        }
    } else {
        console.warn(`[Fitbit Sync] Failed to fetch nutrition for ${date}: ${nutritionResult.error}`);
        if (nutritionResult.error?.includes('scope')) {
            console.log(`[Fitbit Sync] Nutrition scope likely missing for user ${effectiveUserId}. Skipping nutrition data.`);
            errors.push(`Nutrition: Scope missing`);
        } else if (nutritionResult.error?.includes('unauthorized')) {
            console.error(`[Fitbit Sync] Unauthorized error fetching nutrition for ${date}. Aborting further fetches.`);
            return { success: false, error: 'unauthorized: Fitbit token invalid.', data: results, newAccessToken: finalNewAccessToken, newExpiresAt: finalNewExpiresAt };
        } else if (nutritionResult.error) {
            errors.push(`Nutrition: ${nutritionResult.error}`);
            overallSuccess = false;
        }
    }

    console.log(`[Fitbit Sync] Sync process completed for user ${effectiveUserId}, date: ${date}. Overall Success: ${overallSuccess}. Errors: ${errors.join(', ')}`);

    // Return combined data, success status, and any error messages
    return {
        success: overallSuccess,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        data: (results.steps !== undefined || results.caloriesOut !== undefined || results.sleepMinutesTotal !== undefined) ? results : undefined,
        newAccessToken: finalNewAccessToken,
        newExpiresAt: finalNewExpiresAt,
    };
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