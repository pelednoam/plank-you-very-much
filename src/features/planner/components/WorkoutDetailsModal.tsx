"use client";

import React from 'react';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWorkoutStore } from '@/store/workoutStore';
import type { Workout } from '@/types';
import dayjs from 'dayjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // For notes
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"; // Assuming form was added previously
import { Badge } from "@/components/ui/badge"; // To display workout type
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import ExerciseVideo from '@/features/media/components/ExerciseVideo'; // Import the new component

// Adjusted schema for logging workout performance
const workoutLogSchema = z.object({
    actualDurationMin: z.coerce.number().positive("Duration must be positive").optional(),
    performanceNotes: z.string().max(500, "Notes too long").optional(),
    performanceRating: z.coerce.number().min(1).max(10).optional(), // RPE or satisfaction
    completed: z.boolean(), // Removed .default(false)
});
type WorkoutLogFormData = z.infer<typeof workoutLogSchema>;

interface WorkoutDetailsModalProps {
    workoutId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    // trigger?: React.ReactNode; // Optional trigger if not using externally controlled state
}

// Helper type for FormField render prop
type FormFieldRenderProps = {
    field: ControllerRenderProps<WorkoutLogFormData, any>;
};

export function WorkoutDetailsModal({ workoutId, isOpen, onOpenChange }: WorkoutDetailsModalProps) {
    const { getWorkoutById, updateWorkout, toggleWorkoutComplete } = useWorkoutStore();
    const workout = getWorkoutById(workoutId);

    const form = useForm<WorkoutLogFormData>({
        resolver: zodResolver(workoutLogSchema),
        defaultValues: {
            actualDurationMin: workout?.actualDurationMin ?? undefined,
            performanceNotes: workout?.performanceNotes ?? '',
            performanceRating: workout?.performanceRating ?? undefined,
            completed: !!workout?.completedAt, // Set checkbox based on completedAt
        },
    });

    // Reset form when workout data changes (e.g., modal opens for different workout)
    React.useEffect(() => {
        if (workout) {
            form.reset({
                actualDurationMin: workout.actualDurationMin ?? undefined,
                performanceNotes: workout.performanceNotes ?? '',
                performanceRating: workout.performanceRating ?? undefined,
                completed: !!workout.completedAt,
            });
        }
    }, [workout, form.reset]);

    const onSubmit = (data: WorkoutLogFormData) => {
        if (!workout) return;
        console.log("Logging workout performance:", data);
        try {
            const updates: Partial<Workout> = {
                actualDurationMin: data.actualDurationMin,
                performanceNotes: data.performanceNotes,
                performanceRating: data.performanceRating,
                completedAt: data.completed
                    ? (workout.completedAt || dayjs().toISOString())
                    : undefined,
            };
            updateWorkout(workout.id, updates);
            toast.success(`${workout.type} workout logged successfully!`);
            onOpenChange(false); // Close modal
        } catch (error) {
            console.error("Error logging workout:", error);
            toast.error("Failed to log workout.");
        }
    };

    if (!workout) {
        // Handle case where workout is not found (maybe show error or just don't render modal content)
        // This might happen if the workout was deleted while the modal trigger was still visible
        return null; // Or some fallback UI within the Dialog if needed
    }

    // Get the primary media ID (e.g., the first one)
    const primaryMediaId = workout.mediaIds?.[0];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg"> {/* Increased max width */}
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                         <Badge variant="outline">{workout.type}</Badge>
                         <span>Workout Details & Log</span>
                    </DialogTitle>
                    <DialogDescription>
                         Planned for {dayjs(workout.plannedAt).format('ddd, MMM D, YYYY')} ({workout.durationMin} min)
                    </DialogDescription>
                </DialogHeader>
                
                {/* --- Exercise Video Section --- */} 
                {primaryMediaId && (
                    <div className="my-4">
                         <ExerciseVideo mediaId={primaryMediaId} />
                    </div>
                )}
                {/* --- End Exercise Video Section --- */} 
                
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-0 pb-4"> {/* Adjusted padding */} 
                        
                        {/* Logging Form Fields */} 
                        <FormField
                            control={form.control}
                            name="actualDurationMin"
                            render={({ field }: FormFieldRenderProps) => (
                                <FormItem>
                                    <FormLabel>Actual Duration (min)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder={`Planned: ${workout.durationMin}`} {...field} value={field.value ?? ''} />
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="performanceRating"
                             render={({ field }: FormFieldRenderProps) => (
                                <FormItem>
                                    <FormLabel>Rating / RPE (1-10)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" max="10" placeholder="e.g., 7" {...field} value={field.value ?? ''} />
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="performanceNotes"
                            render={({ field }: FormFieldRenderProps) => (
                                <FormItem>
                                    <FormLabel>Performance Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="How did it go? Any PRs?" {...field} value={field.value ?? ''} />
                                     </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="completed"
                            render={({ field }: FormFieldRenderProps) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 mt-4">
                                     <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id="completed-checkbox"
                                        />
                                    </FormControl>
                                    <FormLabel htmlFor="completed-checkbox" className="font-normal mb-0! mt-0! cursor-pointer">
                                        Mark as Completed
                                    </FormLabel>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                             <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                             </DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving Log...' : 'Save Log'}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 