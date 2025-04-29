# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project aims to follow the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack (Current)

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified, using **App Router**)_
*   **Authentication:** **NextAuth.js v5 (Auth.js)** with Google, GitHub, and Credentials providers _(Added)_
*   **Styling:** Tailwind CSS + **shadcn/ui** _(Spec mentioned Tailwind; `shadcn/ui` added)_
*   **State Management:** Zustand (with IndexedDB persistence via `idb-keyval`) _(As specified)_
*   **Forms:** React Hook Form + **Zod** _(Spec mentioned RHF; `Zod` added)_
*   **Charts:** Recharts _(As specified)_
*   **Date Handling:** Day.js _(As specified)_
*   **Data Persistence:** IndexedDB via `idb-keyval` library; **Vercel KV** for Auth sessions via `@auth/upstash-redis-adapter` _(KV added for Auth)_
*   **Markdown:** `gray-matter`, `react-markdown` + `remark-gfm` _(Implementation choices)_
*   **Integrations:** Fitbit Web API (OAuth 2.0), Google Health Connect / Apple HealthKit (Pending), Web NFC API (Pending) _(As specified)_
*   **Testing:** Jest + React Testing Library _(As specified; **Cypress E2E pending**)_
*   **PWA:** `@serwist/next` _(Implementation choice)_
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Implementation choices)_

## 3. Current Status (as of latest update)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router** structure, TypeScript, Tailwind, ESLint.
    *   **Deviation:** Spec proposed Pages Router structure (Section 6).
