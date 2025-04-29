# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project aims to follow the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack (Current)

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified, using **App Router**)_
    *   **Deviation:** Spec (Section 6) proposed Pages Router structure.
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
*   **Authentication (NextAuth.js v5):** Core setup, Google/GitHub/Credentials providers, **Vercel KV** session storage, API route, `getCurrentUserId` util.
    *   **Deviation:** Uses NextAuth.js v5. Spec didn't detail auth implementation. KV is used for sessions.
    *   **Authentication UI components:** `SignInButton`, `SignOutButton`, and `AuthButtons` components implemented and integrated into Header.
    *   **Route Protection:** Core application routes protected via NextAuth.js middleware.
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** Some fields differ slightly from Spec Section 7. Store-specific types added.
*   **State Management (Zustand + IndexedDB):** Core stores implemented with `idbStorage` middleware (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`, `nutritionStore`).
*   **Offline Queue & Sync Manager:** Basic store (`offlineQueueStore`) and processing logic (`src/lib/offlineSyncManager.ts`) implemented.
    *   **Limitation:** Uses simulated backend calls currently.
*   **Routing & Layout:** Basic App Router layout and core pages implemented.
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Implemented (Spec Feature 4.1).
*   **Dashboard (`/`):** Implemented (Spec Feature 4.6).
*   **Nutrition (`/nutrition`):** Implemented (Spec Feature 4.5).
*   **Planner (`/planner`):** Basic implementation. Workout duration adjustment added.
    *   **Deviation:** Full dynamic/adaptive plan generation is **missing** (Spec Feature 4.3, Algorithm 8.4).
    *   **Adaptive Logic:** Initial implementation of adaptive planner logic that considers previous week's completion rate and adjusts workout templates and durations accordingly. Multiple plan storage added.
*   **Workout Logging:** Added `WorkoutDetailsModal`.
*   **Goal Engine:** UI in Settings and calculation functions implemented (Spec Feature 4.2).
*   **Knowledge Base (`/knowledge`):** Implemented (Spec Feature 4.7).
*   **Settings (`/settings`):** Profile, Goals, Data Export sections implemented. Integrations/Notifications UI exists.
*   **Fitbit Integration (Partial):** _(Spec Feature 4.12, Section 8A)_
    *   OAuth UI flow, callback handler (`/api/fitbit/callback/route.ts`), secure token storage (HTTP-only cookies for refresh), server actions (`src/lib/fitbitActions.ts` - tested). Integrated with `getCurrentUserId`.
    *   **Missing:** Frontend logic to *trigger* `syncFitbitDataForDate` and *use* synced data.
*   **Notifications (Implemented Backend):** _(Spec Feature 4.8, Section 11)_
    *   Frontend subscription UI/logic in Settings.
    *   Backend API routes (`/subscribe`, `/unsubscribe`) implemented using **Vercel KV** for storage. **All tests pass.**
    *   Server action (`src/lib/notificationActions.ts`) implemented using `web-push` and **Vercel KV**. **Tests pass.**
    *   Service worker (`public/sw.js`) exists.
    *   **Missing:** Actual trigger logic for reminders (e.g., cron job, scheduled tasks). Verification of end-to-end push delivery.
*   **Testing:** Jest + RTL setup. Unit tests cover core utils, stores, offline sync, Fitbit actions, **Notification API routes**, and **Notification actions**. (See `tests.md`).
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings (Spec Feature 4.9).

### Current Issues / Known Limitations

*   **Authentication:**
    *   **Credentials provider uses placeholder `authorize` logic.** Needs secure implementation.
    *   OAuth provider setup (callback URLs) must be completed in Google/GitHub dev consoles.
*   **Fitbit Integration:** Frontend sync trigger and data usage logic are **missing**.
*   **Notifications:** Reminder **trigger logic missing**. End-to-end push delivery needs verification.
*   **Offline Sync Manager:** Uses **simulated backend calls**. Lacks robust error handling/retries.
*   **Testing:** **Component tests** and **E2E tests (Cypress)** are **missing**. **NextAuth API route tests** are **missing**. (See `tests.md`).
*   **Layout (`layout.tsx`):** Potential lingering type issues with `BeforeInstallPromptEvent`.

### Missing Features / Next Steps (Prioritized based on Spec & Current State)

**High Priority (Core Functionality & Spec v1.0/v1.1):**

1.  **Authentication (Complete Implementation):**
    *   Implement **real `authorize` function** for Credentials provider.
    *   Set up **OAuth callback URLs** in dev consoles.
    *   _Test Coverage:_ Need tests for NextAuth API route, `authorize` logic, related UI.
2.  **Fitbit Integration (Complete - Spec 4.12, 8A, 17.v1.1):**
    *   Implement **frontend logic** to trigger `syncFitbitDataForDate`.
    *   Integrate fetched data into stores & **auto-adjust calorie targets**.
    *   _Test Coverage:_ Expand tests for stores, callback API route, related components.
3.  **Planner Enhancements (Adaptive Logic - Spec 4.3, 8.4):**
    *   Complete and refine the adaptive algorithm implementation.
    *   _Test Coverage:_ Add comprehensive tests for the updated `generatePlan` functionality.
4.  **Notifications (Trigger Logic & Verification):**
    *   Implement **reminder trigger logic** (e.g., scheduled function, cron).
    *   **Verify end-to-end push delivery** in various scenarios.
5.  **Offline Sync Manager (Robustness):**
    *   Replace **simulated backend calls**.
    *   Implement **robust error handling/retries**.
    *   _Test Coverage:_ Need tests for retry/error handling.

**Medium Priority (Completing Spec Features):**

6.  **Wyze Scale Integration (Spec 4.13, 8F):** Implement Health Connect/Kit bridge or CSV import.
7.  **NFC Triggers (Spec 4.14, 8B, 8E):** Implement Web NFC / QR fallback and connect to logging.
8.  **Media Library Integration (Spec 4.10, 4.11):** Implement and integrate components.
9.  **Guided Tutorials (Spec 4.14, 8D):** Implement modal and content.
10. **Testing (Coverage - Spec 13):** Implement **Component Tests (RTL)** and **E2E Tests (Cypress)**. Add **NextAuth API route tests**.

**Low Priority (Spec v2.0 / Polish):**

11. **Equipment Cues (Spec 4.4):** Implement prompts/timers.
12. **AI Plan Re-generation (Spec 17.v2.0):** Integrate with OpenAI API.
13. **CI/CD Finalization (Spec 14):** Set up full GitHub Actions workflow.
14. **Accessibility & UX Polish (Spec 12):** Conduct review.
15. **Native Wrappers (Optional - Spec 8E):** Consider Capacitor/React Native.

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