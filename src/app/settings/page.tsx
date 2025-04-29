"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/Button'; // Import Button
import { exportWorkoutData, exportNutritionData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore } from '@/store/userProfileStore'; // Import store for updates
import { TutorialModal } from '@/features/tutorials/components/TutorialModal'; // Import TutorialModal
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data

// Placeholder components for other sections
const NotificationSettings = () => {
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        // Check initial permission state on mount
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
        // Check for existing subscription
         navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(sub => {
                if (sub) {
                    setSubscription(sub);
                    console.log("Existing push subscription found:", sub);
                }
            });
        });
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notification");
            return;
        }

        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
            console.log("Notification permission granted.");
            // Automatically try to subscribe after permission granted
            subscribeToPush(); 
        } else {
            console.log("Notification permission denied.");
        }
    };

    const subscribeToPush = async () => {
        if (permission !== 'granted') {
            console.log("Cannot subscribe, permission not granted.");
            return;
        }
        if (subscription) {
            console.log("Already subscribed.");
            return;
        }

        setIsSubscribing(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            // TODO: Provide VAPID public key from environment variable
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';
            if (!vapidPublicKey || vapidPublicKey === 'YOUR_VAPID_PUBLIC_KEY') {
                 console.error('VAPID public key is not configured.');
                 alert('Notification subscription failed: Server configuration missing.');
                 setIsSubscribing(false);
                 return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey,
            });
            setSubscription(sub);
            console.log('Push subscription successful:', sub);
            // TODO: Send the subscription object (sub) to your backend server to store it!
            // Example: await fetch('/api/save-subscription', { method: 'POST', body: JSON.stringify(sub) });
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            // Handle specific errors like missing VAPID key
            setPermission('denied'); // May revert permission if subscription fails badly
        } finally {
            setIsSubscribing(false);
        }
    };

    // TODO: Implement unsubscribe logic
    const unsubscribeFromPush = async () => {
        if (!subscription) return;
        setIsSubscribing(true);
        try {
            await subscription.unsubscribe();
            console.log('Unsubscribed successfully.');
             // TODO: Send request to backend to remove the subscription
            setSubscription(null);
        } catch (error) {
             console.error('Failed to unsubscribe:', error);
        } finally {
             setIsSubscribing(false);
        }
    };

    return (
        <div className="p-4 border rounded bg-white shadow space-y-3">
            <h3 className="font-semibold">Notification Preferences</h3>
            {permission === null && <p className="text-sm text-gray-500">Checking notification support...</p>}
            {permission === 'default' && (
                <div>
                    <p className="text-sm text-gray-600 mb-2">Enable browser notifications for workout reminders and other updates.</p>
                    <Button onClick={requestPermission}>Enable Notifications</Button>
                </div>
            )}
            {permission === 'granted' && !subscription && (
                 <div>
                    <p className="text-sm text-green-600 mb-2">Notification permission granted. Ready to subscribe.</p>
                     <Button onClick={subscribeToPush} disabled={isSubscribing}>{isSubscribing ? 'Subscribing...' : 'Subscribe to Push Notifications'}</Button>
                 </div>
            )}
            {permission === 'granted' && subscription && (
                 <div>
                    <p className="text-sm text-green-600 mb-2">Push notifications are enabled for this device.</p>
                     <Button onClick={unsubscribeFromPush} variant="outline" size="sm" disabled={isSubscribing}>{isSubscribing ? 'Unsubscribing...' : 'Disable Push Notifications'}</Button>
                 </div>
            )}
            {permission === 'denied' && (
                <p className="text-sm text-red-600">Notification permission was denied. Please enable it in your browser settings if you want notifications.</p>
            )}
            {/* Add more granular settings later (e.g., toggle types of notifications) */}
        </div>
    );
};

const DataExportSettings = () => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (exportFn: () => void) => {
        setIsExporting(true);
        // Add a small delay to allow UI update
        await new Promise(resolve => setTimeout(resolve, 50)); 
        try {
            exportFn();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Data export failed.");
        }
        setIsExporting(false);
    };

    return (
        <div className="p-4 border rounded bg-white shadow space-y-3">
            <h3 className="font-semibold mb-2">Data Export</h3>
            <p className="text-sm text-gray-600 mb-3">Download your workout and nutrition history as JSON files.</p>
            <div className="flex space-x-2">
                 <Button 
                     variant="secondary" 
                     size="sm" 
                     onClick={() => handleExport(exportWorkoutData)}
                     disabled={isExporting}
                 >
                     {isExporting ? 'Exporting...' : 'Export Workouts (.json)'}
                 </Button>
                 <Button 
                     variant="secondary" 
                     size="sm" 
                     onClick={() => handleExport(exportNutritionData)}
                     disabled={isExporting}
                >
                     {isExporting ? 'Exporting...' : 'Export Nutrition (.json)'}
                 </Button>
            </div>
        </div>
    );
};

