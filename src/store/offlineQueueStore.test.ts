import { useOfflineQueueStore } from './offlineQueueStore';

describe('Offline Queue Store', () => {
  // Reset store before each test
  beforeEach(() => {
    useOfflineQueueStore.setState(useOfflineQueueStore.getInitialState(), true);
  });

  it('should initialize with an empty queue', () => {
    const actions = useOfflineQueueStore.getState().getActions();
    expect(actions).toEqual([]);
  });

  it('should add an action to the queue', () => {
    const action = { type: 'test/action', payload: { data: 'test' } };
    useOfflineQueueStore.getState().addAction(action);
    const actions = useOfflineQueueStore.getState().getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject(action);
    expect(actions[0].id).toBeDefined(); // Check if an ID was assigned
  });

  it('should remove an action from the queue', () => {
    const action = { type: 'test/action', payload: { data: 'test' } };
    useOfflineQueueStore.getState().addAction(action);
    const addedAction = useOfflineQueueStore.getState().getActions()[0];
    
    useOfflineQueueStore.getState().removeAction(addedAction.id);
    const actionsAfterRemove = useOfflineQueueStore.getState().getActions();
    expect(actionsAfterRemove).toHaveLength(0);
  });

  it('should clear the entire queue', () => {
     useOfflineQueueStore.getState().addAction({ type: 'test/action1', payload: {} });
     useOfflineQueueStore.getState().addAction({ type: 'test/action2', payload: {} });
     expect(useOfflineQueueStore.getState().getActions()).toHaveLength(2);

     useOfflineQueueStore.getState().clearQueue();
     expect(useOfflineQueueStore.getState().getActions()).toHaveLength(0);
  });
}); 