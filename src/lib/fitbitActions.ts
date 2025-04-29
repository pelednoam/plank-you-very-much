'use server';

import { type FitbitTokenData } from '@/types';
import { cookies } from 'next/headers'; // Needed for reading/writing cookies in Server Actions

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
    const refreshToken = cookies().get('fitbit_refresh_token')?.value;

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
                try { cookies().delete('fitbit_refresh_token'); } catch (e) { console.error("Failed to delete cookie", e); }
            }
            return { success: false, error: errorType };
        }

        // --- Refresh Successful ---
        const { access_token, refresh_token: new_refresh_token, expires_in } = responseData;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const newExpiresAt = nowInSeconds + expires_in - 300; // Recalculate expiry with buffer

        try {
            cookies().set('fitbit_refresh_token', new_refresh_token, {
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
                 try { cookies().delete('fitbit_refresh_token'); } catch(e) { console.error("Failed to delete cookie", e); }
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
    const refreshToken = cookies().get('fitbit_refresh_token')?.value;

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
        try { cookies().delete('fitbit_refresh_token'); } catch(e) { console.error("Failed to delete cookie", e); }
        console.log('[Fitbit Action] Local refresh token cookie deleted.');

        if (!response.ok) {
            // Log the error but don't necessarily return failure to the user,
            // as the local token is cleared anyway.
            const responseData = await response.json().catch(() => ({})); // Catch JSON parse error if no body
            const errorType = responseData?.errors?.[0]?.errorType || 'revoke_api_error';
            console.error(`[Fitbit Action] Fitbit token revoke API error:`, response.status, responseData);
            // Return success because the user's connection state is cleared locally.
             return { success: true, error: `revoke_api_error: ${errorType}` }; // Optionally pass API error info
        }

        console.log('[Fitbit Action] Fitbit token successfully revoked via API.');
        return { success: true };

    } catch (error) {
        console.error('[Fitbit Action] Network/unexpected error during token revocation:', error);
        // Still clear the local cookie in case of network error
        try { cookies().delete('fitbit_refresh_token'); } catch(e) { console.error("Failed to delete cookie after error", e); }
        return { success: false, error: 'unknown_revoke_error' };
    }
}

// --- Full Data Sync Actions (Placeholder) ---

// Example structure - needs implementation
export async function syncFitbitDataForDate(date: string /* YYYY-MM-DD */): Promise<any> {
     // This function would orchestrate calls to fetchFitbitData for specific endpoints
     // Needs access token details from client-side state
     // Example:
     // const profileData = await fetchFitbitData({ endpoint: '/1/user/-/profile.json', ...tokenArgs });
     // const activityData = await fetchFitbitData({ endpoint: `/1/user/-/activities/date/${date}.json`, ...tokenArgs });
     // const sleepData = await fetchFitbitData({ endpoint: `/1/user/-/sleep/date/${date}.json`, ...tokenArgs });
     // ... process and store data ... 
     console.warn(`[Fitbit Action] syncFitbitDataForDate for ${date} - Not fully implemented.`);
     return { success: false, error: 'not_implemented' };
} 