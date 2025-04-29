import { triggerWorkoutReminders } from './notificationActions';
import * as storage from './notificationSubscriptionStorage';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

// Mock storage module
jest.mock('./notificationSubscriptionStorage');

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
// No need to mock getWorkoutsNeedingReminders if not mocking the module
// const mockedGetWorkouts = ...
const mockedDbGetAllSubscriptions = storage.dbGetAllSubscriptions as jest.Mock;
const mockedDbDeleteSubscription = storage.dbDeleteSubscription as jest.Mock;
// Access the mock directly from the top-level import
const mockedWebPushSend = webpush.sendNotification as jest.Mock;
const mockedSetVapidDetails = webpush.setVapidDetails as jest.Mock;
// If the code uses default import internally, we might need this reference, but the direct one should work if mocking is correct
// const mockedWebPushSendDefault = (webpush as any).default.sendNotification as jest.Mock;

// Mock console
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
  });

  afterAll(() => {
    process.env = originalEnv; 
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Test using the actual placeholder getWorkoutsNeedingReminders for now
  // Focus on testing the logic *after* workouts are fetched.

  it('should return success with 0 sent if no subscriptions are found', async () => {
    // Placeholder getWorkouts returns USER_123, USER_456 workouts
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([]); // Mock no subs
    
    const result = await triggerWorkoutReminders();

    expect(result.success).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    // getWorkoutsNeedingReminders is internal, not mocked here
    expect(mockedDbGetAllSubscriptions).toHaveBeenCalledTimes(1);
    expect(mockedWebPushSend).not.toHaveBeenCalled();
  });

  it('should send notifications to relevant user subscriptions', async () => {
    const mockSub1User1 = { endpoint: 'ep1', keys: { p256dh: 'k1', auth: 'a1' } };
    const mockSub2User1 = { endpoint: 'ep2', keys: { p256dh: 'k2', auth: 'a2' } };
    const mockSubUser2 = { endpoint: 'ep3', keys: { p256dh: 'k3', auth: 'a3' } };
    
    // Placeholder getWorkouts returns USER_123, USER_456 workouts
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: 'USER_123', subscription: mockSub1User1 },
      { userId: 'USER_123', subscription: mockSub2User1 }, 
      { userId: 'USER_456', subscription: mockSubUser2 },
      { userId: 'USER_999', subscription: { endpoint: 'ep4'} as any }, // Unrelated user
    ]);
    mockedWebPushSend.mockResolvedValue({ statusCode: 201 });
    
    const result = await triggerWorkoutReminders();
    
    expect(result.success).toBe(true);
    expect(result.sent).toBe(3); // Sent to ep1, ep2, ep3 based on placeholder workouts
    expect(result.failed).toBe(0);
    expect(mockedWebPushSend).toHaveBeenCalledTimes(3);
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSub1User1, expect.any(String));
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSub2User1, expect.any(String));
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSubUser2, expect.any(String));
    expect(mockedDbDeleteSubscription).not.toHaveBeenCalled();
  });

   it('should handle send failures and tally correctly', async () => {
    const mockSub1 = { endpoint: 'ep1', keys: { p256dh: 'k1', auth: 'a1' } };
    
    // Placeholder getWorkouts returns USER_123 workout
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: 'USER_123', subscription: mockSub1 }, 
    ]);
    mockedWebPushSend.mockRejectedValueOnce({ statusCode: 500, body: 'Server Error' }); 
    
    const result = await triggerWorkoutReminders();

    expect(result.success).toBe(false); 
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ statusCode: 500, message: 'Server Error' });
    expect(mockedWebPushSend).toHaveBeenCalledTimes(1);
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSub1, expect.any(String));
    expect(mockedDbDeleteSubscription).not.toHaveBeenCalled();
  });

  it('should delete subscription if send returns 410 Gone', async () => {
    const mockSub1 = { endpoint: 'ep1-gone', keys: { p256dh: 'k1', auth: 'a1' } };
    const mockSub2 = { endpoint: 'ep2-ok', keys: { p256dh: 'k2', auth: 'a2' } };

    // Placeholder getWorkouts returns USER_123, USER_456 workouts
    mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: 'USER_123', subscription: mockSub1 },
      { userId: 'USER_456', subscription: mockSub2 },
    ]);
    mockedWebPushSend
        .mockRejectedValueOnce({ statusCode: 410, body: 'Gone' }) // For USER_123
        .mockResolvedValueOnce({ statusCode: 201 }); // For USER_456
    mockedDbDeleteSubscription.mockResolvedValueOnce(undefined);
    
    const result = await triggerWorkoutReminders();

    expect(result.success).toBe(false); 
    expect(result.sent).toBe(1); 
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ statusCode: 410, message: 'Gone' });
    expect(mockedWebPushSend).toHaveBeenCalledTimes(2);
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSub1, expect.any(String));
    expect(mockedWebPushSend).toHaveBeenCalledWith(mockSub2, expect.any(String));
    expect(mockedDbDeleteSubscription).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledWith(mockSub1.endpoint);
  });

  it('should delete subscription if send returns 404 Not Found', async () => {
     const mockSub1 = { endpoint: 'ep1-404', keys: { p256dh: 'k1', auth: 'a1' } };
     
     // Placeholder getWorkouts returns USER_123 workout
     mockedDbGetAllSubscriptions.mockResolvedValueOnce([
      { userId: 'USER_123', subscription: mockSub1 },
    ]);
    mockedWebPushSend.mockRejectedValueOnce({ statusCode: 404, body: 'Not Found' });
    mockedDbDeleteSubscription.mockResolvedValueOnce(undefined);
    
    const result = await triggerWorkoutReminders();

    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ statusCode: 404, message: 'Not Found' });
    expect(mockedWebPushSend).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledTimes(1);
    expect(mockedDbDeleteSubscription).toHaveBeenCalledWith(mockSub1.endpoint);
  });

  // Test for missing VAPID keys needs careful isolation
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

});