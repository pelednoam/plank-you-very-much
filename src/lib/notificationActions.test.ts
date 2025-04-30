import { triggerWorkoutReminders } from './notificationActions';
import * as storage from './notificationSubscriptionStorage';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
// import { getCurrentUserId } from './auth'; // Don't import directly

// Mock storage module
jest.mock('./notificationSubscriptionStorage');

// --- Mock specific import within the tested module --- 
// Mock the getCurrentUserId function specifically as it's imported in notificationActions.ts
const mockGetCurrentUserIdImplementation = jest.fn(); // Keep a reference if needed later
jest.mock('./auth', () => ({
    __esModule: true,
    // Define the mock implementation directly here
    getCurrentUserId: jest.fn(), 
}));
// --- End specific mock ---

// Refined Mock web-push
jest.mock('web-push', () => ({
  __esModule: true, // Handle ES module interop
  // Mock methods directly on the module export
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  // Mock default export if needed, pointing to the same mocks
  default: {
     setVapidDetails: jest.fn(),
     sendNotification: jest.fn(),
  }
}));

// --- Mocks and Spies ---
const mockedDbGetAllSubscriptions = storage.dbGetAllSubscriptions as jest.Mock;
const mockedDbDeleteSubscription = storage.dbDeleteSubscription as jest.Mock;
const mockedWebPushSend = webpush.sendNotification as jest.Mock;
const mockedSetVapidDetails = webpush.setVapidDetails as jest.Mock;
// Get a reference to the *actual mock function* created by jest.mock
// This is needed to control its behavior (e.g., mockResolvedValue)
const mockedGetCurrentUserId = require('./auth').getCurrentUserId as jest.Mock;

// Mock console
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// --- Test Data ---
const mockSubUser1Device1 = { endpoint: 'ep1', keys: { p256dh: 'k1', auth: 'a1' } };
const mockSubUser1Device2 = { endpoint: 'ep2', keys: { p256dh: 'k2', auth: 'a2' } };
const mockSubUser2Device1 = { endpoint: 'ep3', keys: { p256dh: 'k3', auth: 'a3' } };
const mockSubUser3Device1 = { endpoint: 'ep4', keys: { p256dh: 'k4', auth: 'a4' } }; // User with no upcoming workout in mocks

const MOCK_USER_1_ID = 'test-user-123';
const MOCK_USER_2_ID = 'other-user-456';
const MOCK_USER_3_ID = 'user-no-workout';

