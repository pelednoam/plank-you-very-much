'use client';

import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { Workout } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

interface WorkoutFormData {
  type: Workout['type'];
  plannedAtDate: string; // YYYY-MM-DD
  plannedAtTime: string; // HH:MM
  durationMin: number;
}

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutToEdit?: Workout | null; // Pass workout data if editing
  selectedDate?: string; // Pre-fill date if adding from a specific day
}

// Define available workout types (excluding REST)
const WORKOUT_TYPES: Array<Exclude<Workout['type'], 'REST'>> = [
  'CLIMB', 'SWIM', 'CORE', 'STRENGTH'
];

export const WorkoutModal = ({ isOpen, onClose, workoutToEdit, selectedDate }: WorkoutModalProps) => {
  const { addWorkout, updateWorkout } = useAppStore();

  const defaultValues = React.useMemo(() => {
    const planned = workoutToEdit ? dayjs(workoutToEdit.plannedAt) : (selectedDate ? dayjs(selectedDate) : dayjs());
    return {
      type: workoutToEdit?.type ?? 'CORE',
      plannedAtDate: planned.format('YYYY-MM-DD'),
      plannedAtTime: planned.format('HH:mm'),
      durationMin: workoutToEdit?.durationMin ?? 30,
    };
  }, [workoutToEdit, selectedDate]);

  const {
    register,
    handleSubmit,
    control, // Needed for custom components like select if not using native
    reset,
    formState: { errors },
  } = useForm<WorkoutFormData>({ defaultValues });

  // Reset form when workoutToEdit or selectedDate changes, or when modal opens/closes
  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit: SubmitHandler<WorkoutFormData> = async (data) => {
    const plannedAtISO = dayjs(`${data.plannedAtDate}T${data.plannedAtTime}`).toISOString();

    const workoutData: Workout = {
      ...(workoutToEdit ?? {}), // Spread existing data if editing
      id: workoutToEdit?.id ?? uuidv4(),
      type: data.type,
      plannedAt: plannedAtISO,
      durationMin: data.durationMin,
      completed: workoutToEdit?.completed ?? false, // Keep completion status if editing
    };

    try {
      if (workoutToEdit) {
        await updateWorkout(workoutData);
        console.log('Workout updated:', workoutData.id);
      } else {
        await addWorkout(workoutData);
        console.log('Workout added:', workoutData.id);
      }
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Failed to save workout:', error);
      // TODO: Show an error message to the user
      alert('Failed to save workout.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <h2 className="text-xl font-bold mb-4">
          {workoutToEdit ? 'Edit Workout' : 'Add Workout'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Workout Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
            <select
              id="type"
              {...register('type', { required: 'Workout type is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {WORKOUT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plannedAtDate" className="block text-sm font-medium text-gray-700">Date</label>
              <input
                id="plannedAtDate"
                type="date"
                {...register('plannedAtDate', { required: 'Date is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.plannedAtDate && <p className="text-red-500 text-xs mt-1">{errors.plannedAtDate.message}</p>}
            </div>
            <div>
              <label htmlFor="plannedAtTime" className="block text-sm font-medium text-gray-700">Time</label>
              <input
                id="plannedAtTime"
                type="time"
                {...register('plannedAtTime', { required: 'Time is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.plannedAtTime && <p className="text-red-500 text-xs mt-1">{errors.plannedAtTime.message}</p>}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="durationMin" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              id="durationMin"
              type="number"
              step="5"
              {...register('durationMin', { required: 'Duration is required', valueAsNumber: true, min: { value: 5, message: 'Duration must be at least 5 minutes' } })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.durationMin && <p className="text-red-500 text-xs mt-1">{errors.durationMin.message}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {workoutToEdit ? 'Save Changes' : 'Add Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 