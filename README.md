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

## 3. Current Status (as of 2025-04-27 - Iteration Z)

### Implemented Features

*   **Project Setup:** Initialized using Next.js App Router (`create-next-app` with `--src-dir`, `--ts`, `--tailwind`, `--eslint`). Core dependencies installed.
*   **Directory Structure:** Aligned with spec (Section 6), adapted for Next.js App Router conventions.
*   **Data Types:** Core TypeScript interfaces defined (`src/types/index.ts`), including `BodyMetrics`, `FitbitDaily`, `Meal`, `Workout`, etc.
*   **State Management (Zustand + IndexedDB):**
    *   Stores created for `UserProfile`, `Planner`, `Metrics`, `Nutrition`, `MediaAssets`, `Activity`, and `OfflineQueue`.
    *   IndexedDB persistence configured using custom `createIdbStorage` utility (`src/lib/idbStorage.ts`) for relevant stores.
    *   Offline action queue (`offlineQueueStore.ts`) implemented to store actions when offline.
    *   Stores (`nutritionStore.ts`, `plannerStore.ts`) updated with `_applyQueuedUpdate` methods to process actions from the queue.
*   **Routing & Layout:** Basic layout (`layout.tsx`), shared components (`<Header />`, `<Sidebar />`, `<Modal />`), pages created for main routes using App Router.
*   **UI Components:** Reusable components created (`<Button />`, `<Input />`, `<Label />`, `<Select />`, etc.).
*   **Onboarding:** Multi-step form implemented, saves to store.
*   **Dashboard:** Displays dynamic metrics from stores (BMR, TDEE, Targets).
*   **Planner:** Interactive weekly calendar view (`dnd-kit`), add/edit workout logic (modal removed, logic might be inline or in a separate component). **Enhanced weekly plan generation** considering back issues/distribution.
*   **Core Algorithms:** BMR, TDEE, Calorie/Protein targets implemented. **TDEE uses dynamic activity level**.
*   **Nutrition:**
    *   Meal logging form (`MealLogForm.tsx`) with validation (React Hook Form + Zod).
    *   Macro progress bars vs calculated targets.
    *   Daily meal list (`MealList.tsx`) with delete functionality.
    *   **Offline Support:** `addMeal` and `removeMeal` actions queue correctly when offline.
*   **Settings:** User profile editing, basic notification UI, **data export (workouts, nutrition to JSON)**.
*   **PWA & Service Worker:**
    *   PWA configured using `@serwist/next`.
    *   Custom service worker (`src/app/sw.js` - **JavaScript**) implemented.
    *   Includes basic event listeners (`install`, `activate`, `push`, `notificationclick`).
    *   Handles basic push notification display and click interaction.
*   **Offline Queue Processing:**
    *   `OfflineQueueProcessor.tsx` component created to process queued actions when online.
    *   Integrates with `nutritionStore` and `plannerStore` via `_applyQueuedUpdate`.
    *   Handles basic success/failure feedback using toasts (`sonner`).
*   **Fitbit Integration (Partial - Needs Secure Storage):**
    *   OAuth flow implemented (Connect button, callback).
    *   Server Actions for token handling (`fitbitActions.ts`) **using placeholder storage**.
    *   Settings UI for connect, manual sync (profile & basic activity), disconnect.
    *   Synced activity data saved to `activityStore`.
*   **Knowledge Base:** Basic page, displays hardcoded `KnowledgeCard`s.
*   **Media Library (Partial):**
    *   `useMediaStore` created.
    *   Media selection integrated into `MealLogForm`.
    *   `MealMediaDisplay` component used in `MealList`.
    *   Basic `MealGallery` component (grid display).
*   **NFC Triggers (Initial - PWA/Android):**
    *   `useNfcReader` hook created (scan, read, errors).
    *   Planner page button to initiate scan.
    *   Parses `plankyou://workout/` URIs.
*   **Guided Tutorials (Initial):** `TutorialModal` component (renders markdown), NFC Tools data, completion tracking, trigger in Settings.
*   **Testing:** Basic Jest + RTL setup configured.
*   **Toast Notifications:** Implemented (`sonner`), integrated into layout, settings, offline processor, etc.

