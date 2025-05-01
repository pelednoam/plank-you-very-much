# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project aims to implement the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project will follow the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md), incorporating learnings from previous development attempts.

## 2. Target Tech Stack

*   **Framework:** **Next.js 15+ (React 19)** + TypeScript _(Using **App Router**)_
*   **Authentication:** **NextAuth.js v5 (Auth.js)** with Google, GitHub, and Credentials providers
*   **Styling:** Tailwind CSS + **shadcn/ui**
*   **State Management:** **Zustand** (with **IndexedDB persistence** via `idb`)
*   **Forms:** React Hook Form + **Zod** (for validation)
*   **Charts:** Recharts
*   **Date Handling:** Day.js
*   **Data Persistence (Server-Side):** **Vercel KV** (via `@auth/upstash-redis-adapter` for Auth sessions and custom logic for Push Notification Subscriptions)
*   **Notifications:** **Web Push API** + Service Worker (`src/worker/index.ts` or similar) + **`web-push` library** (backend)
*   **Markdown:** `gray-matter`, `react-markdown` + `remark-gfm` (for Knowledge Base)
*   **Integrations:** Fitbit Web API (OAuth 2.0)
*   **Testing:** Jest + React Testing Library (Unit/Component); Cypress (E2E)
*   **Other Key Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `cross-env`, `start-server-and-test` (for E2E test setup)

## 3. Core Features & Implementation Plan (Based on Spec v1.0/v1.1)

This outlines the primary features to build in the initial phases.

1.  **Project Setup:** Initialize Next.js App Router project with TypeScript, Tailwind, ESLint.
2.  **UI Foundation:** Integrate `shadcn/ui`, set up basic layout (`layout.tsx`, `Header`, potentially `Sidebar`).
3.  **Authentication:**
    *   Implement NextAuth.js v5 config (`auth.config.ts`, `auth.ts`).
    *   Set up providers (Google, GitHub, Credentials).
    *   Configure Vercel KV adapter for session storage.
    *   Implement API route (`/api/auth/[...nextauth]/route.ts`).
    *   Create UI components (`AuthButtons`, `SignInButton`, `SignOutButton`).
    *   Implement route protection using `middleware.ts`.
4.  **Data Types:** Define core interfaces in `src/types/index.ts` (referencing Spec Section 7, adjusting as needed).
5.  **State Management (Zustand):**
    *   Create core stores (`userProfileStore`, `metricsStore`, `activityStore`, `plannerStore`, `nutritionStore`, `offlineQueueStore`).
    *   Implement IndexedDB persistence using a helper (`src/lib/idbStorage.ts`) and Zustand's `persist` middleware.
    *   **Crucially:** Implement hydration tracking (`_hasHydrated` flag set via `onRehydrateStorage`) for all persisted stores to prevent hydration errors.
6.  **Onboarding Flow (`/onboard`):** Create multi-step form using RHF/Zod, saving data to `userProfileStore`. (Spec 4.1)
7.  **Goal Engine & Settings:**
    *   Implement calculation utils (`src/lib/calculationUtils.ts`). (Spec 8.1-8.3)
    *   Create Goal Settings form (`GoalSettingsForm`) in `/settings`. (Spec 4.2)
    *   Implement Profile Settings form (`UserProfileForm`) in `/settings`.
8.  **Planner (`/planner`):**
    *   Implement weekly calendar view.
    *   Implement adaptive plan generation logic (`generateWeeklyPlan`). (Spec 8.4)
    *   Implement workout logging (`WorkoutDetailsModal`).
9.  **Nutrition (`/nutrition`):** Implement meal logging form/display. (Spec 4.5)
10. **Dashboard (`/`):** Implement basic dashboard components (`MetricCards`, `ProgressChart`, `TodayWorkout`). (Spec 4.6, 10)
11. **Fitbit Integration:** (Spec 4.12, 8A)
    *   Implement OAuth flow components/buttons.
    *   Create callback API route (`/api/fitbit/callback`) using server actions/direct fetch.
    *   Implement server actions (`src/lib/fitbitActions.ts`) for sync, refresh, revoke, storing tokens in Vercel KV.
    *   Integrate Fitbit data into stores (`activityStore`, `userProfileStore`) and dashboard.
    *   Implement auto-adjustment of calorie/protein targets based on synced data.
