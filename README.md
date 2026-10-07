# ResumeRound Frontend

Next.js (App Router) frontend for the AI resume-based interview simulator: sign-up, onboarding,
resume upload, profile review, the interview room (voice over Janus/WebRTC, or text) and reports.

Plain JavaScript (no TypeScript), Tailwind CSS v4 with our own components, TanStack Query for
server state, Zustand for the interview room only, React Hook Form + zod for forms.

## Getting started

Requires Node 22.12+.

```bash
npm install
cp .env.example .env.local   # then edit if your API is not on localhost:4000
npm run dev                  # http://localhost:3000
```

The backend must be running (`npm run dev:api` and `npm run dev:worker` in the backend repo) and
must allow `http://localhost:3000` in `CORS_ORIGINS`.

| Variable                       | Purpose                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`          | Express API base URL including `/api/v1`. Validated with zod at build. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Identity Services client id. Empty hides the Google button.     |

## Scripts

| Script                        | What it does                                                   |
| ----------------------------- | -------------------------------------------------------------- |
| `npm run dev`                 | Dev server (Turbopack)                                         |
| `npm run build` / `npm start` | Production build / serve it                                    |
| `npm run lint`                | ESLint (Next core-web-vitals + React Compiler rules)           |
| `npm run format`              | Prettier (with Tailwind class sorting)                         |
| `npm test`                    | Vitest + Testing Library                                       |
| `npm run budget`              | After a build: gzipped first-load JS per route against budgets |

CI (`.github/workflows/ci.yml`) runs format check, lint, tests, build, bundle budget and a
production dependency audit on every PR and on `main`.

## Project layout

```
app/                 routes only (thin page.jsx / layout.jsx)
  page.jsx           landing (static, no app providers)
  (auth)/            /login, /signup
  (app)/             signed-in pages with the app shell: onboarding, resume, profile,
                     interviews/new, interviews/[id]/report, progress, settings
  (room)/            /interviews/[id]/room, no app chrome
features/            one folder per area; features never import each other
  auth/ onboarding/ resume/ profile/ interview-setup/ report/ progress/ settings/
  interview-room/
    components/      VoiceRoom, PreCheck, LiveCall, Captions, CallControls, TextInterview...
    janus/           session.js, audiobridge.js, datachannel.js (TextRoom), messages.js, sdp.js
    hooks/           useJanusCall, useMicrophone, useMicLevel, useReconnect, useRoomShortcuts...
    store.js         Zustand call state
components/
  ui/                our Tailwind components: Button, Input, Select, Textarea, Field, Dialog
                     (native <dialog>), ConfirmDialog, Tabs, Toast, Progress, Alert, Badge...
  layout/ forms/ brand/
lib/
  api/               client.js (auth header, single-flight refresh, ApiError), endpoints.js,
                     query-keys.js, contract.js (dev-only response checks)
  auth/              token store (memory only), session bootstrap, AuthGuard
  env.js storage.js theme.js logger.js
contracts/           zod schemas mirroring the backend, plus zod-free limits.js and enums.js
scripts/             bundle-budget.js
```

Rules: routes import from `features/`; a feature imports only from `lib/`, `contracts/`,
`components/` and itself (enforced by ESLint). Files are kebab-case, one component per file.

## How the main pieces work

- **Auth.** The access token lives in memory only. On page load `POST /auth/refresh` restores
  the session (the httpOnly cookie is sent automatically). A 401 triggers one refresh and a retry;
  concurrent 401s share a single refresh call because the refresh token rotates on every use.
- **Data.** Every request goes through `lib/api/endpoints.js` and TanStack Query. Resume status
  polls every 2 s (gives up after 90 s with a retry), reports poll every 3 s. Uploads use XHR for
  a progress bar. Writes that create things send an `Idempotency-Key`; it is reused on network
  retries and replaced after a 4xx.
- **Contracts.** Responses are checked against zod schemas in development and tests only; the
  schemas are dynamically imported so production bundles of non-form pages carry no zod.
- **Interview room.** Pre-check (WebRTC support, mic permission, device picker, level meter,
  automatic vs push-to-talk) → `POST /interviews/:id/join` → janus.js (lazy-loaded) joins the
  AudioBridge room with the pre-checked mic track (Opus capped at 24 kbps, FEC on) and a TextRoom
  data channel for captions and turn state. Barge-in comes from a local VAD on the mic. Drops
  rejoin with backoff for 60 s. Shortcuts: Space (hold to talk), M (mute), Esc (end, with confirm).
  Text mode, or "Type instead", uses `POST /interviews/:id/answers`.

## Backend contract: assumptions to confirm

These endpoints exist but return `501` today, so the frontend is built against the documented
shape plus the assumptions below. Today the room shows a friendly "not available yet" message
and offers text mode.

1. **`POST /interviews/:id/join`** returns `{ janusUrl, roomId, token?, pin?, textRoomId?, iceServers }`.
   `pin` is used because the backend's Janus client creates AudioBridge rooms with a PIN.
   `textRoomId` defaults to `roomId`.
2. **Captions and turn state** travel over a **Janus TextRoom** (AudioBridge has no data
   channels). The bot sends JSON as the message text:
   `{type:'caption', speaker:'ai'|'candidate', text, isFinal, id?}`,
   `{type:'turn_state', state:'ai_speaking'|'listening'|'thinking'}`,
   `{type:'interview_event', event:'ended'}`. The browser sends `{type:'barge_in'}` and
   `{type:'ptt', pressed}`.
3. **`POST /interviews/:id/answers`** body is `{ "answerText": "..." }`.
4. **Text mode first question:** the room polls `GET /interviews/:id/turns` until a turn without
   an answer appears. If the backend needs an explicit "start" call for text mode, it has to be
   added on one side or the other.
5. **Turn evidence:** the report transcript shows `turn.evaluation.evidence[]` (strings or
   `{ quote }`) and `turn.evaluation.missedConcepts[]` when present.

## Performance budgets

`npm run budget` (gzipped first-load JS):

| Route                   | Budget | Now    |
| ----------------------- | ------ | ------ |
| `/` (landing)           | 100 KB | 135 KB |
| `/interviews/[id]/room` | 180 KB | 167 KB |

React + the Next.js runtime alone are about 129 KB gzipped (about 110 KB Brotli), so the landing
budget cannot be met with the App Router; app code adds about 6.6 KB. The budget needs a
decision (raise it, measure Brotli, or serve the landing page as plain HTML).

## Hosting

No API routes or server actions, so the app can move to a static host. `NEXT_OUTPUT=export`
switches `next.config.js` to static export; the two `[id]` routes then need an SPA fallback
rewrite on the host (e.g. Cloudflare Pages `_redirects`), since their ids are unknown at build
time. Images are unoptimised by design (pre-sized assets).

## Not done yet

- Playwright E2E (signup → upload → profile → text interview → report) and fake-media WebRTC
  tests against a staging Janus; MSW mocks for page-level tests.
- Sentry and PostHog: `lib/logger.js` `reportError()` is the hook point; nothing is wired.
- Account deletion (no backend endpoint yet; the Settings button is disabled).
- Optional video (VideoRoom publisher at 360p) and Phase 2 (Monaco coding mode, React Flow
  design canvas).
