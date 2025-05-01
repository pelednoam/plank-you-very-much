"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, OnboardingFormData } from '@/features/onboarding/schemas/onboardingSchema';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useMetricsStore } from '@/store/metricsStore';
import type { BodyMetrics } from '@/types';
import dayjs from 'dayjs';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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

const TOTAL_STEPS = 5;

type FormFieldRenderProps = {
    field: ControllerRenderProps<OnboardingFormData, any>;
};

export default function OnboardingForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const router = useRouter();
    const { completeOnboarding } = useUserProfileStore();
    const { addMetric } = useMetricsStore();

    const form = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            name: '',
            dob: '',
            sex: undefined,
            heightCm: undefined,
            initialWeightKg: undefined,
            initialBodyFatPct: undefined,
            activityLevel: undefined,
            targetBodyFatPct: undefined,
            targetDate: '',
            lactoseSensitive: false,
            backIssues: false,
        },
    });

    const onSubmit = async (data: OnboardingFormData) => {
        console.log("Onboarding form submitted:", data);
        try {
            const profileDataForAction = {
                name: data.name,
                dob: data.dob,
                sex: data.sex,
                heightCm: data.heightCm,
                activityLevel: data.activityLevel,
                targetBodyFatPct: data.targetBodyFatPct,
                targetDate: data.targetDate,
                lactoseSensitive: data.lactoseSensitive,
                backIssues: data.backIssues,
            };
            completeOnboarding(profileDataForAction as any);

            const initialMetric: BodyMetrics = {
                date: dayjs().toISOString(),
                weightKg: Number(data.initialWeightKg),
                bodyFatPct: data.initialBodyFatPct ? Number(data.initialBodyFatPct) : undefined,
                source: 'MANUAL' as const,
            };
            addMetric(initialMetric);

            toast.success("Profile setup complete!", { description: "Redirecting to your dashboard..." });

            router.push('/');

        } catch (error) {
            console.error("Error saving onboarding data:", error);
            toast.error("Failed to save profile", { description: "An unexpected error occurred. Please try again." });
        }
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof OnboardingFormData)[] = [];
        switch (currentStep) {
            case 1: fieldsToValidate = ['name', 'dob', 'sex', 'heightCm']; break;
            case 2: fieldsToValidate = ['initialWeightKg', 'initialBodyFatPct']; break;
            case 3: fieldsToValidate = ['activityLevel']; break;
            case 4: fieldsToValidate = ['targetBodyFatPct', 'targetDate']; break;
            case 5: fieldsToValidate = ['lactoseSensitive', 'backIssues']; break;
        }

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            if (currentStep < TOTAL_STEPS) {
                setCurrentStep(prev => prev + 1);
            } else {
                form.handleSubmit(onSubmit)();
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Step {currentStep} of {TOTAL_STEPS}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dob"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Date of Birth</FormLabel>
                                            <FormControl><Input type="date" placeholder="YYYY-MM-DD" {...field} /></FormControl>
                                            <FormDescription>Used to calculate BMR.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="sex"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Sex</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-col space-y-1"
                                                >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="male" /></FormControl>
                                                        <FormLabel className="font-normal">Male</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="female" /></FormControl>
                                                        <FormLabel className="font-normal">Female</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                         <FormControl><RadioGroupItem value="prefer_not_say" /></FormControl>
                                                        <FormLabel className="font-normal">Prefer not to say</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormDescription>Used for BMR calculation.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="heightCm"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Height (cm)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 175" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="initialWeightKg"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Current Weight (kg)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="e.g., 70.5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="initialBodyFatPct"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Current Body Fat (%) (Optional)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="e.g., 14.2" {...field} /></FormControl>
                                             <FormDescription>If you know it from a recent measurement.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {currentStep === 3 && (
                             <FormField
                                control={form.control}
                                name="activityLevel"
                                render={({ field }: FormFieldRenderProps) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Typical Activity Level</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="sedentary" /></FormControl>
                                                    <FormLabel className="font-normal">Sedentary (little to no exercise)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="light" /></FormControl>
                                                    <FormLabel className="font-normal">Lightly Active (light exercise/sports 1-3 days/week)</FormLabel>
                                                </FormItem>
                                                 <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="moderate" /></FormControl>
                                                    <FormLabel className="font-normal">Moderately Active (moderate exercise/sports 3-5 days/week)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="active" /></FormControl>
                                                    <FormLabel className="font-normal">Very Active (hard exercise/sports 6-7 days a week)</FormLabel>
                                                </FormItem>
                                                 <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="very_active" /></FormControl>
                                                    <FormLabel className="font-normal">Extra Active (very hard exercise/sports & physical job)</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormDescription>Helps estimate your daily calorie needs (TDEE).</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                         {currentStep === 4 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="targetBodyFatPct"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Target Body Fat (%) (Optional)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" placeholder="e.g., 11" {...field} /></FormControl>
                                             <FormDescription>Your desired body fat percentage goal.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="targetDate"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem>
                                            <FormLabel>Target Date (Optional)</FormLabel>
                                            <FormControl><Input type="date" placeholder="YYYY-MM-DD" {...field} /></FormControl>
                                             <FormDescription>When do you aim to reach this goal?</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                         {currentStep === 5 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="lactoseSensitive"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Lactose Sensitive?</FormLabel>
                                                <FormDescription>
                                                    We'll flag recipes and remind you if needed.
                                                 </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="backIssues"
                                    render={({ field }: FormFieldRenderProps) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>History of Back Issues?</FormLabel>
                                                <FormDescription>
                                                   This helps us adjust workout plans for safety.
                                                 </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                            Previous
                        </Button>
                        <Button type="button" onClick={nextStep} disabled={form.formState.isSubmitting}>
                            {currentStep === TOTAL_STEPS ? (form.formState.isSubmitting ? 'Saving...' : 'Finish Setup') : 'Next'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
} 