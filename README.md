# Atlas — Travel Journal & Map App

Track every country, city, and moment. Journal your travels, relive them in full, and share them with the world.

> **README v1.1** — revised from v1.0 after a pre-build review. See [Changelog](#changelog-v10--v11) at the bottom for what changed and why.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Philosophy](#core-philosophy)
3. [Tech Stack](#tech-stack)
4. [Feature Set](#feature-set)
5. [Key Design Decisions](#key-design-decisions)
6. [MVP Phases](#mvp-phases)
7. [Folder Structure](#folder-structure)
8. [Data Models](#data-models)
9. [API Route Map](#api-route-map)
10. [Environment Variables](#environment-variables)
11. [Build Strategy & Claude Code Prompts](#build-strategy--claude-code-prompts)
12. [Third-Party Services](#third-party-services)
13. [Deployment Plan](#deployment-plan)
14. [Changelog v1.0 → v1.1](#changelog-v10--v11)

---

## Project Overview

Atlas is a full-stack social travel journaling platform. Every place you've ever been lives on one map, and every trip can have journals, photos, and memories attached to it. Think of Been — but you click directly on a country or city to add it, and every pin can become a full scrapbook.

Users build a lifetime travel map in minutes by tapping countries they've visited, then go deeper by adding trips, journal entries, and photos. Friends follow each other, view each other's maps, and watch back each other's travels as a reel or scrollable timeline.

**The key differentiator:** tapping directly on the map to add a country or city — desktop and mobile. No forms, no search-first flow.

---

## Core Philosophy

- **Friction-free first.** Adding a country takes one tap (with undo). Depth (journals, photos) is always optional.
- **Map is the home.** Everything radiates out from the map — not a feed, not a list.
- **Past and present.** As useful for filling in a lifetime of past travel as for logging a trip in real time.
- **CSS in separate files.** Every component has its own `.css` file. No inline styles, no CSS-in-JS.
- **Feature-based + layered hybrid structure.** Organized by feature first, then by layer within each feature.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) — client and server |
| Frontend | React 19 + Vite |
| Routing | React Router v7 (library mode — same API as v6) |
| State | React Context + useReducer (global), local state for UI |
| Styling | Plain CSS — one `.css` file per component |
| Map | Leaflet + React-Leaflet v5, GeoJSON country polygons (Natural Earth 50m, simplified), **no tile basemap** |
| Rich Text | TipTap (rendered with `generateHTML` + sanitized links) |
| Photo Storage | Cloudinary (SDK v2, `upload_stream`) |
| EXIF | exifr (client-side) |
| HEIC support | heic2any (client-side conversion to JPEG) |
| OCR | Tesseract.js (in-browser worker) |
| Backend | Node.js 22 + Express 5 (ES modules, TypeScript; `tsx watch` in dev, `tsc` → `dist/` for production) |
| Validation | zod |
| Security | helmet, express-rate-limit |
| Database | MongoDB + Mongoose |
| Auth | Custom JWT — access + refresh tokens, both httpOnly cookies |
| File Uploads | Multer (memory storage) → Cloudinary `upload_stream` |
| Hosting (frontend) | Vercel (proxies `/api/*` to Railway) |
| Hosting (backend) | Railway |
| DB Hosting | MongoDB Atlas |

---

## Feature Set

### Map & Location Tracking
- Interactive world map (Leaflet + GeoJSON polygons, no basemap tiles)
- **Tap a country → instantly marked visited**, with an "Undo" toast (no confirm modal)
- Tap a marked country → popover with status picker (visited / lived in / want to visit), link to its trips, and remove
- City pins: search (Photon autocomplete) **or** click the map in **city mode** (reverse geocoded via Nominatim)
- Countries color-coded by status: visited, lived in, want to visit
- Stats overlay: country count, continent count, % of world — **only `visited` + `lived` count**; denominator is the 195 UN members + observers in `countries.ts`

### Trips
- Named trip with start/end dates, countries, and cities
- Trips contain journal entries and photos
- **Adding a country/city to a trip also marks it on the user's map** (one-way sync; removing from a trip does not unmark)
- Backdated trips: upload photos and the app surfaces those whose EXIF date falls in the trip range
- Deleting a trip cascades: its entries, photos, and Cloudinary assets are deleted

### Journal Entries
- TipTap rich text — headings, bold, italic, lists, links, embedded photos
- Attached to a trip, optionally pinned to a city in that trip
- Scan a handwritten page → OCR → editable draft. **Expectation: Tesseract is weak on handwriting; treat output as a rough draft.** (A vision-model OCR is a possible later upgrade.)
- Per-entry privacy: public / followers / private

### Photo Scrapbook
- Upload to a trip or a specific entry; gallery grid per trip
- EXIF date read client-side and sent as `takenAt`
- HEIC converted to JPEG in the browser before upload
- Per-photo privacy

### Watchback — Reliving Trips
- **Reel mode:** auto-playing slideshow of photos + journal excerpts for one trip or a whole history
- **Timeline scroll:** entries/photos scroll on the left; map on the right flies to each location
- Shareable link that works for logged-out viewers (respects privacy)

### Social
- Public profiles with map and stats
- Follow / unfollow; followers / following lists
- Per-item privacy: **public / followers / private** (the only terms used anywhere)
- Like and comment on trips and entries
- Feed of recent trips and entries from followed users
- Notifications (new follower, like, comment)
- User search

### Auth
- Register / login with email + password
- Access token (15 min) + refresh token (7 days), both httpOnly cookies
- Axios interceptor: on 401, call `/auth/refresh` once, then retry the original request
- Protected routes on frontend; `requireAuth` / `optionalAuth` on backend

---

## Key Design Decisions

These are the decisions that shape the data model and must hold across all phases.

### 1. Same-site cookies via Vercel proxy
The frontend calls `/api/...` on its **own origin**. `client/vercel.json` rewrites `/api/:path*` to the Railway backend. In dev, Vite's `server.proxy` does the same thing to `localhost:5000`. Result: cookies are first-party everywhere, so `sameSite: "lax"` works and Safari/Chrome third-party cookie blocking is irrelevant. CORS is only needed as a fallback.

### 2. Privacy is computed at read time
- Every trip, entry, and photo has its own `privacy`.
- **Effective privacy** = the stricter of the item's own setting and its parent trip's (`private` > `followers` > `public`).
- Nothing is cascaded on write — changing a trip's privacy instantly affects its children.
- One function decides visibility everywhere: `canView(viewer, item, trip)` in `server/src/utils/privacy.ts`. Every read route uses it; list routes filter with an equivalent Mongo query built by `visibilityFilter(viewer, ownerId)`.

### 3. Auth middleware comes in two flavors
- `requireAuth` — 401 if no valid access token.
- `optionalAuth` — attaches `req.user` if a valid token exists, otherwise continues as anonymous. Used by public profiles, public maps, shared watchback, and any `GET` of a trip/entry/photo (privacy decides access, not login).

### 4. Countries
- GeoJSON: Natural Earth **50m** admin-0, simplified with mapshaper to ~1 MB, properties trimmed to `ADM0_A3`, `NAME`, `CONTINENT`.
- Country identity = **`ADM0_A3`** (never `ISO_A3`, which is `-99` for France, Norway, Kosovo, etc.).
- `client/src/data/countries.ts` and `server/src/data/countries.ts` (same content) are the canonical list: `{ code, name, continent, isUN }`. Stats use `isUN` entries (195) as the denominator. Territories (Greenland, Puerto Rico, …) can be marked but don't change the % stat.
- Microstates too small to tap get a small circle marker at their centroid so they're still clickable.

### 5. Map interaction modes
- **Country mode (default):** tap polygon → toggle visited (undo toast). Tap a marked country → status popover.
- **City mode:** toggled by a button on the map (and auto-suggested when zoomed ≥ 5). Tap anywhere → reverse geocode → "Add {city}?" chip → one tap to confirm. Also marks the country visited if it wasn't.

### 6. Places live on the User; trips reference them
- `User.visitedCountries` and `User.visitedCities` are the source of truth for the map.
- `Trip.countries` / `Trip.cities` record which places a trip covered. Adding to a trip upserts into the user's map (one-way).
- There is **no** `map.model.ts`.

### 7. Geocoding
- **Search / autocomplete:** Photon (`photon.komoot.io`) — allows type-ahead. Debounce 300 ms.
- **Reverse geocoding (city mode clicks):** Nominatim `/reverse`, with a descriptive `User-Agent`, max 1 req/s (server-side queue), results cached in memory (LRU).
- Both proxied through our server (`/api/geocode/...`) so the client never calls them directly.

### 8. Rendering user content safely
- TipTap JSON is rendered with `generateHTML` and the same extension set as the editor. The Link extension is configured with `protocols: ['http', 'https', 'mailto']` and validated server-side (zod) to reject `javascript:` URLs.
- Never `dangerouslySetInnerHTML` raw user strings.

---

## MVP Phases

Five phases. Each is independently deployable and testable. Don't start a new phase until the previous one works end-to-end.

### Phase 1 — Foundation
*Goal: app skeleton, auth, and the map working.*

- [ ] Project scaffolded (Vite + React client, Express server, git repo, MongoDB connected)
- [ ] Folder structure created as defined below
- [ ] Register / Login / Logout / Refresh with httpOnly cookie JWTs
- [ ] Axios refresh-and-retry interceptor
- [ ] Protected route wrapper on frontend; `requireAuth` + `optionalAuth` on backend
- [ ] Basic user profile page (avatar, username, bio)
- [ ] World map renders 50m GeoJSON country polygons (no basemap)
- [ ] Tap a country → marked visited instantly → persists → undo toast
- [ ] Status popover (visited / lived / want to visit / remove)
- [ ] Stats bar (countries, continents, % of world — visited + lived only)

**Definition of done:** a user can register, log in, tap countries, see them colored, change status, undo, and stats update live. Session survives past 15 minutes.

### Phase 2 — Trips & Cities
*Goal: trip containers and city-level pins.*

- [ ] Create / edit / delete a trip (cascade delete)
- [ ] Cover photo upload (Cloudinary)
- [ ] Assign countries and cities to a trip (syncs to user map)
- [ ] City search via Photon autocomplete
- [ ] City mode: tap map → Nominatim reverse geocode → add city
- [ ] Trip list page (sorted by start date, newest first)
- [ ] Trip detail page (mini map, entry list, photo gallery placeholders)
- [ ] Per-trip privacy (public / followers / private) enforced via `canView`

**Definition of done:** a user can create a trip, assign places to it (which appear on their main map), and view the trip detail page.

### Phase 3 — Journals & Photos
*Goal: rich journaling and photo uploads.*

- [ ] Create / edit journal entry in a trip (TipTap)
- [ ] Pin entry to a city in the trip
- [ ] Per-entry privacy (effective privacy = stricter of entry and trip)
- [ ] Upload photos to a trip or entry (Multer memory → Cloudinary `upload_stream`)
- [ ] HEIC → JPEG conversion client-side
- [ ] Photo gallery grid on trip detail page
- [ ] Handwritten page → Tesseract OCR → editable draft
- [ ] EXIF date reading; when backdating, surface photos whose date falls in the trip range

**Definition of done:** a user can write a rich text entry, attach photos, and scan a handwritten page into draft text.

### Phase 4 — Watchback
*Goal: the relive-your-travels experience.*

- [ ] Reel mode for a single trip
- [ ] Reel mode for full history (all trips, chronological)
- [ ] Timeline scroll mode (map flies to each entry on scroll)
- [ ] Timeline works for a single trip and full history
- [ ] Toggle between reel and timeline
- [ ] Shareable link works logged-out, shows only what the viewer may see

**Definition of done:** a user can hit "Watch back" on any trip or their full history, experience both modes, and share a link that works in a private window.

### Phase 5 — Social
*Goal: profiles, following, feed, and reactions.*

- [ ] Public profile page (map, stats, visible trips)
- [ ] Follow / unfollow
- [ ] Followers / following lists
- [ ] Feed (cursor-paginated)
- [ ] Like and comment on trips
- [ ] Like and comment on entries
- [ ] Notifications (new follower, like, comment)
- [ ] User search

**Definition of done:** a user can find and follow another user, see their trips in a feed, and interact with their content.

---

## Folder Structure

```
atlas/
├── .gitignore
├── README.md
│
├── client/                          # React + Vite frontend
│   ├── public/
│   │   └── geojson/
│   │       └── countries.geojson    # Natural Earth 50m, simplified (ADM0_A3, NAME, CONTINENT)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  # Routes only
│   │   ├── App.css
│   │   │
│   │   ├── assets/
│   │   │
│   │   ├── data/
│   │   │   └── countries.ts         # Canonical list { code, name, continent, isUN }
│   │   │
│   │   ├── styles/
│   │   │   ├── variables.css
│   │   │   ├── reset.css
│   │   │   └── typography.css
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── MapContext.tsx
│   │   │   └── ToastContext.tsx     # Undo toasts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useMap.ts
│   │   │   ├── useToast.ts
│   │   │   └── useFetch.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   ├── exifUtils.ts
│   │   │   ├── imageUtils.ts        # HEIC → JPEG
│   │   │   ├── privacyUtils.ts      # Labels / effective-privacy display helpers
│   │   │   └── statsUtils.ts        # Country/continent/% calculations
│   │   │
│   │   ├── components/              # Shared/reusable components
│   │   │   ├── Navbar/              (Navbar.tsx, Navbar.css)
│   │   │   ├── Button/              (Button.tsx, Button.css)
│   │   │   ├── Modal/               (Modal.tsx, Modal.css)
│   │   │   ├── Avatar/              (Avatar.tsx, Avatar.css)
│   │   │   ├── PrivacyToggle/       (PrivacyToggle.tsx, PrivacyToggle.css)
│   │   │   ├── Toast/               (Toast.tsx, Toast.css)
│   │   │   └── ProtectedRoute/      (ProtectedRoute.tsx, ProtectedRoute.css)
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── pages/           LoginPage, RegisterPage (.tsx + .css)
│   │   │   │   ├── components/      LoginForm, RegisterForm (.tsx + .css)
│   │   │   │   └── authAPI.ts
│   │   │   │
│   │   │   ├── map/
│   │   │   │   ├── pages/           MapPage
│   │   │   │   ├── components/      WorldMap, CountryLayer, CountryPopover,
│   │   │   │   │                    MicrostateMarkers, CityPin, CityModeControl,
│   │   │   │   │                    MapStatsBar (.tsx + .css each)
│   │   │   │   └── mapAPI.ts
│   │   │   │
│   │   │   ├── trips/
│   │   │   │   ├── pages/           TripListPage, TripDetailPage, TripCreatePage, TripEditPage
│   │   │   │   ├── components/      TripCard, TripForm, TripMap, CitySearch,
│   │   │   │   │                    CoverPhotoUploader (.tsx + .css each)
│   │   │   │   └── tripsAPI.ts
│   │   │   │
│   │   │   ├── journal/
│   │   │   │   ├── pages/           EntryCreatePage, EntryEditPage, EntryDetailPage
│   │   │   │   ├── components/      JournalEditor, EntryCard, OcrUploader (.tsx + .css each)
│   │   │   │   ├── tiptapExtensions.ts   # Shared by editor + renderer
│   │   │   │   └── journalAPI.ts
│   │   │   │
│   │   │   ├── photos/
│   │   │   │   ├── components/      PhotoGallery, PhotoUploader, PhotoCard (.tsx + .css each)
│   │   │   │   └── photosAPI.ts
│   │   │   │
│   │   │   ├── watchback/
│   │   │   │   ├── pages/           WatchbackPage
│   │   │   │   ├── components/      ReelMode, TimelineScroll, WatchbackToggle (.tsx + .css each)
│   │   │   │   └── watchbackAPI.ts
│   │   │   │
│   │   │   ├── social/
│   │   │   │   ├── pages/           FeedPage, ProfilePage, FollowListPage
│   │   │   │   ├── components/      FeedCard, FollowButton, CommentSection, LikeButton,
│   │   │   │   │                    UserSearch, NotificationBell (.tsx + .css each)
│   │   │   │   └── socialAPI.ts
│   │   │   │
│   │   │   └── profile/
│   │   │       ├── pages/           EditProfilePage
│   │   │       ├── components/      ProfileHeader, ProfileStats (.tsx + .css each)
│   │   │       └── profileAPI.ts
│   │   │
│   │   └── services/
│   │       └── api.ts               # Axios instance (baseURL /api) + refresh interceptor
│   │
│   ├── index.html
│   ├── vite.config.ts               # server.proxy: /api → http://localhost:5000
│   ├── tsconfig.json                # references tsconfig.app.json (src) + tsconfig.node.json (vite config)
│   ├── src/vite-env.d.ts            # typed import.meta.env
│   ├── vercel.json                  # rewrites /api/:path* → Railway
│   ├── .env.example
│   └── package.json
│
└── server/                          # Express 5 + Node 22 (ES modules)
    ├── src/
    │   ├── index.ts                 # Connect DB, start server
    │   ├── app.ts                   # Express app, middleware, route mounting
    │   │
    │   ├── config/
    │   │   ├── db.ts
    │   │   └── cloudinary.ts
    │   │
    │   ├── data/
    │   │   └── countries.ts         # Same canonical list as client
    │   │
    │   ├── middleware/
    │   │   ├── authMiddleware.ts    # requireAuth, optionalAuth
    │   │   ├── errorMiddleware.ts   # notFound, errorHandler
    │   │   ├── rateLimit.ts         # authLimiter, geocodeLimiter
    │   │   ├── uploadMiddleware.ts  # Multer memory storage, 10 MB, images only
    │   │   └── validate.ts          # zod schema → 400
    │   │
    │   ├── features/
    │   │   ├── auth/                auth.routes / auth.controller / auth.service
    │   │   ├── users/               user.model / user.routes / user.controller / user.service
    │   │   ├── map/                 map.routes / map.controller / map.service
    │   │   ├── geocode/             geocode.routes / geocode.controller / geocode.service
    │   │   ├── trips/               trip.model / trip.routes / trip.controller / trip.service
    │   │   ├── journal/             entry.model / entry.routes / entry.controller / entry.service
    │   │   ├── photos/              photo.model / photo.routes / photo.controller / photo.service
    │   │   ├── watchback/           watchback.routes / watchback.controller / watchback.service
    │   │   ├── social/              social.routes / social.controller / social.service
    │   │   └── notifications/       notification.model / notification.routes /
    │   │                            notification.controller / notification.service
    │   │
    │   └── utils/
    │       ├── generateToken.ts     # access + refresh token helpers, cookie options
    │       ├── privacy.ts           # canView, effectivePrivacy, visibilityFilter
    │       ├── cloudinaryUpload.ts  # upload_stream / destroy wrappers
    │       └── asyncCache.ts        # Small LRU + 1 req/s queue for Nominatim
    │
    ├── .env                         # never committed
    ├── .env.example
    ├── tsconfig.json                # NodeNext, strict, src → dist
    └── package.json
```

---

## Data Models

Mongoose adds `_id` to every subdocument; that `_id` is what `DELETE /api/map/cities/:cityId` uses.

### User
```
_id, username (unique, lowercase, 3–30 chars [a-z0-9_]), email (unique, lowercase),
passwordHash, avatar { url, cloudinaryId }, bio (≤ 280),
visitedCountries [{ code (ADM0_A3), status: 'visited'|'lived'|'want', addedAt }],
visitedCities    [{ _id, name, lat, lng, countryCode, addedAt }],
mapPrivacy: 'public'|'followers'|'private'  (default 'public'),
followers [userId], following [userId],
tokenVersion (Number, default 0 — increment to revoke all refresh tokens),
createdAt, updatedAt
```
Index: `username`, `email` (unique).

### Trip
```
_id, userId, title, description,
coverPhoto { url, cloudinaryId },
startDate, endDate,
countries [{ code, name }],
cities    [{ name, lat, lng, countryCode }],
privacy: 'public'|'followers'|'private',
likes [userId],
comments [{ _id, userId, text (≤ 1000), createdAt }],
createdAt, updatedAt
```
Index: `{ userId: 1, startDate: -1 }`, `{ privacy: 1, createdAt: -1 }`.

### Entry (Journal Entry)
```
_id, userId, tripId, title, body (TipTap JSON), excerpt (plain text, first ~200 chars, computed on save),
city { name, lat, lng } (optional), date,
privacy: 'public'|'followers'|'private',
likes [userId], comments [{ _id, userId, text, createdAt }],
createdAt, updatedAt
```
Index: `{ tripId: 1, date: 1 }`, `{ userId: 1, date: 1 }`.

### Photo
```
_id, userId, tripId, entryId (optional), cloudinaryId,
url, thumbnailUrl, width, height, caption,
takenAt (EXIF date, optional), city { name, lat, lng } (optional),
privacy: 'public'|'followers'|'private',
createdAt
```
Index: `{ tripId: 1, takenAt: 1 }`.

### Notification
```
_id, recipientId, actorId, type: 'follow'|'like'|'comment',
target { kind: 'trip'|'entry', id } (absent for 'follow'),
read (Boolean, default false), createdAt
```
Index: `{ recipientId: 1, read: 1, createdAt: -1 }`. No self-notifications. Unlike does not create one.

---

## API Route Map

`R` = `requireAuth`, `O` = `optionalAuth` (privacy decides access), `—` = no auth.

### Auth
```
POST   /api/auth/register        —   rate-limited
POST   /api/auth/login           —   rate-limited
POST   /api/auth/refresh         —   reads refresh cookie, issues new access cookie
POST   /api/auth/logout          —   clears both cookies
GET    /api/auth/me              R
```

### Users  (register `/search` BEFORE `/:username`)
```
GET    /api/users/search?q=      O   case-insensitive prefix match, max 10
GET    /api/users/:username      O   public profile: user, stats, visible trips, counts
PUT    /api/users/me             R   username, bio, mapPrivacy
PUT    /api/users/me/avatar      R   multipart (single 'avatar')
GET    /api/users/:id/followers  O
GET    /api/users/:id/following  O
```

### Map
```
GET    /api/map/:userId          O   respects mapPrivacy
POST   /api/map/countries        R   { code, status } — upsert
DELETE /api/map/countries/:code  R
POST   /api/map/cities           R   { name, lat, lng, countryCode, tripId? } — also upserts country
DELETE /api/map/cities/:cityId   R
```

### Geocode
```
GET    /api/geocode/search?q=    —   Photon proxy, rate-limited → [{ name, lat, lng, countryCode, country }]
GET    /api/geocode/reverse?lat=&lng=  —  Nominatim proxy, 1 req/s queue + cache
```

### Trips
```
GET    /api/trips                R   own trips, startDate desc
GET    /api/trips/:id            O
POST   /api/trips                R
PUT    /api/trips/:id            R   owner only; syncs places to user map
DELETE /api/trips/:id            R   owner only; cascades entries, photos, Cloudinary
PUT    /api/trips/:id/cover      R   multipart (single 'cover')
```

### Journal Entries
```
GET    /api/trips/:tripId/entries   O   filtered by canView
POST   /api/trips/:tripId/entries   R   trip owner only
GET    /api/entries/:id             O
PUT    /api/entries/:id             R
DELETE /api/entries/:id             R   unlinks its photos (entryId → null)
```

### Photos
```
GET    /api/trips/:tripId/photos    O   filtered by canView
POST   /api/trips/:tripId/photos    R   multipart (array 'photos', max 20) + JSON 'meta' [{ takenAt, caption, entryId, privacy }]
PUT    /api/photos/:id              R   caption, privacy, entryId, city
DELETE /api/photos/:id              R   also destroys Cloudinary asset
```

### Watchback
```
GET    /api/watchback/trip/:tripId      O   { trip, items: [entry|photo] sorted chronologically }
GET    /api/watchback/user/:username    O   { user, trips, items } full history, viewer-filtered
```
Shareable URLs (client): `/watch/trip/:tripId` and `/watch/:username`.

### Social
```
POST   /api/users/:id/follow        R
DELETE /api/users/:id/follow        R
GET    /api/feed?cursor=&limit=     R   trips + entries from followed users, visible to viewer, createdAt desc
POST   /api/trips/:id/like          R   toggle
POST   /api/entries/:id/like        R   toggle
GET    /api/trips/:id/comments      O
POST   /api/trips/:id/comments      R
GET    /api/entries/:id/comments    O
POST   /api/entries/:id/comments    R
DELETE /api/comments/:kind/:parentId/:commentId   R   comment author or item owner
```

### Notifications
```
GET    /api/notifications           R   unread first, then newest; max 50
GET    /api/notifications/unread-count  R
PUT    /api/notifications/:id/read  R
PUT    /api/notifications/read-all  R
```

### Health
```
GET    /api/health                  —   { ok: true } (Railway health check)
```

---

## Environment Variables

### `server/.env`
```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=long_random_string
JWT_REFRESH_SECRET=different_long_random_string
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
GEOCODE_USER_AGENT=Atlas/1.0 (your-contact-email@example.com)
```

### `client/.env`
```
# Optional. Defaults to /api, which the Vite dev proxy and Vercel rewrite both handle.
VITE_API_URL=/api
```

Generate secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## Build Strategy & Claude Code Prompts

### How to use these prompts
Run them in order, one at a time. Before starting a phase, manually test the previous one. **One feature at a time, one prompt at a time.**

Rules that apply to every prompt (don't repeat them each time):
- All CSS in separate `.css` files — no inline styles, no CSS-in-JS.
- Everything is TypeScript with `strict` on. No `any` unless commented why. Server is ES modules with NodeNext resolution, so relative imports end in `.js` (e.g. `import app from './app.js'`) even though the files are `.ts`.
- Express 5: async errors reach the error handler without try/catch wrappers.
- Shared shapes (User, Trip, Entry, Photo, API responses) get explicit interfaces; derive Mongoose types from schemas with `InferSchemaType`, and type zod-validated bodies with `z.infer`.
- Validate request bodies with zod via `validate.ts`.
- Every read of a trip/entry/photo goes through `utils/privacy.ts`.

---

### Phase 1 Prompts

**1a — Scaffold the project**
```
Scaffold the "atlas" monorepo per the README Folder Structure:
- git init, root .gitignore (node_modules, .env, dist, .DS_Store)
- /client: Vite + React 19 + TypeScript (strict, tsconfig.app/node split), react-router (v7), axios
- /server: Express 5 (type: module), mongoose, dotenv, cors, cookie-parser, bcryptjs,
  jsonwebtoken, helmet, express-rate-limit, zod, multer, cloudinary; dev: typescript, tsx, @types/* for node, express, cors, cookie-parser, jsonwebtoken, multer
- Create every file listed in the Folder Structure as a placeholder (// TODO, or an empty
  component returning null with its .css imported). No logic yet.
- vite.config.ts proxies /api → http://localhost:5000
- .env.example files for client and server
- Confirm `npm run dev` works in both client and server.
```

**1b — Database connection + server entry**
```
- config/db.ts: Mongoose connection using MONGO_URI; exit process on failure.
- app.ts: helmet, cors (origin CLIENT_URL, credentials: true), cookie-parser, express.json({ limit: '1mb' }),
  GET /api/health, mount feature routers (empty for now), notFound + errorHandler.
- index.ts: connect DB, then listen on PORT.
- errorMiddleware.ts: notFound (404) and errorHandler (uses err.status, hides stack in production,
  maps Mongoose ValidationError → 400, duplicate key 11000 → 409, ZodError → 400).
- validate.ts: middleware factory taking a zod schema for body/query/params.
```

**1c — Auth: server**
```
- user.model.ts: schema per README Data Models (toJSON removes passwordHash, tokenVersion).
- utils/generateToken.ts: signAccess(user) — JWT_SECRET, 15m, payload { sub };
  signRefresh(user) — JWT_REFRESH_SECRET, 7d, payload { sub, tv: tokenVersion };
  cookieOptions(maxAge) — httpOnly, sameSite 'lax', secure in production, path '/'.
  Cookie names: atlas_at (access), atlas_rt (refresh, path '/api/auth').
- auth.service.ts: register (bcrypt 12 rounds), login (compare), refresh (verify + check tokenVersion).
- auth.controller.ts / auth.routes.ts: POST register, login, refresh, logout; GET me.
  Login/register set both cookies and return the user.
- authMiddleware.ts: requireAuth and optionalAuth; read token from atlas_at cookie, or
  Authorization: Bearer as fallback. Attach req.user (lean user doc).
- rateLimit.ts: authLimiter (10 req / 15 min per IP) on register + login.
- zod schemas for register (username rules from README) and login.
```

**1d — Auth: client**
```
- services/api.ts: axios instance, baseURL import.meta.env.VITE_API_URL || '/api', withCredentials.
  Response interceptor: on 401 (not from /auth/refresh or /auth/login), call POST /auth/refresh once
  (share a single in-flight promise across concurrent 401s), then retry; if refresh fails, clear
  auth state and redirect to /login.
- AuthContext.tsx (useReducer): user, status ('loading'|'authed'|'anon'); on mount GET /auth/me;
  exposes login, register, logout. useAuth.ts consumes it.
- LoginForm/RegisterForm + LoginPage/RegisterPage with inline field errors from the server.
- components/ProtectedRoute: shows nothing while loading, redirects to /login (with return path) if anon.
- Navbar: logo, Map, Trips, profile avatar menu, logout.
- App.tsx routes: /login, /register, / (MapPage, protected), /u/:username (placeholder).
- styles/variables.css: color, spacing, radius, and font tokens; status colors
  --color-visited, --color-lived, --color-want.
```

**1e — World map (tap to add countries)**
```
Data:
- Download Natural Earth 50m admin-0 countries. Using mapshaper (npx), simplify to ~1 MB and keep
  only ADM0_A3, NAME, CONTINENT. Save to client/public/geojson/countries.geojson.
- Generate data/countries.ts (client + server copies) from it: { code: ADM0_A3, name, continent, isUN },
  isUN true for the 193 UN members + Vatican + Palestine (195). Add centroids for microstates
  (area < ~1000 km²) so they get a tappable marker.

Server:
- map.service/controller/routes: GET /api/map/:userId (optionalAuth, respects mapPrivacy),
  POST /api/map/countries { code, status } (upsert, code must exist in countries.ts),
  DELETE /api/map/countries/:code.

Client:
- Install leaflet + react-leaflet@5. No TileLayer; ocean is a CSS background.
- MapContext.tsx: visitedCountries, visitedCities; addCountry, setCountryStatus, removeCountry with
  optimistic updates + rollback on error.
- ToastContext + Toast component: bottom toast with optional action button, auto-dismiss 5s.
- WorldMap.tsx: MapContainer (worldCopyJump, minZoom 2), renders CountryLayer and MicrostateMarkers.
- CountryLayer.tsx: GeoJSON styled by status. Tap unmarked → addCountry('visited') + toast
  "Added {name} · Undo". Tap marked → CountryPopover (status picker + remove). Hover highlight on desktop.
- MapStatsBar.tsx: countries (visited + lived, isUN only), continents, % of 195. Uses utils/statsUtils.ts.
- MapPage.tsx: map fills viewport height minus navbar (use 100dvh for mobile).
```

---

### Phase 2 Prompts

**2a — Trips CRUD (server)**
```
- trip.model.ts per README.
- utils/privacy.ts: effectivePrivacy(item, trip), canView(viewer, item, trip?), visibilityFilter(viewer, ownerId)
  returning a Mongo filter. Owner sees everything; followers see public + followers; others see public.
- Routes per README Trips section. Owner checks on PUT/DELETE (403 otherwise).
- On create/update, upsert trip countries and cities into the owner's visitedCountries/visitedCities.
- DELETE cascades: entries, photos (Mongo + Cloudinary destroy). Phase 2 has no entries/photos yet,
  but write the cascade now so it's not forgotten.
- utils/cloudinaryUpload.ts: uploadBuffer(buffer, folder) via upload_stream, destroy(cloudinaryId).
- uploadMiddleware.ts: multer memoryStorage, 10 MB limit, image mimetypes only.
- PUT /api/trips/:id/cover.
```

**2b — Trips CRUD (client)**
```
- TripForm (title, start/end dates with end ≥ start, description, privacy via PrivacyToggle,
  country multi-select from countries.ts, cities via CitySearch).
- CoverPhotoUploader (preview, uploads after trip is saved).
- TripCard (cover, title, date range, country count, privacy icon).
- TripListPage (grid, empty state with "Create your first trip").
- TripCreatePage, TripEditPage (wrap TripForm).
- TripDetailPage: header, TripMap, entry list + photo gallery placeholders, Edit/Delete for owner,
  "Watch back" button (disabled until Phase 4).
- TripMap: small non-interactive Leaflet map, highlights trip countries, pins trip cities, fitBounds.
- Routes: /trips, /trips/new, /trips/:id, /trips/:id/edit.
```

**2c — City pins (search + city mode)**
```
Server:
- geocode.service.ts: search(q) via Photon (https://photon.komoot.io/api?q=&limit=8&layer=city),
  reverse(lat, lng) via Nominatim /reverse (zoom=10) with GEOCODE_USER_AGENT header, a 1 req/s queue
  and an LRU cache (utils/asyncCache.ts, key rounded to 2 decimals). Normalize to
  { name, lat, lng, countryCode (ADM0_A3 via ISO2 lookup in countries.ts), country }.
- geocode routes per README, geocodeLimiter (60/min per IP).
- POST /api/map/cities (also upserts the country as 'visited'; if tripId given and owned, add to trip),
  DELETE /api/map/cities/:cityId.

Client:
- CitySearch: input debounced 300 ms, min 2 chars, keyboard-navigable dropdown, abort stale requests.
- CityModeControl: map button toggling city mode; suggests city mode when zoom ≥ 5.
- In city mode, a map click → reverse geocode → small chip "Add {city}?" at the click → confirm adds it.
- CityPin: circle marker (distinct from polygons) with popup (name, remove).
- MapContext: addCity, removeCity (optimistic).
```

---

### Phase 3 Prompts

**3a — Journal entries (server)**
```
- entry.model.ts per README; compute excerpt from TipTap JSON on save.
- Routes per README Journal Entries section. Create/update/delete are trip-owner only.
- Reads use canView with effective privacy (stricter of entry and trip).
- zod-validate body: TipTap JSON shape (type 'doc'), link marks only http/https/mailto, city
  must be one of the trip's cities if provided.
- Add entry cascade to trip DELETE.
```

**3b — Journal entries (client + TipTap)**
```
- Install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
- tiptapExtensions.ts: shared extension list (Link with protocols http/https/mailto, openOnClick false).
- JournalEditor: toolbar (bold, italic, H2, H3, bullet list, ordered list, link, image).
  Image button uploads via the photo endpoint once 3d exists; until then accepts a URL.
- EntryCreatePage / EntryEditPage: title, date (default today, clamp to trip dates with a warning),
  city picker (trip's cities), JournalEditor, PrivacyToggle (shows note if trip privacy is stricter),
  OcrUploader slot. Warn on leaving with unsaved changes.
- EntryDetailPage: render with generateHTML(json, extensions). Edit/Delete for owner.
- EntryCard: title, city, date, excerpt.
- TripDetailPage: list EntryCards by date, "New entry" button for owner.
- Routes: /trips/:tripId/entries/new, /entries/:id, /entries/:id/edit.
```

**3c — OCR journal scan**
```
- Install tesseract.js and heic2any.
- utils/imageUtils.ts: toJpegIfHeic(file) (lazy-import heic2any).
- OcrUploader: accepts jpg/png/heic; converts HEIC; runs Tesseract in a worker (create once, reuse,
  terminate on unmount); shows progress %; on finish inserts text into the editor as paragraphs
  (inserted at cursor, not replacing existing content) and highlights it as "Scanned draft — please review".
- Show a one-line note that handwriting recognition is approximate.
```

**3d — Photo uploads**
```
Server:
- photo.model.ts per README.
- POST /api/trips/:tripId/photos: multer array('photos', 20) + 'meta' JSON field; upload each buffer
  with uploadBuffer to folder atlas/{userId}/{tripId}; thumbnailUrl via Cloudinary transformation
  (c_fill,w_400,h_400,q_auto,f_auto); save Photo docs. If any upload fails, destroy the ones that succeeded.
- GET (canView-filtered), PUT, DELETE (+ Cloudinary destroy) per README.
- Add photo cascade to trip DELETE; entry DELETE sets entryId null.

Client:
- PhotoUploader: drag-and-drop + click, multiple files, HEIC → JPEG, reads takenAt with exifr,
  per-file progress. When the trip has dates, flags photos whose takenAt falls outside the range
  and preselects those inside it ("12 of 30 photos match this trip's dates").
- PhotoCard (thumbnail, caption overlay, owner menu: caption, privacy, delete).
- PhotoGallery: responsive CSS grid, lightbox on click (Modal).
- Wire into TripDetailPage; JournalEditor image button now uploads via this endpoint.
```

---

### Phase 4 Prompts

**4a — Watchback server + Reel mode**
```
Server:
- watchback.service.ts: buildTimeline(viewer, { tripId } | { username }) → entries + photos the viewer
  can see, merged and sorted by (photo.takenAt || photo.createdAt) / entry.date. Each item carries
  location (entry.city, photo.city, or the trip's first city/country centroid as fallback).
- Routes per README Watchback section (optionalAuth).

Client:
- WatchbackPage: full-screen; route /watch/trip/:tripId and /watch/:username; WatchbackToggle
  (pill: Reel / Timeline), mode stored in the URL (?mode=reel).
- ReelMode: photos shown 4 s with cross-fade (two stacked layers, CSS opacity transition);
  entry excerpts shown as text cards between photos; preload next image; controls play/pause,
  prev, next, progress bar; keyboard (space, arrows); pauses when tab hidden.
- "Copy share link" button.
```

**4b — Timeline scroll mode**
```
- TimelineScroll: left panel scrollable list of items (entries as cards, photos inline);
  right panel sticky Leaflet map (no basemap, country polygons dimmed, visited highlighted).
- IntersectionObserver (rootMargin centered) picks the active item; map.flyTo its location
  (zoom 6 for cities, fitBounds for countries); debounce so fast scrolling doesn't queue animations.
- Mobile (< 768px): map on top at 40vh, list below.
- Wire into WatchbackPage with WatchbackToggle.
```

---

### Phase 5 Prompts

**5a — Follow system + public profiles**
```
Server:
- POST/DELETE /api/users/:id/follow (can't follow self; $addToSet/$pull on both users; follow
  creates a notification — model and service from 5c, stub the call now if needed).
- GET /api/users/:username: profile, stats (respect mapPrivacy), visible trips, follower/following counts,
  isFollowing for the viewer.
- GET /api/users/:id/followers and /following (username, avatar).

Client:
- ProfilePage (/u/:username): ProfileHeader, read-only map, ProfileStats, trip grid.
- ProfileHeader: avatar, username, bio, FollowButton (hidden on own profile → "Edit profile").
- FollowButton: optimistic toggle with follower count.
- FollowListPage: /u/:username/followers and /following.
- EditProfilePage: username, bio, mapPrivacy, avatar upload.
```

**5b — Feed, likes, and comments**
```
Server:
- GET /api/feed: trips + entries from followed users visible to the viewer (public + followers),
  cursor = createdAt of last item + _id tiebreaker, limit 20. Query both collections, merge, slice.
- Like toggles and comment routes per README (comments ≤ 1000 chars, delete by author or owner).

Client:
- FeedPage: FeedCards with infinite scroll (IntersectionObserver sentinel); empty state suggests
  searching for people.
- FeedCard: trip or entry preview — cover/first photo, title, author avatar + username, date,
  LikeButton, comment count (expands CommentSection).
- LikeButton: heart + count, optimistic.
- CommentSection: list + input, delete own.
```

**5c — User search + notifications**
```
Server:
- GET /api/users/search?q= (escape regex, prefix match on username, max 10). Register before /:username.
- notification.model/service/routes per README. createNotification() skips self-actions and is called
  from follow, like (on like only, not unlike), and comment.

Client:
- UserSearch in Navbar: debounced input, dropdown of avatar + username, Enter goes to first result.
- NotificationBell: unread badge (poll unread-count every 60 s and on window focus), dropdown of
  recent notifications, click marks read and navigates, "Mark all read".
```

---

## Third-Party Services

| Service | Purpose | Notes |
|---|---|---|
| MongoDB Atlas | Database | Free tier (512 MB) |
| Cloudinary | Photo storage + CDN | Free tier; server-side signed uploads only |
| Photon (komoot) | City search / autocomplete | Free, fair use; debounce, no API key |
| OpenStreetMap Nominatim | Reverse geocoding | **Max 1 req/s, custom User-Agent required, no autocomplete.** Server-side queue + cache |
| Natural Earth | Country polygons (50m) | Public domain |
| Vercel | Frontend hosting + `/api` proxy | Free tier |
| Railway | Backend hosting | ~$5/month after trial |

No map tile provider is used (the map is polygons on a plain background), so no tile API key or usage policy applies.

---

## Deployment Plan

### Backend (Railway) — deploy first
1. Push the monorepo to GitHub.
2. Create a Railway project from the repo, root directory `/server`, build command `npm run build`, start command `npm start` (runs `node dist/index.js`).
3. Set all `server/.env` variables (with `NODE_ENV=production`, `CLIENT_URL` = Vercel URL).
4. Health check path: `/api/health`.

### Frontend (Vercel)
1. Import the same repo, root directory `/client`, framework Vite.
2. Put the Railway URL in `client/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://YOUR-APP.up.railway.app/api/:path*" },
       { "source": "/((?!api/).*)", "destination": "/index.html" }
     ]
   }
   ```
   The second rule makes client-side routes (e.g. `/trips/123`) work on refresh.
3. Leave `VITE_API_URL` unset (defaults to `/api`).

### Database (MongoDB Atlas)
1. Create a free cluster and a database user.
2. Network access: `0.0.0.0/0` to start (Railway IPs are dynamic); rely on a strong password.
3. Paste the connection string into Railway's `MONGO_URI`.

### Production notes
- Cookies: `httpOnly`, `secure: true`, `sameSite: "lax"` — first-party thanks to the Vercel rewrite.
- `app.set('trust proxy', 1)` on the server so rate limiting and secure cookies see the real client.
- CORS still allows `CLIENT_URL` with `credentials: true` as a fallback for direct calls.

---

## Changelog v1.0 → v1.1

| # | Change | Why |
|---|---|---|
| 1 | `/api` proxied through Vercel (and Vite in dev); `sameSite: "lax"` | Cross-site cookies (Vercel ↔ Railway) are blocked by Safari and increasingly Chrome; auth would break in production |
| 2 | Added `POST /api/auth/refresh`, both tokens in cookies, axios refresh interceptor, `tokenVersion` | v1.0 had a refresh token with no refresh route — sessions would end every 15 min |
| 3 | `requireAuth` + `optionalAuth`; single `utils/privacy.ts` | Public profiles and share links need logged-out access; privacy logic must live in one place |
| 4 | Natural Earth 50m, `ADM0_A3` codes, canonical `countries.ts`, microstate markers | 110m omits Singapore, Malta, Bahrain, etc.; `ISO_A3` is `-99` for France/Norway; "% of world" needs a fixed denominator |
| 5 | Photon for search, Nominatim only for reverse (queued + cached) | Nominatim's usage policy forbids autocomplete |
| 6 | Multer memory storage + Cloudinary `upload_stream` | `multer-storage-cloudinary` is unmaintained and pinned to Cloudinary SDK v1 |
| 7 | React 19, React Router v7, react-leaflet v5, Express 5 | Current versions; react-leaflet v5 requires React 19 |
| 8 | One-tap add with undo toast; status popover | v1.0 prompt 1e's confirm modal contradicted "one tap" |
| 9 | Country mode vs city mode | A map click can't both toggle a country and add a city |
| 10 | Stats count only `visited` + `lived` | "Want to visit" shouldn't inflate the count |
| 11 | Places live on User; trips sync into it; no `map.model.ts` | Removes two sources of truth and the 1e/folder-structure conflict |
| 12 | "followers" everywhere; effective privacy computed at read time | v1.0 mixed "friends"/"followers"; read-time computation avoids cascading writes |
| 13 | Added routes: cover, avatar, geocode, watchback, comments GET/DELETE, notifications, health | Features in v1.0 had no endpoints |
| 14 | Notification model + feature folders | Phase 5c needed them but they weren't defined |
| 15 | `/users/search` registered before `/users/:username` | Otherwise Express treats "search" as a username |
| 16 | Trip delete cascades to entries, photos, Cloudinary | Avoids orphaned data and storage cost |
| 17 | No tile basemap | OSM tile servers forbid app usage; polygons-only matches the Been look |
| 18 | HEIC → JPEG client-side; OCR expectations stated | Browsers and Tesseract can't read HEIC; Tesseract is weak on handwriting |
| 19 | helmet, rate limiting, zod, TipTap link sanitization, `trust proxy` | Basic hardening missing from v1.0 |
| 20 | git init in 1a; `.env.example` files; SPA rewrite on Vercel | Deployment needs a repo; refreshes on deep links 404 without the rewrite |
| 21 | TypeScript (strict) on client and server; `tsx` dev runner, `tsc` build to `dist/` | Requested after v1.1 draft; catches model/API shape mismatches across phases |
