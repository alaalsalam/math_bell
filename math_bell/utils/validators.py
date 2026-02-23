import json
import random
import string

import frappe
from frappe import _


def ensure_link_exists(doctype: str, name: str | None, label: str | None = None) -> None:
    if not name:
        return
    if not frappe.db.exists(doctype, name):
        frappe.throw(_("{0} '{1}' does not exist").format(label or doctype, name))


def validate_json_field(doc, fieldname: str, required: bool = False) -> None:
    value = doc.get(fieldname)
    if value is None:
        value = ""
    if isinstance(value, str):
        value = value.strip()

    if not value:
        if required:
            frappe.throw(_("{0} is required").format(doc.meta.get_label(fieldname) or fieldname))
        return

    try:
        json.loads(value)
    except Exception as exc:
        frappe.throw(
            _("Invalid JSON in field '{0}': {1}").format(
                doc.meta.get_label(fieldname) or fieldname, str(exc)
            )
        )


def generate_unique_code(doctype: str, fieldname: str, length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(50):
        code = "".join(random.choice(alphabet) for _ in range(length))
        if not frappe.db.exists(doctype, {fieldname: code}):
            return code
    frappe.throw(_("Could not generate unique code for {0}").format(doctype))
