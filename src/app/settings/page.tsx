"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/Button'; // Import Button
import { exportWorkoutData, exportNutritionData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore } from '@/store/userProfileStore'; // Import store for updates
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useActivityStore } from '@/store/activityStore'; // Import the new activity store
import { TutorialModal } from '@/features/tutorials/components/TutorialModal'; // Import TutorialModal
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data
import { fetchFitbitData, clearFitbitTokens } from '@/lib/fitbitActions'; // Import server action
import { toast } from 'sonner'; // Import toast
import type { FitbitDaily } from '@/types'; // Import the type for casting

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
            await clearFitbitTokens();
            
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

// --- Component to Handle Fitbit Callback Logic --- 
const FitbitCallbackHandler: React.FC = () => {
    const searchParams = useSearchParams();
    const updateSettings = useUserProfileStore((state) => state.updateSettings);

    useEffect(() => {
        const fitbitStatus = searchParams.get('fitbit');
        const reason = searchParams.get('reason');
        const fitbitUser = searchParams.get('fitbit_user');

        if (fitbitStatus === 'success' && fitbitUser) {
            // Update store with Fitbit User ID if not already set (idempotent)
            // Check might be needed if user refreshes page after success
            updateSettings({ fitbitUserId: fitbitUser }); 
            // Use toast for success
            toast.success('Fitbit connected successfully!');
            // Clean the URL
            window.history.replaceState(null, '', '/settings'); 
        } else if (fitbitStatus === 'error') {
            console.error(`Fitbit connection error: ${reason}`);
            // Use toast for error
            toast.error('Fitbit connection failed', {
                description: reason || 'Unknown error',
            });
            // Clean the URL
             window.history.replaceState(null, '', '/settings'); 
        }
    // Run only once on mount when searchParams are available
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // Removed updateSettings from deps as it should be stable

    // No need to render anything here, toasts handle feedback
    return null;
};

// --- Main Settings Page Component --- 
// Wrap SettingsPage content with Suspense for useSearchParams
function SettingsPageContent() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <UserProfileForm />
            <IntegrationSettings />
            <NotificationSettings />
            <DataExportSettings />
            <FitbitCallbackHandler /> { /* Handles redirect logic */ }
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Loading settings...</div>}> { /* Suspense boundary */ }
             <SettingsPageContent />
        </Suspense>
    );
} 