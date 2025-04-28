# Plank You Very Much – Technical Specification & Implementation Guide

**Version:** 0.9   **Date:** 2025‑04‑27   **Author:** ChatGPT (initial draft for Shay)

---

## 1  Purpose & Vision

Design a React (+ TypeScript) web app that acts as an AI‑assisted personal trainer helping Shay (45 yo) lower body‑fat from 14 %→11 % while preserving back health and enabling climbing & swimming. The app should provide adaptive weekly plans, habit nudges, progress dashboards and integrate seamlessly with Shay’s daily routine and available equipment.

## 2  App Name & Tagline

**Plank You Very Much** – “Climb higher, dive stronger, live leaner.”

*(Alternatives:* **AquaCrux**, **LeanPeak**, **CoreClimber**.)

## 3  Target Users

- **Primary:** Shay (busy scientist, moderate tech savvy, back issues, lactose sensitive).
- **Secondary:** Similar adults 35‑55 seeking fat‑loss + muscle gain with sport‑specific focuses.

## 4  High‑Level Features

1. **On‑boarding assessment** (height, weight‑scale metrics, injury flags).
2. **Goal engine** – set fat‑loss target & timeline; auto‑computes daily kcal/protein.
3. **Dynamic week planner** – blends climbing, swimming, core, recovery; auto‑adapts.
4. **Equipment cues** – standing‑desk prompts, balance‑board meeting timer, stealth core mini‑games.
5. **Nutrition tracker** – simple log, macro progress rings, lactose flag reminders.
6. **Progress dash** – trend charts for weight, BF %, workouts done vs. planned.
7. **Knowledge cards** – short tips on back‑safe form, mobility, meal ideas.
8. **Notifications** – browser/PWA push for workout, hydration, posture.
9. **Data export** – CSV/JSON of logs for physician/coach.
10. **Exercise Media Library** – embedded GIF/short‑video demos for every movement with voice‑over cues.
11. **Meal Gallery** – swipeable images & quick‑prep video snippets showing lactose‑free meal options with macro overlay.
12. **Wearable Sync (Fitbit)** – pulls daily steps, HR, sleep & calorie burn via Fitbit Web API to refine plan and progress.
13. **NFC Activity Triggers** – tap a phone on room‑specific stickers (pull‑up bar, plank zone…) to auto‑log the workout and open guidance screens.
14. **Guided Tutorials** – interactive in‑app walkthroughs for required third‑party tools (e.g., NFC Tools) with screenshots & progress tracker.

## 5  Tech Stack & Tooling

| Layer         | Choice                                          | Rationale                    |   |           |
| ------------- | ----------------------------------------------- | ---------------------------- | - | --------- |
| App           | **React 18 + TypeScript**                       | Robust SPA ecosystem         |   |           |
| Styling       | **Tailwind CSS**                                | Utility‑first, quick theming |   |           |
| Charts        | **Recharts**                                    | Lightweight SVG charts       |   |           |
| State         | **Zustand**                                     | Minimal, scalable store      |   |           |
| Forms         | **React‑Hook‑Form**                             | Type‑safe validation         |   |           |
| Date          | **Day.js**                                      | Small footprint              |   |           |
| Persistence   | **IndexedDB via idb**                           | Offline PWA support          |   |           |
| Notifications | Web Push + service worker                       |                              |   |           |
| Integrations  | **Fitbit Web API (OAuth 2.0)**, **Web NFC API** | Sync activity / sleep data   |   | Reminders |
| Testing       | Jest + React Testing Library; Cypress E2E       | Quality                      |   |           |
| CI/CD         | GitHub Actions → Vercel                         | Auto deploy previews         |   |           |

## 6  Project Structure (proposed)

```
/plankyou
  ├─ public/
  ├─ media/            # exercise & meal images / videos
  ├─ src/
  │   ├─ assets/
  │   ├─ components/
  │   ├─ features/
  │   │   ├─ onboarding/
  │   │   ├─ planner/
  │   │   ├─ nutrition/
  │   │   ├─ progress/
  │   │   ├─ knowledge/
  │   │   └─ media/     # ExerciseVideo, MealGallery components
  │   ├─ hooks/
  │   ├─ lib/
  │   ├─ store/
  │   ├─ pages/
  │   ├─ router/
  │   ├─ serviceWorker.ts
  │   └─ index.tsx
  ├─ tests/
  └─ .github/workflows/
```

## 7  Data Models (TypeScript)

