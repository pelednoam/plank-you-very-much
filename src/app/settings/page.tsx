import React from 'react';
import UserProfileForm from '@/features/settings/components/UserProfileForm';
import FitbitConnectButton from '@/features/settings/components/FitbitConnectButton';

// Placeholder components for other sections
const NotificationSettings = () => <div className="p-4 border rounded bg-white shadow"><h3 className="font-semibold mb-2">Notification Preferences</h3><p className="text-gray-600">Manage workout reminders, hydration nudges, etc. (Coming soon)</p></div>;
const DataExportSettings = () => <div className="p-4 border rounded bg-white shadow"><h3 className="font-semibold mb-2">Data Export</h3><p className="text-gray-600">Export your workout and nutrition logs. (Coming soon)</p></div>;
const IntegrationSettings = () => (
    <div className="p-4 border rounded bg-white shadow space-y-3">
        <h3 className="font-semibold">Integrations</h3>
        <div>
            <h4 className="font-medium text-sm mb-1">Fitbit</h4>
            <FitbitConnectButton />
            <p className="text-xs text-gray-500 mt-1">Connect your Fitbit account to sync activity, sleep, and more.</p>
        </div>
         <div>
            <h4 className="font-medium text-sm mb-1">NFC Tags</h4>
            <p className="text-gray-600 text-sm">Setup NFC tags for quick workout logging. (Coming soon)</p>
             {/* Add link to NFC tutorial/setup later */}
        </div>
    </div>
);

export default function SettingsPage() {
    return (
        <div className="space-y-6">
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
    );
} 