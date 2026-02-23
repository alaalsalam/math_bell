# Math Bell — Handoff Summary (Phase 13)

## 1) Skill Graph fields (MB Skill)
Added on `MB Skill`:
- `prerequisites_json` (Long Text): JSON list of prerequisite skill codes
- `pack` (Link -> `MB Skill Pack`)
- `unlock_rule` (Select: `by_mastery`, `manual`; default `by_mastery`)

Also kept validation for:
- valid `unlock_rule`
- `prerequisites_json` must be valid JSON array

## 2) Pack model (MB Skill Pack)
New DocType: `MB Skill Pack`
Fields:
- `title` (Data)
- `grade` (Link `MB Grade`)
- `domain` (Link `MB Domain`)
- `is_enabled` (Check, default 1)
- `description_ar` (Small Text)
- `order` (Int)

## 3) Curriculum Builder APIs
New backend module: `math_bell/api/curriculum.py`

Endpoints:
- `math_bell.api.curriculum.list_packs(grade=None, domain=None)`
  - returns packs + skills list for each pack
- `math_bell.api.curriculum.toggle_pack(pack_id, is_enabled)`
  - enable/disable pack
- `math_bell.api.curriculum.generate_pack(payload)`
  - creates pack + generated skills + prerequisites graph
- `math_bell.api.curriculum.toggle_skill_visibility(skill_id, show_in_student_app)`
  - quick hide/show skill in student app

### generate_pack payload example
```json
{
  "grade": "1",
  "domain": "Addition",
  "title": "باقة الجمع (أساسية)",
  "skills": [
    {
      "code_prefix": "G1_ADD_AUTO",
      "count": 10,
      "generator_type": "addition_range",
      "difficulty_min": 1,
      "difficulty_max": 3
    }
  ],
  "graph": {
    "mode": "linear",
    "prereq_step": 1
  }
}
```

## 4) Unlocking changes (graph + packs)
Implemented shared graph logic in `math_bell/utils/skill_graph.py`:
- `evaluate_unlocks(student_id, ...)`
  - loads active skills
  - filters out disabled packs
  - evaluates prerequisites from `prerequisites_json`
  - applies `unlock_rule` (`manual` uses explicit unlock flag, `by_mastery` auto rule)
  - persists unlock map in `skill_levels_json`

Updated:
- `math_bell.api.sessions.end_session`
  - now runs `evaluate_unlocks` after progress update
  - returns `unlocked_skills` + `unlocked_count`
- `math_bell.api.bootstrap.get_bootstrap`
  - filters by enabled packs
  - for logged-in student, only exposes graph-eligible unlocked skills

## 5) Teacher screens (Curriculum Builder)
New route:
- `/#/teacher/curriculum`

New page:
- `frontend/src/pages/TeacherCurriculumPage.jsx`

Features:
- list packs with grade/domain filters
- toggle pack enable/disable
- create new pack wizard:
  - grade/domain/title
  - generator type
  - count
  - difficulty min/max
  - graph mode + prereq step
- pack detail table shows skills + prerequisites
- quick action hide/show each skill (`show_in_student_app`)

Navigation updated from teacher dashboard:
- added link: `باني المنهج`

## 6) Commits (Phase 13)
- `2367e93` — feat: add prerequisites and pack fields to skills
- `c018d94` — feat: add skill pack doctype
- `afedff2` — feat: add curriculum builder apis and generators
- `43743a3` — feat: make unlocking prerequisites-aware and pack-aware
- `2e0dc36` — feat: add teacher curriculum builder screens

## 7) Smoke tests
1. Create pack:
- call `generate_pack` with linear graph
- confirm pack + generated skills returned

2. List packs:
- call `list_packs`
- confirm skills_count and prerequisites show correctly

3. Toggle pack:
- call `toggle_pack(pack_id, 0)` then `toggle_pack(pack_id, 1)`
- confirm status flips successfully

4. Toggle skill visibility:
- call `toggle_skill_visibility(skill_id, 0/1)`
- confirm reflected in `list_packs` output

5. Bootstrap graph behavior:
- call `get_bootstrap(student_id=...)`
- verify returned skills are filtered by enabled packs and unlock rules

6. UI test:
- open `/#/teacher/curriculum`
- create a pack from wizard
- toggle pack/skill and verify updates without page errors
