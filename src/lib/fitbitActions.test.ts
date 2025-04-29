import { cookies } from 'next/headers';
// Import *as* to allow spying
import * as fitbitActions from './fitbitActions'; 
// Keep the direct import for the actual refresh tests
import { refreshFitbitToken, syncFitbitDataForDate, revokeFitbitToken, getCurrentUserId } from './fitbitActions'; // Add revokeFitbitToken and getCurrentUserId
import { kv } from '@vercel/kv'; // Import kv to mock its methods
import type { FitbitTokenData } from './fitbitActions'; // Import type if needed
// Remove unused import alias for the placeholder getCurrentUserId
// import { getCurrentUserId as authGetCurrentUserId } from '@/lib/auth'; 

// Mock next/headers cookies
const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []), // Example default for getAll
    has: jest.fn(() => false), // Example default for has
};
jest.mock('next/headers', () => ({
    cookies: () => mockCookies,
}));

// --- Add Mock for @vercel/kv --- 
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(), 
    del: jest.fn(), 
  }
}));
// --- End KV Mock --- 

// Mock fetch (global)
global.fetch = jest.fn();

// Mock console (global)
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock environment variables
const OLD_ENV = process.env;

// Cast the mocked KV methods for type safety in tests
const mockedKvGet = kv.get as jest.Mock;
const mockedKvSet = kv.set as jest.Mock;
const mockedKvDel = kv.del as jest.Mock;

// Mock root auth.ts (corrected path) before other imports
jest.mock('@/../auth', () => ({
    auth: jest.fn(),
}));

// Import the mocked auth function AFTER the jest.mock call
import { auth } from '@/../auth'; // Corrected import path

// Define mock user ID
const MOCK_USER_ID = 'mock-test-user-123';

// Helper function to set the mock return value for auth()
const mockAuthSession = (session: any) => {
    (auth as jest.Mock).mockResolvedValue(session);
};

