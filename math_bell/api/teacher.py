import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, now_datetime
from math_bell.utils.settings import get_mb_settings


def _parse_date_range(date_from=None, date_to=None):
    if date_from:
        from_dt = get_datetime(date_from)
    else:
        from_dt = None

    if date_to:
        to_dt = get_datetime(date_to)
    else:
        to_dt = None

    return from_dt, to_dt


def _session_where_clause(alias="s", date_from=None, date_to=None):
    conditions = [f"{alias}.docstatus < 2"]
    values = {}

    from_dt, to_dt = _parse_date_range(date_from, date_to)
    if from_dt:
        conditions.append(f"COALESCE({alias}.started_at, {alias}.creation) >= %(date_from)s")
        values["date_from"] = from_dt
    if to_dt:
        conditions.append(f"COALESCE({alias}.started_at, {alias}.creation) <= %(date_to)s")
        values["date_to"] = to_dt

    return " AND ".join(conditions), values


@frappe.whitelist(allow_guest=True)
def get_teacher_overview():
    classes = frappe.get_all(
        "MB Class Group",
        fields=["name", "title", "join_code", "grade"],
        order_by="creation desc",
        limit_page_length=200,
    )

    class_names = [row["name"] for row in classes]
    students_count_map = {}
    if class_names:
        rows = frappe.db.sql(
            """
            SELECT class_group, COUNT(name) AS students_count
            FROM `tabMB Student Profile`
            WHERE is_active = 1 AND class_group IN %(class_names)s
            GROUP BY class_group
            """,
            {"class_names": tuple(class_names)},
            as_dict=True,
        )
        students_count_map = {row["class_group"]: int(row["students_count"] or 0) for row in rows}

    classes_payload = [
        {
            "name": row["name"],
            "title": row["title"],
            "join_code": row["join_code"],
            "grade": row["grade"],
            "students_count": students_count_map.get(row["name"], 0),
        }
        for row in classes
    ]

    last_7_days = add_days(now_datetime(), -7)
    recent_sessions_count = frappe.db.count(
        "MB Session",
        {"creation": [">=", last_7_days]},
    )

    top_skills_rows = frappe.db.sql(
        """
        SELECT al.skill, COUNT(al.name) AS attempts
        FROM `tabMB Attempt Log` al
        GROUP BY al.skill
        ORDER BY attempts DESC
        LIMIT 5
        """,
        as_dict=True,
    )

    return {
        "ok": True,
        "data": {
            "classes": classes_payload,
            "recent_sessions_count": int(recent_sessions_count or 0),
            "top_skills": [
                {
                    "skill": row.get("skill"),
                    "attempts": int(row.get("attempts") or 0),
                }
                for row in top_skills_rows
            ],
        },
    }


@frappe.whitelist(allow_guest=True)
def create_class(title: str, grade: str):
    title = (title or "").strip()
    grade = (grade or "").strip()

    if not title:
        frappe.throw(_("title is required"))
    if not grade:
        frappe.throw(_("grade is required"))

    if not frappe.db.exists("MB Grade", grade):
        frappe.throw(_("Grade '{0}' does not exist").format(grade))

    doc = frappe.get_doc(
        {
            "doctype": "MB Class Group",
            "title": title,
            "grade": grade,
            "teacher_user": "Administrator",
            "is_active": 1,
        }
    )
    doc.insert(ignore_permissions=True)

    return {
        "ok": True,
        "data": {
            "class": {
                "name": doc.name,
                "title": doc.title,
                "grade": doc.grade,
                "join_code": doc.join_code,
                "teacher_user": doc.teacher_user,
            }
        },
    }


@frappe.whitelist(allow_guest=True)
def list_students(class_group: str | None = None, grade: str | None = None):
    filters = {"is_active": 1}
    if class_group:
        filters["class_group"] = class_group
    if grade:
        filters["grade"] = grade

    students = frappe.get_all(
        "MB Student Profile",
        filters=filters,
        fields=["name", "display_name", "avatar_emoji", "grade", "class_group", "last_login"],
        order_by="modified desc",
        limit_page_length=500,
    )

    return {
        "ok": True,
        "data": {
            "students": students,
        },
    }


@frappe.whitelist(allow_guest=True)
def student_report(student_id: str, date_from: str | None = None, date_to: str | None = None):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))
    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    where_clause, values = _session_where_clause("s", date_from, date_to)
    where_clause = f"{where_clause} AND s.student = %(student_id)s"
    values["student_id"] = student_id

    sessions_summary = frappe.db.sql(
        f"""
        SELECT
            COUNT(s.name) AS total,
            SUM(CASE WHEN s.session_type = 'practice' THEN 1 ELSE 0 END) AS practice_count,
            SUM(CASE WHEN s.session_type = 'bell_session' THEN 1 ELSE 0 END) AS bell_count,
            AVG(
                CASE
                    WHEN JSON_VALID(s.stats_json)
                    THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                    ELSE NULL
                END
            ) AS avg_accuracy
        FROM `tabMB Session` s
        WHERE {where_clause}
        """,
        values,
        as_dict=True,
    )[0]

    attempts_row = frappe.db.sql(
        f"""
        SELECT
            COUNT(al.name) AS attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE {where_clause}
        """,
        values,
        as_dict=True,
    )[0]

    domain_rows = frappe.db.sql(
        f"""
        SELECT
            s.domain,
            COUNT(al.name) AS attempts,
            SUM(CASE WHEN al.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        WHERE {where_clause}
        GROUP BY s.domain
        ORDER BY s.domain
        """,
        values,
        as_dict=True,
    )

    domain_breakdown = {
        row.get("domain"): {
            "attempts": int(row.get("attempts") or 0),
            "correct": int(row.get("correct") or 0),
            "accuracy": (
                round((int(row.get("correct") or 0) / int(row.get("attempts") or 1)), 4)
                if int(row.get("attempts") or 0)
                else 0
            ),
        }
        for row in domain_rows
    }

    recent_sessions_rows = frappe.db.sql(
        f"""
        SELECT
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
        WHERE {where_clause}
        ORDER BY COALESCE(s.started_at, s.creation) DESC
        LIMIT 20
        """,
        values,
        as_dict=True,
    )

    return {
        "ok": True,
        "data": {
            "student_id": student_id,
            "sessions_summary": {
                "total": int(sessions_summary.get("total") or 0),
                "practice_count": int(sessions_summary.get("practice_count") or 0),
                "bell_count": int(sessions_summary.get("bell_count") or 0),
            },
            "avg_accuracy": float(sessions_summary.get("avg_accuracy") or 0),
            "attempts": int(attempts_row.get("attempts") or 0),
            "correct": int(attempts_row.get("correct") or 0),
            "domain_breakdown": domain_breakdown,
            "recent_sessions": [
                {
                    "session_type": row.get("session_type"),
                    "domain": row.get("domain"),
                    "skill": row.get("skill"),
                    "started_at": row.get("started_at"),
                    "ended_at": row.get("ended_at"),
                    "duration_seconds": int(row.get("duration_seconds") or 0),
                    "accuracy": float(row.get("accuracy") or 0),
                }
                for row in recent_sessions_rows
            ],
        },
    }


