# Math Bell — Handoff Summary (Phase 9)

## 1) What was added
- Adaptive generator metadata on `MB Skill`:
  - `generator_type`
  - `difficulty_min`
  - `difficulty_max`
  - `adaptive_enabled`
- Deterministic procedural generator package:
  - `math_bell/generator/engine.py`
  - `math_bell/generator/difficulty.py`
  - `math_bell/generator/templates.py`
- `start_session` now supports dynamic generation when skill is adaptive.
- Server-side answer validation is enforced in `submit_attempt` (no frontend answer leakage).
- Student per-skill progression tracking added on `end_session`.
- Smart skill unlocking added (unlock next skill when mastery threshold is reached).
- Bootstrap filtering supports student-aware visibility (locked skills hidden when `student_id` provided).

## 2) Generator types implemented
- `addition_range`
- `subtraction_range`
- `vertical_add`
- `vertical_sub`
- `fraction_basic`
- `fraction_compare`
- `static` (fallback to MB Question Bank)

## 3) Adaptive rules and difficulty formula
- Base difficulty uses student per-skill level (from `skill_levels_json`) clamped to `[difficulty_min, difficulty_max]`.
- Last 5 accuracy adaptation:
  - `accuracy_last_5 >= 0.8` => difficulty +1
  - `accuracy_last_5 <= 0.4` => difficulty -1
  - otherwise => keep same
- Final difficulty always clamped to skill min/max.

## 4) New fields
### MB Skill
- `generator_type` (Select)
- `difficulty_min` (Int)
- `difficulty_max` (Int)
- `adaptive_enabled` (Check)

### MB Student Profile
- `skill_levels_json` (Long Text)

Example `skill_levels_json`:
```json
{
  "G1_ADD_001": {
    "level": 2,
    "attempts": 15,
    "correct": 11,
    "accuracy": 0.7333
  },
  "G1_ADD_002": {
    "unlocked": 1
  }
}
```

## 5) Sample generated question JSON
```json
{
  "question_ref": "GEN-a3269588a9-1",
  "skill": "G1_ADD_001",
  "difficulty": "2",
  "question": {
    "ui": "mcq",
    "text": "8 + 7 = ؟",
    "choices": [13, 15, 16, 11]
  }
}
```

## 6) Smoke test checklist
1. Start adaptive session for a skill with `adaptive_enabled=1` and non-`static` `generator_type`.
2. Confirm response has `generated=true` and questions returned without `answer_json`.
3. Submit wrong payload with forced `is_correct=1`; confirm backend returns `is_correct=0` when answer is wrong.
4. End session and verify `MB Student Profile.skill_levels_json` is updated for the skill code.
5. Achieve mastery (`accuracy >= mastery_threshold`) and confirm `end_session` report includes `unlocked_next=true` + next skill code.
6. Call bootstrap with `student_id`; confirm locked skills are not shown.

## 7) Commits in Phase 9
- `7bc58ce` — `feat: extend skill with generator metadata`
- `e81ec5e` — `feat: integrate adaptive generator into start_session`
- `dc0f276` — `feat: add per-skill adaptive progression tracking`
- `7caf1bc` — `feat: add smart skill unlocking`

## 8) Notes
- All migrations and sanity checks were executed on `site1.yemenfrappe.com` only.
- Web worker restart from this shell failed due missing `sudo supervisorctl` permission; CLI (`bench execute`) reflects latest backend code immediately.
