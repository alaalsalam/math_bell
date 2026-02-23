import json

import frappe
from frappe import _
from frappe.utils import add_days, getdate, now_datetime, nowdate, time_diff_in_seconds

from math_bell.api.helpers import (
    ensure_active_link,
    normalize_bool,
    normalize_int,
    parse_doc_json,
    parse_json_input,
    to_json_string,
    validate_skill_belongs_to_grade_domain,
)
from math_bell.badges.rules import evaluate_and_award_badges


def _question_ui_matches(question: dict, ui: str) -> bool:
    question_ui = (question.get("ui") or "").strip()
    if question_ui:
        return question_ui == ui

    # Backward compatibility for old MCQ rows that don't define "ui".
    return ui == "mcq"


def _get_question_candidates(
    skill: str | None, grade: str, domain: str, limit: int = 12, ui: str = "mcq"
) -> list[dict]:
    filters: dict = {"is_active": 1}

    if skill:
        filters["skill"] = skill
    else:
        skills = frappe.get_all(
            "MB Skill",
            filters={"is_active": 1, "grade": grade, "domain": domain},
            pluck="name",
            limit_page_length=500,
        )
        if not skills:
            return []
        filters["skill"] = ["in", skills]

    rows = frappe.get_all(
        "MB Question Bank",
        filters=filters,
        fields=["name", "skill", "template", "difficulty", "question_json", "answer_json"],
        order_by="difficulty asc, creation asc",
        limit_page_length=limit,
    )

    payload = []
    for row in rows:
        try:
            question = json.loads(row.get("question_json") or "{}")
        except Exception:
            question = {}
        try:
            answer = json.loads(row.get("answer_json") or "{}")
        except Exception:
            answer = {}
        if _question_ui_matches(question, ui):
            payload.append(
                {
                    "question_ref": row.get("name"),
                    "skill": row.get("skill"),
                    "template": row.get("template"),
                    "difficulty": row.get("difficulty"),
                    "question": question,
                    "answer": answer,
                }
            )
        if len(payload) >= limit:
            break

    return payload


def _build_stats_dict(stats_json: str | None) -> dict:
    stats = parse_doc_json(stats_json)
    return {
        "attempts": normalize_int(stats.get("attempts"), 0),
        "correct": normalize_int(stats.get("correct"), 0),
        "accuracy": float(stats.get("accuracy") or 0),
    }


def _update_stats(stats: dict, is_correct: bool) -> dict:
    attempts = normalize_int(stats.get("attempts"), 0) + 1
    correct = normalize_int(stats.get("correct"), 0) + (1 if is_correct else 0)
    accuracy = (correct / attempts) if attempts else 0
    return {
        "attempts": attempts,
        "correct": correct,
        "accuracy": round(accuracy, 4),
    }


def _calc_stars(accuracy: float) -> int:
    if accuracy >= 0.9:
        return 3
    if accuracy >= 0.7:
        return 2
    return 1


