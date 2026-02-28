import frappe
import random
from frappe import _
from frappe.utils import now_datetime

from math_bell.api.helpers import resolve_grade_link_name
from math_bell.api.planner import ensure_current_week_plan
from math_bell.math_bell.doctype.mb_student_profile.mb_student_profile import AVATAR_EMOJIS
from math_bell.utils.runtime_bootstrap import ensure_runtime_catalog


def _random_avatar():
    return random.choice(AVATAR_EMOJIS)


def _next_available_display_name(base_name: str) -> str:
    """
    Keep onboarding smooth for kids: if name exists, auto-suffix it.
    Example: "علي" -> "علي 2", "علي 3", ...
    """
    clean = (base_name or "").strip()
    if not clean:
        return clean
    if not frappe.db.exists("MB Student Profile", {"display_name": clean, "is_active": 1}):
        return clean

    for idx in range(2, 1000):
        candidate = f"{clean} {idx}"
        if not frappe.db.exists("MB Student Profile", {"display_name": candidate, "is_active": 1}):
            return candidate
    frappe.throw(_("تعذر إنشاء اسم فريد، يرجى اختيار اسم مختلف"))


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

    # Accept simple frontend grade codes and auto-heal missing base grade docs.
    # This keeps onboarding working even when seed patches were not executed yet.
    grade_name, grade_code = resolve_grade_link_name(grade, auto_create=True)
    ensure_runtime_catalog(grade_code)

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
        class_grade_name = class_group.get("grade")
        class_grade_code = resolve_grade_link_name(class_grade_name, auto_create=False)[1]
        if class_grade_code != grade_code:
            frappe.throw(
                _("Class grade mismatch. Class grade is '{0}' and request grade is '{1}'").format(
                    class_group.get("grade"), grade_code
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
            # Do not block registration on name collision; auto-suffix instead.
            display_name = _next_available_display_name(display_name)
            student = None
    else:
        student = None

    if not student:
        student = frappe.get_doc(
            {
                "doctype": "MB Student Profile",
                "display_name": display_name,
                "grade": grade_name,
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
                "grade": grade_code,
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

    grade_name, grade_code = resolve_grade_link_name(student.grade, auto_create=True)
    ensure_runtime_catalog(grade_code)

    return {
        "ok": True,
        "data": {
            "student_profile": {
                "name": student.name,
                "display_name": student.display_name,
                "grade": grade_code,
                "student_code": student.student_code,
                "avatar_emoji": student.avatar_emoji,
            }
        },
    }
