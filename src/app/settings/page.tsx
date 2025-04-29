"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import useSearchParams and useRouter
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/button'; // Corrected casing
import { exportWorkoutData, exportNutritionData, exportMetricsData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore, selectNotificationPreferences, defaultProfile } from '@/store/userProfileStore'; // Import store, specific selector, AND defaultProfile
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useActivityStore } from '@/store/activityStore'; // Import the new activity store
import { TutorialModal } from '@/features/tutorials/components/TutorialModal'; // Import TutorialModal
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data
import { fetchFitbitData } from '@/lib/fitbitActions'; // Import server action
import { toast } from 'sonner'; // Import toast
import type { FitbitDaily } from '@/types'; // Import the type for casting
import { Input } from '@/components/ui/input'; // Assuming Input can be used for checkbox
import { Label } from '@/components/ui/label'; // Assuming Label is available
import type { NotificationPreferences } from '@/types';
import { CsvImportButton } from '@/features/settings/components/CsvImportButton'; // Corrected import path
import GoalSettingsForm from '@/features/settings/components/GoalSettingsForm'; // Import Goal form
import dayjs from 'dayjs';
import { Checkbox } from '@/components/ui/checkbox';

// Placeholder components for other sections
const NotificationSettings = () => {
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const appUserId = useUserProfileStore((state) => state.profile?.id ?? 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS'); 
    const rawPrefs = useUserProfileStore(selectNotificationPreferences);
    const updateNotificationPref = useUserProfileStore((state) => state.updateNotificationPref);
    
    const notificationPrefs = rawPrefs || {}; 

    useEffect(() => {
        // Check support on mount
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setSubscription(sub);
                        console.log("[Notifications] Existing push subscription found:", sub.endpoint);
                        // Optional: Re-sync with backend if needed
                        // sendSubscriptionToBackend(sub);
                    }
                });
            });
        } else {
            console.warn("[Notifications] Push Notifications not supported by this browser.");
            setIsSupported(false);
            setPermission('denied');
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) return toast.error("Notifications not supported");

        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
            toast.success("Notification permission granted.");
            // Automatically try to subscribe after permission granted if not already subscribed
            if (!subscription) {
                 subscribeToPush(); 
            }
        } else {
            toast.warning("Notification permission denied.");
        }
    };

    // Function to send subscription to backend
    const sendSubscriptionToBackend = async (sub: PushSubscription) => {
        if (appUserId === 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS') {
            console.warn("[Notifications] Cannot send subscription to backend without a valid user ID.");
            toast.error("Cannot save subscription: User identification missing.");
            return false; // Indicate failure
        }
        console.log(`[Notifications] Sending subscription to backend for user ${appUserId}:`, sub.endpoint);
        try {
            const response = await fetch('/api/notifications/subscribe', { // Use specific action path
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscription: sub, userId: appUserId }), // Send subscription and valid user ID
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(`Backend subscription failed: ${response.statusText} ${JSON.stringify(errorData)}`);
            }
            console.log("[Notifications] Subscription sent to backend successfully.");
            toast.success("Push notifications enabled.");
            return true; // Indicate success
        } catch (error) {
            console.error("[Notifications] Failed to send subscription to backend:", error);
            toast.error("Failed to save subscription to server.");
            return false; // Indicate failure
        }
    };

    const subscribeToPush = async () => {
        if (!isSupported) return toast.error("Notifications not supported");
        if (permission !== 'granted') {
            toast.warning("Cannot subscribe, permission not granted. Please allow notifications.");
            // Maybe trigger requestPermission again?
            requestPermission();
            return;
        }
        if (subscription) {
            toast.info("Already subscribed.");
            return;
        }

        setIsSubscribing(true);
        toast.loading("Subscribing to push notifications..."); // Use loading toast
        try {
            const registration = await navigator.serviceWorker.ready;
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!vapidPublicKey) {
                 console.error('[Notifications] VAPID public key is not configured.');
                 toast.error('Notification Error', { description: 'Server configuration missing (VAPID key).', duration: 5000 });
                 setIsSubscribing(false);
                 toast.dismiss(); // Dismiss loading toast
                 return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey,
            });
            
            console.log('[Notifications] Push subscription successful locally:', sub.endpoint);
            
            // Send the subscription object to backend
            const backendSuccess = await sendSubscriptionToBackend(sub);

            if(backendSuccess) {
                setSubscription(sub); // Update local state only if backend sync is successful
            } else {
                // If backend fails, unsubscribe locally to keep state consistent
                 await sub.unsubscribe();
                 console.warn("[Notifications] Unsubscribed locally due to backend sync failure.");
                 toast.error("Subscription failed", { description: "Could not save subscription to server. Please try again." });
            }

        } catch (error) {
            console.error('[Notifications] Failed to subscribe to push notifications:', error);
            toast.error('Subscription Failed', { description: `Could not subscribe. ${error instanceof Error ? error.message : 'Unknown error'}`, duration: 5000 });
        } finally {
            setIsSubscribing(false);
            toast.dismiss(); // Dismiss loading toast
        }
    };

     // Function to remove subscription from backend
    const removeSubscriptionFromBackend = async (subEndpoint: string) => {
        if (appUserId === 'PLACEHOLDER_USER_ID_FOR_NOTIFICATIONS') {
            console.warn("[Notifications] Cannot remove subscription from backend without a valid user ID.");
            toast.error("Cannot remove subscription: User identification missing.");
            return false; // Indicate failure
        }
        console.log(`[Notifications] Removing subscription from backend for user ${appUserId}:`, subEndpoint);
        try {
            const response = await fetch('/api/notifications/unsubscribe', { // Use specific action path
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: subEndpoint, userId: appUserId }), // Identify subscription by endpoint and valid user
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(`Backend unsubscription failed: ${response.statusText} ${JSON.stringify(errorData)}`);
            }
            console.log("[Notifications] Subscription removed from backend successfully.");
            // Don't toast success here, let the calling function handle it
             return true; // Indicate success
        } catch (error) {
            console.error("[Notifications] Failed to remove subscription from backend:", error);
            toast.error("Failed to remove subscription from server.");
            return false; // Indicate failure
        }
    };

    const unsubscribeFromPush = async () => {
        if (!subscription) return;
        setIsSubscribing(true);
        toast.loading("Unsubscribing...");
        const subEndpoint = subscription.endpoint; // Store endpoint before unsubscribing
        try {
            const localUnsubscribed = await subscription.unsubscribe();
            if (localUnsubscribed) {
                console.log('[Notifications] Unsubscribed successfully locally.');
                setSubscription(null);
                // Send request to backend to remove the subscription
                const backendSuccess = await removeSubscriptionFromBackend(subEndpoint);
                if (backendSuccess) {
                     toast.success("Push notifications disabled.");
                } else {
                    // If backend removal fails, the user state is locally unsubscribed but potentially still subscribed on the server.
                    // This state is tricky. Maybe re-fetch subscription state?
                    toast.warning("Unsubscribed locally, but failed to update server.");
                }
            } else {
                 console.error('[Notifications] Local unsubscribe call returned false.');
                 toast.error("Failed to unsubscribe locally.");
            }
        } catch (error) {
             console.error('[Notifications] Failed to unsubscribe:', error);
             toast.error("Unsubscribe failed", { description: `${error instanceof Error ? error.message : 'Unknown error'}` });
        } finally {
             setIsSubscribing(false);
             toast.dismiss();
        }
    };

    const handlePrefChange = (prefKey: keyof NotificationPreferences, checked: boolean) => {
        console.log(`[Notifications] Preference changed: ${prefKey} = ${checked}`);
        updateNotificationPref(prefKey, checked);
        // TODO: Consider if backend needs to know about individual preferences
        // (e.g., to avoid sending pushes the user has disabled client-side)
        // If so, add an API call here.
        toast.info("Preference updated."); // Simple feedback
    };

    // Determine button states
    const showRequestButton = isSupported && permission === 'default';
    const showSubscribeButton = isSupported && permission === 'granted' && !subscription;
    const showUnsubscribeButton = isSupported && permission === 'granted' && subscription;
    const isDisabled = !isSupported || isSubscribing || permission === 'denied';

    return (
        <div className="space-y-4">
             <h3 className="text-lg font-medium mb-2">Push Notifications</h3>
             {!isSupported && <p className="text-sm text-red-500">Push notifications are not supported by your browser.</p>}
             {permission === 'denied' && <p className="text-sm text-orange-500">You have blocked notifications. Please enable them in your browser settings.</p>}

            {/* Master Control Button */} 
             <div className="flex items-center space-x-3 mb-4">
                 {showRequestButton && (
                     <Button onClick={requestPermission} disabled={isSubscribing}>
                         Allow Notifications
                     </Button>
                 )}
                 {showSubscribeButton && (
                     <Button onClick={subscribeToPush} disabled={isSubscribing}>
                         Enable Push Notifications
                      </Button>
                 )}
                 {showUnsubscribeButton && (
                     <Button variant="destructive" onClick={unsubscribeFromPush} disabled={isSubscribing}>
                         Disable Push Notifications
                      </Button>
                 )}
                 {isSubscribing && <span className="text-sm text-muted-foreground">Processing...</span>}
            </div>

            {/* Granular Preferences (Disabled if master is off/denied) */} 
            {isSupported && permission === 'granted' && subscription && (
                <div className="space-y-3 pl-4 border-l-2">
                    <p className="text-sm text-muted-foreground">Manage specific notification types:</p>
                     {(Object.keys(defaultProfile.notificationPrefs || {}) as Array<keyof NotificationPreferences>).map((key) => (
                         <div key={key} className="flex items-center space-x-2">
                             <Checkbox 
                                 id={`pref-${key}`}
                                 checked={notificationPrefs[key] ?? false} 
                                 onCheckedChange={(checked) => handlePrefChange(key, !!checked)} // Pass boolean
                                 disabled={isDisabled} // Disable if master is off
                              />
                             <Label htmlFor={`pref-${key}`} className="capitalize font-normal">
                                 {/* Simple formatting */} 
                                 {key.replace(/([A-Z])/g, ' $1').trim()}
                             </Label>
                         </div>
                    ))}
                </div>
            )}
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
            <p className="text-sm text-gray-600 mb-3">Download your workout, nutrition, and metrics history as JSON files.</p>
            <div className="flex flex-wrap gap-2">
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
                 <Button 
                     variant="secondary" 
                     size="sm" 
                     onClick={() => handleExport(exportMetricsData)}
                     disabled={isExporting}
                 >
                     {isExporting ? 'Exporting...' : 'Export Metrics (.json)'}
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
        let toastId = toast.loading("Syncing Fitbit data...");
        console.log("Attempting to sync Fitbit data...");

        let profileData: any = null;
        let syncSuccess = true;
        let syncMessages: string[] = [];

        try {
            // Step 1: Fetch profile info
            const profileResult = await fetchFitbitData('/1/user/-/profile.json');
            if (profileResult.success) {
                profileData = profileResult.data.user;
                setFitbitProfileData(profileData);
                syncMessages.push(`Profile: ${profileData.displayName}`);
                console.log("Fitbit profile fetched.");
            } else {
                syncSuccess = false;
                const errorMsg = profileResult.error || 'Unknown profile fetch error';
                setSyncError(errorMsg);
                syncMessages.push(`Profile fetch failed: ${errorMsg}`);
                console.error("Fitbit sync failed (Profile fetch):", errorMsg);
                if (errorMsg.includes('no_refresh_token') || errorMsg.includes('invalid_grant')) {
                    updateSettings({ fitbitUserId: undefined });
                    toast.warning("Fitbit connection lost. Please reconnect.");
                }
                // Stop sync if profile fails (as other calls likely will too)
                 throw new Error("Profile fetch failed, stopping sync.");
            }

            // Step 2: Fetch today's activity summary
            const today = dayjs().format('YYYY-MM-DD');
            console.log(`Fetching Fitbit activity for date: ${today}...`);
            const activityResult = await fetchFitbitData(`/1/user/-/activities/date/${today}.json`);

            let activityData: Partial<FitbitDaily> = { date: today }; // Start with date

            if (activityResult.success && activityResult.data.summary) {
                const summary = activityResult.data.summary;
                activityData.steps = summary.steps || 0;
                activityData.caloriesOut = summary.caloriesOut || 0;
                syncMessages.push(`Activity: ${activityData.steps} steps`);
                console.log("Fitbit activity fetched:", summary);
            } else {
                syncSuccess = false;
                const errorMsg = activityResult.error || 'Unknown activity fetch error';
                syncMessages.push(`Activity fetch failed: ${errorMsg}`);
                console.error("Fitbit sync failed (Activity fetch):", errorMsg);
            }
            
            // Step 3: Fetch today's sleep summary
            console.log(`Fetching Fitbit sleep for date: ${today}...`);
            const sleepResult = await fetchFitbitData(`/1.2/user/-/sleep/date/${today}.json`);

            if (sleepResult.success && sleepResult.data.summary?.totalMinutesAsleep) {
                activityData.sleepMinutes = sleepResult.data.summary.totalMinutesAsleep;
                 syncMessages.push(`Sleep: ${activityData.sleepMinutes} min`);
                console.log("Fitbit sleep fetched:", sleepResult.data.summary);
            } else {
                 syncSuccess = false;
                 // Check if it's just no sleep data vs an error
                 const errorMsg = sleepResult.error ? (sleepResult.error || 'Unknown sleep fetch error') : (sleepResult.data?.sleep?.length === 0 ? 'No sleep data' : 'Unknown sleep issue');
                 syncMessages.push(`Sleep fetch failed: ${errorMsg}`);
                 console.error("Fitbit sync failed (Sleep fetch):", errorMsg);
            }

            // Step 4: Fetch today's heart rate summary (resting heart rate)
            // Note: Resting HR is often part of the activity summary in newer API versions, 
            // but this explicitly calls the heart rate endpoint for robustness or if activity didn't have it.
            console.log(`Fetching Fitbit heart rate for date: ${today}...`);
            const hrResult = await fetchFitbitData(`/1/user/-/activities/heart/date/${today}/1d.json`);

            if (hrResult.success && hrResult.data['activities-heart']?.[0]?.value?.restingHeartRate) {
                 activityData.restingHeartRate = hrResult.data['activities-heart'][0].value.restingHeartRate;
                 syncMessages.push(`Resting HR: ${activityData.restingHeartRate} bpm`);
                 console.log("Fitbit resting HR fetched:", activityData.restingHeartRate);
            } else {
                // Resting HR might legitimately be missing, don't necessarily mark sync as failed
                const errorMsg = hrResult.error ? (hrResult.error || 'Unknown HR fetch error') : 'No resting HR data';
                 syncMessages.push(`Resting HR fetch failed: ${errorMsg}`);
                 console.warn("Fitbit sync warning (Resting HR fetch):", errorMsg);
                 // syncSuccess = false; // Optional: uncomment if Resting HR is critical
            }

            // Final Step: Update the activity store with collected data
            if (Object.keys(activityData).length > 1) { // Check if we have more than just the date
                addOrUpdateActivity(activityData as FitbitDaily); // Cast as we expect enough data
                console.log("Activity store updated for date:", today, activityData);
            } else {
                 console.log("No new activity/sleep/HR data to update store with.");
            }

            // Display final toast based on overall success
             toast.dismiss(toastId);
             if (syncSuccess) {
                 toast.success("Fitbit sync complete!", { description: syncMessages.join('; ') });
             } else {
                 toast.warning("Fitbit sync partially failed.", { description: syncMessages.join('; ') });
                 // Keep the first error message if profile fetch failed, otherwise use generic
                 if (!syncError) setSyncError('One or more data fetches failed.'); 
             }

        } catch (error: any) {
            toast.dismiss(toastId);
            console.error("Unexpected error during Fitbit sync:", error);
            // Ensure syncError is set if not already
            if (!syncError) setSyncError(error.message || 'Unexpected client error during sync');
            toast.error("Fitbit Sync Error", { description: error.message || "An unexpected error occurred." });
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
                {/* Wyze Scale / CSV Import Section */}
                 <div className="pt-3 mt-3 border-t">
                    <h4 className="font-medium text-sm mb-1">Wyze Scale Data (via CSV)</h4>
                     <p className="text-gray-600 text-sm mb-2">Import your weight history exported from the Wyze app (or other sources matching the format). Required columns: 'date', 'weight'. Optional: 'bodyFatPct', 'muscleMassKg'.</p>
                    <CsvImportButton source="WYZE" />
                 </div>

                {/* NFC Section */}
                 <div className="pt-3 mt-3 border-t">
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

            {/* Goal Settings Section */}
            <GoalSettingsForm />

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