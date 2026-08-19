# AGENTS.md — Gym Tracker

> Comprehensive codebase reference. Read this instead of files to save tokens.

---

## Project Identity

- **Name**: Gym Tracker
- **Type**: Progressive Web App (PWA) — mobile-first workout tracker
- **Architecture**: 100% client-side, no backend, no API calls
- **Storage**: IndexedDB + OPFS (Origin Private File System)
- **Deployment**: Cloudflare Pages via Wrangler
- **Language**: JavaScript (JSX) — no TypeScript
- **Module format**: ESM (`"type": "module"`)

---

## Directory Structure

```
D:\BackUP\Gym Tracker\
├── package.json                    # Root — proxies scripts to frontend
├── wrangler.toml                   # Cloudflare Pages config
├── .gitignore                      # node_modules/, dist/, .env
└── frontend/
    └── gymTracker/                 # The actual app
        ├── package.json            # Dependencies & scripts
        ├── .npmrc                  # legacy-peer-deps=true
        ├── index.html              # SPA shell (loads /src/main.jsx)
        ├── vite.config.js          # @vitejs/plugin-react + @tailwindcss/vite
        ├── vitest.config.js        # Node env, setup: ./src/test/setup.js
        ├── eslint.config.js        # Flat config, React hooks + refresh
        ├── public/
        │   ├── manifest.json       # PWA manifest (standalone, black theme)
        │   ├── sw.js               # Service worker (cache-first, v4)
        │   ├── exercises/          # 65 exercise illustration PNGs
        │   ├── badge/              # rookie.png, begineer.png, learner.png
        │   └── favicon.png, icon-192.png, icon-512.png, logo.png
        └── src/
            ├── main.jsx            # React root, SW registration
            ├── App.jsx             # View router (onboarding vs home)
            ├── index.css           # Tailwind + custom CSS animations
            ├── component/          # 23 JSX components
            ├── services/           # 9 service modules (business logic)
            ├── services/__tests__/ # 5 test files
            └── test/               # 4 test helpers
```

---

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | React | 19.2.5 |
| Build | Vite | 5.4 |
| Styling | Tailwind CSS | v4 (via @tailwindcss/vite) |
| Animation | Framer Motion + GSAP | 13.0 + 3.15 |
| Icons | Lucide React + Remix Icon | 1.16 + 4.9 |
| Backup/ZIP | fflate | 0.8.3 |
| Testing | Vitest | 4.1.10 |
| IDB mock | fake-indexeddb | 6.2.5 |
| Linting | ESLint | 10.2.1 |
| Deployment | Cloudflare Wrangler | - |

---

## npm Scripts

