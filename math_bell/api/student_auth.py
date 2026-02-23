import frappe
from frappe import _

from math_bell.api.helpers import ensure_active_link


@frappe.whitelist(allow_guest=True)
def join_class(join_code: str, display_name: str, grade: str):
    join_code = (join_code or "").strip().upper()
    display_name = (display_name or "").strip()
    grade = (grade or "").strip()

    if not join_code:
        frappe.throw(_("join_code is required"))
    if not display_name:
        frappe.throw(_("display_name is required"))

    ensure_active_link("MB Grade", grade, "Grade")

    class_group = frappe.db.get_value(
        "MB Class Group",
        {"join_code": join_code, "is_active": 1},
        ["name", "grade", "title", "join_code"],
        as_dict=True,
    )
    if not class_group:
        frappe.throw(_("Invalid join code"))
    if class_group.get("grade") != grade:
        frappe.throw(
            _("Class grade mismatch. Class grade is '{0}' and request grade is '{1}'").format(
                class_group.get("grade"), grade
            )
        )

    existing_name = frappe.db.get_value(
        "MB Student Profile",
        {
            "display_name": display_name,
            "grade": grade,
            "class_group": class_group.get("name"),
        },
    )

    if existing_name:
        student = frappe.get_doc("MB Student Profile", existing_name)
    else:
        student = frappe.get_doc(
            {
                "doctype": "MB Student Profile",
                "display_name": display_name,
                "grade": grade,
                "class_group": class_group.get("name"),
                "is_active": 1,
            }
        )
        student.insert(ignore_permissions=True)

    session_token = f"{student.student_code}.{frappe.generate_hash(length=24)}"

    return {
        "ok": True,
        "data": {
            "session_token": session_token,
            "student_profile": {
                "name": student.name,
                "display_name": student.display_name,
                "student_code": student.student_code,
                "grade": student.grade,
                "class_group": student.class_group,
            },
        },
    }

