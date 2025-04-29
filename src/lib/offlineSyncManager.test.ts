import { processOfflineQueue, initializeSyncManager } from './offlineSyncManager';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { QueuedAction } from '@/store/offlineQueueStore'; // Import the type

// Mock the offline queue store
jest.mock('@/store/offlineQueueStore', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(),
    getInitialState: jest.fn(),
    setState: jest.fn(),
  }
}));

// Spy on window event listeners
const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

// Removed triggerSyncMock logic as it wasn't exported or easily testable here

describe('Offline Sync Manager', () => {
    let mockGetActions: jest.Mock;
    let mockRemoveAction: jest.Mock;

    beforeEach(() => {
        // Reset mocks for offline store
        mockGetActions = jest.fn();
        mockRemoveAction = jest.fn();
        (useOfflineQueueStore.getState as jest.Mock).mockReturnValue({
            getActions: mockGetActions,
            removeAction: mockRemoveAction,
        });

        // Reset other mocks
        jest.clearAllMocks();
        addEventListenerSpy.mockClear();
        removeEventListenerSpy.mockClear();

         // Reset navigator.onLine mock
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        // Reset Math.random mock if used
         jest.spyOn(Math, 'random').mockRestore();
    });

    describe('processOfflineQueue', () => {
        it('should do nothing if the queue is empty', async () => {
            mockGetActions.mockReturnValue([]);
            await processOfflineQueue();
            expect(mockRemoveAction).not.toHaveBeenCalled();
        });

        it('should process a planner/markComplete action successfully', async () => {
            const action: QueuedAction = {
                id: 'action-1',
                type: 'planner/markComplete',
                payload: { workoutId: 'w1', completionData: { notes: 'done' } },
                timestamp: new Date().toISOString(), // Use ISOString for timestamp
            };
            mockGetActions.mockReturnValue([action]);
            jest.spyOn(Math, 'random').mockReturnValue(0.5); // Ensure success

            await processOfflineQueue();

            expect(mockRemoveAction).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).toHaveBeenCalledWith('action-1');
        });

        it('should leave action in queue if processing fails (simulated)', async () => {
            const action: QueuedAction = {
                id: 'action-2',
                type: 'planner/markComplete',
                payload: { workoutId: 'w2', completionData: {} },
                timestamp: new Date().toISOString(), // Use ISOString for timestamp
            };
            mockGetActions.mockReturnValue([action]);
            jest.spyOn(Math, 'random').mockReturnValue(0.05); // Ensure failure

            await processOfflineQueue();

            expect(mockRemoveAction).not.toHaveBeenCalled();
            // Optionally check console.error was called (requires mocking console)
        });

         it('should handle unknown action types gracefully', async () => {
            const action: QueuedAction = {
                id: 'action-3',
                type: 'unknown/actionType' as any, // Cast to allow unknown type
                payload: {},
                timestamp: new Date().toISOString(), // Use ISOString for timestamp
            };
            mockGetActions.mockReturnValue([action]);

            await processOfflineQueue();

            expect(mockRemoveAction).not.toHaveBeenCalled();
            // Optionally check console.warn was called
        });
    });

    // Note: Testing initializeSyncManager correctly requires handling the async nature
    // and potentially mocking the triggerSync dependency more robustly.
    // describe('initializeSyncManager', () => {
        // Test online/offline listeners setup
        // Test initial trigger if online
    // });

}); 