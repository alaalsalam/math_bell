from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, getdate, nowdate


def _week_bounds():
    today = getdate(nowdate())
    week_start = add_days(today, -today.weekday())
    week_end = add_days(week_start, 6)
    prev_start = add_days(week_start, -7)
    prev_end = add_days(week_start, -1)
    return week_start, week_end, prev_start, prev_end


def _student_filters(grade: str | None, class_group: str | None):
    parts = ["sp.is_active = 1"]
    values = {}

    if grade:
        parts.append("sp.grade = %(grade)s")
        values["grade"] = grade

    if class_group:
        parts.append("sp.class_group = %(class_group)s")
        values["class_group"] = class_group

    return " AND ".join(parts), values


def _load_badges(student_names: list[str]) -> dict[str, list[dict]]:
    if not student_names:
        return {}

    rows = frappe.db.sql(
        """
        SELECT sb.student, b.code, b.title_ar
        FROM `tabMB Student Badge` sb
        INNER JOIN `tabMB Badge` b ON b.name = sb.badge
        WHERE sb.student IN %(students)s
        ORDER BY sb.creation DESC
        """,
        {"students": tuple(student_names)},
        as_dict=True,
    )

    grouped: dict[str, list[dict]] = {}
    for row in rows:
        key = row.get("student")
        if key not in grouped:
            grouped[key] = []
        if len(grouped[key]) >= 3:
            continue
        grouped[key].append({"code": row.get("code"), "title_ar": row.get("title_ar")})

    return grouped


@frappe.whitelist(allow_guest=True)
def weekly_leaderboard(grade: str | None = None, class_group: str | None = None):
    grade = (grade or "").strip() or None
    class_group = (class_group or "").strip() or None

    week_start, week_end, prev_start, prev_end = _week_bounds()
    filters, values = _student_filters(grade, class_group)
    values.update(
        {
            "week_start": week_start,
            "week_end": week_end,
            "prev_start": prev_start,
            "prev_end": prev_end,
        }
    )

    rows = frappe.db.sql(
        f"""
        SELECT
            sp.name,
            sp.display_name,
            sp.avatar_emoji,
            sp.grade,
            sp.class_group,
            sp.current_streak,
            SUM(CASE WHEN DATE(COALESCE(s.started_at, s.creation)) BETWEEN %(week_start)s AND %(week_end)s THEN 1 ELSE 0 END) AS attempts_week,
            SUM(CASE WHEN DATE(COALESCE(s.started_at, s.creation)) BETWEEN %(week_start)s AND %(week_end)s AND al.is_correct = 1 THEN 1 ELSE 0 END) AS correct_week,
            SUM(CASE WHEN DATE(COALESCE(s.started_at, s.creation)) BETWEEN %(prev_start)s AND %(prev_end)s THEN 1 ELSE 0 END) AS attempts_prev,
            SUM(CASE WHEN DATE(COALESCE(s.started_at, s.creation)) BETWEEN %(prev_start)s AND %(prev_end)s AND al.is_correct = 1 THEN 1 ELSE 0 END) AS correct_prev
        FROM `tabMB Student Profile` sp
        LEFT JOIN `tabMB Session` s ON s.student = sp.name
        LEFT JOIN `tabMB Attempt Log` al ON al.session = s.name
        WHERE {filters}
        GROUP BY sp.name, sp.display_name, sp.avatar_emoji, sp.grade, sp.class_group, sp.current_streak
        """,
        values,
        as_dict=True,
    )

    leaderboard = []
    improvers = []

    for row in rows:
        attempts_week = int(row.get("attempts_week") or 0)
        correct_week = int(row.get("correct_week") or 0)
        attempts_prev = int(row.get("attempts_prev") or 0)
        correct_prev = int(row.get("correct_prev") or 0)

        accuracy_week = round((correct_week / attempts_week), 4) if attempts_week else 0
        accuracy_prev = round((correct_prev / attempts_prev), 4) if attempts_prev else 0
        accuracy_delta = round(accuracy_week - accuracy_prev, 4)
        streak_bonus = min(int(row.get("current_streak") or 0), 10)
        points = correct_week + streak_bonus

        payload = {
            "name": row.get("name"),
            "display_name": row.get("display_name"),
            "avatar_emoji": row.get("avatar_emoji") or "😀",
            "grade": row.get("grade"),
            "class_group": row.get("class_group"),
            "current_streak": int(row.get("current_streak") or 0),
            "attempts_week": attempts_week,
            "correct_week": correct_week,
            "accuracy_week": accuracy_week,
            "points": points,
            "streak_bonus": streak_bonus,
            "accuracy_delta": accuracy_delta,
        }

        leaderboard.append(payload)
        if attempts_week >= 3:
            improvers.append(payload)

    leaderboard.sort(key=lambda x: (x["points"], x["correct_week"], x["attempts_week"]), reverse=True)
    improvers.sort(key=lambda x: (x["accuracy_delta"], x["correct_week"]), reverse=True)

    top10 = leaderboard[:10]
    top_improvers = improvers[:5]

    badges_map = _load_badges([row["name"] for row in top10])
    for row in top10:
        row["badges"] = badges_map.get(row["name"], [])

    return {
        "ok": True,
        "data": {
            "week_start": str(week_start),
            "week_end": str(week_end),
            "leaderboard": top10,
            "top_improvers": top_improvers,
            "points_formula": "points = correct_answers_this_week + min(current_streak, 10)",
        },
    }