describe('Fitbit Server Actions', () => {

    beforeEach(() => {
        jest.resetAllMocks(); 
        (fetch as jest.Mock).mockClear();
        mockedKvGet.mockClear().mockResolvedValue(null); // Default mock behavior for kv.get
        mockedKvSet.mockClear().mockResolvedValue(undefined); // Default mock behavior for kv.set
        mockedKvDel.mockClear().mockResolvedValue(1); // Default mock behavior for kv.del

        process.env = { 
            ...OLD_ENV, 
            NEXT_PUBLIC_FITBIT_CLIENT_ID: 'test-client-id', 
            FITBIT_CLIENT_SECRET: 'test-client-secret' 
        };
        // Reset cookie mocks
        mockCookies.get.mockReset();
        mockCookies.set.mockReset();
        mockCookies.delete.mockReset();
        mockCookies.getAll.mockReset().mockReturnValue([]);
        mockCookies.has.mockReset().mockReturnValue(false);

        // Reset ACTUAL auth mock before each test
        (auth as jest.Mock).mockClear();
        // Default to authenticated state for most tests unless overridden
        mockAuthSession({ user: { id: MOCK_USER_ID } }); 
    });

    afterEach(() => {
        jest.restoreAllMocks(); 
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    // --- refreshFitbitToken Tests --- 
    describe('refreshFitbitToken (Actual)', () => {
        it('should return error if no refresh token cookie exists', async () => {
            mockCookies.get.mockReturnValueOnce(undefined);
            const result = await refreshFitbitToken(); // Use direct import
            expect(result.success).toBe(false);
            expect(result.error).toBe('no_refresh_token_found');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should return error if Fitbit API call fails', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockResolvedValueOnce({ 
                ok: false, 
                status: 400, 
                json: async () => ({ errors: [{ errorType: 'invalid_request' }] }) 
            });
            const result = await refreshFitbitToken(); // Use direct import
            expect(result.success).toBe(false);
            expect(result.error).toBe('invalid_request');
            expect(mockCookies.delete).not.toHaveBeenCalled(); 
        });

        it('should delete cookie and return error if token is invalid/expired (invalid_grant)', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'invalid-refresh-token' });
            (fetch as jest.Mock).mockResolvedValueOnce({ 
                ok: false, 
                status: 401,
                json: async () => ({ errors: [{ errorType: 'invalid_grant' }] }) 
            });
            const result = await refreshFitbitToken(); // Use direct import
            expect(result.success).toBe(false);
            expect(result.error).toBe('invalid_grant');
            expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });

        it('should successfully refresh token, update cookie, and return new token info', async () => {
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockResolvedValueOnce({ 
                ok: true, 
                json: async () => ({ 
                    access_token: 'new-access-token', 
                    refresh_token: 'new-refresh-token', 
                    expires_in: 3600,
                    user_id: 'test-fitbit-user' 
                }) 
            });
            const result = await refreshFitbitToken(); // Use direct import
            expect(result.success).toBe(true);
            expect(result.access_token).toBe('new-access-token');
            expect(result.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
            expect(mockCookies.set).toHaveBeenCalledWith(
                'fitbit_refresh_token', 
                'new-refresh-token', 
                expect.objectContaining({ httpOnly: true, maxAge: expect.any(Number) })
            );
        });

         it('should handle network errors during refresh', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            const result = await refreshFitbitToken(); // Use direct import
            expect(result.success).toBe(false);
            expect(result.error).toBe('unknown_refresh_error');
        });
    });

    // --- fetchFitbitData Tests ---
    describe('fetchFitbitData', () => {
        const nowTimestamp = 1700000000;
        const oneHour = 3600;

        const validArgs = {
            endpoint: '/1/user/-/profile.json',
            currentAccessToken: 'valid-access-token',
            currentExpiresAt: nowTimestamp + oneHour
        };
        const expiredArgs = {
            endpoint: '/1/user/-/profile.json',
            currentAccessToken: 'expired-access-token',
            currentExpiresAt: nowTimestamp - 60
        };

        let dateNowSpy: jest.SpyInstance;

        beforeEach(() => {
             (fetch as jest.Mock).mockClear();
             dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowTimestamp * 1000);
        });

        afterEach(() => {
            dateNowSpy?.mockRestore();
        });

        it('should return error if current access token is missing', async () => {
            const result = await fitbitActions.fetchFitbitData({ endpoint: '/1/user/-/profile.json', currentAccessToken: null, currentExpiresAt: null });
            expect(result.success).toBe(false);
            expect(result.error).toBe('missing_client_token');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should fetch data successfully with a valid, non-expired token', async () => {
             (fetch as jest.Mock).mockResolvedValueOnce({ 
                 ok: true, json: async () => ({ user: { displayName: 'Test User' } }) 
             });
             const result = await fitbitActions.fetchFitbitData(validArgs);
             expect(result.success).toBe(true);
             expect(result.data?.user?.displayName).toBe('Test User');
        });

        it('should attempt refresh if token is expired', async () => {
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
             (fetch as jest.Mock).mockResolvedValueOnce({ // Refresh call
                 ok: true,
                 json: async () => ({
                     access_token: 'refreshed-access-token',
                     refresh_token: 'new-refresh-token',
                     expires_in: 3600,
                     user_id: 'test-fitbit-user'
                 })
             }).mockResolvedValueOnce({ // Data fetch call
                 ok: true, json: async () => ({ user: { displayName: 'Refreshed User' } })
             });

             const result = await fitbitActions.fetchFitbitData(expiredArgs);
             expect(result.success).toBe(true);
             expect(result.data?.user?.displayName).toBe('Refreshed User');
             expect(result.newAccessToken).toBe('refreshed-access-token');
             expect(result.newExpiresAt).toBe(nowTimestamp + 3600 - 300);
             expect(fetch).toHaveBeenCalledTimes(2);
             expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.fitbit.com/oauth2/token', expect.anything());
             expect(fetch).toHaveBeenNthCalledWith(2, `https://api.fitbit.com${expiredArgs.endpoint}`, expect.objectContaining({ headers: { Authorization: 'Bearer refreshed-access-token' } }));
             expect(mockCookies.set).toHaveBeenCalledWith('fitbit_refresh_token', 'new-refresh-token', expect.anything());
        });

        it('should return error if token refresh fails during data fetch', async () => {
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'invalid-refresh-token' });
             (fetch as jest.Mock).mockResolvedValueOnce({ // Refresh call fails
                 ok: false,
                 status: 401,
                 json: async () => ({ errors: [{ errorType: 'invalid_grant' }] })
             });

             const result = await fitbitActions.fetchFitbitData(expiredArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('invalid_grant'); // Error from refresh
             expect(result.data).toBeUndefined();
             expect(fetch).toHaveBeenCalledTimes(1); // Only refresh attempt
             expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });
        
        it('should return error if data fetch fails after successful fetch', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false, status: 500, json: async () => ({ errors: [{ errorType: 'server_error' }] })
            });
            const result = await fitbitActions.fetchFitbitData(validArgs);
            expect(result.success).toBe(false);
            expect(result.error).toBe('server_error');
            expect(result.data).toEqual({ errors: [{ errorType: 'server_error' }] });
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should return error if data fetch returns 403 Forbidden', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false, status: 403, json: async () => ({ errors: [{ errorType: 'forbidden' }] })
            });
            const result = await fitbitActions.fetchFitbitData(validArgs);
            expect(result.success).toBe(false);
            expect(result.error).toBe('forbidden');
            expect(mockCookies.delete).not.toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });

    // --- revokeFitbitToken Tests ---
    describe('revokeFitbitToken', () => {
        const testUserId = 'revoke-user-1';
        const tokenKey = `fitbit-token:user:${testUserId}`;
        const tokenDataToStore = { accessToken: 'token-to-revoke', refreshToken: 'refresh-revoke', expiresAt: Date.now()/1000 + 3600, fitbitUserId: 'fitbit-revoke-user' };

        beforeEach(() => {
            // Mock kv.get to return the token for this user
            mockedKvGet.mockClear().mockResolvedValue(tokenDataToStore);
        });

        it('should return error if getCurrentUserId fails', async () => {
            // Override the default mock to simulate no session
            mockAuthSession(null);
            const result = await revokeFitbitToken();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication error');
            expect(fetch).not.toHaveBeenCalled();
            expect(mockedKvDel).not.toHaveBeenCalled();
        });

        it('should call fetch with correct parameters to revoke token', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
            await revokeFitbitToken();

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(
                'https://api.fitbit.com/oauth2/revoke',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Basic '),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }),
                    body: expect.any(URLSearchParams)
                })
            );
            const body = (fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
            expect(body.get('token')).toBe(tokenDataToStore.refreshToken); // Should revoke refresh token ideally
        });

        it('should delete token from KV if API call is successful', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
            const result = await revokeFitbitToken();

            expect(result.success).toBe(true);
            expect(mockedKvDel).toHaveBeenCalledTimes(1);
            expect(mockedKvDel).toHaveBeenCalledWith(tokenKey);
        });

        it('should return success but not delete from KV if API returns 400/401', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });
            const result = await revokeFitbitToken();
            expect(result.success).toBe(true); // Still considered success from user perspective
            expect(mockedKvDel).not.toHaveBeenCalled();
        });

        it('should return error if API call fails with other status', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
            const result = await revokeFitbitToken();
            expect(result.success).toBe(false);
            expect(result.error).toContain('revoke_api_error');
            expect(mockedKvDel).not.toHaveBeenCalled();
        });

         it('should return error if kv.del fails', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
            mockedKvDel.mockRejectedValueOnce(new Error('KV Del Error'));
            const result = await revokeFitbitToken();
            expect(result.success).toBe(false);
            expect(result.error).toContain('kv_delete_error');
        });
    });

    // --- syncFitbitDataForDate Tests ---
    describe('syncFitbitDataForDate', () => {
        const testDate = '2024-01-15';
        const testUserId = MOCK_USER_ID; // Use the defined mock user ID
        const tokenKey = `fitbit-token:user:${testUserId}`;
        const validToken = 'valid-access-token';
        const expiredToken = 'expired-access-token';
        const refreshedToken = 'refreshed-access-token';
        const nowSec = Math.floor(Date.now() / 1000);
        const validExpiresAt = nowSec + 3600;
        const expiredExpiresAt = nowSec - 3600;
        const refreshedExpiresAt = nowSec + 3600 - 300; // Mock expiry from refresh function
        
        // Args object for testing KV path
        // Explicitly include undefined properties to match function signature
        const fetchFromKvArgs = { date: testDate, currentAccessToken: undefined, currentExpiresAt: undefined }; 
        // Args object for testing direct token path
        const validTokenArgs = { date: testDate, currentAccessToken: validToken, currentExpiresAt: validExpiresAt };
        const expiredTokenArgs = { date: testDate, currentAccessToken: expiredToken, currentExpiresAt: expiredExpiresAt };
        
        beforeEach(() => {
             // Mock kv.get to return the token for this user by default for sync tests
             const tokenDataToStore: FitbitTokenData = { accessToken: 'kv-access-token', refreshToken: 'kv-refresh-token', expiresAt: validExpiresAt, fitbitUserId: testUserId };
             mockedKvGet.mockClear().mockResolvedValue(JSON.stringify(tokenDataToStore));
             mockedKvDel.mockClear();
             mockCookies.get.mockClear().mockReturnValue({ name: 'fitbit_refresh_token', value: 'mock-refresh-cookie' }); // Assume refresh cookie exists for relevant tests
             mockCookies.set.mockClear();
             mockCookies.delete.mockClear();
             (fetch as jest.Mock).mockClear();
        });

        it('should return error if initial token is missing (when not passed directly and not in KV)', async () => {
            // Keep default auth mock (returns user)
            mockedKvGet.mockResolvedValue(null); // Simulate token not found in KV
            
            const result = await syncFitbitDataForDate(fetchFromKvArgs);
            expect(result.success).toBe(false);
            // Error should be about the token now, because auth succeeded
            expect(result.error).toBe('Fitbit token not found or invalid.'); 
            expect(auth).toHaveBeenCalledTimes(1); // Verify user ID was fetched
            expect(mockedKvGet).toHaveBeenCalledWith(tokenKey);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should return error if user is not authenticated (when fetching from KV)', async () => {
            // Simulate no session
            mockAuthSession(null);
            mockedKvGet.mockResolvedValue(null); // Ensure KV doesn't find a token either

            // Use fetchFromKvArgs which forces the auth check path
            const result = await syncFitbitDataForDate(fetchFromKvArgs); 
            expect(result.success).toBe(false);
            // Expect the specific error from syncFitbitDataForDate's catch block
            expect(result.error).toBe('User not authenticated'); 
            expect(auth).toHaveBeenCalledTimes(1); // Check that auth WAS called
            expect(mockedKvGet).not.toHaveBeenCalled(); // Should fail before KV access
            expect(fetch).not.toHaveBeenCalled();
        });
        
        it('should return error if refresh fails (when using expired token passed directly)', async () => {
            // Setup fetch mock to fail the refresh token call
            (fetch as jest.Mock).mockResolvedValueOnce({ 
                ok: false, 
                status: 400, 
                json: jest.fn().mockResolvedValue({ errors: [{ errorType: 'invalid_grant' }] }) 
            });

             const result = await syncFitbitDataForDate(expiredTokenArgs);
            expect(result.success).toBe(false);
            // Expect the specific error from the failed refresh returned by refreshFitbitToken
            expect(result.error).toBe('invalid_grant'); 
            expect(fetch).toHaveBeenCalledTimes(1); // Only the refresh call should happen
            expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token'); 
            expect(auth).not.toHaveBeenCalled(); // Auth not needed when token passed directly
        });

        it('should fetch data using token retrieved from KV', async () => {
            // Fix: Use correct property names matching FitbitTokenData type
            const storedTokenData: Partial<FitbitTokenData> = { 
                accessToken: validToken, 
                expiresAt: validExpiresAt, 
                refreshToken: 'kv-refresh-token' 
            };
            mockedKvGet.mockResolvedValue(storedTokenData);
            (fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { steps: 9999 } }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { totalMinutesAsleep: 480 } }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-heart': [{ value: { restingHeartRate: 60 } }] }) });

            // Pass args indicating fetch from KV
            const result = await syncFitbitDataForDate(fetchFromKvArgs); 
            expect(result.success).toBe(true);
            expect(result.data?.steps).toBe(9999);
            expect(auth).toHaveBeenCalledTimes(1);
            expect(mockedKvGet).toHaveBeenCalledWith(tokenKey);
            expect(fetch).toHaveBeenCalledTimes(3); 
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('activities/date'), expect.objectContaining({ headers: { Authorization: `Bearer ${validToken}` } }));
        });

        it('should return error if any required fetch fails (using valid token passed directly)', async () => {
            (fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { totalMinutesAsleep: 480 } }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-heart': [{ value: { restingHeartRate: 60 } }] }) });

            const result = await syncFitbitDataForDate(validTokenArgs); // Pass token directly
            expect(result.success).toBe(false);
            expect(result.error).toContain('activity_fetch_failed');
            expect(fetch).toHaveBeenCalledTimes(3); 
            expect(auth).not.toHaveBeenCalled(); // User ID not needed if token passed
            expect(mockedKvGet).not.toHaveBeenCalled();
        });

        it('should successfully fetch and combine data (using valid token passed directly)', async () => {
             (fetch as jest.Mock)
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { steps: 10000, caloriesOut: 2500, distance: 8.0, floors: 10, fairlyActiveMinutes: 30, veryActiveMinutes: 60 }, activities: [{ logId: 1, activityName: 'Run', calories: 300 }] }) })
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { totalTimeInBed: 500, totalMinutesAsleep: 450 }, sleep: [{ isMainSleep: true, levels: { summary: { light: { minutes: 200 }, deep: { minutes: 100 }, rem: { minutes: 150 } } } }] }) })
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-heart': [{ value: { restingHeartRate: 55 } }] }) });
            
             const result = await syncFitbitDataForDate(validTokenArgs);
             expect(result.success).toBe(true);
             expect(result.data).toEqual({
                 date: testDate,
                 steps: 10000,
                 activeMinutes: 90,
                 distanceKm: 8.0,
                 floors: 10,
                 restingHeartRate: 55,
                 caloriesOut: 2500,
                 sleepMinutesTotal: 450,
                 sleepLight: 200,
                 sleepDeep: 100,
                 sleepREM: 150,
                 sleepAwake: 50, // Calculated: totalTimeInBed - totalMinutesAsleep
                 activities: expect.any(Array) // Or more specific check
             });
             expect(fetch).toHaveBeenCalledTimes(3);
             expect(auth).not.toHaveBeenCalled();
             expect(mockedKvGet).not.toHaveBeenCalled();
        });

        it('should handle missing optional data (using valid token passed directly)', async () => {
            (fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { steps: 5000, caloriesOut: 2000, distance: 4.0, fairlyActiveMinutes: 20, veryActiveMinutes: 10 }, activities: [] }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ sleep: [] }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-heart': [] }) });
            
            const result = await syncFitbitDataForDate(validTokenArgs);
            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                date: testDate,
                steps: 5000,
                activeMinutes: 30,
                distanceKm: 4.0,
                floors: undefined,
                restingHeartRate: undefined,
                caloriesOut: 2000,
                sleepMinutesTotal: undefined,
                sleepLight: undefined,
                sleepDeep: undefined,
                sleepREM: undefined,
                sleepAwake: undefined,
                activities: []
            });
            expect(fetch).toHaveBeenCalledTimes(3);
            expect(auth).not.toHaveBeenCalled();
            expect(mockedKvGet).not.toHaveBeenCalled();
        });

        it('should trigger token refresh if initial token is expired (passed directly)', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'refresh-me' });
            (fetch as jest.Mock).mockResolvedValueOnce({ // Refresh API call
                ok: true,
                json: async () => ({ access_token: refreshedToken, refresh_token: 'new-refresh-token', expires_in: 3600, user_id: testUserId })
            });
            (fetch as jest.Mock) // Subsequent data calls
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { steps: 1 } }) })
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ summary: {} }) })
                 .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-heart': [] }) });
            
            const result = await syncFitbitDataForDate(expiredTokenArgs);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.newAccessToken).toBe(refreshedToken);
            expect(result.newExpiresAt).toBeCloseTo(Date.now() / 1000 + 3600 - 300, 0);
            expect(fetch).toHaveBeenCalledTimes(1 + 3);
            expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.fitbit.com/oauth2/token', expect.anything());
            expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/activities/date/'), expect.objectContaining({ headers: { Authorization: `Bearer ${refreshedToken}` } }));
            expect(mockCookies.set).toHaveBeenCalledWith('fitbit_refresh_token', 'new-refresh-token', expect.anything());
            expect(auth).not.toHaveBeenCalled();
            expect(mockedKvGet).not.toHaveBeenCalled();
        });
    });
}); 