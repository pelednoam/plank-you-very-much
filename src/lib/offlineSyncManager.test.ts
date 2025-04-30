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
        beforeEach(() => {
            // Use fake timers for retry delay tests
            jest.useFakeTimers();
        });

        afterEach(() => {
            // Restore real timers
            jest.useRealTimers();
        });

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

        it('should schedule retry and update metadata on first server action failure', async () => {
            const action: QueuedAction = { id: 'retry-1', type: 'planner/markComplete', payload: { workoutId: 'w-retry', isComplete: true }, timestamp: 'ts' };
            mockPendingActions = [action];
            mockedUpdateWorkout.mockResolvedValueOnce({ success: false, error: 'Temporary Glitch' });

            await processOfflineQueue();

            expect(mockedUpdateWorkout).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('retry-1', expect.objectContaining({
                retryCount: 1,
                failed: false,
                error: 'Temporary Glitch',
                lastAttemptTimestamp: expect.any(Number),
            }));
            expect(mockPendingActions.length).toBe(1); // Action still in queue
        });

        it('should successfully process on retry after initial failure', async () => {
            const action: QueuedAction = {
                id: 'retry-success',
                type: 'nutrition/addMeal',
                payload: { name: 'Retry Meal' },
                timestamp: 'ts',
                metadata: { retryCount: 0, lastAttemptTimestamp: 0 } // Initial state
            };
            mockPendingActions = [action];
            
            // Fail first time
            mockedAddMeal.mockResolvedValueOnce({ success: false, error: 'First Fail' });
            await processOfflineQueue();

            // Verify retry state
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('retry-success', expect.objectContaining({ retryCount: 1, error: 'First Fail' }));
            const actionAfterFail = mockPendingActions.find(a => a.id === 'retry-success');
            expect(actionAfterFail?.metadata?.retryCount).toBe(1);

            // Succeed second time
            mockedAddMeal.mockResolvedValueOnce({ success: true, mealId: 'new-id' });
            
            // Advance time past retry delay
            jest.advanceTimersByTime(1000 * 11); // 11 seconds
            
            await processOfflineQueue();

            // Verify success on retry
            expect(mockedAddMeal).toHaveBeenCalledTimes(2);
            expect(mockRemoveAction).toHaveBeenCalledWith('retry-success');
            expect(mockPendingActions.length).toBe(0); // Action removed
        });

        it('should mark action as permanently failed after MAX_RETRIES', async () => {
            const MAX_RETRIES = 3; // Assuming this is defined in the module or test
            const action: QueuedAction = {
                id: 'fail-perm',
                type: 'metrics/addMetric',
                payload: { date: '2024-08-01', weightKg: 80 },
                timestamp: 'ts',
                metadata: { retryCount: MAX_RETRIES, lastAttemptTimestamp: 0 } // Already at max retries
            };
            mockPendingActions = [action];
            mockedAddMetric.mockResolvedValue({ success: false, error: 'Persistent Error' }); // Fail again

            await processOfflineQueue();

            expect(mockedAddMetric).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).toHaveBeenCalledWith('fail-perm', expect.objectContaining({
                retryCount: MAX_RETRIES + 1,
                failed: true, // Should be marked as failed
                error: 'Persistent Error',
                lastAttemptTimestamp: expect.any(Number),
            }));
            expect(mockPendingActions.length).toBe(1); // Still in queue but failed
            expect(mockPendingActions[0].metadata?.failed).toBe(true);

            // Try processing again - should be skipped
            mockUpdateActionMetadata.mockClear(); // Clear mock calls
            mockedAddMetric.mockClear();
            await processOfflineQueue();
            expect(mockedAddMetric).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).not.toHaveBeenCalled();
        });

        it('should respect RETRY_DELAY_MS', async () => {
            const RETRY_DELAY_MS = 1000 * 10; // 10 seconds
            const action: QueuedAction = {
                id: 'retry-delay',
                type: 'planner/markComplete',
                payload: { workoutId: 'w-delay', isComplete: true },
                timestamp: 'ts',
                // Simulate last attempt 5 seconds ago
                metadata: { retryCount: 1, lastAttemptTimestamp: Date.now() - 5000, failed: false }
            };
            mockPendingActions = [action];
            mockedUpdateWorkout.mockResolvedValue({ success: true }); // Assume it would succeed

            await processOfflineQueue();

            // Should not have attempted sync because delay hasn't passed
            expect(mockedUpdateWorkout).not.toHaveBeenCalled();
            expect(mockRemoveAction).not.toHaveBeenCalled();
            expect(mockUpdateActionMetadata).not.toHaveBeenCalled();
            expect(mockPendingActions.length).toBe(1); // Action remains

            // Advance time past the delay
            jest.advanceTimersByTime(RETRY_DELAY_MS);

            await processOfflineQueue();

            // Now it should have processed and succeeded
            expect(mockedUpdateWorkout).toHaveBeenCalledTimes(1);
            expect(mockRemoveAction).toHaveBeenCalledWith('retry-delay');
            expect(mockPendingActions.length).toBe(0);
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
    });

    describe('initializeSyncManager', () => {
        // ... tests for initializeSyncManager ...
    });
}); 