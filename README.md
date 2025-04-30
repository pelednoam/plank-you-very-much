# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project aims to follow the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack (Current)

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified, using **App Router**)_
*   **Authentication:** **NextAuth.js v5 (Auth.js)** with Google, GitHub, and Credentials providers _(Added; Spec implicitly needed auth)_
*   **Styling:** Tailwind CSS + **shadcn/ui** _(Spec mentioned Tailwind; `shadcn/ui` added)_
*   **State Management:** Zustand (with IndexedDB persistence via `idb-keyval`) _(As specified)_
*   **Forms:** React Hook Form + **Zod** _(Spec mentioned RHF; `Zod` added)_
*   **Charts:** Recharts _(As specified)_
*   **Date Handling:** Day.js _(As specified)_
*   **Data Persistence:** IndexedDB via `idb-keyval` library; **Vercel KV** for Auth sessions (via `@auth/upstash-redis-adapter`) and **Push Notification Subscriptions**. _(KV added)_
*   **Notifications:** **Web Push API** + Service Worker (`public/sw.js`) + **`web-push` library** (backend) _(As specified/Implementation choices)_
*   **Markdown:** `gray-matter`, `react-markdown` + `remark-gfm` _(Implementation choices)_
*   **Integrations:** Fitbit Web API (OAuth 2.0) _(Implemented)_, Google Health Connect / Apple HealthKit _(Pending)_, Web NFC API _(Pending)_ _(As specified)_
*   **Testing:** Jest + React Testing Library _(As specified; **Cypress E2E pending**, Component tests currently blocked)_
*   **PWA:** `@serwist/next` _(Implementation choice)_
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Implementation choices)_

## 3. Current Status (as of latest update)

### Implemented Features (Highlights)

