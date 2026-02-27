import json
import hashlib
import re

import frappe
from frappe import _
from frappe.utils import add_days, getdate, now_datetime, nowdate, time_diff_in_seconds

from math_bell.api.helpers import (
    ensure_active_link,
    normalize_bool,
    normalize_int,
    parse_doc_json,
    parse_json_input,
    resolve_grade_link_name,
    to_json_string,
    validate_skill_belongs_to_grade_domain,
)
from math_bell.badges.rules import evaluate_and_award_badges
from math_bell.generator import generate_questions
from math_bell.hints import get_hint
from math_bell.utils.skill_graph import evaluate_unlocks


def _question_ui_matches(question: dict, ui: str) -> bool:
    question_ui = (question.get("ui") or "").strip()
    if question_ui:
        return question_ui == ui

    # Backward compatibility for old MCQ rows that don't define "ui".
    return ui == "mcq"


def _question_signature(generator_type: str, difficulty, question: dict) -> str:
    canonical = {
        "g": (generator_type or "").strip(),
        "d": str(difficulty or ""),
        "q": question or {},
    }
    raw = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _stable_pick_rank(session_seed: str, question_ref: str) -> int:
    token = hashlib.sha256(f"{session_seed}:{question_ref}".encode("utf-8")).hexdigest()[:12]
    return int(token, 16)


def _get_question_candidates(
    skill: str | None,
    grade: str,
    domain: str,
    limit: int = 12,
    ui: str = "mcq",
    excluded_signatures: set[str] | None = None,
    session_seed: str = "",
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
        limit_page_length=max(limit * 5, limit),
    )

    preferred = []
    fallback = []
    seen_signatures: set[str] = set()
    excluded = excluded_signatures or set()
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
            signature = _question_signature("static", row.get("difficulty"), question)
            if signature in seen_signatures:
                continue
            seen_signatures.add(signature)
            item = {
                "question_ref": row.get("name"),
                "skill": row.get("skill"),
                "template": row.get("template"),
                "difficulty": row.get("difficulty"),
                "question": question,
                "answer": answer,
                "signature": signature,
                "repeat_fallback": 1 if signature in excluded else 0,
            }
            if signature in excluded:
                fallback.append(item)
            else:
                preferred.append(item)

    seed = session_seed or "static-seed"
    preferred.sort(key=lambda item: _stable_pick_rank(seed, item.get("question_ref") or ""))
    fallback.sort(key=lambda item: _stable_pick_rank(seed, item.get("question_ref") or ""))

    output = preferred[:limit]
    if len(output) < limit:
        output.extend(fallback[: max(0, limit - len(output))])
    return output


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
    raw = str(value).strip()
    reduced_fraction = _normalize_fraction_text(raw)
    if reduced_fraction:
        return reduced_fraction
    return raw