### Missing Features / Next Steps (Prioritized)

**High Priority (v1.0 / v1.1 Core Functionality):**

*   **Offline Sync (Finalize):**
    *   **Server Sync Logic:** Implement actual API calls within `OfflineQueueProcessor.tsx` to sync queued actions (add/remove meals, workouts etc.) to a backend. (Spec Section 15)
    *   **Robust Error Handling:** Improve error handling in the processor (e.g., retries, handling specific API errors, notifying user).
    *   **Action Registration:** Implement a robust way to register store `_applyQueuedUpdate` methods with the `OfflineQueueProcessor` (currently manual imports, needs dynamic registration or dependency injection).
    *   **Optimistic Updates:** Implement optimistic UI updates for queued actions (e.g., show added meal immediately, revert if sync fails).
*   **Fitbit Integration (Finalize - v1.1 Target):**
    *   **Secure Token Storage:** Implement secure, user-associated server-side storage for Fitbit tokens (replace placeholder). (Spec Section 8A)
    *   **Complete Data Sync:** Fetch and store all required Fitbit data (sleep, HR). (Spec Section 7, 8A)
    *   **Token Revocation:** Implement secure token removal.
*   **Notifications (Full Implementation):**
    *   **Backend Push Service:** Implement secure backend for subscriptions and sending messages (VAPID). (Spec Section 11, 16)
    *   **Frontend Subscription:** Implement UI/logic for permissions and sending subscription to backend.
    *   **Notification Triggers:** Implement logic for specific notifications (workout reminders, inactivity cues). (Spec Section 11)
*   **NFC Triggers (Finalize):**
    *   **Implement Scan Action:** Define and implement the frontend action upon successful scan (e.g., open workout view/logger). (Spec Section 8B)
    *   **iOS Fallback (QR Code):** Implement QR code generation and scanner. (Spec Section 8E)
*   **Planner Enhancements:**
    *   **Workout Logging:** Implement detailed workout logging (sets, reps, duration, perceived exertion) potentially replacing or enhancing the deleted `WorkoutModal`.
    *   **Dynamic Adaptation:** Implement logic to auto-adapt plan based on feedback/flags. (Spec Section 4.3, 8.4)
*   **Goal Engine UI:**
    *   Implement UI for setting fat-loss targets and timelines. (Spec Section 4.2)
*   **PWA Enhancements:**
    *   **Install Prompt:** Implement logic to prompt PWA installation. (Spec Section 15)

**Medium Priority (Core Features & Polish):**

*   **Wyze Scale Integration (via Health Connect / HealthKit):**
    *   Implement native modules/plugins or bridge for health data access. (Spec Section 8F)
    *   Implement permissions and data reading.
    *   Add CSV import fallback. (Spec Section 8F.3)
*   **Media Library Integration (Finalize):**
    *   **Load Actual Media:** Add and manage actual assets. (Spec Section 6)
    *   **Loading Strategy:** Replace hardcoded data with dynamic loading.
    *   **Enhance `MealGallery`:** Implement swipeable carousel. (Spec Section 4.11)
    *   **Implement `ExerciseVideo`:** Integrate video component for exercises. (Spec Section 4.10)
*   **Knowledge Base (Full):**
    *   Implement dynamic data loading. (Spec Section 4.7)
    *   Add filtering/search.
*   **Settings Implementation (Full):**
    *   Implement granular Notification Preferences. (Spec Section 11)
    *   Refine Data Export (ensure comprehensive). (Spec Section 4.9)
*   **Testing:**
    *   Write comprehensive unit, component, and E2E tests. (Spec Section 13)
*   **Styling & UX Refinements:**
    *   Apply consistent styling, improve accessibility (WCAG), add PWA icons, loading/empty states. (Spec Section 12)
*   **CI/CD:**
    *   Finalize GitHub Actions workflow. (Spec Section 14)

**Low Priority (v2.0 / Future):**

*   **AI Plan Regeneration (v2.0):** (Spec Section 17)
*   **Native Wrappers (Optional):** (Spec Section 8E)
*   **Equipment Cues:** (Spec Section 4.4)
*   **Social Features / Other Integrations:** (Spec Section 17)

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