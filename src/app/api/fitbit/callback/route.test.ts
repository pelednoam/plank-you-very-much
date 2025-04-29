import { GET } from '@/app/api/fitbit/callback/route'; // Target GET handler
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mock next/headers cookies
const mockSetCookie = jest.fn();
jest.mock('next/headers', () => ({
    cookies: () => ({ set: mockSetCookie }), // Only mock 'set' as needed by the route
}));

// Mock fetch
global.fetch = jest.fn();

// Mock NextResponse.redirect
const mockRedirect = jest.fn();
jest.mock('next/server', () => ({
    ...jest.requireActual('next/server'), // Keep original NextRequest, etc.
    NextResponse: {
        ...jest.requireActual('next/server').NextResponse,
        redirect: (url: URL | string) => {
            mockRedirect(url.toString()); // Capture the redirect URL
            // Return a mock response that has a cookies object for setting
            const resp = new Response(null, { status: 307 }); // Use a Response object
            const responseCookies = { set: mockSetCookie }; // Simulate cookie setting on the response
            Object.defineProperty(resp, 'cookies', { value: responseCookies, writable: false });
            return resp as unknown as NextResponse;
        },
    },
}));

describe('GET /api/fitbit/callback', () => {
    const mockClientId = 'TEST_CLIENT_ID';
    const mockClientSecret = 'TEST_CLIENT_SECRET';
    const mockApiCallbackUri = 'http://localhost:3000/api/fitbit/callback'; // The URI registered with Fitbit
    const mockSettingsPageUri = 'http://localhost:3000/settings';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID = mockClientId;
        process.env.FITBIT_CLIENT_SECRET = mockClientSecret;
        process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI = mockApiCallbackUri;
    });

    it('should redirect to settings with error if error param is present', async () => {
        const error = 'access_denied';
        const requestUrl = `${mockApiCallbackUri}?error=${error}`;
        const request = new NextRequest(requestUrl);

        await GET(request);

        expect(mockRedirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
        expect(redirectUrl.searchParams.get('fitbit_error')).toBe(error);
        expect(fetch).not.toHaveBeenCalled();
        expect(mockSetCookie).not.toHaveBeenCalled(); // Corrected mock name
    });

    it('should redirect to settings with error if code param is missing', async () => {
        const requestUrl = mockApiCallbackUri; // No code or error
        const request = new NextRequest(requestUrl);

        await GET(request);

        expect(mockRedirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
        expect(redirectUrl.searchParams.get('fitbit_error')).toBe('missing_code');
        expect(fetch).not.toHaveBeenCalled();
        expect(mockSetCookie).not.toHaveBeenCalled();
    });

    it('should redirect to settings with error if config is missing', async () => {
        delete process.env.FITBIT_CLIENT_SECRET; // Simulate missing secret
        const code = 'test_code_no_config';
        const requestUrl = `${mockApiCallbackUri}?code=${code}`;
        const request = new NextRequest(requestUrl);

        await GET(request);

        expect(mockRedirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
        expect(redirectUrl.searchParams.get('fitbit_error')).toBe('config_error');
        expect(fetch).not.toHaveBeenCalled();
        expect(mockSetCookie).not.toHaveBeenCalled();
    });

    it('should redirect to settings with error if Fitbit token exchange fails', async () => {
        const code = 'test_auth_code_fail';
        const apiErrorType = 'invalid_grant';
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401, // Unauthorized
            json: async () => ({ errors: [{ errorType: apiErrorType }] }),
        });

        const requestUrl = `${mockApiCallbackUri}?code=${code}`;
        const request = new NextRequest(requestUrl);

        await GET(request);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(mockRedirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
        expect(redirectUrl.searchParams.get('fitbit_error')).toBe(apiErrorType);
        expect(mockSetCookie).not.toHaveBeenCalled();
    });
    
     it('should redirect to settings with error if token exchange causes network error', async () => {
         const code = 'test_auth_code_network_fail';
         (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Failed'));

         const requestUrl = `${mockApiCallbackUri}?code=${code}`;
         const request = new NextRequest(requestUrl);

         await GET(request);

         expect(fetch).toHaveBeenCalledTimes(1);
         expect(mockRedirect).toHaveBeenCalledTimes(1);
         const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
         expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
         expect(redirectUrl.searchParams.get('fitbit_error')).toBe('network_error');
         expect(mockSetCookie).not.toHaveBeenCalled();
     });

    it('should exchange code, set cookie, and redirect to settings with token info on success', async () => {
        const code = 'valid_auth_code_success';
        const fitbitUserId = 'FITBIT_USER_SUCCESS';
        const accessToken = 'success_access_token';
        const refreshToken = 'success_refresh_token';
        const expiresIn = 28800; // 8 hours
        const now = Math.floor(Date.now() / 1000);
        const expectedExpiresAt = (now + expiresIn - 300).toString(); // Match calculation and string conversion

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
                user_id: fitbitUserId,
            }),
        });

        const requestUrl = `${mockApiCallbackUri}?code=${code}`;
        const request = new NextRequest(requestUrl);

        await GET(request);

        // Verify fetch call
        expect(fetch).toHaveBeenCalledTimes(1);
        const [fetchUrl, fetchOptions] = (fetch as jest.Mock).mock.calls[0];
        
        expect(fetchUrl).toBe('https://api.fitbit.com/oauth2/token');
        expect(fetchOptions.method).toBe('POST');
        expect(fetchOptions.headers).toBeDefined();
        expect(fetchOptions.headers['Authorization']).toContain('Basic ');
        expect(fetchOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(fetchOptions.cache).toBe('no-store');
        // Check that body is a string, as fetch stringifies URLSearchParams
        expect(fetchOptions.body).toEqual(expect.any(String)); 
        
        // Verify the content of the body string (re-parse for easier checking)
        const actualBodyParams = new URLSearchParams(fetchOptions.body);
        expect(actualBodyParams.get('grant_type')).toBe('authorization_code');
        expect(actualBodyParams.get('code')).toBe(code);
        expect(actualBodyParams.get('client_id')).toBe(mockClientId);
        expect(actualBodyParams.get('redirect_uri')).toBe(mockApiCallbackUri); // Check non-encoded URI here

        // Verify redirect
        expect(mockRedirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRedirect.mock.calls[0][0]);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(mockSettingsPageUri);
        expect(redirectUrl.searchParams.get('fitbit_connect')).toBe('success');
        expect(redirectUrl.searchParams.get('fitbit_access_token')).toBe(accessToken);
        expect(redirectUrl.searchParams.get('fitbit_user_id')).toBe(fitbitUserId);
        // Check expiresAt (as string)
        const receivedExpiresAt = redirectUrl.searchParams.get('fitbit_expires_at');
        expect(receivedExpiresAt).toBeDefined();
        // Allow slight tolerance in timestamp comparison
        expect(Math.abs(parseInt(receivedExpiresAt!, 10) - parseInt(expectedExpiresAt, 10))).toBeLessThanOrEqual(2);

        // Verify cookie setting (should be called by the mock redirect response)
        expect(mockSetCookie).toHaveBeenCalledTimes(1);
        expect(mockSetCookie).toHaveBeenCalledWith(
            'fitbit_refresh_token',
            refreshToken,
            expect.objectContaining({
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
            })
        );
    });
}); 