@frappe.whitelist(allow_guest=True)
def class_report(class_group: str, date_from: str | None = None, date_to: str | None = None):
    class_group = (class_group or "").strip()
    if not class_group:
        frappe.throw(_("class_group is required"))
    if not frappe.db.exists("MB Class Group", class_group):
        frappe.throw(_("Class '{0}' does not exist").format(class_group))

    students_count = frappe.db.count("MB Student Profile", {"class_group": class_group, "is_active": 1})

    where_clause, values = _session_where_clause("s", date_from, date_to)
    where_clause = f"{where_clause} AND sp.class_group = %(class_group)s"
    values["class_group"] = class_group

    sessions_row = frappe.db.sql(
        f"""
        SELECT
            COUNT(s.name) AS total_sessions,
            AVG(
                CASE
                    WHEN JSON_VALID(s.stats_json)
                    THEN JSON_UNQUOTE(JSON_EXTRACT(s.stats_json, '$.accuracy'))
                    ELSE NULL
                END
            ) AS avg_accuracy
        FROM `tabMB Session` s
        INNER JOIN `tabMB Student Profile` sp ON sp.name = s.student
        WHERE {where_clause}
        """,
        values,
        as_dict=True,
    )[0]

    top_skills = frappe.db.sql(
        f"""
        SELECT al.skill, COUNT(al.name) AS attempts
        FROM `tabMB Attempt Log` al
        INNER JOIN `tabMB Session` s ON s.name = al.session
        INNER JOIN `tabMB Student Profile` sp ON sp.name = s.student
        WHERE {where_clause}
        GROUP BY al.skill
        ORDER BY attempts DESC
        LIMIT 5
        """,
        values,
        as_dict=True,
    )

    return {
        "ok": True,
        "data": {
            "class_group": class_group,
            "students_count": int(students_count or 0),
            "total_sessions": int(sessions_row.get("total_sessions") or 0),
            "avg_accuracy": float(sessions_row.get("avg_accuracy") or 0),
            "top_skills": [
                {
                    "skill": row.get("skill"),
                    "attempts": int(row.get("attempts") or 0),
                }
                for row in top_skills
            ],
        },
    }


@frappe.whitelist(allow_guest=True)
def get_settings():
    return {"ok": True, "data": get_mb_settings()}


@frappe.whitelist(allow_guest=True)
def update_settings(
    teacher_passcode: str | None = None,
    default_bell_duration_seconds: int | None = None,
    default_questions_per_session: int | None = None,
    enable_sound: int | bool | None = None,
    enable_confetti: int | bool | None = None,
    enable_balloons: int | bool | None = None,
    allow_guest_play: int | bool | None = None,
    show_only_skills_with_questions: int | bool | None = None,
    enabled_game_engines=None,
):
    if teacher_passcode is not None:
        frappe.db.set_single_value("MB Settings", "teacher_passcode", str(teacher_passcode).strip())
    if default_bell_duration_seconds is not None:
        frappe.db.set_single_value(
            "MB Settings",
            "default_bell_duration_seconds",
            max(int(default_bell_duration_seconds), 60),
        )
    if default_questions_per_session is not None:
        frappe.db.set_single_value(
            "MB Settings",
            "default_questions_per_session",
            max(int(default_questions_per_session), 1),
        )

    bool_fields = {
        "enable_sound": enable_sound,
        "enable_confetti": enable_confetti,
        "enable_balloons": enable_balloons,
        "allow_guest_play": allow_guest_play,
        "show_only_skills_with_questions": show_only_skills_with_questions,
    }
    for fieldname, value in bool_fields.items():
        if value is not None:
            frappe.db.set_single_value("MB Settings", fieldname, 1 if int(value) else 0)

    if enabled_game_engines is not None:
        parsed = enabled_game_engines
        if isinstance(parsed, str):
            try:
                parsed = frappe.parse_json(parsed)
            except Exception:
                parsed = [entry.strip() for entry in parsed.split(",") if entry.strip()]
        if not isinstance(parsed, list):
            parsed = []
        cleaned = [str(item).strip() for item in parsed if str(item).strip()]
        frappe.db.set_single_value("MB Settings", "engines_json", frappe.as_json(cleaned))

    frappe.db.commit()
    return {"ok": True, "data": get_mb_settings()}
