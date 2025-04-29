'use server';

// TODO: Implement proper secure server-side storage (e.g., database)
// For now, this is a placeholder

interface FitbitTokenData {
  accessToken: string;
  refreshToken: string;
  fitbitUserId: string;
  expiresIn: number; // Seconds until expiry
}

// Placeholder storage (replace with secure method)
let userFitbitData: { [userId: string]: FitbitTokenData } = {}; 

/**
 * Stores Fitbit tokens server-side.
 * NOTE: This currently uses an insecure in-memory store and needs a user association mechanism.
 * @param tokenData The token data received from Fitbit.
 */
export async function storeFitbitTokens(tokenData: FitbitTokenData) {
  console.log("[Server Action] Storing Fitbit tokens for user:", tokenData.fitbitUserId);
  // FIXME: Need a way to get the *actual* application user ID here to associate tokens correctly.
  // Using fitbitUserId as the key is insecure if multiple app users could link the same Fitbit account.
  const appUserId = 'PLACEHOLDER_APP_USER_ID'; // Replace with actual user ID logic

  userFitbitData[appUserId] = {
      ...tokenData,
  };

  console.log("[Server Action] Tokens stored (in-memory) for app user:", appUserId);
  // console.log("Current stored data:", userFitbitData); // Avoid logging tokens

  // In a real scenario, you would update a database here.
  // Example: await db.updateUser(appUserId, { fitbit: tokenData });
}

/**
 * Retrieves stored Fitbit tokens for a user.
 * NOTE: Needs proper user association.
 * @returns Stored token data or null if not found.
 */
export async function getFitbitTokens() {
    // FIXME: Need actual user ID
    const appUserId = 'PLACEHOLDER_APP_USER_ID';
    console.log("[Server Action] Getting Fitbit tokens for app user:", appUserId);
    return userFitbitData[appUserId] || null;
}

/**
 * Clears stored Fitbit tokens for a user.
 * NOTE: Needs proper user association.
 */
export async function clearFitbitTokens() {
    // FIXME: Need actual user ID
    const appUserId = 'PLACEHOLDER_APP_USER_ID';
    console.log("[Server Action] Clearing Fitbit tokens for app user:", appUserId);
    delete userFitbitData[appUserId];
}

/**
 * Refreshes the Fitbit access token using the stored refresh token.
 * Updates the stored tokens on success.
 * NOTE: Needs proper user association and error handling.
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the refresh attempt.
 */
export async function refreshFitbitToken(): Promise<{ success: boolean; error?: string }> {
    // FIXME: Need actual user ID
    const appUserId = 'PLACEHOLDER_APP_USER_ID';
    console.log("[Server Action] Attempting Fitbit token refresh for app user:", appUserId);

    const currentTokens = await getFitbitTokens(); // Uses the same placeholder logic

    if (!currentTokens?.refreshToken) {
        console.error("[Server Action] Fitbit refresh failed: No refresh token found for user:", appUserId);
        return { success: false, error: 'no_refresh_token' };
    }

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
            console.error('[Server Action] Fitbit token refresh failed:', response.status, responseData);
            const errorType = responseData?.errors?.[0]?.errorType || 'refresh_failed';
            // If refresh token is invalid, we might need to clear stored tokens and prompt re-auth
            if (errorType === 'invalid_grant' || errorType === 'invalid_token') {
                console.warn("[Server Action] Refresh token likely invalid. Clearing tokens for user:", appUserId);
                await clearFitbitTokens();
            }
            return { success: false, error: errorType };
        }

        const { access_token, refresh_token, user_id: fitbitUserId, expires_in } = responseData;

        // Update stored tokens with the new ones
        await storeFitbitTokens({
            accessToken: access_token,
            refreshToken: refresh_token,
            fitbitUserId: fitbitUserId, // Should match the original
            expiresIn: expires_in,
        });

        console.log("[Server Action] Fitbit token refresh successful for user:", appUserId);
        return { success: true };

    } catch (error) {
        console.error('[Server Action] Fitbit refresh error:', error);
        return { success: false, error: 'unknown' };
    }
}

/**
 * Fetches data from a specified Fitbit API endpoint.
 * Handles automatic token refresh if the access token is expired.
 * NOTE: Needs proper user association.
 * @param endpoint The Fitbit API endpoint path (e.g., '/1/user/-/profile.json').
 * @returns {Promise<{ success: boolean; data?: any; error?: string }>} Result of the fetch attempt.
 */
export async function fetchFitbitData(
    endpoint: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    // FIXME: Need actual user ID
    const appUserId = 'PLACEHOLDER_APP_USER_ID';
    console.log(`[Server Action] Fetching Fitbit data for endpoint: ${endpoint} for user: ${appUserId}`);

    let tokens = await getFitbitTokens();

    if (!tokens?.accessToken) {
        console.error("[Server Action] Fetch Fitbit data failed: No access token found for user:", appUserId);
        return { success: false, error: 'no_access_token' };
    }

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
            console.error('[Server Action] Network error fetching Fitbit data:', error);
            throw new Error('network_error'); // Throw specific error for handling
        }
    };

    try {
        let response = await makeApiRequest(tokens.accessToken);

        if (response.status === 401) { // Token expired or invalid
            console.log("[Server Action] Fitbit access token expired or invalid. Attempting refresh...");
            const refreshResult = await refreshFitbitToken();

            if (!refreshResult.success) {
                console.error("[Server Action] Fitbit token refresh failed during data fetch:", refreshResult.error);
                return { success: false, error: `refresh_failed: ${refreshResult.error}` };
            }

            // Get the newly refreshed tokens
            tokens = await getFitbitTokens();
            if (!tokens?.accessToken) {
                 console.error("[Server Action] Fetch Fitbit data failed: No access token found after refresh for user:", appUserId);
                 return { success: false, error: 'no_access_token_after_refresh' };
            }

            console.log("[Server Action] Retrying Fitbit API request with new token...");
            response = await makeApiRequest(tokens.accessToken);
        }

        // Process the final response (either initial or after refresh)
        const responseData = await response.json();

        if (!response.ok) {
            console.error(`[Server Action] Fitbit API request failed after potential refresh: ${response.status}`, responseData);
            const errorType = responseData?.errors?.[0]?.errorType || `api_error_${response.status}`;
            return { success: false, error: errorType, data: responseData }; // Include data for context
        }

        console.log(`[Server Action] Fitbit data fetched successfully for endpoint: ${endpoint}`);
        return { success: true, data: responseData };

    } catch (error: any) {
        // Catch network errors from makeApiRequest or other unexpected errors
        console.error('[Server Action] Error during Fitbit data fetch process:', error);
        return { success: false, error: error.message || 'unknown_fetch_error' };
    }
} 