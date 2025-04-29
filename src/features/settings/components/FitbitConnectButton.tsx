"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useUserProfileStore } from '@/store/userProfileStore';
import { revokeFitbitToken } from '@/lib/fitbitActions'; // Import the server action
import { toast } from 'sonner'; // Import toast

// TODO: Move these to environment variables (.env.local)
const NEXT_PUBLIC_FITBIT_CLIENT_ID = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID || "YOUR_FITBIT_CLIENT_ID"; // Replace with actual ID
const NEXT_PUBLIC_FITBIT_REDIRECT_URI = process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI || "http://localhost:3000/oauth/fitbit/callback"; // Example for local dev

const FitbitConnectButton: React.FC = () => {
    // Get profile update action from store
    const { profile, updateSettings } = useUserProfileStore(
        (state) => ({ profile: state.profile, updateSettings: state.updateSettings })
    );
    const fitbitUserId = profile?.fitbitUserId;
    const [isLoading, setIsLoading] = React.useState(false);

    const handleConnect = () => {
        setIsLoading(true);
        // Construct the Fitbit authorization URL (Spec Section 8A.2)
        const scope = "activity heartrate sleep nutrition"; // Adjust scope as needed
        const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${NEXT_PUBLIC_FITBIT_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(NEXT_PUBLIC_FITBIT_REDIRECT_URI)}&prompt=login%20consent`; // Added prompt

        // Redirect the user
        window.location.href = authUrl;
        // No need to setIsLoading(false) as the page redirects
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        toast.info("Disconnecting Fitbit...");
        try {
            const result = await revokeFitbitToken();

            if (result.success) {
                // Clear fitbitUserId from the user profile store
                updateSettings({ fitbitUserId: undefined }); 
                toast.success("Fitbit disconnected successfully.");
            } else {
                console.error("Fitbit disconnect failed:", result.error);
                toast.error(`Failed to disconnect Fitbit: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error calling revokeFitbitToken:", error);
            toast.error("An unexpected error occurred while disconnecting Fitbit.");
        } finally {
            setIsLoading(false);
        }
    };

    if (fitbitUserId) {
        return (
            <div className="flex items-center space-x-2">
                 <p className="text-sm text-green-600">Fitbit Connected (User ID: {fitbitUserId.substring(0, 6)}...)</p>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isLoading}>
                    {isLoading ? 'Disconnecting...' : 'Disconnect'}
                </Button>
            </div>
        );
    }

    return (
        <Button onClick={handleConnect} disabled={isLoading || !NEXT_PUBLIC_FITBIT_CLIENT_ID || NEXT_PUBLIC_FITBIT_CLIENT_ID === 'YOUR_FITBIT_CLIENT_ID'}>
            {isLoading ? 'Redirecting...' : 'Connect Fitbit'}
        </Button>
    );
};

export default FitbitConnectButton; 