# Math Bell — Handoff Summary (Phase 11)

## 1) Data model
New DocType: `MB Weekly Plan`
- `student` (Link: MB Student Profile)
- `week_start` (Date)
- `week_end` (Date)
- `plan_json` (Long Text)
- `completion_rate` (Float)
- `status` (Select: `active` / `completed` / `expired`)

Indexes:
- `(student, week_start)`
- `(student, status)`

## 2) Weekly plan logic
Engine file: `math_bell/planner/engine.py`

`generate_weekly_plan(student_id)` does:
1. Pull last 14-day skill performance from attempts.
2. Identify buckets:
- weak skills: accuracy `< 0.6` (top 2)
- medium skills: `0.6 - 0.8` (top 1)
- strong skills: `> 0.8` (top 1)
3. Build a deterministic 5-day plan:
- day_1: weak_1 (practice)
- day_2: weak_2 (practice)
- day_3: medium (review)
- day_4: weak/medium (practice or adapted)
- day_5: strong (challenge or adapted)

Plan JSON includes:
- `week_start`, `week_end`, `generated_at`
- `target_days`
- `adaptation_mode`
- `previous_completion_rate`
- `day_1..day_5`

## 3) Auto creation and retrieval
API file: `math_bell/api/planner.py`

Endpoint:
- `/api/method/math_bell.api.planner.get_current_plan`

Behavior:
- Expires old active plans.
- Reuses current week plan if exists.
- Creates new plan for current week when missing.
- Computes progress from ended sessions mapped to planned skills.
- Updates `completion_rate` + `status` automatically.

Login integration:
- `math_bell.api.student_auth.login_student` now calls `ensure_current_week_plan(student.name)`.

## 4) Dashboard changes
Student dashboard (`frontend/src/pages/DashboardPage.jsx`):
- Added section: **"خطة هذا الأسبوع 📅"**
- Shows:
  - week range
  - progress bar from `completion_rate`
  - day cards (1..5) with focus and completion check
  - motivational copy:
    - `كفو يا بطل! خلصت يوم X من الخطة 🔥`

Client API update:
- `getCurrentPlan({ student_id })` in `frontend/src/api/client.js`

## 5) Teacher analytics changes
Teacher student detail (`frontend/src/pages/TeacherStudentPage.jsx`):
- Added block **"الخطة الأسبوعية"**
- Shows:
  - week range
  - completion %
  - compliance as days completed / 5
  - day cards and status

Backend analytics update:
- `math_bell.api.analytics.student_detail` now includes `weekly_plan`.

## 6) Adaptation rule (compliance-based)
Implemented in planner engine:
- If previous week `completion_rate < 40%`:
  - mode: `light`
  - `target_days = 4`
  - fewer challenge tasks (more review)
- If previous week `completion_rate > 80%`:
  - mode: `challenge`
  - keeps/increases challenge focus in later days
- Else:
  - mode: `normal`
  - `target_days = 5`

Progress scoring respects `target_days` (for completion rate), while teacher view still displays compliance as `days_completed / 5`.

## 7) Smoke test checklist
1. Call planner API:
- `bench --site site1.yemenfrappe.com execute math_bell.api.planner.get_current_plan --kwargs '{"student_id":"<student>"}'`
- Verify plan exists and has `day_1..day_5`.
2. Login student:
- `login_student` should ensure current week plan exists.
3. Complete sessions on planned skills:
- Re-call `get_current_plan` and verify `days_completed` + `completion_rate` increase.
4. Open student dashboard:
- Verify weekly plan cards and progress bar render.
5. Open teacher student detail:
- Verify weekly plan block and compliance appear.
6. Adaptation check:
- Set previous week completion low/high and regenerate next week plan; verify `adaptation_mode`/`target_days` shift.

## 8) Phase 11 commits
- `8c13abf` — `feat: add weekly plan doctype`
- `3f83e60` — `feat: implement adaptive weekly planner engine`
- `108dfc6` — `feat: auto generate weekly plan`
- `8c0a14c` — `feat: integrate weekly plan into student dashboard`
- `3443aa9` — `feat: show weekly plan in teacher analytics`
- `9b0fd5b` — `feat: adapt next week difficulty based on compliance`
