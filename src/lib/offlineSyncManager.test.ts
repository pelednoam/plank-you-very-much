import { processOfflineQueue, initializeSyncManager } from './offlineSyncManager';
import { useOfflineQueueStore, type QueuedAction } from '@/store/offlineQueueStore';
// Import SERVER ACTIONS to mock them
import { updateWorkoutCompletionServer } from "@/features/planner/actions/plannerActions";
import { addMealServer, deleteMealServer } from "@/features/nutrition/actions/nutritionActions";
import { addMetricServer } from "@/features/metrics/actions/metricsActions";

// Mock the offline queue store
jest.mock('@/store/offlineQueueStore', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(),
    getInitialState: jest.fn(),
    setState: jest.fn(),
  }
}));

// --- Mock Server Actions --- 
jest.mock('@/features/planner/actions/plannerActions', () => ({
  updateWorkoutCompletionServer: jest.fn(),
}));
jest.mock('@/features/nutrition/actions/nutritionActions', () => ({
  addMealServer: jest.fn(),
  deleteMealServer: jest.fn(),
}));
jest.mock('@/features/metrics/actions/metricsActions', () => ({
  addMetricServer: jest.fn(),
}));

// Create references to the mocked server actions
const mockedUpdateWorkout = updateWorkoutCompletionServer as jest.Mock;
const mockedAddMeal = addMealServer as jest.Mock;
const mockedDeleteMeal = deleteMealServer as jest.Mock;
const mockedAddMetric = addMetricServer as jest.Mock;
// --- End Mock Server Actions --- 

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

        // Reset server action mocks
        mockedUpdateWorkout.mockClear();
        mockedAddMeal.mockClear();
        mockedDeleteMeal.mockClear();
        mockedAddMetric.mockClear();
        // Default mock implementation (success)
        mockedUpdateWorkout.mockResolvedValue({ success: true });
        mockedAddMeal.mockResolvedValue({ success: true, mealId: 'mock-meal-id' });
        mockedDeleteMeal.mockResolvedValue({ success: true });
        mockedAddMetric.mockResolvedValue({ success: true });
    });

    describe('processOfflineQueue', () => {
        it('should do nothing if the queue is empty', async () => {
            mockPendingActions = []; 
            // No need to update mock return value manually anymore
            await processOfflineQueue();
            expect(mockRemoveAction).not.toHaveBeenCalled();
        });

        it('should call updateWorkoutCompletionServer for planner/markComplete action', async () => {
            const action: QueuedAction = {
                id: 'action-w1',
                type: 'planner/markComplete',
                payload: { workoutId: 'w123', isComplete: true, completedAt: '2024-01-01T10:00:00Z' },
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            mockedUpdateWorkout.mockResolvedValueOnce({ success: true }); // Ensure success for this test

            await processOfflineQueue();

            expect(mockedUpdateWorkout).toHaveBeenCalledTimes(1);
            expect(mockedUpdateWorkout).toHaveBeenCalledWith('w123', true, '2024-01-01T10:00:00Z');
            expect(mockRemoveAction).toHaveBeenCalledWith('action-w1');
            expect(mockPendingActions.length).toBe(0);
        });
        
        it('should call addMealServer for nutrition/addMeal action', async () => {
            const mealPayload = { name: 'Test Meal', kcal: 500, proteinG: 30, carbsG: 50, fatG: 20, lactoseFree: true, timestamp: '' }; // Example payload
            const action: QueuedAction = {
                id: 'action-m1',
                type: 'nutrition/addMeal',
                payload: mealPayload,
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            mockedAddMeal.mockResolvedValueOnce({ success: true, mealId: 'm-server-1'});

            await processOfflineQueue();

            expect(mockedAddMeal).toHaveBeenCalledTimes(1);
            expect(mockedAddMeal).toHaveBeenCalledWith(mealPayload);
            expect(mockRemoveAction).toHaveBeenCalledWith('action-m1');
            expect(mockPendingActions.length).toBe(0);
        });

        it('should call deleteMealServer for nutrition/deleteMeal action', async () => {
            const action: QueuedAction = {
                id: 'action-m2',
                type: 'nutrition/deleteMeal',
                payload: { mealId: 'meal-to-delete' },
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            mockedDeleteMeal.mockResolvedValueOnce({ success: true });

            await processOfflineQueue();

            expect(mockedDeleteMeal).toHaveBeenCalledTimes(1);
            expect(mockedDeleteMeal).toHaveBeenCalledWith('meal-to-delete');
            expect(mockRemoveAction).toHaveBeenCalledWith('action-m2');
            expect(mockPendingActions.length).toBe(0);
        });
        
        it('should call addMetricServer for metrics/addMetric action', async () => {
            const metricPayload = { date: '2024-07-30', weightKg: 79.5, bodyFatPct: 14.8, source: 'MANUAL' } as any;
            const action: QueuedAction = {
                id: 'action-met1',
                type: 'metrics/addMetric',
                payload: metricPayload,
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            mockedAddMetric.mockResolvedValueOnce({ success: true });

            await processOfflineQueue();

            expect(mockedAddMetric).toHaveBeenCalledTimes(1);
            expect(mockedAddMetric).toHaveBeenCalledWith(metricPayload);
            expect(mockRemoveAction).toHaveBeenCalledWith('action-met1');
            expect(mockPendingActions.length).toBe(0);
        });

        it('should schedule retry if server action returns success: false', async () => {
            const action: QueuedAction = {
                id: 'action-w-fail',
                type: 'planner/markComplete',
                payload: { workoutId: 'w-fail', isComplete: true },
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];
            mockedUpdateWorkout.mockResolvedValueOnce({ success: false, error: 'Server Busy' });

            await processOfflineQueue();

            expect(mockedUpdateWorkout).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('action-w-fail', expect.objectContaining({
                retryCount: 1,
                failed: false,
                error: 'Server Busy', // Error message from server action
                lastAttemptTimestamp: expect.any(Number),
            }));
            expect(mockPendingActions.length).toBe(1);
        });
        
        it('should throw error and schedule retry if payload is invalid for action type', async () => {
            const action: QueuedAction = {
                id: 'action-bad-payload',
                type: 'planner/markComplete',
                payload: { wrongField: 'abc' }, // Missing workoutId/isComplete
                timestamp: new Date().toISOString(),
            };
            mockPendingActions = [action];

            await processOfflineQueue();

            expect(mockedUpdateWorkout).not.toHaveBeenCalled(); // Should fail before calling action
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('action-bad-payload', expect.objectContaining({
                retryCount: 1,
                failed: false,
                error: 'Invalid payload for planner/markComplete', 
                lastAttemptTimestamp: expect.any(Number),
            }));
            expect(mockPendingActions.length).toBe(1);
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