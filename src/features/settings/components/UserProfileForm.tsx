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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

// Define activity levels using lowercase to match UserProfile type
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
    { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
    { value: 'light', label: 'Lightly Active', description: 'Light exercise/sports 1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise/sports 3-5 days/week' },
    { value: 'active', label: 'Active', description: 'Hard exercise/sports 6-7 days a week' },
    { value: 'very_active', label: 'Very Active', description: 'Very hard exercise/sports & physical job' },
];

// Zod schema expects strings for number inputs, validation happens here
const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').refine(
        (date) => !date || new Date(date) <= new Date(),
        { message: 'Date of birth cannot be in the future' }
    ).optional().or(z.literal('')),
    // Use uppercase for sex as defined in UserProfile type
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY', '']).optional(),
    // Validate height as string, then convert later
    heightCm: z.string().optional().or(z.literal('')).refine((val) => {
        if (val === '' || val === undefined) return true; // Allow empty
        const num = Number(val);
        return !isNaN(num) && num > 0;
    }, { message: 'Height must be a positive number' }),
    // Use lowercase for activityLevel as defined in UserProfile type
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active', '']).optional(),
    lactoseSensitive: z.boolean(),
    // Validate target body fat as string, then convert later
    targetBodyFatPct: z.string().optional().or(z.literal('')).refine((val) => {
        if (val === '' || val === undefined) return true; // Allow empty
        const num = Number(val);
        return !isNaN(num) && num > 0 && num <= 50; // Add max check here too
    }, { message: 'Target % must be positive and reasonable (<= 50%).' }), // Updated message
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
    // Remove preferences as it's not in UserProfile type
    // preferences: z.object({ useMetric: z.boolean() }).optional(), 
});

type ProfileFormData = z.infer<typeof profileSchema>;

const UserProfileForm: React.FC = () => {
    // Select profile and updateSettings in a single hook call
    const { profile, updateSettings } = useUserProfileStore(
        React.useCallback((state) => ({ 
            profile: state.profile, 
            updateSettings: state.updateSettings 
        }), [])
    );

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        // Use optional chaining for profile access
        values: {
            name: profile?.name ?? '',
            dob: profile?.dob ?? '',
            sex: profile?.sex ?? undefined, // Use undefined for select placeholder
            heightCm: profile?.heightCm?.toString() ?? '', 
            activityLevel: profile?.activityLevel ?? undefined, // Use undefined for select placeholder
            lactoseSensitive: profile?.lactoseSensitive ?? false,
            targetBodyFatPct: profile?.targetBodyFatPct?.toString() ?? '', 
            targetDate: profile?.targetDate ?? '',
        },
    });

    React.useEffect(() => {
        // Reset the form if the profile data changes externally
        if (profile) {
            reset({
                name: profile.name ?? '',
                dob: profile.dob ?? '',
                sex: profile.sex ?? undefined,
                heightCm: profile.heightCm?.toString() ?? '',
                activityLevel: profile.activityLevel ?? undefined,
                lactoseSensitive: profile.lactoseSensitive ?? false,
                targetBodyFatPct: profile.targetBodyFatPct?.toString() ?? '',
                targetDate: profile.targetDate ?? '',
            });
        } else {
             // Optionally reset to empty if profile becomes null
             reset({ 
                name: '',
                dob: '',
                sex: undefined,
                heightCm: '',
                activityLevel: undefined,
                lactoseSensitive: false,
                targetBodyFatPct: '',
                targetDate: '',
             });
        }
    }, [profile, reset]);

    const onSubmit: SubmitHandler<ProfileFormData> = (data) => {
        const heightNum = data.heightCm === '' || data.heightCm === undefined ? undefined : Number(data.heightCm);
        const targetBodyFatNum = data.targetBodyFatPct === '' || data.targetBodyFatPct === undefined ? undefined : Number(data.targetBodyFatPct);

        const settingsUpdateData: Partial<UserProfile> = {
            name: data.name,
            dob: data.dob === '' ? undefined : data.dob,
            sex: data.sex === '' ? undefined : data.sex, 
            heightCm: heightNum,
            activityLevel: data.activityLevel === '' ? undefined : data.activityLevel,
            lactoseSensitive: data.lactoseSensitive,
            targetBodyFatPct: targetBodyFatNum,
            targetDate: data.targetDate === '' ? undefined : data.targetDate
        };

        try {
            // Ensure updateSettings is actually callable
            if (typeof updateSettings === 'function') {
                updateSettings(settingsUpdateData);
                reset(data); 
                toast.success("Profile updated successfully!"); 
            } else {
                // This path should ideally not be hit if mocking works
                 console.error("UpdateSettings action is not available.");
                 toast.error("Update Failed", { description: "Internal error. Action unavailable." });
            }
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
                         <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                            <SelectTrigger id="sex">
                                <SelectValue placeholder="Select sex..." />
                            </SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="__PLACEHOLDER_SEX__" disabled>Prefer not to say</SelectItem> 
                                 <SelectItem value="MALE">Male</SelectItem>
                                 <SelectItem value="FEMALE">Female</SelectItem>
                                 <SelectItem value="OTHER">Other</SelectItem>
                                 <SelectItem value="PREFER_NOT_SAY">Prefer not to say (Actual)</SelectItem>
                            </SelectContent>
                         </Select>
                     )}
                 />
                {errors.sex && <p className="text-red-500 text-sm mt-1">{errors.sex.message}</p>}
            </div>

            {/* Height */}
            <div>
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input 
                    id="heightCm" 
                    type="number" 
                    {...register('heightCm')} 
                    disabled={isSubmitting} 
                />
                {errors.heightCm && <p className="text-red-500 text-sm mt-1">{errors.heightCm.message}</p>}
            </div>

            {/* Activity Level */}
            <div>
                <Label htmlFor="activityLevel">Activity Level (for TDEE)</Label>
                <Controller
                    name="activityLevel"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                            <SelectTrigger id="activityLevel">
                                <SelectValue placeholder="Select activity level..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__PLACEHOLDER_ACTIVITY__" disabled>Select level...</SelectItem> 
                                {ACTIVITY_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value} title={level.description}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.activityLevel && <p className="text-red-500 text-sm mt-1">{errors.activityLevel.message}</p>}
            </div>

             {/* Lactose Sensitivity */}
             <div className="flex items-center space-x-2 pt-2">
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
                    {...register('targetBodyFatPct')} 
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
                 <Button type="submit" disabled={!isDirty || isSubmitting}>
                     {isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
             </div>
        </form>
    );
};

export default UserProfileForm;