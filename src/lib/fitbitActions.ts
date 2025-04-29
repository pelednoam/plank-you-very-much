'use server';

import { type FitbitTokenData } from '@/types'; // Updated import path

// --- Security Note ---
// This file demonstrates the interaction points for secure token storage.
// The current implementation uses console logs as placeholders.
// Replace the placeholder functions (dbGetUserFitbitTokens, etc.)
// with actual, secure database operations (e.g., using Supabase, FaunaDB, Vercel KV, encrypted database fields)
// associated with a verified application user ID. NEVER store tokens insecurely.
// --- End Security Note ---

/**
 * Retrieves the current application user ID.
 * FIXME: Replace this with your actual authentication logic (e.g., from NextAuth.js, Clerk, Supabase Auth).
 * Ensure the returned ID is verified and corresponds to the logged-in user.
 * @returns {Promise<string | null>} The current user's ID or null if not authenticated.
 */
async function getCurrentUserId(): Promise<string | null> {
    // Example using a hypothetical auth library:
    // const session = await getSession();
    // return session?.user?.id || null;
    console.warn("[Auth Placeholder] Using hardcoded placeholder user ID 'USER_123'. Replace with actual authentication.");
    return 'USER_123'; // Replace this!
}

// --- Database Interaction PLACEHOLDERS ---
// Replace these functions with calls to your secure database service.

/**
 * [PLACEHOLDER] Fetches encrypted Fitbit tokens for a given app user ID from secure storage.
 * @param appUserId The verified ID of the application user.
 * @returns {Promise<FitbitTokenData | null>} The decrypted token data or null if not found/error.
 */
async function dbGetUserFitbitTokens(appUserId: string): Promise<FitbitTokenData | null> {
  console.log(`[SECURE_STORAGE_PLACEHOLDER] Simulating fetching tokens for app user: ${appUserId}`);
  // In a real implementation:
  // 1. Query database for user record based on appUserId.
  // 2. Retrieve encrypted token data.
  // 3. Decrypt tokens.
  // 4. Return decrypted FitbitTokenData or null.
  // Example: const userData = await db.users.findUnique({ where: { id: appUserId }, select: { fitbitTokensEncrypted: true } });
  // if (!userData?.fitbitTokensEncrypted) return null;
  // return decryptTokens(userData.fitbitTokensEncrypted);
  return null; // Return null as no real storage exists
}

/**
 * [PLACEHOLDER] Encrypts and saves Fitbit tokens for a given app user ID in secure storage.
 * @param appUserId The verified ID of the application user.
 * @param tokenData The Fitbit token data to store.
 */
async function dbSaveUserFitbitTokens(appUserId: string, tokenData: FitbitTokenData): Promise<void> {
  console.log(`[SECURE_STORAGE_PLACEHOLDER] Simulating encrypting and saving tokens for app user: ${appUserId}`, { fitbitUserId: tokenData.fitbitUserId, expiresAt: tokenData.expiresAt });
  // In a real implementation:
  // 1. Encrypt tokenData.accessToken and tokenData.refreshToken using a strong algorithm and user-specific or application key.
  // 2. Save the encrypted data, fitbitUserId, and expiresAt timestamp to the user's record in the database.
  // Example: const encryptedData = encryptTokens(tokenData);
  // await db.users.update({ where: { id: appUserId }, data: { fitbitTokensEncrypted: encryptedData, fitbitUserId: tokenData.fitbitUserId, fitbitTokenExpiresAt: tokenData.expiresAt } });
}

/**
 * [PLACEHOLDER] Deletes Fitbit tokens for a given app user ID from secure storage.
 * @param appUserId The verified ID of the application user.
 */
async function dbDeleteUserFitbitTokens(appUserId: string): Promise<void> {
  console.log(`[SECURE_STORAGE_PLACEHOLDER] Simulating deleting tokens for app user: ${appUserId}`);
  // In a real implementation:
  // 1. Remove the Fitbit token data from the user's record in the database.
  // Example: await db.users.update({ where: { id: appUserId }, data: { fitbitTokensEncrypted: null, fitbitUserId: null, fitbitTokenExpiresAt: null } });
}

// --- End Database Interaction PLACEHOLDERS ---


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
    console.log(`[Fitbit Action] Storing tokens step for app user: ${appUserId}`);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    // Calculate expiry timestamp (add buffer, e.g., 5 minutes before actual expiry)
    const expiresAt = nowInSeconds + tokenData.expiresIn - 300; 

    const dataToStore: FitbitTokenData = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        fitbitUserId: tokenData.fitbitUserId, // Fitbit's ID for the user
        expiresAt: expiresAt,
    };

    try {
        // Replace placeholder with actual secure save operation
        await dbSaveUserFitbitTokens(appUserId, dataToStore);
        console.log(`[Fitbit Action] Tokens storage simulated for app user: ${appUserId}`);
        return { success: true };
    } catch (error) {
        console.error(`[Fitbit Action] Error during token storage simulation for user ${appUserId}:`, error);
        // Log specific storage errors in a real scenario
        return { success: false, error: 'storage_failed' };
    }
}


