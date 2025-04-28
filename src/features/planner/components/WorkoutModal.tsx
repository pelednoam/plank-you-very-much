"use client";

import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/ui/Modal';
import type { Workout, WorkoutType } from '@/types';
import { usePlannerStore } from '@/store/plannerStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectOption } from '@/components/ui/Select';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Define Zod schema based on Workout type
// Split date and time for better UX with form inputs
const workoutSchema = z.object({
    type: z.enum(['CLIMB', 'SWIM', 'CORE', 'STRENGTH', 'REST', 'MOBILITY'], {
        required_error: 'Workout type is required'
    }),
    plannedAtDate: z.string().min(1, 'Date is required'), // YYYY-MM-DD
    plannedAtTime: z.string().min(1, 'Time is required'), // HH:mm
    durationMin: z.number({invalid_type_error: 'Duration must be a number'})
                    .positive('Duration must be positive')
                    .int('Duration must be a whole number'),
    // notes: z.string().optional(), // Keep simple for now
    // mediaIds: z.array(z.string()).optional(), // Add later if needed
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

const WORKOUT_TYPES: WorkoutType[] = ['CLIMB', 'SWIM', 'CORE', 'STRENGTH', 'MOBILITY', 'REST'];

interface WorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    workoutToEdit?: Workout | null; // Pass existing workout for editing
    selectedDate?: string; // Pre-fill date (YYYY-MM-DD) if adding from calendar click
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
    isOpen,
    onClose,
    workoutToEdit,
    selectedDate,
}) => {
    const addWorkout = usePlannerStore((state) => state.addWorkout);
    const updateWorkout = usePlannerStore((state) => state.updateWorkout);
    const isEditing = !!workoutToEdit;

    const {
        control,
        handleSubmit,
        register,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<WorkoutFormData>({
        resolver: zodResolver(workoutSchema),
        // Default values are set in useEffect
    });

    React.useEffect(() => {
        // Reset form when modal opens or relevant props change
        if (isOpen) {
            const initialValues: WorkoutFormData = {
                type: workoutToEdit?.type ?? 'CORE',
                plannedAtDate: workoutToEdit ? dayjs(workoutToEdit.plannedAt).format('YYYY-MM-DD') : selectedDate ?? dayjs().format('YYYY-MM-DD'),
                plannedAtTime: workoutToEdit ? dayjs(workoutToEdit.plannedAt).format('HH:mm') : '09:00',
                durationMin: workoutToEdit?.durationMin ?? 30,
            };
            reset(initialValues);
        }
    }, [isOpen, workoutToEdit, selectedDate, reset]);


    const onSubmit: SubmitHandler<WorkoutFormData> = (data) => {
         // Combine date and time, then format to ISO string
         const plannedAtISO = dayjs(`${data.plannedAtDate}T${data.plannedAtTime}`).toISOString();

        const workoutData: Omit<Workout, 'id' | 'completed' | 'mediaIds'> = { // Ensure we match store function expectations
            type: data.type,
            plannedAt: plannedAtISO,
            durationMin: data.durationMin,
        };

        try {
            if (isEditing && workoutToEdit) {
                // Assuming updateWorkout takes (id, partialWorkoutData)
                updateWorkout(workoutToEdit.id, workoutData);
            } else {
                 // Assuming addWorkout takes Omit<Workout, 'id' | 'completed'> and adds id/completed itself
                addWorkout(workoutData); // Pass only the core data
            }
            onClose(); // Close modal after successful submission
        } catch (error) {
            console.error("Failed to save workout:", error);
            // TODO: Implement user-facing error feedback
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Workout" : "Add Workout"}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Workout Type */}
                <div>
                    <Label htmlFor="type">Workout Type</Label>
                     <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <Select
                                id="type"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                disabled={isSubmitting}
                            >
                                <SelectOption value="" disabled>Select type</SelectOption>
                                {WORKOUT_TYPES.map(type => (
                                    <SelectOption key={type} value={type}>
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </SelectOption>
                                ))}
                            </Select>
                        )}
                    />
                    {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                </div>

                {/* Planned Date */}
                 <div>
                    <Label htmlFor="plannedAtDate">Date</Label>
                    <Input
                        id="plannedAtDate"
                        type="date" // Use date input for better UX
                        {...register('plannedAtDate')}
                        disabled={isSubmitting}
                    />
                     {errors.plannedAtDate && <p className="text-red-500 text-sm mt-1">{errors.plannedAtDate.message}</p>}
                </div>

                {/* Planned Time */}
                 <div>
                    <Label htmlFor="plannedAtTime">Time</Label>
                    <Input
                        id="plannedAtTime"
                        type="time" // Use time input
                        {...register('plannedAtTime')}
                        disabled={isSubmitting}
                    />
                     {errors.plannedAtTime && <p className="text-red-500 text-sm mt-1">{errors.plannedAtTime.message}</p>}
                </div>


                {/* Duration */}
                <div>
                    <Label htmlFor="durationMin">Duration (minutes)</Label>
                     <Input
                        id="durationMin"
                        type="number"
                        {...register('durationMin', { valueAsNumber: true })} // Ensure value is treated as number
                        disabled={isSubmitting}
                    />
                    {errors.durationMin && <p className="text-red-500 text-sm mt-1">{errors.durationMin.message}</p>}
                </div>

                {/* Add fields for mediaIds later if needed */}

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update Workout' : 'Add Workout')}
                    </Button>
                    {/* Optionally add delete button if editing */}
                     {/* {isEditing && (
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                            Delete
                        </Button>
                    )} */}
                </div>
            </form>
        </Modal>
    );
};
