import frappe
from math_bell.utils.settings import get_mb_settings


@frappe.whitelist(allow_guest=True)
def get_bootstrap():
    settings = get_mb_settings()
    enabled_engines = settings.get("enabled_game_engines") or ["mcq"]

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
            "`order` as skill_order",
            "mastery_threshold",
            "is_featured",
            "min_level_required",
        ],
        order_by="grade asc, domain asc, `order` asc, creation asc",
    )
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

    skill_map: dict[str, dict[str, list[dict]]] = {}
    question_count_map = {
        row.get("skill"): int(row.get("question_count") or 0) for row in skill_question_counts
    }
    for row in skills:
        grade_key = row.get("grade")
        domain_key = row.get("domain")
        question_count = question_count_map.get(row.get("name"), 0)
        if settings.get("show_only_skills_with_questions") and question_count <= 0:
            continue
        skill_map.setdefault(grade_key, {}).setdefault(domain_key, []).append(
            {
                "name": row.get("name"),
                "code": row.get("code"),
                "title_ar": row.get("title_ar"),
                "description_ar": row.get("description_ar"),
                "order": row.get("skill_order"),
                "mastery_threshold": row.get("mastery_threshold"),
                "is_featured": row.get("is_featured"),
                "min_level_required": row.get("min_level_required"),
                "question_count": question_count,
            }
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
                {
                    **row,
                    "question_count": question_count_map.get(row.get("name"), 0),
                }
                for row in skills
                if not settings.get("show_only_skills_with_questions")
                or question_count_map.get(row.get("name"), 0) > 0
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
            },
        },
    }
