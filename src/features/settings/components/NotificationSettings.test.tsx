import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationSettings from './NotificationSettings';
import { useUserProfileStore, defaultProfile } from '@/store/userProfileStore';
import { toast } from 'sonner';
import { __resetSonnerMocks } from '@/__mocks__/sonner';
import type { NotificationPreferences } from '@/types';

// Mock the store
jest.mock('@/store/userProfileStore');
const mockedUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>;

// Mock sonner toast
jest.mock('sonner');

// --- Mock Browser APIs --- 
// Define mock functions first
const mockUnsubscribe = jest.fn(() => Promise.resolve(true));
const mockSubscribe = jest.fn(() => Promise.resolve({ endpoint: 'mock-endpoint-subscribe', unsubscribe: mockUnsubscribe, toJSON: () => ({ endpoint: 'mock-endpoint-subscribe' }) } as unknown as PushSubscription));
const mockGetSubscription = jest.fn(() => Promise.resolve(null as PushSubscription | null));
const mockRequestPermission = jest.fn(() => Promise.resolve('default' as NotificationPermission));

// Store original properties for restoration
const originalNotification = global.Notification;
const originalServiceWorker = global.navigator.serviceWorker;
const originalFetch = global.fetch;

// Store initial store state for reset
const initialStoreState = useUserProfileStore.getState();

// Variable to hold the current mocked permission state for the getter
let mockPermissionState: NotificationPermission = 'default';

// --- Setup Globals --- 
beforeAll(() => {
    // Define properties using Object.defineProperty once for the suite
    Object.defineProperty(window, 'Notification', {
        value: {
            get permission() { return mockPermissionState; }, 
            requestPermission: mockRequestPermission,
        },
        writable: true, // Make writable so the 'not supported' test can undefine it
        configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
        value: {
            ready: Promise.resolve({
                pushManager: {
                    getSubscription: mockGetSubscription,
                    subscribe: mockSubscribe,
                    // permissionState: jest.fn().mockResolvedValue('prompt'),
                },
            }),
        },
        writable: true, // Make writable so the 'not supported' test can undefine it
        configurable: true,
    });

    // Mock fetch once for the suite
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
        }) as Promise<Response>
    );

    // Set VAPID key env var once for the suite
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock-vapid-key';
});

beforeEach(() => {
    // Reset mock function implementations and internal state before each test
    mockPermissionState = 'default'; 
    mockRequestPermission.mockClear().mockResolvedValue('default');
    mockGetSubscription.mockClear().mockResolvedValue(null);
    mockSubscribe.mockClear().mockResolvedValue({ endpoint: 'mock-endpoint-subscribe', unsubscribe: mockUnsubscribe, toJSON: () => ({ endpoint: 'mock-endpoint-subscribe' }) } as unknown as PushSubscription);
    mockUnsubscribe.mockClear().mockResolvedValue(true);
    (global.fetch as jest.Mock).mockClear().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
    });
});

afterAll(() => {
    // Restore original globals fully after the suite
    global.Notification = originalNotification;
    global.navigator.serviceWorker = originalServiceWorker;
    global.fetch = originalFetch;
    // Clean up env var
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
});

// --- End Mock Setup --- 

