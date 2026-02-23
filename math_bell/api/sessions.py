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
from math_bell.generator import generate_questions
from math_bell.hints import get_hint


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


def _extract_answer_value(answer):
    if isinstance(answer, dict):
        if "value" in answer:
            return answer.get("value")
        if "answer" in answer:
            return answer.get("answer")
        if "correct_answer" in answer:
            return answer.get("correct_answer")
    return answer


def _normalize_answer_value(value):
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    if value is None:
        return ""
    return str(value)


def _is_answer_correct(given_answer, expected_answer) -> bool:
    if isinstance(expected_answer, dict) and isinstance(expected_answer.get("correct_choices"), list):
        current_value = given_answer.get("value") if isinstance(given_answer, dict) else given_answer
        normalized_current = _normalize_answer_value(current_value)
        valid = [_normalize_answer_value(item) for item in expected_answer.get("correct_choices") or []]
        return normalized_current in valid

    given_value = given_answer.get("value") if isinstance(given_answer, dict) else given_answer
    expected_value = _extract_answer_value(expected_answer)
    return _normalize_answer_value(given_value) == _normalize_answer_value(expected_value)


def _get_student_context(student: str | None, skill: str | None) -> dict:
    context = {
        "level": 1,
        "accuracy_last_5": 0,
        "current_streak": 0,
        "total_correct": 0,
    }
    if not student:
        return context

    fields = ["level", "current_streak", "total_correct"]
    has_skill_levels_json = frappe.db.has_column("MB Student Profile", "skill_levels_json")
    if has_skill_levels_json:
        fields.append("skill_levels_json")

    student_row = frappe.db.get_value(
        "MB Student Profile",
        student,
        fields,
        as_dict=True,
    )
    if not student_row:
        return context

    context["level"] = normalize_int(student_row.get("level"), 1)
    context["current_streak"] = normalize_int(student_row.get("current_streak"), 0)
    context["total_correct"] = normalize_int(student_row.get("total_correct"), 0)

    if skill:
        skill_levels = parse_doc_json(student_row.get("skill_levels_json") if has_skill_levels_json else None)
        skill_code = frappe.db.get_value("MB Skill", skill, "code") if skill else None
        skill_entry = {}
        if isinstance(skill_levels, dict):
            skill_entry = (
                skill_levels.get(skill_code) or skill_levels.get(skill) or {}
            )
        if skill_entry.get("level") is not None:
            context["level"] = normalize_int(skill_entry.get("level"), context["level"])

    rows = frappe.db.sql(
        """
        SELECT al.is_correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student)s
        {skill_filter}
        ORDER BY al.creation DESC
        LIMIT 5
        """.format(skill_filter="AND al.skill = %(skill)s" if skill else ""),
        {"student": student, "skill": skill},
        as_dict=True,
    )
    if rows:
        correct = sum(1 for row in rows if int(row.get("is_correct") or 0) == 1)
        context["accuracy_last_5"] = round(correct / len(rows), 4)

    return context


def _to_client_questions(questions: list[dict]) -> tuple[list[dict], dict]:
    output = []
    answer_map = {}
    for item in questions:
        ref = item.get("question_ref")
        answer_map[ref] = item.get("answer")
        output.append(
            {
                "question_ref": ref,
                "skill": item.get("skill"),
                "template": item.get("template"),
                "difficulty": item.get("difficulty"),
                "question": item.get("question"),
            }
        )
    return output, answer_map