/**
 * Refreshes the Fitbit access token using the stored refresh token for the current user.
 * Updates the stored tokens on success.
 * **Requires actual secure storage implementation.**
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the refresh attempt.
 */
export async function refreshFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }
    console.log(`[Fitbit Action] Attempting token refresh for app user: ${appUserId}`);

    // Replace placeholder with actual secure retrieval
    const currentTokens = await dbGetUserFitbitTokens(appUserId);

    // **** IMPORTANT: Without actual storage, refresh cannot work ****
    if (!currentTokens?.refreshToken) {
        console.error(`[Fitbit Action] Refresh failed: No refresh token found/retrieved for user: ${appUserId} (Placeholder storage returned null).`);
        // In a real scenario, this means the user needs to reconnect.
        return { success: false, error: 'no_refresh_token_found' };
    }
    // **** End Important Note ****

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
        refresh_token: currentTokens.refreshToken,
    });

    try {
        console.log(`[Fitbit Action] Sending refresh request to Fitbit API for user ${appUserId}...`);
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            // Add caching directive if appropriate, though token refresh shouldn't be cached heavily
            // cache: 'no-store',
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorType = responseData?.errors?.[0]?.errorType || 'refresh_api_error';
            console.error(`[Fitbit Action] Fitbit token refresh HTTP error for user ${appUserId}:`, response.status, responseData);
            // If refresh token is invalid/expired, clear stored tokens to force re-authentication
            if (errorType === 'invalid_grant' || errorType === 'invalid_token') {
                console.warn(`[Fitbit Action] Refresh token invalid/expired for user ${appUserId}. Deleting stored tokens.`);
                await dbDeleteUserFitbitTokens(appUserId); // Replace placeholder
            }
            return { success: false, error: errorType };
        }

        // --- Refresh Successful ---
        const { access_token, refresh_token, user_id: fitbitUserId, expires_in } = responseData;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = nowInSeconds + expires_in - 300; // Recalculate expiry with buffer

        const updatedTokenData: FitbitTokenData = {
            accessToken: access_token,
            refreshToken: refresh_token,
            fitbitUserId: fitbitUserId,
            expiresAt: expiresAt,
        };

        // Replace placeholder with actual secure save operation
        await dbSaveUserFitbitTokens(appUserId, updatedTokenData);

        console.log(`[Fitbit Action] Token refresh successful, updated tokens stored for user: ${appUserId}`);
        return { success: true };

    } catch (error) {
        console.error(`[Fitbit Action] Network/unexpected error during token refresh for user ${appUserId}:`, error);
        return { success: false, error: 'unknown_refresh_error' };
    }
}