*   **Project Setup:** Next.js **App Router**, TypeScript, Tailwind, ESLint.
*   **Authentication (NextAuth.js v5):** Core setup, Google/GitHub/Credentials providers, **Vercel KV** session storage, API route (`/api/auth/[...nextauth]/route.ts`), `getCurrentUserId` util (untested), Credentials provider `authorize` function tested.
    *   **Authentication UI:** `SignInButton`, `SignOutButton`, `AuthButtons` implemented and integrated into `Header`.
    *   **Route Protection:** Core application routes (`/`, `/planner`, `/nutrition`, `/knowledge`, `/settings`) protected via NextAuth.js middleware (`middleware.ts`).
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
*   **State Management (Zustand + IndexedDB):** Core stores implemented with `idbStorage` middleware (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`, `nutritionStore`). Tested.
*   **Offline Queue & Sync Manager:** Basic store (`offlineQueueStore`) and processing logic (`src/lib/offlineSyncManager.ts`) implemented with retry logic. Tested using **placeholder server actions**.
*   **Routing & Layout:** Basic App Router layout (`src/app/layout.tsx`) and core pages (`/`, `/onboard`, `/planner`, `/nutrition`, `/knowledge`, `/settings`).
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Multi-step form implemented. (Spec Feature 4.1)
*   **Dashboard (`/`):** Implemented with `MetricCards`, `ProgressChart`, `TodayWorkout`. (Spec Feature 4.6 & Section 10).
    *   `MetricCards` displays synced Fitbit data (Steps, Sleep, **Synced Calories Out**).
*   **Nutrition (`/nutrition`):** Meal logging implemented. (Spec Feature 4.5)
*   **Planner (`/planner`):** Weekly view implemented.
    *   **Adaptive Logic:** Implemented in `generateWeeklyPlan` based on previous week's completion rate (adjusts templates and durations) and placeholder availability logic (simple swap for busy days). `plannerStore` updated to store multiple plans and pass previous week's data. Tested and verified.
*   **Workout Logging:** `WorkoutDetailsModal` implemented for marking workouts complete/incomplete.
*   **Goal Engine:** TDEE/Calorie/Macro calculations (`src/lib/calculationUtils.ts`) implemented and tested. UI in Settings (`/settings/goals/page.tsx`). (Spec Feature 4.2 & Algorithm 8.1-8.3).
    *   **Fitbit Auto-Adjust Target:** `userProfileStore` automatically recalculates and stores `calorieTarget` and `proteinTarget` when fitness data (like Fitbit `lastSyncedCaloriesOut`) is updated. Tested.
*   **Knowledge Base (`/knowledge`):** Implemented using markdown rendering. (Spec Feature 4.7)
*   **Settings (`/settings`):** Profile, Goals, Data Export, Integrations, Notifications sections implemented.
*   **Fitbit Integration:** (Spec Feature 4.12, Section 8A)
    *   OAuth UI flow, callback handler, secure token storage (KV), refresh mechanism, server actions (`src/lib/fitbitActions.ts` - tested) including sync and revoke.
    *   **Sync Trigger:** Automatic sync on connect and manual sync button in Settings.
    *   **Data Usage:** Synced data stored in `activityStore` and `userProfileStore`. Used for Dashboard display and auto-adjusting calorie/protein targets.
*   **Notifications (Backend & Manual Trigger):** (Spec Feature 4.8, Section 11)
    *   Frontend subscription UI/logic in Settings.
    *   Backend API routes (`/subscribe`, `/unsubscribe`) implemented using Vercel KV. Tested.
    *   Server action (`src/lib/notificationActions.ts`) for *sending* notifications implemented using `web-push` and Vercel KV. Tested (with **mock workout data**).
    *   Service worker (`public/sw.js`) setup for receiving push messages.
    *   Manual trigger button in Settings (Dev) to test `triggerWorkoutReminders` action.
*   **Testing:** Jest + RTL setup. Unit tests cover core utils, stores, offline sync manager (with mock server actions), Fitbit actions, Notification API routes, Notification actions (sending part with mock data), adaptive planner logic, goal auto-adjustment, and Fitbit callback API. (See `tests.md`).
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** CSV export implemented in Settings. (Spec Feature 4.9)

### Discrepancies Between Implementation and Technical Specification

*   **Architecture:** Implemented using **App Router**; Spec (Section 6) proposed Pages Router.
*   **UI:** Uses **`shadcn/ui`** component library; Spec (Section 5) only mentioned Tailwind CSS.
*   **Authentication:** Implemented using **NextAuth.js v5**; Spec didn't detail auth, but it's required.
*   **Data Persistence:** Uses **Vercel KV** for Auth sessions and Push subscriptions; Spec (Section 5) focused on IndexedDB for persistence. IndexedDB (`idb-keyval`) *is* used for client-side store persistence as specified.
*   **Forms:** Uses **`Zod`** for validation alongside React Hook Form; Spec (Section 5) only mentioned RHF.
*   **Fitbit OAuth:** Implementation uses NextAuth.js adapter logic/direct fetch; Spec (Section 8A) suggested `simple-oauth2` library. Tokens stored server-side (KV).
*   **Data Models:** Implemented types (`src/types/index.ts`) may differ slightly from Spec (Section 7) based on practical API usage and store needs (e.g., Fitbit structures, calculated fields like `calorieTarget`).
*   **Planner Adaptation:** Availability logic is a simple placeholder swap; Spec (Algorithm 8.4) implied more complex user busy block integration. Back pain adjustment currently reduces duration; Spec suggested reducing intensity and adding mobility (template is switched, duration reduction is implemented).
*   **Offline Sync:** Spec (Section 15) mentioned IndexedDB sync queue; implementation uses Zustand store (`offlineQueueStore`) with IndexedDB persistence and placeholder server actions.

### Current Issues / Known Limitations

*   **Jest Configuration Blocker:** **Component Tests (RTL)** cannot currently be run due to a persistent `SyntaxError: Cannot use import statement outside a module` related to `next-auth/react`, despite `transformIgnorePatterns` adjustments. Linter errors also exist in `AuthButtons.test.tsx` related to `@testing-library/jest-dom` matchers.
*   **Notifications:**
    *   Workout reminder triggering (`triggerWorkoutReminders` action) uses **mocked workout data** via a placeholder (`getUpcomingWorkoutsForUser`).
    *   Actual **reminder trigger logic is missing** (e.g., no cron job or scheduler is set up).
*   **Offline Sync Manager:**
    *   Relies entirely on **placeholder server actions** (`plannerActions.ts`, `nutritionActions.ts`, `metricsActions.ts`) which simulate success/failure. **No actual backend database/API calls are made.**
*   **Testing Coverage:**
    *   **Component tests** are blocked (see above).
    *   **E2E tests (Cypress)** are missing.
    *   Tests for **NextAuth API route handler** (`/api/auth/[...nextauth]/route.ts`) are missing.
    *   Tests for **`getCurrentUserId` utility** are missing.
    *   Tests for **middleware** are missing.
*   **Fitbit Integration:** Robustness against rare API errors or edge cases could be improved.
*   **Planner:** Adaptive logic needs refinement (e.g., incorporating real user availability, specific back pain intensity levels). No UI for viewing/managing past plans.

### Missing Features / Next Steps (Prioritized)

**Highest Priority (Unblocking & Core Functionality):**

1.  **Fix Jest Configuration:** Resolve the ESM/transform issue preventing **Component Tests (RTL)** from running. Address linter errors in existing component tests. (Spec 13)
2.  **Implement Component Tests:** Start adding RTL tests for critical UI components (`UserProfileForm`, `GoalSettingsForm`, `AuthButtons`, `MetricCards`, etc.) once unblocked. (Spec 13)
3.  **Implement E2E Tests (Cypress):** Set up Cypress and begin testing critical user flows (Onboarding, Login, Plan Generation, Workout Completion, Fitbit Sync). (Spec 13)
4.  **Notifications (Real Trigger & Data):**
    *   Implement a **real data source** for `getUpcomingWorkoutsForUser` in `notificationActions.ts` (needs access to planner state, potentially via API route or client-driven trigger). (Spec 4.8, 11)
    *   Implement **reminder trigger logic** (e.g., Vercel Cron Job calling `triggerWorkoutReminders`). (Spec 4.8, 11)
    *   **Verify end-to-end push delivery** with real data.
5.  **Offline Sync Manager (Real Backend):**
    *   Replace **placeholder server actions** with actual database/API calls (e.g., to Vercel KV or a database) for saving workout completion, nutrition logs, metrics. (Spec 15)
    *   Implement robust error handling for real API failures within the manager/server actions.
    *   _Test Coverage:_ Update `offlineSyncManager.test.ts` to mock actual API calls.

**Medium Priority (Completing Spec Features v1.1):**

6.  **Wyze Scale Integration (Spec 4.13, 8F):** Implement reading from Google Health Connect / Apple HealthKit (likely requires native wrapper or alternative cloud API if available) or refine CSV import.
7.  **NFC Triggers (Spec 4.14, 8B, 8E):** Implement Web NFC for Android, QR code fallback for iOS, and connect to workout logging/auto-start.
8.  **Media Library Integration (Spec 4.10, 4.11, 6):** Connect `ExerciseVideo` and `MealGallery` components to a real data source (e.g., markdown frontmatter, database). Add tests.
9.  **Planner Enhancements:** Refine availability integration (beyond placeholder). Implement back pain intensity adjustments.
10. **Knowledge Cards Enhancements (Spec 4.7):** Add filtering/search.
11. **Testing (Remaining Gaps):** Add tests for NextAuth API route, `getCurrentUserId`, middleware.

**Low Priority (Spec v2.0 / Polish):**

12. **Equipment Cues (Spec 4.4):** Implement standing desk/balance board prompts.
13. **Data Export Enhancements (Spec 4.9):** Add JSON format.
14. **AI Plan Re-generation (Spec 17.v2.0):** Integrate with OpenAI API.
15. **CI/CD Finalization (Spec 14):** Set up full GitHub Actions workflow.
16. **Accessibility & UX Polish (Spec 12):** Conduct review and refinement.
17. **Guided Tutorials (Spec 4.14, 8D):** Implement modal and content for NFC setup.
18. **Native Wrappers (Optional - Spec 8E):** Consider Capacitor/React Native if iOS NFC/full push is critical.

## 4. Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd plank-you-very-much
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```
3.  **Environment Variables:**
    Manually create a `.env.local` file in the root directory. **Do not commit this file.** Populate it with your secrets:
    ```dotenv
    # Auth Core (Required)
    # Generate with: openssl rand -base64 32
    AUTH_SECRET="YOUR_AUTH_SECRET_HERE"
    AUTH_TRUST_HOST="true" # Recommended for Vercel/proxy deployments
    # AUTH_URL="http://localhost:3000" # Usually auto-detected, set if needed

    # Vercel KV (Required for Auth Session Storage & Notification Subscriptions)
    KV_URL="YOUR_KV_URL_HERE"
    KV_REST_API_URL="YOUR_KV_REST_API_URL_HERE"
    KV_REST_API_TOKEN="YOUR_KV_REST_API_TOKEN_HERE"
    KV_REST_API_READ_ONLY_TOKEN="YOUR_KV_REST_API_READ_ONLY_TOKEN_HERE"

    # Auth Providers (Add secrets for providers you enable)
    AUTH_GOOGLE_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
    AUTH_GOOGLE_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
    AUTH_GITHUB_ID="YOUR_GITHUB_CLIENT_ID_HERE"
    AUTH_GITHUB_SECRET="YOUR_GITHUB_CLIENT_SECRET_HERE"

    # Client-side Variables (Can also be in .env.local)
    NEXT_PUBLIC_APP_NAME="Plank You Very Much"

    # Fitbit Integration
    NEXT_PUBLIC_FITBIT_CLIENT_ID="YOUR_FITBIT_CLIENT_ID_HERE"
    FITBIT_CLIENT_SECRET="YOUR_FITBIT_CLIENT_SECRET_HERE"
    # Ensure this matches the registered callback URL in Fitbit Dev settings AND your callback API route
    NEXT_PUBLIC_FITBIT_REDIRECT_URI="http://localhost:3000/api/fitbit/callback"

    # VAPID keys for Push Notifications (Required for Notifications)
    # Generate with: npx web-push generate-vapid-keys
    NEXT_PUBLIC_VAPID_PUBLIC_KEY="YOUR_VAPID_PUBLIC_KEY_HERE"
    VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY_HERE"
    ```
    **Important:** Configure callback/redirect URLs correctly in Google Cloud Console, GitHub Developer Settings, and Fitbit Developer Settings for your development (`localhost`) and production environments.

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:** (See `tests.md` for details)
    ```bash
    # Run all tests
    pnpm test
    # Run specific test file
    # pnpm exec jest src/store/metricsStore.test.ts
    ```
    ```bash
    # Run E2E tests (requires Cypress setup)
    # pnpm exec cypress open
    ```

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 