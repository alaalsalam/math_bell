# Math Bell — Handoff Summary (Phase 10)

## 1) What was added
- Extended `MB Attempt Log` with:
  - `mistake_type`
  - `hint_text`
  - `hint_used_count`
- Added deterministic hint engine:
  - `math_bell/hints/engine.py`
- Updated `submit_attempt` to:
  - detect wrong-answer mistake type
  - return Arabic hint text (Saudi-friendly tone)
  - persist hint + mistake metadata in Attempt Log
- Frontend Runner updates:
  - `تلميح 💡` button (max 2 hints/session)
  - local pre-answer hint bubble
  - wrong-answer hint bubble from backend
  - lightweight badges for common mistakes
- Teacher analytics updates:
  - `top_mistakes_last_7d`
  - `recommended_focus`
  - shown in teacher student detail page

## 2) Mistake types tracked
- `none`
- `off_by_one`
- `carry_missed`
- `borrow_missed`
- `place_value`
- `sign_confusion`
- `fraction_parts`
- `fraction_compare`
- `random`

## 3) Hint examples by generator
- `addition_range` / `subtraction_range`
  - off-by-one: `قريب مره يا بطل! راجع العد واحد واحد 👌`
  - sign confusion: `انتبه يا نجم: هذا جمع/طرح مو العكس 😉`
- `vertical_add`
  - carry missed: `تذكّر تحمل الواحد للخانة اللي بعدها 🔟➕1`
  - place value: `ركز على خانة الآحاد والعشرات 👀`
- `vertical_sub`
  - borrow missed: `إذا الرقم فوق أصغر… نستلف من اللي قبله 😉`
  - place value: `ثبت الأعمدة وابدأ من خانة الآحاد 👀`
- `fraction_basic`
  - parts confusion: `فوق كم جزء أخذنا… وتحت كم جزء بالمجموع 🍕`
- `fraction_compare`
  - same denominator: `لما المقامات متساوية… قارن البسطين مباشرة 👀`
  - different denominator: `جرب تتخيل نفس البيتزا… أيهم أكبر؟ 🍕`

All hints append a deterministic Saudi-style ending phrase.

## 4) submit_attempt response contract change
`/api/method/math_bell.api.sessions.submit_attempt`

Now returns in `message.data`:
- `session_id`
- `stats`
- `is_correct`
- `hint_text` (string; empty when correct)
- `mistake_type` (string; `none` when correct)

New accepted input:
- `hint_used_count` (int)

## 5) Teacher screen updates
Updated page:
- `frontend/src/pages/TeacherStudentPage.jsx`

New blocks:
- `أكثر أخطاء شائعة (آخر 7 أيام)`
- `اقتراح تدريب`

Data sources:
- `math_bell.api.analytics.student_detail`
- `math_bell.api.teacher.student_report`

## 6) Smoke tests
1. Start session and answer wrong:
   - confirm `submit_attempt` returns `mistake_type` + `hint_text`.
2. Check DB record:
   - `MB Attempt Log` row contains `mistake_type`, `hint_text`, `hint_used_count`.
3. In Runner:
   - click `تلميح 💡` before answering.
   - confirm local hint bubble appears.
   - confirm max 2 hints/session enforced.
4. Answer wrong after using hint:
   - confirm wrong sound + backend hint bubble appears.
   - confirm badges show for `off_by_one` / `place_value` when applicable.
5. Teacher analytics:
   - open student detail and confirm `top_mistakes_last_7d` + `recommended_focus` blocks render.

## 7) Commits
- `3e40810` — `feat: add mistake fields to attempt log`
- `e048780` — `feat: add deterministic hint engine`
- `3224618` — `feat: return hints and mistake types on wrong attempts`
- `9f085b5` — `feat: add hint button and hint UX in games`
- `2d5f7b8` — `feat: add mistake insights and recommendations to teacher analytics`

