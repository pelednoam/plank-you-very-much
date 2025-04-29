"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import useSearchParams and useRouter
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/button'; // Corrected casing
import { exportWorkoutData, exportNutritionData, exportMetricsData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore, selectNotificationPreferences, defaultProfile, selectFitbitConnection } from '@/store/userProfileStore'; // Import store, specific selector, AND defaultProfile
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useActivityStore } from '@/store/activityStore'; // Import the new activity store
import { TutorialModal } from '@/features/tutorials/components/TutorialModal'; // Import TutorialModal
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data
import { fetchFitbitData, revokeFitbitToken } from '@/lib/fitbitActions'; // Import server action
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
    const { 
        markTutorialComplete, 
        fitbitUserId, 
        setFitbitConnectionAction,
        clearFitbitConnectionAction,
        fitbitAccessToken, 
        fitbitExpiresAt
    } = useUserProfileStore((state) => ({
        markTutorialComplete: state.markTutorialComplete,
        fitbitUserId: state.profile?.fitbitUserId,
        setFitbitConnectionAction: state.setFitbitConnection,
        clearFitbitConnectionAction: state.clearFitbitConnection,
        fitbitAccessToken: state.profile?.fitbitAccessToken,
        fitbitExpiresAt: state.profile?.fitbitExpiresAt,
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
        if (!fitbitAccessToken || !fitbitExpiresAt) {
            toast.error("Fitbit disconnected", { description: "Cannot sync data. Please connect Fitbit first." });
            return;
        }

        setIsSyncing(true);
        setSyncError(null);
        setFitbitProfileData(null);
        let toastId = toast.loading("Syncing Fitbit data...");
        console.log("Attempting to sync Fitbit data...");

        let profileData: any = null;
        let syncSuccess = true;
        let syncMessages: string[] = [];
        let latestAccessToken = fitbitAccessToken;
        let latestExpiresAt = fitbitExpiresAt;

        // Helper function to make API calls and handle token refresh
        const fetchWithRefresh = async (endpoint: string): Promise<{ success: boolean; data?: any; error?: string }> => {
            const result = await fetchFitbitData({ 
                endpoint, 
                currentAccessToken: latestAccessToken, 
                currentExpiresAt: latestExpiresAt 
            });

            if (result.newAccessToken && result.newExpiresAt) {
                console.log("[Fitbit Sync] Token refreshed during sync. Updating store.");
                setFitbitConnectionAction(fitbitUserId!, result.newAccessToken, result.newExpiresAt); // Assuming userId exists if tokens do
                latestAccessToken = result.newAccessToken;
                latestExpiresAt = result.newExpiresAt;
            }
            
            if (!result.success && (result.error === 'no_refresh_token_found' || result.error === 'invalid_grant' || result.error === 'unauthorized_token_likely_invalid')) {
                 console.warn("[Fitbit Sync] Connection lost during sync (token invalid/missing). Clearing connection.");
                 clearFitbitConnectionAction(); // Clear client-side state
                 toast.warning("Fitbit connection lost. Please reconnect.");
                 throw new Error("Fitbit connection lost during sync."); // Stop sync process
            }

            return result;
        };

        try {
            // Step 1: Fetch profile info
            const profileResult = await fetchWithRefresh('/1/user/-/profile.json');
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
                // Stop sync if profile fails
                throw new Error("Profile fetch failed, stopping sync.");
            }

            // Step 2: Fetch today's activity summary
            const today = dayjs().format('YYYY-MM-DD');
            console.log(`Fetching Fitbit activity for date: ${today}...`);
            const activityResult = await fetchWithRefresh(`/1/user/-/activities/date/${today}.json`);
            
            let activityData: Partial<FitbitDaily> = { date: today }; 
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
            const sleepResult = await fetchWithRefresh(`/1.2/user/-/sleep/date/${today}.json`);
            
            if (sleepResult.success && sleepResult.data.summary?.totalMinutesAsleep) {
                 activityData.sleepMinutes = sleepResult.data.summary.totalMinutesAsleep;
                  syncMessages.push(`Sleep: ${activityData.sleepMinutes} min`);
                 console.log("Fitbit sleep fetched:", sleepResult.data.summary);
             } else {
                  syncSuccess = false;
                  const errorMsg = sleepResult.error ? (sleepResult.error || 'Unknown sleep fetch error') : (sleepResult.data?.sleep?.length === 0 ? 'No sleep data' : 'Unknown sleep issue');
                  syncMessages.push(`Sleep fetch failed: ${errorMsg}`);
                  console.error("Fitbit sync failed (Sleep fetch):", errorMsg);
             }

            // Step 4: Fetch today's heart rate summary
            console.log(`Fetching Fitbit heart rate for date: ${today}...`);
            const hrResult = await fetchWithRefresh(`/1/user/-/activities/heart/date/${today}/1d.json`);
            
            if (hrResult.success && hrResult.data['activities-heart']?.[0]?.value?.restingHeartRate) {
                  activityData.restingHeartRate = hrResult.data['activities-heart'][0].value.restingHeartRate;
                  syncMessages.push(`Resting HR: ${activityData.restingHeartRate} bpm`);
                  console.log("Fitbit resting HR fetched:", activityData.restingHeartRate);
             } else {
                 const errorMsg = hrResult.error ? (hrResult.error || 'Unknown HR fetch error') : 'No resting HR data';
                  syncMessages.push(`Resting HR fetch failed: ${errorMsg}`);
                  console.warn("Fitbit sync warning (Resting HR fetch):", errorMsg);
             }

            // Final Step: Update the activity store with collected data
            if (Object.keys(activityData).length > 1) {
                addOrUpdateActivity(activityData as FitbitDaily); 
                console.log("Activity store updated for date:", today, activityData);
            } else {
                 console.log("No new activity/sleep/HR data to update store with.");
            }

            toast.dismiss(toastId);
            if (syncSuccess) {
                toast.success("Fitbit sync complete!", { description: syncMessages.join('; ') });
            } else {
                toast.warning("Fitbit sync partially failed.", { description: syncMessages.join('; ') });
                if (!syncError) setSyncError('One or more data fetches failed.'); 
            }

        } catch (error: any) {
            toast.dismiss(toastId);
            console.error("Error during Fitbit sync process:", error);
            if (!syncError) setSyncError(error.message || 'Unexpected error during sync');
            // Don't double-toast if fetchWithRefresh already toasted a connection loss
            if (error.message !== "Fitbit connection lost during sync.") {
                 toast.error("Fitbit Sync Error", { description: error.message || "An unexpected error occurred." });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnectFitbit = async () => {
        setIsDisconnecting(true);
        setSyncError(null);
        setFitbitProfileData(null);
        console.log("Attempting to disconnect Fitbit...");
        let toastId = toast.loading("Disconnecting Fitbit...");

        try {
            // Call the server action to revoke token and clear cookie
            const result = await revokeFitbitToken();
            
            // Clear the local store regardless of API success
            clearFitbitConnectionAction();
            
            toast.dismiss(toastId);
            if (result.success) {
                console.log("Fitbit disconnected successfully.");
                toast.success("Fitbit Disconnected", { 
                    description: "Your Fitbit account has been disconnected." 
                });
            } else {
                 console.error("Fitbit disconnection failed:", result.error);
                 // Notify user even if local state is cleared
                 toast.error("Fitbit Disconnect Failed", { 
                      description: `Could not disconnect from Fitbit service. ${result.error || 'Unknown error'}. Connection removed locally.` 
                 });
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            // Clear local store even if server action fails unexpectedly
            clearFitbitConnectionAction();
            console.error("Unexpected error during Fitbit disconnect:", error);
            toast.error("Disconnect Error", { description: error.message || "An unexpected error occurred." });
        } finally {
             setIsDisconnecting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Fitbit Section */}
            <div className="p-4 border rounded bg-white shadow">
                <h3 className="font-semibold mb-2">Fitbit Integration</h3>
                {fitbitUserId ? (
                    <div>
                        <p className="text-sm text-green-600 mb-2">Connected as Fitbit User: {fitbitUserId} {fitbitProfileData ? `(${fitbitProfileData.displayName})` : ''}</p>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleSyncFitbit} disabled={isSyncing || isDisconnecting} size="sm">
                                {isSyncing ? 'Syncing...' : 'Sync Data (Today)'}
                            </Button>
                            <Button variant="destructive" onClick={handleDisconnectFitbit} disabled={isSyncing || isDisconnecting} size="sm">
                                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Fitbit'}
                            </Button>
                        </div>
                         {syncError && <p className="text-sm text-red-500 mt-2">Sync Error: {syncError}</p>}
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-600 mb-3">Connect your Fitbit account to automatically sync daily activity, sleep, and potentially weight data (if available).</p>
                        {/* This button likely handles the redirect to Fitbit Auth URL */} 
                        <FitbitConnectButton /> 
                    </div>
                )}
            </div>

            {/* Wyze Scale Section (Placeholder) */}
            <div className="p-4 border rounded bg-white shadow opacity-50">
                <h3 className="font-semibold mb-2">Wyze Scale Integration</h3>
                <p className="text-sm text-gray-600 mb-3">Connect via Google Health Connect (Android) or Apple HealthKit (iOS), or import data.</p>
                <div className="flex flex-wrap gap-2">
                    <Button disabled size="sm">Connect (Health Connect/Kit)</Button>
                    {/* Reuse CsvImportButton for Wyze - need Wyze-specific parser */} 
                    {/* <CsvImportButton onImport={handleWyzeImport} buttonText="Import Wyze CSV" /> */}
                    <Button disabled size="sm" variant="outline">Import Wyze CSV</Button>
                </div>
            </div>

            {/* NFC Section */}
            <div className="p-4 border rounded bg-white shadow">
                <h3 className="font-semibold mb-2">NFC Activity Triggers</h3>
                <p className="text-sm text-gray-600 mb-3">Set up NFC stickers to quickly start and log workouts by tapping your phone.</p>
                <Button size="sm" onClick={() => setIsTutorialOpen(true)}>Setup Guide (NFC Tools)</Button>
            </div>

            {/* Tutorial Modal */} 
            <TutorialModal 
                isOpen={isTutorialOpen} 
                onClose={() => setIsTutorialOpen(false)} 
                tutorial={nfcToolsTutorial} 
                onComplete={handleTutorialComplete}
            />
        </div>
    );
};

// Wrap the core content to use hooks like useSearchParams
function SettingsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Get actions needed for callback handling
    const { setFitbitConnectionAction, clearFitbitConnectionAction } = useUserProfileStore((state) => ({
        setFitbitConnectionAction: state.setFitbitConnection,
        clearFitbitConnectionAction: state.clearFitbitConnection,
    }));

    useEffect(() => {
        console.log("[Settings Page Effect] Checking search params...");
        const connectStatus = searchParams.get('fitbit_connect');
        const error = searchParams.get('fitbit_error');
        const accessToken = searchParams.get('fitbit_access_token');
        const expiresAtStr = searchParams.get('fitbit_expires_at');
        const userId = searchParams.get('fitbit_user_id');

        let urlNeedsCleanup = false;

        if (error) {
            console.error(`[Settings Page Effect] Fitbit connection error detected: ${error}`);
            // Map common errors to user-friendly messages
            let description = `Connection failed (${error}). Please try again.`;
            if (error === 'access_denied') {
                description = "You denied the connection request on Fitbit.";
            } else if (error === 'invalid_grant' || error === 'no_refresh_token_found') {
                description = "Connection failed. Please try connecting again.";
            } else if (error === 'config_error') {
                 description = "Fitbit connection is not configured correctly by the application administrator.";
            } else if (error === 'missing_code') {
                 description = "Fitbit authorization code was missing. Please try again.";
            }
            toast.error("Fitbit Connection Failed", { description });
            urlNeedsCleanup = true;
        } else if (connectStatus === 'success') {
            console.log("[Settings Page Effect] Fitbit connection success detected.");
            if (accessToken && expiresAtStr && userId) {
                const expiresAt = parseInt(expiresAtStr, 10);
                if (!isNaN(expiresAt)) {
                    console.log(`[Settings Page Effect] Storing Fitbit connection: User ${userId}, ExpiresAt ${new Date(expiresAt * 1000)}`);
                    setFitbitConnectionAction(userId, accessToken, expiresAt);
                    toast.success("Fitbit Connected Successfully!");
                } else {
                     console.error("[Settings Page Effect] Invalid expiresAt parameter received:", expiresAtStr);
                     toast.error("Fitbit Connection Error", { description: "Received invalid token expiry data." });
                     clearFitbitConnectionAction(); // Clear any partial state
                }
            } else {
                console.error("[Settings Page Effect] Missing token data in success callback parameters.");
                 toast.error("Fitbit Connection Error", { description: "Missing token data after successful connection." });
                 clearFitbitConnectionAction(); // Clear any partial state
            }
             urlNeedsCleanup = true;
        }

        // Clean up URL query parameters if we processed them
        if (urlNeedsCleanup) {
            console.log("[Settings Page Effect] Cleaning up URL parameters...");
            // Use router.replace to remove query params without adding to history
            router.replace('/settings', { scroll: false }); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // Re-run only when searchParams change

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <UserProfileForm />
            <GoalSettingsForm />
            <IntegrationSettings />
            <NotificationSettings />
            <DataExportSettings />
            {/* Add other settings sections here */}
        </div>
    );
}

export default function SettingsPage() {
  // Wrap content in Suspense because useSearchParams() needs it
  return (
    <Suspense fallback={<div>Loading Settings...</div>}>
        <SettingsPageContent />
    </Suspense>
  );
} 