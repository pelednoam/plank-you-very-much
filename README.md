# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project follows the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack

*   **Framework:** Next.js 14 (React 18) + TypeScript
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand (with IndexedDB persistence via `idb`)
*   **Forms:** React Hook Form + Zod (for validation)
*   **Charts:** Recharts
*   **Date Handling:** Day.js
*   **Data Persistence:** IndexedDB via `idb` library
*   **Markdown Rendering:** `unified`, `remark-parse`, `remark-html`
*   **Integrations:** Fitbit Web API (OAuth 2.0), Google Health Connect / Apple HealthKit, Web NFC API
*   **Testing:** Jest + React Testing Library (Unit/Component), Cypress (E2E)
*   **PWA:** `@serwist/next` (using a custom service worker)
*   **Other Libraries:** `uuid`, `@dnd-kit/*`, `lucide-react`, `sonner` (for toasts)

## 3. Current Status (as of [Date TBD] - Iteration Y)

### Implemented Features

*   **Project Setup:** Initialized using Next.js App Router (`create-next-app` with `--src-dir`, `--ts`, `--tailwind`, `--eslint`). Core dependencies installed.
*   **Directory Structure:** Aligned with spec (Section 6), adapted for Next.js App Router conventions.
*   **Data Types:** Core TypeScript interfaces defined (`src/types/index.ts`), including updated `BodyMetrics` (with `source` field) and `FitbitDaily`.
*   **State Management:** Zustand stores created and configured with IndexedDB persistence for `UserProfile`, `Planner`, `Metrics`, `Nutrition`, `MediaAssets`, and **`Activity` (for daily summaries)**.
*   **Routing & Layout:** Basic layout (`layout.tsx`), shared components (`<Header />`, `<Sidebar />`, `<Modal />`), pages created for all main routes using App Router.
*   **UI Components:** Basic reusable components created (`<Button />`, `<Input />`, `<Label />`, `<Select />`, `<SelectOption />`).
*   **Onboarding:** Multi-step form implemented, saves to store, handles completion state.
*   **Dashboard:** Displays dynamic metrics from stores, including calculated BMR, TDEE, Calorie Target, and Protein Target.
*   **Planner:** Interactive weekly calendar view with drag-and-drop rescheduling. Add/Edit workout modal implemented. **Enhanced weekly plan generation** logic considering back issues and workout distribution.
*   **Core Algorithms:** BMR, TDEE, Calorie/Protein targets implemented and integrated into UI. **TDEE calculation now uses dynamic activity level** from user profile.
*   **Nutrition:** Meal logging form, macro progress bars (vs calculated targets), and daily meal list with delete functionality.
*   **Settings:** User profile editing form (including activity level), basic notification permission request UI, **data export functionality** (workouts, nutrition to JSON), placeholders for integrations.
*   **PWA & Service Worker:**
    *   PWA configured using `@serwist/next`.
    *   Custom service worker implemented (`src/app/sw.js`) in JavaScript.
    *   Includes basic event listeners for `install`, `activate`, `push`, and `notificationclick`.
    *   `push` handler parses incoming data (JSON or text) and displays a notification using `self.registration.showNotification`.
    *   `notificationclick` handler closes the notification and attempts to focus or open the relevant window based on `data.url`.
*   **Fitbit Integration (Partial - Needs Secure Storage):**
    *   OAuth flow implemented (Connect button, callback handler).
    *   Server Actions created for token handling (`storeFitbitTokens`, `refreshFitbitToken`, `fetchFitbitData`) **using placeholder in-memory storage and user association**.
    *   Settings page UI allows connecting, manually syncing (profile & basic activity), and disconnecting Fitbit.
    *   Synced activity data (steps, calories) saved to `activityStore`.
*   **Knowledge Base:** Basic page created, displays hardcoded `KnowledgeCard` components.
*   **Media Library (Partial):**
    *   `useMediaStore` created with placeholder asset data.
    *   Media selection integrated into `WorkoutModal` and `MealLogForm`.
    *   `ExerciseVideo` component created and used in `WorkoutModal`.
    *   Basic `MealGallery` component created (displays meal images in a grid).
*   **NFC Triggers (Initial - PWA/Android):**
    *   `useNfcReader` hook created to handle Web NFC API interactions (scan, read, errors).
    *   Planner page includes button to initiate NFC scan (on supported browsers).
    *   Scanned `plankyou://workout/` URIs are parsed (action dispatch TBD).
