from __future__ import annotations

import frappe

from math_bell.api.helpers import resolve_grade_link_name


_GRADE_TITLES = {
    "1": "الصف الأول",
    "2": "الصف الثاني",
}

_DOMAIN_DEFAULTS = [
    {"domain": "Addition", "title_ar": "غابة الجمع", "icon": "🌳"},
    {"domain": "Subtraction", "title_ar": "بحر الطرح", "icon": "🌊"},
    {"domain": "Fractions", "title_ar": "جزيرة الكسور", "icon": "🏝️"},
]

_DEFAULT_SKILLS = {
    "1": [
        {
            "code": "G1_ADD_001",
            "domain": "Addition",
            "title_ar": "جمع حتى 10",
            "description_ar": "نجمع رقمين صغيرين بخطوات ممتعة",
            "order": 10,
            "generator_type": "addition_range",
            "difficulty_min": 1,
            "difficulty_max": 3,
        },
        {
            "code": "G1_SUB_001",
            "domain": "Subtraction",
            "title_ar": "طرح حتى 10",
            "description_ar": "نطرح أعدادًا صغيرة بسهولة",
            "order": 20,
            "generator_type": "subtraction_range",
            "difficulty_min": 1,
            "difficulty_max": 3,
        },
        {
            "code": "G1_ADD_002",
            "domain": "Addition",
            "title_ar": "جمع عمودي بسيط",
            "description_ar": "تدريب أولي على الجمع العمودي",
            "order": 30,
            "generator_type": "vertical_add",
            "difficulty_min": 1,
            "difficulty_max": 2,
        },
        {
            "code": "G1_SUB_002",
            "domain": "Subtraction",
            "title_ar": "طرح عمودي بسيط",
            "description_ar": "تدريب أولي على الطرح العمودي",
            "order": 40,
            "generator_type": "vertical_sub",
            "difficulty_min": 1,
            "difficulty_max": 2,
        },
        {
            "code": "G1_FRA_001",
            "domain": "Fractions",
            "title_ar": "الكسور الأساسية",
            "description_ar": "نتعرف على نصف وثلث وربع",
            "order": 50,
            "generator_type": "fraction_basic",
            "difficulty_min": 1,
            "difficulty_max": 2,
        },
        {
            "code": "G1_FRA_002",
            "domain": "Fractions",
            "title_ar": "مقارنة الكسور",
            "description_ar": "نقارن بين كسور بسيطة بصريًا",
            "order": 60,
            "generator_type": "fraction_compare",
            "difficulty_min": 1,
            "difficulty_max": 2,
        },
    ],
    "2": [
        {
            "code": "G2_ADD_001",
            "domain": "Addition",
            "title_ar": "جمع حتى 100",
            "description_ar": "جمع أعداد أكبر بثقة",
            "order": 10,
            "generator_type": "addition_range",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
        {
            "code": "G2_SUB_001",
            "domain": "Subtraction",
            "title_ar": "طرح حتى 100",
            "description_ar": "طرح أعداد أكبر بخطوات واضحة",
            "order": 20,
            "generator_type": "subtraction_range",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
        {
            "code": "G2_ADD_002",
            "domain": "Addition",
            "title_ar": "جمع عمودي",
            "description_ar": "جمع عمودي مع حمل تدريجي",
            "order": 30,
            "generator_type": "vertical_add",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
        {
            "code": "G2_SUB_002",
            "domain": "Subtraction",
            "title_ar": "طرح عمودي",
            "description_ar": "طرح عمودي مع استلاف تدريجي",
            "order": 40,
            "generator_type": "vertical_sub",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
        {
            "code": "G2_FRA_001",
            "domain": "Fractions",
            "title_ar": "بناء الكسور",
            "description_ar": "نركب الكسر من الشكل",
            "order": 50,
            "generator_type": "fraction_basic",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
        {
            "code": "G2_FRA_002",
            "domain": "Fractions",
            "title_ar": "مقارنة كسور متقدمة",
            "description_ar": "نختار الكسر الأكبر أو الأصغر",
            "order": 60,
            "generator_type": "fraction_compare",
            "difficulty_min": 2,
            "difficulty_max": 4,
        },
    ],
}


def _to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _ensure_grade(grade_code: str) -> str:
    grade_name, _ = resolve_grade_link_name(grade_code, auto_create=True)
    frappe.db.set_value("MB Grade", grade_name, "is_active", 1, update_modified=False)
    return grade_name


def _ensure_domain(domain_code: str, title_ar: str, icon: str):
    if frappe.db.exists("MB Domain", domain_code):
        frappe.db.set_value("MB Domain", domain_code, "is_active", 1, update_modified=False)
        if title_ar:
            frappe.db.set_value("MB Domain", domain_code, "title_ar", title_ar, update_modified=False)
        if icon:
            frappe.db.set_value("MB Domain", domain_code, "icon", icon, update_modified=False)
        return

    frappe.get_doc(
        {
            "doctype": "MB Domain",
            "domain": domain_code,
            "title_ar": title_ar,
            "icon": icon,
            "is_active": 1,
        }
    ).insert(ignore_permissions=True)


def _activate_existing_grade_skills(grade_name: str):
    existing = frappe.get_all(
        "MB Skill",
        filters={"grade": grade_name},
        fields=["name", "is_active", "show_in_student_app"],
        limit_page_length=2000,
    )
    for row in existing:
        if _to_int(row.get("is_active"), 1) != 1:
            frappe.db.set_value("MB Skill", row.get("name"), "is_active", 1, update_modified=False)
        if _to_int(row.get("show_in_student_app"), 1) != 1:
            frappe.db.set_value("MB Skill", row.get("name"), "show_in_student_app", 1, update_modified=False)


def _visible_count_for_grade(grade_name: str) -> int:
    return int(
        frappe.db.count(
            "MB Skill",
            {"grade": grade_name, "is_active": 1, "show_in_student_app": 1},
        )
        or 0
    )


def _ensure_default_skills(grade_code: str, grade_name: str):
    for spec in _DEFAULT_SKILLS.get(grade_code, []):
        code = spec["code"]
        if frappe.db.exists("MB Skill", code):
            frappe.db.set_value("MB Skill", code, "is_active", 1, update_modified=False)
            frappe.db.set_value("MB Skill", code, "show_in_student_app", 1, update_modified=False)
            continue

        frappe.get_doc(
            {
                "doctype": "MB Skill",
                "code": code,
                "grade": grade_name,
                "domain": spec["domain"],
                "title_ar": spec["title_ar"],
                "description_ar": spec["description_ar"],
                "order": spec["order"],
                "mastery_threshold": 0.7,
                "is_active": 1,
                "show_in_student_app": 1,
                "min_level_required": 1,
                "generator_type": spec["generator_type"],
                "difficulty_min": spec["difficulty_min"],
                "difficulty_max": spec["difficulty_max"],
                "adaptive_enabled": 1,
                "prerequisites_json": "[]",
                "unlock_rule": "by_mastery",
            }
        ).insert(ignore_permissions=True)


def ensure_runtime_catalog(grade_code: str | None = None):
    target_grade_code = str(grade_code or "1").strip()
    if target_grade_code not in {"1", "2"}:
        target_grade_code = "1"

    for code, title in _GRADE_TITLES.items():
        grade_name = _ensure_grade(code)
        if title:
            frappe.db.set_value("MB Grade", grade_name, "title_ar", title, update_modified=False)

    for domain in _DOMAIN_DEFAULTS:
        _ensure_domain(domain["domain"], domain["title_ar"], domain["icon"])

    grade_name = _ensure_grade(target_grade_code)
    _activate_existing_grade_skills(grade_name)

    if _visible_count_for_grade(grade_name) == 0:
        _ensure_default_skills(target_grade_code, grade_name)
