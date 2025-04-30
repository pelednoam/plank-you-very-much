"use client";

import React from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import type { NotificationPreferences } from '@/types';

const PreferenceToggles: React.FC = () => {
    // Select only the necessary parts of the store
    const { profile, updateNotificationPref } = useUserProfileStore(
        React.useCallback((state) => ({
            profile: state.profile,
            updateNotificationPref: state.updateNotificationPref,
        }), [])
    );

    // Use optional chaining and provide default value
    const currentPrefs = profile?.notificationPrefs ?? { workoutReminders: false }; 

    const handleToggleChange = (preferenceKey: keyof NotificationPreferences, checked: boolean) => {
        // console.log(`Toggling ${preferenceKey} to ${checked}`); // Log the actual value being sent
        try {
            updateNotificationPref(preferenceKey, checked);
            toast.success("Preferences updated!");
        } catch (error) {
            console.error("Failed to update preference:", error);
            toast.error("Update failed", { description: "Could not save preference." });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Preferences</h3>
            
            {/* Workout Reminders Toggle */}
            <div className="flex items-center justify-between p-4 border rounded shadow bg-white">
                <Label htmlFor="workoutReminders" className="flex flex-col space-y-1">
                    <span>Workout Reminders</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Receive push notifications shortly before scheduled workouts.
                    </span>
                </Label>
                <Switch
                    id="workoutReminders"
                    checked={currentPrefs.workoutReminders}
                    onCheckedChange={(checked: boolean) => handleToggleChange('workoutReminders', checked)}
                    aria-label="Workout Reminders"
                    // Optionally disable if profile is null or loading?
                    disabled={!profile}
                />
            </div>

            {/* Add more toggles here for other preferences if needed */}
            {/* Example: 
            <div className="flex items-center justify-between p-4 border rounded shadow bg-white">
                <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                    <span>Newsletter</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                       Receive occasional updates and tips.
                    </span>
                </Label>
                <Switch
                    id="newsletter"
                    // checked={currentPrefs.newsletter ?? false} // Assuming default false
                    // onCheckedChange={(checked) => handleToggleChange('newsletter', checked)}
                    aria-label="Newsletter"
                    disabled // Example: Disable if not implemented
                />
            </div>
            */}
        </div>
    );
};

export default PreferenceToggles; 