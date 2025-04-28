'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation'; // For redirecting

// --- Validation Schema --- (using Zod)
// Split schema per step if needed, or use a single large one
const onboardingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dob: z.string().optional(), // Consider date validation
  heightCm: z.number().positive('Height must be positive').optional(),
  targetBodyFatPct: z.number().min(3, 'Target too low').max(50, 'Target too high').optional(),
  targetDate: z.string().optional(), // Consider date validation
  lactoseSensitive: z.boolean(),
  backIssues: z.boolean().optional(),
  // equipment: z.array(z.string()).optional(), // Add if needed
});

// Infer the TS type from the schema
type OnboardingFormData = z.infer<typeof onboardingSchema>;

// --- Component --- 
export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const completeOnboarding = useUserProfileStore((state) => state.completeOnboarding);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    trigger, // To validate specific steps
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onBlur', // Validate on blur
    defaultValues: {
      lactoseSensitive: false, // Default value
      backIssues: false,
    }
  });

  const onSubmit: SubmitHandler<OnboardingFormData> = (data) => {
    console.log('Onboarding submitted:', data);
    // Data is already validated by zodResolver
    const profileData: Omit<UserProfile, 'completedOnboarding'> = {
      ...data,
      // Ensure optional number fields that are empty strings become undefined
      heightCm: data.heightCm ? Number(data.heightCm) : undefined,
      targetBodyFatPct: data.targetBodyFatPct ? Number(data.targetBodyFatPct) : undefined,
      // Add equipment processing if included
    };
    completeOnboarding(profileData);
    // Redirect to dashboard after completion
    router.push('/');
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'dob', 'heightCm']; // Fields for step 1
    } else if (step === 2) {
      fieldsToValidate = ['targetBodyFatPct', 'targetDate']; // Fields for step 2
    } else if (step === 3) {
      fieldsToValidate = ['lactoseSensitive', 'backIssues']; // Fields for step 3
    }

    const isValidStep = await trigger(fieldsToValidate);
    if (isValidStep) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  // --- Render Logic --- 
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">Welcome! Let's get started (Step {step}/3)</h2>

      {/* Step 1: Basic Info */} 
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input id="name" {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth (Optional)</label>
            <input id="dob" type="date" {...register('dob')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            {/* Add date validation error display if needed */}
          </div>
          <div>
            <label htmlFor="heightCm" className="block text-sm font-medium text-gray-700">Height (cm) (Optional)</label>
            <input id="heightCm" type="number" {...register('heightCm', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
             {errors.heightCm && <p className="mt-1 text-sm text-red-600">{errors.heightCm.message}</p>}
         </div>
        </div>
      )}

      {/* Step 2: Goals */} 
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="targetBodyFatPct" className="block text-sm font-medium text-gray-700">Target Body Fat % (Optional)</label>
            <input id="targetBodyFatPct" type="number" step="0.1" {...register('targetBodyFatPct', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            {errors.targetBodyFatPct && <p className="mt-1 text-sm text-red-600">{errors.targetBodyFatPct.message}</p>}
          </div>
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">Target Date (Optional)</label>
            <input id="targetDate" type="date" {...register('targetDate')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
             {/* Add date validation error display if needed */}
         </div>
        </div>
      )}

      {/* Step 3: Preferences/Flags */} 
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input id="lactoseSensitive" {...register('lactoseSensitive')} type="checkbox" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="lactoseSensitive" className="font-medium text-gray-700">Are you lactose sensitive?</label>
              <p className="text-gray-500">We'll remind you when logging meals.</p>
            </div>
          </div>
           <div className="flex items-start">
            <div className="flex items-center h-5">
              <input id="backIssues" {...register('backIssues')} type="checkbox" className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="backIssues" className="font-medium text-gray-700">Do you have any back issues/pain?</label>
              <p className="text-gray-500">We can adjust workout suggestions if needed.</p>
            </div>
          </div>
          {/* TODO: Add equipment selection if desired */}
        </div>
      )}

      {/* Navigation Buttons */} 
      <div className="flex justify-between pt-4">
        {step > 1 && (
          <button type="button" onClick={prevStep} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Back
          </button>
        )}
        {/* Hide Back button on step 1 to avoid empty space */} 
        {step === 1 && <div />} 

        {step < 3 && (
          <button type="button" onClick={nextStep} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Next
          </button>
        )}

        {step === 3 && (
          <button type="submit" disabled={!isValid} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
            Finish Onboarding
          </button>
        )}
      </div>
    </form>
  );
} 