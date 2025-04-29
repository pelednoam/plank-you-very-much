"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import useSearchParams and useRouter
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/button'; // Corrected casing
import { exportWorkoutData, exportNutritionData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore } from '@/store/userProfileStore'; // Import store for updates
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useActivityStore } from '@/store/activityStore'; // Import the new activity store
import { TutorialModal } from '@/features/tutorials/components/TutorialModal'; // Import TutorialModal
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data
import { fetchFitbitData } from '@/lib/fitbitActions'; // Import server action
import { toast } from 'sonner'; // Import toast
import type { FitbitDaily } from '@/types'; // Import the type for casting

// Placeholder components for other sections
const NotificationSettings = () => {
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    // Attempt to get user ID, default to placeholder if unavailable
    const appUserId = useUserProfileStore((state) => state.profile?.id ?? 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS'); 

    useEffect(() => {
        // Check initial permission state on mount
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setPermission(Notification.permission);
             // Check for existing subscription on mount
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setSubscription(sub);
                        console.log("Existing push subscription found:", sub.endpoint);
                        // Optional: Sync with backend in case local state is outdated
                        // sendSubscriptionToBackend(sub);
                    }
                });
            });
        } else {
            console.warn("Push Notifications not supported by this browser.");
            setPermission('denied'); // Treat as denied if not supported
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            toast.error("This browser does not support desktop notification");
            return;
        }

        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
            toast.success("Notification permission granted.");
            // Automatically try to subscribe after permission granted
            subscribeToPush(); 
        } else {
            toast.warning("Notification permission denied.");
        }
    };

    // Function to send subscription to backend
    const sendSubscriptionToBackend = async (sub: PushSubscription) => {
        if (appUserId === 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS') {
            console.warn("Cannot send subscription to backend without a valid user ID.");
            toast.error("Cannot save subscription: User identification missing.");
            return; // Don't attempt if user ID is missing
        }
        // TODO: Implement actual backend API call
        console.log(`Sending subscription to backend for user ${appUserId}:`, JSON.stringify(sub));
        try {
            const response = await fetch('/api/notifications/subscribe', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscription: sub, userId: appUserId }), // Send subscription and valid user ID
            });
            if (!response.ok) {
                throw new Error(`Backend subscription failed: ${response.statusText}`);
            }
            console.log("Subscription sent to backend successfully.");
            toast.success("Push notifications enabled on server.");
        } catch (error) {
            console.error("Failed to send subscription to backend:", error);
            toast.error("Failed to save subscription to server.");
            // Optional: Attempt to unsubscribe locally if backend failed?
            // if (subscription) { subscription.unsubscribe(); setSubscription(null); }
        }
    };

    const subscribeToPush = async () => {
        if (permission !== 'granted') {
            toast.warning("Cannot subscribe, permission not granted.");
            return;
        }
        if (subscription) {
            toast.info("Already subscribed.");
            return;
        }

        setIsSubscribing(true);
        toast.info("Subscribing to push notifications...");
        try {
            const registration = await navigator.serviceWorker.ready;
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!vapidPublicKey) {
                 console.error('VAPID public key is not configured.');
                 toast.error('Notification Error', { description: 'Server configuration missing (VAPID key).', duration: 5000 });
                 setIsSubscribing(false);
                 return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true, // Required for web push
                applicationServerKey: vapidPublicKey, // URL Base64 encoded
            });
            setSubscription(sub);
            console.log('Push subscription successful:', sub.endpoint);
            
            // Send the subscription object to backend
            await sendSubscriptionToBackend(sub);

        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            toast.error('Subscription Failed', { description: `Could not subscribe. ${error instanceof Error ? error.message : 'Unknown error'}`, duration: 5000 });
            // Consider resetting permission state if subscription fails critically
            // setPermission('default');
        } finally {
            setIsSubscribing(false);
        }
    };

     // Function to remove subscription from backend
    const removeSubscriptionFromBackend = async (subEndpoint: string) => {
        if (appUserId === 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS') {
            console.warn("Cannot remove subscription from backend without a valid user ID.");
            toast.error("Cannot remove subscription: User identification missing.");
            return; // Don't attempt if user ID is missing
        }
        // TODO: Implement actual backend API call
        console.log(`Removing subscription from backend for user ${appUserId}:`, subEndpoint);
        try {
            const response = await fetch('/api/notifications/unsubscribe', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: subEndpoint, userId: appUserId }), // Identify subscription by endpoint and valid user
            });
            if (!response.ok) {
                throw new Error(`Backend unsubscription failed: ${response.statusText}`);
            }
            console.log("Subscription removed from backend successfully.");
             toast.success("Push notifications disabled on server.");
        } catch (error) {
            console.error("Failed to remove subscription from backend:", error);
            toast.error("Failed to remove subscription from server.");
            // Don't revert local state, user can try again
        }
    };

    const unsubscribeFromPush = async () => {
        if (!subscription) return;
        setIsSubscribing(true);
        toast.info("Unsubscribing...");
        const subEndpoint = subscription.endpoint; // Store endpoint before unsubscribing
        try {
            const unsubscribed = await subscription.unsubscribe();
            if(unsubscribed) {
                console.log('Unsubscribed successfully locally.');
                setSubscription(null);
                // Send request to backend to remove the subscription
                await removeSubscriptionFromBackend(subEndpoint);
            } else {
                 console.error('Local unsubscribe failed.');
                 toast.error("Failed to unsubscribe locally.");
            }
        } catch (error) {
             console.error('Failed to unsubscribe:', error);
             toast.error("Unsubscribe failed", { description: `${error instanceof Error ? error.message : 'Unknown error'}` });
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
    const { markTutorialComplete, fitbitUserId, updateSettings } = useUserProfileStore((state) => ({
        markTutorialComplete: state.markTutorialComplete,
        fitbitUserId: state.profile?.fitbitUserId,
        updateSettings: state.updateSettings,
    }));
    const addMetric = useMetricsStore((state) => state.addMetric);
    const addOrUpdateActivity = useActivityStore((state) => state.addOrUpdateActivity); // Get action from activity store
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [fitbitProfileData, setFitbitProfileData] = useState<any>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    const handleTutorialComplete = (tutorialId: string) => {
        markTutorialComplete(tutorialId);
        toast.success(`Tutorial ${tutorialId} marked as complete.`);
        console.log(`Tutorial ${tutorialId} marked as complete.`);
    };

    const handleSyncFitbit = async () => {
        setIsSyncing(true);
        setSyncError(null);
        setFitbitProfileData(null);
        console.log("Attempting to sync Fitbit data...");

        let profileData: any = null;

        try {
            // Step 1: Fetch profile info (as before)
            const profileResult = await fetchFitbitData('/1/user/-/profile.json');

            if (!profileResult.success) {
                 console.error("Fitbit sync failed (Profile fetch):", profileResult.error);
                 setSyncError(profileResult.error || 'Unknown profile fetch error');
                 toast.error("Fitbit Sync Failed", { description: `Could not fetch profile. Reason: ${profileResult.error || 'Unknown'}` });
                 if (profileResult.error?.includes('no_refresh_token') || profileResult.error?.includes('invalid_grant')) {
                    updateSettings({ fitbitUserId: undefined }); 
                    toast.warning("Fitbit connection lost. Please reconnect.");
                }
                 setIsSyncing(false);
                 return; // Stop if profile fetch fails
            }
            
            profileData = profileResult.data.user;
            setFitbitProfileData(profileData);
            console.log("Fitbit profile fetched:", profileData.displayName);

            // Step 2: Fetch today's activity summary
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            console.log(`Fetching Fitbit activity for date: ${today}...`);
            const activityResult = await fetchFitbitData(`/1/user/-/activities/date/${today}.json`);

            if (activityResult.success && activityResult.data.summary) {
                console.log("Fitbit activity fetched:", activityResult.data.summary);
                const summary = activityResult.data.summary;
                
                // Prepare data for the activity store
                const activityData: FitbitDaily = {
                    date: today,
                    steps: summary.steps || 0,
                    caloriesOut: summary.caloriesOut || 0,
                    // Add other fields if available and needed (e.g., resting HR, sleep)
                    // restingHeartRate: summary.restingHeartRate, // Need to fetch HR separately potentially
                };
                
                // Update the activity store
                addOrUpdateActivity(activityData);
                console.log("Activity store updated for date:", today);
                
                toast.success("Fitbit data synced successfully!", {
                    description: `Profile for ${profileData.displayName} loaded. Activity synced.`
                });

            } else {
                console.error("Fitbit sync failed (Activity fetch):", activityResult.error);
                // Don't overwrite profile error if activity fails
                if (!syncError) setSyncError(activityResult.error || 'Unknown activity fetch error');
                toast.error("Fitbit Sync Partially Failed", { description: `Could not fetch activity data. Reason: ${activityResult.error || 'Unknown'}` });
                // Check for token errors again, although less likely if profile worked
                 if (activityResult.error?.includes('no_refresh_token') || activityResult.error?.includes('invalid_grant')) {
                    updateSettings({ fitbitUserId: undefined }); 
                    toast.warning("Fitbit connection lost during sync. Please reconnect.");
                }
            }

        } catch (error) {
            console.error("Unexpected error during Fitbit sync:", error);
            if (!syncError) setSyncError('Unexpected client error during sync');
            toast.error("Fitbit Sync Error", { description: "An unexpected error occurred." });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnectFitbit = async () => {
        // Optional: Add a confirmation dialog here
        // if (!confirm("Are you sure you want to disconnect Fitbit?")) {
        //     return;
        // }
        
        setIsDisconnecting(true);
        setSyncError(null);
        setFitbitProfileData(null); // Clear profile data on disconnect
        console.log("Attempting to disconnect Fitbit...");
        
        try {
            // Call the server action to clear tokens
            await fetchFitbitData('/oauth2/revoke');
            
            // Update the local store to reflect disconnection
            updateSettings({ fitbitUserId: undefined });
            
            console.log("Fitbit disconnected successfully.");
            toast.success("Fitbit Disconnected", { 
                 description: "Your Fitbit account has been disconnected from the app." 
            });
             // TODO: Optionally call Fitbit's token revocation endpoint
             // Requires making an authenticated POST request to https://api.fitbit.com/oauth2/revoke
             // with the access or refresh token. Needs the token before clearing it.

        } catch (error) {
            console.error("Fitbit disconnect failed:", error);
            toast.error("Fitbit Disconnect Failed", { 
                 description: "Could not disconnect Fitbit. Please try again." 
            });
            // Should we attempt to clear local state even if server action failed?
            // updateSettings({ fitbitUserId: undefined }); // Maybe?
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
        <>
            <div className="p-4 border rounded bg-white shadow space-y-3">
                <h3 className="font-semibold">Integrations</h3>
                {/* Fitbit Section */}
                <div>
                    <h4 className="font-medium text-sm mb-1">Fitbit</h4>
                    {!fitbitUserId ? (
                        <>
                            <FitbitConnectButton />
                            <p className="text-xs text-gray-500 mt-1">Connect your Fitbit account to sync activity, sleep, and more.</p>
                        </>
                    ) : (
                        <div className="space-y-2">
                             <p className="text-sm text-green-600">Fitbit Connected (User ID: {fitbitUserId})</p>
                             {/* Display Fetched Data */} 
                             {fitbitProfileData && (
                                <p className="text-sm text-gray-700">Synced Profile: {fitbitProfileData.displayName} ({fitbitProfileData.fullName})</p>
                             )}
                             {syncError && (
                                <p className="text-sm text-red-600">Sync Error: {syncError}</p>
                             )}
                             <div className="flex space-x-2 pt-1">
                                <Button 
                                     variant="secondary"
                                     size="sm"
                                     onClick={handleSyncFitbit}
                                     disabled={isSyncing || isDisconnecting}
                                 >
                                     {isSyncing ? 'Syncing...' : 'Sync Data Now'}
                                </Button>
                                 <Button 
                                     variant="destructive"
                                     size="sm"
                                     onClick={handleDisconnectFitbit}
                                     disabled={isSyncing || isDisconnecting}
                                 >
                                     {isDisconnecting ? 'Disconnecting...' : 'Disconnect Fitbit'}
                                </Button>
                             </div>
                        </div>
                    )}
                </div>
                {/* NFC Section */}
                 <div>
                    <h4 className="font-medium text-sm mb-1 mt-4">NFC Tag Setup</h4>
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

// Wrap the main content in a component to use Suspense
function SettingsPageContent() {
    const searchParams = useSearchParams(); // Get search params
    const { updateSettings } = useUserProfileStore(
        (state) => ({ updateSettings: state.updateSettings })
    );
    const router = useRouter(); // Import and use useRouter for clearing params

    useEffect(() => {
        const fitbitStatus = searchParams.get('fitbit_status');
        const fitbitUser = searchParams.get('fitbit_user');
        const reason = searchParams.get('reason');
        const detail = searchParams.get('detail');

        if (fitbitStatus === 'success' && fitbitUser) {
            console.log('Fitbit connect success callback received, updating store with user ID:', fitbitUser);
            updateSettings({ fitbitUserId: fitbitUser });
            toast.success("Fitbit connected successfully!");
            // Clean the URL params
            router.replace('/settings', { scroll: false }); 
        } else if (fitbitStatus === 'error') {
            console.error(`Fitbit connect error callback received. Reason: ${reason}, Detail: ${detail}`);
            toast.error("Fitbit Connection Failed", { 
                description: `Reason: ${reason || 'Unknown'}${detail ? ` (${detail})` : ''}` 
            });
            // Clean the URL params
            router.replace('/settings', { scroll: false });
        }
        // Only run once when params change after mount
    }, [searchParams, updateSettings, router]);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-semibold">Settings</h1>

            {/* User Profile Section */}
            <UserProfileForm />

            {/* Integrations Section */}
            <IntegrationSettings />

            {/* Notification Settings Section */}
            <NotificationSettings />
            
            {/* Data Export Section */}
            <DataExportSettings />

        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Loading Settings...</div>}>
             <SettingsPageContent />
        </Suspense>
    );
} 