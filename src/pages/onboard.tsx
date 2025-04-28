'use client'; // Required for react-hook-form and state

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router

// Define the shape of our form data
interface OnboardingFormData {
  name: string;
  initialWeightKg: number;
  initialBodyFatPct: number;
  // TODO: Add height, DOB, injury flags, goals etc.
}

const OnboardingPage = () => {
  const router = useRouter();
  const { setUserProfile, addBodyMetric } = useAppStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>();

  const onSubmit: SubmitHandler<OnboardingFormData> = async (data) => {
    console.log('Onboarding data submitted:', data);

    // 1. Update user profile in Zustand store
    setUserProfile({ name: data.name /*, Add other profile fields */ });

    // 2. Add initial body metrics to Zustand store (and IDB)
    const initialMetric = {
      date: new Date().toISOString(),
      weightKg: data.initialWeightKg,
      bodyFatPct: data.initialBodyFatPct,
      muscleMassKg: 0, // Placeholder - calculate or get from scale
      visceralRating: 0, // Placeholder - get from scale
    };
    await addBodyMetric(initialMetric);

    // 3. Redirect to the dashboard or next step
    router.push('/'); // Redirect to dashboard
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Welcome to Plank You Very Much!</h1>
      <p className="mb-6">Let's get some initial information to personalize your plan.</p>

      {/* TODO: Implement multi-step logic if needed */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Name is required' })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="initialWeightKg" className="block text-sm font-medium text-gray-700">Current Weight (kg)</label>
          <input
            id="initialWeightKg"
            type="number"
            step="0.1"
            {...register('initialWeightKg', { required: 'Weight is required', valueAsNumber: true, min: { value: 30, message: 'Weight must be realistic' } })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.initialWeightKg && <p className="text-red-500 text-xs mt-1">{errors.initialWeightKg.message}</p>}
        </div>

        <div>
          <label htmlFor="initialBodyFatPct" className="block text-sm font-medium text-gray-700">Estimated Body Fat (%)</label>
          <input
            id="initialBodyFatPct"
            type="number"
            step="0.1"
            {...register('initialBodyFatPct', { required: 'Body fat % is required', valueAsNumber: true, min: { value: 3, message: 'Body fat % must be realistic' }, max: { value: 50, message: 'Body fat % must be realistic' } })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.initialBodyFatPct && <p className="text-red-500 text-xs mt-1">{errors.initialBodyFatPct.message}</p>}
        </div>

        {/* TODO: Add fields for height, DOB, injury flags, goal setting (fat %, timeline) */}

        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Get Started
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage; 