# Test Status

This document tracks the status of automated tests in the Plank You Very Much project.

**Legend:**

*   ✅ **Passing:** All tests in the suite currently pass.
*   ⚠️ **Skipped:** Some or all tests in the suite are skipped (e.g., due to known issues, incomplete features, or environment problems).
*   ❌ **Failing:** Some or all tests in the suite are currently failing.
*   ➖ **Missing:** Tests for this area have not yet been implemented.
*   🔄 **Updated:** Test has been updated to cover new functionality but still needs verification.

---

## Unit Tests (Jest + React Testing Library)

These tests verify individual functions, components, or modules in isolation.

### Core Utilities (`src/lib`)

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests BMR, TDEE, Calorie Target (inc. Fitbit sync priority), LBM, Protein Target calculations.
*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's ability to process queued actions (using simulated success for known actions).
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests Fitbit server actions (refresh, fetch, sync, revoke) using mocked API calls and user ID retrieval.
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests notification sending logic (`triggerWorkoutReminders`, `sendNotification`) using mocked KV and web-push. *Does not test trigger logic accuracy or real data fetching.*
*   **`src/lib/auth.authorize.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Credentials provider `authorize` function logic (KV lookups, password hashing, OAuth vs. Credentials checks) using mocks.
*   **`src/lib/auth.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for `getCurrentUserId` utility function (important for securing server actions).

### Zustand Stores (`src/store`)

*   **`src/store/activityStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving daily activity data (Fitbit sync data).
*   **`src/store/metricsStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving body metrics (weight, body fat).
*   **`src/store/offlineQueueStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding, removing, and processing actions in the offline queue.
*   **`src/store/nutritionStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/deleting meals with offline handling.
*   **`src/store/plannerStore.test.ts`**
    *   **Status:** ✅ Passing *(Verified after recent changes)*
    *   **Description:** Tests plan generation trigger, adaptive logic execution (passing previous plan), multi-plan storage/retrieval, workout completion marking (inc. offline), and store initialization.
*   **`src/store/userProfileStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests profile updates, goal setting, Fitbit connection status, and fitness data updates.

### Features (`src/features`)

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** ✅ Passing *(Verified after recent changes)*
    *   **Description:** Tests the core `generateWeeklyPlan` utility, including adaptive logic based on previous week completion (template switching, duration adaptation), profile flags (back issues), fat loss goal interaction, and minimum duration enforcement.

### API Routes (`src/app/api`)

*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Fitbit OAuth callback handler (token exchange, storage) using mocks.
*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for saving a push subscription (uses mocked KV, auth).
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for deleting a push subscription (uses mocked KV, auth).
*   **`src/app/api/auth/[...nextauth]/route.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the NextAuth.js catch-all route handler.

### Components (`src/components`, `src/features/*/components`)

*   **Status:** ➖ Missing
*   **Description:** No component-level tests implemented yet using React Testing Library.
    *   **Key Missing Examples:** `<UserProfileForm />`, `<GoalSettingsForm />`, `<WorkoutDetailsModal />`, `<Dashboard />`, `<MetricCards />`, `<Planner />`, `<NutritionLog />`, `<IntegrationSettings />`, `<NotificationSettings />`, `<CsvImportButton />`, `<ExerciseVideo />`, `<MealGallery />`.

### Auth Components (`src/components/auth`)

*   **`src/components/auth/SignInButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for rendering and sign-in action trigger.
*   **`src/components/auth/SignOutButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for rendering and sign-out action trigger.
*   **`src/components/auth/AuthButtons.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for conditional rendering based on authentication session state.

### Auth Middleware (`src/middleware.ts`)

*   **Status:** ➖ Missing
*   **Description:** Tests for the NextAuth.js middleware logic, verifying route protection rules based on the `config.matcher`.

---

## End-to-End Tests (Cypress)

*   **Status:** ➖ Missing
*   **Description:** No E2E tests implemented yet. Cypress setup might be needed.
    *   **Critical Flows to Cover (Examples):**
        *   Onboarding completion.
        *   User Sign-in/Sign-out (Google/GitHub/Credentials).
        *   Connecting Fitbit account.
        *   Syncing Fitbit data and seeing updated metrics on Dashboard.
        *   Generating a weekly plan.
        *   Marking a workout as complete/incomplete.
        *   Logging a meal.
        *   Updating profile/goals in Settings.
        *   Exporting data.
        *   Subscribing/Unsubscribing from notifications.

---

## Running Tests

```bash
# Run all Jest unit tests
pnpm test

# Run a specific Jest test file
pnpm test src/store/plannerStore.test.ts

# Run Jest in watch mode
pnpm test --watch

# Run Cypress tests (once configured)
# pnpm exec cypress open
# pnpm exec cypress run
```