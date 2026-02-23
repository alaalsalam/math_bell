import frappe
import random
from frappe import _
from frappe.utils import now_datetime

from math_bell.api.helpers import ensure_active_link
from math_bell.api.planner import ensure_current_week_plan
from math_bell.math_bell.doctype.mb_student_profile.mb_student_profile import AVATAR_EMOJIS


def _random_avatar():
    return random.choice(AVATAR_EMOJIS)


@frappe.whitelist(allow_guest=True)
def join_class(
    display_name: str,
    password_simple: str,
    grade: str,
    join_code: str | None = None,
    avatar_emoji: str | None = None,
):
    join_code = (join_code or "").strip().upper()
    display_name = (display_name or "").strip()
    password_simple = (password_simple or "").strip()
    grade = (grade or "").strip()
    avatar_emoji = (avatar_emoji or "").strip()

    if not display_name:
        frappe.throw(_("display_name is required"))
    if not password_simple:
        frappe.throw(_("password_simple is required"))

    ensure_active_link("MB Grade", grade, "Grade")

    class_group_name = None
    if join_code:
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
        class_group_name = class_group.get("name")

    existing_name = frappe.db.get_value(
        "MB Student Profile",
        {
            "display_name": display_name,
            "is_active": 1,
        },
    )

    if existing_name:
        student = frappe.get_doc("MB Student Profile", existing_name)
        if student.password_simple != password_simple:
            frappe.throw(_("الاسم مستخدم بالفعل"))
    else:
        student = frappe.get_doc(
            {
                "doctype": "MB Student Profile",
                "display_name": display_name,
                "grade": grade,
                "class_group": class_group_name,
                "password_simple": password_simple,
                "avatar_emoji": avatar_emoji or _random_avatar(),
                "is_active": 1,
            }
        )
        student.insert(ignore_permissions=True)

    return {
        "ok": True,
        "data": {
            "student_profile": {
                "name": student.name,
                "display_name": student.display_name,
                "student_code": student.student_code,
                "grade": student.grade,
                "class_group": student.class_group,
                "avatar_emoji": student.avatar_emoji,
            },
        },
    }


@frappe.whitelist(allow_guest=True)
def login_student(display_name: str, password_simple: str):
    display_name = (display_name or "").strip()
    password_simple = (password_simple or "").strip()

    if not display_name or not password_simple:
        return {"ok": False, "message": "بيانات غير صحيحة"}

    student_name = frappe.db.get_value(
        "MB Student Profile",
        {"display_name": display_name, "is_active": 1},
        "name",
    )
    if not student_name:
        return {"ok": False, "message": "بيانات غير صحيحة"}

    student = frappe.get_doc("MB Student Profile", student_name)
    if student.password_simple != password_simple:
        return {"ok": False, "message": "بيانات غير صحيحة"}

    student.db_set("last_login", now_datetime(), update_modified=False)
    ensure_current_week_plan(student.name)

    return {
        "ok": True,
        "data": {
            "student_profile": {
                "name": student.name,
                "display_name": student.display_name,
                "grade": student.grade,
                "student_code": student.student_code,
                "avatar_emoji": student.avatar_emoji,
            }
        },
    }
