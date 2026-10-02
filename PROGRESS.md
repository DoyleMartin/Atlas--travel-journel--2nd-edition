# Atlas — Progress Log

Where the build stands and where to pick up. [README.md](README.md) is the full spec (v1.1). This file tracks progress against it.

_Last updated: 2026-10-02 · last commit: `3a88cee` "First stage done (minus username bio/photos/avatar)"_

---

## ▶ Start here next time

**Next step: 1f, a basic profile page.** It's the one Phase 1 checklist item that prompts 1a–1e don't build. Choose a version:

- **1f without photos:** view and edit your own username + bio (`PUT /api/users/me`), plus a simple own-profile view. Works now.
- **1f with an avatar upload:** also `PUT /api/users/me/avatar` through Cloudinary. First, create a free Cloudinary account and fill in the three `CLOUDINARY_*` lines in `server/.env`.

Once 1f is done, Phase 1 is complete. Run the Phase 1 "definition of done" check, then start **2a (Trips CRUD, server)**.

---

## How to run it

Two terminals:

```powershell
cd server; npm run dev     # → "MongoDB connected … / Atlas server listening on port 5000"
cd client; npm run dev     # → http://localhost:5173
```

Health check: http://localhost:5173/api/health → `{"ok":true,"db":"connected"}`

If MongoDB won't connect, your IP has probably changed. In Atlas, go to **Security → Network Access → Add Current IP Address**.

---

## Phase 1 — Foundation (9/10 done)

| Step | Status | What it delivered |
|---|---|---|
| 1a Scaffold | ✅ | Monorepo, TypeScript (strict) client + server, all placeholder files, Vite `/api` proxy, `vercel.json` |
| 1b DB + server entry | ✅ | Mongo connection, helmet/cors/cookies, `/api/health`, JSON 404 + error handler, zod `validate` |
| 1c Auth (server) | ✅ | User model, register/login/refresh/logout/me, `requireAuth` + `optionalAuth`, rate limit |
| 1d Auth (client) | ✅ | Login/register pages, AuthContext, axios refresh-and-retry, ProtectedRoute, Navbar |
| 1e World map | ✅ | Tap to add, status popover, undo toasts, stats card, small-country markers, country data generator |
| 1f Profile page | ⬜ | **Next.** See "Start here" |

---

## Decisions made along the way (beyond README v1.0)

These are already in README v1.1. Listed here so nobody re-decides them:

- **TypeScript everywhere**, strict. Server imports of your own files end in `.js` (NodeNext), e.g. `import app from './app.js'`.
- **CSS stays next to each component.** The server has no CSS.
- **Cookies are first-party** through the Vite/Vercel `/api` proxy. `sameSite: 'lax'`.
- **Access cookie lasts 7 days, but the JWT inside expires in 15 min.** The browser keeps sending the expired token, so the server can answer `TOKEN_EXPIRED` and the client refreshes. Don't "fix" the cookie to 15 min: that logs users out every 15 minutes.
- **Error shape:** `{ message, code?, details?: [{ path, message }] }`, one message per field. Codes: `TOKEN_EXPIRED`, `NOT_AUTHENTICATED`, `INVALID_CREDENTIALS`, `REFRESH_INVALID`, `RATE_LIMITED`, `MAP_PRIVATE`.
- **Countries** are keyed by Natural Earth `ADM0_A3`. The data is **generated**, so don't hand-edit `countries.ts` or `countries.geojson`. Run `cd client && npm run gen:countries`.
- **Map writes** update the screen first (optimistic), are queued per country so they reach the server in order, and the browser warns before leaving while a save is pending.
- **Mongoose 9:** use `returnDocument: 'after'`, not `new: true`.

---

## Accounts & config

| Item | Status |
|---|---|
| MongoDB Atlas (`MONGO_URI`, database `atlas`) | ✅ connected |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ set |
| Cloudinary (`CLOUDINARY_*`) | ⬜ needed for avatar (1f optional) / cover photos (2a) |
| `GEOCODE_USER_AGENT` email | ⬜ replace the placeholder with your real email before 2c (city search) |
| Railway / Vercel deploy | ⬜ not started |

---

## Known gaps / later

- **No automated tests in the repo yet.** Each step was checked with throwaway API scripts and Playwright browser tests (driving the installed Edge) that weren't saved to the project. Worth adding a small test setup before Phase 2 gets big.
- The profile page at `/u/:username` is a placeholder until 5a (1f covers your *own* profile only).
- The Navbar has only a "Map" link. "Trips" gets added in 2b.
- Country shapes aren't reachable by keyboard yet (Leaflet limitation). The city/country search in 2c can double as the accessible way to add places.
