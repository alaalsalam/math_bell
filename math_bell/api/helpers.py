import json
from typing import Any

import frappe
from frappe import _


def parse_json_input(value: Any, field_label: str, required: bool = False) -> Any:
    if value is None or value == "":
        if required:
            frappe.throw(_("{0} is required").format(field_label))
        return None

    if isinstance(value, (dict, list, int, float, bool)):
        return value

    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception as exc:
            frappe.throw(_("Invalid JSON for {0}: {1}").format(field_label, str(exc)))

    frappe.throw(_("Invalid JSON for {0}").format(field_label))


def to_json_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    value_text = str(value).strip().lower()
    return value_text in {"1", "true", "yes", "y", "on"}


def normalize_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def ensure_active_link(doctype: str, name: str | None, label: str) -> None:
    if not name:
        frappe.throw(_("{0} is required").format(label))
    if not frappe.db.exists(doctype, name):
        frappe.throw(_("{0} '{1}' does not exist").format(label, name))
    if frappe.db.has_column(doctype, "is_active"):
        is_active = frappe.db.get_value(doctype, name, "is_active")
        if is_active == 0:
            frappe.throw(_("{0} '{1}' is inactive").format(label, name))


def resolve_grade_link_name(grade_input: str | None, auto_create: bool = False) -> tuple[str, str]:
    """
    Resolve a user-facing grade code ("1"/"2") to MB Grade link name.
    Returns: (grade_name, grade_code).
    """
    requested = str(grade_input or "").strip()
    if not requested:
        frappe.throw(_("Grade is required"))

    if requested in {"الصف الأول", "اول", "الأول"}:
        requested = "1"
    elif requested in {"الصف الثاني", "ثاني", "الثاني"}:
        requested = "2"

    if frappe.db.exists("MB Grade", requested):
        grade_row = frappe.db.get_value("MB Grade", requested, ["name", "grade", "is_active"], as_dict=True)
        if grade_row and int(grade_row.get("is_active") or 0) == 0:
            frappe.throw(_("Grade '{0}' is inactive").format(requested))
        return str(grade_row.get("name")), str(grade_row.get("grade") or requested)

    by_grade = frappe.db.get_value(
        "MB Grade",
        {"grade": requested},
        ["name", "grade", "is_active"],
        as_dict=True,
    )
    if by_grade:
        if int(by_grade.get("is_active") or 0) == 0:
            frappe.throw(_("Grade '{0}' is inactive").format(by_grade.get("name")))
        return str(by_grade.get("name")), str(by_grade.get("grade") or requested)

    if auto_create and requested in {"1", "2"}:
        title_map = {"1": "الصف الأول", "2": "الصف الثاني"}
        doc = frappe.get_doc(
            {
                "doctype": "MB Grade",
                "grade": requested,
                "title_ar": title_map.get(requested),
                "is_active": 1,
            }
        )
        doc.insert(ignore_permissions=True)
        return str(doc.name), requested

    frappe.throw(_("Grade '{0}' does not exist").format(requested))


def validate_skill_belongs_to_grade_domain(skill: str, grade: str, domain: str) -> dict[str, Any]:
    row = frappe.db.get_value(
        "MB Skill",
        skill,
        ["name", "grade", "domain", "is_active"],
        as_dict=True,
    )
    if not row:
        frappe.throw(_("Skill '{0}' does not exist").format(skill))
    if row.get("is_active") == 0:
        frappe.throw(_("Skill '{0}' is inactive").format(skill))
    if row.get("grade") != grade:
        frappe.throw(_("Skill '{0}' does not belong to grade '{1}'").format(skill, grade))
    if row.get("domain") != domain:
        frappe.throw(_("Skill '{0}' does not belong to domain '{1}'").format(skill, domain))
    return row


def parse_doc_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}
