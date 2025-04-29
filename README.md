# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project follows the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified)_.
*   **Styling:** Tailwind CSS + **shadcn/ui** _(Spec mentioned Tailwind; `shadcn/ui` was added for component library)_. 
*   **State Management:** Zustand (with IndexedDB persistence via `idb`) _(As specified)_.
*   **Forms:** React Hook Form + **Zod** _(Spec mentioned RHF; `Zod` was added for schema validation)_. 
*   **Charts:** Recharts _(As specified)_.
*   **Date Handling:** Day.js _(As specified)_.
*   **Data Persistence:** IndexedDB via `idb` library _(As specified)_.
*   **Markdown:** `gray-matter` (frontmatter), `react-markdown` + `remark-gfm` (rendering) _(Specific libraries chosen during implementation)_. 
*   **Integrations:** Fitbit Web API (OAuth 2.0 - partial), Google Health Connect / Apple HealthKit (pending), Web NFC API (pending) _(As specified)_. 
*   **Testing:** Jest + React Testing Library (Setup complete, minimal tests) _(Spec also mentioned Cypress E2E - not yet implemented)_. 
*   **PWA:** **`@serwist/next`** (using standard `sw.js`, requires verification) _(Spec mentioned older `@ducanh2912/next-pwa`; `@serwist/next` is now installed, likely replacing it)_. 
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Chosen during implementation)_. 

## 3. Current Status (as of 2025-04-29)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router** structure, TypeScript, Tailwind, ESLint. _(Deviation: Spec proposed Pages Router structure)_.
*   **Directory Structure:** Aligned with App Router conventions.
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** `Workout` uses `completedAt?: string` and `performanceRating` (renamed from `rating`).
    *   **Deviation:** `UserProfile` includes additional fields and uses App Router specific enums/types.
    *   **Deviation:** Added `Planner` types, `FitbitTokenData`, etc.
