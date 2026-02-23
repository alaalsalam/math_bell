# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, generate_unique_code


class MBStudentProfile(Document):
    def before_insert(self):
        if not self.student_code:
            self.student_code = generate_unique_code('MB Student Profile', 'student_code', length=8)

    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        if self.class_group:
            ensure_link_exists('MB Class Group', self.class_group, 'Class Group')
