import frappe
from frappe import _
from frappe.utils import add_days, now_datetime
from math_bell.api.planner import ensure_current_week_plan
from math_bell.utils.settings import get_mb_settings


def _as_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def _as_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _stars_from_accuracy(accuracy):
    score = _as_float(accuracy)
    if score >= 0.9:
        return 3
    if score >= 0.7:
        return 2
    return 1


_MISTAKE_RECOMMENDATIONS = {
    "off_by_one": "تدريب على العد خطوة بخطوة لتجنب خطأ ±1",
    "carry_missed": "تدريب على الحمل في الجمع العمودي",
    "borrow_missed": "تدريب على الاستلاف في الطرح العمودي",
    "place_value": "تدريب على قيمة المنزلة (آحاد/عشرات)",
    "sign_confusion": "تثبيت الفرق بين الجمع والطرح بأمثلة بسيطة",
    "fraction_parts": "تدريب على أجزاء الكسر (فوق/تحت)",
    "fraction_compare": "تدريب على مقارنة الكسور بصريًا",
    "random": "مراجعة بطيئة مع أمثلة أقصر",
}


def _recommended_focus_from_mistakes(mistake_rows, limit=3):
    actions = []
    for row in mistake_rows or []:
        mistake_type = row.get("mistake_type")
        action = _MISTAKE_RECOMMENDATIONS.get(mistake_type)
        if action and action not in actions:
            actions.append(action)
        if len(actions) >= limit:
            break
    if not actions:
        actions.append("مراجعة المهارات الأساسية بخطوات قصيرة")
    return actions[:limit]


def _build_recommendation(student_id: str, grade: str | None = None):
    weak = frappe.db.sql(
        """
        SELECT al.skill, COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
        GROUP BY al.skill
        HAVING attempts >= 3
        ORDER BY (SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(al.name)) ASC, COUNT(al.name) DESC
        LIMIT 1
        """,
        {"student_id": student_id},
        as_dict=True,
    )
    if weak:
        return weak[0].get("skill")

    if grade:
        unseen = frappe.db.sql(
            """
            SELECT sk.name
            FROM `tabMB Skill` sk
            WHERE sk.grade = %(grade)s AND sk.is_active = 1 AND sk.show_in_student_app = 1
            AND sk.name NOT IN (
                SELECT DISTINCT al.skill
                FROM `tabMB Attempt Log` al
                INNER JOIN `tabMB Session` s ON s.name = al.session
                WHERE s.student = %(student_id)s
            )
            ORDER BY sk.`order` ASC, sk.creation ASC
            LIMIT 1
            """,
            {"student_id": student_id, "grade": grade},
            as_dict=True,
        )
        if unseen:
            return unseen[0].get("name")

    return None


