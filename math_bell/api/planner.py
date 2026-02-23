from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import getdate, nowdate

from math_bell.api.helpers import parse_doc_json, to_json_string
from math_bell.planner.engine import generate_weekly_plan, get_week_bounds


def _normalize_week_bounds(week_start=None):
    return get_week_bounds(week_start)


def _expire_old_active_plans(student_id: str):
    today = nowdate()
    old_rows = frappe.get_all(
        "MB Weekly Plan",
        filters={
            "student": student_id,
            "status": "active",
            "week_end": ["<", today],
        },
        fields=["name"],
        limit_page_length=200,
    )
    for row in old_rows:
        frappe.db.set_value("MB Weekly Plan", row.get("name"), "status", "expired", update_modified=False)


def _get_current_week_plan_doc(student_id: str, week_start, week_end):
    rows = frappe.get_all(
        "MB Weekly Plan",
        filters={
            "student": student_id,
            "week_start": str(week_start),
            "week_end": str(week_end),
        },
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1,
    )
    if not rows:
        return None
    return frappe.get_doc("MB Weekly Plan", rows[0].get("name"))


def _session_counts_for_week(student_id: str, week_start, week_end) -> dict[str, int]:
    rows = frappe.db.sql(
        """
        SELECT s.skill, COUNT(s.name) AS sessions_count
        FROM `tabMB Session` s
        WHERE s.student = %(student_id)s
          AND s.status = 'ended'
          AND s.skill IS NOT NULL
          AND DATE(COALESCE(s.started_at, s.creation)) >= %(week_start)s
          AND DATE(COALESCE(s.started_at, s.creation)) <= %(week_end)s
        GROUP BY s.skill
        """,
        {"student_id": student_id, "week_start": week_start, "week_end": week_end},
        as_dict=True,
    )
    return {row.get("skill"): int(row.get("sessions_count") or 0) for row in rows}


def _decorate_plan_with_progress(plan_doc):
    plan_data = parse_doc_json(plan_doc.plan_json)
    if not isinstance(plan_data, dict):
        plan_data = {}

    week_start = getdate(plan_doc.week_start)
    week_end = getdate(plan_doc.week_end)
    session_counts = _session_counts_for_week(plan_doc.student, week_start, week_end)

    consumed_counts = {}
    completed_days = 0
    for day_index in range(1, 6):
        key = f"day_{day_index}"
        day_item = plan_data.get(key) if isinstance(plan_data.get(key), dict) else {}
        skill = day_item.get("skill")
        available = session_counts.get(skill, 0) if skill else 0
        consumed = consumed_counts.get(skill, 0) if skill else 0
        is_completed = bool(skill and available > consumed)
        if skill:
            consumed_counts[skill] = consumed + (1 if is_completed else 0)

        day_item["completed"] = 1 if is_completed else 0
        plan_data[key] = day_item
        completed_days += 1 if is_completed else 0

    target_days = int(plan_data.get("target_days") or 5)
    target_days = max(1, min(5, target_days))
    completion_rate = round(min(100, (completed_days / target_days) * 100), 2)
    today = getdate(nowdate())
    if completed_days >= target_days:
        status = "completed"
    elif today > week_end:
        status = "expired"
    else:
        status = "active"

    changed = False
    if float(plan_doc.completion_rate or 0) != completion_rate:
        plan_doc.completion_rate = completion_rate
        changed = True
    if (plan_doc.status or "active") != status:
        plan_doc.status = status
        changed = True
    serialized_plan = to_json_string(plan_data)
    if (plan_doc.plan_json or "") != serialized_plan:
        plan_doc.plan_json = serialized_plan
        changed = True
    if changed:
        plan_doc.save(ignore_permissions=True)

    return {
        "name": plan_doc.name,
        "student": plan_doc.student,
        "week_start": str(plan_doc.week_start),
        "week_end": str(plan_doc.week_end),
        "completion_rate": completion_rate,
        "target_days": target_days,
        "status": status,
        "days_completed": completed_days,
        "plan": plan_data,
    }


def ensure_current_week_plan(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))
    if not frappe.db.exists("MB Student Profile", student_id):
        frappe.throw(_("Student '{0}' does not exist").format(student_id))

    week_start, week_end = _normalize_week_bounds()
    _expire_old_active_plans(student_id)
    plan_doc = _get_current_week_plan_doc(student_id, week_start, week_end)
    if not plan_doc:
        plan_payload = generate_weekly_plan(student_id)
        plan_doc = frappe.get_doc(
            {
                "doctype": "MB Weekly Plan",
                "student": student_id,
                "week_start": week_start,
                "week_end": week_end,
                "plan_json": to_json_string(plan_payload),
                "completion_rate": 0,
                "status": "active",
            }
        )
        plan_doc.insert(ignore_permissions=True)

    return _decorate_plan_with_progress(plan_doc)


@frappe.whitelist(allow_guest=True)
def get_current_plan(student_id: str):
    plan = ensure_current_week_plan(student_id)
    return {"ok": True, "data": plan}
