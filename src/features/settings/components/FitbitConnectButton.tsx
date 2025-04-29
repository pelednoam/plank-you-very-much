"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

// TODO: Move these to environment variables (.env.local)
const NEXT_PUBLIC_FITBIT_CLIENT_ID = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID || "YOUR_FITBIT_CLIENT_ID"; // Replace with actual ID
const NEXT_PUBLIC_FITBIT_REDIRECT_URI = process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI || "http://localhost:3000/oauth/fitbit/callback"; // Example for local dev

const FitbitConnectButton: React.FC = () => {
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

    return (
        <Button onClick={handleConnect} disabled={isLoading || !NEXT_PUBLIC_FITBIT_CLIENT_ID || NEXT_PUBLIC_FITBIT_CLIENT_ID === 'YOUR_FITBIT_CLIENT_ID'}>
            {isLoading ? 'Redirecting...' : 'Connect Fitbit'}
        </Button>
    );
};

export default FitbitConnectButton; 