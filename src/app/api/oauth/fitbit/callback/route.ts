import { type NextRequest, NextResponse } from 'next/server';
import { storeFitbitTokens } from '@/lib/fitbitActions'; // Import the server action
// NOTE: Server-side store updates are tricky without a backend adapter or server actions.
// For now, we'll focus on the token exchange and assume client-side will react to redirection.
// import { useUserProfileStore } from '@/store/userProfileStore';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    // Optional: Check state parameter for CSRF protection if implemented
    // const state = searchParams.get('state');

    if (!code) {
        console.error('Fitbit callback error: No code received.');
        // Redirect back to settings with an error
        return NextResponse.redirect(new URL('/settings?fitbit=error&reason=no_code', request.url));
    }

    // --- Environment Variables --- 
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Fitbit callback error: Missing environment variables.');
         return NextResponse.redirect(new URL('/settings?fitbit=error&reason=config_missing', request.url));
    }

    // --- Token Exchange --- 
    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        // client_id: clientId, // Spec says include in body AND header, but often only header needed
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Fitbit token exchange failed:', response.status, errorData);
            const reason = errorData?.errors?.[0]?.errorType || 'token_exchange_failed';
            return NextResponse.redirect(new URL(`/settings?fitbit=error&reason=${reason}&status=${response.status}`, request.url));
        }

        const tokenData = await response.json();
        const { access_token, refresh_token, user_id: fitbitUserId, expires_in } = tokenData;

        // --- Store Tokens using Server Action --- 
        console.log("Fitbit connection successful. Calling server action to store tokens...");
        
        try {
            await storeFitbitTokens({
                accessToken: access_token,
                refreshToken: refresh_token,
                fitbitUserId: fitbitUserId,
                expiresIn: expires_in, // Store expiry time
            });
            console.log("Server action storeFitbitTokens completed.");
        } catch (storeError) {
            console.error("Failed to store Fitbit tokens via server action:", storeError);
            // Decide how to handle: still redirect success? Or show specific error?
            // For now, log error and continue with success redirect.
             return NextResponse.redirect(new URL('/settings?fitbit=error&reason=token_storage_failed', request.url));
        }

        // --- Redirect on Success --- 
        // Pass fitbitUserId back to client for potential store update
        const redirectUrl = new URL('/settings?fitbit=success', request.url);
        // Add fitbitUserId to search params for client-side handling
        if (fitbitUserId) {
             redirectUrl.searchParams.set('fitbit_user', fitbitUserId);
        }
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error('Fitbit callback error:', error);
        return NextResponse.redirect(new URL('/settings?fitbit=error&reason=unknown', request.url));
    }
} 