12. **Notifications:** (Spec 4.8, 11)
    *   Implement frontend subscription logic (`NotificationSettings` component in `/settings`).
    *   Implement Service Worker (`src/worker/index.ts`) for push events.
    *   Implement backend API routes (`/subscribe`, `/unsubscribe`) storing subscriptions in Vercel KV.
    *   Implement server action (`src/lib/notificationActions.ts`) for sending pushes (**initially with mock data**).
13. **Knowledge Base (`/knowledge`):** Implement markdown rendering page. (Spec 4.7)
14. **Data Export:** Implement JSON export button/logic in Settings. (Spec 4.9)
15. **Offline Queue:** Implement basic `offlineQueueStore` and manager (`src/lib/offlineSyncManager.ts`) using **placeholder server actions** initially. (Spec 15)
16. **Testing Setup:** Configure Jest/RTL and Cypress.

## 4. Key Implementation Notes & Learnings (From Previous Attempt)

*   **App Router:** Use Next.js App Router conventions.
*   **Zustand Hydration:** Persisted Zustand stores *must* implement hydration tracking (`_hasHydrated` flag set via `onRehydrateStorage`) and components consuming this state should ideally wait for hydration to complete (e.g., using conditional rendering `hasHydrated ? <Component /> : <Loading />`) to avoid React hydration errors, especially when combined with client-side hooks like `useSearchParams`.
*   **`useSearchParams`:** Any component using `useSearchParams` (or other hooks triggering client-side rendering bailout) *must* be wrapped in a `<Suspense>` boundary in its parent.
*   **NextAuth v5:** Follow Auth.js v5 patterns. Use Vercel KV adapter for session persistence.
*   **Environment Variables:** Ensure *all* required environment variables (Auth secrets, KV tokens, Provider IDs/Secrets, Fitbit IDs/Secrets, VAPID keys) are correctly set up in `.env.local` for local development and provided to the testing/deployment environments.
*   **E2E Testing (`test:e2e` script):**
    *   Use `start-server-and-test` to build and serve the production version before running Cypress tests (`pnpm build && pnpm serve`).
    *   Use `cross-env` to pass necessary environment variables (`AUTH_SECRET`, `AUTH_TRUST_HOST`, VAPID keys, etc.) to the test execution context.
    *   Be aware of potential complex interactions between the production build, Cypress, and specific pages (like `/settings` previously) that might cause rendering/hydration issues requiring deeper investigation (e.g., using `cypress open` with DevTools).

## 5. Getting Started (New Project Setup)

1.  **Create Next.js App:**
    ```bash
    # Make sure you are OUTSIDE the old project directory
    npx create-next-app@latest plank-you-very-much --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    cd plank-you-very-much
    ```
2.  **Install Core Dependencies:**
    ```bash
    pnpm add zustand idb react-hook-form @hookform/resolvers zod recharts dayjs @auth/upstash-redis-adapter @vercel/kv next-auth@beta sonner lucide-react uuid gray-matter react-markdown remark-gfm web-push
    ```
    ```bash
    pnpm add -D jest @types/jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest cypress cross-env start-server-and-test
    ```
3.  **Initialize Shadcn/UI:**
    ```bash
    pnpm dlx shadcn-ui@latest init
    ```
    (Follow prompts, choose desired style/colors, use `src/` directory, `components/ui` alias).
4.  **Add Shadcn/UI Components (Example):**
    ```bash
    pnpm dlx shadcn-ui@latest add button input label card toast dialog select checkbox radio-group progress avatar switch
    ```
    (Add others as needed)
