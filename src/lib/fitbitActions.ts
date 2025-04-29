'use server';

// TODO: Replace placeholder in-memory storage with a secure database (e.g., Vercel KV, Postgres, Supabase).
// TODO: Implement proper user authentication to get the actual appUserId.

interface FitbitTokenData {
  accessToken: string;
  refreshToken: string;
  fitbitUserId: string; // ID of the user on Fitbit's platform
  expiresAt: number;    // Timestamp (seconds since epoch) when the token expires
}

// --- Placeholder Storage (REMOVE THIS IN PRODUCTION) --- 
let userFitbitDataStore: { [appUserId: string]: FitbitTokenData } = {};
// --- End Placeholder Storage ---

// --- Database Interaction Functions (Conceptual) --- 
// Replace these with actual database calls

async function dbGetUserFitbitTokens(appUserId: string): Promise<FitbitTokenData | null> {
  console.log(`[DB Placeholder] Getting Fitbit tokens for app user: ${appUserId}`);
  return userFitbitDataStore[appUserId] || null;
}

async function dbUpdateUserFitbitTokens(appUserId: string, tokenData: FitbitTokenData): Promise<void> {
  console.log(`[DB Placeholder] Updating Fitbit tokens for app user: ${appUserId}`);
  userFitbitDataStore[appUserId] = tokenData;
  // Example: await database.collection('users').updateOne({ _id: appUserId }, { $set: { fitbit: tokenData } });
}

async function dbDeleteUserFitbitTokens(appUserId: string): Promise<void> {
  console.log(`[DB Placeholder] Deleting Fitbit tokens for app user: ${appUserId}`);
  delete userFitbitDataStore[appUserId];
  // Example: await database.collection('users').updateOne({ _id: appUserId }, { $unset: { fitbit: "" } });
}

// --- End Database Interaction Functions ---

/**
 * Retrieves the current application user ID.
 * FIXME: Replace this with your actual authentication logic (e.g., from NextAuth.js, Clerk).
 * @returns {Promise<string | null>} The current user's ID or null if not authenticated.
 */
async function getCurrentUserId(): Promise<string | null> {
    // Example using a hypothetical auth library:
    // const session = await getSession(); 
    // return session?.user?.id || null;
    console.warn("[Auth Placeholder] Using placeholder user ID.");
    return 'USER_123'; // Replace this!
}

/**
 * Stores Fitbit tokens securely associated with the current application user.
 * Calculates and stores the expiry timestamp.
 * @param tokenData The token data received from Fitbit (including expiresIn in seconds).
 * @returns {Promise<{ success: boolean; error?: string }>} 
 */
export async function storeFitbitTokens(
    tokenData: Omit<FitbitTokenData, 'expiresAt'> & { expiresIn: number }
): Promise<{ success: boolean; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }

    console.log(`[Server Action] Storing Fitbit tokens for app user: ${appUserId}`);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    // Calculate expiry timestamp (add buffer, e.g., 5 minutes before actual expiry)
    const expiresAt = nowInSeconds + tokenData.expiresIn - 300; 

    const dataToStore: FitbitTokenData = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        fitbitUserId: tokenData.fitbitUserId,
        expiresAt: expiresAt,
    };

    try {
        await dbUpdateUserFitbitTokens(appUserId, dataToStore);
        console.log(`[Server Action] Tokens stored securely for app user: ${appUserId}`);
        return { success: true };
    } catch (error) {
        console.error(`[Server Action] Error storing Fitbit tokens for user ${appUserId}:`, error);
        return { success: false, error: 'storage_failed' };
    }
}


/**
 * Refreshes the Fitbit access token using the stored refresh token for the current user.
 * Updates the stored tokens on success.
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the refresh attempt.
 */
