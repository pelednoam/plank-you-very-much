"use client"; // Needed for hooks and client-side APIs

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import useSearchParams and useRouter
import dynamic from 'next/dynamic'; // Import next/dynamic
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';
import { Button } from '@/components/ui/button'; // Corrected casing
import { exportWorkoutData, exportNutritionData, exportMetricsData } from '@/lib/exportUtils'; // Import export functions
import { useUserProfileStore, selectNotificationPreferences, defaultProfile, selectFitbitConnection, type UserProfileState, selectHasHydrated } from '@/store/userProfileStore'; // Import store, specific selector, AND defaultProfile
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useActivityStore } from '@/store/activityStore'; // Import the new activity store
import { nfcToolsTutorial } from '@/features/tutorials/data/nfc-tools'; // Import tutorial data
import { fetchFitbitData, revokeFitbitToken, syncFitbitDataForDate } from '@/lib/fitbitActions'; // Import server action and sync action
import { toast } from 'sonner'; // Import toast
import type { FitbitDaily } from '@/types'; // Import the type for casting
import { Input } from '@/components/ui/input'; // Assuming Input can be used for checkbox
import { Label } from '@/components/ui/label'; // Assuming Label is available
import type { NotificationPreferences } from '@/types';
import { CsvImportButton } from '@/features/settings/components/CsvImportButton'; // Corrected import path
import GoalSettingsForm from '@/features/settings/components/GoalSettingsForm'; // Import Goal form
import dayjs from 'dayjs';
import { Checkbox } from '@/components/ui/checkbox';
import { triggerWorkoutReminders } from '@/lib/notificationActions'; // Import the trigger action
import NotificationSettings from '@/features/settings/components/NotificationSettings'; // <-- Import the new component

// Import the new hydration selectors
import { selectHasHydrated as selectUserHydrated } from '@/store/userProfileStore';
import { selectMetricsHasHydrated } from '@/store/metricsStore';
import { selectActivityHasHydrated } from '@/store/activityStore';

// Statically import TutorialModal instead of using dynamic
// import { TutorialModal } from '@/features/tutorials/components/TutorialModal';

// Dynamically import TutorialModal only on the client-side
const TutorialModal = dynamic(() => 
    import('@/features/tutorials/components/TutorialModal').then(mod => mod.TutorialModal),
    {
        ssr: false, // Don't render on server
        loading: () => <p>Loading tutorial...</p> // Optional loading state
    }
);

// Placeholder components for other sections
// const NotificationSettings = () => { ... }; // <-- REMOVE the inline definition

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

// Selectors can be defined outside the component for stability
const selectFitbitConnectionData = (state: UserProfileState) => ({
    accessToken: state.profile?.fitbitAccessToken, 
    expiresAt: state.profile?.fitbitExpiresAt, 
    userId: state.profile?.fitbitUserId,
    profile: state.profile, // Include profile for checking connection in selector itself
});

