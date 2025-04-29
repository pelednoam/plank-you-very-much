import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const cookieStore = cookies();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    // Ensure this matches the redirect URI registered with Fitbit and used in the initial auth link
    const redirectUri = process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI; 

    // 1. Handle errors from Fitbit redirect
    if (error) {
        console.error(`[Fitbit Callback] Error from Fitbit: ${error}`);
        // Redirect back to settings with an error query param
        const settingsUrl = new URL('/settings', request.nextUrl.origin);
        settingsUrl.searchParams.set('fitbit_error', error);
        return NextResponse.redirect(settingsUrl);
    }

    // 2. Ensure required parameters and env vars are present
    if (!code) {
        console.error('[Fitbit Callback] Missing authorization code.');
        const settingsUrl = new URL('/settings', request.nextUrl.origin);
        settingsUrl.searchParams.set('fitbit_error', 'missing_code');
        return NextResponse.redirect(settingsUrl);
    }
     if (!clientId || !clientSecret || !redirectUri) {
        console.error('[Fitbit Callback] Missing Fitbit environment variables.');
         const settingsUrl = new URL('/settings', request.nextUrl.origin);
        settingsUrl.searchParams.set('fitbit_error', 'config_error');
        return NextResponse.redirect(settingsUrl);
    }

    // 3. Exchange authorization code for tokens
    const tokenUrl = 'https://api.fitbit.com/oauth2/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId, // Fitbit requires client_id even with Basic Auth for this grant
        redirect_uri: redirectUri,
    });

    let tokenData;
    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            cache: 'no-store', // Ensure fresh exchange
        });

        tokenData = await response.json();

        if (!response.ok) {
            const errorType = tokenData?.errors?.[0]?.errorType || 'token_exchange_failed';
            console.error(`[Fitbit Callback] Fitbit token exchange failed:`, response.status, tokenData);
            const settingsUrl = new URL('/settings', request.nextUrl.origin);
            settingsUrl.searchParams.set('fitbit_error', errorType);
            return NextResponse.redirect(settingsUrl);
        }
    } catch (fetchError) {
        console.error('[Fitbit Callback] Network error during token exchange:', fetchError);
        const settingsUrl = new URL('/settings', request.nextUrl.origin);
        settingsUrl.searchParams.set('fitbit_error', 'network_error');
        return NextResponse.redirect(settingsUrl);
    }

    // 4. Process successful token response
    const { access_token, refresh_token, expires_in, user_id: fitbitUserId } = tokenData;

    if (!access_token || !refresh_token || !expires_in || !fitbitUserId) {
         console.error('[Fitbit Callback] Incomplete token data received from Fitbit:', tokenData);
         const settingsUrl = new URL('/settings', request.nextUrl.origin);
        settingsUrl.searchParams.set('fitbit_error', 'incomplete_token_data');
        return NextResponse.redirect(settingsUrl);
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = nowInSeconds + expires_in - 300; // Add 5-min buffer

    // 5. Create redirect response and set cookie before returning
    const settingsUrl = new URL('/settings', request.nextUrl.origin);
    settingsUrl.searchParams.set('fitbit_connect', 'success');
    settingsUrl.searchParams.set('fitbit_access_token', access_token);
    settingsUrl.searchParams.set('fitbit_expires_at', expiresAt.toString());
    settingsUrl.searchParams.set('fitbit_user_id', fitbitUserId);

    const response = NextResponse.redirect(settingsUrl);

    // Set refresh token securely on the response
    response.cookies.set('fitbit_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
    });

    console.log(`[Fitbit Callback] Successfully obtained tokens for Fitbit user ${fitbitUserId}. Redirecting to settings.`);
    return response;
} 