export async function refreshFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }
    console.log(`[Server Action] Attempting Fitbit token refresh for app user: ${appUserId}`);

    const currentTokens = await dbGetUserFitbitTokens(appUserId);

    if (!currentTokens?.refreshToken) {
        console.error(`[Server Action] Fitbit refresh failed: No refresh token found for user: ${appUserId}`);
        return { success: false, error: 'no_refresh_token' };
    }

    // Check if token is actually likely expired before refreshing (optional optimization)
    // const nowInSeconds = Math.floor(Date.now() / 1000);
    // if (currentTokens.expiresAt > nowInSeconds) {
    //     console.log(`[Server Action] Token not expired yet for user ${appUserId}, skipping refresh.`);
    //     return { success: true }; // Treat as success
    // }

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Server Action] Fitbit refresh error: Missing environment variables.');
        return { success: false, error: 'config_missing' };
    }

    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentTokens.refreshToken,
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error(`[Server Action] Fitbit token refresh HTTP error for user ${appUserId}:`, response.status, responseData);
            const errorType = responseData?.errors?.[0]?.errorType || 'refresh_failed';
            // If refresh token is invalid, clear stored tokens to force re-authentication
            if (errorType === 'invalid_grant' || errorType === 'invalid_token') {
                console.warn(`[Server Action] Refresh token invalid for user ${appUserId}. Clearing tokens.`);
                await dbDeleteUserFitbitTokens(appUserId);
            }
            return { success: false, error: errorType };
        }

        const { access_token, refresh_token, user_id: fitbitUserId, expires_in } = responseData;
        
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = nowInSeconds + expires_in - 300; // Recalculate expiry with buffer

        const updatedTokenData: FitbitTokenData = {
            accessToken: access_token,
            refreshToken: refresh_token,
            fitbitUserId: fitbitUserId, // Should match the original one from Fitbit
            expiresAt: expiresAt,
        };

        // Update stored tokens with the new ones
        await dbUpdateUserFitbitTokens(appUserId, updatedTokenData);

        console.log(`[Server Action] Fitbit token refresh successful for user: ${appUserId}`);
        return { success: true };

    } catch (error) {
        console.error(`[Server Action] Network or unexpected error during Fitbit refresh for user ${appUserId}:`, error);
        return { success: false, error: 'unknown_refresh_error' };
    }
}

/**
 * Fetches data from a specified Fitbit API endpoint for the current user.
 * Handles automatic token refresh if the access token appears expired.
 * @param endpoint The Fitbit API endpoint path (e.g., '/1/user/-/profile.json').
 * @returns {Promise<{ success: boolean; data?: any; error?: string }>} Result of the fetch attempt.
 */