5.  **Configure Jest:**
    *   Create `jest.config.mjs` (referencing Next.js docs for App Router setup).
    *   Create `jest.setup.js` (e.g., to import `@testing-library/jest-dom`).
    *   Update `tsconfig.json` `types` array to include `jest` and `node`.
    *   Update `package.json` `scripts` to include `"test": "jest --watch"` or similar.
6.  **Configure Cypress:**
    *   (Cypress might prompt setup on first run or use `npx cypress open`)
    *   Configure `cypress.config.ts` (e.g., set `baseUrl`).
7.  **Environment Variables:**
    Manually create a `.env.local` file in the root directory. **Do not commit this file.** Populate it with *all* necessary secrets (referencing list below and potentially the Spec):
    ```dotenv
    # Auth Core (Required)
    AUTH_SECRET="GENERATE_A_NEW_SECRET"
    AUTH_TRUST_HOST="true"

    # Vercel KV (Required for Auth & Notifications)
    KV_URL="YOUR_KV_URL_HERE"
    KV_REST_API_URL="YOUR_KV_REST_API_URL_HERE"
    KV_REST_API_TOKEN="YOUR_KV_REST_API_TOKEN_HERE"
    KV_REST_API_READ_ONLY_TOKEN="YOUR_KV_REST_API_READ_ONLY_TOKEN_HERE"

    # Auth Providers (Required for chosen providers)
    AUTH_GOOGLE_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
    AUTH_GOOGLE_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
    AUTH_GITHUB_ID="YOUR_GITHUB_CLIENT_ID_HERE"
    AUTH_GITHUB_SECRET="YOUR_GITHUB_CLIENT_SECRET_HERE"

    # Fitbit Integration (Required for Fitbit features)
    NEXT_PUBLIC_FITBIT_CLIENT_ID="YOUR_FITBIT_CLIENT_ID_HERE"
    FITBIT_CLIENT_SECRET="YOUR_FITBIT_CLIENT_SECRET_HERE"
    NEXT_PUBLIC_FITBIT_REDIRECT_URI="http://localhost:3000/api/fitbit/callback" # Adjust if needed

    # VAPID keys for Push Notifications (Required for Notifications)
    NEXT_PUBLIC_VAPID_PUBLIC_KEY="YOUR_VAPID_PUBLIC_KEY_HERE"
    VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY_HERE"

    # --- Client-side only ---
    NEXT_PUBLIC_APP_NAME="Plank You Very Much"
    ```
8.  **Update `package.json` Scripts:** Add scripts for testing (Jest, Cypress E2E), potentially linting/formatting.
    ```json
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "test": "jest",
      "test:watch": "jest --watch",
      "cy:open": "cypress open",
      "cy:run": "cypress run",
      "test:e2e": "cross-env NEXT_PUBLIC_VAPID_PUBLIC_KEY=dummy_public_key VAPID_PRIVATE_KEY=dummy_private_key AUTH_TRUST_HOST=true AUTH_SECRET=YOUR_TEST_AUTH_SECRET start-server-and-test start http://localhost:3000 cy:run"
    },
    ```
    *(Note: Replace `YOUR_TEST_AUTH_SECRET` in `test:e2e`, potentially use different dummy keys/secrets for testing vs. dev)*.

9.  **Run the development server:**
    ```bash
    pnpm dev
    ```

## 6. Testing Strategy (Target)

*   **Unit Tests (Jest/RTL):** Focus on utility functions, Zustand store logic (actions, selectors, persistence/hydration), server actions, API route handlers (with mocks), and complex hook logic.
*   **Component Tests (Jest/RTL):** Test individual UI components in isolation, covering different states (loading, error, empty, populated), props variations, and basic user interactions (button clicks, form inputs) using mocks for external dependencies (stores, APIs).
*   **End-to-End Tests (Cypress):** Test critical user flows simulating real interactions in a browser environment (Login, Onboarding, Planner Interaction, Settings Changes, Fitbit Connect/Sync). Use `start-server-and-test` with a production build (`test:e2e` script) for realistic testing.

## 7. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 