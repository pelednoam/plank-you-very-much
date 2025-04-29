import * as z from "zod";
import dayjs from 'dayjs';

// Zod schema for validating just the goal settings fields
export const goalSettingsSchema = z.object({
    targetBodyFatPct: z.coerce
        .number()
        .positive({ message: "Target % must be positive." })
        .max(50, { message: "Target % seems too high." })
        .optional(), // Keep it optional, rely on component logic for empty string
    targetDate: z.string()
        .optional()
        .refine((date) => !date || /^\d{4}-\d{2}-\d{2}$/.test(date), {
            message: "Please enter date as YYYY-MM-DD or leave blank."
        })
        .refine((date) => !date || dayjs(date).isAfter(dayjs().subtract(1, 'day')), {
            message: "Target date must be in the future."
        })
        .transform(date => date === '' ? undefined : date), // Transform empty string to undefined
});

// Type inferred from the schema
export type GoalSettingsFormData = z.infer<typeof goalSettingsSchema>; 