**Root** (run from `D:\BackUP\Gym Tracker\`):
```
npm run dev      → vite (in frontend/gymTracker/)
npm run build    → npm install + vite build
npm run test     → vitest run
npm run lint     → eslint .
npm run preview  → vite preview
```

**Frontend** (run from `frontend/gymTracker/`):
```
npm run dev      → vite
npm run build    → vite build
npm run test     → vitest run
npm run lint     → eslint .
npm run preview  → vite preview
```

Always run commands from the **root** `D:\BackUP\Gym Tracker\` using the root scripts.

---

## Entry Flow

```
main.jsx
  → <App />
    → checks IndexedDB for user profile
    → 'checking' state → loading spinner
    → 'onboarding' → <Onboarding /> (7-step wizard)
    → 'home' → <HomeScreen /> (main dashboard)
```

- `main.jsx`: Renders `<App />` in `<StrictMode>`. Registers SW in production, unregisters in dev. Renders `<Agentation />` dev overlay in dev mode.
- `App.jsx`: No router. State-driven: checks `storage.getUserProfile()`, sets view to `'onboarding'` or `'home'`. Applies responsive CSS transform scale (design width 375px, clamped 0.5x–1.4x).

---

## Component Map (25 components)

### Top-Level Views
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| App | App.jsx | ~80 | Entry router, responsive scaling |
| Onboarding | Onboarding.jsx | ~400 | 7-step wizard: name, age, weight, height, experience, photo, schedule |
| HomeScreen | HomeScreen.jsx | ~958 | Main hub — greeting, rank, streak, PRs, today's workout, modals |

### Session & Workout
| Component | File | Purpose |
|-----------|------|---------|
| SessionTracker | SessionTracker.jsx | Active workout: exercises, sets/reps/weight, media, notes, rest timer, save |
| NumberOfSets | NumberOfSets.jsx | Compact rep counter stepper input |
| RestTimer | RestTimer.jsx | Countdown timer with presets (1/2/3 min), custom audio alarm, swipe stepper |
| ExerciseMedia | ExerciseMedia.jsx | Per-exercise photo/video viewer in active session |

### Exercise Management
| Component | File | Purpose |
|-----------|------|---------|
| ExercisesList | ExercisesList.jsx | Exercise picker: search, 9 category tabs, built-in + custom exercises, CRUD |
| ExerciseDetail | ExerciseDetail.jsx | Exercise preview card before adding to session |
| MyExercises | MyExercises.jsx | Custom exercise manager |
| ThemedSelect | ThemedSelect.jsx | Custom styled dropdown/select |

### Gamification
| Component | File | Purpose |
|-----------|------|---------|
| RankBadge | RankBadge.jsx | Compact rank display on home screen |
| RankIcon | RankIcon.jsx | SVG/icon renderer for rank badges |
| RankScreen | RankScreen.jsx | Full-screen rank view with 12 swipeable rank cards, challenge checklists |
| LevelUpOverlay | LevelUpOverlay.jsx | Celebration overlay: confetti, XP breakdown, bonus chips |

### History & Media
| Component | File | Purpose |
|-----------|------|---------|
| WorkoutHistory | WorkoutHistory.jsx | Full workout history list with delete |
| SavedSession | SavedSession.jsx | Read-only saved session card + media viewer |
| MediaGallery | MediaGallery.jsx | Paginated gym photos/videos gallery, infinite scroll, full-screen viewer |

### Navigation & UI
| Component | File | Purpose |
|-----------|------|---------|
| StaggeredMenu | StaggeredMenu.jsx | GSAP-animated hamburger slide-in menu |
| Streak | Streak.jsx | Weekly streak with flame/snowflake icons + monthly calendar |
| PrsBadge | PrsBadge.jsx | Personal records badge on home screen |
| GreetingUser | GreetingUser.jsx | Time-of-day greeting |
| Settings | Settings.jsx | Name, schedule, alarm sound, backup/restore, storage usage |
| ScheduleEditor | ScheduleEditor.jsx | Weekly schedule editor (Mon–Sun) |
| FloatingDumbbell | FloatingDumbbell.jsx | Decorative animated dumbbell (onboarding) |

---

## Service Layer (9 modules)

### Dependency Hierarchy
```
idb.js           (lowest — no internal deps)
storage.js       → idb.js
media.js         → idb.js
progression.js   → idb.js, storage.js
backup.js        → idb.js, media.js, errors.js
audio.js         (standalone)
photo.js         (standalone)
errors.js        (standalone)
exercises.js     (standalone — pure data)
```

### idb.js — IndexedDB Wrapper
- Database: `gym-tracker`, version 2
- Stores: `sessions` (key: id), `exercises` (key: id), `media` (key: id), `meta` (key: key)
- `media` store has index `by-created` on `[createdAt, id]` for cursor pagination
- API: `dbGetAll()`, `dbGet()`, `dbPut()`, `dbDelete()`, `dbBulkPut()`, `dbClear()`, `dbClose()`, `dbGetPage()`
- Migration: v1→v2 adds `by-created` index on media store

### storage.js — High-Level Data Access
- **Sessions**: `getSessions()`, `createSession()`, `renameSession()`, `deleteSession()`, `removeExerciseMedia()`
- **Exercises**: `getCustomExercises()`, `createExercise()`, `updateExercise()`, `deleteExercise()`
- **Meta**: `getName()`, `setName()`, `getUserProfile()`, `saveUserProfile()`, `getSchedule()`, `saveSchedule()`, `getPrs()`, `savePrs()`, `getRestSound()`, `saveRestSound()`
- **Stats**: `toDayKey()`, `computeMonthlyCount()`, `computeStreak()`, `getDayKey()`, `getTodaysExercises()`

### exercises.js — Built-In Exercise Database
- 9 categories: Chest, Back, Biceps, Triceps, Arms, Shoulders, Legs, Core, Cardio
- 60 exercises, each with: `name`, `category`, `targetMuscle`, `imagePath` (→ `/exercises/*.png`)
- Pure data module, no logic

### progression.js — Gamification Engine (575 lines)
- **12 Ranks**: Rookie → Beginner → Learner → Intermediate → Skilled → Strong → Pro → Elite → Master → Grandmaster → Champion → Legend
- **XP System**: Base 20/session + bonus for PRs (+10), extra reps (+5), timer records (+10). Threshold: `50 * level * (level - 1)`
- **Challenge Gates**: 5 muscle groups (Chest, Back, Arms, Legs, Cardio), each with alternative exercises and ladder thresholds
- **Exercise Ranks**: Iron (0 sets) → Bronze (10) → Silver (25) → Gold (50) → Platinum (100) → Diamond (200)
- **Streak Freeze**: 2 freezes/week (Monday-anchored), Sundays auto-exempt, consumed on app load
- Key functions: `sessionXp()`, `analyzeSession()`, `totalXp()`, `mergePrs()`, `playerRank()`, `exerciseRank()`, `computeProgress()`, `refreshProgress()`, `consumeFreezes()`

### media.js — OPFS Media Management
- Files stored in OPFS under `media/` directory
- API: `writeMediaFile()`, `readMediaFile()`, `deleteMedia()`, `addMedia()`, `makeThumbnail()`, `cleanupOrphans()`, `getMediaQuota()`
- Atomic writes: temp file → move/copy
- Thumbnails: Canvas-based, 600px max, JPEG 0.7 quality

### backup.js — ZIP Backup/Restore
- Export: ZIP with `backup.json` manifest + `media/` files, using fflate streaming
- Import: ZIP or legacy v1 JSON (base64 media), with snapshot rollback on failure
- Uses File System Access API when available, falls back to Blob download
- Progress callbacks for UI

### errors.js — Error Classification
- `classifyError(err)` → user-friendly messages for: quota, permission, not-found, database, invalid-backup, cancelled, unknown

### audio.js — Web Audio API Beep
- Lazy AudioContext init, 880Hz sine wave beep with envelope

### photo.js — Image Resizing
- `imageFileToDataUrl(file, maxSize)` → downscaled JPEG data URL for profile photos

---

## Data Models

### Session
```js
{
  id: string,              // crypto.randomUUID()
  name: string,            // e.g. "Chest Day"
  date: string,            // locale date string
  exercises: [{
    name: string,
    mode: 'weight' | 'timer',
    sets: [{ reps: string, weight: string }],
    notes: string,
    media: [{ id, type, fileName, ... }]
  }],
  createdAt: string,       // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

### Custom Exercise
```js
{
  id: string,
  name: string,
  category: string,        // 'Chest' | 'Back' | ... | 'Cardio'
  mode: 'weight' | 'timer',
  muscle: string,          // optional target muscle
  createdAt: string,
  updatedAt: string
}
```

### Media Record
```js
{
  id: string,
  fileName: string,
  type: 'image' | 'video',
  mime: string,
  size: number,
  thumb: string,           // base64 data URL (JPEG thumbnail)
  createdAt: string
}
```

### Meta (key-value)
| Key | Value |
|-----|-------|
| `name` | string (username) |
| `profile` | `{ age, weight, height, joinedAt, photoData }` |
| `schedule` | `{ monday: [{ name, mode }], ... sunday: [] }` |
| `prs` | `[{ name, weight, reps }]` |
| `restSound` | `{ name: string, blob: Blob } \| null` |
| `startRank` | number (1–12) |
| `progression` | `{ lastLevel: number }` |
| `challengeChecks` | `{ "level:groupKey": boolean }` |
| `freezes` | `{ weekKey: string, frozenDays: string[] }` |

### localStorage
- Key: `gym-tracker-session-v1` — auto-saved in-progress workout for session persistence across reloads

---

## Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **Design viewport**: 375px wide (iPhone standard)
- **Responsive scaling**: CSS transform scale computed in `App.jsx`, clamped 0.5x–1.4x
- **Color scheme**: Dark (#050505/#111111 bg), orange accent (#f97316)
- **Fonts**: Inter (body), Bebas Neue (headings), Edu NSW ACT Cursive (display name)
- **Custom CSS animations** (in `index.css`): fadeIn, popIn, slideUp, fadeOut, blink
- **Safe area**: `env(safe-area-inset-*)` for iOS notch/home-bar

---

## Testing

### Run
```
npm test          # from root → vitest run
```

### Test Files (5, in `src/services/__tests__/`)
| File | Lines | Tests |
|------|-------|-------|
| idb.test.js | 58 | IDB CRUD, migration, pagination |
| storage.test.js | 181 | Session/exercise/profile/schedule CRUD, stats |
| progression.test.js | 477 | XP, ranks, challenges, streaks, freezes, level-up |
| media.test.js | 83 | OPFS read/write, thumbnails, quotas, orphans |
| backup.test.js | 144 | ZIP export/import, legacy v1, validation, rollback |

### Test Helpers (in `src/test/`)
| File | Purpose |
|------|---------|
| setup.js | Imports `fake-indexeddb/auto` for IDB polyfill |
| resetDb.js | Closes and deletes `gym-tracker` DB between tests |
| fakeOpfs.js | In-memory OPFS mock (file handles, writable streams) |
| dom.js | Stubs: Image, canvas, video, navigator/storage, download capture |

### Patterns
- Node environment (not jsdom)
- `beforeEach(resetDb)` in every test file
- `vi.stubGlobal()` for browser APIs (OPFS, canvas, video)
- No component/UI tests exist

---

## Linting

```
npm run lint     # from root → eslint .
```

- ESLint v10 flat config
- Plugins: `react-hooks`, `react-refresh`
- Ignores: `dist/`
- No Prettier, no Stylelint

---

## Deployment

- **Cloudflare Pages** via `wrangler.toml`
- Project: `gym-tracker`
- Output dir: `frontend/gymTracker/dist`
- Deploy manually or via Cloudflare dashboard
- No CI/CD pipelines configured

---

## Service Worker (sw.js)

- Cache name: `gym-tracker-v4`
- Network-first for navigation (ensures updates propagate)
- Cache-first for assets (same-origin + Google Fonts)
- Skipped on localhost
- Precaches: `/`, `/index.html`, `/manifest.json`, icons, favicon

---

## PWA Configuration

- Manifest: standalone display, black theme/background
- Icons: 192px + 512px
- Apple mobile web app capable
- Viewport fit=cover for iOS safe areas

---

## Key Patterns & Conventions

1. **No TypeScript** — all JS/JSX
2. **No router** — state-driven view switching via useState in App.jsx
3. **No state management library** — useState prop-drilling only
4. **Offline-first** — IndexedDB + OPFS, zero server calls
5. **Functional components only** — hooks-based, no class components
6. **Naming**: camelCase functions/variables, PascalCase components, no file prefixes
7. **Defensive async** — `.catch(() => {})` for non-critical ops, `cancelled` flags for stale effects
8. **Atomic media writes** — temp file + move pattern prevents corruption
9. **Error classification** — `errors.js` normalizes browser errors to user-friendly messages
10. **Progressive enhancement** — File System Access API when available, Blob fallback
11. **No env files committed** — `.gitignore` excludes `.env`
12. **HomeScreen is the god component** — ~35 useState calls, orchestrates all data flow
13. **Two animation libraries** — Framer Motion (page transitions, gestures) + GSAP (StaggeredMenu timeline)
14. **No code splitting** — single bundle, no lazy loading
15. **Commit style**: short, descriptive, single-purpose messages

---

## Git History Context

Recent work (newest first):
1. Rank-up system: XP engine, challenges, experience-based start rank
2. My Exercises manager, custom dropdowns, redesigned exercise picker
3. Safe-area inset for mobile browser chrome
4. Card layout adjustments (halos removed, height capping)
5. Cloudflare Pages build fix (root package.json + wrangler.toml)
6. **Major pivot**: Removed backend/auth, migrated to local-first IndexedDB

---

## Common Tasks

### Add a new component
- Create in `src/component/`
- Follow existing patterns: functional component, hooks, props
- Import from services for data access
- No TypeScript types needed

### Add a new service function
- Add to appropriate service file (`storage.js`, `progression.js`, etc.)
- For DB operations, use `idb.js` primitives
- For meta values, use `dbPut('meta', { key, value })` pattern

### Add a new exercise
- Add to the array in `src/services/exercises.js`
- Add corresponding image to `public/exercises/`

### Add a new test
- Create in `src/services/__tests__/`
- Use `describe`/`it` blocks
- Call `resetDb` in `beforeEach`
- Use `vi.stubGlobal()` for browser APIs
- Run `npm test` to verify

### Modify the DB schema
- Edit `idb.js`: bump version, add migration step
- Never delete existing stores/indexes — only add
- Current version: 2

---

## Troubleshooting

- **Peer dep conflicts**: `.npmrc` has `legacy-peer-deps=true`
- **Tests fail with IDB errors**: Ensure `fake-indexeddb/auto` is imported in setup
- **OPFS errors in tests**: Call `installOPFS()` from `test/dom.js`
- **Service worker won't update**: Clear cache in DevTools, or bump cache name in `sw.js`
- **Build fails**: Run `npm install` from root first (root build script does this)
