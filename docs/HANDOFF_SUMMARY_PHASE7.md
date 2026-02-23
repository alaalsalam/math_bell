# Math Bell — Handoff Summary (Phase 7)

## 1) New DocTypes / Fields Added
- New Single DocType:
  - `MB Settings` (`math_bell/math_bell/doctype/mb_settings/mb_settings.json`)
  - Fields:
    - `teacher_passcode`
    - `default_bell_duration_seconds`
    - `default_questions_per_session`
    - `enable_sound`
    - `enable_confetti`
    - `enable_balloons`
    - `allow_guest_play`
    - `show_only_skills_with_questions`
    - `engines_json` (enabled engines list as JSON)
- `MB Skill` updated:
  - `is_featured`
  - `min_level_required`
  - `show_in_student_app`
- `MB Game Level` updated:
  - `is_enabled`

## 2) New / Updated APIs
### System & Bootstrap
- `math_bell.api.bootstrap.get_bootstrap`
  - Enforces `show_in_student_app=1`
  - Applies `show_only_skills_with_questions`
  - Filters game templates by enabled engines from settings
  - Returns frontend flags under `data.settings`
- `math_bell.api.teacher.get_settings`
- `math_bell.api.teacher.update_settings`

### Analytics (new module)
- `math_bell.api.analytics.teacher_kpis`
  - KPIs + top/weak skills + sessions/day + accuracy/domain
- `math_bell.api.analytics.student_list`
  - Students with level/streak/accuracy/totals/last activity
- `math_bell.api.analytics.student_detail`
  - Timeline, domain breakdown, top/weak skills, total time, recommendation
- `math_bell.api.analytics.class_detail`
  - Class KPIs, ranked students, most practiced skills
- `math_bell.api.analytics.student_home`
  - Attempts today, target, recommendation, streak, level

## 3) New Teacher Screens / Routes
- `/#/teacher` (upgraded KPI dashboard + mini charts)
- `/#/teacher/students` (students list + search/filter by grade/class)
- `/#/teacher/students/:studentId` (student analytics detail)
- `/#/teacher/settings` (system settings form + engine toggles)

Files:
- `frontend/src/pages/TeacherDashboardPage.jsx`
- `frontend/src/pages/TeacherStudentsPage.jsx`
- `frontend/src/pages/TeacherStudentPage.jsx`
- `frontend/src/pages/TeacherSettingsPage.jsx`
- `frontend/src/routes/AppRouter.jsx`
- `frontend/src/api/client.js`

## 4) How Game Visibility Is Controlled
1. Global engine control via `MB Settings.engines_json`
   - Example: `mcq`, `drag_drop_groups`, `vertical_column`, `fraction_builder`
2. Skill-level visibility via `MB Skill.show_in_student_app`
3. Active flag check via `MB Skill.is_active`
4. Optional filtering to avoid empty UX via `MB Settings.show_only_skills_with_questions`

## 5) KPI Definitions (implemented)
- `total_students`: active students count
- `active_today`: distinct students with sessions today
- `sessions_today`: sessions created today
- `total_attempts_today`: attempt logs created today
- `avg_accuracy_7d`: average session accuracy from `stats_json` over last 7 days
- `top_5_skills_by_attempts_7d`: skills ranked by attempts over last 7 days
- `weakest_5_skills_by_accuracy_7d`: low-accuracy skills with attempt threshold
- `sessions_by_day_7d`: daily sessions trend
- `accuracy_by_domain_7d`: per-domain attempt accuracy trend

## 6) Smoke Test Checklist
1. Run migrations:
   - `bench --site site1.yemenfrappe.com migrate`
2. Build frontend:
   - `npm --prefix /home/frappe/frappe-bench/apps/math_bell/frontend run build`
3. Verify backend via execute (site1 only):
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.teacher_kpis`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_list`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_detail --kwargs "{'student_id':'4pu5djallg'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.class_detail --kwargs "{'class_group':'a36ttt1pul'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_home --kwargs "{'student_id':'4pu5djallg'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.teacher.get_settings`
4. Verify UI:
   - `https://site1.yemenfrappe.com/math-bell-games`
   - Teacher mode -> dashboard, students list, student detail, settings page

## 7) Phase 7 Commits
- `c78c37b` — feat: add mb settings for system control
- `c51c65c` — feat: enforce settings and visibility rules in bootstrap
- `4d43fc1` — feat: add analytics api for teacher dashboards
- `e2962df` — feat: add teacher kpi dashboard and charts
- `27d0269` — feat: add teacher students list with filters
- `5744618` — feat: add student detail analytics view
- `51a7dd3` — feat: add teacher settings page and engine toggles
- `0ba01bc` — feat: add smart student dashboard insights

## 8) Notes
- `bench restart` could not run in this environment due missing sudo/supervisor permissions.
- API validations were verified using `bench --site ... execute` for reliable runtime checks.
