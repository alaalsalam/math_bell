# Math Bell — Handoff Summary (Phase 7)

## 1) New DocTypes/fields added
- New Single DocType: `MB Settings`
  - `teacher_passcode` (default `1234`)
  - `default_bell_duration_seconds` (default `600`)
  - `default_questions_per_session` (default `10`)
  - `enable_sound`, `enable_confetti`, `enable_balloons`
  - `allow_guest_play`, `show_only_skills_with_questions`
  - `engines_json` (enabled game engines JSON)
- `MB Skill` fields:
  - `is_featured`
  - `min_level_required`
  - `show_in_student_app`
- `MB Game Level` field:
  - `is_enabled`

## 2) New APIs
- `math_bell.api.bootstrap.get_bootstrap`
  - Filters student-facing skills by `is_active=1` and `show_in_student_app=1`
  - Applies settings flags + enabled engines
- `math_bell.api.teacher.get_settings`
- `math_bell.api.teacher.update_settings`
- `math_bell.api.analytics.teacher_kpis`
- `math_bell.api.analytics.student_list`
- `math_bell.api.analytics.student_detail`
- `math_bell.api.analytics.class_detail`
- `math_bell.api.analytics.student_home`

## 3) New teacher screens/routes
- `/#/teacher` (KPI dashboard + trend blocks)
- `/#/teacher/students` (students list + search/filter)
- `/#/teacher/students/:studentId` (student analytics detail)
- `/#/teacher/settings` (system controls + engine toggles)

## 4) How to control which games appear
1. Global engine visibility: `MB Settings.engines_json`
2. Skill visibility: `MB Skill.show_in_student_app`
3. Active status: `MB Skill.is_active`
4. Empty-skill UX guard: `MB Settings.show_only_skills_with_questions`

## 5) KPI definitions
- `total_students`: active student profiles
- `active_today`: distinct students with sessions today
- `sessions_today`: session count today
- `total_attempts_today`: attempt logs today
- `avg_accuracy_7d`: average session accuracy (last 7 days)
- `top_5_skills_by_attempts_7d`: most attempted skills
- `weakest_5_skills_by_accuracy_7d`: low-accuracy skills (thresholded)
- `sessions_by_day_7d`: daily sessions trend
- `accuracy_by_domain_7d`: per-domain accuracy trend

## 6) Smoke test checklist (teacher + student)
1. `bench --site site1.yemenfrappe.com migrate`
2. `npm --prefix /home/frappe/frappe-bench/apps/math_bell/frontend run build`
3. API checks:
   - `bench --site site1.yemenfrappe.com execute math_bell.api.bootstrap.get_bootstrap`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.teacher_kpis`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_list`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_detail --kwargs "{'student_id':'4pu5djallg'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.class_detail --kwargs "{'class_group':'i708t8lfu7'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.analytics.student_home --kwargs "{'student_id':'4pu5djallg'}"`
   - `bench --site site1.yemenfrappe.com execute math_bell.api.teacher.get_settings`
4. UI checks:
   - `https://site1.yemenfrappe.com/math-bell-games`
   - Teacher mode passcode works
   - Teacher dashboard/students/settings screens load
   - Student dashboard shows recommendation + target + progress

## 7) Commits and hashes
- `c78c37b` — feat: add mb settings for system control
- `c51c65c` — feat: enforce settings and visibility rules in bootstrap
- `4d43fc1` — feat: add analytics api for teacher dashboards
- `e2962df` — feat: add teacher kpi dashboard and charts
- `27d0269` — feat: add teacher students list with filters
- `5744618` — feat: add student detail analytics view
- `51a7dd3` — feat: add teacher settings page and engine toggles
- `0ba01bc` — feat: add smart student dashboard insights