*   **Authentication (NextAuth.js v5):** _(Added - Spec implied need but didn't detail)_
    *   Core setup with root `auth.config.ts` and `auth.ts`.
    *   Providers configured: **Google**, **GitHub**, **Credentials** (with **placeholder `authorize` function**).
    *   Session storage using **Vercel KV** via `@auth/upstash-redis-adapter`.
    *   API route handler (`/api/auth/[...nextauth]/route.ts`) created.
    *   `getCurrentUserId` function (`src/lib/auth.ts`) implemented to retrieve user ID from session.
    *   **Deviation:** Uses NextAuth.js v5 (Auth.js), which wasn't specified. Spec 8A mentioned Fitbit env vars assuming NextAuth, but didn't specify version or setup. Session storage uses KV via Upstash adapter (compatible) instead of a specific DB choice.
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** Some specific fields differ from Spec Section 7. `UserProfile` and other store-specific types added.
*   **State Management (Zustand + IndexedDB):** Core stores (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`) created using `idbStorage` from `zustand/middleware`.
    *   **Offline Queue Store (`offlineQueueStore`):** Implemented.
    *   **Planner Store (`plannerStore`):** Handles plan generation, workout updates (optimistic UI, offline queuing).
    *   **Deviation:** Uses `idb-keyval` via Zustand middleware, not raw `idb`.
*   **Offline Sync Manager:** Basic manager (`src/lib/offlineSyncManager.ts`) processes queue (simulated backend).
*   **Routing & Layout:** Basic App Router layout and core pages implemented.
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Implemented (Spec Feature 4.1).
*   **Dashboard (`/`):** Implemented (Spec Feature 4.6).
*   **Nutrition (`/nutrition`):** Implemented (Spec Feature 4.5).
*   **Planner (`/planner`):** Basic implementation.
    *   **Added:** Workout duration adjustment based on goals.
    *   **Deviation:** Full dynamic/adaptive plan generation is **missing** (Spec Feature 4.3, Algorithm 8.4).
*   **Workout Logging:** Added `WorkoutDetailsModal`.
*   **Goal Engine:** UI in Settings and calculation functions implemented (Spec Feature 4.2).
*   **Knowledge Base (`/knowledge`):** Implemented (Spec Feature 4.7).
*   **Settings (`/settings`):** Profile, Goals, Data Export sections implemented. Integrations/Notifications UI exists.
*   **Fitbit Integration (Partial):** _(Spec Feature 4.12, Section 8A)_
    *   OAuth UI flow initiated from Settings.
    *   Callback handler (`/api/fitbit/callback/route.ts`) exchanges code for tokens.
    *   **Improved Security:** Refresh tokens stored in secure, HTTP-only cookies. Access tokens/expiry managed client-side (Zustand).
    *   Server Actions (`src/lib/fitbitActions.ts`) for refresh, fetch, sync, revoke. **All tests pass.**
    *   **Uses `getCurrentUserId`:** Now integrated with NextAuth session.
    *   **Missing:** Frontend logic to *trigger* `syncFitbitDataForDate` and *use* synced data.
*   **Notifications (Partial):** _(Spec Feature 4.8, Section 11)_
    *   Frontend subscription UI/logic in Settings.
    *   Backend API routes exist.
    *   **Deviation:** Uses **placeholder storage/logic**.
    *   **Deviation:** Uses JavaScript service worker (`public/sw.js`).
*   **Testing:** Jest + RTL setup. Unit tests for core utils, stores, offline sync, Fitbit actions. (See `tests.md`).
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings (Spec Feature 4.9).

### Current Issues / Known Limitations

*   **Authentication:**
    *   **Credentials provider uses placeholder `authorize` logic.** Needs replacement with secure user lookup and password validation.
    *   **UI integration is missing** (Sign-in/out buttons, session display).
    *   **Page/route protection is not implemented.**
    *   OAuth provider setup (callback URLs) must be completed in Google/GitHub developer consoles.
*   **Fitbit Integration:** Frontend sync trigger and data usage logic are **missing**.
*   **Notifications:** Backend needs **real storage and push implementation**. API route tests are **skipped**. Service worker functionality needs verification.
*   **Offline Sync Manager:** Uses **simulated backend calls**. Lacks robust error handling/retries.
*   **Planner:** Lacks **fully adaptive plan generation**.
*   **Testing:** Component tests and E2E tests (Cypress) are **missing**. NextAuth API route tests are **missing**. (See `tests.md`).
*   **Layout (`layout.tsx`):** Potential lingering type issues with `BeforeInstallPromptEvent`.

### Missing Features / Next Steps (Prioritized based on Spec & Current State)

**High Priority (Core Functionality & Spec v1.0/v1.1):**

1.  **Authentication (Complete Implementation):**
    *   Implement **real `authorize` function** for Credentials provider (user lookup, password hashing/checking).
    *   Integrate **Sign-in/Sign-out UI** (e.g., in Header/Settings).
    *   Implement **page/route protection** using Middleware or `auth()` checks.
    *   Set up **OAuth callback URLs** in Google/GitHub developer consoles.
    *   Wrap app in `<SessionProvider>` if using `useSession` hook.
    *   _Test Coverage:_ Need tests for NextAuth API route, `authorize` logic, and related UI components.
2.  **Fitbit Integration (Complete - Spec 4.12, 8A, 17.v1.1):**
    *   Implement **frontend logic** to trigger `syncFitbitDataForDate` (e.g., on app load/periodically).
    *   Integrate fetched `FitbitDaily` data into relevant stores (`metricsStore`, `activityStore`) and use it to **auto-adjust calorie targets**.
    *   _Test Coverage:_ Need tests for `userProfileStore` (token handling), `activityStore` (data consumption), Fitbit callback API route, and related components.
3.  **Notifications (Implement Backend & Fixes - Spec 4.8, 11):**
    *   Implement **real database storage** for push subscriptions.
    *   Implement **actual backend push service** (`notificationActions.ts`).
    *   Implement **real trigger logic** for reminders.
    *   **Fix skipped tests** for API routes & add tests for `notificationActions.ts`.
    *   Verify service worker.
4.  **Planner Enhancements (Adaptive Logic - Spec 4.3, 8.4):**
    *   Implement the core adaptive algorithm.
    *   _Test Coverage:_ Need more comprehensive tests for `generatePlan`.
5.  **Offline Sync Manager (Robustness):**
    *   Replace **simulated backend calls**.
    *   Implement **robust error handling**.
    *   _Test Coverage:_ Need tests for retry/error handling.

**Medium Priority (Completing Spec Features):**

6.  **Wyze Scale Integration (Spec 4.13, 8F):** Implement Health Connect/Kit bridge or CSV import.
7.  **NFC Triggers (Spec 4.14, 8B, 8E):** Implement Web NFC / QR fallback and connect to logging.
8.  **Media Library Integration (Spec 4.10, 4.11):** Implement and integrate components.
9.  **Guided Tutorials (Spec 4.14, 8D):** Implement modal and content.
10. **Testing (Coverage - Spec 13):** Implement **Component Tests (RTL)** and **E2E Tests (Cypress)**.

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

    # Vercel KV (Required for Auth Session Storage)
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

    # VAPID keys for Push Notifications
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