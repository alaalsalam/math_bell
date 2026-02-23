# Math Bell — Handoff Summary (Phase 5B)

## What was added
- Backend APIs:
  - `math_bell.api.teacher.get_teacher_overview`
  - `math_bell.api.teacher.create_class`
  - `math_bell.api.teacher.list_students`
  - `math_bell.api.teacher.student_report`
  - `math_bell.api.teacher.class_report`
- Curriculum seed patch:
  - `math_bell/patches/seed_curriculum_v1.py`
  - registered in `math_bell/patches.txt` as `math_bell.patches.seed_curriculum_v1`
  - seeds Grade 1/2 + Domains + 27 skills + 270 MCQ questions + 27 micro lessons
- Frontend teacher screens/routes:
  - `/#/teacher` (overview + create class)
  - `/#/teacher/class/:classId` (class details + class report + students list)
  - `/#/teacher/student/:studentId` (student report + domain breakdown)
- Teacher Mode (MVP):
  - Home link: `وضع المعلمة`
  - passcode prompt: `1234`
  - localStorage key: `mb_teacher_mode`

## How to access teacher mode
1. Open `https://site1.yemenfrappe.com/math-bell-games`.
2. From home, click `وضع المعلمة`.
3. Enter passcode `1234`.
4. You are routed to `/#/teacher`.
5. To exit, click `إغلاق وضع المعلمة`.

## How to run seed patch / how to confirm seeded skills
- Patch runs via migrate:
  - `bench --site site1.yemenfrappe.com migrate`
- Confirm seed counts:
  - `bench --site site1.yemenfrappe.com execute frappe.client.get_count --kwargs "{'doctype':'MB Skill'}"` (expected: `27`)
  - `bench --site site1.yemenfrappe.com execute frappe.client.get_count --kwargs "{'doctype':'MB Question Bank'}"` (expected: `270`)
  - `bench --site site1.yemenfrappe.com execute frappe.client.get_count --kwargs "{'doctype':'MB Lesson'}"` (expected: `27`)

## URLs and smoke test steps
- App URL:
  - `https://site1.yemenfrappe.com/math-bell-games`
- Smoke test:
  1. Login as student and ensure learning flow still works (grade -> domain -> skills -> session -> report).
  2. Enter teacher mode (`1234`) and open `/#/teacher`.
  3. Create a class and verify generated `join_code` appears.
  4. Open class details and verify class report loads.
  5. Open a student report and verify sessions summary, accuracy, attempts/correct, and per-domain breakdown.

## Next recommended phase
- Phase 5C: connect teacher filters/date ranges in UI, add session list per student, and harden teacher access beyond local passcode (roles/permissions + audit logging).

## Commits
- `c07fd75` — `feat: add teacher dashboard apis and reports`
- `c4feafb` — `feat: add curriculum seed patch v1`
- `74d7dae` — `feat: add teacher mode and dashboard screens`
- `bad58f4` — `feat: add class and student report views`