def _fetch_expected_answer(question_ref: str | None):
    if not question_ref:
        return None
    raw = frappe.db.get_value("MB Question Bank", question_ref, "answer_json")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _fetch_question_from_bank(question_ref: str | None) -> dict:
    if not question_ref:
        return {}
    raw = frappe.db.get_value("MB Question Bank", question_ref, "question_json")
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _infer_generator_type(skill_meta: dict | None, question_data: dict | None) -> str:
    generator_type = ((skill_meta or {}).get("generator_type") or "").strip()
    if generator_type and generator_type != "static":
        return generator_type

    question = question_data if isinstance(question_data, dict) else {}
    ui = (question.get("ui") or "").strip()
    payload = question.get("payload") if isinstance(question.get("payload"), dict) else {}
    text = str(question.get("text") or "")

    if ui == "vertical_column":
        return "vertical_sub" if payload.get("op") == "-" else "vertical_add"
    if ui == "fraction_builder":
        if "قارن" in text:
            return "fraction_compare"
        return "fraction_basic"
    if ui == "mcq" and "قارن" in text and "/" in text:
        return "fraction_compare"
    if "+" in text and "=" in text:
        return "addition_range"
    if "-" in text and "=" in text:
        return "subtraction_range"

    return "static"


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


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def _update_student_skill_progress(session, attempts: int, correct: int) -> dict:
    if not session.student or not session.skill:
        return {}

    student = frappe.get_doc("MB Student Profile", session.student)
    skill_meta = frappe.db.get_value(
        "MB Skill",
        session.skill,
        ["name", "code", "difficulty_min", "difficulty_max"],
        as_dict=True,
    )
    if not skill_meta:
        return {}

    skill_key = skill_meta.get("code") or skill_meta.get("name") or session.skill
    all_levels = parse_doc_json(student.skill_levels_json)
    current = all_levels.get(skill_key) if isinstance(all_levels.get(skill_key), dict) else {}

    previous_attempts = normalize_int(current.get("attempts"), 0)
    previous_correct = normalize_int(current.get("correct"), 0)
    total_attempts = previous_attempts + max(normalize_int(attempts, 0), 0)
    total_correct = previous_correct + max(normalize_int(correct, 0), 0)
    total_accuracy = round((total_correct / total_attempts), 4) if total_attempts else 0

    min_level = max(normalize_int(skill_meta.get("difficulty_min"), 1), 1)
    max_level = max(normalize_int(skill_meta.get("difficulty_max"), min_level), min_level)
    current_level = _clamp(normalize_int(current.get("level"), min_level), min_level, max_level)

    session_accuracy = round((correct / attempts), 4) if attempts else 0
    if attempts:
        if session_accuracy >= 0.8:
            current_level += 1
        elif session_accuracy <= 0.4:
            current_level -= 1
    current_level = _clamp(current_level, min_level, max_level)

    all_levels[skill_key] = {
        "level": current_level,
        "attempts": total_attempts,
        "correct": total_correct,
        "accuracy": total_accuracy,
    }
    student.skill_levels_json = to_json_string(all_levels)
    student.save(ignore_permissions=True)

    return {
        "skill_name": skill_meta.get("name"),
        "skill_code": skill_key,
        "skill_level": current_level,
        "skill_accuracy": total_accuracy,
        "skill_attempts": total_attempts,
    }


