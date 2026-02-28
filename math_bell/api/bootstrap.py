import frappe
from math_bell.utils.settings import get_mb_settings
from math_bell.api.helpers import resolve_grade_link_name
from math_bell.utils.runtime_bootstrap import ensure_runtime_catalog
from math_bell.utils.skill_graph import evaluate_unlocks, filter_enabled_pack_skills


def _as_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_json_dict(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        import json

        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _load_student_skill_state(student_id: str | None) -> tuple[int, dict]:
    if not student_id or not frappe.db.exists("MB Student Profile", student_id):
        return 0, {}
    student = frappe.db.get_value(
        "MB Student Profile",
        student_id,
        ["level", "skill_levels_json"],
        as_dict=True,
    )
    if not student:
        return 0, {}
    return _as_int(student.get("level"), 1), _parse_json_dict(student.get("skill_levels_json"))


def _is_mastered(entry: dict, threshold: float) -> bool:
    attempts = _as_int(entry.get("attempts"), 0)
    if attempts <= 0:
        return False
    try:
        accuracy = float(entry.get("accuracy") or 0)
    except Exception:
        accuracy = 0
    return accuracy >= float(threshold or 0.7)


@frappe.whitelist(allow_guest=True)
def get_bootstrap(student_id: str | None = None):
    student_id = (student_id or "").strip() or None
    target_grade_code = "1"
    if student_id and frappe.db.exists("MB Student Profile", student_id):
        student_grade = frappe.db.get_value("MB Student Profile", student_id, "grade")
        try:
            _, target_grade_code = resolve_grade_link_name(student_grade, auto_create=True)
        except Exception:
            target_grade_code = "1"
    ensure_runtime_catalog(target_grade_code)

    settings = get_mb_settings()
    enabled_engines = settings.get("enabled_game_engines") or ["mcq"]
    student_level, student_skill_levels = _load_student_skill_state(student_id)
    use_locking = bool(student_id and frappe.db.exists("MB Student Profile", student_id))
    unlock_state = {}
    # Important: keep the unlock set returned by evaluate_unlocks.
    # Resetting it here hides all skills for new students.
    # visible_skill_names = set()
    if use_locking:
        unlock_state = evaluate_unlocks(student_id=student_id, persist=False)
        visible_skill_names = set(unlock_state.get("visible_skill_names") or [])

    grades = frappe.get_all(
        "MB Grade",
        filters={"is_active": 1},
        fields=["name", "grade", "title_ar"],
        order_by="grade asc",
    )
    domains = frappe.get_all(
        "MB Domain",
        filters={"is_active": 1},
        fields=["name", "domain", "title_ar", "icon"],
        order_by="domain asc",
    )
    skills = frappe.get_all(
        "MB Skill",
        filters={"is_active": 1, "show_in_student_app": 1},
        fields=[
            "name",
            "code",
            "grade",
            "domain",
            "title_ar",
            "description_ar",
            "order as skill_order",
            "mastery_threshold",
            "is_featured",
            "min_level_required",
            "adaptive_enabled",
            "generator_type",
            "prerequisites_json",
            "unlock_rule",
            "pack",
            "creation",
        ],
        order_by="grade asc, domain asc, creation asc",
    )
    skills.sort(
        key=lambda row: (
            str(row.get("grade") or ""),
            str(row.get("domain") or ""),
            _as_int(row.get("skill_order"), 0),
            str(row.get("creation") or ""),
        )
    )
    skills = filter_enabled_pack_skills(skills)
    skill_question_counts = frappe.get_all(
        "MB Question Bank",
        filters={"is_active": 1},
        fields=["skill", "count(name) as question_count"],
        group_by="skill",
        limit_page_length=500,
    )
    templates = frappe.get_all(
        "MB Game Template",
        filters={"is_active": 1, "engine_key": ["in", enabled_engines]},
        fields=["name", "code", "title_ar", "engine_key"],
        order_by="creation asc",
    )

    question_count_map: dict[str, int] = {
        row.get("skill"): int(row.get("question_count") or 0) for row in skill_question_counts
    }
    has_any_question_rows = any((count or 0) > 0 for count in question_count_map.values())
    grouped_skills: dict[tuple[str, str], list[dict]] = {}
    for row in skills:
        grouped_skills.setdefault((row.get("grade"), row.get("domain")), []).append(row)

    visible_skill_names = set()
    skill_map: dict[str, dict[str, list[dict]]] = {}
    visible_skills: list[dict] = []
    for (grade_key, domain_key), rows in grouped_skills.items():
        for index, row in enumerate(rows):
            skill_name = row.get("name")
            skill_code = row.get("code")
            question_count = question_count_map.get(skill_name, 0)
            has_generated_content = _as_bool(row.get("adaptive_enabled")) and (
                (row.get("generator_type") or "static") != "static"
            )
            # If question bank is empty on this site, do not hide all skills.
            if (
                settings.get("show_only_skills_with_questions")
                and has_any_question_rows
                and question_count <= 0
                and not has_generated_content
            ):
                continue

            entry = {}
            if isinstance(student_skill_levels, dict):
                entry = student_skill_levels.get(skill_code) or student_skill_levels.get(skill_name) or {}

            min_level_required = _as_int(row.get("min_level_required"), 1)
            explicit_unlocked = _as_bool(entry.get("unlocked")) if isinstance(entry, dict) else False
            mastered = _is_mastered(entry if isinstance(entry, dict) else {}, row.get("mastery_threshold") or 0.7)

            if use_locking:
                # Locking mode depends on precomputed visibility from skill graph.
                unlocked = skill_name in visible_skill_names
            else:
                unlocked = True

            if use_locking and not unlocked:
                continue

            skill_item = {
                "name": skill_name,
                "code": skill_code,
                "title_ar": row.get("title_ar"),
                "description_ar": row.get("description_ar"),
                "order": row.get("skill_order"),
                "mastery_threshold": row.get("mastery_threshold"),
                "is_featured": row.get("is_featured"),
                "min_level_required": min_level_required,
                "question_count": question_count,
                "generated_content": has_generated_content,
                "is_unlocked": unlocked,
                "is_mastered": mastered,
                "unlock_rule": row.get("unlock_rule"),
                "pack": row.get("pack"),
                "prerequisites_json": row.get("prerequisites_json"),
                "is_manual_unlocked": explicit_unlocked,
            }
            visible_skill_names.add(skill_name)
            visible_skills.append({**row, **skill_item})
            skill_map.setdefault(grade_key, {}).setdefault(domain_key, []).append(skill_item)

    for grade_key, domain_data in skill_map.items():
        for domain_key in domain_data:
            domain_data[domain_key] = sorted(
                domain_data[domain_key], key=lambda item: (_as_int(item.get("order"), 0), item.get("name") or "")
            )

    skills_tree = []
    for grade in grades:
        domain_nodes = []
        for domain in domains:
            domain_nodes.append(
                {
                    "name": domain.get("name"),
                    "domain": domain.get("domain"),
                    "title_ar": domain.get("title_ar"),
                    "icon": domain.get("icon"),
                    "skills": skill_map.get(grade.get("name"), {}).get(domain.get("name"), []),
                }
            )
        skills_tree.append(
            {
                "name": grade.get("name"),
                "grade": grade.get("grade"),
                "title_ar": grade.get("title_ar"),
                "domains": domain_nodes,
            }
        )

    return {
        "ok": True,
        "data": {
            "grades": grades,
            "domains": domains,
            "skills": [
                row
                for row in visible_skills
            ],
            "skills_tree": skills_tree,
            "game_templates": templates,
            "settings": {
                "default_bell_duration_seconds": settings.get("default_bell_duration_seconds"),
                "default_questions_per_session": settings.get("default_questions_per_session"),
                "enable_sound": settings.get("enable_sound"),
                "enable_confetti": settings.get("enable_confetti"),
                "enable_balloons": settings.get("enable_balloons"),
                "allow_guest_play": settings.get("allow_guest_play"),
                "show_only_skills_with_questions": settings.get("show_only_skills_with_questions"),
                "enabled_game_engines": enabled_engines,
                "student_level": student_level if use_locking else None,
            },
        },
    }
