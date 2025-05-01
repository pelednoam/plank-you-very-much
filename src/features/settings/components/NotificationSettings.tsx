import React, { useState, useEffect } from 'react';
import { useUserProfileStore, selectNotificationPreferences, defaultProfile } from '@/store/userProfileStore';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import type { NotificationPreferences } from '@/types';

const NotificationSettings: React.FC = () => {
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

export default NotificationSettings; 