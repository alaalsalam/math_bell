from __future__ import annotations

from dataclasses import dataclass

import frappe
from frappe.utils import add_days, getdate, now_datetime


@dataclass
class SkillRow:
    name: str
    code: str
    title_ar: str
    accuracy: float
    attempts: int
    skill_order: int


def _to_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def _to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def get_week_bounds(reference_date=None):
    date_ref = getdate(reference_date) if reference_date else getdate()
    week_start = add_days(date_ref, -date_ref.weekday())
    week_end = add_days(week_start, 6)
    return week_start, week_end


def _student_grade(student_id: str) -> str | None:
    return frappe.db.get_value("MB Student Profile", student_id, "grade")


def _skill_catalog(grade: str | None) -> list[SkillRow]:
    filters = {"is_active": 1, "show_in_student_app": 1}
    if grade:
        filters["grade"] = grade

    rows = frappe.get_all(
        "MB Skill",
        filters=filters,
        fields=["name", "code", "title_ar", "order"],
        order_by="grade asc, domain asc, `order` asc, creation asc",
        limit_page_length=500,
    )
    return [
        SkillRow(
            name=row.get("name"),
            code=row.get("code") or row.get("name"),
            title_ar=row.get("title_ar") or row.get("code") or row.get("name"),
            accuracy=0.0,
            attempts=0,
            skill_order=_to_int(row.get("order"), 999),
        )
        for row in rows
    ]


def _skill_performance_14d(student_id: str) -> list[SkillRow]:
    from_dt = add_days(getdate(), -14)
    rows = frappe.db.sql(
        """
        SELECT
            sk.name,
            sk.code,
            sk.title_ar,
            sk.`order` AS skill_order,
            COUNT(al.name) AS attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        INNER JOIN `tabMB Skill` sk ON sk.name = al.skill
        WHERE s.student = %(student_id)s
          AND al.creation >= %(from_dt)s
          AND sk.is_active = 1
          AND sk.show_in_student_app = 1
        GROUP BY sk.name, sk.code, sk.title_ar, sk.`order`
        ORDER BY sk.`order` ASC, sk.creation ASC
        """,
        {"student_id": student_id, "from_dt": from_dt},
        as_dict=True,
    )

    performance = []
    for row in rows:
        attempts = _to_int(row.get("attempts"), 0)
        correct = _to_int(row.get("correct"), 0)
        accuracy = round((correct / attempts), 4) if attempts else 0
        performance.append(
            SkillRow(
                name=row.get("name"),
                code=row.get("code") or row.get("name"),
                title_ar=row.get("title_ar") or row.get("code") or row.get("name"),
                accuracy=accuracy,
                attempts=attempts,
                skill_order=_to_int(row.get("skill_order"), 999),
            )
        )

    return performance


def _pick_first(rows: list[SkillRow], used: set[str]) -> SkillRow | None:
    for row in rows:
        if row.name not in used:
            used.add(row.name)
            return row
    return None


def _pick_with_fallback(primary: list[SkillRow], fallback: list[SkillRow], used: set[str]) -> SkillRow | None:
    row = _pick_first(primary, used)
    if row:
        return row
    return _pick_first(fallback, used)


def _as_plan_item(skill: SkillRow | None, focus: str) -> dict:
    return {
        "skill": skill.name if skill else None,
        "skill_code": skill.code if skill else None,
        "title_ar": skill.title_ar if skill else "مراجعة عامة",
        "focus": focus,
    }


def generate_weekly_plan(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw("student_id is required")

    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(f"Student '{student_id}' does not exist")

    grade = _student_grade(student_id)
    perf_rows = _skill_performance_14d(student_id)
    catalog = _skill_catalog(grade)

    weak = sorted([r for r in perf_rows if r.accuracy < 0.6], key=lambda x: (x.accuracy, -x.attempts, x.skill_order))
    medium = sorted(
        [r for r in perf_rows if 0.6 <= r.accuracy <= 0.8],
        key=lambda x: (abs(x.accuracy - 0.7), x.skill_order),
    )
    strong = sorted([r for r in perf_rows if r.accuracy > 0.8], key=lambda x: (-x.accuracy, x.skill_order))

    used = set()
    weak_1 = _pick_with_fallback(weak, catalog, used)
    weak_2 = _pick_with_fallback(weak, catalog, used)
    medium_1 = _pick_with_fallback(medium, catalog, used)
    strong_1 = _pick_with_fallback(strong, catalog, used)

    if not weak_2:
        weak_2 = weak_1
    if not medium_1:
        medium_1 = weak_1 or strong_1
    if not strong_1:
        strong_1 = medium_1 or weak_1

    week_start, week_end = get_week_bounds()

    return {
        "week_start": str(week_start),
        "week_end": str(week_end),
        "generated_at": now_datetime().isoformat(),
        "day_1": _as_plan_item(weak_1, "practice"),
        "day_2": _as_plan_item(weak_2, "practice"),
        "day_3": _as_plan_item(medium_1, "review"),
        "day_4": _as_plan_item(weak_1 or medium_1, "practice"),
        "day_5": _as_plan_item(strong_1, "challenge"),
    }
