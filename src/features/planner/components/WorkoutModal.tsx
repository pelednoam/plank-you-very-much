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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { toast } from "sonner";
import { QRCodeCanvas } from 'qrcode.react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";

// Define Zod schema based on Workout type
// REMOVED logging fields (completed, actualDurationMin, etc.) as this modal focuses on planning/editing
const workoutSchema = z.object({
    type: z.enum(['CLIMB', 'SWIM', 'CORE', 'STRENGTH', 'REST', 'MOBILITY'], {
        required_error: 'Workout type is required'
    }),
    plannedAtDate: z.string().min(1, 'Date is required'), // YYYY-MM-DD
    plannedAtTime: z.string().min(1, 'Time is required'), // HH:mm
    durationMin: z.number({invalid_type_error: 'Planned duration must be a number'})
                    .positive('Planned duration must be positive')
                    .int('Planned duration must be a whole number'),
    mediaId: z.string().optional(), // Allow selecting one media asset
    notes: z.string().optional(), // Add pre-workout notes field
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
    const updateWorkoutAction = usePlannerStore((state) => state._updateWorkoutInPlan);
    const { findAssetsByTag } = useMediaStore((state) => ({
        findAssetsByTag: state.findAssetsByTag
    }));
    const isEditing = !!workoutToEdit;

    const form = useForm<WorkoutFormData>({
        resolver: zodResolver(workoutSchema),
    });
    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = form;

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
        if (!isEditing || !workoutToEdit) {
             toast.error("Cannot save", { description: "Workout not specified for editing." });
             console.error("Attempted to save without a workoutToEdit.");
             return;
        }

        const plannedAt = dayjs(`${data.plannedAtDate}T${data.plannedAtTime}`).toISOString();

        const workoutUpdateData: Partial<Workout> = {
            type: data.type,
            plannedAt: plannedAt,
            durationMin: data.durationMin,
            notes: data.notes,
            mediaIds: data.mediaId ? [data.mediaId] : [],
        };

        try {
            updateWorkoutAction(workoutToEdit.id, workoutUpdateData);
            toast.success("Workout Updated");
            onClose();

        } catch (error) {
            console.error("Failed to update workout:", error);
            toast.error("Error updating workout");
        }
    };

    if (!isOpen) return null;

    const currentMediaId = watch('mediaId');

    return (
        <Form {...form}>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Workout" : "Add Workout (Not Supported)"}>
                {(currentMediaId || workoutToEdit?.mediaIds?.[0]) && (
                    <div className="mb-4">
                        <ExerciseVideo mediaId={currentMediaId || workoutToEdit!.mediaIds![0]} />
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Workout Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {WORKOUT_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>
                                                {type.charAt(0) + type.slice(1).toLowerCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={control}
                            name="plannedAtDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="plannedAtTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Time</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                     <FormField
                        control={control}
                        name="durationMin"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl>
                                     <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} disabled={isSubmitting}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        {...field}
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                     {selectedType && selectedType !== 'REST' && availableMedia.length > 0 && (
                         <FormField
                             control={control}
                             name="mediaId"
                             render={({ field }) => (
                                 <FormItem>
                                     <FormLabel>Related Media (Optional)</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                         <FormControl>
                                             <SelectTrigger>
                                                 <SelectValue placeholder="Select media" />
                                             </SelectTrigger>
                                         </FormControl>
                                         <SelectContent>
                                             <SelectItem value="">None</SelectItem>
                                             {availableMedia.map(asset => (
                                                 <SelectItem key={asset.id} value={asset.id}>
                                                     {asset.description || asset.id} ({asset.type})
                                                 </SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                     <FormMessage />
                                 </FormItem>
                             )}
                         />
                     )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !isEditing}>
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save (Not Supported)')}
                        </Button>
                    </DialogFooter>
                </form>
            </Modal>
        </Form>
    );
};
