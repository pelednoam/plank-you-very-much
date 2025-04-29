import * as z from "zod";

// Zod schema defines the validation rules for the entire onboarding form
export const onboardingSchema = z.object({
    // Step 1: Personal Details
    name: z.string().min(1, { message: "Name is required." }).max(100),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please enter date as YYYY-MM-DD." }),
    sex: z.enum(["male", "female", "prefer_not_say"], { required_error: "Please select an option." }),
    heightCm: z.coerce.number().positive({ message: "Height must be positive." }).max(250, { message: "Height seems too high."}),

    // Step 2: Initial Metrics
    initialWeightKg: z.coerce.number().positive({ message: "Weight must be positive." }).max(300, { message: "Weight seems too high."}),
    initialBodyFatPct: z.coerce.number().optional().positive({ message: "Body fat % must be positive."}).max(70, { message: "Body fat % seems too high."}), // Optional

    // Step 3: Activity Level
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], {
        required_error: "Please select your activity level."
    }),

    // Step 4: Goals
    targetBodyFatPct: z.coerce.number().optional().positive({ message: "Target body fat % must be positive." }).max(50, { message: "Target body fat % seems too high."}),
    targetDate: z.string().optional().refine((date) => !date || /^\d{4}-\d{2}-\d{2}$/.test(date), { message: "Please enter date as YYYY-MM-DD."}),

    // Step 5: Preferences/Flags
    lactoseSensitive: z.boolean().default(false),
    backIssues: z.boolean().default(false),
});

// Type inferred from the schema
export type OnboardingFormData = z.infer<typeof onboardingSchema>; 