@frappe.whitelist(allow_guest=True)
def teacher_kpis():
    today_start = now_datetime().replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days = add_days(today_start, -6)

    total_students = frappe.db.count("MB Student Profile", {"is_active": 1})

    active_today = frappe.db.sql(
        """
        SELECT COUNT(DISTINCT s.student) AS cnt
        FROM `tabMB Session` s
        WHERE s.student IS NOT NULL
          AND COALESCE(s.started_at, s.creation) >= %(today_start)s
        """,
        {"today_start": today_start},
        as_dict=True,
    )[0].get("cnt")

    sessions_today = frappe.db.count("MB Session", {"creation": [">=", today_start]})

    attempts_today = frappe.db.sql(
        """
        SELECT COUNT(al.name) AS cnt
        FROM `tabMB Attempt Log` al
        WHERE al.creation >= %(today_start)s
        """,
        {"today_start": today_start},
        as_dict=True,
    )[0].get("cnt")

    accuracy_7d = frappe.db.sql(
        """
        SELECT AVG(
            CASE
                WHEN JSON_VALID(s.stats_json)
                THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                ELSE NULL
            END
        ) AS avg_accuracy
        FROM `tabMB Session` s
        WHERE COALESCE(s.started_at, s.creation) >= %(seven_days)s
        """,
        {"seven_days": seven_days},
        as_dict=True,
    )[0].get("avg_accuracy")

    top_skills = frappe.db.sql(
        """
        SELECT al.skill, COUNT(al.name) AS attempts
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE COALESCE(s.started_at, s.creation) >= %(seven_days)s
        GROUP BY al.skill
        ORDER BY attempts DESC
        LIMIT 5
        """,
        {"seven_days": seven_days},
        as_dict=True,
    )

    weak_skills = frappe.db.sql(
        """
        SELECT al.skill,
               COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE COALESCE(s.started_at, s.creation) >= %(seven_days)s
        GROUP BY al.skill
        HAVING attempts >= 5
        ORDER BY (SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(al.name)) ASC, COUNT(al.name) DESC
        LIMIT 5
        """,
        {"seven_days": seven_days},
        as_dict=True,
    )

    sessions_by_day = frappe.db.sql(
        """
        SELECT DATE(COALESCE(s.started_at, s.creation)) AS day_key, COUNT(s.name) AS sessions_count
        FROM `tabMB Session` s
        WHERE COALESCE(s.started_at, s.creation) >= %(seven_days)s
        GROUP BY DATE(COALESCE(s.started_at, s.creation))
        ORDER BY day_key ASC
        """,
        {"seven_days": seven_days},
        as_dict=True,
    )

    accuracy_by_domain = frappe.db.sql(
        """
        SELECT s.domain,
               COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE COALESCE(s.started_at, s.creation) >= %(seven_days)s
        GROUP BY s.domain
        ORDER BY s.domain ASC
        """,
        {"seven_days": seven_days},
        as_dict=True,
    )

    return {
        "ok": True,
        "data": {
            "total_students": _as_int(total_students),
            "active_today": _as_int(active_today),
            "sessions_today": _as_int(sessions_today),
            "total_attempts_today": _as_int(attempts_today),
            "avg_accuracy_7d": _as_float(accuracy_7d),
            "top_5_skills_by_attempts_7d": [
                {"skill": row.get("skill"), "attempts": _as_int(row.get("attempts"))} for row in top_skills
            ],
            "weakest_5_skills_by_accuracy_7d": [
                {
                    "skill": row.get("skill"),
                    "attempts": _as_int(row.get("attempts")),
                    "accuracy": round(
                        (_as_int(row.get("correct")) / max(_as_int(row.get("attempts")), 1)),
                        4,
                    ),
                }
                for row in weak_skills
            ],
            "sessions_by_day_7d": [
                {"day": str(row.get("day_key")), "sessions": _as_int(row.get("sessions_count"))}
                for row in sessions_by_day
            ],
            "accuracy_by_domain_7d": [
                {
                    "domain": row.get("domain"),
                    "attempts": _as_int(row.get("attempts")),
                    "accuracy": round(
                        (_as_int(row.get("correct")) / max(_as_int(row.get("attempts")), 1)),
                        4,
                    ),
                }
                for row in accuracy_by_domain
            ],
        },
    }


