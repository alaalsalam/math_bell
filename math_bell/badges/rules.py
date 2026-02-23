import json
from typing import Callable

import frappe
from frappe.utils import now_datetime


def _stats(row) -> dict:
    raw = row.get("stats_json") if isinstance(row, dict) else None
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _session_accuracy(row) -> float:
    stats = _stats(row)
    try:
        return float(stats.get("accuracy") or 0)
    except Exception:
        return 0.0


def _is_daily_challenge_session(session) -> bool:
    stats = _stats({"stats_json": session.stats_json})
    return bool(stats.get("daily_challenge"))


def _ensure_student(student_name: str):
    student = frappe.db.get_value(
        "MB Student Profile",
        student_name,
        ["name", "current_streak", "total_stars", "best_streak"],
        as_dict=True,
    )
    return student or {}


def _rule_first_session(student_name: str, *_):
    count_sessions = frappe.db.count(
        "MB Session",
        {"student": student_name, "status": "ended"},
    )
    return int(count_sessions or 0) >= 1


def _rule_streak_3(student_name: str, *_):
    student = _ensure_student(student_name)
    return int(student.get("current_streak") or 0) >= 3


def _rule_streak_7(student_name: str, *_):
    student = _ensure_student(student_name)
    return int(student.get("current_streak") or 0) >= 7


def _rule_perfect_10(_, session, report):
    attempts = int((report or {}).get("attempts") or 0)
    accuracy = float((report or {}).get("accuracy") or 0)
    return attempts >= 10 and accuracy >= 1.0


def _rule_fractions_star(student_name: str, *_):
    sessions = frappe.get_all(
        "MB Session",
        filters={"student": student_name, "status": "ended", "domain": "Fractions"},
        fields=["stats_json"],
        limit_page_length=500,
    )

    passed = 0
    for row in sessions:
        if _session_accuracy(row) >= 0.7:
            passed += 1
        if passed >= 3:
            return True

    return False


def _rule_daily_champ(_, session, report):
    return _is_daily_challenge_session(session) and int((report or {}).get("attempts") or 0) >= 1


def _award_badge(student_name: str, badge_code: str) -> bool:
    badge_name = frappe.db.get_value("MB Badge", {"code": badge_code, "is_active": 1}, "name")
    if not badge_name:
        return False

    if frappe.db.exists("MB Student Badge", {"student": student_name, "badge": badge_name}):
        return False

    frappe.get_doc(
        {
            "doctype": "MB Student Badge",
            "student": student_name,
            "badge": badge_name,
            "earned_at": now_datetime(),
        }
    ).insert(ignore_permissions=True)
    return True


def evaluate_and_award_badges(session, report) -> list[dict]:
    if not session or not session.student:
        return []

    rule_registry: dict[str, Callable] = {
        "FIRST_SESSION": _rule_first_session,
        "STREAK_3": _rule_streak_3,
        "STREAK_7": _rule_streak_7,
        "PERFECT_10": _rule_perfect_10,
        "FRACTIONS_STAR": _rule_fractions_star,
        "DAILY_CHAMP": _rule_daily_champ,
    }

    awarded = []
    badges = frappe.get_all(
        "MB Badge",
        filters={"is_active": 1, "code": ["in", list(rule_registry.keys())]},
        fields=["name", "code", "title_ar"],
        limit_page_length=100,
    )

    for badge in badges:
        code = badge.get("code")
        checker = rule_registry.get(code)
        if not checker:
            continue

        try:
            match = bool(checker(session.student, session, report))
        except Exception:
            match = False

        if not match:
            continue

        if _award_badge(session.student, code):
            awarded.append(
                {
                    "code": code,
                    "title_ar": badge.get("title_ar") or code,
                }
            )

    return awarded
