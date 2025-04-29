"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNutritionStore } from '@/store/nutritionStore';
import { useMediaStore } from '@/store/mediaStore';
import type { MediaAsset } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/components/ui/select';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// Schema based on Meal type (excluding id, timestamp)
const mealSchema = z.object({
    kcal: z.number({ invalid_type_error: 'Calories must be a number'}).positive('Calories must be positive').int(),
    proteinG: z.number({ invalid_type_error: 'Protein must be a number'}).nonnegative('Protein cannot be negative').int(),
    carbsG: z.number({ invalid_type_error: 'Carbs must be a number'}).nonnegative('Carbs cannot be negative').int(),
    fatG: z.number({ invalid_type_error: 'Fat must be a number'}).nonnegative('Fat cannot be negative').int(),
    lactoseFree: z.boolean(),
    mediaId: z.string().optional(),
    // description: z.string().optional(), // Optional text description
});

type MealFormData = z.infer<typeof mealSchema>;

const MealLogForm: React.FC = () => {
    const addMeal = useNutritionStore((state) => state.addMeal);
    const { findAssetsByTag, getAssetById } = useMediaStore((state) => ({
        findAssetsByTag: state.findAssetsByTag,
        getAssetById: state.getAssetById,
    }));
    const [mealMediaAssets, setMealMediaAssets] = useState<MediaAsset[]>([]);
    const isOnline = useOnlineStatus();

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<MealFormData>({
        resolver: zodResolver(mealSchema),
        defaultValues: {
            kcal: 0,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
            lactoseFree: false,
            mediaId: '',
        },
    });

    useEffect(() => {
        const assets = findAssetsByTag('meal');
        setMealMediaAssets(assets);
    }, [findAssetsByTag]);

    const selectedMediaId = watch('mediaId');
    const selectedAsset = selectedMediaId ? getAssetById(selectedMediaId) : null;

    const onSubmit: SubmitHandler<MealFormData> = async (data) => {
        try {
            const mealDataForStore = {
                ...data,
                mediaIds: data.mediaId ? [data.mediaId] : [],
            };
            const result = await addMeal(mealDataForStore, isOnline);

            if (result !== null) {
                toast.success("Meal Logged", { description: `${data.kcal} kcal meal added.` });
                reset();
            } else {
                toast.info("Offline: Meal log queued.");
                reset();
            }
        } catch (error) {
            console.error("Failed to log meal:", error);
            toast.error("Error Logging Meal", { description: "Could not save meal log." });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded shadow bg-white grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Macros */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="kcal">Calories (kcal)</Label>
                    <Input id="kcal" type="number" {...register('kcal', { valueAsNumber: true })} disabled={isSubmitting} />
                    {errors.kcal && <p className="text-red-500 text-sm mt-1">{errors.kcal.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="proteinG">Protein (g)</Label>
                    <Input id="proteinG" type="number" {...register('proteinG', { valueAsNumber: true })} disabled={isSubmitting} />
                    {errors.proteinG && <p className="text-red-500 text-sm mt-1">{errors.proteinG.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="carbsG">Carbs (g)</Label>
                    <Input id="carbsG" type="number" {...register('carbsG', { valueAsNumber: true })} disabled={isSubmitting} />
                    {errors.carbsG && <p className="text-red-500 text-sm mt-1">{errors.carbsG.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="fatG">Fat (g)</Label>
                    <Input id="fatG" type="number" {...register('fatG', { valueAsNumber: true })} disabled={isSubmitting} />
                    {errors.fatG && <p className="text-red-500 text-sm mt-1">{errors.fatG.message}</p>}
                </div>

                 {mealMediaAssets.length > 0 && (
                    <div className="col-span-2">
                        <Label htmlFor="mediaId">Related Image (Optional)</Label>
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
                                    {mealMediaAssets.map(asset => (
                                        <SelectOption key={asset.id} value={asset.id}>
                                            {asset.description || asset.id}
                                        </SelectOption>
                                    ))}
                                </Select>
                            )}
                        />
                        {selectedAsset && (
                            <div className="mt-2 border rounded overflow-hidden relative w-full aspect-video max-w-xs">
                                 <img src={selectedAsset.url} alt={selectedAsset.description || 'Selected meal image'} className="object-contain w-full h-full" />
                             </div>
                        )}
                    </div>
                )}
            </div>

            {/* Options & Submit */}
            <div className="flex flex-col justify-between space-y-4">
                <div className="flex items-center space-x-2">
                    <Input id="lactoseFree" type="checkbox" {...register('lactoseFree')} className="h-4 w-4" disabled={isSubmitting} />
                    <Label htmlFor="lactoseFree">Lactose Free?</Label>
                    {errors.lactoseFree && <p className="text-red-500 text-sm mt-1">{errors.lactoseFree.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Logging...' : 'Log Meal'}
                </Button>
            </div>
        </form>
    );
};

export default MealLogForm; 