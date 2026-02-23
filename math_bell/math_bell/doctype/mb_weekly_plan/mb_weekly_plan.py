# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBWeeklyPlan(Document):
    def validate(self):
        ensure_link_exists('MB Student Profile', self.student, 'Student')
        validate_json_field(self, 'plan_json', required=False)

        if self.completion_rate is None:
            self.completion_rate = 0
        self.completion_rate = max(0, min(float(self.completion_rate or 0), 100))

        if self.week_start and self.week_end and self.week_end < self.week_start:
            frappe.throw('week_end must be greater than or equal to week_start')

        if not self.status:
            self.status = 'active'


def on_doctype_update():
    frappe.db.add_index('MB Weekly Plan', ['student', 'week_start'], 'idx_mb_weekly_plan_student_week')
    frappe.db.add_index('MB Weekly Plan', ['student', 'status'], 'idx_mb_weekly_plan_student_status')
