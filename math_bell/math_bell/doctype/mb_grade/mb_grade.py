# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class MBGrade(Document):
    def validate(self):
        if not self.title_ar:
            self.title_ar = 'الصف الأول' if str(self.grade) == '1' else 'الصف الثاني'
