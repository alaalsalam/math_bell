# Math Bell — Handoff Summary (UX World Phase 1)

## Routes Added / Updated
- Added student routes:
  - `/#/welcome`
  - `/#/world`
- Kept existing routes:
  - `/#/login`
  - `/#/play`
  - `/#/report/:sessionId`
- Updated behavior:
  - After login/register -> redirect to `/#/welcome`
  - `/#/` now redirects to `/#/welcome` for logged-in students
  - Unauthenticated student still redirects to `/#/login`

## World Region Mapping Logic
World map is built from existing `bootstrap.skills` (server filtering still respected):
- `غابة الجمع`:
  - `domain == Addition` OR `generator_type == addition_range`
- `بحر الطرح`:
  - `domain == Subtraction` OR `generator_type == subtraction_range`
- `قلعة العمودي`:
  - `generator_type in [vertical_add, vertical_sub]`
- `جزيرة الكسور`:
  - `domain == Fractions` OR `generator_type in [fraction_basic, fraction_compare]`

## UX Changes Implemented
- New welcome screen (`WelcomePage`):
  - Big greeting with student name
  - Primary CTA: `ابدأ المغامرة`
  - Subtle clouds animation
- New world map screen (`WorldMapPage`):
  - 4 playful region cards in 2x2 style
  - region progress: opened skills + mastered count
  - region modal with skill bubbles and state badges (👑 ✨ 🔒)
  - skill action modal:
    - `ابدأ تدريب`
    - `تحدي سريع (5 أسئلة)`
    - `حصة الجرس 🔔`
- New reusable student top bar (`StudentTopBar`):
  - avatar + name
  - home icon -> `/#/world`
  - logout icon
- Runner reskin (logic unchanged):
  - larger bubble choices
  - Saudi copy pack for feedback
  - correct/wrong phrase updates
  - respects settings toggles (`enable_sound`, `enable_confetti`, `enable_balloons`) loaded from bootstrap

## Commits
1. `d507508` — feat: add welcome and world map student experience
2. `3743c1c` — feat: add region skill modal and start session actions
3. `f66a84f` — feat: enhance session runner game feel for kids

## Smoke Test Checklist
1. Login as student -> redirected to `/#/welcome`
2. Click `ابدأ المغامرة` -> `/#/world` loads
3. Open `غابة الجمع` -> skill bubbles appear
4. Choose skill -> action modal appears
5. Start practice -> navigates to `/#/play` with correct params
6. Quick challenge uses `question_count=5`
7. Bell session uses bell mode and timer still works
8. Runner shows updated feedback feel and messages
9. Top bar home icon returns to `/#/world`

## Notes / Known UI Gaps
- Region card teaser text from `regionTeasers` is prepared but not yet surfaced visually.
- Old student routes (`/g/:grade`, `/g/:grade/d/:domain`, `/dashboard`) still exist for backward compatibility.
- Existing repo has unrelated generated asset diffs (`public/frontend`, `vite.config.js`, `patches.txt`) from prior phases and build outputs.