def _unlock_next_skill_if_mastered(session, progress: dict) -> dict:
    if not session.student or not session.skill:
        return {}
    if not isinstance(progress, dict):
        return {}

    skill_accuracy = float(progress.get("skill_accuracy") or 0)
    skill_attempts = normalize_int(progress.get("skill_attempts"), 0)
    if skill_attempts <= 0:
        return {}

    current_skill = frappe.db.get_value(
        "MB Skill",
        session.skill,
        ["name", "code", "grade", "domain", "`order`", "mastery_threshold"],
        as_dict=True,
    )
    if not current_skill:
        return {}

    mastery_threshold = float(current_skill.get("mastery_threshold") or 0.7)
    if skill_accuracy < mastery_threshold:
        return {}

    next_skills = frappe.get_all(
        "MB Skill",
        filters={
            "is_active": 1,
            "show_in_student_app": 1,
            "grade": current_skill.get("grade"),
            "domain": current_skill.get("domain"),
            "order": [">", normalize_int(current_skill.get("order"), 0)],
        },
        fields=["name", "code", "title_ar", "min_level_required", "order"],
        order_by="`order` asc, creation asc",
        limit_page_length=1,
    )
    if not next_skills:
        return {}

    next_skill = next_skills[0]
    student_level = normalize_int(
        frappe.db.get_value("MB Student Profile", session.student, "level"),
        1,
    )
    if student_level < normalize_int(next_skill.get("min_level_required"), 1):
        return {"unlocked_next": False, "next_skill_code": next_skill.get("code")}

    student = frappe.get_doc("MB Student Profile", session.student)
    all_levels = parse_doc_json(student.skill_levels_json)
    next_key = next_skill.get("code") or next_skill.get("name")
    entry = all_levels.get(next_key) if isinstance(all_levels.get(next_key), dict) else {}
    entry["unlocked"] = 1
    all_levels[next_key] = entry
    student.skill_levels_json = to_json_string(all_levels)
    student.save(ignore_permissions=True)
    return {
        "unlocked_next": True,
        "next_skill_code": next_skill.get("code"),
        "next_skill_title_ar": next_skill.get("title_ar"),
    }


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
    question_count: int | None = None,
    ui: str | None = None,
    daily_challenge: int | bool = 0,
):
    session_type = (session_type or "").strip()
    grade = (grade or "").strip()
    domain = (domain or "").strip()
    skill = (skill or "").strip() or None
    student = (student or "").strip() or None
    ui = (ui or "mcq").strip() or "mcq"
    question_count = _clamp(normalize_int(question_count, 10), 1, 20)
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

    questions = []
    generated = False
    if skill:
        skill_meta = frappe.db.get_value(
            "MB Skill",
            skill,
            ["name", "grade", "generator_type", "difficulty_min", "difficulty_max", "adaptive_enabled"],
            as_dict=True,
        )
        adaptive_enabled = normalize_bool((skill_meta or {}).get("adaptive_enabled"))
        generator_type = ((skill_meta or {}).get("generator_type") or "static").strip()
        if adaptive_enabled and generator_type and generator_type != "static":
            student_context = _get_student_context(student, skill)
            questions = generate_questions(
                {
                    "name": skill_meta.get("name"),
                    "grade": grade,
                    "generator_type": generator_type,
                    "difficulty_min": skill_meta.get("difficulty_min"),
                    "difficulty_max": skill_meta.get("difficulty_max"),
                },
                student_context=student_context,
                count=question_count,
                session_seed=doc.name,
            )
            generated = True

    if not questions:
        questions = _get_question_candidates(
            skill=skill, grade=grade, domain=domain, limit=question_count, ui=ui
        )

    client_questions, answer_map = _to_client_questions(questions)
    question_map = {item.get("question_ref"): item.get("question") for item in questions}
    session_stats = parse_doc_json(doc.stats_json)
    session_stats["generated"] = generated
    session_stats["answer_map"] = answer_map
    session_stats["question_map"] = question_map
    doc.stats_json = to_json_string(session_stats)
    doc.save(ignore_permissions=True)

    return {
        "ok": True,
        "data": {
            "session_id": doc.name,
            "ui": ui,
            "generated": generated,
            "question_count": len(client_questions),
            "questions": client_questions,
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
    hint_used_count: int | str | None = None,
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
    session_meta = parse_doc_json(session.stats_json)
    answer_map = session_meta.get("answer_map") if isinstance(session_meta.get("answer_map"), dict) else {}
    question_map = session_meta.get("question_map") if isinstance(session_meta.get("question_map"), dict) else {}
    expected_answer = answer_map.get(question_ref)
    if expected_answer is None:
        expected_answer = _fetch_expected_answer(question_ref)
    question_data = question_map.get(question_ref) if question_ref else None
    if not isinstance(question_data, dict) or not question_data:
        question_data = _fetch_question_from_bank(question_ref)

    # Backend is the source of truth for correctness; client-side result is ignored.
    is_correct_bool = (
        _is_answer_correct(parsed_answer, expected_answer)
        if expected_answer is not None
        else normalize_bool(is_correct)
    )
    hint_used_bool = normalize_bool(hint_used)
    hint_used_count_value = normalize_int(hint_used_count, 1 if hint_used_bool else 0)
    hint_used_count_value = max(hint_used_count_value, 0)
    mistake_type = "none"
    hint_text = ""

    skill_meta = frappe.db.get_value(
        "MB Skill",
        skill,
        ["name", "generator_type"],
        as_dict=True,
    )
    generator_type = _infer_generator_type(skill_meta, question_data)
    if not is_correct_bool:
        hint_payload = {
            "question": question_data or {},
            "question_text": (question_data or {}).get("text"),
            "correct_answer": expected_answer,
        }
        hint_result = get_hint(generator_type, hint_payload, parsed_answer)
        mistake_type = (hint_result or {}).get("mistake_type") or "random"
        hint_text = (hint_result or {}).get("hint_ar") or "خذ نفس… واحسب بهدوء. تقدر 👍"

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
            "hint_used_count": hint_used_count_value,
            "mistake_type": mistake_type,
            "hint_text": hint_text,
            "created_at": now_datetime(),
        }
    )
    attempt.insert(ignore_permissions=True)

    stats = _build_stats_dict(session.stats_json)
    stats = _update_stats(stats, is_correct_bool)
    session_meta.update(stats)
    session.stats_json = to_json_string(session_meta)
    session.save(ignore_permissions=True)

    _update_student_on_attempt(session, is_correct_bool)

    return {
        "ok": True,
        "data": {
            "session_id": session.name,
            "stats": stats,
            "is_correct": 1 if is_correct_bool else 0,
            "hint_text": hint_text,
            "mistake_type": mistake_type,
        },
    }


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
        "generated": normalize_bool(extra_stats.get("generated")),
        "daily_challenge": daily_challenge_flag,
        "common_mistake": "سيتم إضافة تحليل الأخطاء قريباً",
    }

    extra_stats.update(
        {
            "attempts": attempts,
            "correct": correct,
            "accuracy": accuracy,
            "stars": stars,
            "daily_challenge": daily_challenge_flag,
        }
    )
    session.stats_json = to_json_string(extra_stats)
    session.save(ignore_permissions=True)

    continuity = {}
    if session.student and not was_ended:
        progress = _update_student_skill_progress(session, attempts, correct)
        if progress:
            report.update(progress)
            unlock_result = _unlock_next_skill_if_mastered(session, progress)
            if unlock_result:
                report.update(unlock_result)
        continuity = _update_student_daily_continuity(session.student, stars)

    earned_badges = evaluate_and_award_badges(session, report)
    if earned_badges:
        report["earned_badges"] = earned_badges

    report.update(continuity)

    return {"ok": True, "data": {"session_id": session.name, "report": report}}