*   **State Management (Zustand + IndexedDB):** Core stores (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`) created using `idbStorage` for persistence.
*   **Routing & Layout:** Basic App Router layout and core pages implemented.
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Fully implemented as per Spec 4.1.
*   **Dashboard (`/`):** Implemented as per Spec 4.6, including charts and today's workouts. **Added:** Workout items link to details modal.
*   **Nutrition (`/nutrition`):** Meal logging and macro progress implemented (Spec 4.5). Targets now use goal parameters (Spec 4.2 partially addressed).
*   **Planner (`/planner`):**
    *   Monthly calendar view implemented.
    *   Basic weekly plan generation (`generateWeeklyPlan`) exists.
    *   **Added:** Dynamic workout **duration adjustment** based on user fat loss goals (partially addresses Spec 4.3).
    *   **Deviation:** Full dynamic/adaptive generation (Spec 4.3, 8.4) based on feedback/progress is **missing**.
    *   **Added:** Workout items link to details modal.
*   **Workout Logging:** **Added `WorkoutDetailsModal`** component for logging performance (duration, notes, rating, completion), integrated into Dashboard and Planner. _(Fulfills implicit logging need)_.
*   **Goal Engine:** Fully implemented UI (Settings) and integration with calculation functions (`calculateCalorieTarget`, `calculateProteinTarget`).
*   **Knowledge Base (`/knowledge`):** Implemented as per Spec 4.7.
*   **Settings (`/settings`):** Core sections implemented (Profile, Goals, Data Export). Integrations and Notifications UI exists.
*   **Fitbit Integration (Partial):**
    *   OAuth UI flow initiated from Settings.
    *   Callback handler (`/api/fitbit/callback/route.ts`) implemented to exchange code for tokens.
    *   **Improved Security:** Refresh tokens are stored in **secure, HTTP-only cookies**. Access tokens/expiry managed in client-side Zustand store (`userProfileStore`).
    *   Server Actions (`src/lib/fitbitActions.ts`) implemented for refreshing tokens (using cookie) and fetching data (requires client-side token).
    *   **Deviation:** Server Actions still use **placeholder `getCurrentUserId`** for app-level authentication.
    *   **Deviation:** Actual data sync logic beyond profile fetch in Settings is **not implemented**.
    *   **Issue:** Linter errors exist in `fitbitActions.ts` related to `cookies()`.
    *   **Issue:** Tests for `fitbitActions` (`fetchFitbitData`) are **skipped** due to mocking difficulties with Server Actions.
*   **Notifications (Partial):**
    *   Frontend subscription UI/logic in Settings implemented (`NotificationSettings` component).
    *   Backend API routes for `/api/notifications/subscribe` and `/api/notifications/unsubscribe` exist.
    *   **Deviation:** Uses **placeholder in-memory storage** (`notificationSubscriptionStorage.ts`) instead of a real database.
    *   **Deviation:** Server action for triggering reminders (`notificationActions.ts`) exists but uses **placeholder logic** and **does not actually send pushes** (`web-push` not fully integrated).
    *   **Deviation:** Uses JavaScript service worker (`public/sw.js`) instead of Spec's proposed TypeScript. Requires verification with PWA build.
    *   **Issue:** API route tests (`subscribe/route.test.ts`, `unsubscribe/route.test.ts`) are **skipped** due to issues mocking `NextResponse.json()` in Jest.
*   **Testing:**
    *   Jest + RTL setup complete (`jest.config.ts`, `jest.setup.js`).
    *   Unit tests implemented for:
        *   `src/lib/calculationUtils.test.ts`
        *   `src/store/metricsStore.test.ts`
        *   `src/features/planner/utils/generatePlan.test.ts`
    *   **Skipped Tests:** `fitbitActions.test.ts`, `api/notifications/subscribe/route.test.ts`, `api/notifications/unsubscribe/route.test.ts`.
    *   **Missing:** Component tests, E2E tests (Cypress).
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings using `exportUtils.ts`.

### Missing Features / Next Steps (Prioritized)

**High Priority (Core Functionality & Spec Alignment):**

*   **Fitbit Integration (Complete Sync & Fixes):** _(Address deviations from Spec 8A)_.
    *   Implement **full data sync logic** within server actions (sleep, HR, daily activity summaries) and integrate results into stores (e.g., `activityStore`).
    *   Replace placeholder `getCurrentUserId` with actual authentication.
    *   Resolve **linter errors** in `fitbitActions.ts`.
    *   Investigate and **fix skipped tests** in `fitbitActions.test.ts`.
*   **Notifications (Implement Backend & Fixes):** _(Address deviations from Spec 11 & 16)_.
    *   Implement **real database storage** for subscriptions (replace `notificationSubscriptionStorage.ts`).
    *   Implement **actual backend push service** using `web-push` in `notificationActions.ts`.
    *   Implement real notification triggers (e.g., scheduled job for workout reminders).
    *   Investigate and **fix skipped tests** for API routes.
    *   Verify service worker functionality (`sw.js`) in a PWA build.
*   **Planner Enhancements (Full Adaptive Generation):** Implement the core adaptive logic based on user progress/feedback as per Spec 4.3 & 8.4 (beyond just duration adjustment).
*   **Offline Sync (Decision & Implementation):** Evaluate need and implement robust offline queue/sync logic using `offlineQueueStore` (Spec 15).

**Medium Priority (Completing Features & Polish):**

*   **Wyze Scale Integration:** Implement Health Connect/Kit bridge or CSV import (Spec 8F).
*   **NFC Triggers:** Implement Web NFC scanning, connect scan action to `WorkoutDetailsModal`, implement QR fallback (Spec 8B, 8E).
*   **Media Library Integration:** Implement Meal Gallery & Exercise Video components and integrate with data models (Spec 4.10, 4.11).
*   **Settings (Full):** Implement backend sync for notification preferences, refine data export options.
*   **Testing:** Add Component tests (React Testing Library) and E2E tests (Cypress) (Spec 13).
*   **Styling & UX:** General polish, ensure accessibility (Spec 12).
*   **CI/CD:** Finalize workflow (Spec 14).

**Low Priority (v2.0 / Future):**

*   AI Plan Regeneration (Spec 17)
*   Native Wrappers (Optional) (Spec 8E)
*   Equipment Cues (Spec 4.4)
*   Social Features / Other Integrations (Spec 17)

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
3.  **Environment Variables:** _(Values below align with Spec 16 where applicable)_.
    Create a `.env.local` file in the root directory. Add:
    *   `NEXT_PUBLIC_APP_NAME="Plank You Very Much"`
    *   `NEXT_PUBLIC_FITBIT_CLIENT_ID="YOUR_FITBIT_CLIENT_ID"`
    *   `NEXT_PUBLIC_FITBIT_REDIRECT_URI="http://localhost:3000/settings"` (Update for deployment)
    *   `NEXT_PUBLIC_VAPID_PUBLIC_KEY="YOUR_GENERATED_VAPID_PUBLIC_KEY"`

    Create a `.env` file (or use environment variables in deployment) for **server-side** secrets. Add:
    *   `FITBIT_CLIENT_SECRET="YOUR_FITBIT_CLIENT_SECRET"`
    *   `VAPID_PRIVATE_KEY="YOUR_GENERATED_VAPID_PRIVATE_KEY"`

    **Never commit `.env`, `FITBIT_CLIENT_SECRET` or `VAPID_PRIVATE_KEY` to your repository.**
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:**
    ```bash
    # Run specific test file
    pnpm exec jest src/store/metricsStore.test.ts
    # Run all tests (assuming configured in package.json/jest.config)
    # pnpm test
    ```
    ```bash
    # Run E2E tests (requires Cypress setup)
    # pnpm exec cypress open
    ```

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 