```ts
export interface BodyMetrics {
  date: string;  // ISO
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  visceralRating: number;
}

export interface Workout {
  id: string;
  type: 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST';
  plannedAt: string;
  durationMin: number;
  completed?: boolean;
  mediaIds?: string[]; // attach demo videos
}

export interface Meal {
  id: string;
  timestamp: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  lactoseFree: boolean;
  mediaIds?: string[]; // link to image/video recipe
}

export interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'GIF' | 'VIDEO';
  url: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
}

export interface FitbitDaily {
  date: string; // yyyy‑MM‑dd
  steps: number;
  restingHeartRate?: number;
  caloriesOut: number;
  sleepMinutes?: number;
}
```

## 8  Core Algorithms

1. **BMR (Harris‑Benedict)** → TDEE multiplier.
2. **Calorie deficit** = TDEE – 300.
3. **Protein target** = 1.6 g × LBM.
4. **Weekly planner** algorithm:
   - Required: ≥2 climb, ≥2 swim, ≥2 core, ≤1 rest.
   - Auto‑place sessions respecting user busy blocks (calendar API placeholder).
   - If back‑pain flag high → reduce climb intensity, add mobility session.

## 8A  Fitbit Integration – Technical Flow

To ingest Fitbit data you’ll implement the **OAuth 2.0 authorization code** grant and daily‑sync micro‑service.

