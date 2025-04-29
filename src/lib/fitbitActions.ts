'use server';

import { type FitbitTokenData } from '@/types';
import { cookies } from 'next/headers'; // Needed for reading/writing cookies in Server Actions
import type { FitbitDaily } from '@/types'; // Import the shared type

// --- Security Note ---
// Refresh tokens are now stored in secure, HTTP-only cookies.
// Access tokens are managed client-side (e.g., Zustand) and passed to relevant actions.
// Ensure NEXT_PUBLIC_FITBIT_REDIRECT_URI points to the /api/fitbit/callback route.
// Ensure FITBIT_CLIENT_SECRET is only in server-side environment variables.
// --- End Security Note ---

/**
 * Retrieves the current application user ID.
 * FIXME: Replace this with your actual authentication logic (e.g., from NextAuth.js, Clerk, Supabase Auth).
 * @returns {Promise<string | null>} The current user's ID or null if not authenticated.
 */
async function getCurrentUserId(): Promise<string | null> {
    console.warn("[Auth Placeholder] Using hardcoded placeholder user ID 'USER_123'. Replace with actual authentication.");
    return 'USER_123'; // Replace this!
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
    newAccessToken?: string;
    newExpiresAt?: number;
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
        return { success: true, newAccessToken: access_token, newExpiresAt: newExpiresAt };

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
        if (!refreshResult.success || !refreshResult.newAccessToken || !refreshResult.newExpiresAt) {
            console.error(`[Fitbit Action] Token refresh failed during data fetch. Error: ${refreshResult.error}`);
            return { success: false, error: refreshResult.error || 'refresh_failed' };
        }
        // Use the newly refreshed token
        accessTokenToUse = refreshResult.newAccessToken;
        newAccessToken = refreshResult.newAccessToken; // Store to return to client
        newExpiresAt = refreshResult.newExpiresAt; // Store to return to client
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
 * Revokes the current user's Fitbit refresh token and clears the stored cookie.
 * @returns {Promise<{ success: boolean; error?: string }>} 
 */
export async function revokeFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('fitbit_refresh_token')?.value;

    if (!refreshToken) {
        // No token to revoke, consider it a success from the user's perspective
        console.warn('[Fitbit Action] Revoke called but no refresh token cookie found.');
        return { success: true }; 
    }

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Fitbit Action] Revoke error: Missing Fitbit environment variables.');
        return { success: false, error: 'config_missing' };
    }

    const revokeUrl = 'https://api.fitbit.com/oauth2/revoke';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ token: refreshToken });

    try {
        console.log('[Fitbit Action] Sending revoke request to Fitbit API...');
        const response = await fetch(revokeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
             cache: 'no-store',
        });

        // Clear the local cookie regardless of Fitbit API response success/failure,
        // as the user intends to disconnect.
        try { 
            const store = await cookies();
            store.delete('fitbit_refresh_token'); 
        } catch(e) { console.error("Failed to delete cookie", e); }
        console.log('[Fitbit Action] Local refresh token cookie deleted.');

        if (!response.ok) {
            // Log the error but don't necessarily return failure to the user,
            // as the local token is cleared anyway.
            const responseData = await response.json().catch(() => ({})); // Catch JSON parse error if no body
            const errorType = responseData?.errors?.[0]?.errorType || 'revoke_api_error';
            console.error(`[Fitbit Action] Fitbit API revoke failed: ${response.status}`, responseData);
            // Still return success because the cookie was deleted
            return { success: true, error: errorType }; // Return true, but include error info
        }

        console.log('[Fitbit Action] Fitbit token successfully revoked via API.');
        return { success: true };

    } catch (error) {
        console.error(`[Fitbit Action] Network/unexpected error during token revoke:`, error);
        // Ensure cookie is deleted even on network error
        try { 
            if (refreshToken) { // Only delete if we confirmed it existed
                 const store = await cookies();
                 store.delete('fitbit_refresh_token'); 
                 console.log('[Fitbit Action] Local refresh token cookie deleted after revoke network error.');
            }
        } catch(e) { 
            console.error("Failed to delete cookie after revoke network error", e); 
        }
        // Still return success because the user intent (disconnect) is fulfilled locally
        return { success: true, error: 'unknown_revoke_error' }; // Return true, but include error info
    }
}

