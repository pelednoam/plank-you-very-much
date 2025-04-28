"use client";

import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { UserProfile, ActivityLevel } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectOption } from '@/components/ui/Select';

// Define activity levels and descriptions for the form
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
    { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
    { value: 'light', label: 'Lightly Active', description: 'Light exercise/sports 1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise/sports 3-5 days/week' },
    { value: 'active', label: 'Active', description: 'Hard exercise/sports 6-7 days a week' },
    { value: 'very_active', label: 'Very Active', description: 'Very hard exercise/sports & physical job' },
];

// Update Zod schema to include activityLevel
const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
    sex: z.enum(['male', 'female', '']).optional(),
    heightCm: z.number({ invalid_type_error: 'Height must be a number' }).positive('Height must be positive').optional().or(z.literal('')),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active', '']).optional(), // Add activity level, allow empty
    lactoseSensitive: z.boolean(),
});

// Update form data type
type ProfileFormData = z.infer<typeof profileSchema>;

const UserProfileForm: React.FC = () => {
    const profile = useUserProfileStore((state) => state.profile);
    const updateSettings = useUserProfileStore((state) => state.updateSettings);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        // Update default values to include activityLevel
        values: {
            name: profile?.name ?? '',
            dob: profile?.dob ?? '',
            sex: profile?.sex ?? '',
            heightCm: profile?.heightCm ?? '',
            activityLevel: profile?.activityLevel ?? '', // Default to empty if not set
            lactoseSensitive: profile?.lactoseSensitive ?? false,
        }
    });

    // Update useEffect reset logic
    React.useEffect(() => {
        reset({
            name: profile?.name ?? '',
            dob: profile?.dob ?? '',
            sex: profile?.sex ?? '',
            heightCm: profile?.heightCm ?? '',
            activityLevel: profile?.activityLevel ?? '',
            lactoseSensitive: profile?.lactoseSensitive ?? false,
        });
    }, [profile, reset]);

    // Update onSubmit handler
    const onSubmit: SubmitHandler<ProfileFormData> = (data) => {
        const updateData: Partial<UserProfile> = {
            ...data,
            heightCm: data.heightCm === '' ? undefined : Number(data.heightCm),
            dob: data.dob === '' ? undefined : data.dob,
            sex: data.sex === '' ? undefined : data.sex,
            // Handle activityLevel empty string case
            activityLevel: data.activityLevel === '' ? undefined : data.activityLevel,
        };

        try {
            updateSettings(updateData);
            reset(data);
        } catch (error) {
            console.error("Failed to update profile:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded shadow bg-white space-y-4">
            {/* Name */}
            <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" {...register('name')} disabled={isSubmitting} />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* DOB */}
            <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" {...register('dob')} disabled={isSubmitting} />
                {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob.message}</p>}
            </div>

            {/* Sex */}
            <div>
                <Label htmlFor="sex">Sex (for BMR)</Label>
                 <Controller
                     name="sex"
                     control={control}
                     render={({ field }) => (
                         <Select id="sex" {...field} disabled={isSubmitting}>
                             <SelectOption value="">Prefer not to say</SelectOption>
                             <SelectOption value="male">Male</SelectOption>
                             <SelectOption value="female">Female</SelectOption>
                         </Select>
                     )}
                 />
                {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex.message}</p>}
            </div>

            {/* Height */}
            <div>
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input id="heightCm" type="number" {...register('heightCm', {setValueAs: (v) => v === '' ? '' : Number(v) })} disabled={isSubmitting} />
                {errors.heightCm && <p className="text-red-500 text-sm mt-1">{errors.heightCm.message}</p>}
            </div>

            {/* Activity Level */}
            <div>
                <Label htmlFor="activityLevel">Activity Level (for TDEE)</Label>
                <Controller
                    name="activityLevel"
                    control={control}
                    render={({ field }) => (
                        <Select id="activityLevel" {...field} disabled={isSubmitting}>
                            <SelectOption value="">Select level...</SelectOption>
                            {ACTIVITY_LEVELS.map(level => (
                                <SelectOption key={level.value} value={level.value} title={level.description}>
                                    {level.label}
                                </SelectOption>
                            ))}
                        </Select>
                    )}
                />
                {errors.activityLevel && <p className="text-red-500 text-sm mt-1">{errors.activityLevel.message}</p>}
            </div>

             {/* Lactose Sensitivity */}
             <div className="flex items-center space-x-2 pt-2">
                 {/* Consider using a proper Checkbox component if available */}
                 <Input id="lactoseSensitive" type="checkbox" {...register('lactoseSensitive')} className="h-4 w-4" disabled={isSubmitting} />
                <Label htmlFor="lactoseSensitive">Lactose Sensitive</Label>
                {errors.lactoseSensitive && <p className="text-red-500 text-sm mt-1">{errors.lactoseSensitive.message}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
};

export default UserProfileForm; 