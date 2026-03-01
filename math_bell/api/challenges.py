from __future__ import annotations

from frappe import _
import frappe
from frappe.utils import nowdate

from math_bell.api import sessions
from math_bell.api.analytics import _build_recommendation


def _pick_daily_target(student_id: str) -> dict:
    student = frappe.db.get_value(
        "MB Student Profile",
        student_id,
        ["name", "grade", "is_active"],
        as_dict=True,
    )
    if not student:
        frappe.throw(_("Student '{0}' does not exist").format(student_id))
    if int(student.get("is_active") or 0) == 0:
        frappe.throw(_("Student '{0}' is inactive").format(student_id))

    grade = str(student.get("grade") or "1")
    suggested_skill = _build_recommendation(student_id=student_id, grade=grade)

    domain = None
    if suggested_skill:
        domain = frappe.db.get_value("MB Skill", suggested_skill, "domain")

    if not domain:
        first_row = frappe.get_all(
            "MB Skill",
            filters={"grade": grade, "is_active": 1, "show_in_student_app": 1},
            fields=["domain", "order", "creation"],
            order_by="creation asc",
            limit_page_length=200,
        )
        first_row.sort(
            key=lambda row: (
                int(row.get("order") or 0),
                str(row.get("creation") or ""),
            )
        )
        domain = (first_row[0].get("domain") if first_row else None) or "Addition"

    if not suggested_skill:
        skill_rows = frappe.get_all(
            "MB Skill",
            filters={"grade": grade, "domain": domain, "is_active": 1, "show_in_student_app": 1},
            fields=["name", "order", "creation"],
            order_by="creation asc",
            limit_page_length=200,
        )
        skill_rows.sort(
            key=lambda row: (
                int(row.get("order") or 0),
                str(row.get("creation") or ""),
            )
        )
        suggested_skill = skill_rows[0].get("name") if skill_rows else None

    return {
        "grade": grade,
        "domain": domain,
        "skill": suggested_skill,
    }


@frappe.whitelist(allow_guest=True)
def get_daily_challenge(student_id: str):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))

    target = _pick_daily_target(student_id)
    today = nowdate()
    challenge_id = f"{student_id}-{today}"

    return {
        "ok": True,
        "data": {
            "challenge_id": challenge_id,
            "suggested_skill": target.get("skill"),
            "suggested_domain": target.get("domain"),
            "grade": target.get("grade"),
            "session_type": "practice",
            "ui": "mcq",
        },
    }


@frappe.whitelist(allow_guest=True)
def start_daily_challenge(student_id: str, ui: str | None = None):
    student_id = (student_id or "").strip()
    if not student_id:
        frappe.throw(_("student_id is required"))

    target = _pick_daily_target(student_id)
    ui_value = (ui or "mcq").strip() or "mcq"

    session_response = sessions.start_session(
        session_type="practice",
        grade=target.get("grade"),
        domain=target.get("domain"),
        skill=target.get("skill"),
        student=student_id,
        duration_seconds=None,
        ui=ui_value,
        daily_challenge=1,
    )

    payload = session_response.get("data") or {}
    payload.update(
        {
            "challenge_id": f"{student_id}-{nowdate()}",
            "daily_challenge": True,
            "suggested_skill": target.get("skill"),
            "suggested_domain": target.get("domain"),
        }
    )

    return {"ok": True, "data": payload}