const IntegrationSettings = () => {
    const router = useRouter();
    // Use the refined selector
    const fitbitConnection = useUserProfileStore(selectFitbitConnectionData);
    const { setFitbitConnection, clearFitbitConnection, updateFitnessData } = useUserProfileStore(state => ({ 
        setFitbitConnection: state.setFitbitConnection, 
        clearFitbitConnection: state.clearFitbitConnection, 
        updateFitnessData: state.updateFitnessData, // Use the new action
    }));
    const addOrUpdateActivity = useActivityStore(state => state.addOrUpdateActivity);
    
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isSyncingToday, setIsSyncingToday] = useState(false); // For manual sync button
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false); 

    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [fitbitProfile, setFitbitProfile] = useState<any>(null);
    const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);

    // Determine connection status from the selector result
    const isConnected = !!(fitbitConnection.profile?.fitbitAccessToken && fitbitConnection.profile?.fitbitExpiresAt);

    // Ref for preventing duplicate auto-sync calls
    const hasAutoSynced = useRef(false);

    // --- Effect for Initial Profile Fetch & Auto-Sync (Post-Connect/Load) --- //
    useEffect(() => {
        // Only run if connected 
        if (isConnected && !isProfileLoading && !isDisconnecting && !isSyncingToday && !isAutoSyncing) {
            // Fetch profile if not already loaded
            if (!fitbitProfile) {
                handleFetchFitbitProfile(); // This function will trigger auto-sync on success
            }
             // If profile IS loaded, but we haven't auto-synced yet, trigger auto-sync
             else if (fitbitProfile && !hasAutoSynced.current) {
                 handleAutoSync();
             }
        }
    // Depends on connection status, profile state, and loading flags
    }, [isConnected, fitbitProfile, isProfileLoading, isDisconnecting, isSyncingToday, isAutoSyncing]); 

    const handleTutorialComplete = (tutorialId: string) => {
        useUserProfileStore.getState().markTutorialComplete(tutorialId);
    };

    // --- Auto Sync Function --- //
    const handleAutoSync = async () => {
        const currentAccessToken = fitbitConnection.profile?.fitbitAccessToken;
        const currentExpiresAt = fitbitConnection.profile?.fitbitExpiresAt;

        if (!currentAccessToken || !currentExpiresAt) return;
        // Prevent duplicate calls and concurrent operations
        if (hasAutoSynced.current || isSyncingToday || isProfileLoading || isDisconnecting || isAutoSyncing) return;

        setIsAutoSyncing(true);
        hasAutoSynced.current = true; // Mark as attempted
        console.log("[Fitbit Auto Sync] Triggering automatic sync for today...");
        await syncFitbitData(true); // Pass flag to indicate auto-sync
        setIsAutoSyncing(false);
    };

    // --- Shared Sync Logic (used by manual and auto sync) --- //
    const syncFitbitData = async (isAutomatic: boolean = false) => {
        const currentAccessToken = fitbitConnection.profile?.fitbitAccessToken;
        const currentExpiresAt = fitbitConnection.profile?.fitbitExpiresAt;
        const currentUserId = fitbitConnection.profile?.fitbitUserId;
        
        if (!currentAccessToken || !currentExpiresAt || !currentUserId) return;

        const todayDate = dayjs().format('YYYY-MM-DD');
        if (!isAutomatic) {
             setIsSyncingToday(true);
             toast.loading("Syncing today's Fitbit data...");
        }
        
        try {
            const result = await syncFitbitDataForDate({
                date: todayDate,
                currentAccessToken: currentAccessToken,
                currentExpiresAt: currentExpiresAt
            });

            if (!isAutomatic) toast.dismiss();

            if (result.success) {
                if (result.data) {
                    console.log(`[Fitbit Sync] Successfully synced data for ${todayDate}:`, result.data);
                    addOrUpdateActivity(result.data); // Update the activity store
                    
                    // --- Update User Profile with Synced Calories Out --- 
                    if (result.data.caloriesOut !== undefined) {
                        console.log(`[Fitbit Sync] Updating profile with today's caloriesOut: ${result.data.caloriesOut}`);
                        updateFitnessData({ lastSyncedCaloriesOut: result.data.caloriesOut }); 
                    }
                    // --- End Update ---
                    
                    if (!isAutomatic) toast.success(`Fitbit data synced for ${todayDate}.`);
                } else {
                    if (!isAutomatic) toast.info(`Fitbit sync complete for ${todayDate}, but no new data found.`);
                }

                // Update token if refreshed
                if (result.newAccessToken && result.newExpiresAt) {
                    setFitbitConnection(currentUserId, result.newAccessToken, result.newExpiresAt);
                    console.log(`[Fitbit Sync] Token refreshed during ${isAutomatic ? 'auto-' : ''}sync for ${todayDate}.`);
                }
            } else {
                // Handle partial success
                if (result.data) {
                    console.warn(`[Fitbit Sync] Partially synced data for ${todayDate} with error: ${result.error}`, result.data);
                    addOrUpdateActivity(result.data);
                    // Also try updating profile with partial data if available
                     if (result.data.caloriesOut !== undefined) {
                        console.log(`[Fitbit Sync] Updating profile with partially synced caloriesOut: ${result.data.caloriesOut}`);
                        updateFitnessData({ lastSyncedCaloriesOut: result.data.caloriesOut }); 
                     }
                    if (!isAutomatic) toast.warning(`Partial Fitbit sync for ${todayDate}. Error: ${result.error}`);
                } else {
                    // Total failure
                    throw new Error(result.error || 'Failed to sync Fitbit data');
                }
                 // Check if token needs refresh based on error
                 if (result.error?.includes('unauthorized') || result.error?.includes('expired_token')) {
                     console.warn(`[Fitbit Sync] Unauthorized error during ${isAutomatic ? 'auto-' : ''}sync, attempting refresh...`);
                     if (!isAutomatic) toast.error("Fitbit connection error. Please try refreshing profile or reconnecting.");
                 }
            }
        } catch (error) {
            if (!isAutomatic) toast.dismiss();
            console.error(`Error ${isAutomatic ? 'auto-' : ''}syncing Fitbit data for ${todayDate}:`, error);
            if (!isAutomatic) {
                 toast.error("Fitbit Sync Error", { description: error instanceof Error ? error.message : 'Unknown error' });
                 if ((error as any).message?.includes('unauthorized')) {
                     toast.warning("Fitbit connection might be invalid. Try disconnecting and reconnecting.");
                 }
            } // Silently fail auto-sync for now
        } finally {
            if (!isAutomatic) setIsSyncingToday(false);
            // isAutoSyncing is handled in handleAutoSync wrapper
        }
    };

    const handleFetchFitbitProfile = async () => {
        const currentAccessToken = fitbitConnection.profile?.fitbitAccessToken;
        const currentExpiresAt = fitbitConnection.profile?.fitbitExpiresAt;
        const currentUserId = fitbitConnection.profile?.fitbitUserId;

        if (!currentAccessToken || !currentExpiresAt || !currentUserId) return;
        if (isProfileLoading || isDisconnecting || isSyncingToday || isAutoSyncing) return;

        setIsProfileLoading(true);
        toast.loading("Fetching Fitbit profile...");
        hasAutoSynced.current = false; // Reset auto-sync flag when fetching profile
        try {
            const result = await fetchFitbitData({
                endpoint: '/1/user/-/profile.json',
                currentAccessToken: currentAccessToken,
                currentExpiresAt: currentExpiresAt
            });
            toast.dismiss();

            if (result.success && result.data?.user) {
                setFitbitProfile(result.data.user);
                toast.success("Fitbit profile loaded.");
                // Update token if refreshed
                if (result.newAccessToken && result.newExpiresAt) {
                    setFitbitConnection(currentUserId, result.newAccessToken, result.newExpiresAt);
                    console.log("[Fitbit Profile] Token refreshed during profile fetch.");
                }
                 // --- Trigger auto-sync after successful profile fetch --- 
                 handleAutoSync(); 
            } else {
                 if (result.error?.includes('unauthorized') || result.error?.includes('expired_token')) {
                     console.warn("[Fitbit Profile] Unauthorized error during profile fetch.");
                     toast.error("Fitbit connection error. Please try reconnecting.");
                     // Clear connection if profile fetch fails due to auth
                     clearFitbitConnection(); 
                     setFitbitProfile(null);
                     hasAutoSynced.current = false;
                 } else {
                    throw new Error(result.error || 'Failed to fetch profile data');
                 }
            }
        } catch (error) {
            toast.dismiss();
            console.error("Error fetching Fitbit profile:", error);
            toast.error("Fitbit Profile Error", { description: error instanceof Error ? error.message : 'Unknown error' });
            // Don't clear connection on general errors, only auth errors above
        } finally {
            setIsProfileLoading(false);
        }
    };

    // Manual Sync Handler
    const handleSyncTodayFitbit = async () => {
        if (!isConnected || isSyncingToday || isDisconnecting || isProfileLoading || isAutoSyncing) return;
        console.log("[Fitbit Manual Sync] Triggering sync for today...");
        await syncFitbitData(); // Call the shared sync logic
    };

    const handleDisconnectFitbit = async () => {
        if (isProfileLoading || isDisconnecting || isSyncingToday || isAutoSyncing) return;

        setIsDisconnecting(true);
        toast.loading("Disconnecting Fitbit...");
        try {
            const result = await revokeFitbitToken(); // This action clears the cookie on server
            toast.dismiss();
            // Always clear client state regardless of server result for consistency
            clearFitbitConnection();
            setFitbitProfile(null);
            hasAutoSynced.current = false; // Reset flag on disconnect
            
            if (result.success) {
                toast.success("Fitbit disconnected.");
            } else {
                // Log server error but UI is already updated
                console.error("Server error disconnecting Fitbit:", result.error);
                toast.warning("Fitbit disconnected locally, but server reported an issue.", { description: result.error });
            }
        } catch (error) {
            toast.dismiss();
             // Also clear client state on exception
             clearFitbitConnection();
             setFitbitProfile(null);
             hasAutoSynced.current = false;
            console.error("Error disconnecting Fitbit:", error);
            toast.error("Fitbit Disconnect Failed", { description: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsDisconnecting(false);
        }
    };

    // --- Manual Notification Trigger --- 
    const handleTriggerReminders = async () => {
        setIsTriggeringReminders(true);
        toast.loading("Triggering workout reminders...");
        try {
            const result = await triggerWorkoutReminders();
            toast.dismiss();
            if (result.success) {
                toast.success(`Reminder check complete. Sent: ${result.sent}, Failed: ${result.failed}`);
                if (result.errors && result.errors.length > 0) {
                    console.warn("[Manual Reminder Trigger] Completed with errors:", result.errors);
                    toast.warning("Some reminders failed to send. Check console.");
                }
            } else {
                 console.error("[Manual Reminder Trigger] Failed:", result.errors);
                 toast.error("Failed to trigger reminders", { description: "Check console for errors." });
            }
        } catch (error) {
            toast.dismiss();
            console.error("[Manual Reminder Trigger] Error:", error);
            toast.error("Error triggering reminders", { description: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsTriggeringReminders(false);
        }
    };

    // Determine if any Fitbit operation is in progress
    const isProcessingFitbit = isProfileLoading || isDisconnecting || isSyncingToday || isAutoSyncing;

    // --- Action Handlers --- //
    const handleConnectFitbit = () => {
        if (isConnected) return; // Prevent multiple clicks?
        // Redirect to Fitbit OAuth flow
        const FITBIT_AUTH_URL = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID}&scope=activity%20heartrate%20sleep%20nutrition%20profile&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI || 'http://localhost:3000/api/fitbit/callback')}`;
        window.location.href = FITBIT_AUTH_URL;
    };

    return (
        <div className="space-y-8">
            <h3 className="text-lg font-medium mb-2">Fitbit Integration</h3>
            {isConnected ? (
                <div className="space-y-2">
                    <p>Connected as: <strong>{fitbitProfile?.fullName || 'Loading...'}</strong></p>
                    <p className="text-sm text-muted-foreground">User ID: {fitbitConnection?.profile?.fitbitUserId}</p>
                    <p className="text-sm text-muted-foreground">Token expires: {fitbitConnection?.profile?.fitbitExpiresAt ? new Date(fitbitConnection.profile.fitbitExpiresAt * 1000).toLocaleString() : 'N/A'}</p>
                    
                    {/* Button to manually sync today's data */}                       
                    <Button 
                        onClick={handleSyncTodayFitbit}
                        disabled={isSyncingToday || isDisconnecting || isProfileLoading || isAutoSyncing}
                        variant="outline"
                        size="sm"
                    >
                        {isSyncingToday ? (
                            <><span className="animate-spin mr-2">?</span> Syncing Today...</>
                        ) : (
                            <>Sync Today</> // Add icon?
                        )}
                    </Button>
                    
                    <Button 
                        onClick={handleFetchFitbitProfile}
                        disabled={isProfileLoading || isDisconnecting || isSyncingToday || isAutoSyncing}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                    >
                        {isProfileLoading ? (
                            <><span className="animate-spin mr-2">?</span> Loading Profile...</>
                        ) : (
                            <>Refresh Profile</> // Add icon?
                        )}
                    </Button>

                    <Button 
                        onClick={handleDisconnectFitbit}
                        disabled={isDisconnecting || isSyncingToday || isProfileLoading || isAutoSyncing}
                        variant="destructive"
                        size="sm"
                        className="ml-2"
                    >
                        {isDisconnecting ? (
                            <><span className="animate-spin mr-2">?</span> Disconnecting...</>
                        ) : (
                            <>Disconnect Fitbit</>
                        )}
                    </Button>
                </div>
            ) : (
                <FitbitConnectButton />
            )}

            {/* Wyze Scale Section */}
             <div className="p-4 border rounded-md space-y-3">
                 <h4 className="font-semibold">Wyze Scale Import</h4>
                 <p className="text-sm text-gray-600">Import historical weight and body fat data from a Wyze Scale CSV export.</p>
                 <CsvImportButton 
                     source="WYZE" 
                     buttonText="Import Wyze Scale CSV"
                 />
                 <p className="text-xs text-muted-foreground">Expected format: date,weight,bodyFatPct,muscleMassKg</p>
             </div>

            {/* NFC Section */}
            <div className="p-4 border rounded-md space-y-3">
                 <h4 className="font-semibold">NFC Activity Triggers</h4>
                 <p className="text-sm text-gray-600">
                     Use NFC tags to quickly start specific workouts. 
                     <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setIsTutorialOpen(true)}>Learn how...</Button>
                 </p>
            </div>

            {/* --- Manual Notification Trigger (for Dev/Testing) --- */}
             <div>
                <h3 className="text-lg font-medium mb-2">Notification Trigger (Dev)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                    Manually triggers the check for upcoming workout reminders based on mock data.
                </p>
                <Button
                    onClick={handleTriggerReminders}
                    disabled={isTriggeringReminders}
                    variant="secondary"
                    size="sm"
                >
                    {isTriggeringReminders ? (
                        <><span className="animate-spin mr-2">?</span> Triggering...</>
                    ) : (
                        <>Trigger Workout Reminders</>
                    )}
                </Button>
            </div>

            {/* Render the modal conditionally */}
             {isTutorialOpen && nfcToolsTutorial && (
                 <TutorialModal 
                     tutorial={nfcToolsTutorial} 
                     isOpen={isTutorialOpen} 
                     onClose={() => setIsTutorialOpen(false)} 
                     onComplete={handleTutorialComplete}
                 />
             )}
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

    // Restore the useEffect hook
    useEffect(() => {
        console.log("[Settings Page Effect] Checking search params...");
        // Add null check for searchParams
        if (!searchParams) return;

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
  // Get hydration status from all relevant stores
  const userHydrated = useUserProfileStore(selectUserHydrated);
  const metricsHydrated = useMetricsStore(selectMetricsHasHydrated);
  const activityHydrated = useActivityStore(selectActivityHasHydrated);

  const allStoresHydrated = userHydrated && metricsHydrated && activityHydrated;

  return (
    <Suspense fallback={<div>Loading Settings...</div>}> 
      {/* Only render content after ALL relevant Zustand stores have hydrated */}
      {allStoresHydrated ? <SettingsPageContent /> : null} 
    </Suspense>
  );
} 