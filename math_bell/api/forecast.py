from __future__ import annotations

import frappe
from frappe import _

from math_bell.api.helpers import parse_doc_json
from math_bell.api.planner import ensure_current_week_plan
from math_bell.forecast import forecast_student


_RISK_ORDER = {"high": 0, "medium": 1, "low": 2}
_INTERVENTION_SUGGESTIONS = {
    "carry_missed": "خله يركز على الحمل: 5 أسئلة عمودي سهلة ثم صعبة",
    "borrow_missed": "خله يطبق الاستلاف خطوة بخطوة مع أمثلة قصيرة",
    "fraction_parts": "تدريب: عد الأجزاء المظللة ثم اكتب الكسر",
    "fraction_compare": "قارن الكسور باستخدام نفس الشكل قبل اختيار الرمز",
    "place_value": "راجع الآحاد والعشرات ثم حل عموديًا ببطء",
    "sign_confusion": "ثبّت الفرق بين الجمع والطرح بسؤالين تمهيديين",
    "off_by_one": "راجع العد واحد واحد وتأكد من آخر خطوة",
}


def _sorted_predictions(predictions_map: dict) -> list[dict]:
    rows = []
    for code, payload in (predictions_map or {}).items():
        if not isinstance(payload, dict):
            continue
        rows.append(
            {
                "skill_code": code,
                "skill": payload.get("skill") or code,
                "title_ar": payload.get("title_ar") or code,
                "p_mastery": float(payload.get("p_mastery") or 0),
                "eta_sessions": int(payload.get("eta_sessions") or 0),
                "risk": payload.get("risk") or "low",
                "confidence": float(payload.get("confidence") or 0),
                "reasons": payload.get("reasons") or [],
                "mistake_top_1": payload.get("mistake_top_1"),
                "accuracy_last_10": float(payload.get("accuracy_last_10") or 0),
            }
        )
    rows.sort(key=lambda row: (_RISK_ORDER.get(row["risk"], 9), row["p_mastery"], -row["eta_sessions"]))
    return rows


def _focus_today_from_predictions(student_id: str, ordered_predictions: list[dict], limit=2) -> list[dict]:
    if not ordered_predictions:
        return []

    planned_skills = []
    try:
        weekly_plan = ensure_current_week_plan(student_id)
        plan = weekly_plan.get("plan") if isinstance(weekly_plan, dict) else {}
        for day_no in [1, 2, 3, 4, 5]:
            day = plan.get(f"day_{day_no}") if isinstance(plan, dict) else {}
            skill = day.get("skill") if isinstance(day, dict) else None
            if skill:
                planned_skills.append(skill)
    except Exception:
        planned_skills = []

    picked = []
    used = set()
    for row in ordered_predictions:
        if row["risk"] == "low":
            continue
        if row["skill"] in planned_skills and row["skill"] not in used:
            picked.append(row)
            used.add(row["skill"])
        if len(picked) >= limit:
            break
    if len(picked) < limit:
        for row in ordered_predictions:
            if row["risk"] == "low":
                continue
            if row["skill"] in used:
                continue
            picked.append(row)
            used.add(row["skill"])
            if len(picked) >= limit:
                break
    if len(picked) < limit:
        for row in ordered_predictions:
            if row["skill"] in used:
                continue
            picked.append(row)
            used.add(row["skill"])
            if len(picked) >= limit:
                break
    return picked[:limit]


def compute_student_forecast_payload(student_id: str, refresh=True, limit=10) -> dict:
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))
    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    predictions_map = forecast_student(student_id) if refresh else parse_doc_json(
        frappe.db.get_value("MB Student Profile", student_id, "predictions_json")
    )
    ordered = _sorted_predictions(predictions_map)
    top_by_risk = ordered[: max(int(limit or 10), 1)]
    focus_today = _focus_today_from_predictions(student_id, ordered, limit=2)

    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for row in ordered:
        risk_counts[row["risk"]] = int(risk_counts.get(row["risk"], 0)) + 1

    return {
        "student_id": student_id,
        "predictions": top_by_risk,
        "focus_today": focus_today,
        "risk_counts": risk_counts,
    }


@frappe.whitelist(allow_guest=True)
def get_student_forecast(student_id: str):
    payload = compute_student_forecast_payload(student_id=student_id, refresh=True, limit=10)
    return {"ok": True, "data": payload}


@frappe.whitelist(allow_guest=True)
def teacher_risk_overview():
    students = frappe.get_all(
        "MB Student Profile",
        filters={"is_active": 1},
        fields=["name", "display_name", "grade", "avatar_emoji", "last_login"],
        order_by="modified desc",
        limit_page_length=500,
    )

    at_risk_students = []
    skill_risk_map = {}
    distribution = {"high": 0, "medium": 0, "low": 0}

    for student in students:
        payload = compute_student_forecast_payload(student_id=student.get("name"), refresh=True, limit=10)
        distribution["high"] += int(payload.get("risk_counts", {}).get("high", 0))
        distribution["medium"] += int(payload.get("risk_counts", {}).get("medium", 0))
        distribution["low"] += int(payload.get("risk_counts", {}).get("low", 0))

        top = payload.get("predictions", [])
        risky = [row for row in top if row.get("risk") in {"high", "medium"}]
        if risky:
            top_risk = risky[0]
            at_risk_students.append(
                {
                    "student_id": student.get("name"),
                    "display_name": student.get("display_name"),
                    "avatar_emoji": student.get("avatar_emoji"),
                    "grade": student.get("grade"),
                    "risk_level": top_risk.get("risk"),
                    "top_risk_skill": top_risk.get("skill"),
                    "top_risk_skill_title_ar": top_risk.get("title_ar"),
                    "last_active": student.get("last_login"),
                    "suggestion": _INTERVENTION_SUGGESTIONS.get(
                        top_risk.get("mistake_top_1"),
                        "خطة تدخل: 5 أسئلة ممارسة + مراجعة خطوة بخطوة",
                    ),
                }
            )

            skill_key = top_risk.get("skill") or top_risk.get("skill_code")
            entry = skill_risk_map.setdefault(
                skill_key,
                {
                    "skill": skill_key,
                    "title_ar": top_risk.get("title_ar") or skill_key,
                    "students_at_risk": 0,
                    "top_mistake_type": top_risk.get("mistake_top_1") or "random",
                },
            )
            entry["students_at_risk"] += 1

    at_risk_students.sort(key=lambda row: (_RISK_ORDER.get(row["risk_level"], 9), row["display_name"] or ""))
    at_risk_students = at_risk_students[:10]

    at_risk_skills = sorted(
        skill_risk_map.values(),
        key=lambda row: (-int(row.get("students_at_risk") or 0), row.get("skill") or ""),
    )[:10]

    return {
        "ok": True,
        "data": {
            "at_risk_students": at_risk_students,
            "at_risk_skills": at_risk_skills,
            "distribution": distribution,
        },
    }