*   **Guided Tutorials (Initial):** `TutorialModal` component created (renders markdown), NFC Tools tutorial data added, tutorial completion tracked in `userProfileStore`, trigger added to Settings page.
*   **Testing:** Basic Jest + React Testing Library setup configured, sample unit test created.
*   **Toast Notifications:** Implemented using `sonner` library; integrated into layout and key components (`Settings`, etc.).

### Missing Features / Next Steps (Prioritized)

*   **Notifications (Full Implementation):**
    *   **Backend Push Service:** Implement a secure backend mechanism for storing push subscriptions (linking them to users) and sending push messages using VAPID keys. (Spec Section 11, 16).
    *   **Specific Triggers:** Implement the logic to trigger specific notifications based on user settings and app events (e.g., workout reminders 30 min prior, inactivity cues, meeting reminders for balance board - Spec Section 11).
*   **Fitbit Integration (Finalize - v1.1 Target):**
    *   **Implement Secure Token Storage:** Replace placeholder server-side storage in `fitbitActions.ts` with a secure method (e.g., database) and implement proper user association (critical for security).
    *   **Refine Data Sync Logic:** Ensure all desired Fitbit data points (sleep, HR, etc.) are fetched and correctly mapped/stored in relevant Zustand stores (e.g., `activityStore`, `metricsStore`).
    *   Implement Fitbit token revocation on disconnect.
*   **Wyze Scale Integration (via Health Connect / HealthKit):**
    *   Implement native modules/plugins (e.g., Capacitor) to access Health Connect (Android) and HealthKit (iOS) - Spec Section 8F.
    *   Request necessary permissions.
    *   Implement logic to read latest weight/body fat data.
    *   Update `BodyMetrics` store with synced data (using `source: 'WYZE'`).
    *   Consider PWA CSV import fallback.
*   **NFC Triggers (Finalize):**
    *   **Implement Action:** Determine and implement the action triggered by scanning a valid `plankyou://workout/` tag (e.g., open workout modal, start timer).
    *   **Manage Tags:** Create `NfcTag` store/management UI if needed to associate specific tags.
    *   **iOS Fallback:** Implement QR code generation/scanning as a fallback for iOS (Spec Section 8E).
*   **Media Library Integration (Finalize):**
    *   **Load Actual Media:** Add actual exercise/meal media assets to `/public/media/`.
    *   **Implement Loading Strategy:** Replace hardcoded assets in `mediaStore` with loading from `/public/media/` (or a manifest file).
    *   **Enhance `MealGallery`:** Implement swipeable carousel UI.
    *   Integrate `ExerciseVideo` more broadly (e.g., in workout lists/details).
*   **Settings Implementation (Full):** Implement UI/logic for granular Notification Preferences (Spec Section 11).
*   **Testing:** Write comprehensive unit, component, and E2E tests for all major features (Spec Section 13).
*   **Styling & UX Refinements:** Apply consistent styling, improve accessibility (WCAG), add PWA icons, implement better loading/empty states.
*   **CI/CD:** Finalize GitHub Actions workflow for automated testing and deployment (Spec Section 14).
*   **Knowledge Base (Full):** Implement dynamic data loading, filtering/search functionality.
*   **AI Plan Regeneration (v2.0):** Integrate with OpenAI API (or similar) for dynamic plan adjustments based on progress/feedback (Spec Section 17).

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
    Create a `.env.local` file in the root directory for **client-side** variables. Add `NEXT_PUBLIC_APP_NAME`. For Fitbit integration, add `NEXT_PUBLIC_FITBIT_CLIENT_ID` and `NEXT_PUBLIC_FITBIT_REDIRECT_URI`. For push notifications, add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (generate using `npx web-push generate-vapid-keys`).
    Create a `.env` file (or use environment variables in your deployment environment) for **server-side** secrets. Add `FITBIT_CLIENT_SECRET`. For push notifications, add `VAPID_PRIVATE_KEY` (from the command above).
    **Never commit `FITBIT_CLIENT_SECRET` or `VAPID_PRIVATE_KEY` to your repository.**
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:**
    ```bash
    pnpm test
    ```
    (Requires Jest setup - completed)
    ```bash
    pnpm exec cypress open
    ```
    (Requires initial Cypress setup)

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 