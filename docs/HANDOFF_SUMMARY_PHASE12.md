# Math Bell — Handoff Summary (Phase 12)

## 1) What was added
- Predictive mastery storage:
  - `MB Student Profile.predictions_json` (Long Text JSON) stores per-skill forecast output.
- Forecast engine (deterministic + explainable):
  - New module: `math_bell/forecast/engine.py`
  - Computes per-skill `p_mastery`, `eta_sessions`, `risk`, `confidence`, and `reasons`.
- Forecast APIs:
  - `math_bell.api.forecast.get_student_forecast`
  - `math_bell.api.forecast.teacher_risk_overview`
- Analytics integration:
  - `math_bell.api.analytics.student_detail` now includes `forecast_summary`.
- Student dashboard enhancement:
  - New **Focus Today** block (`تركيز اليوم 🎯`) with 2 recommended skills and CTA buttons.
- Teacher dashboard enhancement:
  - New route/page: `/#/teacher/risk` for At-Risk students and At-Risk skills.
- Session quality-of-life:
  - `start_session` supports `question_count` (1..20), enabling quick 5-question practice.

## 2) Forecast formula and explainability
For each active student skill (filtered by grade):
- Features:
  - `accuracy_last_10`
  - `attempts_last_14d`
  - `avg_time_ms`
  - `streak_recent` (last successful sessions vs mastery threshold)
  - `mistake_top_1`
- Skill threshold:
  - Uses `MB Skill.mastery_threshold`.
- Score:
  - `score += (accuracy_last_10 - mastery_threshold) * 2.5`
  - `score += min(attempts_last_14d, 20)/20 * 0.8`
  - `score += streak bonus`
  - `score += time adjustment`
  - `score -= mistake_penalty`
- Probability:
  - `p_mastery = sigmoid(score)` then clamped `[0,1]`.
- ETA:
  - `0` if already at/above mastery threshold.
  - Else `ceil((mastery_threshold - accuracy_last_10) * 10)` clamped `1..10`.
- Explainability reasons include:
  - `low_accuracy`, `low_practice`, and top mistake (e.g. `carry_missed`, `borrow_missed`, `fraction_parts`).

## 3) Risk thresholds
- `high`:
  - `p_mastery < 0.35`
  - OR `accuracy_last_10 < 0.45` with `attempts_last_14d >= 8`
- `medium`:
  - `0.35 <= p_mastery <= 0.6`
- `low`:
  - `p_mastery > 0.6`

## 4) APIs and routes
### Backend APIs
- `math_bell.api.forecast.get_student_forecast(student_id)`
  - Returns top predictions by risk, `focus_today` (2 skills), and risk counts.
- `math_bell.api.forecast.teacher_risk_overview()`
  - Returns:
    - `at_risk_students` (top 10)
    - `at_risk_skills` (top 10)
    - `distribution` (high/medium/low)
- `math_bell.api.analytics.student_detail(student_id)`
  - Adds `forecast_summary` (risk counts + top risk skills + focus_today).

### Frontend routes
- Existing dashboard route reused:
  - `/#/dashboard` now includes **Focus Today** section.
- New teacher route:
  - `/#/teacher/risk`

## 5) UI behavior delivered
- Student dashboard (`/#/dashboard`):
  - “تركيز اليوم 🎯” block with 2 forecasted skills.
  - CTA:
    - `ابدأ تدريب الآن`
    - `ابدأ تحدي سريع (5 أسئلة)` (via `question_count=5`).
- Teacher risk page (`/#/teacher/risk`):
  - At-risk students table: name, grade, risk level, top risk skill, last active, suggested intervention.
  - At-risk skills table: skill, students-at-risk count, top mistake type.

## 6) Commit log (Phase 12)
- `44a91b2` — feat: add predictions json storage
- `0ccb585` — feat: add predictive mastery forecast engine
- `11dbad8` — feat: add forecast apis and integrate with analytics
- `a9d1106` — feat: add focus today block using forecast
- `5686636` — feat: add teacher risk dashboard and intervention suggestions

## 7) Smoke tests
1. Student forecast API:
- `GET/POST /api/method/math_bell.api.forecast.get_student_forecast?student_id=<id>`
- Expect top risk skills + `focus_today` (2 items).

2. Teacher risk overview API:
- `GET/POST /api/method/math_bell.api.forecast.teacher_risk_overview`
- Expect non-empty `at_risk_students` and `distribution`.

3. Student detail analytics:
- `GET/POST /api/method/math_bell.api.analytics.student_detail?student_id=<id>`
- Expect `forecast_summary` included.

4. Focus Today CTA:
- Open `/#/dashboard`, click `ابدأ تدريب الآن` on a focus skill.
- Verify session starts for the selected skill.

5. Quick challenge CTA:
- Click `ابدأ تحدي سريع (5 أسئلة)`.
- Verify `start_session` response reports `question_count: 5`.

6. Teacher risk page:
- Open `/#/teacher/risk`.
- Verify at-risk tables load and refresh button works.

## 8) Scheduler note
- Daily scheduler refresh was **not added** in this phase.
- Forecast currently computes on-demand through forecast APIs (lightweight and acceptable for MVP).
