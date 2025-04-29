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
*   **Testing:** Jest + React Testing Library _(As specified; **Cypress E2E pending**)_
*   **PWA:** `@serwist/next` _(Implementation choice)_
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Implementation choices)_

## 3. Current Status (as of latest update)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router**, TypeScript, Tailwind, ESLint.
    *   **Deviation:** Spec (Section 6) proposed Pages Router structure, but App Router was used.
*   **Authentication (NextAuth.js v5):** Core setup, Google/GitHub/Credentials providers, **Vercel KV** session storage, API route (`/api/auth/[...nextauth]/route.ts`), `getCurrentUserId` util.
    *   **Deviation:** Uses NextAuth.js v5. Spec didn't detail auth implementation. KV is used for sessions. Spec didn't explicitly mention Auth but it's a necessary feature.
    *   **Authentication UI:** `SignInButton`, `SignOutButton`, `AuthButtons` implemented and integrated into `Header`.
    *   **Route Protection:** Core application routes (`/`, `/planner`, `/nutrition`, `/knowledge`, `/settings`) protected via NextAuth.js middleware (`middleware.ts`). Public routes like `/onboard` and `/api/*` remain accessible. (Spec implicitly required this).
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** Some fields differ slightly from Spec Section 7 (e.g., `FitbitDaily` structure). Store-specific types added.
*   **State Management (Zustand + IndexedDB):** Core stores implemented with `idbStorage` middleware (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`, `nutritionStore`). (Aligns with Spec Section 5).
*   **Offline Queue & Sync Manager:** Basic store (`offlineQueueStore`) and processing logic (`src/lib/offlineSyncManager.ts`) implemented. Tested.
    *   **Limitation:** Uses simulated backend calls currently.
*   **Routing & Layout:** Basic App Router layout (`src/app/layout.tsx`) and core pages (`/`, `/onboard`, `/planner`, `/nutrition`, `/knowledge`, `/settings`) implemented. (Aligns with Spec Section 9).
*   **UI Components (shadcn/ui):** Core components added. (Spec Section 5 mentioned Tailwind; `shadcn/ui` is an addition).
*   **Onboarding Flow (`/onboard`):** Implemented multi-step form. (Aligns with Spec Feature 4.1).
*   **Dashboard (`/`):** Implemented with `MetricCards`, `ProgressChart`, `TodayWorkout`. (Aligns with Spec Feature 4.6 & Section 10).
    *   `MetricCards` now displays synced Fitbit data (Steps, Sleep, Calories Burned).
*   **Nutrition (`/nutrition`):** Implemented meal logging. (Aligns with Spec Feature 4.5).
*   **Planner (`/planner`):** Basic weekly view implemented.
    *   **Adaptive Logic:** Implemented adaptive planner logic in `generateWeeklyPlan` based on previous week's completion rate (adjusts templates and durations). `plannerStore` updated to store multiple plans and pass previous week's data. (Partially implements Spec Feature 4.3 & Algorithm 8.4).
*   **Workout Logging:** `WorkoutDetailsModal` implemented for marking workouts complete/incomplete. (Supports Planner).
*   **Goal Engine:** TDEE/Calorie/Macro calculations (`src/lib/calculationUtils.ts`) implemented and tested. UI in Settings (`/settings/goals/page.tsx`) implemented. (Aligns with Spec Feature 4.2 & Algorithm 8.1-8.3).
*   **Knowledge Base (`/knowledge`):** Implemented using markdown rendering. (Aligns with Spec Feature 4.7).
*   **Settings (`/settings`):** Profile, Goals, Data Export, Integrations, Notifications sections implemented.
*   **Fitbit Integration:** _(Spec Feature 4.12, Section 8A)_
    *   OAuth UI flow (`/settings/integrations/page.tsx`), callback handler (`/api/fitbit/callback/route.ts`), secure token storage (HTTP-only cookies), refresh mechanism, server actions (`src/lib/fitbitActions.ts` - tested) including sync and revoke.
    *   **Sync Trigger:** Automatic sync on connect and manual sync button implemented in Settings page (`IntegrationSettings` component).
    *   **Data Usage:** Synced data (Steps, Sleep, Calories Burned) is stored in `activityStore` and displayed on the Dashboard via `MetricCards`. (Completes basic frontend integration).
*   **Notifications (Backend & Manual Trigger):** _(Spec Feature 4.8, Section 11)_
    *   Frontend subscription UI/logic in Settings.
    *   Backend API routes (`/subscribe`, `/unsubscribe`) implemented using Vercel KV. Tested.
    *   Server action (`src/lib/notificationActions.ts`) for sending notifications implemented using `web-push` and Vercel KV. Tested.
    *   Service worker (`public/sw.js`) setup for receiving push messages.
    *   Manual trigger button in Settings (Dev) to test `triggerWorkoutReminders` action (uses mock data).
*   **Testing:** Jest + RTL setup. Unit tests cover core utils, stores, offline sync, Fitbit actions, Notification API routes, Notification actions, and adaptive planner logic. (Aligns with Spec Section 13 for unit tests). See `tests.md`.
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings (`/settings/data-export/page.tsx`). (Aligns with Spec Feature 4.9).

### Discrepancies Noted Between `README.md` (Previous Version) and `Technical-Specification-and-Implementation-Guide.md`

*   The previous README correctly noted the deviation from Pages Router to App Router.
*   The previous README correctly noted that `shadcn/ui` and `Zod` were additions not in the original spec.
*   The previous README correctly noted the use of Vercel KV, which wasn't in the spec's persistence plan (which focused on IndexedDB). KV is used for Auth sessions and Push subscriptions, while IndexedDB is used for client-side state persistence (stores).
*   The previous README correctly identified NextAuth.js as the chosen auth solution, which wasn't specified initially.
*   The spec's data models (Section 7) might differ slightly from the implemented TypeScript types (`src/types/index.ts`), particularly regarding Fitbit data structures after real API interaction.
*   The spec proposed `simple-oauth2` (Section 8A), but the implementation likely uses NextAuth.js built-in OAuth handling or direct fetch calls for Fitbit token exchange.

### Current Issues / Known Limitations

*   **Authentication:**
    *   **Credentials provider uses placeholder `authorize` logic.** Needs secure implementation and testing.
    *   OAuth provider setup (callback URLs) must be completed in Google/GitHub dev consoles for production.
*   **Planner:**
    *   Adaptive logic needs further refinement (e.g., incorporating user availability, back pain intensity - Spec Algorithm 8.4).
    *   No UI for viewing past plans.
*   **Notifications:** Reminder **trigger logic missing** (cron/scheduler) and uses **mock workout data** for the manual test trigger. End-to-end push delivery needs thorough real-world verification.
*   **Offline Sync Manager:** Uses **simulated backend calls**. Lacks robust error handling/retries for actual API failures.
*   **Testing:** **Component tests (RTL)**, **E2E tests (Cypress)**, and **NextAuth API route tests** are **missing**. (See `tests.md`).
*   **Layout (`layout.tsx`):** Potential lingering type issues with `BeforeInstallPromptEvent`. (Minor).
*   **Fitbit Integration:** While basic sync and display work, auto-adjusting calorie targets based on synced data (Spec 8A.4, 17.v1.1) is not yet implemented in the goal engine/stores.

### Missing Features / Next Steps (Prioritized based on Spec & Current State)

**High Priority (Core Functionality & Spec v1.0/v1.1):**

1.  **Authentication (Complete Implementation):**
    *   Implement **secure `authorize` function** for Credentials provider.
    *   Set up **OAuth callback URLs** in dev consoles for production.
    *   _Test Coverage:_ Add tests for NextAuth API route, `authorize` logic, auth UI components.
2.  **Planner Enhancements (Complete Adaptive Logic - Spec 4.3, 8.4):**
    *   Incorporate user availability (placeholder) and back-pain flags into plan generation.
    *   Refine adaptation rules based on user feedback/testing.
    *   _Test Coverage:_ Ensure comprehensive tests cover all adaptive scenarios.
3.  **Fitbit Integration (Auto-Adjust Targets - Spec 8A.4, 17.v1.1):**
    *   Modify `userProfileStore` or goal calculation logic to automatically adjust calorie/macro targets based on fetched `FitbitDaily.caloriesOut`.
    *   _Test Coverage:_ Add tests for target adjustment logic.
4.  **Notifications (Trigger Logic & Verification - Spec 4.8, 11):**
    *   Implement **real data source** for `getWorkoutsNeedingReminders` (requires backend plan storage or reliable client-side query).
    *   Implement **reminder trigger logic** (e.g., Vercel Cron Job, scheduled function).
    *   **Verify end-to-end push delivery** with real data in various browser/OS scenarios.
5.  **Offline Sync Manager (Robustness):**
    *   Replace **simulated backend calls** with actual API calls (e.g., for marking workouts complete, saving nutrition).
    *   Implement **robust error handling/retries**.
    *   _Test Coverage:_ Need tests for retry/error handling with real API mocks.

**Medium Priority (Completing Spec Features):**

6.  **Wyze Scale Integration (Spec 4.13, 8F):** Implement Health Connect/Kit bridge or CSV import.
7.  **NFC Triggers (Spec 4.14, 8B, 8E):** Implement Web NFC / QR fallback and connect to workout logging.
8.  **Media Library (Spec 4.10, 4.11, 6):** Implement `ExerciseVideo`, `MealGallery` components and integrate media assets.
9.  **Knowledge Cards Enhancements (Spec 4.7):** Add filtering/search if needed. Currently basic display.
10. **Testing (Coverage - Spec 13):** Implement **Component Tests (RTL)** and **E2E Tests (Cypress)**. Add **NextAuth API route tests**.

**Low Priority (Spec v2.0 / Polish):**

11. **Equipment Cues (Spec 4.4):** Implement standing desk/balance board prompts/timers.
12. **Data Export Enhancements (Spec 4.9):** Add JSON format if needed (currently CSV).
13. **AI Plan Re-generation (Spec 17.v2.0):** Integrate with OpenAI API.
14. **CI/CD Finalization (Spec 14):** Set up full GitHub Actions workflow including Cypress tests.
15. **Accessibility & UX Polish (Spec 12):** Conduct review and refinement.
16. **Guided Tutorials (Spec 4.14, 8D):** Implement modal and content for NFC setup.
17. **Native Wrappers (Optional - Spec 8E):** Consider Capacitor/React Native if iOS NFC is critical.

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