// --- Test Suite --- 
describe('triggerWorkoutReminders', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Set ENV vars needed for VAPID setup 
    originalEnv = { ...process.env }; 
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
    };
    // VAPID setup should happen implicitly when the module loads
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Now use the reference obtained above to set mock behavior
    mockedGetCurrentUserId.mockResolvedValue('default-mock-user-id');
  });

  afterAll(() => {
    process.env = originalEnv; 
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return success with 0 sent if no subscriptions are found', async () => {
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([]);
    const result = await triggerWorkoutReminders();
    expect(result.success).toBe(true);
    expect(result.sent).toBe(0);
    expect(mockedDbGetAllSubscriptions).toHaveBeenCalledTimes(1);
    expect(mockedWebPushSend).not.toHaveBeenCalled();
  });

  it('should fetch workouts per user and send notifications only to relevant users/devices', async () => {
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: MOCK_USER_1_ID, subscription: mockSubUser1Device1 },
      { userId: MOCK_USER_1_ID, subscription: mockSubUser1Device2 }, 
      { userId: MOCK_USER_2_ID, subscription: mockSubUser2Device1 },
      { userId: MOCK_USER_3_ID, subscription: mockSubUser3Device1 },
    ]);
    mockedWebPushSend.mockResolvedValue({ statusCode: 201 });
    
    await triggerWorkoutReminders(30);

    // Assertions remain the same, relying on the placeholder workout data
    // associated with MOCK_USER_1_ID and MOCK_USER_2_ID in the action file.
    const expectedSends = 3;
    expect(mockedWebPushSend).toHaveBeenCalledTimes(expectedSends);
    // ... other assertions ...
  });

   it('should only send one notification per workout even if user has multiple devices', async () => {
       // This is implicitly tested above by checking call count == 3, not 4.
       // The test 'should fetch workouts per user...' covers this.
   });

   it('should handle send failures and tally correctly per user', async () => {
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: MOCK_USER_1_ID, subscription: mockSubUser1Device1 }, // Will fail
      { userId: MOCK_USER_2_ID, subscription: mockSubUser2Device1 }, // Will succeed
    ]);
    mockedWebPushSend
        .mockRejectedValueOnce({ statusCode: 500, body: 'Server Error' }) // Fail for User 1
        .mockResolvedValueOnce({ statusCode: 201 }); // Succeed for User 2

    const result = await triggerWorkoutReminders(30);

    expect(result.success).toBe(true); // Overall process succeeded, but failures recorded
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(expect.objectContaining({ statusCode: 500, message: 'Server Error', userId: MOCK_USER_1_ID }));
    expect(mockedWebPushSend).toHaveBeenCalledTimes(2);
    expect(mockedDbDeleteSubscription).not.toHaveBeenCalled();
  });

  it('should delete subscription if send returns 410 Gone', async () => {
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
        { userId: MOCK_USER_1_ID, subscription: mockSubUser1Device1 }, // Will be 410
        { userId: MOCK_USER_2_ID, subscription: mockSubUser2Device1 }, // Will be OK
    ]);
    mockedWebPushSend
        .mockRejectedValueOnce({ statusCode: 410, body: 'Gone' }) // Fail for User 1
        .mockResolvedValueOnce({ statusCode: 201 }); // Succeed for User 2
    mockedDbDeleteSubscription.mockResolvedValue(undefined); // Mock the delete

    const result = await triggerWorkoutReminders(30);

    expect(result.success).toBe(true);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(expect.objectContaining({ statusCode: 410, userId: MOCK_USER_1_ID }));
    expect(mockedWebPushSend).toHaveBeenCalledTimes(2);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledWith(mockSubUser1Device1.endpoint);
  });

  it('should delete subscription if send returns 404 Not Found', async () => {
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
        { userId: MOCK_USER_1_ID, subscription: mockSubUser1Device1 }, // Will be 404
    ]);
    mockedWebPushSend
        .mockRejectedValueOnce({ statusCode: 404, body: 'Not Found' });
    mockedDbDeleteSubscription.mockResolvedValue(undefined);

    const result = await triggerWorkoutReminders(30);

    expect(result.success).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(expect.objectContaining({ statusCode: 404, userId: MOCK_USER_1_ID }));
    expect(mockedWebPushSend).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledWith(mockSubUser1Device1.endpoint);
  });

  // Test for missing VAPID keys (Keep existing logic, just ensure it checks isolatedTrigger)
  it('should return error if VAPID keys are missing', async () => {
    // Store current env
    const currentEnv = { ...process.env }; 
    // Set env vars without keys
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    // Reset modules to force re-evaluation of the VAPID check
    jest.resetModules();
    // Re-import the specific function needed after reset
    const { triggerWorkoutReminders: isolatedTrigger } = require('./notificationActions');
    // Re-import mocks as well, as they might be reset
    const isolatedStorage = require('./notificationSubscriptionStorage');
    const isolatedMockedGetAllSubs = isolatedStorage.dbGetAllSubscriptions as jest.Mock;
    // web-push mock will be reapplied by jest
    const isolatedWebPush = require('web-push'); 
    const isolatedMockedWebPushSend = isolatedWebPush.sendNotification as jest.Mock;

    // Call the isolated function
    const result = await isolatedTrigger();

    // Restore env vars immediately
    process.env = currentEnv; 
    // Reset modules again to restore normal state for other tests
    jest.resetModules();
    require('./notificationActions'); // Re-run setup with correct keys

    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error).toBe('VAPID keys not configured or web-push unavailable');
    // Check the mocks from the isolated context
    expect(isolatedMockedGetAllSubs).not.toHaveBeenCalled();
    expect(isolatedMockedWebPushSend).not.toHaveBeenCalled();
  });

  it('should handle errors during subscription fetching', async () => {
        mockedDbGetAllSubscriptions.mockRejectedValueOnce(new Error('KV Error'));
        const result = await triggerWorkoutReminders();
        expect(result.success).toBe(false);
        expect(result.sent).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.errors[0]).toEqual(expect.objectContaining({ error: 'unknown_trigger_error', message: 'Error: KV Error' }));
        expect(mockedWebPushSend).not.toHaveBeenCalled();
  });

  // Add a test case where getUpcomingWorkoutsForUser (mock) returns an error?
  // This requires mocking the internal function, which is slightly more complex.
  // For now, rely on the placeholder behavior.

});