export async function fetchFitbitData(
    endpoint: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }
    console.log(`[Server Action] Fetching Fitbit data for endpoint: ${endpoint} for user: ${appUserId}`);

    let tokens = await dbGetUserFitbitTokens(appUserId);

    if (!tokens) {
        console.error(`[Server Action] Fetch Fitbit data failed: No tokens found for user: ${appUserId}`);
        return { success: false, error: 'no_tokens_found' };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Check if token needs refresh *before* the first API call
    if (tokens.expiresAt <= nowInSeconds) {
        console.log(`[Server Action] Fitbit token likely expired for user ${appUserId}. Attempting refresh before API call...`);
        const refreshResult = await refreshFitbitToken(); // This function now handles getting the userId
        if (!refreshResult.success) {
            console.error(`[Server Action] Fitbit token refresh failed before data fetch for user ${appUserId}:`, refreshResult.error);
            return { success: false, error: `pre_refresh_failed: ${refreshResult.error}` };
        }
        // Get the newly refreshed tokens
        tokens = await dbGetUserFitbitTokens(appUserId);
        if (!tokens) {
            console.error(`[Server Action] Fetch Fitbit data failed: No tokens found after pre-refresh for user: ${appUserId}`);
            return { success: false, error: 'no_tokens_after_pre_refresh' };
        }
    }

    // Proceed with API request using the potentially refreshed token
    const makeApiRequest = async (accessToken: string) => {
        const apiUrl = `https://api.fitbit.com${endpoint}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            return response;
        } catch (error) {
            console.error(`[Server Action] Network error fetching Fitbit data for user ${appUserId}:`, error);
            throw new Error('network_error'); // Throw specific error for handling
        }
    };

    try {
        const response = await makeApiRequest(tokens.accessToken);
        const responseData = await response.json(); // Try to parse JSON regardless of status for error details

        if (!response.ok) {
            // Don't try refreshing again here if the pre-check was done
             console.error(`[Server Action] Fitbit API request failed for user ${appUserId}: ${response.status}`, responseData);
            const errorType = responseData?.errors?.[0]?.errorType || `api_error_${response.status}`;

            // Handle potential invalid token error even after pre-check/refresh (e.g., revoked access)
            if (response.status === 401) {
                 console.warn(`[Server Action] Fitbit API returned 401 for user ${appUserId} despite token validity check/refresh. Clearing tokens.`);
                 await dbDeleteUserFitbitTokens(appUserId);
                 return { success: false, error: 'invalid_token_post_refresh' };
            }
            return { success: false, error: errorType, data: responseData };
        }

        console.log(`[Server Action] Fitbit data fetched successfully for endpoint ${endpoint} for user: ${appUserId}`);
        return { success: true, data: responseData };

    } catch (error: any) {
        console.error(`[Server Action] Error during Fitbit data fetch process for user ${appUserId}:`, error);
        return { success: false, error: error.message || 'unknown_fetch_error' };
    }
}

/**
 * Revokes the Fitbit tokens for the current user on Fitbit's side and deletes them locally.
 * @returns {Promise<{ success: boolean; error?: string }>} 
 */
export async function revokeFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }
    console.log(`[Server Action] Revoking Fitbit token for app user: ${appUserId}`);

    const tokens = await dbGetUserFitbitTokens(appUserId);

    // Try to revoke even if only refresh token exists, but prioritize access token
    const tokenToRevoke = tokens?.accessToken || tokens?.refreshToken;

    if (!tokenToRevoke) {
        console.warn(`[Server Action] No Fitbit token found for user ${appUserId} to revoke. Clearing local data anyway.`);
        await dbDeleteUserFitbitTokens(appUserId);
        return { success: true }; // Considered success as there's nothing to revoke
    }

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Server Action] Fitbit revoke error: Missing environment variables.');
        // Still attempt to delete local token
        await dbDeleteUserFitbitTokens(appUserId);
        return { success: false, error: 'config_missing' };
    }

    const revokeUrl = 'https://api.fitbit.com/oauth2/revoke';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ token: tokenToRevoke });

    try {
        const response = await fetch(revokeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        // Fitbit revoke returns 200 even if the token is invalid/already revoked
        if (!response.ok) {
            // This indicates a server error or configuration issue on Fitbit's side
            const responseData = await response.text(); // Read text as it might not be JSON
            console.error(`[Server Action] Fitbit token revocation failed for user ${appUserId}: ${response.status}`, responseData);
            // Still attempt to delete local token despite API error
            await dbDeleteUserFitbitTokens(appUserId);
            return { success: false, error: `revoke_api_error_${response.status}` };
        }

        console.log(`[Server Action] Fitbit token successfully revoked via API for user: ${appUserId}.`);

    } catch (error) {
        console.error(`[Server Action] Network or unexpected error during Fitbit revoke for user ${appUserId}:`, error);
         // Still attempt to delete local token despite network error
        await dbDeleteUserFitbitTokens(appUserId);
        return { success: false, error: 'unknown_revoke_error' };
    } finally {
         // Always ensure local tokens are deleted after attempting revocation
        await dbDeleteUserFitbitTokens(appUserId);
        console.log(`[Server Action] Local Fitbit tokens deleted for user: ${appUserId}.`);
    }

    return { success: true };
} 