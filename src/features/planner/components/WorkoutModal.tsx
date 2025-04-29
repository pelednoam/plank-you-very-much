"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/ui/Modal';
import type { Workout, WorkoutType, MediaAsset } from '@/types';
import { usePlannerStore } from '@/store/plannerStore';
import { useMediaStore } from '@/store/mediaStore';
import ExerciseVideo from '@/features/media/components/ExerciseVideo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectOption } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { toast } from "sonner";

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
    mediaId: z.string().optional(), // Allow selecting one media asset
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
    const { findAssetsByTag } = useMediaStore((state) => ({ 
        findAssetsByTag: state.findAssetsByTag 
    }));
    const isEditing = !!workoutToEdit;

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<WorkoutFormData>({
        resolver: zodResolver(workoutSchema),
    });

    const selectedType = watch('type');
    const [availableMedia, setAvailableMedia] = useState<MediaAsset[]>([]);

    useEffect(() => {
        if (isOpen) {
            const initialValues: WorkoutFormData = {
                type: workoutToEdit?.type ?? 'CORE',
                plannedAtDate: workoutToEdit ? dayjs(workoutToEdit.plannedAt).format('YYYY-MM-DD') : selectedDate ?? dayjs().format('YYYY-MM-DD'),
                plannedAtTime: workoutToEdit ? dayjs(workoutToEdit.plannedAt).format('HH:mm') : '09:00',
                durationMin: workoutToEdit?.durationMin ?? 30,
                mediaId: workoutToEdit?.mediaIds?.[0] ?? '',
            };
            reset(initialValues);
        } else {
            setAvailableMedia([]);
        }
    }, [isOpen, workoutToEdit, selectedDate, reset]);

    useEffect(() => {
        if (selectedType && selectedType !== 'REST') {
            const relevantAssets = findAssetsByTag(selectedType.toLowerCase());
            setAvailableMedia(relevantAssets);
        } else {
            setAvailableMedia([]);
        }
    }, [selectedType, findAssetsByTag]);

    const onSubmit: SubmitHandler<WorkoutFormData> = (data) => {
        const plannedAtDate = dayjs(data.plannedAtDate).startOf('day'); // Use dayjs for reliable date handling

        // Base workout data without id and completedAt (handled by store/logic)
        // Keep mediaIds in the base type definition, handle it conditionally below
        const workoutBaseData: Omit<Workout, 'id' | 'completedAt'> = {
            type: data.type,
            plannedAt: plannedAtDate.toISOString(), // Ensure ISO string format
            durationMin: data.durationMin,
            // notes: data.notes || undefined, // Removed reference to non-existent 'notes'
            mediaIds: workoutToEdit?.mediaIds || [], // Start with existing or empty
        };

        // Conditionally add the selected mediaId if one was chosen
        if (data.mediaId && data.mediaId !== 'none') {
            // Ensure mediaIds is always an array, add new ID if not already present
            workoutBaseData.mediaIds = [...new Set([...(workoutBaseData.mediaIds || []), data.mediaId])];
        } else if (data.mediaId === 'none' && workoutToEdit) {
            // Explicitly remove media if 'None' was selected for an existing workout
            // This might need refinement depending on desired behavior (e.g., removing specific IDs)
            // For now, let's assume 'none' clears all mediaIds if selected during an edit.
            // If creating, 'none' means no mediaId is added initially.
            if (workoutBaseData.mediaIds && workoutBaseData.mediaIds.length > 0) {
                console.warn("Selecting 'None' during edit will clear all associated media.");
                workoutBaseData.mediaIds = [];
            }
        }
        // If creating a new workout and 'none' is selected, workoutBaseData.mediaIds remains [] (or its initial state)

        try {
            if (workoutToEdit) {
                updateWorkout(workoutToEdit.id, workoutBaseData);
                toast.success("Workout Updated", {
                    description: `Your ${data.type} session has been updated.`
                });
            } else {
                addWorkout(workoutBaseData);
                toast.success("Workout Added", {
                    description: `New ${data.type} session added to your plan.`
                });
            }
            onClose(); // Close modal on success
        } catch (error) {
            console.error("Failed to save workout:", error);
            toast.error("Error", {
                description: "Failed to save workout. Please try again later.",
            });
        }
    };

    if (!isOpen) return null;

    const currentMediaId = watch('mediaId');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Workout" : "Add Workout"}>
            {(currentMediaId || workoutToEdit?.mediaIds?.[0]) && (
                <div className="mb-4">
                    <ExerciseVideo mediaId={currentMediaId || workoutToEdit!.mediaIds![0]} />
                </div>
            )}
            
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
                                onChange={(e) => {
                                     field.onChange(e);
                                 }}
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

                {/* Media Selection Dropdown */}
                 {selectedType && selectedType !== 'REST' && availableMedia.length > 0 && (
                    <div>
                        <Label htmlFor="mediaId">Related Media</Label>
                        <Controller
                            name="mediaId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    id="mediaId"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    disabled={isSubmitting}
                                >
                                    <SelectOption value="">None</SelectOption>
                                    {availableMedia.map(asset => (
                                        <SelectOption key={asset.id} value={asset.id}>
                                            {asset.description || asset.id} ({asset.type})
                                        </SelectOption>
                                    ))}
                                </Select>
                            )}
                        />
                         {errors.mediaId && <p className="text-red-500 text-sm mt-1">{errors.mediaId.message}</p>}
                    </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update Workout' : 'Add Workout')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
