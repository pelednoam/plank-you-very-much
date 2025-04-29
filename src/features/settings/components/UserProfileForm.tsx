"use client";

import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { UserProfile, ActivityLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/components/ui/select';
import { toast } from 'sonner';

// Define activity levels and descriptions for the form
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
    { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
    { value: 'light', label: 'Lightly Active', description: 'Light exercise/sports 1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise/sports 3-5 days/week' },
    { value: 'active', label: 'Active', description: 'Hard exercise/sports 6-7 days a week' },
    { value: 'very_active', label: 'Very Active', description: 'Very hard exercise/sports & physical job' },
];

// Update Zod schema to include goal fields
const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
    sex: z.enum(['male', 'female', '']).optional(),
    heightCm: z.number({ invalid_type_error: 'Height must be a number' }).positive('Height must be positive').optional().or(z.literal('')),
    activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE', '']).optional(), // Allow empty string
    lactoseSensitive: z.boolean(),
    // Goals
    targetBodyFatPct: z.number({ invalid_type_error: 'Target must be a number' })
                        .positive('Target must be positive')
                        .max(50, 'Target seems too high') // Example max validation
                        .optional()
                        .or(z.literal('')), // Allow empty string
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
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
        // Update default values to include goals
        values: {
            name: profile?.name ?? '',
            dob: profile?.dob ?? '',
            sex: profile?.sex ?? '',
            heightCm: profile?.heightCm ?? '',
            activityLevel: profile?.activityLevel ?? '',
            lactoseSensitive: profile?.lactoseSensitive ?? false,
            targetBodyFatPct: profile?.targetBodyFatPct ?? '', // Default goal fields
            targetDate: profile?.targetDate ?? '',
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
            targetBodyFatPct: profile?.targetBodyFatPct ?? '',
            targetDate: profile?.targetDate ?? '',
        });
    }, [profile, reset]);

    // Update onSubmit handler
    const onSubmit: SubmitHandler<ProfileFormData> = (data) => {
        const updateData: Partial<UserProfile> = {
            ...data,
            heightCm: data.heightCm === '' ? undefined : Number(data.heightCm),
            targetBodyFatPct: data.targetBodyFatPct === '' ? undefined : Number(data.targetBodyFatPct),
            dob: data.dob === '' ? undefined : data.dob,
            sex: data.sex === '' ? undefined : data.sex,
            activityLevel: data.activityLevel === '' ? undefined : data.activityLevel,
            targetDate: data.targetDate === '' ? undefined : data.targetDate,
        };

        try {
            updateSettings(updateData);
            // Use current form values for reset to keep displayed data consistent after save
            reset(data); 
            toast.success("Profile Updated", { description: "Your settings have been saved." });
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error("Update Failed", { description: "Could not save settings. Please try again." });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded shadow bg-white space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">User Profile</h3>
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

            {/* Goals Section */}
             <h3 className="text-lg font-semibold border-b pb-2 pt-4">Goals</h3>
             <div>
                <Label htmlFor="targetBodyFatPct">Target Body Fat (%)</Label>
                <Input 
                    id="targetBodyFatPct" 
                    type="number" 
                    step="0.1" 
                    {...register('targetBodyFatPct', {setValueAs: (v) => v === '' ? '' : Number(v) })}
                    disabled={isSubmitting}
                />
                {errors.targetBodyFatPct && <p className="text-red-500 text-sm mt-1">{errors.targetBodyFatPct.message}</p>}
            </div>
            <div>
                <Label htmlFor="targetDate">Target Date</Label>
                <Input 
                    id="targetDate" 
                    type="date" 
                    {...register('targetDate')}
                    disabled={isSubmitting}
                 />
                {errors.targetDate && <p className="text-red-500 text-sm mt-1">{errors.targetDate.message}</p>}
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