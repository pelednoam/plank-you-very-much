import { type NextRequest, NextResponse } from 'next/server';
import { storeFitbitTokens } from '@/lib/fitbitActions'; // Import the refactored server action
// NOTE: Server-side store updates are tricky without a backend adapter or server actions.
// For now, we'll focus on the token exchange and assume client-side will react to redirection.
// import { useUserProfileStore } from '@/store/userProfileStore';

// NOTE: This API route handles server-to-server token exchange and storage initiation.
// The client-side settings page will need to react to the redirect parameters.

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    // Optional: Check state parameter for CSRF protection if implemented
    // const state = searchParams.get('state');

    if (!code) {
        console.error('Fitbit callback error: No code received.');
        return NextResponse.redirect(new URL('/settings?fitbit_status=error&reason=no_code', request.url));
    }

    // --- Environment Variables --- 
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Fitbit callback error: Missing environment variables.');
         return NextResponse.redirect(new URL('/settings?fitbit_status=error&reason=config_missing', request.url));
    }

    // --- Token Exchange --- 
    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    });

    let tokenData: any;
    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        tokenData = await response.json(); // Get data regardless of status for logging

        if (!response.ok) {
            console.error('Fitbit token exchange failed:', response.status, tokenData);
            const reason = tokenData?.errors?.[0]?.errorType || 'token_exchange_failed';
            return NextResponse.redirect(new URL(`/settings?fitbit_status=error&reason=${reason}&status=${response.status}`, request.url));
        }
    } catch (exchangeError) {
         console.error('Fitbit token exchange network error:', exchangeError);
         return NextResponse.redirect(new URL('/settings?fitbit_status=error&reason=token_exchange_network_error', request.url));
    }

    // --- Store Tokens using Server Action --- 
    const { access_token, refresh_token, user_id: fitbitUserId, expires_in } = tokenData;

    if (!access_token || !refresh_token || !fitbitUserId || expires_in === undefined) {
         console.error('Fitbit token exchange error: Incomplete token data received.', tokenData);
         return NextResponse.redirect(new URL('/settings?fitbit_status=error&reason=incomplete_token_data', request.url));
    }

    console.log("Fitbit token exchange successful. Calling server action to store tokens...");
    try {
        // Call the refactored server action
        const storeResult = await storeFitbitTokens({
            accessToken: access_token,
            refreshToken: refresh_token,
            fitbitUserId: fitbitUserId,
            expiresIn: expires_in, 
        });

        if (!storeResult.success) {
             console.error("Failed to store Fitbit tokens via server action:", storeResult.error);
             return NextResponse.redirect(new URL(`/settings?fitbit_status=error&reason=token_storage_failed&detail=${storeResult.error || 'unknown'}`, request.url));
        }
        
        console.log("Server action storeFitbitTokens completed successfully.");

    } catch (storeActionError) {
        console.error("Error executing storeFitbitTokens server action:", storeActionError);
        return NextResponse.redirect(new URL('/settings?fitbit_status=error&reason=token_storage_action_error', request.url));
    }

    // --- Redirect on Success --- 
    const redirectUrl = new URL('/settings?fitbit_status=success', request.url);
    // Pass fitbitUserId back to client for UI update
    redirectUrl.searchParams.set('fitbit_user', fitbitUserId);
    
    return NextResponse.redirect(redirectUrl);
} 