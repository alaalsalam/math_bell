from __future__ import annotations

import math

import frappe
from frappe.utils import add_days, getdate

from math_bell.api.helpers import parse_doc_json, to_json_string


MISTAKE_PENALTIES = {
    "carry_missed": 0.35,
    "borrow_missed": 0.35,
    "fraction_parts": 0.35,
    "fraction_compare": 0.25,
    "place_value": 0.2,
    "sign_confusion": 0.2,
    "off_by_one": 0.1,
    "random": 0.1,
}


def _clamp(value, min_v=0.0, max_v=1.0):
    return max(min_v, min(max_v, value))


def _to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _to_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def _risk_from(p_mastery: float, accuracy_last_10: float, attempts_last_14d: int) -> str:
    if p_mastery < 0.35 or (accuracy_last_10 < 0.45 and attempts_last_14d >= 8):
        return "high"
    if 0.35 <= p_mastery <= 0.6:
        return "medium"
    return "low"


def _skill_base_rows(student_id: str):
    grade = frappe.db.get_value("MB Student Profile", student_id, "grade")
    filters = {"is_active": 1, "show_in_student_app": 1}
    if grade:
        filters["grade"] = grade

    return frappe.get_all(
        "MB Skill",
        filters=filters,
        fields=["name", "code", "title_ar", "mastery_threshold", "order"],
        order_by="grade asc, domain asc, `order` asc, creation asc",
        limit_page_length=500,
    )


def _accuracy_last_10(student_id: str, skill_name: str):
    rows = frappe.db.sql(
        """
        SELECT al.is_correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND al.skill = %(skill)s
        ORDER BY al.creation DESC
        LIMIT 10
        """,
        {"student_id": student_id, "skill": skill_name},
        as_dict=True,
    )
    attempts = len(rows)
    correct = sum(1 for row in rows if _to_int(row.get("is_correct"), 0) == 1)
    return (round(correct / attempts, 4) if attempts else 0.0, attempts)


def _attempt_window_features(student_id: str, skill_name: str, from_dt):
    row = frappe.db.sql(
        """
        SELECT
            COUNT(al.name) AS attempts,
            AVG(COALESCE(al.time_ms, 0)) AS avg_time_ms
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND al.skill = %(skill)s
          AND al.creation >= %(from_dt)s
        """,
        {"student_id": student_id, "skill": skill_name, "from_dt": from_dt},
        as_dict=True,
    )[0]
    return _to_int(row.get("attempts"), 0), _to_float(row.get("avg_time_ms"), 0.0)


def _streak_recent(student_id: str, skill_name: str, mastery_threshold: float):
    rows = frappe.db.sql(
        """
        SELECT
            CASE
                WHEN JSON_VALID(s.stats_json)
                THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                ELSE 0
            END AS accuracy
        FROM `tabMB Session` s
        WHERE s.student = %(student_id)s
          AND s.skill = %(skill)s
          AND s.status = 'ended'
        ORDER BY COALESCE(s.started_at, s.creation) DESC
        LIMIT 5
        """,
        {"student_id": student_id, "skill": skill_name},
        as_dict=True,
    )
    streak = 0
    for row in rows:
        accuracy = _to_float(row.get("accuracy"), 0)
        if accuracy >= mastery_threshold:
            streak += 1
        else:
            break
    return streak


def _top_mistake(student_id: str, skill_name: str, from_dt):
    rows = frappe.db.sql(
        """
        SELECT al.mistake_type, COUNT(al.name) AS count
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND al.skill = %(skill)s
          AND al.creation >= %(from_dt)s
          AND al.mistake_type IS NOT NULL
          AND al.mistake_type NOT IN ('', 'none')
        GROUP BY al.mistake_type
        ORDER BY count DESC
        LIMIT 1
        """,
        {"student_id": student_id, "skill": skill_name, "from_dt": from_dt},
        as_dict=True,
    )
    if not rows:
        return None
    return rows[0].get("mistake_type")


def _reasons(accuracy_last_10: float, attempts_last_14d: int, top_mistake: str | None):
    reasons = []
    if accuracy_last_10 < 0.55:
        reasons.append("low_accuracy")
    if attempts_last_14d < 5:
        reasons.append("low_practice")
    if top_mistake in {"carry_missed", "borrow_missed", "fraction_parts", "fraction_compare"}:
        reasons.append(top_mistake)
    elif top_mistake:
        reasons.append(top_mistake)
    return reasons[:4]


def forecast_student(student_id: str, window_days: int = 14):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw("student_id is required")
    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(f"Student '{student_id}' does not exist")

    from_dt = add_days(getdate(), -max(_to_int(window_days, 14), 1))
    skill_rows = _skill_base_rows(student_id)

    predictions = {}
    for skill in skill_rows:
        skill_name = skill.get("name")
        skill_code = skill.get("code") or skill_name
        mastery_threshold = _to_float(skill.get("mastery_threshold"), 0.7)

        accuracy_last_10, attempts_last_10 = _accuracy_last_10(student_id, skill_name)
        attempts_last_14d, avg_time_ms = _attempt_window_features(student_id, skill_name, from_dt)
        streak_recent = _streak_recent(student_id, skill_name, mastery_threshold)
        top_mistake = _top_mistake(student_id, skill_name, from_dt)

        score = 0.0
        score += (accuracy_last_10 - mastery_threshold) * 2.5
        score += min(attempts_last_14d, 20) / 20 * 0.8
        score += min(streak_recent, 5) * 0.08
        if avg_time_ms > 0:
            score += 0.15 if avg_time_ms <= 9000 else (-0.1 if avg_time_ms >= 22000 else 0)
        score -= MISTAKE_PENALTIES.get(top_mistake, 0)

        p_mastery = round(_clamp(_sigmoid(score), 0, 1), 4)
        if accuracy_last_10 >= mastery_threshold:
            eta_sessions = 0
        else:
            eta_sessions = max(1, min(10, math.ceil((mastery_threshold - accuracy_last_10) * 10)))

        risk = _risk_from(p_mastery, accuracy_last_10, attempts_last_14d)
        confidence = round(_clamp((min(attempts_last_14d, 12) / 12) * 0.85 + 0.15, 0.15, 0.95), 4)
        reasons = _reasons(accuracy_last_10, attempts_last_14d, top_mistake)

        predictions[skill_code] = {
            "skill": skill_name,
            "title_ar": skill.get("title_ar") or skill_code,
            "p_mastery": p_mastery,
            "eta_sessions": eta_sessions,
            "risk": risk,
            "confidence": confidence,
            "reasons": reasons,
            "accuracy_last_10": round(accuracy_last_10, 4),
            "attempts_last_14d": attempts_last_14d,
            "avg_time_ms": round(avg_time_ms, 2),
            "streak_recent": streak_recent,
            "mistake_top_1": top_mistake,
            "mastery_threshold": mastery_threshold,
        }

    student = frappe.get_doc("MB Student Profile", student_id)
    existing = parse_doc_json(student.predictions_json)
    existing.update(predictions)
    student.predictions_json = to_json_string(existing)
    student.save(ignore_permissions=True)

    return predictions
