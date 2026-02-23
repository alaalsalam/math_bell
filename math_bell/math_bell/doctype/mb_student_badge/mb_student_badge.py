# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists


class MBStudentBadge(Document):
    def validate(self):
        ensure_link_exists('MB Student Profile', self.student, 'Student')
        ensure_link_exists('MB Badge', self.badge, 'Badge')


def on_doctype_update():
    frappe.db.add_unique('MB Student Badge', ['student', 'badge'], 'uniq_mb_student_badge_student_badge')