// --- Full Data Sync Actions ---

/**
 * Fetches and consolidates Fitbit activity and sleep data for a specific date.
 * Handles token checks and refreshes via fetchFitbitData.
 *
 * @param date The date to sync in YYYY-MM-DD format.
 * @param currentAccessToken The current access token.
 * @param currentExpiresAt The expiry timestamp (seconds) of the current access token.
 * @returns Promise resolving to the sync result, including consolidated data or errors.
 */
export async function syncFitbitDataForDate({
    date,
    currentAccessToken,
    currentExpiresAt
}: {
    date: string; // Expecting YYYY-MM-DD
    currentAccessToken: string | null | undefined;
    currentExpiresAt: number | null | undefined;
}): Promise<{
    success: boolean;
    data?: FitbitDaily; // Use imported type
    error?: string;
    newAccessToken?: string; // Pass through from fetchFitbitData
    newExpiresAt?: number;   // Pass through from fetchFitbitData
}> {
    console.log(`[Fitbit Sync] Starting sync for date: ${date}`);

    // Basic date validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error(`[Fitbit Sync] Invalid date format: ${date}`);
        return { success: false, error: 'invalid_date_format' };
    }

    if (!currentAccessToken || !currentExpiresAt) {
        console.error(`[Fitbit Sync] Missing initial token details.`);
        return { success: false, error: 'missing_client_token' };
    }

    let workingAccessToken = currentAccessToken;
    let workingExpiresAt = currentExpiresAt;
    let latestNewAccessToken: string | undefined = undefined;
    let latestNewExpiresAt: number | undefined = undefined;

    // Initialize with the date, other fields are optional per FitbitDaily type
    const consolidatedData: Partial<FitbitDaily> = { date };
    const errors: string[] = [];

    // --- Fetch Activity Data ---
    // Endpoint for daily activity summary (includes steps, calories, resting heart rate if available)
    const activityEndpoint = `/1/user/-/activities/date/${date}.json`;
    console.log(`[Fitbit Sync] Fetching activity data from ${activityEndpoint}`);
    const activityResult = await fetchFitbitData({
        endpoint: activityEndpoint,
        currentAccessToken: workingAccessToken,
        currentExpiresAt: workingExpiresAt,
    });

    // Process activity data if fetch was successful and summary exists
    if (activityResult.success && activityResult.data?.summary) {
        console.log("[Fitbit Sync] Activity data fetched successfully.");
        const { summary } = activityResult.data;
        // Safely assign values using optional chaining or checks if needed,
        // although the 'FitbitDaily' type marks these as optional (except date)
        consolidatedData.steps = summary.steps;
        consolidatedData.caloriesOut = summary.caloriesOut;
        // Resting heart rate might not always be present in the summary
        if (summary.restingHeartRate !== undefined) {
            consolidatedData.restingHeartRate = summary.restingHeartRate;
        }
    } else {
        // Log and record the error
        const errorMsg = activityResult.error || 'unknown_activity_error';
        console.error(`[Fitbit Sync] Failed to fetch activity data. Error: ${errorMsg}`);
        errors.push(`activity_fetch_failed: ${errorMsg}`);
        // If a critical token error occurred, stop early and return the error
        // These errors mean subsequent requests will also fail
        if (['invalid_grant', 'invalid_token', 'unauthorized_token_likely_invalid', 'config_missing', 'missing_client_token', 'refresh_failed'].includes(errorMsg)) {
             return { success: false, error: errorMsg, newAccessToken: activityResult.newAccessToken, newExpiresAt: activityResult.newExpiresAt };
        }
    }

    // Update working tokens if a refresh occurred during the activity fetch
    if (activityResult.newAccessToken && activityResult.newExpiresAt) {
        console.log("[Fitbit Sync] Token refreshed during activity fetch. Updating working tokens.");
        workingAccessToken = activityResult.newAccessToken;
        workingExpiresAt = activityResult.newExpiresAt;
        latestNewAccessToken = activityResult.newAccessToken;
        latestNewExpiresAt = activityResult.newExpiresAt;
    }

    // --- Fetch Sleep Data ---
    // Endpoint for sleep summary
    const sleepEndpoint = `/1/user/-/sleep/date/${date}.json`;
    console.log(`[Fitbit Sync] Fetching sleep data from ${sleepEndpoint}`);
    const sleepResult = await fetchFitbitData({
        endpoint: sleepEndpoint,
        currentAccessToken: workingAccessToken, // Use potentially updated token
        currentExpiresAt: workingExpiresAt,   // Use potentially updated expiry
    });

    // Process sleep data if fetch was successful and summary exists
    if (sleepResult.success && sleepResult.data?.summary) {
         console.log("[Fitbit Sync] Sleep data fetched successfully.");
         // Ensure totalMinutesAsleep exists in the summary
        if (sleepResult.data.summary.totalMinutesAsleep !== undefined) {
            consolidatedData.sleepMinutes = sleepResult.data.summary.totalMinutesAsleep;
        } else {
             console.warn("[Fitbit Sync] Sleep data summary fetched, but totalMinutesAsleep is missing.");
             // Optionally add a non-critical error/warning if needed
             // errors.push('sleep_data_incomplete: missing totalMinutesAsleep');
        }
    } else {
        // Log and record the error
        const errorMsg = sleepResult.error || 'unknown_sleep_error';
        console.error(`[Fitbit Sync] Failed to fetch sleep data. Error: ${errorMsg}`);
        errors.push(`sleep_fetch_failed: ${errorMsg}`);
        // Check for critical token errors again (less likely if activity fetch succeeded/refreshed)
        if (['invalid_grant', 'invalid_token', 'unauthorized_token_likely_invalid', 'config_missing', 'missing_client_token', 'refresh_failed'].includes(errorMsg)) {
             // Return the critical error
            return { success: false, error: errorMsg, newAccessToken: sleepResult.newAccessToken || latestNewAccessToken, newExpiresAt: sleepResult.newExpiresAt || latestNewExpiresAt };
        }
    }

     // Update latest tokens if a refresh occurred *during* the sleep fetch
     // This ensures the very latest token details are returned if multiple refreshes happened (unlikely but possible)
     if (sleepResult.newAccessToken && sleepResult.newExpiresAt) {
        console.log("[Fitbit Sync] Token refreshed during sleep fetch. Updating latest tokens.");
        latestNewAccessToken = sleepResult.newAccessToken;
        latestNewExpiresAt = sleepResult.newExpiresAt;
    }

    // --- Final Result ---
    // Determine overall success based on whether any errors were recorded
    const overallSuccess = errors.length === 0;

    if (!overallSuccess) {
        console.warn(`[Fitbit Sync] Completed with errors for date ${date}:`, errors.join(", "));
        // Return failure, include any partial data collected, and the latest token info
        return {
            success: false,
            error: errors.join(", "),
            // Return partial data only if more than just the date was populated
            data: Object.keys(consolidatedData).length > 1 ? (consolidatedData as FitbitDaily) : undefined,
            newAccessToken: latestNewAccessToken,
            newExpiresAt: latestNewExpiresAt,
        };
    } else {
        console.log(`[Fitbit Sync] Completed successfully for date ${date}.`);
        // Return success, the fully consolidated data, and any new token info
        return {
            success: true,
            // All required fields should be present if no errors occurred (or handled gracefully above)
            // Cast to FitbitDaily as per the type definition
            data: consolidatedData as FitbitDaily,
            newAccessToken: latestNewAccessToken,
            newExpiresAt: latestNewExpiresAt,
        };
    }
} 