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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { toast } from "sonner";
import { QRCodeCanvas } from 'qrcode.react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

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
    const isOnline = useOnlineStatus();

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

    const onSubmit: SubmitHandler<WorkoutFormData> = async (data) => {
        const plannedAt = dayjs(`${data.plannedAtDate}T${data.plannedAtTime}`).toISOString();
        
        const workoutBaseData: Omit<Workout, 'id' | 'completedAt'> = {
            type: data.type,
            plannedAt: plannedAt,
            durationMin: data.durationMin,
            mediaIds: workoutToEdit?.mediaIds || [], 
        };

        if (data.mediaId && data.mediaId !== 'none') {
            workoutBaseData.mediaIds = [...new Set([...(workoutBaseData.mediaIds || []), data.mediaId])];
        } else if (data.mediaId === 'none' && workoutToEdit && workoutBaseData.mediaIds && workoutBaseData.mediaIds.length > 0) {
             console.warn("Selecting 'None' during edit will clear all associated media.");
             workoutBaseData.mediaIds = [];
        }

        let success = false;
        let queued = false;
        try {
            if (isEditing && workoutToEdit) {
                const result = await updateWorkout(workoutToEdit.id, workoutBaseData, isOnline);
                if (result === true) {
                    success = true;
                    toast.success("Workout Updated", { description: `Your ${data.type} session has been updated.` });
                } else if (result === false) {
                    queued = true;
                    toast.info("Offline: Workout update queued.");
                }
            } else {
                const result = await addWorkout(workoutBaseData, isOnline);
                if (result !== null) {
                    success = true;
                    toast.success("Workout Added", { description: `New ${data.type} session added to your plan.` });
                } else {
                    queued = true;
                    toast.info("Offline: Add workout action queued.");
                }
            }
            if(success || queued) {
                 onClose(); 
            }
            
        } catch (error) {
            console.error("Failed to save workout:", error);
            toast.error("Error", { description: "Failed to save workout. Please try again later." });
        }
    };

    if (!isOpen) return null;

    const currentMediaId = watch('mediaId');
    const nfcUri = workoutToEdit ? `plankyou://workout/${workoutToEdit.id}` : null;

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

                {/* Planned Date & Time (Consider splitting if not already) */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <Label htmlFor="plannedAtDate">Date</Label>
                         <Input
                            id="plannedAtDate"
                            type="date"
                            {...register('plannedAtDate')}
                            disabled={isSubmitting}
                        />
                        {errors.plannedAtDate && <p className="text-red-500 text-sm mt-1">{errors.plannedAtDate.message}</p>}
                    </div>
                     <div>
                         <Label htmlFor="plannedAtTime">Time</Label>
                         <Input
                            id="plannedAtTime"
                            type="time"
                            {...register('plannedAtTime')}
                            disabled={isSubmitting}
                        />
                         {errors.plannedAtTime && <p className="text-red-500 text-sm mt-1">{errors.plannedAtTime.message}</p>}
                    </div>
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

                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Workout')}
                    </Button>
                </div>
            </form>

            {/* QR Code Section (Only for existing workouts) */}
            {isEditing && nfcUri && (
                <div className="mt-6 pt-4 border-t text-center">
                    <h4 className="text-sm font-medium mb-2 text-gray-600">Scan QR Code (iOS Fallback)</h4>
                    <div className="inline-block p-2 border rounded bg-white">
                         <QRCodeCanvas 
                             value={nfcUri} 
                             size={128} // Adjust size as needed
                             bgColor={"#ffffff"}
                             fgColor={"#000000"}
                             level={"L"} // Error correction level
                             includeMargin={false}
                         />
                    </div>
                     <p className="text-xs text-gray-500 mt-1">Use a QR scanner app to open this workout.</p>
                 </div>
            )}
        </Modal>
    );
};
