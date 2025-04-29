import { cookies } from 'next/headers';
// Import *as* to allow spying
import * as fitbitActions from './fitbitActions'; 
// Keep the direct import for the actual refresh tests
import { refreshFitbitToken } from './fitbitActions'; 

// Mock next/headers cookies
const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    [Symbol.iterator]: jest.fn(),
    [Symbol.toStringTag]: 'RequestCookies', 
};
jest.mock('next/headers', () => ({
    cookies: () => mockCookies,
}));

// Mock fetch (global)
global.fetch = jest.fn();

// Mock console (global)
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock environment variables
const OLD_ENV = process.env;

// No global mock needed here
// const mockedRefreshFitbitToken = ...;

describe('Fitbit Server Actions', () => {

    beforeEach(() => {
        jest.resetAllMocks(); 
        // Ensure fetch mock is reset if needed, though resetAllMocks should handle it
        (fetch as jest.Mock).mockClear();

        process.env = { 
            ...OLD_ENV, 
            NEXT_PUBLIC_FITBIT_CLIENT_ID: 'test-client-id', 
            FITBIT_CLIENT_SECRET: 'test-client-secret' 
        };
        mockCookies.get.mockReset();
        mockCookies.set.mockReset();
        mockCookies.delete.mockReset();
    });

    afterEach(() => {
        // Restore original implementations mocked manually or with spyOn
        jest.restoreAllMocks(); 
    });

    afterAll(() => {
        process.env = OLD_ENV;
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        // REMOVED: Unmocking the removed mock
        // jest.unmock('./fitbitActions'); 
    });

    // --- refreshFitbitToken Tests --- 
    // Keep these as they were (calling the imported function directly)
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
            expect(result.newAccessToken).toBe('new-access-token');
            expect(result.newExpiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
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
        // REMOVE spy variable as spying on the internal function is problematic
        // let refreshSpy: jest.SpyInstance | undefined;

        beforeEach(() => {
             (fetch as jest.Mock).mockClear();
             dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowTimestamp * 1000);
             // REMOVE the spy attempt
             // try {
             //    refreshSpy = jest.spyOn(fitbitActions, 'refreshFitbitToken');
             // } catch (e) {
             //     refreshSpy = undefined;
             // }
        });

        afterEach(() => {
            dateNowSpy?.mockRestore();
            // REMOVE restoring the removed spy
            // refreshSpy?.mockRestore();
        });

        // Tests below are now enabled
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
             // REMOVE check for internal spy call
             // expect(refreshSpy).not.toHaveBeenCalled();
        });

        it('should attempt refresh if token is expired', async () => {
             // Set up the mock cookie *before* calling the function that needs it internally
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });

             // Mock the fetch call that refreshFitbitToken would make
             (fetch as jest.Mock).mockResolvedValueOnce({ // Mock for refresh call
                 ok: true,
                 json: async () => ({
                     access_token: 'refreshed-access-token',
                     refresh_token: 'new-refresh-token',
                     expires_in: 3600,
                     user_id: 'test-fitbit-user'
                 })
             }).mockResolvedValueOnce({ // Mock for the actual data fetch call
                 ok: true, json: async () => ({ user: { displayName: 'Refreshed User' } })
             });

             const result = await fitbitActions.fetchFitbitData(expiredArgs);
             expect(result.success).toBe(true);
             expect(result.data?.user?.displayName).toBe('Refreshed User');
             expect(result.newAccessToken).toBe('refreshed-access-token'); // Check if refresh result is passed back
             expect(result.newExpiresAt).toBe(nowTimestamp + 3600 - 300); // Check if expiry is passed back

             // Verify fetch was called twice: once for refresh, once for data
             expect(fetch).toHaveBeenCalledTimes(2);
             // Check the first call (refresh)
             expect(fetch).toHaveBeenNthCalledWith(1,
                'https://api.fitbit.com/oauth2/token',
                expect.objectContaining({ method: 'POST' })
             );
             // Check the second call (data fetch with *new* token)
             expect(fetch).toHaveBeenNthCalledWith(2,
                 `https://api.fitbit.com${expiredArgs.endpoint}`,
                 expect.objectContaining({
                     method: 'GET',
                     headers: expect.objectContaining({ 'Authorization': `Bearer refreshed-access-token` })
                 })
             );
             // Verify the cookie was set with the new refresh token
             expect(mockCookies.set).toHaveBeenCalledWith(
                 'fitbit_refresh_token',
                 'new-refresh-token',
                 expect.anything() // Check existence, specifics tested in refreshFitbitToken tests
             );
        });

        it('should return error if token refresh fails during data fetch', async () => {
             // Set up the mock cookie *before* calling the function that needs it internally
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'invalid-refresh-token' });

             // Mock the fetch call for refreshFitbitToken to fail
             (fetch as jest.Mock).mockResolvedValueOnce({ // Mock for refresh call
                 ok: false,
                 status: 401,
                 json: async () => ({ errors: [{ errorType: 'invalid_grant' }] })
             });

             const result = await fitbitActions.fetchFitbitData(expiredArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('invalid_grant');
             expect(result.data).toBeUndefined();
             // Verify fetch was only called once (for the failed refresh)
             expect(fetch).toHaveBeenCalledTimes(1);
             expect(fetch).toHaveBeenCalledWith('https://api.fitbit.com/oauth2/token', expect.anything());
             // Verify cookie was deleted because refresh failed with invalid_grant
             expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });

        it('should return error if data fetch fails after successful fetch', async () => {
             // This test checks the direct fetch failure scenario, no prior calls needed.
             (fetch as jest.Mock).mockResolvedValueOnce({
                 ok: false, status: 500, json: async () => ({ errors: [{ errorType: 'server_error' }] })
             });

             const result = await fitbitActions.fetchFitbitData(validArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('server_error'); // Should get the specific error type
             // Current implementation returns the error JSON in the data field on failure
             expect(result.data).toEqual({ errors: [{ errorType: 'server_error' }] });
             expect(fetch).toHaveBeenCalledTimes(1);
             expect(fetch).toHaveBeenCalledWith(`https://api.fitbit.com${validArgs.endpoint}`, expect.anything());
        });

         it('should handle network error during data fetch', async () => {
             (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
             const result = await fitbitActions.fetchFitbitData(validArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('unknown_fetch_error');
             expect(fetch).toHaveBeenCalledTimes(1);
         });

         it('should return specific error and delete cookie if data fetch returns 401', async () => {
             (fetch as jest.Mock).mockResolvedValueOnce({
                 ok: false, status: 401, json: async () => ({ errors: [{ errorType: 'invalid_token' }] })
             });
             const result = await fitbitActions.fetchFitbitData(validArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('unauthorized_token_likely_invalid');
             expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
             expect(fetch).toHaveBeenCalledTimes(1);
         });

         it('should return specific error if data fetch returns non-401 error', async () => {
             (fetch as jest.Mock).mockResolvedValueOnce({
                 ok: false, status: 403, json: async () => ({ errors: [{ errorType: 'forbidden' }] })
             });
             const result = await fitbitActions.fetchFitbitData(validArgs);
             expect(result.success).toBe(false);
             expect(result.error).toBe('forbidden'); // Should pick up the errorType
             expect(mockCookies.delete).not.toHaveBeenCalled(); // Don't delete cookie on non-401 errors
             expect(fetch).toHaveBeenCalledTimes(1);
         });
    });

    // --- revokeFitbitToken Tests ---
    // These also need the *actual* implementation
     describe('revokeFitbitToken (Actual)', () => {
        let actualRevokeFitbitToken: typeof fitbitActions.revokeFitbitToken;

        beforeAll(() => {
            actualRevokeFitbitToken = jest.requireActual<typeof fitbitActions>('./fitbitActions').revokeFitbitToken;
        });

        it('should return success if no refresh token cookie exists', async () => {
            mockCookies.get.mockReturnValueOnce(undefined);
            const result = await actualRevokeFitbitToken(); // Use actual
            expect(result.success).toBe(true);
            expect(fetch).not.toHaveBeenCalled();
        });
        it('should call revoke API and delete cookie on success', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
            const result = await actualRevokeFitbitToken();
            expect(result.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith('https://api.fitbit.com/oauth2/revoke', expect.any(Object));
            expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });
        it('should delete cookie even if revoke API call fails', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });
            const result = await actualRevokeFitbitToken();
            expect(result.success).toBe(true); // Expect success as cookie is deleted
            expect(fetch).toHaveBeenCalledWith('https://api.fitbit.com/oauth2/revoke', expect.any(Object));
            expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });
        it('should handle network errors during revoke', async () => {
            mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token' });
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
             const result = await actualRevokeFitbitToken(); // Use actual
             expect(result.success).toBe(true); // Expect success as cookie is deleted
             expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
        });
    });

    // --- syncFitbitDataForDate Tests ---
    // Add tests for the sync function here
    describe('syncFitbitDataForDate', () => {
         const testDate = '2024-01-15';
         const nowTimestamp = 1700000000;
         const oneHour = 3600;
         const validTokenArgs = {
             currentAccessToken: 'valid-sync-token',
             currentExpiresAt: nowTimestamp + oneHour
         };
         const expiredTokenArgs = {
             currentAccessToken: 'expired-sync-token',
             currentExpiresAt: nowTimestamp - 60
         };

         let dateNowSpy: jest.SpyInstance;

         beforeEach(() => {
             // Mock fetch directly instead of spying
             (fetch as jest.Mock).mockClear();
             // We need to spy on fetchFitbitData now to control its return value
             // for the different API calls made by syncFitbitDataForDate
             dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowTimestamp * 1000);
         });

         afterEach(() => {
             dateNowSpy.mockRestore();
         });

        it('should return error if initial token is missing', async () => {
             const result = await fitbitActions.syncFitbitDataForDate({
                 date: testDate,
                 currentAccessToken: null,
                 currentExpiresAt: null
             });
             expect(result.success).toBe(false);
             expect(result.error).toBe('missing_client_token'); // Should fail early
             // Verify fetch was NOT called because it failed before making API calls
             expect(fetch).not.toHaveBeenCalled();
        });

        it('should return error if any required fetch fails', async () => {
            // Mock the underlying fetch for the first API call (activities) to fail
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false, status: 500, json: async () => ({ errors: [{ errorType: 'test_fetch_error' }] })
            }).mockResolvedValueOnce({ // Mock the second call (sleep) to succeed but return no data
                ok: true, json: async () => ({ summary: {} })
            });

            const result = await fitbitActions.syncFitbitDataForDate({ date: testDate, ...validTokenArgs });

            expect(result.success).toBe(false);
            // Expect the combined error string based on current implementation
            expect(result.error).toBe('activity_fetch_failed: test_fetch_error'); // Sleep doesn't add error if fetch is ok but data missing
            // Check that fetch was called once for the failing activities endpoint
            expect(fetch).toHaveBeenCalledTimes(2); // Both fetches are attempted
            expect(fetch).toHaveBeenCalledWith(
                `https://api.fitbit.com/1/user/-/activities/date/${testDate}.json`,
                expect.objectContaining({
                    headers: expect.objectContaining({ 'Authorization': `Bearer ${validTokenArgs.currentAccessToken}` })
                })
            );
        });

         it('should successfully fetch and combine activity, sleep, and heart rate data', async () => {
             const mockActivityData = { summary: { steps: 10000, caloriesOut: 2500, restingHeartRate: 60 } };
             const mockSleepData = { summary: { totalMinutesAsleep: 420 } };
             // Note: Heart rate data might be nested differently depending on the exact endpoint used.
             // Assuming the endpoint `/1/user/-/activities/heart/date/${date}/1d.json` returns resting HR within activities object
             // Let's simplify and assume resting HR comes only from activities summary for now.

             // Mock fetchFitbitData for each endpoint call
             (fetch as jest.Mock)
                 .mockResolvedValueOnce({ ok: true, json: async () => mockActivityData }) // Activities
                 .mockResolvedValueOnce({ ok: true, json: async () => mockSleepData });   // Sleep

             const result = await fitbitActions.syncFitbitDataForDate({ date: testDate, ...validTokenArgs });

             expect(result.success).toBe(true);
             expect(result.data).toEqual({
                 date: testDate,
                 steps: 10000,
                 caloriesOut: 2500,
                 restingHeartRate: 60,
                 sleepMinutes: 420,
             });
             expect(result.error).toBeUndefined();
             expect(result.newAccessToken).toBeUndefined(); // No refresh needed
             expect(result.newExpiresAt).toBeUndefined();

             // Verify fetch was called twice with correct endpoints and token
             expect(fetch).toHaveBeenCalledTimes(2);
             expect(fetch).toHaveBeenNthCalledWith(1,
                 `https://api.fitbit.com/1/user/-/activities/date/${testDate}.json`,
                 expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': `Bearer ${validTokenArgs.currentAccessToken}` }) })
             );
             expect(fetch).toHaveBeenNthCalledWith(2,
                 `https://api.fitbit.com/1/user/-/sleep/date/${testDate}.json`,
                  // Pass original token details again, fetchFitbitData handles refresh internally if needed on *first* call
                 expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': `Bearer ${validTokenArgs.currentAccessToken}` }) })
             );
         });

         it('should handle missing optional data (sleep, heart rate)', async () => {
             const mockActivityData = { summary: { steps: 5000, caloriesOut: 2000 } }; // No restingHeartRate
             const mockSleepData = { summary: {} }; // No totalMinutesAsleep

             // Mock underlying fetch
             (fetch as jest.Mock)
                 .mockResolvedValueOnce({ ok: true, json: async () => mockActivityData })
                 .mockResolvedValueOnce({ ok: true, json: async () => mockSleepData });

             const result = await fitbitActions.syncFitbitDataForDate({ date: testDate, ...validTokenArgs });

             expect(result.success).toBe(true);
             expect(result.data).toEqual({
                 date: testDate,
                 steps: 5000,
                 caloriesOut: 2000,
                 restingHeartRate: undefined, // Should be undefined if not present
                 sleepMinutes: undefined,    // Should be undefined if not present
             });
             expect(fetch).toHaveBeenCalledTimes(2); // Verify both fetches happened
         });

          it('should trigger token refresh via fetchFitbitData if initial token is expired', async () => {
             const refreshedToken = 'refreshed-sync-token';
             // Expiry should account for the 300s buffer applied in refreshFitbitToken
             const refreshedExpiry = nowTimestamp + oneHour - 300;
             const mockActivityData = { summary: { steps: 100, caloriesOut: 100 } };
             const mockSleepData = { summary: { totalMinutesAsleep: 10 } };

             // Mock cookie for refresh
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'valid-refresh-token-for-sync' });

             // Mock underlying fetch calls:
             // 1. Refresh call (successful)
             // 2. Activities call (successful, uses new token)
             // 3. Sleep call (successful, uses new token)
             (fetch as jest.Mock)
                 .mockResolvedValueOnce({ // Mock for refresh call triggered by first fetchFitbitData
                     ok: true,
                     json: async () => ({
                         access_token: refreshedToken,
                         refresh_token: 'new-refresh-token-sync',
                         expires_in: 3600,
                     })
                 })
                 .mockResolvedValueOnce({ // Mock for activities data call
                     ok: true, json: async () => mockActivityData
                 })
                 .mockResolvedValueOnce({ // Mock for sleep data call
                     ok: true, json: async () => mockSleepData
                 });


             const result = await fitbitActions.syncFitbitDataForDate({ date: testDate, ...expiredTokenArgs });

             expect(result.success).toBe(true);
             expect(result.data).toBeDefined();
             expect(result.newAccessToken).toBe(refreshedToken); // Pass through the refreshed token details
             expect(result.newExpiresAt).toBe(refreshedExpiry);

             // Verify fetch was called 3 times: refresh, activities, sleep
             expect(fetch).toHaveBeenCalledTimes(3);

             // 1st call: Refresh token
             expect(fetch).toHaveBeenNthCalledWith(1,
                 'https://api.fitbit.com/oauth2/token',
                 expect.objectContaining({ method: 'POST' })
             );
             // 2nd call: Activities data (using NEW token)
             expect(fetch).toHaveBeenNthCalledWith(2,
                 `https://api.fitbit.com/1/user/-/activities/date/${testDate}.json`,
                 expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': `Bearer ${refreshedToken}` }) })
             );
             // 3rd call: Sleep data (using NEW token)
             expect(fetch).toHaveBeenNthCalledWith(3,
                 `https://api.fitbit.com/1/user/-/sleep/date/${testDate}.json`,
                 expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': `Bearer ${refreshedToken}` }) })
             );
             // Verify cookie was updated
             expect(mockCookies.set).toHaveBeenCalledWith('fitbit_refresh_token', 'new-refresh-token-sync', expect.anything());
         });

         it('should return error if refresh fails during the first fetch', async () => {
             // Mock cookie for refresh attempt
             mockCookies.get.mockReturnValueOnce({ name: 'fitbit_refresh_token', value: 'invalid-refresh-token-sync' });

             // Mock underlying fetch to fail the refresh call
             (fetch as jest.Mock).mockResolvedValueOnce({ // Mock for refresh call triggered by first fetchFitbitData
                 ok: false,
                 status: 401,
                 json: async () => ({ errors: [{ errorType: 'invalid_grant' }] })
             });

             const result = await fitbitActions.syncFitbitDataForDate({ date: testDate, ...expiredTokenArgs });

             expect(result.success).toBe(false);
             expect(result.error).toBe('invalid_grant'); // Error comes from the failed refresh
             expect(result.data).toBeUndefined();
             expect(result.newAccessToken).toBeUndefined();
             expect(result.newExpiresAt).toBeUndefined();

             // Verify fetch was called once (for the failed refresh)
             expect(fetch).toHaveBeenCalledTimes(1);
             expect(fetch).toHaveBeenCalledWith('https://api.fitbit.com/oauth2/token', expect.anything());
             // Verify cookie was deleted
             expect(mockCookies.delete).toHaveBeenCalledWith('fitbit_refresh_token');
         });
    });
}); 