describe('NotificationSettings Component', () => {
    let mockUpdateNotificationPref: jest.Mock;
    const initialPrefs: NotificationPreferences = {
        workoutReminders: true,
    };

    beforeEach(() => {
        // Reset store state correctly using the stored initial state
        useUserProfileStore.setState(initialStoreState, true); 
        jest.clearAllMocks(); 
        __resetSonnerMocks(); 
        // NOTE: Global mocks are set in beforeAll, function mocks reset in outer beforeEach

        mockUpdateNotificationPref = jest.fn();

        // Mock store return value for tests
        const currentState = useUserProfileStore.getState();
        mockedUseUserProfileStore.mockReturnValue({
            ...currentState, 
            profile: { 
                id: 'notif-user-1',
                notificationPrefs: { ...initialPrefs },
            },
            updateNotificationPref: mockUpdateNotificationPref, 
        });
    });

    // --- Basic Rendering Tests --- 
    test('renders correctly when supported and permission is default', async () => {
        // Default state is set in beforeEach
        render(<NotificationSettings />);
        
        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Allow Notifications/i })).toBeInTheDocument();
        // Button should appear relatively quickly
        expect(screen.queryByRole('button', { name: /Enable Push Notifications/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Disable Push Notifications/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/Manage specific notification types/i)).not.toBeInTheDocument();
    });

    test('renders correctly when supported and permission is granted but not subscribed', async () => {
        mockPermissionState = 'granted';
        mockGetSubscription.mockResolvedValue(null);
        render(<NotificationSettings />);
        
        expect(await screen.findByRole('button', { name: /Enable Push Notifications/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Allow Notifications/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Disable Push Notifications/i })).not.toBeInTheDocument();
         expect(screen.queryByText(/Manage specific notification types/i)).not.toBeInTheDocument();
    });

    test('renders correctly when supported, permission granted, and subscribed', async () => {
        mockPermissionState = 'granted';
        mockGetSubscription.mockResolvedValue({ endpoint: 'mock-endpoint-render' } as any);
        render(<NotificationSettings />);
        
        expect(await screen.findByRole('button', { name: /Disable Push Notifications/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Allow Notifications/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Enable Push Notifications/i })).not.toBeInTheDocument();
        // Check that preferences are shown
        expect(screen.getByText(/Manage specific notification types/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Workout Reminders/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Workout Reminders/i)).toBeChecked(); // Based on initialPrefs
    });

    test('renders correctly when supported and permission is denied', async () => {
        mockPermissionState = 'denied';
        render(<NotificationSettings />);
        
        // Should show denied message
        expect(await screen.findByText(/You have blocked notifications/i)).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument(); // No buttons should show
        expect(screen.queryByText(/Manage specific notification types/i)).not.toBeInTheDocument();
    });

    test('renders correctly when notifications are not supported', async () => {
        // Temporarily remove properties for this test using Object.defineProperty
        const originalNotificationValue = window.Notification;
        const originalServiceWorkerValue = navigator.serviceWorker;
        
        Object.defineProperty(window, 'Notification', { value: undefined, configurable: true, writable: true });
        Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true, writable: true });
        
        try {
            render(<NotificationSettings />);
            
            expect(await screen.findByText(/Push notifications are not supported/i)).toBeInTheDocument();
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.queryByText(/Manage specific notification types/i)).not.toBeInTheDocument();
        } finally {
            // Restore properties after test using Object.defineProperty
            Object.defineProperty(window, 'Notification', { value: originalNotificationValue, configurable: true, writable: true });
            Object.defineProperty(navigator, 'serviceWorker', { value: originalServiceWorkerValue, configurable: true, writable: true });
        }
    });

    // --- Interaction Tests --- 
    
    test('clicking Allow Notifications requests permission and subscribes on grant', async () => {
        // Default state set in beforeEach (permission: 'default')
        mockRequestPermission.mockImplementationOnce(async () => {
            mockPermissionState = 'granted'; // Update internal state for getter
            return 'granted';
        });
        render(<NotificationSettings />);
        const allowButton = await screen.findByRole('button', { name: /Allow Notifications/i });
        fireEvent.click(allowButton);

        await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));
        expect(toast.success).toHaveBeenCalledWith("Notification permission granted.");

        // Should automatically try to subscribe after grant
        await waitFor(() => expect(mockSubscribe).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/notifications/subscribe', expect.anything()));
        expect(toast.success).toHaveBeenCalledWith("Push notifications enabled.");

        // UI should update to show Disable button and preferences
        expect(await screen.findByRole('button', { name: /Disable Push Notifications/i })).toBeInTheDocument();
        expect(screen.getByText(/Manage specific notification types/i)).toBeInTheDocument();
    });

     test('clicking Allow Notifications shows warning if denied', async () => {
         // Default state set in beforeEach (permission: 'default')
         mockRequestPermission.mockImplementationOnce(async () => {
            mockPermissionState = 'denied'; // Update internal state for getter
            return 'denied';
         });
         render(<NotificationSettings />);
         const allowButton = await screen.findByRole('button', { name: /Allow Notifications/i });
         fireEvent.click(allowButton);

         await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));
         expect(toast.warning).toHaveBeenCalledWith("Notification permission denied.");
         expect(mockSubscribe).not.toHaveBeenCalled();

         // UI should update to show denied message
         expect(await screen.findByText(/You have blocked notifications/i)).toBeInTheDocument();
         expect(screen.queryByRole('button')).not.toBeInTheDocument();
     });

    test('clicking Enable Push Notifications subscribes and updates UI', async () => {
        mockPermissionState = 'granted';
        mockGetSubscription.mockResolvedValue(null);
        render(<NotificationSettings />);

        const enableButton = await screen.findByRole('button', { name: /Enable Push Notifications/i });
        fireEvent.click(enableButton);

        await waitFor(() => expect(mockSubscribe).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/notifications/subscribe', expect.anything()));
        expect(toast.success).toHaveBeenCalledWith("Push notifications enabled.");

        // UI should update
        expect(await screen.findByRole('button', { name: /Disable Push Notifications/i })).toBeInTheDocument();
        expect(screen.getByText(/Manage specific notification types/i)).toBeInTheDocument();
    });

     test('clicking Disable Push Notifications unsubscribes and updates UI', async () => {
         const initialSub = { endpoint: 'mock-endpoint-disable', unsubscribe: mockUnsubscribe, toJSON: () => ({ endpoint: 'mock-endpoint-disable' }) } as unknown as PushSubscription;
         mockPermissionState = 'granted';
         mockGetSubscription.mockResolvedValue(initialSub);
         render(<NotificationSettings />);

         const disableButton = await screen.findByRole('button', { name: /Disable Push Notifications/i });
         fireEvent.click(disableButton);

         await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalledTimes(1));
         await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/notifications/unsubscribe', expect.anything()));
         expect(toast.success).toHaveBeenCalledWith("Push notifications disabled.");

         // UI should update
         expect(await screen.findByRole('button', { name: /Enable Push Notifications/i })).toBeInTheDocument();
         expect(screen.queryByText(/Manage specific notification types/i)).not.toBeInTheDocument();
     });

     test('toggling a preference calls updateNotificationPref', async () => {
        const initialSub = { endpoint: 'mock-endpoint-pref' } as unknown as PushSubscription;
        mockPermissionState = 'granted';
        mockGetSubscription.mockResolvedValue(initialSub);
        render(<NotificationSettings />);

        const reminderCheckbox = await screen.findByLabelText(/Workout Reminders/i);
        expect(reminderCheckbox).toBeChecked(); // Initial state

        fireEvent.click(reminderCheckbox);

        // Check that the store action was called with the new value
        expect(mockUpdateNotificationPref).toHaveBeenCalledTimes(1);
        expect(mockUpdateNotificationPref).toHaveBeenCalledWith('workoutReminders', false);
        // Check for the specific toast from handlePrefChange
        expect(toast.info).toHaveBeenCalledWith("Preference updated.");
     });

    // TODO: Add tests for API error handling during subscribe/unsubscribe
    // TODO: Add tests for VAPID key missing scenario

}); 