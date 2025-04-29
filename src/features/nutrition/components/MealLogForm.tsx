"use client";

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMealStore } from '@/store/mealStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming shadcn/ui Checkbox
import { Card, CardContent, CardFooter } from "@/components/ui/card"; // Use Card for layout
import { toast } from 'sonner';
import dayjs from 'dayjs';

// Define the validation schema using Zod
const mealSchema = z.object({
    description: z.string().optional(),
    kcal: z.coerce.number().positive("Calories must be positive"),
    proteinG: z.coerce.number().nonnegative("Protein cannot be negative"),
    carbsG: z.coerce.number().nonnegative("Carbs cannot be negative"),
    fatG: z.coerce.number().nonnegative("Fat cannot be negative"),
    lactoseFree: z.boolean(),
    timestamp: z.string().optional(), // Will be set on submit
});

type MealFormData = z.infer<typeof mealSchema>;

const MealLogForm: React.FC = () => {
    const addMeal = useMealStore((state) => state.addMeal);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<MealFormData>({
        resolver: zodResolver(mealSchema),
        defaultValues: {
            kcal: 0,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
            lactoseFree: false,
            description: ''
        }
    });

    const onSubmit: SubmitHandler<MealFormData> = (data) => {
        const mealData = {
            ...data,
            timestamp: dayjs().toISOString(), // Set current timestamp
        };
        try {
            addMeal(mealData);
            toast.success("Meal logged successfully!");
            reset(); // Clear the form
        } catch (error) {
            console.error("Failed to log meal:", error);
            toast.error("Failed to log meal.");
        }
    };

    return (
        <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description (Optional) */}
                    <div className="md:col-span-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input id="description" {...register("description")} placeholder="e.g., Chicken Salad" />
                        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
                    </div>

                    {/* Kcal */}
                    <div>
                        <Label htmlFor="kcal">Calories (kcal)*</Label>
                        <Input id="kcal" type="number" step="1" {...register("kcal")} />
                        {errors.kcal && <p className="text-xs text-red-500 mt-1">{errors.kcal.message}</p>}
                    </div>

                    {/* Protein */}
                    <div>
                        <Label htmlFor="proteinG">Protein (g)*</Label>
                        <Input id="proteinG" type="number" step="0.1" {...register("proteinG")} />
                        {errors.proteinG && <p className="text-xs text-red-500 mt-1">{errors.proteinG.message}</p>}
                    </div>

                    {/* Carbs */}
                    <div>
                        <Label htmlFor="carbsG">Carbs (g)*</Label>
                        <Input id="carbsG" type="number" step="0.1" {...register("carbsG")} />
                        {errors.carbsG && <p className="text-xs text-red-500 mt-1">{errors.carbsG.message}</p>}
                    </div>

                    {/* Fat */}
                    <div>
                        <Label htmlFor="fatG">Fat (g)*</Label>
                        <Input id="fatG" type="number" step="0.1" {...register("fatG")} />
                        {errors.fatG && <p className="text-xs text-red-500 mt-1">{errors.fatG.message}</p>}
                    </div>
                    
                    {/* Lactose Free */}
                    <div className="flex items-center space-x-2 md:col-span-2">
                        <Checkbox id="lactoseFree" {...register("lactoseFree")} />
                        <Label htmlFor="lactoseFree" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Lactose Free
                        </Label>
                    </div>

                </CardContent>
                <CardFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging...' : 'Log Meal'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default MealLogForm; 