/**
 * Fetches data from a specified Fitbit API endpoint for the current user.
 * Handles automatic token refresh if the access token appears expired.
 * **Requires actual secure storage implementation.**
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
    console.log(`[Fitbit Action] Fetching data endpoint: ${endpoint} for user: ${appUserId}`);

    // Replace placeholder with actual secure retrieval
    let tokens = await dbGetUserFitbitTokens(appUserId);

    // **** IMPORTANT: Without actual storage, fetch cannot work reliably ****
    if (!tokens) {
        console.error(`[Fitbit Action] Fetch failed: No tokens found/retrieved for user: ${appUserId} (Placeholder storage returned null).`);
        // In a real scenario, this means the user needs to reconnect or authentication failed.
        return { success: false, error: 'no_tokens_found' };
    }
     // **** End Important Note ****

    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Check if token is expired or close to expiry
    if (tokens.expiresAt <= nowInSeconds) {
        console.log(`[Fitbit Action] Access token expired for user ${appUserId}. Attempting refresh...`);
        const refreshResult = await refreshFitbitToken(); // This function handles updating storage internally
        if (!refreshResult.success) {
            console.error(`[Fitbit Action] Token refresh failed during data fetch for user ${appUserId}. Error: ${refreshResult.error}`);
            // Propagate specific error from refresh function
            return { success: false, error: refreshResult.error || 'refresh_failed' };
        }
        // Re-fetch tokens after successful refresh
        tokens = await dbGetUserFitbitTokens(appUserId);
        if (!tokens) {
             console.error(`[Fitbit Action] Fetch failed: Tokens missing even after successful refresh for user: ${appUserId}.`);
             return { success: false, error: 'tokens_missing_post_refresh' };
        }
         console.log(`[Fitbit Action] Token refresh successful for user ${appUserId}, proceeding with data fetch.`);
    }

    // --- Proceed with API request using the valid access token ---
    const makeApiRequest = async (accessToken: string) => {
        const apiUrl = `https://api.fitbit.com${endpoint}`;
        console.log(`[Fitbit Action] Making API request to: ${apiUrl} for user ${appUserId}`);
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                 // Using 'force-cache' might be okay for profile, but not for daily activity/sleep.
                 // Use 'no-store' for data that changes frequently.
                cache: endpoint.includes('/profile.json') ? 'default' : 'no-store',
            });

            if (!response.ok) {
                const responseData = await response.json().catch(() => ({})); // Attempt to parse error, default empty
                const errorType = responseData?.errors?.[0]?.errorType || 'api_error';
                 console.error(`[Fitbit Action] Fitbit API request failed for user ${appUserId} (${endpoint}):`, response.status, responseData);
                 // Specific handling for invalid token errors, though refresh should catch most
                if (response.status === 401 || errorType === 'invalid_token' || errorType === 'expired_token') {
                    console.warn(`[Fitbit Action] API request got 401/invalid token for user ${appUserId}, despite recent check/refresh. Clearing tokens.`);
                     await dbDeleteUserFitbitTokens(appUserId); // Force re-auth
                     return { success: false, error: 'invalid_token' };
                 }
                return { success: false, error: errorType, data: responseData }; // Include error data if available
            }

            // Handle potential empty response body for certain API calls or statuses (e.g., 204 No Content)
             if (response.status === 204) {
                 console.log(`[Fitbit Action] Fitbit API request successful (204 No Content) for user ${appUserId} (${endpoint}).`);
                 return { success: true, data: null }; // Indicate success with null data
             }

             const data = await response.json();
             console.log(`[Fitbit Action] Fitbit API request successful for user ${appUserId} (${endpoint}).`);
            return { success: true, data: data };

        } catch (error) {
            console.error(`[Fitbit Action] Network or unexpected error during Fitbit API request for user ${appUserId} (${endpoint}):`, error);
            return { success: false, error: 'unknown_api_error' };
        }
    };

    // Make the request with the potentially refreshed token
    return await makeApiRequest(tokens.accessToken);
}


/**
 * Revokes the Fitbit refresh token and access token for the current user.
 * Deletes the stored tokens from secure storage.
 * **Requires actual secure storage implementation.**
 * @returns {Promise<{ success: boolean; error?: string }>} 
 */
export async function revokeFitbitToken(): Promise<{ success: boolean; error?: string }> {
    const appUserId = await getCurrentUserId();
    if (!appUserId) {
        return { success: false, error: 'not_authenticated' };
    }
     console.log(`[Fitbit Action] Revoking Fitbit tokens for app user: ${appUserId}`);

    // Replace placeholder with actual secure retrieval
    const tokens = await dbGetUserFitbitTokens(appUserId);

    // No need to fail if tokens are already gone, just ensure they are cleared locally
    if (!tokens?.refreshToken) {
        console.warn(`[Fitbit Action] No refresh token found to revoke for user: ${appUserId}. Ensuring local tokens are cleared.`);
         await dbDeleteUserFitbitTokens(appUserId); // Ensure cleanup
        return { success: true }; // Consider this success as the desired state (no tokens) is achieved
    }

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('[Fitbit Action] Revoke error: Missing Fitbit environment variables.');
        return { success: false, error: 'config_missing' };
    }

    const revokeUrl = 'https://api.fitbit.com/oauth2/revoke';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ token: tokens.refreshToken }); // Revoke using the refresh token

    try {
         console.log(`[Fitbit Action] Sending revoke request to Fitbit API for user ${appUserId}...`);
        const response = await fetch(revokeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        // Fitbit revoke returns 200 OK on success, even if token was already invalid.
        // It might return 400/401 for bad requests/credentials, but we proceed to delete local tokens regardless.
        if (!response.ok) {
            // Log the error but proceed with local deletion
            const responseData = await response.json().catch(() => ({}));
            console.warn(`[Fitbit Action] Fitbit token revoke API request failed for user ${appUserId} (Status: ${response.status}). Will still delete local tokens. Response:`, responseData);
         } else {
             console.log(`[Fitbit Action] Fitbit revoke API request successful for user ${appUserId}.`);
         }

    } catch (error) {
        // Log the error but proceed with local deletion
        console.error(`[Fitbit Action] Network/unexpected error during Fitbit revoke API call for user ${appUserId}:`, error);
    } finally {
        // **Crucially, always delete tokens from local secure storage after attempting revocation**
        try {
            await dbDeleteUserFitbitTokens(appUserId); // Replace placeholder
             console.log(`[Fitbit Action] Local Fitbit tokens deleted for user: ${appUserId} after revocation attempt.`);
            return { success: true };
        } catch (dbError) {
            console.error(`[Fitbit Action] CRITICAL: Failed to delete local Fitbit tokens for user ${appUserId} after revocation attempt:`, dbError);
            return { success: false, error: 'local_delete_failed' };
        }
    }
} 