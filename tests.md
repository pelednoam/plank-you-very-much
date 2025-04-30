# Test Status

This document tracks the status of automated tests in the Plank You Very Much project.

**Legend:**

*   ✅ **Passing:** All tests in the suite currently pass.
*   ⚠️ **Skipped/Blocked:** Some or all tests in the suite are skipped or blocked (e.g., due to known issues, incomplete features, or environment problems).
*   ❌ **Failing:** Some or all tests in the suite are currently failing.
*   ➖ **Missing:** Tests for this area have not yet been implemented.
*   ✎ **Todo:** Test suite passes but contains specific `it.todo` items for future enhancements.

---

## Unit Tests (Jest + React Testing Library)

These tests verify individual functions, components, or modules in isolation.

### Core Utilities (`src/lib`)

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests BMR, TDEE, Calorie Target (inc. Fitbit sync priority), LBM, Protein Target calculations.
*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's queue processing, retry logic, and handling of different action types using mocked server actions.
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests Fitbit server actions (token refresh, data fetching/syncing, token revocation) using mocked API calls and KV store access.
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the notification *sending* logic (`triggerWorkoutReminders`, `sendNotification`) using mocked KV, web-push, and placeholder workout data. Verifies subscription handling and error conditions. *Does not test the accuracy of workout data fetching for reminders (uses placeholder `getUpcomingWorkoutsForUser`).*
*   **`src/lib/auth.authorize.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Credentials provider `authorize` function logic (KV lookups, password hashing, user existence checks) using mocks.
*   **`src/lib/auth.ts` (`getCurrentUserId`)**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the `getCurrentUserId` utility function (important for securing server actions).

### Zustand Stores (`src/store`)

*   **`src/store/activityStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving daily activity data (e.g., Fitbit sync data).
*   **`src/store/metricsStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving body metrics (weight, body fat) and retrieving the latest metric.
*   **`src/store/offlineQueueStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding, removing, retrieving, and updating metadata for actions in the offline queue.
*   **`src/store/nutritionStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/deleting meals, including offline queue integration.
*   **`src/store/plannerStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests plan generation trigger (including ensuring Monday start date), passing previous plan data for adaptation, placeholder availability usage, multi-plan storage/retrieval, marking workouts complete (inc. offline handling), and store initialization logic.
*   **`src/store/userProfileStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests profile setting/updating, onboarding completion, goal setting, Fitbit connection management, fitness data updates (including automatic recalculation of BMR/TDEE/LBM/calorie/protein targets using mocked `calculationUtils` and `metricsStore`), and tutorial completion tracking. Includes checks for handling null profiles and persistence/hydration.

### Features (`src/features`)

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** ✅ Passing / ✎ 1 Todo
    *   **Description:** Tests the core `generateWeeklyPlan` utility, including template selection (default vs. back care based on profile/completion), duration adaptations (fat loss goal, completion rate, back issues), availability placeholder logic (swapping workouts), and enforcement of minimum durations. Includes a `todo` for future back pain level testing.

### API Routes (`src/app/api`)

*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Fitbit OAuth callback handler (token exchange, user profile fetching, secure token storage in KV) using mocks.
*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for saving a push subscription to Vercel KV (uses mocked KV, auth).
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for deleting a push subscription from Vercel KV (uses mocked KV, auth).
*   **`src/app/api/auth/[...nextauth]/route.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the NextAuth.js catch-all route handler (covers sign-in, sign-out, session management, etc.).

### Components (`src/components`, `src/features/*/components`)

*   **Status:** ➖ Missing (Partial - 1 Added) / ✅ Passing
*   **Description:** The Jest configuration issue (`SyntaxError: Cannot use import statement outside a module` for `next-auth/react`) has been resolved by **mocking** the `next-auth/react` module (`src/__mocks__/next-auth/react.js`). Component testing is now unblocked.
    *   **`src/features/settings/components/GoalSettingsForm.test.tsx`** ✅ Passing - Tests form rendering, input changes, validation, and submission using mocked store.
    *   **`src/features/settings/components/UserProfileForm.test.tsx`** ✅ Passing - Tests rendering with initial values, input changes (text, number, checkbox, select), validation (positive height, DOB not future), form submission, and disabled state. Mocks store, `sonner`, and `scrollIntoView`.
    *   **`src/features/settings/components/PreferenceToggles.test.tsx`** ✅ Passing - Tests rendering toggles based on store state, toggling preferences on/off (calling store action), handling null/missing profile/prefs, and showing toasts. Mocks store and `sonner`.
    *   **Key Missing Examples:** `<WorkoutDetailsModal />`, `<Dashboard />`, `<MetricCards />`, `<Planner />`, `<NutritionLog />`, `<IntegrationSettings />`, `<NotificationSettings />`, `<CsvImportButton />`, `<ExerciseVideo />`, `<MealGallery />`.

### Auth Components (`src/components/auth`)

*   **`src/components/auth/AuthButtons.test.tsx`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests conditional rendering based on authentication session state (`loading`, `unauthenticated`, `authenticated`) using mocked `useSession` and child components.
*   **`src/components/auth/SignInButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for rendering and sign-in action trigger.
*   **`src/components/auth/SignOutButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for rendering and sign-out action trigger.

### Auth Middleware (`src/middleware.ts`)

*   **Status:** ➖ Missing
*   **Description:** Tests for the NextAuth.js middleware logic, verifying route protection rules based on the `config.matcher` and authentication status.

---

## End-to-End Tests (Cypress)

*   **Status:** ➖ Missing
*   **Description:** No E2E tests implemented yet. Cypress setup is required.
    *   **Critical Flows to Cover (Examples):**
        *   Onboarding completion.
        *   User Sign-in/Sign-out (Google/GitHub/Credentials).
        *   Connecting Fitbit account.
        *   Syncing Fitbit data and seeing updated metrics on Dashboard & recalculated targets in profile.
        *   Generating a weekly plan (observing adaptive changes based on mock history).
        *   Marking a workout as complete/incomplete.
        *   Logging a meal.
        *   Updating profile/goals in Settings.
        *   Exporting data.
        *   Subscribing/Unsubscribing from notifications (mock validation if possible).

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