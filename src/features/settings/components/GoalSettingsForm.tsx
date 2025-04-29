"use client";

import React, { useEffect } from 'react';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSettingsSchema, GoalSettingsFormData } from '@/features/settings/schemas/goalSettingsSchema';
import { useUserProfileStore } from '@/store/userProfileStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from 'sonner';

// Helper type for FormField render prop
type FormFieldRenderProps = {
    field: ControllerRenderProps<GoalSettingsFormData, any>;
};

export default function GoalSettingsForm() {
    const { profile, updateSettings } = useUserProfileStore();

    const form = useForm<GoalSettingsFormData>({
        resolver: zodResolver(goalSettingsSchema),
        defaultValues: {
            targetBodyFatPct: profile?.targetBodyFatPct ?? undefined,
            targetDate: profile?.targetDate ?? undefined,
        },
    });

    // Update form default values when profile data loads/changes
    useEffect(() => {
        if (profile) {
            form.reset({
                targetBodyFatPct: profile.targetBodyFatPct ?? undefined,
                targetDate: profile.targetDate ?? undefined,
            });
        }
    }, [profile, form.reset]);

    const onSubmit = async (data: GoalSettingsFormData) => {
        console.log("Updating goal settings:", data);
        try {
             // Ensure potentially empty strings from form become undefined for the store
            const settingsToUpdate = {
                targetBodyFatPct: data.targetBodyFatPct,
                targetDate: data.targetDate,
            };
            
            updateSettings(settingsToUpdate);
            toast.success("Goals updated successfully!");
            form.reset(data); // Reset form with the new saved values to prevent dirty state
        } catch (error) {
            console.error("Error updating goals:", error);
            toast.error("Failed to update goals", { description: "An unexpected error occurred." });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fitness Goals</CardTitle>
                <CardDescription>
                    Set your target body fat percentage and desired completion date.
                    These will influence your calculated calorie and macro targets.
                 </CardDescription>
            </CardHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="targetBodyFatPct"
                            render={({ field }: FormFieldRenderProps) => (
                                <FormItem>
                                    <FormLabel>Target Body Fat (%)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            step="0.1" 
                                            placeholder="e.g., 11" 
                                            {...field} 
                                            value={field.value ?? ''} // Ensure undefined becomes empty string for input
                                         />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="targetDate"
                            render={({ field }: FormFieldRenderProps) => (
                                <FormItem>
                                    <FormLabel>Target Date</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="date" 
                                            {...field} 
                                            value={field.value ?? ''} // Ensure undefined becomes empty string for input
                                        />
                                     </FormControl>
                                     <FormDescription>Optional: Aim to reach your goal by this date.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Saving...' : 'Save Goals'}
                         </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
} 