@frappe.whitelist(allow_guest=True)
def student_list(class_group: str | None = None, grade: str | None = None):
    filters = ["sp.is_active = 1"]
    values = {}
    if class_group:
        filters.append("sp.class_group = %(class_group)s")
        values["class_group"] = class_group
    if grade:
        filters.append("sp.grade = %(grade)s")
        values["grade"] = grade

    rows = frappe.db.sql(
        f"""
        SELECT
            sp.name,
            sp.display_name,
            sp.avatar_emoji,
            sp.grade,
            sp.class_group,
            sp.level,
            sp.current_streak,
            sp.last_login,
            MAX(COALESCE(s.started_at, s.creation)) AS last_session_at,
            COUNT(al.name) AS total_attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS total_correct
        FROM `tabMB Student Profile` sp
        LEFT JOIN `tabMB Session` s ON s.student = sp.name
        LEFT JOIN `tabMB Attempt Log` al ON al.session = s.name
        WHERE {' AND '.join(filters)}
        GROUP BY
            sp.name,
            sp.display_name,
            sp.avatar_emoji,
            sp.grade,
            sp.class_group,
            sp.level,
            sp.current_streak,
            sp.last_login
        ORDER BY sp.modified DESC
        """,
        values,
        as_dict=True,
    )

    payload = []
    for row in rows:
        attempts = _as_int(row.get("total_attempts"))
        correct = _as_int(row.get("total_correct"))
        accuracy = round((correct / attempts), 4) if attempts else 0
        level = _as_int(row.get("level")) or max(1, (correct // 20) + 1)
        streak = _as_int(row.get("current_streak"))

        payload.append(
            {
                "name": row.get("name"),
                "display_name": row.get("display_name"),
                "avatar_emoji": row.get("avatar_emoji"),
                "grade": row.get("grade"),
                "class_group": row.get("class_group"),
                "level": level,
                "current_streak": streak,
                "total_attempts": attempts,
                "total_correct": correct,
                "accuracy_all_time": accuracy,
                "last_login": row.get("last_login"),
                "last_session_at": row.get("last_session_at"),
            }
        )

    return {"ok": True, "data": {"students": payload}}


@frappe.whitelist(allow_guest=True)
def student_detail(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))

    student = frappe.db.get_value(
        "MB Student Profile",
        student_id,
        ["name", "display_name", "grade", "avatar_emoji", "class_group", "level", "current_streak", "best_streak", "total_stars"],
        as_dict=True,
    )
    if not student:
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    sessions = frappe.db.sql(
        """
        SELECT
            s.name,
            s.session_type,
            s.domain,
            s.skill,
            s.started_at,
            s.ended_at,
            s.duration_seconds,
            CASE
                WHEN JSON_VALID(s.stats_json)
                THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                ELSE 0
            END AS accuracy
        FROM `tabMB Session` s
        WHERE s.student = %(student_id)s
        ORDER BY COALESCE(s.started_at, s.creation) DESC
        LIMIT 30
        """,
        {"student_id": student_id},
        as_dict=True,
    )

    domain_rows = frappe.db.sql(
        """
        SELECT s.domain, COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
        GROUP BY s.domain
        """,
        {"student_id": student_id},
        as_dict=True,
    )

    skill_rows = frappe.db.sql(
        """
        SELECT al.skill, COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
        GROUP BY al.skill
        HAVING attempts >= 3
        """,
        {"student_id": student_id},
        as_dict=True,
    )
    last_7_days = add_days(now_datetime(), -7)
    top_mistake_rows = frappe.db.sql(
        """
        SELECT al.mistake_type, COUNT(al.name) AS count
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND al.creation >= %(last_7_days)s
          AND al.mistake_type IS NOT NULL
          AND al.mistake_type NOT IN ('', 'none')
        GROUP BY al.mistake_type
        ORDER BY count DESC
        LIMIT 7
        """,
        {"student_id": student_id, "last_7_days": last_7_days},
        as_dict=True,
    )

    ranked = []
    for row in skill_rows:
        attempts = _as_int(row.get("attempts"))
        correct = _as_int(row.get("correct"))
        ranked.append(
            {
                "skill": row.get("skill"),
                "attempts": attempts,
                "correct": correct,
                "accuracy": round((correct / max(attempts, 1)), 4),
            }
        )

    ranked.sort(key=lambda item: item["accuracy"], reverse=True)
    top_skills = ranked[:5]
    weak_skills = sorted(ranked, key=lambda item: item["accuracy"])[:5]

    attempts_per_domain = {
        row.get("domain"): {
            "attempts": _as_int(row.get("attempts")),
            "correct": _as_int(row.get("correct")),
            "accuracy": round(_as_int(row.get("correct")) / max(_as_int(row.get("attempts")), 1), 4),
        }
        for row in domain_rows
    }

    total_time = 0
    for row in sessions:
        duration = row.get("duration_seconds")
        if duration is None and row.get("started_at") and row.get("ended_at"):
            duration = max(int((row.get("ended_at") - row.get("started_at")).total_seconds()), 0)
        total_time += _as_int(duration)

    recommendation = _build_recommendation(student_id=student_id, grade=student.get("grade"))

    total_correct = 0
    total_attempts = 0
    for row in ranked:
        total_correct += _as_int(row.get("correct"))
        total_attempts += _as_int(row.get("attempts"))

    total_stars_earned = 0
    for session in sessions:
        total_stars_earned += _stars_from_accuracy(_as_float(session.get("accuracy")))

    best_streak_placeholder = max(_as_int(student.get("best_streak")), max(0, min(20, total_correct // 5)))
    weekly_plan = ensure_current_week_plan(student_id)

    return {
        "ok": True,
        "data": {
            "student": student,
            "sessions_timeline": sessions,
            "attempts_per_domain": attempts_per_domain,
            "top_skills": top_skills,
            "weak_skills": weak_skills,
            "time_spent_seconds": total_time,
            "recommended_next_skill": recommendation,
            "top_mistakes_last_7d": [
                {"mistake_type": row.get("mistake_type"), "count": _as_int(row.get("count"))}
                for row in top_mistake_rows
            ],
            "recommended_focus": _recommended_focus_from_mistakes(top_mistake_rows),
            "weekly_plan": weekly_plan,
            "reward_summary": {
                "total_stars_earned": _as_int(student.get("total_stars") or total_stars_earned),
                "current_streak": _as_int(student.get("current_streak")),
                "best_streak": best_streak_placeholder,
                "current_level": _as_int(student.get("level") or 1),
                "accuracy_all_time": round((total_correct / max(total_attempts, 1)), 4)
                if total_attempts
                else 0,
            },
        },
    }


@frappe.whitelist(allow_guest=True)
def class_detail(class_group: str):
    class_group = (class_group or "").strip()
    if not class_group:
        frappe.throw(_("class_group is required"))

    if not frappe.db.exists("MB Class Group", class_group):
        frappe.throw(_("Class '{0}' does not exist").format(class_group))

    students_count = frappe.db.count("MB Student Profile", {"class_group": class_group, "is_active": 1})

    sessions_row = frappe.db.sql(
        """
        SELECT
            COUNT(s.name) AS sessions_count,
            AVG(
                CASE
                    WHEN JSON_VALID(s.stats_json)
                    THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                    ELSE NULL
                END
            ) AS avg_accuracy
        FROM `tabMB Session` s
        INNER JOIN `tabMB Student Profile` sp ON sp.name = s.student
        WHERE sp.class_group = %(class_group)s
        """,
        {"class_group": class_group},
        as_dict=True,
    )[0]

    ranked_students = frappe.db.sql(
        """
        SELECT
            sp.name,
            sp.display_name,
            sp.avatar_emoji,
            COUNT(al.name) AS attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Student Profile` sp
        LEFT JOIN `tabMB Session` s ON s.student = sp.name
        LEFT JOIN `tabMB Attempt Log` al ON al.session = s.name
        WHERE sp.class_group = %(class_group)s
        GROUP BY sp.name, sp.display_name, sp.avatar_emoji
        ORDER BY (SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(al.name), 0)) DESC, sp.modified DESC
        LIMIT 100
        """,
        {"class_group": class_group},
        as_dict=True,
    )

    students_payload = []
    for row in ranked_students:
        attempts = _as_int(row.get("attempts"))
        correct = _as_int(row.get("correct"))
        students_payload.append(
            {
                "name": row.get("name"),
                "display_name": row.get("display_name"),
                "avatar_emoji": row.get("avatar_emoji"),
                "attempts": attempts,
                "correct": correct,
                "accuracy": round((correct / max(attempts, 1)), 4),
            }
        )

    most_practiced = frappe.db.sql(
        """
        SELECT al.skill, COUNT(al.name) AS attempts
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        INNER JOIN `tabMB Student Profile` sp ON sp.name = s.student
        WHERE sp.class_group = %(class_group)s
        GROUP BY al.skill
        ORDER BY attempts DESC
        LIMIT 10
        """,
        {"class_group": class_group},
        as_dict=True,
    )

    return {
        "ok": True,
        "data": {
            "class_group": class_group,
            "students_count": _as_int(students_count),
            "sessions_count": _as_int(sessions_row.get("sessions_count")),
            "avg_accuracy": _as_float(sessions_row.get("avg_accuracy")),
            "students_ranked": students_payload,
            "most_practiced_skills": [
                {"skill": row.get("skill"), "attempts": _as_int(row.get("attempts"))}
                for row in most_practiced
            ],
        },
    }


@frappe.whitelist(allow_guest=True)
def student_home(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))

    student = frappe.db.get_value(
        "MB Student Profile",
        student_id,
        ["name", "display_name", "grade", "is_active", "level", "current_streak", "total_stars", "best_streak"],
        as_dict=True,
    )
    if not student:
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    today_start = now_datetime().replace(hour=0, minute=0, second=0, microsecond=0)

    attempts_today = frappe.db.sql(
        """
        SELECT COUNT(al.name) AS attempts
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND al.creation >= %(today_start)s
        """,
        {"student_id": student_id, "today_start": today_start},
        as_dict=True,
    )[0].get("attempts")

    totals = frappe.db.sql(
        """
        SELECT COUNT(al.name) AS attempts,
               SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
        """,
        {"student_id": student_id},
        as_dict=True,
    )[0]

    correct = _as_int(totals.get("correct"))
    attempts = _as_int(totals.get("attempts"))
    streak = max(0, min(20, correct // 5))
    level = max(1, (correct // 20) + 1)

    settings = get_mb_settings()
    target_today = max(_as_int(settings.get("default_questions_per_session"), 10), 1)
    recommended = _build_recommendation(student_id=student_id, grade=student.get("grade"))

    mastery_rows = frappe.db.sql(
        """
        SELECT
            al.skill,
            sk.title_ar,
            COUNT(al.name) AS attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        LEFT JOIN `tabMB Skill` sk ON sk.name = al.skill
        WHERE s.student = %(student_id)s
        GROUP BY al.skill, sk.title_ar
        ORDER BY attempts DESC
        LIMIT 20
        """,
        {"student_id": student_id},
        as_dict=True,
    )

    skills_mastery = []
    for row in mastery_rows:
        attempts_count = _as_int(row.get("attempts"))
        correct_count = _as_int(row.get("correct"))
        mastery = round((correct_count / max(attempts_count, 1)) * 100, 2)
        if mastery < 40:
            color = "gray"
        elif mastery < 70:
            color = "orange"
        else:
            color = "green"

        skills_mastery.append(
            {
                "skill": row.get("skill"),
                "title_ar": row.get("title_ar") or row.get("skill"),
                "attempts": attempts_count,
                "correct": correct_count,
                "mastery_percent": mastery,
                "mastery_color": color,
            }
        )

    student_stars = student.get("total_stars")
    stars_total = (
        _as_int(student_stars)
        if student_stars is not None
        else _stars_from_accuracy((correct / max(attempts, 1)) if attempts else 0)
    )

    return {
        "ok": True,
        "data": {
            "student_id": student_id,
            "attempts_today": _as_int(attempts_today),
            "target_today": target_today,
            "recommended_next_skill": recommended,
            "streak": _as_int(student.get("current_streak") or streak),
            "level": _as_int(student.get("level") or level),
            "best_streak": _as_int(student.get("best_streak")),
            "accuracy_all_time": round((correct / max(attempts, 1)), 4) if attempts else 0,
            "stars_total": stars_total,
            "skills_mastery": skills_mastery,
        },
    }


@frappe.whitelist(allow_guest=True)
def student_weekly_progress(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))

    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    today = now_datetime().date()
    week_start = add_days(today, -today.weekday())
    week_end = add_days(week_start, 6)

    row = frappe.db.sql(
        """
        SELECT
            COUNT(al.name) AS attempts_this_week,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct_this_week
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE s.student = %(student_id)s
          AND DATE(COALESCE(s.started_at, s.creation)) BETWEEN %(week_start)s AND %(week_end)s
        """,
        {
            "student_id": student_id,
            "week_start": week_start,
            "week_end": week_end,
        },
        as_dict=True,
    )[0]

    attempts = _as_int(row.get("attempts_this_week"))
    correct = _as_int(row.get("correct_this_week"))
    goal_weekly = 50
    achieved = attempts >= goal_weekly

    return {
        "ok": True,
        "data": {
            "student_id": student_id,
            "week_start": str(week_start),
            "week_end": str(week_end),
            "attempts_this_week": attempts,
            "correct_this_week": correct,
            "goal_weekly": goal_weekly,
            "achieved": achieved,
        },
    }