def _level_from_total_correct(total_correct: int) -> int:
    return max(1, int(total_correct // 20) + 1)


def _update_student_on_attempt(session, is_correct: bool) -> None:
    if not session.student:
        return
    student = frappe.get_doc("MB Student Profile", session.student)
    if is_correct:
        student.total_correct = normalize_int(student.total_correct, 0) + 1
    student.level = _level_from_total_correct(normalize_int(student.total_correct, 0))
    student.save(ignore_permissions=True)


def _update_student_daily_continuity(student_name: str, stars: int) -> dict:
    student = frappe.get_doc("MB Student Profile", student_name)

    today = getdate(nowdate())
    yesterday = add_days(today, -1)
    previous = getdate(student.last_active_date) if student.last_active_date else None

    streak_broken = bool(previous and previous < yesterday)

    if previous == today:
        current = normalize_int(student.current_streak, 0)
    elif previous == yesterday:
        current = normalize_int(student.current_streak, 0) + 1
    else:
        current = 1

    student.current_streak = current
    student.best_streak = max(normalize_int(student.best_streak, 0), current)
    student.last_active_date = today
    student.total_stars = normalize_int(student.total_stars, 0) + normalize_int(stars, 0)
    student.level = _level_from_total_correct(normalize_int(student.total_correct, 0))
    student.save(ignore_permissions=True)

    return {
        "current_streak": normalize_int(student.current_streak, 0),
        "best_streak": normalize_int(student.best_streak, 0),
        "streak_broken": streak_broken,
        "level": normalize_int(student.level, 1),
        "total_stars": normalize_int(student.total_stars, 0),
    }


@frappe.whitelist(allow_guest=True)
def start_session(
    session_type: str,
    grade: str,
    domain: str,
    skill: str | None = None,
    student: str | None = None,
    duration_seconds: int | None = None,
    ui: str | None = None,
    daily_challenge: int | bool = 0,
):
    session_type = (session_type or "").strip()
    grade = (grade or "").strip()
    domain = (domain or "").strip()
    skill = (skill or "").strip() or None
    student = (student or "").strip() or None
    ui = (ui or "mcq").strip() or "mcq"
    daily_challenge_flag = normalize_bool(daily_challenge)

    if session_type not in {"practice", "bell_session"}:
        frappe.throw(_("Invalid session_type. Allowed values: practice, bell_session"))

    ensure_active_link("MB Grade", grade, "Grade")
    ensure_active_link("MB Domain", domain, "Domain")

    if skill:
        validate_skill_belongs_to_grade_domain(skill, grade, domain)
    if student:
        ensure_active_link("MB Student Profile", student, "Student")

    doc = frappe.get_doc(
        {
            "doctype": "MB Session",
            "session_type": session_type,
            "grade": grade,
            "domain": domain,
            "skill": skill,
            "student": student,
            "started_at": now_datetime(),
            "duration_seconds": normalize_int(duration_seconds, 0) or None,
            "status": "active",
            "stats_json": to_json_string(
                {
                    "attempts": 0,
                    "correct": 0,
                    "accuracy": 0,
                    "daily_challenge": daily_challenge_flag,
                }
            ),
        }
    )
    doc.insert(ignore_permissions=True)

    questions = _get_question_candidates(skill=skill, grade=grade, domain=domain, limit=10, ui=ui)

    return {
        "ok": True,
        "data": {
            "session_id": doc.name,
            "ui": ui,
            "questions": questions,
        },
    }


@frappe.whitelist(allow_guest=True)
def submit_attempt(
    session_id: str,
    skill: str,
    question_ref: str | None = None,
    given_answer_json=None,
    is_correct: int | bool = 0,
    time_ms: int | str | None = None,
    hint_used: int | bool = 0,
):
    session_id = (session_id or "").strip()
    skill = (skill or "").strip()
    question_ref = (question_ref or "").strip() or None

    if not session_id:
        frappe.throw(_("session_id is required"))
    if not skill:
        frappe.throw(_("skill is required"))

    session = frappe.get_doc("MB Session", session_id)
    if session.status != "active":
        frappe.throw(_("Session '{0}' is not active").format(session.name))

    validate_skill_belongs_to_grade_domain(skill, session.grade, session.domain)

    parsed_answer = parse_json_input(given_answer_json, "given_answer_json", required=False)
    is_correct_bool = normalize_bool(is_correct)
    hint_used_bool = normalize_bool(hint_used)

    attempt = frappe.get_doc(
        {
            "doctype": "MB Attempt Log",
            "session": session.name,
            "skill": skill,
            "question_ref": question_ref,
            "given_answer_json": to_json_string(parsed_answer),
            "is_correct": 1 if is_correct_bool else 0,
            "time_ms": max(normalize_int(time_ms, 0), 0),
            "hint_used": 1 if hint_used_bool else 0,
            "created_at": now_datetime(),
        }
    )
    attempt.insert(ignore_permissions=True)

    stats = _build_stats_dict(session.stats_json)
    stats = _update_stats(stats, is_correct_bool)
    session.stats_json = to_json_string(stats)
    session.save(ignore_permissions=True)

    _update_student_on_attempt(session, is_correct_bool)

    return {"ok": True, "data": {"session_id": session.name, "stats": stats}}


@frappe.whitelist(allow_guest=True)
def end_session(session_id: str):
    session_id = (session_id or "").strip()
    if not session_id:
        frappe.throw(_("session_id is required"))

    session = frappe.get_doc("MB Session", session_id)
    was_ended = session.status == "ended"

    if session.skill:
        validate_skill_belongs_to_grade_domain(session.skill, session.grade, session.domain)

    ended_at = now_datetime()
    started_at = session.started_at or ended_at
    duration_seconds = max(int(time_diff_in_seconds(ended_at, started_at)), 0)

    if session.status != "ended":
        session.ended_at = ended_at
        session.duration_seconds = duration_seconds
        session.status = "ended"

    stats = _build_stats_dict(session.stats_json)
    attempts = stats.get("attempts", 0)
    correct = stats.get("correct", 0)
    accuracy = round((correct / attempts), 4) if attempts else 0
    stars = _calc_stars(accuracy)
    extra_stats = parse_doc_json(session.stats_json)
    daily_challenge_flag = normalize_bool(extra_stats.get("daily_challenge"))

    report = {
        "attempts": attempts,
        "correct": correct,
        "accuracy": accuracy,
        "duration_seconds": session.duration_seconds or duration_seconds,
        "stars": stars,
        "daily_challenge": daily_challenge_flag,
        "common_mistake": "سيتم إضافة تحليل الأخطاء قريباً",
    }

    session.stats_json = to_json_string(
        {
            "attempts": attempts,
            "correct": correct,
            "accuracy": accuracy,
            "stars": stars,
            "daily_challenge": daily_challenge_flag,
        }
    )
    session.save(ignore_permissions=True)

    continuity = {}
    if session.student and not was_ended:
        continuity = _update_student_daily_continuity(session.student, stars)

    earned_badges = evaluate_and_award_badges(session, report)
    if earned_badges:
        report["earned_badges"] = earned_badges

    report.update(continuity)

    return {"ok": True, "data": {"session_id": session.name, "report": report}}
