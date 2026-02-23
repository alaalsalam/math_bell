# REFERENCE_ANALYSIS — mathematics_leaders → math_bell

## 1) Folder Layout Summary

Reference app root:
- `/home/frappe/frappe-bench/apps/mathematics_leaders`

Backend (Frappe) structure:
- Python package root: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders`
- API modules: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/api`
- App hooks/config: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/hooks.py`
- Module declaration: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/modules.txt`
- DocTypes under nested module path:
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/mathematics_leaders/doctype`
  - Example: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/mathematics_leaders/doctype/game_users/game_users.json`

Frontend structure:
- Separate frontend workspace: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend`
- Main frontend source: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/src`
- Routing: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/src/router/index.js`
- Build config: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/vite.config.js`

Web/static serving split:
- App static files source: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/public`
- Built frontend output target: `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/public/frontend`
- Public web route entry page (Frappe website route): `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/www/math-leaders-games.html`

Responsibility split to replicate:
- `public/`: bundled JS/CSS/assets to be served via `/assets/<app>/...`
- `www/`: route entry HTML served by Frappe website and loading assets from `/assets/<app>/...`

## 2) Build/Run Commands

Root-level app scripts:
- File: `/home/frappe/frappe-bench/apps/mathematics_leaders/package.json`
- Commands:
  - `yarn dev` -> `cd frontend && yarn dev`
  - `yarn build` -> `cd frontend && yarn build`
  - `postinstall` installs frontend deps.

Frontend scripts:
- File: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/package.json`
- Commands:
  - `yarn dev` -> `vite`
  - `yarn build` -> `vite build && yarn copy-html-entry`
  - `yarn copy-html-entry` copies built `index.html` to `www/math-leaders-games.html`

Vite behavior:
- File: `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/vite.config.js`
- Base URL: `/assets/mathematics_leaders/frontend/`
- Dev server: port `8080`
- Proxy targets Frappe webserver port from `sites/common_site_config.json`
- Proxy covers `/(app|login|api|assets|files|private)` and keeps host-based site routing.

Expected local behavior:
- Frontend dev via Vite HMR on `:8080`
- Backend/API/session endpoints proxied to bench site webserver
- Frontend route mode is hash-based with base `/math-leaders-games/`.

## 3) Frontend Deployment Flow

Observed flow:
1. Build frontend with Vite.
2. Vite writes output to:
   - `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/public/frontend`
3. Build enforces deterministic artifact names:
   - `js/platform.js`
   - `js/[name].js` chunks
   - `css/platform.css`
4. Build script copies generated html:
   - from `.../public/frontend/index.html`
   - to `.../www/math-leaders-games.html`
5. Frappe serves route page from `www`, and that page references:
   - `/assets/mathematics_leaders/frontend/js/platform.js`
   - `/assets/mathematics_leaders/frontend/css/platform.css`

Key references:
- `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/vite.config.js`
- `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/package.json`
- `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/www/math-leaders-games.html`

## 4) Auth and API Patterns

Auth model in reference app:
- Cookie session (`sid`) using Frappe `LoginManager`.
- Signup creates `User` (`Website User`) and companion row in custom `Game Users` DocType.
- Login endpoint authenticates user and calls `post_login()` to establish session.
- Session guard endpoint returns `{ok: false}` for guest.

Key backend files:
- Signup/Login:
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/api/signup_and_login.py`
- Session profile check:
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/api/get_my_details.py`
- Score endpoints:
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/mathematics_leaders/api/game_points.py`

API route style:
- Frappe whitelisted dotted paths under `/api/method/...`
- Examples:
  - `/api/method/mathematics_leaders.api.signup_and_login.verify_login`
  - `/api/method/mathematics_leaders.api.get_my_details.get_me`

Frontend API call style:
- Direct `fetch` calls (no centralized SDK layer).
- Uses `credentials: 'include'` for cookie session.
- Examples:
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/src/components/Index.vue`
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/src/components/Dashboard.vue`
  - `/home/frappe/frappe-bench/apps/mathematics_leaders/frontend/src/composables/useGameScore.js`

## 5) Patterns to Replicate in `math_bell`

Stack and repository shape:
- Keep Frappe backend app + separate frontend workspace split.
- Use React + Vite, but keep same deployment mechanics from reference app.

Frontend build/deploy mechanics:
- Keep `base` as `/assets/math_bell/frontend/`.
- Output build to `math_bell/public/frontend`.
- Keep deterministic bundle names for stable linking from `www`.
- Copy built `index.html` into route entry file:
  - target naming for new app: `math_bell/www/math-bell-games.html`.

Backend/API style:
- Keep whitelisted endpoints under `math_bell.api`.
- Keep `/api/method/math_bell.api.<module>.<function>` pattern.
- Keep cookie-session-compatible frontend API calls (`credentials: 'include'`).

Website route entry:
- Serve frontend from `www/math-bell-games.html`.
- Route file loads static bundles from `/assets/math_bell/frontend/...`.

## 6) Build/Bench Context Findings

- `mathematics_leaders` exists in bench app registry (`/home/frappe/frappe-bench/sites/apps.txt`).
- Current bench sites scanned with `bench --site <site> list-apps` show no active site currently containing `mathematics_leaders`.

## 7) Sanity Check Notes (Phase 0)

Validated by source inspection:
- Structure, API, hooks, frontend build config, route entry page, and auth flow files are present and consistent with above patterns.
- No repo-tracked code changes are required for Phase 0 analysis itself.

