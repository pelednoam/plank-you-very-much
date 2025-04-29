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
    let mockUpdateActionMetadata: jest.Mock;
    let mockPendingActions: QueuedAction[];

    beforeEach(() => {
        // Reset mocks for offline store
        mockPendingActions = []; // Start with empty queue
        
        mockGetActions = jest.fn(() => mockPendingActions); 
        mockRemoveAction = jest.fn((id) => {
            mockPendingActions = mockPendingActions.filter(a => a.id !== id);
        });
        mockUpdateActionMetadata = jest.fn((id, metadata) => {
             mockPendingActions = mockPendingActions.map(a => 
                 a.id === id ? { ...a, metadata: { ...(a.metadata || {}), ...metadata } } : a
             );
        });
        
        // Ensure getState ALWAYS returns the CURRENT state of the mocks/array
        (useOfflineQueueStore.getState as jest.Mock).mockImplementation(() => ({
            pendingActions: mockPendingActions, 
            getActions: mockGetActions, 
            removeAction: mockRemoveAction,
            updateActionMetadata: mockUpdateActionMetadata,
        }));

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
            mockPendingActions = []; 
            // No need to update mock return value manually anymore
            await processOfflineQueue();
            expect(mockRemoveAction).not.toHaveBeenCalled();
        });

        it('should process a planner/markComplete action successfully (assume success)', async () => {
            const action: QueuedAction = {
                id: 'action-1',
                type: 'planner/markComplete',
                payload: { workoutId: 'w1', completionData: { notes: 'done' } },
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            // No need to update mock return value manually anymore
            await processOfflineQueue();

            expect(mockRemoveAction).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).toHaveBeenCalledWith('action-1');
            expect(mockPendingActions.length).toBe(0);
        });

        it('should handle unknown action types by marking as failed', async () => {
            const action: QueuedAction = {
                id: 'action-3',
                type: 'unknown/actionType' as any, 
                payload: {},
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action]; 
            // No need to update mock return value manually anymore
            await processOfflineQueue();

            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledTimes(1);
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('action-3', expect.objectContaining({ 
                retryCount: 1, 
                failed: false, 
                error: 'Unknown Action Type: unknown/actionType', 
                lastAttemptTimestamp: expect.any(Number),
            }));
            expect(mockPendingActions.length).toBe(1);
            expect(mockPendingActions[0].metadata?.failed).toBe(false);
            expect(mockPendingActions[0].metadata?.retryCount).toBe(1);
        });
        
        it('should eventually mark an action as permanently failed after MAX_RETRIES', async () => {
             const action: QueuedAction = {
                id: 'action-fail',
                type: 'unknown/actionType' as any, 
                payload: {},
                timestamp: new Date().toISOString(),
                metadata: { retryCount: 3 } // Start at retry 3
            };
            mockPendingActions = [action]; 
            // No need to update mock return value manually anymore
            
            await processOfflineQueue(); // This is the 4th attempt

            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledTimes(1);
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('action-fail', expect.objectContaining({ 
                retryCount: 4, 
                failed: true, 
                error: 'Unknown Action Type: unknown/actionType', 
                lastAttemptTimestamp: expect.any(Number),
            }));
             expect(mockPendingActions.length).toBe(1);
             expect(mockPendingActions[0].metadata?.failed).toBe(true); // Check state IS updated
             expect(mockPendingActions[0].metadata?.retryCount).toBe(4);
             
             // Run again - should be skipped because mockPendingActions[0].metadata.failed is now true
             mockUpdateActionMetadata.mockClear(); 
             await processOfflineQueue();
             expect(mockUpdateActionMetadata).not.toHaveBeenCalled(); // Should have been skipped
        });
        
        it('should skip retry if RETRY_DELAY has not passed', async () => {
            const mockNow = Date.now();
            const lastAttempt = mockNow - 5000; // 5 seconds ago
             const action: QueuedAction = {
                id: 'action-delay',
                type: 'unknown/actionType' as any, 
                payload: {},
                timestamp: new Date().toISOString(),
                metadata: { retryCount: 1, lastAttemptTimestamp: lastAttempt } 
            };
            mockPendingActions = [action]; 
            // No need to update mock return value manually anymore
            
            jest.spyOn(Date, 'now').mockReturnValue(mockNow);
            await processOfflineQueue();
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).not.toHaveBeenCalled();
            jest.spyOn(Date, 'now').mockRestore();
        });
    });

    // Note: Testing initializeSyncManager correctly requires handling the async nature
    // and potentially mocking the triggerSync dependency more robustly.
    // describe('initializeSyncManager', () => {
        // Test online/offline listeners setup
        // Test initial trigger if online
    // });

}); 