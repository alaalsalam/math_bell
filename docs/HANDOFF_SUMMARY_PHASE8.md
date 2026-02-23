# Math Bell — Handoff Summary (Phase 8)

## 1) Badges added + rules
Implemented in `math_bell/badges/rules.py` with seed patch `math_bell/patches/seed_badges_v1.py`.

Badge rules:
- `FIRST_SESSION`: first ended session
- `STREAK_3`: student streak >= 3
- `STREAK_7`: student streak >= 7
- `PERFECT_10`: `accuracy = 1.0` and `attempts >= 10`
- `FRACTIONS_STAR`: 3 ended fraction sessions with accuracy >= 0.7
- `DAILY_CHAMP`: ended session marked `daily_challenge = true`

Awarding point:
- Triggered in `math_bell.api.sessions.end_session`
- New badges are returned in report as `earned_badges`

## 2) Daily challenge logic
Backend APIs:
- `math_bell.api.challenges.get_daily_challenge`
- `math_bell.api.challenges.start_daily_challenge`

Flow:
- Daily challenge target is picked from weakest/recommended skill
- Session starts as `practice` but tagged in `stats_json` with `daily_challenge=true`
- Runner uses challenge start endpoint when `daily_challenge=1` in route query
- Report shows challenge completion + new badges

Student UI:
- Dashboard section: `تحدي اليوم 🔥`
- Button: `ابدأ التحدي`

## 3) Leaderboard formula
Backend API:
- `math_bell.api.leaderboards.weekly_leaderboard`

Formula:
- `points = correct_answers_this_week + min(current_streak, 10)`

Returns:
- `leaderboard` (top 10)
- `top_improvers` (accuracy delta vs previous week)
- recent badges per ranked student

Teacher UI:
- Route `/#/teacher/leaderboard`
- Filters: grade + class
- Tables: top 10 + top improvers

Student UI:
- Dashboard shows top 5: `لوحة الشرف الأسبوعية 👑`

## 4) Weekly goal
Backend API:
- `math_bell.api.analytics.student_weekly_progress`

Returns:
- `attempts_this_week`
- `correct_this_week`
- `goal_weekly` (50)
- `achieved`

Student UI:
- Dashboard weekly journey card
- Progress bar: `attempts_this_week / 50`
- completion message: `يا سلام! ختمت هدف الأسبوع 🎉`

## 5) New screens/routes
- `/#/teacher/leaderboard` (new)
- Student dashboard enhanced (`/#/dashboard`)

Key frontend files:
- `frontend/src/pages/TeacherLeaderboardPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/RunnerPage.jsx`
- `frontend/src/pages/ReportPage.jsx`
- `frontend/src/saudi/challenge_messages.js`

Key backend files:
- `math_bell/api/challenges.py`
- `math_bell/api/leaderboards.py`
- `math_bell/badges/rules.py`
- `math_bell/api/sessions.py`
- `math_bell/api/analytics.py`

## 6) Commits and hashes
- `0c352aa` — feat: add badge rules and award on session end
- `0750eb7` — feat: add daily challenge flow
- `ad1ed11` — feat: add weekly leaderboards and top improvers
- `53e88cd` — feat: add weekly journey progress tracking
- `14f404b` — feat: add saudi motivational pack for challenges and leaderboards

## 7) Smoke test checklist
1. Run migrate on target site only:
   - `bench --site site1.yemenfrappe.com migrate`
2. Build frontend:
   - `npm --prefix /home/frappe/frappe-bench/apps/math_bell/frontend run build`
3. Badge sanity:
   - start/end a session then check `earned_badges` in `end_session` response
4. Daily challenge:
   - call `get_daily_challenge` then `start_daily_challenge`
   - ensure session contains `daily_challenge=true`
5. Leaderboards:
   - call `weekly_leaderboard` and verify points + top improvers payload
6. Weekly goal:
   - call `student_weekly_progress` and verify attempts/progress values
7. UI checks:
   - student dashboard shows challenge, top5 leaderboard, weekly goal progress
   - teacher leaderboard page loads with filters and ranking tables
