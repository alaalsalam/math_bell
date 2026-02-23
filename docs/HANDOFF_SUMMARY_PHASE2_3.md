# Math Bell — Handoff Summary (Phase 2 + Phase 3)

## 1) What is DONE (facts only)
- Phase 2: Core DocTypes created (`MB Grade`, `MB Domain`, `MB Skill`, `MB Lesson`, `MB Game Template`, `MB Game Level`, `MB Question Bank`, `MB Class Group`, `MB Student Profile`, `MB Session`, `MB Attempt Log`, `MB Badge`, `MB Student Badge`)
- Phase 3: Minimal APIs implemented (`math_bell.api.bootstrap.get_bootstrap`, `math_bell.api.student_auth.join_class`, `math_bell.api.sessions.start_session`, `math_bell.api.sessions.submit_attempt`, `math_bell.api.sessions.end_session`)
- Site affected: `site1.yemenfrappe.com` only
- Commits:
  - `d85ca0a7f1a81ea8570e32a87258acb3458a043d` — `feat: add core doctypes for math_bell`
  - `a6d769a03f2ffced44485824705ac3205d2b4fa6` — `feat: add minimal api for sessions and attempts`

## 2) Current System State
### Database / Seed data
- Existing master records now:
  - `MB Grade`: `1`
  - `MB Domain`: `Addition`
  - `MB Skill`: `G1_ADD_001`
  - `MB Question Bank`: one sample MCQ for `G1_ADD_001`
  - `MB Class Group`: one sanity class with generated `join_code`
- Why they were created: to run real guest sanity checks for `bootstrap`, `start_session`, `submit_attempt`, `end_session`, and `join_class` after API implementation.
- Are they test-only? Should they be removed later? **yes**

### File locations
- DocTypes path: `math_bell/math_bell/doctype/`
- API path (final): `math_bell/api/` (this is the correct final path for dotted imports `math_bell.api.*`)
- Frontend entry file path: `math_bell/www/math-bell-games.html`

## 3) How to test quickly (copy-paste commands)
- curl bootstrap
```bash
curl -sS "https://site1.yemenfrappe.com/api/method/math_bell.api.bootstrap.get_bootstrap" | jq
```
- curl start_session
```bash
curl -sS -X POST "https://site1.yemenfrappe.com/api/method/math_bell.api.sessions.start_session" \
  --data-urlencode "session_type=practice" \
  --data-urlencode "grade=1" \
  --data-urlencode "domain=Addition" \
  --data-urlencode "skill=G1_ADD_001" | jq
```
- curl submit_attempt
```bash
SESSION_ID="<PUT_SESSION_ID_HERE>"
curl -sS -X POST "https://site1.yemenfrappe.com/api/method/math_bell.api.sessions.submit_attempt" \
  --data-urlencode "session_id=${SESSION_ID}" \
  --data-urlencode "skill=G1_ADD_001" \
  --data-urlencode "question_ref=hl2n54grbj" \
  --data-urlencode 'given_answer_json={"value":3}' \
  --data-urlencode "is_correct=1" \
  --data-urlencode "time_ms=1200" \
  --data-urlencode "hint_used=0" | jq
```
- curl end_session
```bash
SESSION_ID="<PUT_SESSION_ID_HERE>"
curl -sS -X POST "https://site1.yemenfrappe.com/api/method/math_bell.api.sessions.end_session" \
  --data-urlencode "session_id=${SESSION_ID}" | jq
```
- curl join_class
```bash
JOIN_CODE="<PUT_JOIN_CODE_HERE>"
curl -sS -X POST "https://site1.yemenfrappe.com/api/method/math_bell.api.student_auth.join_class" \
  --data-urlencode "join_code=${JOIN_CODE}" \
  --data-urlencode "display_name=طالب تجربة" \
  --data-urlencode "grade=1" | jq
```

## 4) Known issues / risks
- Permissions are still permissive and not production-hardened.
- Student auth token returned by `join_class` is not persisted/validated server-side yet (lightweight placeholder only).
- JSON fields are validated by parse only; no schema-level validation yet.
- `question_ref` in submit examples currently relies on seeded sample data; frontend must use refs returned by `start_session`.
- Test seed records were inserted directly in site DB for sanity and should be cleaned/managed via fixtures or setup patch later.

## 5) NEXT (Phase 4 plan — specific, not vague)
- A) Frontend wiring tasks:
  - Create a React API client module for `/api/method/*` calls, centralized error handling, and configurable base URL.
  - Implement screens: Home (grade picker), Domain picker, Skills list/map, Session Runner, Report.
  - Add hash-based routing consistent with `math-bell-games.html` web entry and current assets serving pattern.
- B) Game runner MVP:
  - Implement one engine key: `bubble_pick` (MCQ).
  - Read `question_json` + choices, submit answer via `submit_attempt`, and finish via `end_session`.
- C) Bell Session MVP:
  - Add bell sound placeholders in public assets and wire start/end playback.
  - Add visible countdown timer.
  - Start with `session_type=bell_session` and pass `duration_seconds`.

Also provide exact commit granularity for Phase 4:
- `feat: add frontend api client and routing`
- `feat: add skills browsing screens`
- `feat: add session runner and report screen`
- `feat: add bell session timer and sounds`

## 6) Questions for product owner (max 5)
- What is the default `duration_seconds` for a bell session (e.g., 300, 600, 900)?
- How many questions should be served per session by default (fixed number or dynamic by time)?
- Confirm Arabic copy for core buttons/states (`ابدأ`, `التالي`, `إنهاء الحصة`, `النتيجة`).
- Should `join_class` remain token-only for MVP, or switch early to real Frappe session auth?
- For grade/domain navigation, do we show only active skills with questions, or all active skills regardless of question availability?