def _normalize_fraction_text(raw: str) -> str | None:
    """
    Converts equivalent fraction strings to a canonical token.
    Example: "2/4" -> "frac:1/2".
    """
    if not raw or "/" not in raw:
        return None

    match = re.fullmatch(r"\s*([+-]?\d+)\s*/\s*([+-]?\d+)\s*", raw)
    if not match:
        return None

    numerator = int(match.group(1))
    denominator = int(match.group(2))
    if denominator == 0:
        return None

    sign = -1 if (numerator < 0) ^ (denominator < 0) else 1
    numerator = abs(numerator)
    denominator = abs(denominator)

    # Euclidean gcd without extra imports.
    a, b = numerator, denominator
    while b:
        a, b = b, a % b
    gcd_value = max(a, 1)

    reduced_num = (numerator // gcd_value) * sign
    reduced_den = denominator // gcd_value
    return f"frac:{reduced_num}/{reduced_den}"


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
        "recent_signatures": [],
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
        if isinstance(skill_entry.get("recent_signatures"), list):
            context["recent_signatures"] = [str(item) for item in skill_entry.get("recent_signatures") if item]

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


def _to_client_questions(questions: list[dict]) -> tuple[list[dict], dict, dict, dict]:
    output = []
    answer_map = {}
    signature_map = {}
    repeat_fallback_count = 0
    nonce_retry_total = 0
    nonce_retry_max = 0
    for item in questions:
        ref = item.get("question_ref")
        answer_map[ref] = item.get("answer")
        if item.get("signature"):
            signature_map[ref] = item.get("signature")
        if int(item.get("repeat_fallback") or 0) == 1:
            repeat_fallback_count += 1
        nonce_attempts = normalize_int(item.get("nonce_attempts"), 0)
        nonce_retry_total += max(nonce_attempts - 1, 0)
        nonce_retry_max = max(nonce_retry_max, max(nonce_attempts - 1, 0))
        output.append(
            {
                "question_ref": ref,
                "skill": item.get("skill"),
                "template": item.get("template"),
                "difficulty": item.get("difficulty"),
                "question": item.get("question"),
            }
        )
    uniqueness = {
        "question_count": len(output),
        "unique_signature_count": len(set(signature_map.values())),
        "repeat_fallback_count": repeat_fallback_count,
        "nonce_retry_total": nonce_retry_total,
        "nonce_retry_max": nonce_retry_max,
        "history_exhausted": bool(len(output) > 0 and repeat_fallback_count == len(output)),
    }
    return output, answer_map, signature_map, uniqueness


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


def _level_from_xp_points(xp_points: int) -> int:
    return max(1, int(normalize_int(xp_points, 0) // 100) + 1)


def _update_student_on_attempt(session, is_correct: bool) -> None:
    if not session.student:
        return
    student = frappe.get_doc("MB Student Profile", session.student)
    if is_correct:
        student.total_correct = normalize_int(student.total_correct, 0) + 1
    student.save(ignore_permissions=True)


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def _update_student_skill_progress(session, attempts: int, correct: int, recent_signatures: list[str] | None = None) -> dict:
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

    merged_signatures = [str(item) for item in (current.get("recent_signatures") or []) if item]
    if recent_signatures:
        merged_signatures.extend([str(item) for item in recent_signatures if item])
    merged_signatures = merged_signatures[-500:]

    next_entry = {
        **current,
        "level": current_level,
        "attempts": total_attempts,
        "correct": total_correct,
        "accuracy": total_accuracy,
    }
    if merged_signatures:
        next_entry["recent_signatures"] = merged_signatures
    all_levels[skill_key] = next_entry
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
        fields=["name", "code", "title_ar", "min_level_required", "order", "creation"],
        order_by="creation asc",
        limit_page_length=200,
    )
    if not next_skills:
        return {}
    next_skills.sort(
        key=lambda row: (normalize_int(row.get("order"), 0), str(row.get("creation") or ""))
    )

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
    student.level = _level_from_xp_points(normalize_int(student.xp_points, 0))
    student.save(ignore_permissions=True)

    return {
        "current_streak": normalize_int(student.current_streak, 0),
        "best_streak": normalize_int(student.best_streak, 0),
        "streak_broken": streak_broken,
        "level": normalize_int(student.level, 1),
        "total_stars": normalize_int(student.total_stars, 0),
    }


def _award_xp_on_end_session(student_name: str, correct: int, unlocked_next: bool, mastery_reached: bool) -> dict:
    student = frappe.get_doc("MB Student Profile", student_name)

    xp_delta = max(normalize_int(correct, 0), 0) * 5
    xp_delta += 10  # session completion bonus
    mastery_bonus_applied = bool(unlocked_next or mastery_reached)
    if mastery_bonus_applied:
        xp_delta += 50

    before_xp = normalize_int(student.xp_points, 0)
    after_xp = before_xp + xp_delta
    level_after = _level_from_xp_points(after_xp)
    level_before = _level_from_xp_points(before_xp)

    student.xp_points = after_xp
    student.level = level_after
    student.save(ignore_permissions=True)

    reward_type = "chest" if mastery_bonus_applied else "coins"
    reward_rarity = "rare" if xp_delta >= 60 else "common"
    reward_label = "صندوق مكافأة مميز" if reward_type == "chest" else "عملات خبرة"

    if level_after > level_before:
        reward_type = "badge"
        reward_rarity = "rare"
        reward_label = "ترقية مستوى"

    return {
        "xp_delta": xp_delta,
        "xp_points": after_xp,
        "level": level_after,
        "level_up": level_after > level_before,
        "reward": {
            "type": reward_type,
            "label_ar": reward_label,
            "rarity": reward_rarity,
        },
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

    # Resolve simple grade code from frontend and auto-create base grades when missing.
    # This reduces hard runtime dependency on manual Desk setup.
    grade_name, _grade_code = resolve_grade_link_name(grade, auto_create=True)
    ensure_active_link("MB Domain", domain, "Domain")

    if skill:
        validate_skill_belongs_to_grade_domain(skill, grade_name, domain)
    if student:
        ensure_active_link("MB Student Profile", student, "Student")

    doc = frappe.get_doc(
        {
            "doctype": "MB Session",
            "session_type": session_type,
            "grade": grade_name,
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
    student_context = _get_student_context(student, skill) if skill else {}
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
            questions = generate_questions(
                {
                    "name": skill_meta.get("name"),
                    "grade": grade_name,
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
        recent_signatures = set(student_context.get("recent_signatures") or [])
        questions = _get_question_candidates(
            skill=skill,
            grade=grade_name,
            domain=domain,
            limit=question_count,
            ui=ui,
            excluded_signatures=recent_signatures if recent_signatures else None,
            session_seed=doc.name,
        )

    client_questions, answer_map, signature_map, uniqueness = _to_client_questions(questions)
    question_map = {item.get("question_ref"): item.get("question") for item in questions}
    session_stats = parse_doc_json(doc.stats_json)
    session_stats["generated"] = generated
    session_stats["answer_map"] = answer_map
    session_stats["question_map"] = question_map
    session_stats["signature_map"] = signature_map
    session_stats["uniqueness"] = uniqueness
    doc.stats_json = to_json_string(session_stats)
    doc.save(ignore_permissions=True)

    return {
        "ok": True,
        "data": {
            "session_id": doc.name,
            "ui": ui,
            "generated": generated,
            "uniqueness": uniqueness,
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
        "uniqueness": extra_stats.get("uniqueness") if isinstance(extra_stats.get("uniqueness"), dict) else {},
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
        unlock_before = evaluate_unlocks(
            student_id=session.student,
            grade=session.grade,
            domain=session.domain,
            persist=False,
        )
        signature_map = extra_stats.get("signature_map") if isinstance(extra_stats.get("signature_map"), dict) else {}
        session_signatures = [str(sig) for sig in signature_map.values() if sig]
        progress = _update_student_skill_progress(session, attempts, correct, recent_signatures=session_signatures)
        mastery_reached = False
        if progress:
            report.update(progress)
            unlock_state = evaluate_unlocks(
                student_id=session.student,
                grade=session.grade,
                domain=session.domain,
                persist=True,
            )
            unlocked_codes = unlock_state.get("unlocked_codes") or []
            previous_unlocked_codes = set(unlock_before.get("unlocked_codes") or [])
            unlocked_next = any(code not in previous_unlocked_codes for code in unlocked_codes)
            threshold = frappe.db.get_value("MB Skill", session.skill, "mastery_threshold") if session.skill else 0.7
            mastery_reached = (
                float(progress.get("skill_accuracy") or 0) >= float(threshold or 0.7)
                and normalize_int(progress.get("skill_attempts"), 0) > 0
            )
            report.update(
                {
                    "unlocked_skills": unlocked_codes,
                    "unlocked_count": len(unlocked_codes),
                    "unlocked_next": bool(unlocked_next),
                }
            )
            report.update(
                _award_xp_on_end_session(
                    student_name=session.student,
                    correct=correct,
                    unlocked_next=bool(unlocked_next),
                    mastery_reached=mastery_reached,
                )
            )
        else:
            report.update(
                _award_xp_on_end_session(
                    student_name=session.student,
                    correct=correct,
                    unlocked_next=False,
                    mastery_reached=False,
                )
            )
        continuity = _update_student_daily_continuity(session.student, stars)

    earned_badges = evaluate_and_award_badges(session, report)
    if earned_badges:
        report["earned_badges"] = earned_badges

    report.update(continuity)

    return {"ok": True, "data": {"session_id": session.name, "report": report}}