const IntegrationSettings = () => {
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const markTutorialComplete = useUserProfileStore((state) => state.markTutorialComplete);

    const handleTutorialComplete = (tutorialId: string) => {
        markTutorialComplete(tutorialId);
        // Optional: Show a toast/message confirming completion
        console.log(`Tutorial ${tutorialId} marked as complete.`);
    };

    return (
        <>
            <div className="p-4 border rounded bg-white shadow space-y-3">
                <h3 className="font-semibold">Integrations</h3>
                <div>
                    <h4 className="font-medium text-sm mb-1">Fitbit</h4>
                    <FitbitConnectButton />
                    <p className="text-xs text-gray-500 mt-1">Connect your Fitbit account to sync activity, sleep, and more.</p>
                </div>
                 <div>
                    <h4 className="font-medium text-sm mb-1">NFC Tag Setup</h4>
                    <p className="text-gray-600 text-sm mb-2">Use NFC tags for quick workout logging (requires Android & Chrome).</p>
                    <Button variant="link" size="sm" onClick={() => setIsTutorialOpen(true)} className="p-0 h-auto text-sm">
                        Learn how to write NFC tags...
                    </Button>
                </div>
            </div>
            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
                tutorial={nfcToolsTutorial} // Pass the imported tutorial data
                onComplete={handleTutorialComplete}
            />
        </>
    );
};

// --- Component to Handle Fitbit Callback Logic --- 
const FitbitCallbackHandler: React.FC = () => {
    const searchParams = useSearchParams();
    const updateSettings = useUserProfileStore((state) => state.updateSettings);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const fitbitStatus = searchParams.get('fitbit');
        const reason = searchParams.get('reason');
        const fitbitUser = searchParams.get('fitbit_user');

        if (fitbitStatus === 'success' && fitbitUser) {
            // Update store with Fitbit User ID
            updateSettings({ fitbitUserId: fitbitUser });
            setMessage('Fitbit connected successfully!');
            // TODO: Use a proper toast notification system
            alert('Fitbit connected successfully!'); 
             // Clean the URL? Optional, using history.replaceState
            window.history.replaceState(null, '', '/settings'); 
        } else if (fitbitStatus === 'error') {
            console.error(`Fitbit connection error: ${reason}`);
            setMessage(`Fitbit connection failed: ${reason || 'Unknown error'}`);
             // TODO: Use a proper toast notification system
            alert(`Fitbit connection failed: ${reason || 'Unknown error'}`);
             // Clean the URL? Optional, using history.replaceState
             window.history.replaceState(null, '', '/settings'); 
        }
    // Run only once on mount when searchParams are available
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, updateSettings]);

    // Optionally render the message, though toast is better UX
    // return message ? <div className="p-2 text-sm bg-yellow-100 border border-yellow-300 rounded">{message}</div> : null;
    return null; // Render nothing, rely on alert/toast and store update
};

// --- Main Settings Page --- 
export default function SettingsPage() {
    return (
         // Wrap with Suspense because useSearchParams might suspend
        <Suspense fallback={<div>Loading Settings...</div>}>
            <div className="space-y-6">
                 <FitbitCallbackHandler /> {/* Add handler component */} 
                <h1 className="text-3xl font-bold">Settings</h1>

                {/* Section for User Profile Editing */}
                <section aria-labelledby="profile-settings-title">
                    <h2 id="profile-settings-title" className="text-xl font-semibold mb-2">User Profile</h2>
                    <UserProfileForm />
                </section>

                {/* Section for Notification Settings */}
                <section aria-labelledby="notification-settings-title">
                    <h2 id="notification-settings-title" className="sr-only">Notification Settings</h2>
                    <NotificationSettings />
                </section>

                {/* Section for Data Export */}
                <section aria-labelledby="data-export-title">
                    <h2 id="data-export-title" className="sr-only">Data Export</h2>
                    <DataExportSettings />
                </section>

                {/* Section for Integrations */}
                <section aria-labelledby="integration-settings-title">
                    <h2 id="integration-settings-title" className="sr-only">Integrations</h2>
                    <IntegrationSettings />
                </section>
            </div>
        </Suspense>
    );
} 