1. **Register the app** at [https://dev.fitbit.com](https://dev.fitbit.com) → Manage Apps. • Callback: `${VITE_FITBIT_REDIRECT_URI}` (e.g., `https://plankyou.app/oauth/fitbit/callback`). • Save `client_id`, generate `client_secret` (store only in serverless function).
2. **Frontend flow (**``**)**
   ```ts
   const FITBIT_AUTH_URL =
     `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${env.VITE_FITBIT_CLIENT_ID}&scope=activity%20heartrate%20sleep%20nutrition&redirect_uri=${encodeURIComponent(env.VITE_FITBIT_REDIRECT_URI)}`;
   window.location.href = FITBIT_AUTH_URL;
   ```
3. **Callback handler (edge function)**
   ```ts
   POST https://api.fitbit.com/oauth2/token
   grant_type=authorization_code&code=XXX&client_id=...&redirect_uri=...
   ```
   Store `access_token` (8 h) & `refresh_token` (30 d) encrypted in DB.
4. **Daily job** pulls `/activities/date/{date}.json`, `/sleep/date/{date}.json`, etc., transforms to `FitbitDaily` model, updates store, auto‑tunes calorie targets.
5. **Token refresh** with `refresh_token`; handle 401 by revoking & prompting reconnect.

*Libraries:* `simple-oauth2` (server), `useSWR` (client).

*Security:* keep `client_secret` server‑side; consider PKCE.

---

## 8B  NFC Activity Triggers – Technical Flow

Leverage **Web NFC API** (Chrome for Android ≥ 89). *iOS Safari/WebView currently lacks Web NFC*, so the app falls back to QR codes or (optionally) a thin native wrapper with CoreNFC (see § 8E).

1. **Sticker provisioning** – encode NTAG213/215 stickers with an `NDEF` URI record: `plankyou://workout/<WORKOUT_ID>` (e.g., `plankyou://workout/CORE01`). Apps like “NFC Tools” make this easy.
2. **Permission & scan**
   ```ts
   if ('NDEFReader' in window) {
     const reader = new NDEFReader();
     await reader.scan();
     reader.onreading = event => {
       const url = event.message.records[0].data as string;
       navigate(url.replace('plankyou://', '/'));
     };
   }
   ```
3. **Routing** – deep‑link opens the matching workout modal, autostarts timer and logging.
4. **Background limitations** – Web NFC only works with page in foreground. Suggest keeping spare phone/tablet on‑standby near workout area running app in kiosk mode.
5. **Data model**
   ```ts
   export interface NfcTag {
     id: string;        // sticker UID hash
     workoutId: string; // maps to Workout template
     nickname?: string; // e.g., 'Pull‑up Bar'
   }
   ```
6. **Security** – whitelist URI prefix, ignore malformed records.

---

## 8C  NFC Sticker Integration – Implementation Guide

(This guide will also be available inside the app as a step‑by‑step walkthrough; see § 8D.)

### 1  Choosing & Preparing Tags

| Requirement | Recommended                 | Note                                                            |
| ----------- | --------------------------- | --------------------------------------------------------------- |
| Chip        | NTAG213 or 215              | Widely supported; 144 bytes (213) is enough for URI + metadata. |
| Form factor | 25‑30 mm round PVC or epoxy | Durable; sweat‑resistant.                                       |
| Quantity    | 5‑10 stickers               | One per exercise location plus spares.                          |

### 2  Writing Tags (one‑time setup)

**Option A – Mobile app (easiest)**

1. Install **NFC Tools** (Android) → *Write* tab.
2. Tap **Add a record** → **URL/URI** → enter `plankyou://workout/CORE01` (replace ID).
3. Tap **OK** → **Write / 1 record** → hold phone on sticker until confirmation.
4. Tap **Add another** if more tags, or **Quit**.

*(Screenshots & GIF will be embedded in‑app; see Tutorial Flow below.)*

### 3  Writing Tags via Web NFC …  (unchanged)

### … Testing Checklist (unchanged) ...

1. Android Chrome – Scan success, deep‑link opens correct workout.
2. App background → foreground scans OK.
3. Invalid tag rejected with toast.
4. QR fallback works on iOS.
5. Metrics event appears in `WorkoutStore`.

### 7  Testing Checklist … (unchanged)

---

## 8E  Cross‑Platform Support

| Capability                                    | Android PWA     | iOS PWA (Safari)          | iOS Native Wrapper\*    |
| --------------------------------------------- | --------------- | ------------------------- | ----------------------- |
| Core app (React UI, planner, Fitbit, offline) | ✅               | ✅                         | ➖                       |
| Fitbit OAuth                                  | ✅               | ✅                         | ✅                       |
| Web Push                                      | ✅ (Chrome)      | ⚠️ limited (Banners only) | ✅                       |
| Web NFC                                       | ✅ (Chrome ≥ 89) | ❌                         | ► via **CoreNFC**       |
| NFC Tag Write (NFC Tools)                     | ✅               | ❌                         | ▼ use iOS NFC Tools app |

\*Native wrapper can be built with **Capacitor** or **React Native** to expose CoreNFC and push notifications; shares the same React code‑base.

### Migration Path
1. **v1 (PWA)** – fully functional on Android & iOS, but iOS users scan QR codes instead of NFC.
2. **v1.2** – Add QR‑code auto‑generate page for each workout.
3. **v2 (Optional)** – Publish iOS & Android wrappers enabling NFC triggers & richer push.

### Native Wrapper Option (Capacitor / Cordova)
If you need *tap‑to‑start* on iOS, bundle the same React code in a thin native shell:

| Step | Capacitor (Recommended) | Cordova Alternative |
|---|---|---|
| 1. Init | `pnpm dlx @capacitor/cli init plankyou com.example.plankyou` | `cordova create plankyou com.example.plankyou PlankYou` |
| 2. Add platforms | `npx cap add android` / `ios` | `cordova platform add android` / `ios` |
| 3. Install NFC plugin | `pnpm add @capawesome/capacitor‑nfc` | `cordova plugin add phonegap‑nfc` |
| 4. Sync | `npx cap sync` | automatic on build |
| 5. Use in React | ```ts
import { NFC } from '@capawesome/capacitor-nfc';
const tag = await NFC.read();
``` | Cordova provides `nfc.addNdefListener` global |
| 6. Build & deploy | Xcode / Android Studio → store | same |

**Pros:** Full NFC on iOS, true push notifications, App Store presence. **Cons:** Store review overhead, larger binary, extra CI.

> Decision: **Not required** for Android; **required** only if you *must* have sticker taps on iPhones. Otherwise stay PWA.

---

## 8D  Guided Tutorials – Implementation  Guided Tutorials – Implementation

Provide built‑in, paginated tutorials for any external tool the user must install (currently **NFC Tools**). Tutorials are rendered as a sequence of `` components with image, caption, and progress bar.

### 1  Data Model

```ts
export interface TutorialStep {
  id: string;           // e.g., 'nfc‑1'
  title: string;
  markdown: string;     // supports images ![alt](url)
  mediaId?: string;     // optional GIF/PNG stored in `/media/tutorials/`
  order: number;
}

export interface Tutorial {
  id: 'nfc‑tools';
  name: string;
  steps: TutorialStep[];
  estimatedMinutes: number;
}
```

### 2  UI Components

- `<TutorialModal tutorialId="nfc‑tools" />` – opens from Settings ➜ *Integrations ➜ NFC Stickers ➜ Help*.
- `<StepCard>` – shows image left, text right; Next / Back buttons; progress dots.
- `<CompletionScreen>` – confetti + *“Plank You Very Much!”* button.

### 3  Content Outline (`nfc‑tools`)

| # | Screenshot           | Caption                                                       |
| - | -------------------- | ------------------------------------------------------------- |
| 1 | `nfc‑install.png`    | Download **NFC Tools** from Google Play and open it.          |
| 2 | `nfc‑write‑tab.png`  | Tap **Write** tab at bottom.                                  |
| 3 | `nfc‑add‑record.png` | Tap **Add a record** ➜ **URL/URI**.                           |
| 4 | `nfc‑enter‑uri.png`  | Enter `plankyou://workout/CORE01` and tap **OK**.             |
| 5 | `nfc‑write.png`      | Tap **Write / 1 record** and hold phone on sticker.           |
| 6 | `nfc‑success.png`    | Wait for **Write completed!** message. Repeat for other tags. |

(Tutorial markdown stored in `/src/features/tutorials/nfc-tools.md`.)

### 4  Triggering Tutorial

- After first NFC read failure (unknown tag) ➜ prompt *“Need help writing tags?* Learn how.”\*.
- Accessible anytime via Settings ➜ Help & Tutorials.

### 5  Progress Persistence

Store `completedTutorials: string[]` in IndexedDB; skip completion toast if already done.

---

## 9  Routing Map  Routing Map

```
/           → Dashboard
/onboard    → Multi‑step form
/planner    → Weekly view (drag‑&‑drop)
/nutrition  → Meal log & suggestions
/knowledge  → Tip cards library
/settings   → Profile, reminders, data export
```

## 10  Component Tree (excerpt)

- `<App>`
  - `<Header />`
  - `<Sidebar />`
  - `<Routes>`
    - `<Dashboard />`
      - `<MetricCards />`
      - `<ProgressChart />`
      - `<TodayWorkout />`
    - `<Planner />`
      - `<Calendar />`
      - `<WorkoutModal />`
    - …

## 11  Notifications & Reminders

| Trigger       | Default Time               | Message example                                  |
| ------------- | -------------------------- | ------------------------------------------------ |
| Stand‑up cue  | 45 min inactivity          | “Time to stand and stretch.”                     |
| Balance board | 10 min before long meeting | “Hop on the board for posture points.”           |
| Workout       | 30 min prior               | “Plank You Very Much: Core session starts soon.” |

Service worker schedules push via `NotificationAPI`; fallback to email.

## 12  Accessibility & UX

- WCAG 2.2 AA colors, keyboard‑navigable.
- Font scaling with `rem`.
- Alt text & ARIA labels.

## 13  Testing Strategy

- **Unit:** util functions & stores (Jest).
- **Component:** edge/empty states.
- **E2E:** critical flows – onboard → plan generation → mark workout done.
- **Lighthouse CI** performance & a11y budget.

## 14  CI/CD Pipeline

1. Lint & type‑check.
2. Run Jest + Cypress (headless).
3. Build → Preview → Deploy on `main`.
4. Deploy previews for PRs.

## 15  PWA & Offline

- `workbox` for precaching shell.
- IndexedDB sync queue when offline.
- Install prompt after 3 visits.

## 16  Environment Config

```
VITE_APP_NAME=PlankYouVeryMuch
VITE_PUSH_PUBLIC_KEY=…
VITE_FITBIT_CLIENT_ID=…
VITE_FITBIT_REDIRECT_URI=https://app.example.com/oauth/fitbit/callback
```

## 17  Roadmap v1 → v2

| Version  | Must‑haves                                                          | Nice‑to‑haves                     |   |
| -------- | ------------------------------------------------------------------- | --------------------------------- | - |
| **v1.0** | Onboard, planner, metrics chart, local storage, basic notifications | Dark mode                         |   |
| **v1.1** | **Fitbit integration**, auto‑adjust calorie targets                 | Apple Health bridge               |   |
| **v2.0** | Supabase sync, AI plan re‑generation (OpenAI API), coach chat       | Social challenges, Garmin support |   |

## 18  Setup Scripts

```bash
pnpm create vite@latest plankyou --template react-ts
cd plankyou
pnpm add tailwindcss zustand react-hook-form recharts dayjs idb
pnpm dlx tailwindcss init -p
```

## 19  Contribution Guide (for future agent)

1. Fork → branch naming `feat/<scope>`.
2. Keep PRs <300 LOC, include tests.
3. Run `pnpm format` before commit.
4. Describe decision context in PR body.

## 20  Success Metrics

- Weekly adherence rate ≥ 80 %.
- BF % drops 0.3‑0.5 pp / wk.
- Self‑reported back‑pain severity ↓ 1 point in 8 wks.

---

*End of spec. Iterate via issues on GitHub.*

